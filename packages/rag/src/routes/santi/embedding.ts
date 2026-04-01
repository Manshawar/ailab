import { OllamaEmbedder } from "../../embedding/ollama.js";

export class Embedding extends OllamaEmbedder {
  constructor(
    baseUrl: string = "http://localhost:11434",
    model: string = "qwen3-embedding:latest",
  ) {
    super(baseUrl, model);
  }
}