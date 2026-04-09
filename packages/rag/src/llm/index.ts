import OpenAI from "openai";
import { getModelRegistry } from "./modelRegistry.js";

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmProviderObject = {
  name?: string;
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
  models?: string[];
};

export type LlmOptions = {
  provider?: string | LlmProviderObject;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export type LlmPromptOptions = LlmOptions & {
  system?: string;
};

export type LlmRuntimeConfig = {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  models?: string[];
};

let runtimeConfig: LlmRuntimeConfig | null = null;
const clientPool = new Map<string, OpenAI>();

function resolveRegistryConfig(): LlmRuntimeConfig {
  const registry = getModelRegistry();
  const providerName = registry.defaultLlmProvider;
  const profile = registry.llmProviders[providerName];
  if (!profile) {
    throw new Error(`models.json 未找到 LLM provider: ${providerName}`);
  }
  return {
    provider: providerName,
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
    model: profile.defaultModel,
    models: profile.models,
  };
}

function resolveRegistryConfigByProvider(provider: string): LlmRuntimeConfig {
  const registry = getModelRegistry();
  const profile = registry.llmProviders[provider];
  if (!profile) {
    throw new Error(`models.json 未找到 LLM provider: ${provider}`);
  }
  return {
    provider,
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
    model: profile.defaultModel,
    models: profile.models,
  };
}

function resolveObjectProviderConfig(provider: LlmProviderObject): LlmRuntimeConfig {
  const models = provider.models ?? (provider.defaultModel ? [provider.defaultModel] : undefined);
  return {
    provider: provider.name ?? "custom",
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKey,
    model: provider.defaultModel ?? provider.models?.[0] ?? "",
    models,
  };
}

function ensureConfig(): LlmRuntimeConfig {
  const cfg = runtimeConfig ?? resolveRegistryConfig();
  const key = cfg.apiKey?.trim();
  if (!key) {
    throw new Error("缺少 LLM API Key：请在 src/llm/models.json 的 llmProviders.*.apiKey 配置");
  }
  return { ...cfg, apiKey: key };
}

/** 查看当前 LLM 运行时配置（用于调试/管理） */
export function getLlmRuntimeConfig(): LlmRuntimeConfig {
  return ensureConfig();
}

/** 动态切换 LLM（模型/网关/baseUrl/apiKey），切换后会重建 OpenAI client */
export function setLlmRuntimeConfig(patch: Partial<LlmRuntimeConfig>): LlmRuntimeConfig {
  runtimeConfig = { ...(runtimeConfig ?? resolveRegistryConfig()), ...patch };
  clientPool.clear();
  return ensureConfig();
}

/** 清空动态配置，回到 models.json 默认 */
export function resetLlmRuntimeConfig(): LlmRuntimeConfig {
  runtimeConfig = null;
  clientPool.clear();
  return ensureConfig();
}

/** 基于 OpenAI 兼容协议创建客户端（单例） */
export function getLlmClient(config?: Pick<LlmRuntimeConfig, "baseUrl" | "apiKey">): OpenAI {
  const cfg = config ?? ensureConfig();
  const key = `${cfg.baseUrl}__${cfg.apiKey}`;
  const cached = clientPool.get(key);
  if (cached) {
    return cached;
  }
  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseUrl,
  });
  clientPool.set(key, client);
  return client;
}

function resolveCallConfig(options?: LlmOptions): LlmRuntimeConfig {
  const base =
    typeof options?.provider === "string"
      ? resolveRegistryConfigByProvider(options.provider)
      : typeof options?.provider === "object"
        ? resolveObjectProviderConfig(options.provider)
        : runtimeConfig ?? resolveRegistryConfig();
  const selectedModel = options?.model ?? base.model;
  if (base.models?.length && selectedModel && !base.models.includes(selectedModel)) {
    throw new Error(
      `模型 ${selectedModel} 不在 provider ${base.provider} 的可选列表中: ${base.models.join(", ")}`
    );
  }
  const merged: LlmRuntimeConfig = {
    ...base,
    provider:
      typeof options?.provider === "string"
        ? options.provider
        : typeof options?.provider === "object"
          ? options.provider.name ?? "custom"
          : base.provider,
    baseUrl: options?.baseUrl ?? base.baseUrl,
    apiKey: options?.apiKey ?? base.apiKey,
    model: selectedModel,
  };
  const key = merged.apiKey?.trim();
  if (!key) {
    throw new Error("缺少 LLM API Key：请在 models.json 对应 provider 配置 apiKey 或在 options 传 apiKey");
  }
  if (!merged.model) {
    throw new Error("缺少 LLM model：请在 provider/defaultModel 配置或 options.model 传入");
  }
  return { ...merged, apiKey: key };
}

/** 通用聊天接口，返回文本内容。 */
export async function chatWithLlm(messages: LlmMessage[], options?: LlmOptions): Promise<string> {
  const cfg = resolveCallConfig(options);
  const res = await getLlmClient({ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey }).chat.completions.create({
    model: cfg.model,
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens,
    messages,
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

/** 便捷方法：单 prompt 直接调用（适合 MultiQueryGenerator）。 */
export async function llmPrompt(prompt: string, options?: LlmPromptOptions): Promise<string> {
  const messages: LlmMessage[] = [];
  if (options?.system) {
    messages.push({ role: "system", content: options.system });
  }
  messages.push({ role: "user", content: prompt });
  return chatWithLlm(messages, options);
}
