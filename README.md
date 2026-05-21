<div align="center">

# Hypo-Workflow

**面向 AI Agent 的本地工作流协议**

规划 -> 执行 -> 审查 -> 报告 -> 恢复

[![Version](https://img.shields.io/badge/version-13.0.0-alpha.1-blue)](.claude-plugin/plugin.json)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Codex%20%7C%20Claude%20Code%20%7C%20OpenCode%20%7C%20Cursor%20%7C%20Copilot%20%7C%20Trae-purple)](docs/reference/platforms.md)

**语言 / Language：中文 | [English](README.en.md)**

</div>

Hypo-Workflow 把长周期 AI 编程工作组织成可规划、可恢复、可审查的本地流程。它不是任务运行器，也不是后台服务；实际编码、测试和审查由你当前使用的智能体完成，`.pipeline/` 保存状态、周期、补丁、规则、进度、提示、报告和日志。

仓库入口是 `HypoxanthineOvO/Hypo-Workflow`；README 只讲通用快速开始，具体安装命令放在各平台 Guide。

## 快速开始与通用能力

Hypo-Workflow 在所有平台上共享同一套 `.pipeline/` 协议：

- **Cycle / Plan / Start / Resume**：把长任务拆成可恢复的 Feature、Milestone、Prompt 和 Report。
- **P0 Configure**：每个新 Cycle 在 `P1 Discover` 前确认或沿用自动化程度、Subagent 授权、验收、PR/MR 远端写确认、完整回归和 worker separation。
- **Rules / Habits**：把用户习惯和项目规则保存成结构化 authority，再生成各平台可读的指令视图。
- **Agent Review**：在计划、测试、实现和收口阶段记录 review artifact，支持多轮 `needs_changes -> repair -> review`。
- **PR/MR Create**：`/hw:pr create` 支持 GitHub PR 与 GitLab MR 的问答式创建，已有本地改动和 plan-first 工作分开处理，远端写一次性确认。
- **Acceptance / Compact Evidence**：`/hw:accept` 会阻塞缺失或冲突的 worker evidence；`/hw:start` 和 `/hw:resume` 成功收口后按 `dirty_only` 策略刷新 compact 视图。
- **Domain Packs**：把 RTL 等领域知识做成可选包；外部包只记录 metadata，安装或远程获取必须明确确认。
- **Sync / Docs / Release**：同步平台适配器、修复文档、执行发布检查，但 Hypo-Workflow 本身不替代宿主 Agent 工作。

主工作流仍然是：

```text
/hw:init -> /hw:plan -> /hw:start
```

查看状态并继续：

```text
/hw:status -> /hw:resume
```

## 平台入口

README 只列通用入口。每个平台的安装命令、支持能力和限制写在对应 Guide 里。

| 平台 | 最适合的入口 | 详细说明 |
|---|---|---|
| Codex | Codex Skill / repo skill source | [Codex Guide](docs/platforms/codex.md) |
| Claude Code | `hw` plugin + Claude hooks/agents | [Claude Code Guide](docs/platforms/claude-code.md) |
| OpenCode | 原生 commands、agents、plugins、TUI/status | [OpenCode Guide](docs/platforms/opencode.md) |
| Cursor | 仓库规则 + 每命令 Skill/Command 文件 | [Cursor Guide](docs/platforms/cursor.md) |
| GitHub Copilot | 仓库 custom instructions | [GitHub Copilot Guide](docs/platforms/copilot.md) |
| Trae | 项目规则文件 | [Trae Guide](docs/platforms/trae.md) |

第三方 IDE 的规则文件是仓库指令：它们帮助智能体学会读取 Hypo-Workflow 的 README、命令语义和 `.pipeline/` 文件协议；Cursor 还会为每个 `/hw-*` 入口同步一个平铺 Skill 文件和 command 文件。它们都不声明平台会自动安装、自动执行钩子或强制生命周期。

## 工作原则

- `.pipeline/state.yaml`、`.pipeline/cycle.yaml`、`.pipeline/rules.yaml` 是受保护 authority 文件。
- Codex Subagents 优先用于非平凡 Codex 工作；实现与测试/审查要尽量分离，implementation Subagent 不读取测试源码/fixtures/snapshots/assertion 细节，无法隔离时记录 degraded mode。
- 完成前做交付前检查：格式、派生产物、README/文档新鲜度、secret marker、测试证据和报告证据。
- 自动化等级由 `.pipeline/config.yaml` 的 `automation.level` 决定；发布、破坏性操作和外部副作用仍按配置确认点执行。

当前版本提供 **50 个用户指令**，另有 **1 个内部 watchdog** skill。

## 常用命令

| 场景 | 命令 |
|---|---|
| 初始化或重新扫描项目 | `/hw:init` |
| 规划一个功能 | `/hw:plan` |
| 规划多个 Feature | `/hw:plan --batch` |
| 开始或继续执行 | `/hw:start` / `/hw:resume` |
| 查看状态和最近事件 | `/hw:status` |
| 查看报告 | `/hw:report` |
| 持续分析和根因调查 | `/hw:analysis` |
| 带证据解释代码/配置/改动 | `/hw:explain "为什么这样设计"` |
| 小修复不进完整 Milestone | `/hw:patch` / `/hw:patch fix P001` |
| 处理已有 PR/MR | `/hw:pr inspect URL`、`/hw:pr review URL`、`/hw:pr fix URL` |
| 创建 PR/MR | `/hw:pr create` / `/hw:pr create --from-worktree` / `/hw:pr create --plan` |
| 修复派生上下文 | `/hw:sync --repair` |
| 检查或修复文档 | `/hw:docs check` / `/hw:docs repair` |
| 压缩长上下文 | `/hw:compact` |
| 引导下一步 | `/hw:guide` |
| 查看或调整规则 | `/hw:rules` |
| 隔离探索 | `/hw:explore` |
| 接受或拒绝交付 | `/hw:accept` / `/hw:reject` |

## 命令概览

| 类别 | 命令 |
|---|---|
| Pipeline | `/hw:start`, `/hw:resume`, `/hw:status`, `/hw:skip`, `/hw:stop`, `/hw:report`, `/hw:chat`, `/hw:analysis` |
| Plan | `/hw:plan`, `/hw:plan:discover`, `/hw:plan:decompose`, `/hw:plan:generate`, `/hw:plan:confirm`, `/hw:plan:extend`, `/hw:plan:review` |
| Lifecycle | `/hw:init`, `/hw:cycle`, `/hw:accept`, `/hw:reject`, `/hw:patch`, `/hw:patch fix`, `/hw:release` |
| Analysis/Review | `/hw:analysis`, `/hw:check`, `/hw:audit`, `/hw:debug`, `/hw:pr`, `/hw:pr create`, `/hw:explain` |
| Maintenance | `/hw:maintain`, `/hw:maintain status`, `/hw:maintain scan`, `/hw:maintain plan`, `/hw:maintain queue`, `/hw:maintain run`, `/hw:maintain apply`, `/hw:maintain verify`, `/hw:maintain log` |
| Utility | `/hw:sync`, `/hw:docs`, `/hw:compact`, `/hw:knowledge`, `/hw:guide`, `/hw:showcase`, `/hw:rules`, `/hw:help`, `/hw:reset`, `/hw:log`, `/hw:setup`, `/hw:explore` |

完整映射见 [Commands Reference](docs/reference/commands.md) 和 [OpenCode Command Map](references/opencode-command-map.md)。

## 文档入口

| 文档 | 用途 |
|---|---|
| [User Guide](docs/user-guide.md) | 常见流程、恢复、Feature Queue |
| [Developer Guide](docs/developer.md) | 核心 helper、权限边界、派生产物和测试约定 |
| [Commands Reference](docs/reference/commands.md) | 50 个标准命令和 OpenCode 映射 |
| [Platforms Reference](docs/reference/platforms.md) | 六个平台能力表 |
| [Generated Artifacts](docs/reference/generated-artifacts.md) | OpenCode、第三方适配、压缩视图和文档引用的生成来源 |
| [OpenCode Guide](docs/platforms/opencode.md) | OpenCode 指令、智能体角色、模型矩阵和边界 |
| [v13.0.0-alpha.1 发布说明](docs/release/v13.0.0-alpha.1.md) | C16 全局维护、C17 审计修复、workspace 拆分和 JSONL ledger 预发布 |
| [Cursor Guide](docs/platforms/cursor.md) | Cursor 仓库规则 |
| [GitHub Copilot Guide](docs/platforms/copilot.md) | GitHub Copilot 仓库指令 |
| [Trae Guide](docs/platforms/trae.md) | Trae 项目规则 |

## 许可证

Hypo-Workflow 使用 MIT License，详见 [LICENSE](LICENSE)。
