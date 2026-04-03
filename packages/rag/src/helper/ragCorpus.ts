/**
 * RAG 语料索引：监视目录 → 读入 → 分块 → 嵌入 → 磁盘缓存，并维护 metaMap。
 * 检索见 `RagRetriever`（`ragRetrieval.ts`），此处通过组合委托 `search`。
 *
 * - 加载串行（LOAD_CONCURRENCY），嵌入可并发（EMBED_CONCURRENCY）。
 * - 首轮 chokidar `ready` 完成前，`readyLoader` 会直接 return；之后才处理变更。
 */

import chokidar from "chokidar";
import path from "path";
import { embedText } from "../utils/embedding";
import { readFile } from "../utils/file";
import { hash } from "../utils/hash";
import { planEmbeddingDiff } from "../utils/embeddingDiff";
import {
  cacheRootForWatch,
  ensureCacheDir,
  type CachedChunk,
  readCachedChunksForDiff,
  removeCacheFile,
  saveChunksToCache,
  tryLoadChunksFromCache,
} from "../utils/ragCache";
import { createEmbedProgress } from "../utils/embedProgress";
import { RagRetriever } from "./ragRetrieval.js";
import type { SearchHit } from "./ragRetrieval.js";
import type { RagDocumentMeta } from "./ragTypes.js";
import { AsyncConcurrencyQueue } from "../utils/taskQueue";
import { chunkText } from "../utils/text";

/** 同时只处理一个文件的完整管线（读盘、分块、写缓存） */
const LOAD_CONCURRENCY = 1;
/** 单文件内多 chunk 调用 Ollama 时的并发上限 */
const EMBED_CONCURRENCY = 5;

export type { RagDocumentMeta } from "./ragTypes.js";
export type { SearchHit } from "./ragRetrieval.js";

export class RagCorpus {
  private watcher?: ReturnType<typeof chokidar.watch>;
  /** 当前监视到的绝对路径集合 */
  private files: Set<string>;
  /** 首轮扫描是否已结束；未结束时仅收集 files，不执行 readyLoader */
  private isReady = false;
  /** 首轮索引完成后 resolve，保证 metaMap 已填充后再检索 */
  private readonly whenReadyPromise: Promise<void>;
  private resolveWhenReady!: () => void;

  /** absPath → 单文档索引（供检索 / API 使用） */
  public metaMap: Map<string, RagDocumentMeta> = new Map();

  private readonly loadQueue = new AsyncConcurrencyQueue(LOAD_CONCURRENCY);
  private readonly embedQueue = new AsyncConcurrencyQueue(EMBED_CONCURRENCY);
  private readonly cacheRoot: string;
  private readonly watchPath: string;
  private readonly retriever: RagRetriever;

  constructor(watchPath: string) {
    this.whenReadyPromise = new Promise<void>((resolve) => {
      this.resolveWhenReady = resolve;
    });
    this.watchPath = path.resolve(watchPath);
    this.files = new Set<string>();
    this.cacheRoot = cacheRootForWatch(this.watchPath);
    this.retriever = new RagRetriever(() => ({
      indexReady: this.indexReady,
      metaMap: this.metaMap,
    }));
    this.init();
  }

  /**
   * 首轮索引（chokidar ready + 各文件 loader）是否已完成。
   * HTTP 服务可先启动，再异步填充 metaMap；未就绪时检索应直接返回「未就绪」，勿在请求里 await 整轮索引。
   */
  get indexReady(): boolean {
    return this.isReady;
  }

  /** 可选：需要阻塞到索引完成时再调用（例如集成测试），勿用于普通 API handler */
  whenReady(): Promise<void> {
    return this.whenReadyPromise;
  }

  /** 委托给 `RagRetriever` */
  search(question: string, topK = 5): Promise<SearchHit[]> {
    return this.retriever.search(question, topK);
  }

  /** chokidar 可能给出相对或绝对路径，统一为绝对路径，与 ragCache 的 key 一致 */
  private toAbs(p: string): string {
    return path.resolve(this.watchPath, p);
  }

  private async init() {
    await this.fileWatch();
  }

  private async fileWatch() {
    this.watcher = chokidar.watch(this.watchPath, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
      ignored: [path.join(this.watchPath, ".rag-cache")],
    });

    this.watcher
      .on("add", (p) => {
        const abs = this.toAbs(p);
        console.log(`➕ 文件添加: ${abs}`);
        this.files.add(abs);
        this.readyLoader(abs);
      })
      .on("change", (p) => {
        const abs = this.toAbs(p);
        console.log(`✏️  文件修改: ${abs}`);
        this.readyLoader(abs);
      })
      .on("unlink", (p) => {
        const abs = this.toAbs(p);
        console.log(`🗑️  文件删除: ${abs}`);
        void this.handleRemove(abs);
      })
      .on("error", (error) => console.error(`❌ 错误: ${error}`))
      .on("ready", async () => {
        console.log(this.files);
        await ensureCacheDir(this.cacheRoot);
        for (const file of this.files) {
          await this.loadQueue.enqueue(() => this.loader(file));
        }
        this.isReady = true;
        this.resolveWhenReady();
        console.log("✅ 初始扫描完成，开始监听");
      });
  }

  /**
   * 单文件：读文本 → 内容 hash → 磁盘整包命中则跳过嵌入；
   * 否则分块 → `embeddingDiff` 规划复用 → 仅对缺口嵌入 → 写缓存。
   */
  private async loader(file: string) {
    const abs = this.toAbs(file);
    const fileContent = await readFile(abs);
    if (fileContent === null) {
      this.metaMap.delete(abs);
      await removeCacheFile(abs, this.cacheRoot);
      return;
    }

    const contentHash = hash(fileContent);

    const cached = await tryLoadChunksFromCache(abs, contentHash, this.cacheRoot);
    let chunks: CachedChunk[];

    if (cached !== null) {
      chunks = cached;
      console.log(`📂 使用缓存: ${abs}`);
    } else {
      const rawChunks = chunkText(fileContent);
      const previous = await readCachedChunksForDiff(abs, this.cacheRoot);
      const { slots, toEmbedIndices, reuseCount } = planEmbeddingDiff(rawChunks, previous);
      if (reuseCount > 0) {
        console.log(
          `♻️  chunk 复用 ${reuseCount}/${rawChunks.length}，待嵌入 ${toEmbedIndices.length}`
        );
      }
      const progress = createEmbedProgress(abs, toEmbedIndices.length);
      await Promise.all(
        toEmbedIndices.map((i) =>
          this.embedQueue.enqueue(async () => {
            const embedding = await embedText(rawChunks[i].text);
            progress.increment();
            slots[i] = { ...rawChunks[i], embedding };
          })
        )
      );
      chunks = slots as CachedChunk[];
      await saveChunksToCache(abs, contentHash, chunks, this.cacheRoot);
    }

    this.metaMap.set(abs, {
      hash: contentHash,
      content: fileContent,
      chunks,
    });
  }

  private async handleRemove(abs: string) {
    this.files.delete(abs);
    await removeCacheFile(abs, this.cacheRoot);
    this.metaMap.delete(abs);
  }

  /** 仅在首轮 ready 之后，将变更排入 loadQueue */
  private readyLoader(abs: string) {
    if (!this.isReady) {
      return;
    }
    void this.loadQueue
      .enqueue(() => this.loader(abs))
      .catch((err) => {
        console.error(`❌ 加载失败: ${abs}`, err);
      });
  }
}
