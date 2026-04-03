/** 兼容旧路径：实现已迁至 `utils/embedding` */
export {
  OllamaEmbedder,
  type EmbeddingVector,
  OLLAMA_DEFAULT_BASE_URL,
  OLLAMA_MODEL_BASIC,
  OLLAMA_MODEL_SANTI,
  createOllamaEmbedder,
  createBasicEmbedder,
  createSantiEmbedder,
} from "../utils/embedding.js";
