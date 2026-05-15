# 开发者指南

核心 helper 位于 `core/src/`，由 CLI、skills、OpenCode artifacts 和测试共用。开发时优先修改这些源头，再通过 docs/sync 刷新派生文档和平台适配器。

## 合同

- `.pipeline/` 是状态、Cycle、Rules、PROGRESS、logs、prompts 和 reports 的 source of truth。
- Generated adapters 是派生产物，不能反向作为 authority。
- 修改 `.pipeline/state.yaml`、`.pipeline/cycle.yaml`、`.pipeline/rules.yaml` 这类 protected authority 文件时，必须走生命周期命令或 workflow commit helper。
- 命令、配置键、文件名和平台专有词保留英文；面向人的说明保持中文主体。

## 架构概览

### 核心目录

| 目录 | 用途 | 写入边界 |
|---|---|---|
| `.pipeline/` | source of truth：state、cycle、config、rules、prompts、reports、logs、knowledge、audits、patches、pr 存档 | 生命周期命令或 workflow commit helper |
| `skills/` | 40 个本地 Skill 文件，每个 Skill 目录包含 `SKILL.md`、可选 `references/`、`scripts/` 和 `assets/` | Skill 命令执行和 sync 适配器 |
| `references/` | 规范性文档：skill-spec、commands-spec、check-spec、release-spec、audit-spec、debug-spec 等 | 命令语义定义和 Skill 编写指南 |
| `core/src/` | JS 实现：config、commands、artifacts、lifecycle、preflight、compact、knowledge、domains 等模块 | CLI、Skills、测试和平台适配器共享 |
| `.pipeline/prompts/` | Cycle 生成的执行提示文件 | `/hw:plan:generate` 和 `/hw:plan:extend` |
| `.pipeline/knowledge/` | Knowledge Ledger 记录、索引和 compact 摘要 | `/hw:knowledge` 命令 |
| `.pipeline/archives/` | 已完成或关闭的 Cycle 文件归档 | `/hw:cycle close` 或新 Cycle 开始前 |
| `docs/` | 用户和开发者文档（中文主体） | `/hw:docs` 命令 |
| `docs/en/` | 英文翻译文档 | `/hw:docs` 命令和翻译同步 |
| `docs/platforms/` | 各平台文档：Claude Code、Codex、OpenCode、Cursor、Copilot、Trae | `/hw:docs` 命令 |
| `tests/` | Python 测试文件和 fixtures | 手动运行或 CI |

### 数据流

```
config.yaml ──→ ──┐
references/* ──→ ─┤
skills/*/SKILL.md ─┤─→ core/src/artifacts/*.js ──→ 平台适配器
state.yaml ──────→ ─┘         │
cycle.yaml ──────→ ─┘         ├──→ .opencode/ (commands, agents, json)
                              ├──→ .claude/ (commands, agents, plugin)
                              └──→ AGENTS.md (根目录指令)
```

所有生成路径从 `core/src/artifacts/` 出发，通过 `hypo-workflow sync --platform <name>` 触发。生成的适配器是派生产物，不应手动编辑。

## 命令注册流程

添加新的 `/hw:*` 命令需要在三个层面注册：

### 1. Skill 文件层

在 `skills/<kebab-case-name>/SKILL.md` 创建符合 `references/skill-spec.md` 规范的 Skill 文件。frontmatter 中的 `name` 和 `description` 用于平台的自动激活和上下文加载。

### 2. 命令规范层

**`references/commands-spec.md`**：将命令名加入 recognized commands 列表，编写 command semantics（flags、preconditions、behavior）。这是所有平台的权威命令定义。

**`references/skill-spec.md`**：在 Inventory 和 Canonicical user-facing command map 中注册新 Skill 路径和平台指令名（Codex 原名、OpenCode dash 名、Claude Code 名）。

### 3. 平台适配器层

**OpenCode**：`core/src/artifacts/opencode.js` 会根据 `references/opencode-command-map.md` 生成 `.opencode/commands/` 下的命令文件和 `.opencode/agents/` 下的 agent 角色映射表。不需要手动编辑 `.opencode/opencode.json`。

**Claude Code**：`core/src/artifacts/claude.js` 生成 `.claude/commands/`、`.claude/agents/` 和插件文件。命令文件应路由到相同的规范 Skill/reference 合约。

**Codex**：通过 `$CODEX_HOME/skills/hypo-workflow` 下的已安装 Skill bundle 进行渐进式 Skill 加载。

### 4. 同步命令

```bash
# 仅检测外部变化，不写入
hypo-workflow sync --check-only

# 刷新 OpenCode 适配器
hypo-workflow sync --platform opencode

# 刷新 Claude Code 适配器
hypo-workflow sync --platform claude-code

# 修复派生物件
hypo-workflow sync --repair
```

## Skill 编写规范

所有 Skill 必须遵循 [`references/skill-spec.md`](../references/skill-spec.md) 中定义的规范合同。关键要求：

### 目录和命名

