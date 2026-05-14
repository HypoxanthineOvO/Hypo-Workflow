---
name: patch
description: Manage the persistent lightweight Patch track for small fixes that should not open a full milestone.
---

# /hypo-workflow:patch
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

当用户调用 `/hw:patch` 或 `/hypo-workflow:patch` 时使用此 skill。

Patch 是一个持久的轻量级旁路轨道，用于处理不值得开 Milestone 的小问题、清理和热观察。它独立于 pipeline 状态机，跨 Cycle 持久存在。

## 路径

规范的 Patch 目录：

- `.pipeline/patches/`

当示例中出现 `patches/P001-fix-login.md` 时，应解释为 `.pipeline/patches/P001-fix-login.md`。

## 指令列表

支持的格式：

- `/hw:patch "描述" [--severity critical|normal|minor]`
- `/hw:patch list [--open] [--severity critical|normal|minor]`
- `/hw:patch close P{NNN}`
- `/hw:patch fix P{NNN} [P{NNN} ...]`
- `/hw:patch accept P{NNN}`
- `/hw:patch reject P{NNN} "feedback"`

OpenCode 命令契约：

- `accept` 和 `reject` 是 `/hw-patch` 的参数子命令：使用 `/hw-patch accept P{NNN}` 和 `/hw-patch reject P{NNN} "feedback"`。
- 它们不是一等 OpenCode 命令；不要创建或记录 `/hw-patch-accept` 或 `/hw-patch-reject`。

## Patch 文件格式

```markdown
# P001: 修复登录页 CSS 错位
- 严重级: normal
- 状态: open
- 发现于: C2/M3
- 创建时间: 28日 11:30
- 改动: (待填写)
- 测试: (待填写)
- 关联: (无)
- resolved_by: null
- related: []
- supersedes: []
```

生成新内容时使用 `output.language` 作为标签语言，但编辑现有文件时保留其原有语言。

## 编号规则

Patch 编号是全局的，跨 Cycle 从不重置。

1. 如果 `.pipeline/patches/` 不存在则创建。
2. 扫描匹配 `P[0-9][0-9][0-9]-*.md` 的文件名。
3. 确定下一个编号为最大已有编号 + 1。
4. 格式化为 `P001`、`P002`，依此类推。
5. 不复用已关闭或已被取代的编号。

## 创建 Patch

对于 `/hw:patch "描述" [--severity ...]`：

1. 将引号中的描述解析为标题。
2. 验证严重级：
   - 默认值：`normal`
   - 允许值：`critical`、`normal`、`minor`
3. 将标题 slug 化为文件名。
4. 检测活跃的 Cycle 上下文：
   - 如果 `.pipeline/cycle.yaml` 存在且状态为 `active`，使用 `C{cycle.number}`
   - 如果 `.pipeline/state.yaml` 有当前 Milestone 或 prompt 索引，追加 `/M{N}`
   - 如果没有显式 Cycle，仅在显示文本中将 `discovered_in` 留为 `(无)` 或 `implicit C1`
5. 使用 `output.timezone` 解析创建时间。
6. 创建 `.pipeline/patches/P{NNN}-{slug}.md`。
7. 报告文件路径和状态。

## 列出 Patch

对于 `/hw:patch list`：

1. 读取所有 `.pipeline/patches/P*.md` 文件。
2. 从头部列表项解析元数据。
3. 按编号升序排序。
4. 显示编号、标题、严重级、状态、discovered_in，以及存在时的 related/resolved_by。

过滤器：

- `--open`：仅包含 `状态: open`
- `--severity critical|normal|minor`：仅包含匹配的严重级

如果没有匹配的 Patch，直接说明。

## 关闭 Patch

对于 `/hw:patch close P{NNN}`：

1. 找到匹配的 Patch 文件。
2. 将 `状态: open` 替换为 `状态: closed`。
3. 使用 `output.timezone` 添加或更新关闭时间戳。
4. 保留所有其他元数据和自由格式备注。
5. 如果 Patch 已关闭，报告无需变更。

当 Milestone 解决了一个或多个 Patch 时，用 `C{N}/M{N}` 更新 `resolved_by`，且仅在 Milestone 实际交付了修复时才关闭 Patch。

## 修复 Patch

使用 `/hw:patch fix P001` 立即修复单个 Patch，或 `/hw:patch fix P001 P003 P007` 依次修复多个 Patch。Patch 修复是轻量级执行通道，不是 Milestone，也不是 TDD pipeline 运行。

