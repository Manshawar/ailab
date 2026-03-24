/**
 * Clawbot Lite 类型定义
 */

// 消息角色
export type MessageRole = 'user' | 'assistant' | 'system';

// 消息内容类型
export type ContentBlockType = 'text' | 'tool_use' | 'tool_result';

// 文本内容块
export interface TextBlock {
  type: 'text';
  text: string;
}

// 工具使用内容块
export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

// 工具结果内容块
export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

// 内容块联合类型
export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

// 消息
export interface Message {
  role: MessageRole;
  content: string | ContentBlock[];
}

// 工具定义
export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

// 工具执行器
export type ToolExecutor = (input: Record<string, unknown>) => Promise<string>;

// 工具注册项
export interface ToolRegistry {
  tool: Tool;
  execute: ToolExecutor;
}

// LLM 配置
export interface LLMConfig {
  provider: 'anthropic' | 'openai';
  model: string;
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
}

// Agent 配置
export interface AgentConfig {
  llm: LLMConfig;
  systemPrompt?: string;
  tools?: ToolRegistry[];
}

// LLM 响应
export interface LLMResponse {
  content: ContentBlock[];
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

// 流式响应事件
export interface StreamEvent {
  type: 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_start' | 'message_delta' | 'message_stop';
  index?: number;
  delta?: {
    type: string;
    text?: string;
    partial_json?: string;
  };
  content_block?: ContentBlock;
}
