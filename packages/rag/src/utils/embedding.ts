/** Ollama `/api/embed` 返回的向量（维度由模型决定） */
export type EmbeddingVector = number[];

export const OLLAMA_DEFAULT_BASE_URL = "http://localhost:11434";

/** 三体 RAG 默认嵌入模型 */
export const OLLAMA_MODEL_EMBEDDING = "qwen3-embedding:latest";

/** 当前进程实际用于缓存校验的嵌入模型名（与 `embedText` 一致） */
export function getEmbedModel(): string {
  return process.env.OLLAMA_EMBEDDING_MODEL ?? OLLAMA_MODEL_EMBEDDING;
}

export type EmbedOptions = {
  baseUrl?: string;
  model?: string;
};

/**
 * 调用本地 Ollama `/api/embed` 对单段文本生成向量。
 */
export async function embedText(
  text: string,
  options?: EmbedOptions
): Promise<EmbeddingVector> {
  const baseUrl = (
    options?.baseUrl ??
    process.env.OLLAMA_BASE_URL ??
    OLLAMA_DEFAULT_BASE_URL
  ).replace(/\/$/, "");
  const model = options?.model ?? getEmbedModel();

  const res = await fetch(`${baseUrl}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama embed failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { embeddings?: number[][] };
  const vec = data.embeddings?.[0];
  if (!vec?.length) {
    throw new Error("Ollama embed: empty embeddings");
  }
  return vec;
}

/** 余弦相似度，用于查询向量与 chunk 向量的比对 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
