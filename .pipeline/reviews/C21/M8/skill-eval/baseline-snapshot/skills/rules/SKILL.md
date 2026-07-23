---
name: rules
description: Manage Hypo-Workflow rule severities, custom natural-language rules, lifecycle hooks, and shareable rule packs.
---

# /hypo-workflow:rules
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

当用户调用 `/hw:rules` 或 `/hypo-workflow:rules` 时使用此技能。

Rules 是 Hypo-Workflow 的独立维度，与 skills、commands、hooks 和 config 并列。它们收集了先前分散在 `SKILL.md`、hooks 和 `config.yaml` 中的行为约束。

## 路径

插件分发的 rules：

- `rules/builtin/*.yaml`
- `rules/presets/recommended.yaml`
- `rules/presets/strict.yaml`
- `rules/presets/minimal.yaml`
- `rules/template/custom-rule-template.md`

项目本地的 rules：

- `.pipeline/rules.yaml`
- `.pipeline/rules/custom/*.md`
- `.pipeline/rules/structured/project/*.yaml`
- `.pipeline/rules/structured/cycle/*.yaml`
- `.pipeline/rules/packs/<pack-name>/`

用户级结构化 habits：

- `~/.hypo-workflow/rules/structured/*.yaml`

全局 habits 是用户级权限，应仅在明确配置或由活动 rules 命令选择时才加载。不要让项目行为静默依赖于操作者主目录中存在的任何内容。

## Severity 模型

使用 ESLint 风格的 severity 模型：

| Severity | 行为 |
|---|---|
| `off` | 禁用；不加载或强制执行。 |
| `warn` | 打印警告并继续。 |
| `error` | 视为硬门控，停止执行直到解决或降级。 |

Severity 决定行为。标签仅为元数据。

## Structured Rules/Habits 权威

C8 引入了结构化 Rules/Habits 作为持久用户偏好和项目行为的首选权威。Markdown 文件和适配器指令文本是生成的或兼容性视图。

支持的范围，从最高到最低优先级：

1. `cycle`
2. `project`
3. `global`
4. `builtin`

当多个记录共享一个 `id` 时，按该范围顺序解析获胜者，并报告被覆盖的范围/源路径。不要静默隐藏冲突；Agent Review 应记录检查了哪些规则以及哪些无法自动检查。

结构化 rule 形状：

```yaml
id: user-frontend-layout-density
scope: project
label: frontend
severity: warn
hooks:
  - always
  - on-evaluate
source:
  captured_from: chat
  author: user
content:
  instruction: "Front-end tool pages should prioritize dense, scannable operational UI."
  rationale: "The project targets repeated workflow operations."
  examples:
    good:
      - "compact tables and toolbars"
    bad:
      - "large marketing-style hero sections"
enforcement:
  check_kind: agent_judgment
  evidence_required: true
```

对新的 "记住此规则" 行为使用结构化记录。保留 `.pipeline/rules.yaml` 用于预设和 severity 覆盖。

## Labels

支持的语义标签：

- `guard`：预执行门控，如 `git-clean-check`
- `style`：输出和语言偏好
- `hook`：包装为 rules 的 hook 行为
- `workflow`：流程偏好，如提交和审查策略
- `quality`：仓库资产质量检查，如 `skill-quality`
- `release`：发布门控，如 `readme-freshness`

自定义 rules 可以使用这些标签或简洁的项目特定标签。

## Hooks

支持的生命周期 hook 点：

- `on-session-start`
- `pre-milestone`
- `post-milestone`
- `pre-step`
- `post-step`
- `pre-commit`
- `pre-release`
- `on-fail`
- `on-evaluate`
- `always`

Rules 可以绑定到多个 hooks。`always` rules 被注入执行上下文，应在整个会话期间遵循。

## 指令列表

支持的形式：

```text
/hw:rules
/hw:rules list
/hw:rules list --active
/hw:rules list --label guard
/hw:rules enable <name>
/hw:rules disable <name>
/hw:rules set <name> <off|warn|error>
/hw:rules create <name>
/hw:rules edit <name>
/hw:rules delete <name>
/hw:rules pack export <name>
/hw:rules pack import <url>
```

