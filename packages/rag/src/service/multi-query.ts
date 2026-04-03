import type { SearchHit } from "../helper/ragRetrieval.js";
import { getRagCorpus } from "../ragInstance.js";

export type MultiQueryResult =
  | {
      ready: true;
      question: string;
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
  const hits = await corpus.search(question);
  return {
    ready: true,
    question,
    metaMapSize: corpus.metaMap.size,
    hits,
  };
}
