import path from "path";
import { RagCorpus } from "./rag/ragCorpus.js";

let instance: RagCorpus | null = null;

/** 进程内唯一 RagCorpus，供路由 / service 与 `index.ts` 共用 */
export function initRagCorpus(watchPath: string): RagCorpus {
  if (instance) {
    return instance;
  }
  instance = new RagCorpus(path.resolve(watchPath));
  return instance;
}

export function getRagCorpus(): RagCorpus {
  if (!instance) {
    throw new Error("RagCorpus 未初始化：请先在入口调用 initRagCorpus(watchPath)");
  }
  return instance;
}
