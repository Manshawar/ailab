# Ailab

AI 学习仓库 - 用于实现和实验各种 AI 技术（RAG、Agent 等）

## 结构

```
ailab/
├── package.json           # root 配置，共享 devDependencies
├── pnpm-workspace.yaml    # pnpm workspace 配置
├── tsconfig.base.json     # 共享 tsconfig
├── .eslintrc.cjs          # 共享 eslint 配置
│
└── packages/
    ├── core/              # 核心共享模块（可选）
    ├── rag/               # RAG 实现
    └── agent/             # Agent 实现
```

## 使用

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint

# 清理
pnpm clean
```

## 添加新项目

1. 在 `packages/` 下创建新文件夹
2. 创建 `package.json` 和 `tsconfig.json`
3. 需要时通过 `workspace:*` 引用其他包

## 依赖管理

- **共享工具**（typescript, eslint）→ 放 root `package.json`
- **项目特有依赖**（axios, zod 等）→ 放各自 `package.json`
- **包间引用** → 使用 `"workspace:*"`
