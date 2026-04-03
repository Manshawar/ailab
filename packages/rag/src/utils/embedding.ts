/** Ollama `/api/embed` 返回的向量（维度由模型决定） */
export type EmbeddingVector = number[];

export const OLLAMA_DEFAULT_BASE_URL = "http://localhost:11434";

/** basic 路由默认嵌入模型 */
export const OLLAMA_MODEL_BASIC = "bge-m3:latest";

/** 三体 RAG 默认嵌入模型 */
export const OLLAMA_MODEL_SANTI = "qwen3-embedding:latest";

export type OllamaEmbedderOptions = {
  baseUrl?: string;
  model?: string;
};

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * 通过本地 Ollama 的 `/api/embed` 生成文本向量，带进程内缓存。
 */
export class OllamaEmbedder {
  private cache = new Map<string, EmbeddingVector>();

  constructor(
    private baseUrl: string = OLLAMA_DEFAULT_BASE_URL,
    private model: string = OLLAMA_MODEL_BASIC,
  ) {}

  async embed(text: string): Promise<EmbeddingVector> {
    const cleaned = normalizeWhitespace(text);
    const cached = this.cache.get(cleaned);
    if (cached) {
      return cached;
    }

    const res = await fetch(`${this.baseUrl}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, input: cleaned }),
    });
    const data = (await res.json()) as {
      embeddings?: EmbeddingVector[] | EmbeddingVector;
    };
    const embedding = Array.isArray(data.embeddings?.[0])
      ? (data.embeddings as EmbeddingVector[])[0]
      : (data.embeddings as EmbeddingVector);

    this.cache.set(cleaned, embedding);
    return embedding;
  }

  async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    const cleaned = texts.map((t) => normalizeWhitespace(t));
    const uncached = cleaned.filter((text, index, arr) => {
      return !this.cache.has(text) && arr.indexOf(text) === index;
    });

    if (uncached.length > 0) {
      const res = await fetch(`${this.baseUrl}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model, input: uncached }),
      });
      const data = (await res.json()) as { embeddings: EmbeddingVector[] };

      uncached.forEach((text, i) => {
        this.cache.set(text, data.embeddings[i]);
      });
    }

    return cleaned.map((text) => this.cache.get(text)!);
  }
}

/** 通用构造：可覆盖 baseUrl / model */
export function createOllamaEmbedder(options?: OllamaEmbedderOptions): OllamaEmbedder {
  return new OllamaEmbedder(
    options?.baseUrl ?? OLLAMA_DEFAULT_BASE_URL,
    options?.model ?? OLLAMA_MODEL_BASIC,
  );
}

export function createBasicEmbedder(baseUrl?: string): OllamaEmbedder {
  return new OllamaEmbedder(baseUrl ?? OLLAMA_DEFAULT_BASE_URL, OLLAMA_MODEL_BASIC);
}

export function createSantiEmbedder(baseUrl?: string): OllamaEmbedder {
  return new OllamaEmbedder(baseUrl ?? OLLAMA_DEFAULT_BASE_URL, OLLAMA_MODEL_SANTI);
}
