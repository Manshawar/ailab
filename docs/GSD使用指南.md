# GSD (Get Shit Done) 使用指南

## 简介

GSD 是一个为 Claude Code 单智能体开发优化的分层项目规划系统。

---

## 核心工作流

```
/gsd:new-project → /gsd:plan-phase → /gsd:execute-phase → 重复
```

---

## 常用命令

### 1. 项目初始化

```bash
/gsd:new-project
```
一个命令完成：提问 → 研究 → 需求定义 → 路线图创建

### 2. 阶段规划

```bash
/gsd:plan-phase 1
```
为第一阶段创建详细执行计划

### 3. 执行阶段

```bash
/gsd:execute-phase 1
```
执行阶段中的所有计划

---

## 快速任务

### 极小任务（无规划开销）

```bash
/gsd:fast "修复 README 中的拼写错误"
/gsd:fast "添加 .env 到 gitignore"
```
- 不创建规划文件
- 直接执行并提交

### 小任务（简化规划）

```bash
/gsd:quick "添加登录功能"
/gsd:quick --full "重构用户认证"
```
可选标志：
- `--discuss` — 规划前讨论
- `--research` — 执行前研究
- `--full` — 添加计划检查和验证

---

## 其他实用命令

| 命令 | 用途 |
|------|------|
| `/gsd:progress` | 查看项目进度 |
| `/gsd:resume-work` | 恢复之前的工作 |
| `/gsd:debug "问题描述"` | 系统化调试 |
| `/gsd:add-todo "任务描述"` | 添加待办 |
| `/gsd:check-todos` | 查看待办列表 |
| `/gsd:insert-phase 5 "紧急任务"` | 插入中间阶段 |
| `/gsd:complete-milestone 1.0.0` | 完成里程碑 |

---

## 项目结构

```
.planning/
├── PROJECT.md         # 项目愿景
├── ROADMAP.md         # 阶段路线图
├── STATE.md           # 项目状态
├── REQUIREMENTS.md    # 需求文档
└── phases/
    ├── 01-foundation/
    │   ├── 01-01-PLAN.md
    │   └── 01-01-SUMMARY.md
    └── 02-core-features/
```

---

## 获取帮助

```bash
/gsd:help          # 显示完整命令参考
/gsd:do <描述>     # 智能路由到合适的命令
```

---

## 完整示例：新项目从零开始

```bash
# 1. 初始化项目（交互式提问）
/gsd:new-project

# 2. 查看当前进度
/gsd:progress

# 3. 规划第一阶段
/gsd:plan-phase 1

# 4. 执行第一阶段
/gsd:execute-phase 1

# 5. 验证工作
/gsd:verify-work 1

# 6. 继续下一阶段...
/gsd:plan-phase 2
/gsd:execute-phase 2
```

---

## 提示

- 使用 `/gsd:do` 当你不确定用哪个命令时
- 定期运行 `/gsd:progress` 查看项目状态
- 使用 `/gsd:fast` 处理极小的快速修复
- 使用 `/gsd:quick --full` 处理需要验证的小任务
