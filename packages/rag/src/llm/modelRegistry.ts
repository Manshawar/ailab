import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export type LlmProviderProfile = {
  baseUrl: string;
  defaultModel: string;
  models: string[];
  apiKey: string;
};

export type EmbeddingProfile = {
  provider: "ollama" | "custom";
  baseUrl: string;
  model: string;
  path?: string;
  apiKey?: string;
};

export type ModelRegistry = {
  defaultLlmProvider: string;
  llmProviders: Record<string, LlmProviderProfile>;
  defaultEmbeddingProfile: string;
  embeddingProfiles: Record<string, EmbeddingProfile>;
};

const DEFAULT_REGISTRY: ModelRegistry = {
  defaultLlmProvider: "maas",
  llmProviders: {
    maas: {
      baseUrl: "https://maas-coding-api.cn-huabei-1.xf-yun.com/v2",
      defaultModel: "astron-code-latest",
      models: ["astron-code-latest"],
      apiKey: "",
    },
    kimi: {
      baseUrl: "https://kimi.a7m.com.cn/v1",
      defaultModel: "kimi-for-coding",
      models: ["kimi-for-coding"],
      apiKey: "",
    },
  },
  defaultEmbeddingProfile: "ollama-local",
  embeddingProfiles: {
    "ollama-local": {
      provider: "ollama",
      baseUrl: "http://localhost:11434",
      model: "qwen3-embedding:latest",
      path: "/api/embed",
    },
  },
};

let memoizedRegistry: ModelRegistry | null = null;

function registryPath(): string {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.join(dirname, "models.json");
}

export function getModelRegistry(): ModelRegistry {
  if (memoizedRegistry) {
    return memoizedRegistry;
  }
  try {
    const raw = fs.readFileSync(registryPath(), "utf-8");
    const parsed = JSON.parse(raw) as ModelRegistry;
    memoizedRegistry = parsed;
    return parsed;
  } catch {
    memoizedRegistry = DEFAULT_REGISTRY;
    return memoizedRegistry;
  }
}

export function reloadModelRegistry(): ModelRegistry {
  memoizedRegistry = null;
  return getModelRegistry();
}