Patch 修复是轻量级的，但仍然是生产工作。Patch 修复必须保留真实的 `implement`、`test` 和 `audit` Worker Separation：

- 当 Patch 修复涉及生产代码或测试代码变更时，需要三个不同的 worker 身份：
  - `test`：负责复现、失败证据、测试设计，以及在实现开始前的任何测试/fixture/assertion/snapshot 编辑
  - `implement`：仅负责生产/运行时/文档实现编辑；不得创建、编辑或重写测试、fixture、snapshot 或 assertion
  - `audit`：在自动关闭前独立审查最终 diff 和关闭证据
- 同一个 Agent session、Codex 进程、Claude session、委托 worker session 或本地主 agent 身份不得同时满足 `implement`、`test` 和 `audit` 中的多个角色
- "我实现了，然后单独跑了测试" 只是步骤分离；它不是 Worker Separation，不得记录为已满足 Patch Worker Separation
- 当宿主支持时，优先使用独立的 `test`、`implement` 和 `audit` Subagent 或原生 worker；绝不允许 `implement` worker 生成或冒充 `test` 或 `audit` worker
- 如果 Subagent 不可用，主 agent 可以在记录非委托理由后本地实现，但 Patch 必须保持 `open` 或移至 `pending_acceptance`，直到独立的 `test` 和 `audit` worker 验证通过
- 在 Codex 上，编辑代码/测试文件前需要请求用户明确授权使用独立的 `test`、`implement` 和 `audit` subworker；仅调用 `/hw:patch fix` 本身不构成足够授权
- 在 Claude Code 和 OpenCode 上，已配置的 subworker 不需要额外的授权门禁，但自动关闭前仍需要不同的 `test`、`implement` 和 `audit` worker 身份
- 不要先实现再事后解释缺少审查者
- 即使 Patch 太小不值得开 Milestone，也要保持实现和验证 worker 身份分离
- 对于 README、指南或适配器文档 Patch，优先使用文档专用辅助
- 保持主 agent 负责最终编辑决策、commit、Patch 元数据和生命周期日志
- 每个生成的 Patch worker 都有生命周期：在 Patch 文件或 `.pipeline/log.yaml` 中记录 `requested`、`started`、`completed|failed|blocked` 和 `closed`/released 状态，包含 worker id、role、scope 和 evidence path
- 主 agent 必须等待下一个门禁所需的每个 Patch worker，在不再需要时关闭/释放已完成的 worker，并将无法关闭的 worker 记录为 `close_failed`；未解决的 worker 生命周期意味着 Patch 无法自动关闭
- 如果未生成报告，在 Patch 文件或 `.pipeline/log.yaml` 中记录委托证据、worker 身份、生命周期状态或阻塞性非委托理由
- 纯文档或元数据修复可以保持本地而无需 Subagent 升级，但代码/测试变更在关闭前仍需要独立的 `test`、`implement` 和 `audit` worker
- 当代码/测试 Patch 无法使用 Worker Separation 时，不要自动关闭；在适当时提交实现，记录 `status: pending_acceptance` 或保持 `status: open`，并告知用户需要独立审查
- 对于代码/测试 Patch，`pending_acceptance` 是在用户明确批准本地实现后或实现已存在时的后备选项；它不是跳过编辑前授权门禁的许可

### ⚠️ Patch Fix 执行约束

❌ 绝对禁止：
1. 启动 brainstorming 或 Plan Discover
2. 走完整 TDD 流水线（write_tests → run_red → ...）
3. 写入 state.yaml（Patch 不是 Milestone）
4. 生成 report.md
5. 单个 Patch 改动超过 5 个文件时不提醒用户
6. 顺手重构不相关代码
7. 把同一个 Agent 的"实现后再跑测试"记录为三权分立或 worker separation 已满足
8. 在需要独立 `test` / `audit` worker 且缺少授权时，先本地实现再把 Patch 标成 `pending_acceptance`
9. 让 `implement` worker 创建、修改或重写测试、fixture、snapshot、assertion，或让它再 spawn/委托 `test`、`audit` 身份
10. 遗留已启动 subworker：未 wait、未 close/release、未记录生命周期状态就宣称 Patch 完成

