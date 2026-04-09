import type { SearchHit } from "../rag/ragRetrieval.js";
import { MultiQueryGenerator, type MultiQueryOptions } from "../rag/ragMulti.js";
import { getRagCorpus } from "../ragInstance.js";

const DEFAULT_MULTI_QUERY_OPTIONS: MultiQueryOptions = {
  maxQueries: 4,
  cache: true,
  temperature: 0.3,
  maxTokens: 1000,
};

// function mergeHitsByChunk(all: SearchHit[][], topK = 5): SearchHit[] {
//   const merged = new Map<string, SearchHit>();
//   for (const hits of all) {
//     for (const hit of hits) {
//       const key = `${hit.path}::${hit.chunkId}`;
//       const prev = merged.get(key);
//       if (!prev || hit.score > prev.score) {
//         merged.set(key, hit);
//       }
//     }
//   }
//   return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, topK);
// }

export type MultiQueryResult =
  | {
      ready: true;
      question: string;
      retrievalQueries: string[];
      metaMapSize: number;
      hits: SearchHit[];
    }
  | {
      ready: false;
      message: string;
      question: string;
      metaMapSize: number;
      hits: [];
    };

export async function multiQuery(question: string): Promise<MultiQueryResult> {
  const corpus = getRagCorpus();
  if (!corpus.indexReady) {
    return {
      ready: false,
      message: "索引尚未初始化完成，请稍后再试",
      question,
      metaMapSize: corpus.metaMap.size,
      hits: [],
    };
  }

  // 顺序：原问题 -> MultiQuery 重写 -> 按重写问题做检索 -> 合并去重
  const queryGenerator = new MultiQueryGenerator(question, DEFAULT_MULTI_QUERY_OPTIONS);
  const retrievalQueries = await queryGenerator.generate();
  // const allHits = await Promise.all(retrievalQueries.map((q) => corpus.search(q)));
  const hits: SearchHit[] = [];

  return {
    ready: true,
    question,
    retrievalQueries,
    metaMapSize: corpus.metaMap.size,
    hits,
  };
}
