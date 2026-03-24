/**
 * 工具定义模块
 */

import axios from 'axios';
import type { Tool, ToolExecutor, ToolRegistry } from './types.js';

// 内置工具：获取当前时间
const getTimeTool: Tool = {
  name: 'get_current_time',
  description: '获取当前日期和时间',
  input_schema: {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: '时区，例如 Asia/Shanghai',
      },
    },
    required: [],
  },
};

const getTimeExecutor: ToolExecutor = async (input) => {
  const timezone = (input.timezone as string) || 'Asia/Shanghai';
  const now = new Date();
  return JSON.stringify({
    time: now.toLocaleString('zh-CN', { timeZone: timezone }),
    timestamp: now.getTime(),
  });
};

// 内置工具：计算器
const calculatorTool: Tool = {
  name: 'calculator',
  description: '执行数学计算，支持加减乘除',
  input_schema: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: '数学表达式，例如 "2 + 3 * 4"',
      },
    },
    required: ['expression'],
  },
};

const calculatorExecutor: ToolExecutor = async (input) => {
  const expression = input.expression as string;
  try {
    // 安全的数学计算（仅支持基本运算）
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
    const result = Function(`"use strict"; return (${sanitized})`)();
    return JSON.stringify({ expression, result });
  } catch (error) {
    return JSON.stringify({ error: '计算错误', expression });
  }
};

// 内置工具：网络请求
const fetchTool: Tool = {
  name: 'fetch_url',
  description: '获取网页内容',
  input_schema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: '要获取的 URL',
      },
    },
    required: ['url'],
  },
};

const fetchExecutor: ToolExecutor = async (input) => {
  const url = input.url as string;
  try {
    const response = await axios.get(url, { timeout: 10000 });
    const content = typeof response.data === 'string'
      ? response.data.slice(0, 5000)
      : JSON.stringify(response.data).slice(0, 5000);
    return JSON.stringify({ url, content });
  } catch (error) {
    return JSON.stringify({ error: '请求失败', url });
  }
};

// 工具注册表
const toolRegistry: Map<string, ToolRegistry> = new Map();

// 注册内置工具
export function registerBuiltinTools(): void {
  toolRegistry.set('get_current_time', {
    tool: getTimeTool,
    execute: getTimeExecutor,
  });
  toolRegistry.set('calculator', {
    tool: calculatorTool,
    execute: calculatorExecutor,
  });
  toolRegistry.set('fetch_url', {
    tool: fetchTool,
    execute: fetchExecutor,
  });
}

// 注册自定义工具
export function registerTool(registry: ToolRegistry): void {
  toolRegistry.set(registry.tool.name, registry);
}

// 获取所有工具定义
export function getTools(): Tool[] {
  return Array.from(toolRegistry.values()).map((r) => r.tool);
}

// 执行工具
export async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  const registry = toolRegistry.get(name);
  if (!registry) {
    return JSON.stringify({ error: `未知工具: ${name}` });
  }
  return registry.execute(input);
}

// 检查工具是否存在
export function hasTool(name: string): boolean {
  return toolRegistry.has(name);
}

export { toolRegistry };
