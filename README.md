# Clawbot Lite

一个用于学习 AI 开发的简单 Agent 框架。

## 项目简介

Clawbot Lite 是一个轻量级的 AI Agent 框架，帮助前端开发者快速入门 AI 应用开发。

## 功能特性

- 🤖 支持 Anthropic Claude API
- 🔧 可扩展的工具系统
- 💬 命令行交互界面
- 📝 TypeScript 类型安全

## 项目结构

```
clawbot-lite/
├── src/
│   ├── index.ts        # 入口（CLI）
│   ├── agent.ts        # Agent 核心
│   ├── llm.ts          # 模型调用
│   ├── tools.ts        # 工具定义
│   └── types.ts        # 类型定义
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── .env.example
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的 API Key
```

### 开发模式

```bash
pnpm dev
```

### 构建

```bash
pnpm build
```

### 运行

```bash
pnpm start
```

## 核心模块说明

### index.ts
CLI 入口，处理命令行参数和用户交互。

### agent.ts
Agent 核心逻辑，负责：
- 管理对话上下文
- 调用 LLM 模型
- 执行工具调用
- 处理响应流程

### llm.ts
LLM 模型调用封装，支持：
- Anthropic Claude API
- 流式响应
- 错误处理

### tools.ts
工具定义模块，包含：
- 工具接口定义
- 内置工具实现
- 工具注册机制

### types.ts
TypeScript 类型定义，确保类型安全。

## 开发指南

### 代码规范

```bash
# 检查代码规范
pnpm lint

# 自动修复
pnpm lint:fix

# 类型检查
pnpm typecheck
```

### 添加新工具

1. 在 `tools.ts` 中定义工具
2. 实现工具执行逻辑
3. 在 Agent 中注册工具

## License

MIT
