/**
 * 监视目录中文本文件：读入 → 分块 → 嵌入 → 写入磁盘缓存，并在内存中维护 metaMap。
 *
 * - 加载串行（LOAD_CONCURRENCY），嵌入可并发（EMBED_CONCURRENCY）。
 * - 首轮 `ready` 完成前，`readyLoader` 会直接 return；之后才处理变更。
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
import { AsyncConcurrencyQueue } from "../utils/taskQueue";
import { chunkText } from "../utils/text";

/** 同时只处理一个文件的完整管线（读盘、分块、写缓存） */
const LOAD_CONCURRENCY = 1;
/** 单文件内多 chunk 调用 Ollama 时的并发上限 */
const EMBED_CONCURRENCY = 5;

type FileMeta = {
  hash: string;
  content: string;
  chunks: CachedChunk[];
};

export class FileWatcher {
  private watcher?: ReturnType<typeof chokidar.watch>;
  /** 当前监视到的绝对路径集合 */
  private files: Set<string>;
  /** 首轮扫描是否已结束；未结束时仅收集 files，不执行 readyLoader */
  private isReady = false;
  /** absPath → 解析结果（供后续检索/API 使用） */
  private metaMap: Map<string, FileMeta> = new Map();

  private readonly loadQueue = new AsyncConcurrencyQueue(LOAD_CONCURRENCY);
  private readonly embedQueue = new AsyncConcurrencyQueue(EMBED_CONCURRENCY);
  private readonly cacheRoot: string;
  private readonly watchPath: string;

  constructor(watchPath: string) {
    this.watchPath = path.resolve(watchPath);
    this.files = new Set<string>();
    this.cacheRoot = cacheRootForWatch(this.watchPath);
    this.init();
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
        console.log(`♻️  chunk 复用 ${reuseCount}/${rawChunks.length}，待嵌入 ${toEmbedIndices.length}`);
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
