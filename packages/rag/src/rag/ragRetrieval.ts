/**
 * 检索层：只依赖「当前语料快照」（metaMap + 是否已就绪），不负责监视与嵌入。
 * 与 `RagCorpus` 用组合连接，避免与索引逻辑继承耦合。
 */

import { embedText } from "../llm/embeddingClient";
import { cosineSimilarity } from "../utils/similarity";
import type { RagDocumentMeta } from "./ragTypes.js";

export type SearchHit = {
  score: number;
  path: string;
  chunkId: string;
  text: string;
};

export type RagCorpusSnapshot = {
  indexReady: boolean;
  metaMap: Map<string, RagDocumentMeta>;
};

export class RagRetriever {
  constructor(private readonly getSnapshot: () => RagCorpusSnapshot) {}

  /**
   * 问题嵌入后与全部 chunk 做余弦相似度，返回 topK。
   * `indexReady === false` 时立即返回空数组。
   */
  async search(question: string, topK = 5): Promise<SearchHit[]> {
    const { indexReady, metaMap } = this.getSnapshot();
    if (!indexReady) {
      return [];
    }
    const q = question?.trim();
    if (!q) {
      return [];
    }
    const qEmb = await embedText(q);
    const hits: SearchHit[] = [];
    for (const [filePath, meta] of metaMap) {
      for (const chunk of meta.chunks) {
        const score = cosineSimilarity(qEmb, chunk.embedding);
        hits.push({
          score,
          path: filePath,
          chunkId: chunk.id,
          text: chunk.text,
        });
      }
    }
    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, topK);
  }
}
