import OpenAI from "openai";

export const KIMI_OPENAI_BASE_URL = "https://kimi.a7m.com.cn/v1";
export const KIMI_DEFAULT_MODEL = "kimi-for-coding";

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export type LlmPromptOptions = LlmOptions & {
  system?: string;
};

let client: OpenAI | null = null;

function getApiKey(): string {
  const key = process.env.KIMI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("缺少 KIMI_API_KEY（或 OPENAI_API_KEY）环境变量");
  }
  return key;
}

/** 基于 OpenAI 兼容协议创建 Kimi 中转客户端（单例） */
export function getLlmClient(): OpenAI {
  if (client) {
    return client;
  }
  client = new OpenAI({
    apiKey: getApiKey(),
    baseURL: process.env.KIMI_BASE_URL ?? KIMI_OPENAI_BASE_URL,
  });
  return client;
}

/**
 * 通用聊天接口，返回文本内容。
 */
export async function chatWithLlm(
  messages: LlmMessage[],
  options?: LlmOptions
): Promise<string> {
  const res = await getLlmClient().chat.completions.create({
    model: options?.model ?? process.env.KIMI_MODEL ?? KIMI_DEFAULT_MODEL,
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens,
    messages,
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

/**
 * 便捷方法：单 prompt 直接调用（适合 MultiQueryGenerator 这类接口）。
 */
export async function llmPrompt(
  prompt: string,
  options?: LlmPromptOptions
): Promise<string> {
  const messages: LlmMessage[] = [];
  if (options?.system) {
    messages.push({ role: "system", content: options.system });
  }
  messages.push({ role: "user", content: prompt });
  return chatWithLlm(messages, options);
}