- 目录名使用 lowercase kebab-case，匹配命令 stem（去掉 `/hw:` 前缀）
- `SKILL.md` 只保留激活所需的指令、安全规则、步骤序列、输出规则和直接引用链接
- 长篇幅语义放到 `references/`，确定性 helper 放到 `scripts/`，可复用 payload 放到 `assets/` 或 `templates/`
- 别名命令可以共享同一个 Skill（如 `/hw:patch` 和 `/hw:patch fix` 共享 `skills/patch/SKILL.md`）

### 必需的 SKILL.md 格式

```markdown
---
name: kebab-case-name
description: One sentence that states what the Skill does and when to use it.
---

# /hypo-workflow:command

## Output Language Rules
## Preconditions
## Execution Flow
## Interactive Behavior
## Safety Rules
## Failure Handling
## Reference Files
```

### Output Language Rules（输出语言规则）

每个面向用户的 Skill 必须包含 `## Output Language Rules` 章节，说明如何根据 `.pipeline/config.yaml` 和全局配置解析输出语言。运行时 state/log key 保持英文。当平台支持 `@include` 或类似模板化时，Skill 文件应通过 `<!-- @include: output-language-rule -->` 引用集中规则，而非在体内重复。

### 安全规则

涉及受保护文件写入、破坏性操作、release action 或外部发布的 Skill 必须包含 `## Safety Rules` 和/或 `## Failure Handling` 章节。

### 质量检查

提交前使用 [`references/skill-spec.md`](../references/skill-spec.md) 末尾的 Quality Checklist 自查：
- Inventory：Skill 路径存在，command map 指向正确
- Naming：目录和 frontmatter 使用 lowercase kebab-case
- Trigger：description 说明了作用和触发条件
- Scope：Skill 拥有一个连贯的工作流
- Output：`Output Language Rules` 存在
- Safety：受保护文件和破坏性操作明确 gated
- References：列出的文件存在且路径有效

## 测试编写和执行

### Python 测试

```bash
# 使用 pytest 运行全部测试
pytest tests/

# 运行单个测试文件
pytest tests/test_notion_integration.py

# 运行回归测试
python3 tests/run_regression.py
```

### 测试目录结构

```
tests/
├── test_notion_source_adapter.py    # Notion 源适配器测试
├── test_notion_output_adapter.py    # Notion 输出适配器测试
├── test_notion_mixed_mode.py        # Notion 混合模式测试
├── test_notion_integration.py       # Notion 集成测试
├── run_regression.py                # 回归测试入口
├── fixtures/                        # 测试 fixtures
│   └── notion/                      # Notion API response 样本
│       ├── database_query.json
│       ├── blocks_*.json
│       ├── page_children.json
│       └── report.md
├── results/                         # 测试结果输出
└── bin/                             # 测试用二进制
    └── rg
```

### Node.js 测试

```bash
# 如果项目配置了 package.json
npm test
```

### 回归测试

`tests/run_regression.py` 运行 S01-S30 所有测试用例。结果以 JSON 格式写入 `tests/results/YYYYMMDDTHHmmss-s01-s30.json`。

### CI/CD

将以下命令加入 CI 流水线：

```bash
pytest tests/
python3 tests/run_regression.py
hypo-workflow sync --check-only
```

## 平台适配器

Hypo-Workflow 将一套规范命令集映射到多个平台面。

### 平台概览

| 平台 | 主要面 | 生成或安装的资产 | 说明 |
|---|---|---|---|
| **Codex** | `$CODEX_HOME/skills/hypo-workflow` | root `SKILL.md` 和 `skills/*/SKILL.md` | 从已安装的 Skill bundle 渐进式加载 |
| **Claude Code** | `.claude/commands/*`、`.claude/agents/*`、plugin 文件 | `hypo-workflow sync --platform claude` 生成 | 命令文件路由到相同的规范 Skill/reference 合约；Claude 原生命令和 Hypo `/hw:*` 严格分离 |
| **OpenCode** | `.opencode/commands/*`、`.opencode/agents/*`、`.opencode/hypo-workflow.json` | `hypo-workflow sync --platform opencode` 生成 | OpenCode 命令名使用 dash 风格斜杠命令，通过 agent 角色路由 |
| **Cursor / Copilot / Trae** | repository instruction files | `hypo-workflow sync --platform third-party` 生成 | 仅提供规则/说明，不声明 hook、runner 或 lifecycle enforcement |

### 生成链

```
references/skill-spec.md  ──→ core/src/artifacts/opencode.js     ──→ .opencode/
references/commands-spec.md ──→ core/src/artifacts/claude.js      ──→ .claude/
skills/*/SKILL.md           ──→ core/src/artifacts/agent-guidance.js ──→ AGENTS.md
                                core/src/artifacts/third-party.js  ──→ Cursor/Copilot/Trae instruction
```

### 平台配置差异

详细的平台配置差异见 [`docs/reference/configuration.md`](reference/configuration.md#平台配置差异)。
