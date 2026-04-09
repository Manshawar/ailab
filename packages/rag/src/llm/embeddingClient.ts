import { getModelRegistry } from "./modelRegistry.js";

/** Embedding API 返回的向量（维度由模型决定） */
export type EmbeddingVector = number[];

export type EmbedOptions = {
  profile?: string;
  provider?: "ollama" | "custom";
  baseUrl?: string;
  model?: string;
  apiKey?: string;
  path?: string;
};

export type EmbeddingRuntimeConfig = {
  provider: "ollama" | "custom";
  baseUrl: string;
  model: string;
  apiKey?: string;
  path?: string;
};

let runtimeConfig: EmbeddingRuntimeConfig | null = null;

function resolveRegistryConfig(): EmbeddingRuntimeConfig {
  const registry = getModelRegistry();
  const profileName = registry.defaultEmbeddingProfile;
  const profile = registry.embeddingProfiles[profileName];
  if (!profile) {
    throw new Error(`models.json 未找到 embedding profile: ${profileName}`);
  }
  return {
    provider: profile.provider,
    baseUrl: profile.baseUrl,
    model: profile.model,
    apiKey: profile.apiKey,
    path: profile.path ?? "/api/embed",
  };
}

function resolveRegistryConfigByProfile(profileName: string): EmbeddingRuntimeConfig {
  const registry = getModelRegistry();
  const profile = registry.embeddingProfiles[profileName];
  if (!profile) {
    throw new Error(`models.json 未找到 embedding profile: ${profileName}`);
  }
  return {
    provider: profile.provider,
    baseUrl: profile.baseUrl,
    model: profile.model,
    apiKey: profile.apiKey,
    path: profile.path ?? "/api/embed",
  };
}

function resolveCallConfig(options?: EmbedOptions): EmbeddingRuntimeConfig {
  const base = options?.profile
    ? resolveRegistryConfigByProfile(options.profile)
    : runtimeConfig ?? resolveRegistryConfig();
  return {
    provider: options?.provider ?? base.provider,
    baseUrl: options?.baseUrl ?? base.baseUrl,
    model: options?.model ?? base.model,
    apiKey: options?.apiKey ?? base.apiKey,
    path: options?.path ?? base.path,
  };
}

/** 当前进程实际用于缓存校验的嵌入模型名（与 `embedText` 一致） */
export function getEmbedModel(): string {
  return (runtimeConfig ?? resolveRegistryConfig()).model;
}

/** 查看当前 Embedding 运行时配置 */
export function getEmbeddingRuntimeConfig(): EmbeddingRuntimeConfig {
  return runtimeConfig ?? resolveRegistryConfig();
}

/** 动态切换 embedding 模型/网关 */
export function setEmbeddingRuntimeConfig(
  patch: Partial<EmbeddingRuntimeConfig>
): EmbeddingRuntimeConfig {
  runtimeConfig = { ...(runtimeConfig ?? resolveRegistryConfig()), ...patch };
  return runtimeConfig;
}

/** 清空动态配置，回到 models.json 默认 */
export function resetEmbeddingRuntimeConfig(): EmbeddingRuntimeConfig {
  runtimeConfig = null;
  return resolveRegistryConfig();
}

/** 调用 embedding 接口对单段文本生成向量 */
export async function embedText(text: string, options?: EmbedOptions): Promise<EmbeddingVector> {
  const cfg = resolveCallConfig(options);
  const baseUrl = cfg.baseUrl.replace(/\/$/, "");
  const model = cfg.model;
  const apiPath = (cfg.path ?? "/api/embed").startsWith("/") ? cfg.path ?? "/api/embed" : `/${cfg.path}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.apiKey) {
    headers.Authorization = `Bearer ${cfg.apiKey}`;
  }

  const res = await fetch(`${baseUrl}${apiPath}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, input: text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Embedding request failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { embeddings?: number[][] };
  const vec = data.embeddings?.[0];
  if (!vec?.length) {
    throw new Error("Embedding request returned empty embeddings");
  }
  return vec;
}