## 加载算法

按此优先级顺序（从低到高）构建有效的 rule 表：

1. 来自 `rules/builtin/` 的内置 rule 元数据。
2. 来自 `rules/presets/<extends>.yaml` 的预设 severity。
3. 来自 `.pipeline/rules/custom/` 的自定义 rules。
4. 来自用户、项目和 Cycle 范围的结构化 Rules/Habits。
5. 来自 `.pipeline/rules.yaml` 中 `rules:` 的覆盖。
6. 当命令支持时，来自 `--rule name=severity` 的临时命令覆盖。

当 `.pipeline/rules.yaml` 缺失时，行为如下：

```yaml
extends: recommended
rules: {}
```

与内置 rule 同名的自定义 rules 覆盖内置内容，但正常的 severity 优先级仍然适用。

## `.pipeline/rules.yaml`

规范形状：

```yaml
extends: recommended

rules:
  git-clean-check: error
  commit-format: off
  report-language: warn
  my-lint-rule: warn
```

`extends` 可以是字符串或列表。内置值为 `recommended`、`strict` 和 `minimal`。Git rule 包可以引用为 `github:owner/repo` 或 `gitee:owner/repo`。

## 列出规则

对于 `/hw:rules` 或 `/hw:rules list`：

1. 加载有效的 rule 表。
2. 按以下顺序按标签分组：guard、style、hook、workflow、quality、release、custom。
3. 显示名称、severity、hooks 以及 rule 是否启用。
4. 应用过滤器：
   - `--active`：排除 `off`
   - `--label <label>`：仅包含该标签
5. 以总计结束：启用计数、error 计数、warn 计数、off 计数。

当 shell 执行可用时，使用 `scripts/rules-summary.sh` 作为确定性摘要助手，然后以配置的输出语言呈现结果。

## 启用、禁用与设置规则

对于 `/hw:rules enable <name>`：

1. 确保 `.pipeline/` 存在；如果不存在，告诉用户运行 `/hw:init`。
2. 如果缺失，创建 `.pipeline/rules.yaml`。
3. 设置 `rules.<name>: warn`。

对于 `/hw:rules disable <name>`：

1. 确保 `.pipeline/rules.yaml` 存在。
2. 设置 `rules.<name>: off`。

对于 `/hw:rules set <name> <severity>`：

1. 验证 severity 是 `off`、`warn` 或 `error` 之一。
2. 将 `rules.<name>` 设置为该 severity。
3. 保留不相关的 rules 和 `extends`。

尽可能使用结构化 YAML 编辑。不要重写不相关的项目配置。

## 创建自定义规则

对于 `/hw:rules create <name>`：

1. 验证名称匹配 `^[a-z0-9][a-z0-9-]*$`。
2. 交互式询问：
   - label：`guard`、`style`、`hook` 或 `workflow`
   - severity：`off`、`warn` 或 `error`
   - hook 点：一个或多个支持的 hooks
   - 自然语言 rule 正文
3. 创建 `.pipeline/rules/custom/<name>.md`。
4. 在 `.pipeline/rules.yaml` 中添加或更新 `rules.<name>: <severity>`。
5. 显示创建的文件路径。

生成的 Markdown 格式：

```markdown
# my-test-rule

- **标签**: workflow
- **严格度**: warn
- **钩子点**: pre-commit

## 规则内容

每次 commit 前检查是否有超过 3 个 TODO 注释。如果有，提醒我处理。
```

不要在没有用户自然语言内容的情况下自动创建自定义 rule。

## 创建结构化规则

对于新的记住的偏好，优先使用结构化 YAML 而不是 Markdown 自定义 rules。使用此路径选择：

- `scope=cycle` -> `.pipeline/rules/structured/cycle/<id>.yaml`
- `scope=project` -> `.pipeline/rules/structured/project/<id>.yaml`
- `scope=global` -> `~/.hypo-workflow/rules/structured/<id>.yaml`

普通的推断候选项应在当前讨论或检查点结束时呈现确认。不要仅仅因为检测到可能的 rule 就中断用户的主任务。明确的强制写入措辞可以立即写入，但仍必须使用选定的范围并记录操作。

