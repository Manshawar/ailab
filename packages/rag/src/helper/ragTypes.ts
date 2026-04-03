import type { CachedChunk } from "../utils/ragCache.js";

/** 单个源文件在内存中的索引形态 */
export type RagDocumentMeta = {
  hash: string;
  content: string;
  chunks: CachedChunk[];
};
