import { OllamaEmbedder } from "../../../embedding/ollama.js";

export class Embedder extends OllamaEmbedder {
  constructor(
    baseUrl: string = "http://localhost:11434",
    model: string = "bge-m3:latest",
  ) {
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