✅ 必须做到：
1. 读取 Patch 描述后直接定位和修复
2. 跑现有测试验证不破坏其他功能
3. 单次 commit，message 格式：fix(P<NNN>): <描述>
4. 只有独立 `test`、`implement` 和 `audit` worker 都通过且生命周期已关闭/记录后才自动关闭 Patch；否则保持 `open` 或 `pending_acceptance`
5. 超出范围时停下来建议升级为 Milestone
6. 对 Codex 代码/测试 Patch，在编辑前必须询问是否授权独立 `test`、`implement` 和 `audit` subworker；未授权时先停止，除非用户明确确认降级且 Patch 不自动关闭

### 线性修复流程

对于每个请求的 Patch，严格按顺序执行以下步骤：

1. **Read Patch** — 定位 `.pipeline/patches/P{NNN}-*.md`，解析标题、描述、`discovered_in` 和严重级。如果 Patch 状态已是 `closed`，报告该 Patch 的错误并跳过变更。
2. **Locate Code** — 使用 Patch 正文中的文件路径、模块名、堆栈跟踪或错误文本。在判断是否理解范围前最多读取 5 个相关文件。除非 Patch 文本没有具体锚点，否则不要运行广泛的仓库扫描；如果确实如此，向用户请求文件/模块提示。
3. **Authorize Worker Separation** — 在编辑代码或测试前，确定是否已授权且可用独立的 `test`、`implement` 和 `audit` worker。在 Codex 上，编辑前询问用户是否授权独立的 `test`、`implement` 和 `audit` subworker；如果授权被拒绝，停止或仅在用户明确确认降级实现（不能自动关闭 Patch）的情况下继续。在 Claude Code 和 OpenCode 上，使用已配置的 subworker，无需额外授权门禁。不要先静默实现。
4. **Test First** — 如果 Patch 暴露了可复现的 bug 或需要回归覆盖，在实现前启动 `test` worker。`test` worker 负责复现、失败证据、测试设计以及任何测试/fixture/assertion/snapshot 编辑。`implement` worker 不得先写测试，也不得在没有新的 `test` worker 轮次的情况下重写 `test` worker 的覆盖。
5. **Fix** — 通过 `implement` worker 或明确降级的本地实现应用最小的目标生产/运行时/文档变更。如果修复需要改动超过 5 个文件，停止该 Patch 并建议升级为 Milestone 或 Cycle 计划项。不要进行机会性重构。`implement` worker 不得生成 subworker 或满足验证角色。
6. **Test/Review** — 运行现有项目测试套件或覆盖该变更的最窄现有回归命令，然后从不同的 worker 身份获取独立的 `test` 验证和 `audit` 关闭审查。如果测试失败，仅回滚该 Patch 所做的更改，保持 Patch `open`，并继续下一个请求的 Patch。如果测试通过但没有独立的 `test` 或 `audit` worker 可用，不要自动关闭 Patch。
7. **Commit** — 每个 Patch 创建一个独立 commit，格式为 `git commit -m "fix(P001): <Patch title>"`。对于批量修复，不要合并 Patch commit。
8. **Close or Gate** — 如果独立的 `test` 验证和 `audit` 审查通过，且所有必需的 worker 任务已成功完成并关闭/释放生命周期状态，将 Patch 文件更新为 `closed`，刷新 `.pipeline/PROGRESS.md` 看板表格，并向 `.pipeline/log.yaml` 追加生命周期事件。如果任何 worker 任务为 `failed` 或 `blocked`，或缺少独立验证或生命周期关闭，设置 `pending_acceptance` 或保持 `open`，记录缺失的 Worker Separation 证据，并在声称完成前停止。

### 已关闭 Patch 更新

当步骤 8 关闭 Patch 时，在保留现有备注的同时更新或追加 Patch 文件中的以下字段：

```markdown
- 状态: closed
- 修复时间: 29日 14:30
- 改动: src/scheduler.py:120 — 修正条件判断逻辑
- 测试: ✅ 回归通过（39/39）
- worker_separation: implement=<worker-id>, test=<worker-id>, audit=<worker-id>
- worker_lifecycle: test=requested/started/completed/closed, implement=requested/started/completed/closed, audit=requested/started/completed/closed
- commit: `a1b2c3d`
```

使用 `output.language` 和 `output.timezone` 生成散文和时间格式。如果现有 Patch 语言已清晰，保留原有语言。

### PROGRESS 与日志记录

