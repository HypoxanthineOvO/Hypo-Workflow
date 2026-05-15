# 贡献指南

欢迎为 Hypo-Workflow 贡献！本指南说明如何添加命令、编写测试、遵循代码风格、添加平台适配器以及提交 PR。

## 如何添加命令 / Skill

新的 `/hw:*` 命令需要同时更新 Skill、命令表和平台适配器：

### 1. 创建 Skill 文件

在 `skills/<kebab-case-command>/SKILL.md` 下创建 Skill 文件。目录名使用 lowercase kebab-case，与命令名（去掉 `/hw:` 前缀）保持一致。

Skill 必须遵循 [`references/skill-spec.md`](references/skill-spec.md) 中定义的格式要求：
- 必须有 frontmatter（`name`、`description`）
- 必须包含 `## Output Language Rules` 章节
- 应包含 `## Preconditions`、`## Execution Flow`、`## Safety Rules` 和 `## Reference Files`

长篇幅的规范、示例、脚本和资源分别放到 `skills/<command>/references/`、`skills/<command>/scripts/` 和 `skills/<command>/assets/` 中，保持 `SKILL.md` 精简（500 行以内）。

### 2. 注册命令映射

**`references/commands-spec.md`**：添加命令名到 recognized commands 列表中，并补充命令的语义描述、flag 和 behavior 说明。

**`references/skill-spec.md`**：在 Inventory 和命令映射表中补充新 Skill 的记录。

### 3. 平台适配器注册

**OpenCode**：在 `.opencode/opencode.json` 中不需要单独的命令条目（OpenCode 通过 Agent role 路由命令），但需通过 `hypo-workflow sync --platform opencode` 刷新生成的适配器。

**Claude Code**：通过 `hypo-workflow sync --platform claude-code` 重新生成 `.claude/commands/` 下的命令文件。

### 4. 同步验证

```bash
hypo-workflow sync --platform opencode
hypo-workflow sync --platform claude-code
```

运行 `/hw:docs repair` 确保生成的文档引用更新。运行 `/hw:check` 验证 Skill 质量检查通过。

## 如何运行测试

Hypo-Workflow 支持多种测试入口：

### Python 测试

```bash
# 使用 pytest 运行全部测试
pytest tests/

# 运行单个测试文件
pytest tests/test_notion_integration.py

# 运行回归测试
python3 tests/run_regression.py
```

### 测试文件结构

- `tests/*.py` — 功能测试
- `tests/fixtures/` — 测试 fixtures（JSON 数据、markdown 样本等）
- `tests/results/` — 测试结果输出
- `tests/bin/` — 测试用二进制文件

### 回归测试

`tests/run_regression.py` 运行所有 S01-S30 测试用例，输出结果写入 `tests/results/`。

### Node.js / JavaScript 测试

```bash
# 如果项目配置了 package.json
npm test
```

## 代码风格

| 层 | 语言 | 说明 |
|---|---|---|
| **Skill 文件** | Markdown | 遵循 `references/skill-spec.md` 的 frontmatter 和章节规范，使用中文主体加英文术语 |
| **References 规范** | Markdown | `references/*.md` 记录命令、Skill、审计、发布等规范文档；中文主体，命令名/配置键/文件名保持英文 |
| **核心代码** | JavaScript | `core/src/` 下为 JS 实现，由 CLI、Skills 和测试共享 |
| **平台适配器** | TypeScript / JSON | `plugins/opencode/templates/*.ts` 和 `plugins/opencode/templates/*.tsx` 使用 TS/TSX |
| **测试** | Python | 测试文件使用 Python，pytest 框架 |
| **配置** | YAML | `.pipeline/*.yaml`、`~/.hypo-workflow/config.yaml` 等项目/全局配置使用 YAML |
| **Translation** | Markdown | `docs/en/` 下为 English 翻译文档，`README.en.md` 为英文入口 |

通用约定：
- 命令名（`/hw:start`）、配置键（`automation.level`）、文件名（`state.yaml`）和平台专有术语保留英文
- 面向用户的说明和文档主体使用中文
- 面向全球的技术规格（Skill spec、命令 spec）使用中英双语

## 平台适配器添加流程

添加新平台适配器需要理解生成链：

### 现有适配器结构

```
plugins/opencode/templates/    → 生成 → .opencode/
plugins/opencode/templates/plugin.ts      → .opencode/commands/
plugins/opencode/templates/plugin-tui.tsx → .opencode/agents/
plugins/opencode/templates/AGENTS.md      → AGENTS.md (根目录)
```

### 核心生成逻辑

`core/src/artifacts/` 包含各平台的 artifact 生成逻辑：
- `core/src/artifacts/opencode.js` — OpenCode 适配器生成
- `core/src/artifacts/claude.js` — Claude Code 适配器生成
- `core/src/artifacts/agent-guidance.js` — 通用 Agent 指导生成
- `core/src/artifacts/third-party.js` — 第三方（Cursor、Copilot、Trae）生成

### 添加新平台的步骤

1. 在 `core/src/artifacts/` 下创建 `platform-name.js`，按平台约定生成命令文件、agent 文件或规则文件
2. 在 `core/src/platform/` 中添加平台路由和配置解析
3. 在 `plugins/<platform>/templates/` 下放置模板文件
4. 在 `docs/platforms/` 下创建平台文档
5. 通过 `hypo-workflow sync --platform <name>` 执行生成
6. 在 `docs/reference/platforms.md` 和配置矩阵中注册新平台

## PR 流程

### 1. Fork 仓库

从主仓库 fork 到自己的账户下。

### 2. 创建功能分支

```bash
git checkout -b feature/your-feature-name
```

### 3. 开发和测试

- 编写代码并遵循代码风格
- 添加必要的测试
- 运行测试套件：`pytest tests/ && python3 tests/run_regression.py`
- 运行 `/hw:docs repair` 更新文档
- 确保 `hypo-workflow sync` 通过

### 4. 提交 PR

- 提交时使用清晰的中文或英文 commit message，说明做了什么和为什么
- Push 到你的 fork
- 在 GitHub 上创建 Pull Request
- PR 标题使用中文，描述中说明变更内容和动机
- 如果有关联 Issue，在 PR 描述中引用

### PR 审查要点

- Skill 文件是否符合 `references/skill-spec.md` 质量检查清单
- 命令映射是否在 `commands-spec.md` 和 `skill-spec.md` 中注册
- 平台适配器是否同步生成
- 测试是否通过
- 文档引用是否更新

> 更多开发细节请参见 [`docs/developer.md`](docs/developer.md)。欢迎提问和讨论！
