/**
 * 磁盘向量缓存（RAG 嵌入结果）
 *
 * 布局：`{watchPath}/.rag-cache/{entryKey}/`
 *   - meta.json   — 校验用元数据（内容 hash、嵌入模型、分块参数等）
 *   - index.jsonl — 每行一个 JSON，对应一个带 embedding 的 chunk
 */

import fs from "fs/promises";
import path from "path";
import { getEmbedModel } from "./embedding";
import { hash as hashString } from "./hash";
import { CHUNK_DEFAULT_OVERLAP, CHUNK_DEFAULT_SIZE } from "./text";

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

export const RAG_CACHE_DIR_NAME = ".rag-cache";

export const CACHE_META_FILE = "meta.json";
export const CACHE_INDEX_FILE = "index.jsonl";

/** 磁盘 meta.json 的格式版本 */
export const CACHE_META_VERSION = 1 as const;

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export type RagCacheMeta = {
  v: typeof CACHE_META_VERSION;
  /** 源文件全文内容的 sha256，用于判断文件是否被修改 */
  fileHash: string;
  /** 绝对路径，仅便于排查，不参与校验 */
  sourcePath: string;
  /** 生成 embedding 时使用的模型；与当前进程不一致则整份缓存作废 */
  embedModel: string;
  chunkSize: number;
  chunkOverlap: number;
};

export type CachedChunk = {
  id: string;
  text: string;
  hash: string;
  embedding: number[];
};

// ---------------------------------------------------------------------------
// 路径：由「规范化后的绝对路径」派生稳定 key，避免同名不同路径冲突
// ---------------------------------------------------------------------------

export function cacheRootForWatch(watchPath: string): string {
  return path.join(watchPath, RAG_CACHE_DIR_NAME);
}

export function cacheEntryKey(absoluteFilePath: string): string {
  return hashString(path.normalize(absoluteFilePath));
}

export function cacheEntryDir(absoluteFilePath: string, cacheRoot: string): string {
  return path.join(cacheRoot, cacheEntryKey(absoluteFilePath));
}

// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------

async function readUtf8OrNull(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

/** 嵌入模型、分块参数、版本与当前进程一致（不比较 fileHash） */
function isMetaPolicyCompatible(meta: RagCacheMeta): boolean {
  return (
    meta.v === CACHE_META_VERSION &&
    meta.embedModel === getEmbedModel() &&
    meta.chunkSize === CHUNK_DEFAULT_SIZE &&
    meta.chunkOverlap === CHUNK_DEFAULT_OVERLAP
  );
}

/** meta 与当前文件内容、嵌入策略一致（整包命中） */
function isMetaValidForRuntime(meta: RagCacheMeta, fileContentHash: string): boolean {
  return isMetaPolicyCompatible(meta) && meta.fileHash === fileContentHash;
}

/** 将 index.jsonl 全文解析为 chunk 数组；任一行非法则整体失败 */
function parseIndexJsonlLines(raw: string): CachedChunk[] | null {
  const lines = raw.split("\n").filter((l) => l.length > 0);
  const chunks: CachedChunk[] = [];
  for (const line of lines) {
    try {
      chunks.push(JSON.parse(line) as CachedChunk);
    } catch {
      return null;
    }
  }
  return chunks;
}

function parseMetaJson(raw: string): RagCacheMeta | null {
  try {
    return JSON.parse(raw) as RagCacheMeta;
  } catch {
    return null;
  }
}

/**
 * 从缓存目录读取。任一环节失败（文件缺失、JSON 非法、校验不通过）返回 null。
 */
async function readCachedChunks(
  absoluteFilePath: string,
  fileContentHash: string,
  cacheRoot: string
): Promise<CachedChunk[] | null> {
  const dir = cacheEntryDir(absoluteFilePath, cacheRoot);
  const metaRaw = await readUtf8OrNull(path.join(dir, CACHE_META_FILE));
  if (metaRaw === null) {
    return null;
  }

  const meta = parseMetaJson(metaRaw);
  if (meta === null || !isMetaValidForRuntime(meta, fileContentHash)) {
    return null;
  }

  const indexRaw = await readUtf8OrNull(path.join(dir, CACHE_INDEX_FILE));
  if (indexRaw === null) {
    return null;
  }

  return parseIndexJsonlLines(indexRaw);
}

// ---------------------------------------------------------------------------
// 对外 API
// ---------------------------------------------------------------------------

export async function ensureCacheDir(cacheRoot: string): Promise<void> {
  await fs.mkdir(cacheRoot, { recursive: true });
}

/** 尝试从磁盘恢复已缓存的 chunks */
export async function tryLoadChunksFromCache(
  absoluteFilePath: string,
  fileContentHash: string,
  cacheRoot: string
): Promise<CachedChunk[] | null> {
  return readCachedChunks(absoluteFilePath, fileContentHash, cacheRoot);
}

/**
 * 整文件 hash 未命中时，若磁盘 meta 与当前嵌入/分块策略仍一致，则读取 index 供 embedding diff 复用。
 * 仅负责读盘与策略校验，不包含 diff 算法。
 */
export async function readCachedChunksForDiff(
  absoluteFilePath: string,
  cacheRoot: string
): Promise<CachedChunk[] | null> {
  const dir = cacheEntryDir(absoluteFilePath, cacheRoot);
  const metaRaw = await readUtf8OrNull(path.join(dir, CACHE_META_FILE));
  if (metaRaw === null) {
    return null;
  }
  const meta = parseMetaJson(metaRaw);
  if (meta === null || !isMetaPolicyCompatible(meta)) {
    return null;
  }
  const indexRaw = await readUtf8OrNull(path.join(dir, CACHE_INDEX_FILE));
  if (indexRaw === null) {
    return null;
  }
  return parseIndexJsonlLines(indexRaw);
}

/**
 * 持久化 chunks。写入顺序：先 index.jsonl，再 meta.json，
 * 避免进程崩溃后留下「meta 已更新但向量未写完」的状态。
 */
export async function saveChunksToCache(
  absoluteFilePath: string,
  fileContentHash: string,
  chunks: CachedChunk[],
  cacheRoot: string
): Promise<void> {
  await ensureCacheDir(cacheRoot);
  const dir = cacheEntryDir(absoluteFilePath, cacheRoot);
  await fs.mkdir(dir, { recursive: true });

  const indexPath = path.join(dir, CACHE_INDEX_FILE);
  const metaPath = path.join(dir, CACHE_META_FILE);

  const indexBody = chunks.map((c) => JSON.stringify(c)).join("\n");
  await fs.writeFile(indexPath, indexBody, "utf-8");

  const meta: RagCacheMeta = {
    v: CACHE_META_VERSION,
    fileHash: fileContentHash,
    sourcePath: absoluteFilePath,
    embedModel: getEmbedModel(),
    chunkSize: CHUNK_DEFAULT_SIZE,
    chunkOverlap: CHUNK_DEFAULT_OVERLAP,
  };
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");
}

/** 删除该源文件对应的缓存目录 */
export async function removeCacheFile(absoluteFilePath: string, cacheRoot: string): Promise<void> {
  const dir = cacheEntryDir(absoluteFilePath, cacheRoot);
  await fs.rm(dir, { recursive: true, force: true });
}