更新 `.pipeline/PROGRESS.md` 为看板式摘要：

- 更新顶部元数据时间戳
- 更新或添加 `Patch 轨道` 下的 Patch 行
- 在 `时间线` 顶部插入一行
- 详细负载保存在 `.pipeline/log.yaml`

时间线行示例：

```markdown
| 14:30 | Patch | P001 closed | 修复登录页 CSS 错位 |
```

不要向 `PROGRESS.md` 底部追加独立的单行进度条目。

向 `.pipeline/log.yaml` 追加生命周期事件，包含：

- `type: patch_fix`
- `patch: P001`
- `status: closed`
- `commit: <hash>`
- `worker_separation: implement=<worker-id>, test=<worker-id>, audit=<worker-id>`
- `worker_lifecycle: test=<status>, implement=<status>, audit=<status>`
- `summary: <one-line change summary>`
- `tests: <test command and result>`

Patch 修复绝不能写入 `.pipeline/state.yaml`，也绝不能生成 `report.md`。

### 批量修复

对于 `/hw:patch fix P001 P003`：

1. 对每个 Patch 独立执行线性修复流程。
2. 失败的 Patch 不得阻塞后续 Patch。
3. 每个成功的 Patch 获得自己的 commit。
4. 以类似 `3/4 修复成功，P003 失败（测试未通过）` 的摘要结束。

## 元数据语义

- `discovered_in`：发现 Patch 的 Cycle 和 Milestone
- `resolved_by`：解决该 Patch 的 Cycle 和 Milestone 或 Patch
- `related`：相关 Patch ID
- `supersedes`：被此 Patch 取代的旧 Patch ID
- `iteration`：当前修复尝试编号
- `acceptance_requested_at`：请求手动 Patch 验收的时间
- `accepted_at`：Patch 被接受并关闭的时间
- `rejection_refs`：`.pipeline/patches/feedback/` 下的结构化反馈文件

## Patch 验收

Patch 验收仅是 Patch 轨道状态。它绝不能写入 `.pipeline/state.yaml`。

Patch 元数据可使用以下状态：

- `open`
- `pending_acceptance`
- `closed`
- `rejected`

当手动验收模式激活时，Patch 修复步骤 6 通过设置以下内容结束：

```markdown
- status: pending_acceptance
- iteration: 1
- acceptance_requested_at: 2026-05-03T01:20:00+08:00
```

`/hw:patch accept P001`：

OpenCode 格式：`/hw-patch accept P001`。

1. 查找 `.pipeline/patches/P001-*.md`。
2. 要求 `status: pending_acceptance`。
3. 设置 `status: closed`。
4. 设置 `accepted_at`。
5. 向 `.pipeline/log.yaml` 追加 `patch_accept`。
6. 更新 `.pipeline/PROGRESS.md`。

`/hw:patch reject P001 "feedback"`：

OpenCode 格式：`/hw-patch reject P001 "feedback"`。

1. 查找 `.pipeline/patches/P001-*.md`。
2. 要求 `status: pending_acceptance`。
3. 将结构化反馈写入 `.pipeline/patches/feedback/P001-rejection-<timestamp>.yaml`。
4. 设置 `status: open`。
5. 递增 `iteration`。
6. 将反馈路径追加到 `rejection_refs`。
7. 向 `.pipeline/log.yaml` 追加 `patch_reject`。
8. 更新 `.pipeline/PROGRESS.md`。
9. 当重复拒绝达到 `acceptance.reject_escalation_threshold` 或更高时，建议升级为 Cycle。

反馈文件必须包含 `problem`、`reproduce_steps`、`expected`、`actual`、`context`、`iteration` 和 `created_at`。为了兼容旧版读取器，可以存在一个 `feedback` 字段。

下一次 `/hw:patch fix P001` 必须读取 `rejection_refs` 并在编辑前注入结构化的拒绝上下文。

## 与 Cycle 的关系

Patch 在 Cycle 关闭时不会被归档。它们保留在 `.pipeline/patches/` 中，可以通过 `/hw:plan --context patches` 或 `cycle.context_sources: [patches]` 注入到未来的规划中。

## 参考文件

- `skills/cycle/SKILL.md` — 活跃 Cycle 检测
- `skills/plan-discover/SKILL.md` — Patch 上下文注入
- `references/config-spec.md` — 输出语言和时区默认值
- `SKILL.md` — 根命令路由
