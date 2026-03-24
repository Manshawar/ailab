/**
 * LLM 模型调用模块
 */

import axios from 'axios';
import type { LLMConfig, LLMResponse, Message, StreamEvent, Tool } from './types.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// 创建 LLM 客户端
export function createLLM(config: LLMConfig) {
  const { provider, model, apiKey, maxTokens = 4096, temperature = 0.7 } = config;

  // 调用 Anthropic API
  async function callAnthropic(
    messages: Message[],
    tools?: Tool[],
    systemPrompt?: string
  ): Promise<LLMResponse> {
    const response = await axios.post(
      ANTHROPIC_API_URL,
      {
        model,
        max_tokens: maxTokens,
        temperature,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        system: systemPrompt,
        tools: tools?.length ? tools : undefined,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      }
    );

    return {
      content: response.data.content,
      stop_reason: response.data.stop_reason,
      usage: response.data.usage,
    };
  }

  // 流式调用 Anthropic API
  async function* streamAnthropic(
    messages: Message[],
    tools?: Tool[],
    systemPrompt?: string
  ): AsyncGenerator<StreamEvent> {
    const response = await axios.post(
      ANTHROPIC_API_URL,
      {
        model,
        max_tokens: maxTokens,
        temperature,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        system: systemPrompt,
        tools: tools?.length ? tools : undefined,
        stream: true,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        responseType: 'stream',
      }
    );

    for await (const chunk of response.data) {
      const lines = chunk.toString().split('\n').filter((line: string) => line.trim() !== '');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            yield data as StreamEvent;
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  }

  return {
    config,

    // 发送消息
    async chat(
      messages: Message[],
      tools?: Tool[],
      systemPrompt?: string
    ): Promise<LLMResponse> {
      if (provider === 'anthropic') {
        return callAnthropic(messages, tools, systemPrompt);
      }
      throw new Error(`不支持的模型提供商: ${provider}`);
    },

    // 流式发送消息
    async *stream(
      messages: Message[],
      tools?: Tool[],
      systemPrompt?: string
    ): AsyncGenerator<StreamEvent> {
      if (provider === 'anthropic') {
        yield* streamAnthropic(messages, tools, systemPrompt);
        return;
      }
      throw new Error(`不支持的模型提供商: ${provider}`);
    },
  };
}

export type LLMClient = ReturnType<typeof createLLM>;
