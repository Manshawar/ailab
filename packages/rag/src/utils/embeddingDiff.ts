import type { CachedChunk } from "./ragCache";

/** 与 `chunkText` 输出一致，尚未嵌入 */
export type RawChunk = {
  id: string;
  text: string;
  hash: string;
};

export type EmbeddingDiffPlan = {
  /** 与 rawChunks 等长；已复用为完整 CachedChunk，待嵌入为 undefined */
  slots: (CachedChunk | undefined)[];
  /** 仍需调用 embed 的下标 */
  toEmbedIndices: number[];
  /** 成功复用 embedding 的块数 */
  reuseCount: number;
};

/**
 * 整包缓存未命中时，用上一版磁盘 index 中的向量做块级 diff：
 * 同一 `id` 且 `text` 与旧条一致则复用 embedding，否则需重新嵌入。
 *
 * 与 `ragCache` 解耦：不读盘，只消费 `readCachedChunksForDiff` 的结果。
 */
export function planEmbeddingDiff(
  rawChunks: RawChunk[],
  previous: CachedChunk[] | null
): EmbeddingDiffPlan {
  const slots: (CachedChunk | undefined)[] = new Array(rawChunks.length);
  const toEmbedIndices: number[] = [];

  if (!previous?.length) {
    for (let i = 0; i < rawChunks.length; i++) {
      toEmbedIndices.push(i);
    }
    return { slots, toEmbedIndices, reuseCount: 0 };
  }

  const byId = new Map<string, CachedChunk>();
  for (const c of previous) {
    byId.set(c.id, c);
  }

  let reuseCount = 0;
  for (let i = 0; i < rawChunks.length; i++) {
    const rc = rawChunks[i];
    const old = byId.get(rc.id);
    if (old && old.text === rc.text && old.embedding.length > 0) {
      slots[i] = { ...rc, embedding: old.embedding };
      reuseCount++;
    } else {
      toEmbedIndices.push(i);
    }
  }

  return { slots, toEmbedIndices, reuseCount };
}
