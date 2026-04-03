import {
  OllamaEmbedder,
  OLLAMA_DEFAULT_BASE_URL,
  OLLAMA_MODEL_BASIC,
} from "../../../utils/embedding.js";

/** basic 路由用的嵌入器（bge-m3），与 `createBasicEmbedder()` 等价 */
export class Embedder extends OllamaEmbedder {
  constructor(baseUrl: string = OLLAMA_DEFAULT_BASE_URL, model: string = OLLAMA_MODEL_BASIC) {
    super(baseUrl, model);
  }
}

export function similarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