## 编辑与删除自定义规则

对于 `/hw:rules edit <name>`：

1. 定位 `.pipeline/rules/custom/<name>.md` 或具有相同名称的 pack/custom YAML。
2. 如果 shell 编辑器访问不合适，打印文件路径并解释可编辑字段。
3. 不要编辑 `rules/builtin/` 中的内置 rules；告诉用户改为覆盖 severity 或创建自定义 rule。

对于 `/hw:rules delete <name>`：

1. 仅删除项目本地的自定义 rule 文件。
2. 移除或设置 off `.pipeline/rules.yaml` 覆盖。
3. 永远不要删除内置分发的 rules。

## Rule Packs

Rule 包格式：

```text
hw-rules-example/
├── pack.yaml
├── rules/
│   └── prefer-chinese-comments.md
└── README.md
```

`pack.yaml`：

```yaml
name: hw-rules-example
author: example
version: 1.0.0
description: Example rule pack
rules:
  prefer-chinese-comments: warn
```

对于 `/hw:rules pack export <name>`：

1. 创建 `.pipeline/rules/packs/<name>/`。
2. 将活动的自定义 rules 复制到 `<pack>/rules/`。
3. 从当前有效的 severity 生成 `pack.yaml`。
4. 生成带有导入说明的简短 README。

对于 `/hw:rules pack import <url>`：

1. 接受 `github:owner/repo`、`gitee:owner/repo` 或直接的 Git URL。
2. 克隆或复制到 `.pipeline/rules/packs/<pack-name>/`。
3. 将包引用添加到 `.pipeline/rules.yaml extends`。
4. 报告导入的 rules 和有效的 severity。

网络访问可能不可用；如果导入无法运行，提供确切的 Git 命令和目标路径。

## 运行时执行约束

在每个生命周期 hook 点：

1. 选择 severity 不为 `off` 且 hooks 包含当前点的有效 rules。
2. 执行内置 `check` 逻辑或读取自定义 Markdown rule 正文。
3. 对于 `warn`，打印警告并继续。
4. 对于 `error`，停止执行并解释：
   - rule 名称
   - 失败的条件
   - 如何修复、禁用或降级

`always` rules 在 SessionStart 期间注入，应持续遵守。`hooks/session-start.sh` 使用 `scripts/rules-summary.sh` 将活动的 always rules 包含在 `additionalContext` 中。

## 内置规则

分发的内置 rules：

| Rule | Label | Default | Hooks |
|---|---|---|---|
| `git-clean-check` | guard | warn | pre-milestone |
| `config-valid` | guard | warn | pre-milestone |
| `cycle-closed` | guard | warn | pre-milestone |
| `conflict-check` | guard | warn | on-session-start |
| `report-language` | style | warn | always |
| `progress-timezone` | style | warn | always |
| `progress-verbosity` | style | off | always |
| `commit-format` | workflow | off | pre-commit |
| `auto-continue-threshold` | workflow | warn | on-evaluate |
| `review-strictness` | workflow | warn | on-evaluate |
| `readme-freshness` | release | warn | pre-commit, pre-release |
| `skill-quality` | quality | warn | pre-milestone, pre-release |
| `knowledge-ledger-self-check` | hook | warn | post-step, post-milestone |
| `stop-hook-self-check` | hook | error | post-step |
| `session-start-context-load` | hook | error | on-session-start |

## `/hw:init` 集成

在项目初始化期间，提供 rules 预设：

```text
📏 Rules 配置
  [1] recommended — 推荐规则集（默认）
  [2] strict — 严格模式
  [3] minimal — 最小化
  [4] 跳过（后续用 /hw:rules 配置）
```

选择后，写入 `.pipeline/rules.yaml`。跳过会保持旧行为兼容，这在运行时等同于 recommended 默认值。

## 参考文件

- `rules/builtin/`
- `rules/presets/`
- `rules/template/custom-rule-template.md`
- `scripts/rules-summary.sh`
- `references/rules-spec.md`
- `references/commands-spec.md`
- `references/config-spec.md`
- `SKILL.md`