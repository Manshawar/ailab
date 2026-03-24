/**
 * Agent 核心模块
 */

import type { AgentConfig, ContentBlock, Message, ToolUseBlock } from './types.js';
import { createLLM, type LLMClient } from './llm.js';
import { executeTool, getTools, registerBuiltinTools } from './tools.js';

// 默认系统提示
const DEFAULT_SYSTEM_PROMPT = `你是一个有帮助的 AI 助手。你可以使用工具来帮助用户完成任务。
当需要使用工具时，请选择合适的工具并正确传递参数。
回答问题时请简洁明了。`;

// Agent 类
export class Agent {
  private llm: LLMClient;
  private messages: Message[] = [];
  private systemPrompt: string;
  private maxIterations: number;

  constructor(config: AgentConfig) {
    this.llm = createLLM(config.llm);
    this.systemPrompt = config.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    this.maxIterations = 10;

    // 注册内置工具
    registerBuiltinTools();

    // 注册自定义工具
    config.tools?.forEach((_tool) => {
      // 工具已在 tools.ts 中注册
    });
  }

  // 处理用户消息
  async chat(userMessage: string): Promise<string> {
    // 添加用户消息
    this.messages.push({
      role: 'user',
      content: userMessage,
    });

    let iteration = 0;
    let finalResponse = '';

    while (iteration < this.maxIterations) {
      iteration++;

      // 调用 LLM
      const response = await this.llm.chat(
        this.messages,
        getTools(),
        this.systemPrompt
      );

      // 添加助手消息
      this.messages.push({
        role: 'assistant',
        content: response.content,
      });

      // 检查是否需要工具调用
      const toolUseBlocks = response.content.filter(
        (block): block is ToolUseBlock => block.type === 'tool_use'
      );

      if (toolUseBlocks.length === 0) {
        // 没有工具调用，返回文本响应
        const textBlocks = response.content.filter(
          (block): block is ContentBlock & { type: 'text' } => block.type === 'text'
        );
        finalResponse = textBlocks.map((b) => b.text).join('\n');
        break;
      }

      // 执行工具调用
      const toolResults: ContentBlock[] = [];
      for (const toolUse of toolUseBlocks) {
        console.log(`[工具调用] ${toolUse.name}`);
        const result = await executeTool(toolUse.name, toolUse.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      // 添加工具结果
      this.messages.push({
        role: 'user',
        content: toolResults,
      });
    }

    return finalResponse || '抱歉，我无法完成这个请求。';
  }

  // 流式处理用户消息
  async *streamChat(userMessage: string): AsyncGenerator<string> {
    // 添加用户消息
    this.messages.push({
      role: 'user',
      content: userMessage,
    });

    const stream = this.llm.stream(this.messages, getTools(), this.systemPrompt);

    let currentText = '';

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        currentText += event.delta.text;
        yield event.delta.text;
      }
    }

    // 如果有输出，添加到消息历史
    if (currentText) {
      this.messages.push({
        role: 'assistant',
        content: [{ type: 'text', text: currentText }],
      });
    }
  }

  // 获取消息历史
  getHistory(): Message[] {
    return [...this.messages];
  }

  // 清空历史
  clearHistory(): void {
    this.messages = [];
  }
}

// 创建 Agent 实例
export function createAgent(config: AgentConfig): Agent {
  return new Agent(config);
}
