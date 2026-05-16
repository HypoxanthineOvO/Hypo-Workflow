# C14-M1 — Workflow 语义与状态机审查

## 审查范围

基于 `state-contract.md`、`commands-spec.md`、`progress-spec.md`、`log-spec.md`、`evaluation-spec.md`、`tdd-spec.md`、`feature-queue-spec.md` 七份规范文件。

## 发现汇总

### P1 — code_quality 评分方向矛盾

- **证据**: `evaluation-spec.md` 第 19-25 行 vs 第 143-149 行
- **问题**: 原始规范 `code_quality: 1=不可接受, 5=优秀`（越高越好），V4 多维定义 `1=优秀, 5=很差`（越高越差）。双重语义冲突。
- **建议**: 统一为 V4 方向（1=好, 5=差），在 V1 评分模型章节加兼容说明。

### P1 — V4 STOP 规则与 V1 兼容性不明确

- **证据**: `evaluation-spec.md` 第 246-252 行
- **问题**: V4 增加了 `overall > threshold + 1` 和 `architecture_drift >= 4` 阻断条件。向后兼容章节只说"阈值行为兼容"，未明确这些额外 STOP 条件在 `adaptive_threshold=false` 时是否禁用。
- **建议**: 增加配置开关 `use_v4_multi_dimension_stop` 或明确 `adaptive_threshold=false` 时也禁用额外 STOP 条件。

### P2 — current.phase 枚举漏洞 (needs_revision)

- **证据**: `state-contract.md` 第 259 行
- **问题**: `needs_revision` 在 `/hw:resume` 中被引用为有效 `current.phase` 值，但不在 `current.phase` 枚举定义中。它仅在"用户可见 phase"列表中。
- **建议**: 决定是否将 `needs_revision` 加入 `current.phase` 枚举，或从 `/hw:resume` 行为中移除引用。

### P2 — Feature Queue decomposed 状态语义不明

- **证据**: `feature-queue-spec.md`
- **问题**: `decomposed` 状态定义为"里程碑已生成但尚未完成"，与 `active`/`queued`/`done` 的关系不明确。不清楚 `decomposed` Feature 变为 current 时是进入 `active` 还是保持 `decomposed`。
- **建议**: 定义 `decomposed` 为独立维度而非互斥状态，或明确其与 `active` 的转移规则。

### P3 — 日志开始事件写入时机缺失

- **证据**: `log-spec.md` 事件类型 vs 写入时机列表
- **问题**: `milestone_start`、`feature_start` 是有效日志类型，但写入时机只列出结束事件。可能设计为结束时追溯写入开始事件，但未说明。
- **建议**: 补充写入时机为"milestone_start: when a prompt becomes active"。

### P3 — history.completed_prompts 命名误导

- **证据**: `state-contract.md`
- **问题**: 字段名建议只包含完成项，但实际包含 blocked/aborted/skipped 项。
- **建议**: 保持不变（向后兼容），在规范中加注释说明。

### P3 — 验收 mode 与 gates 分类法正交

- **证据**: `state-contract.md` `acceptance.mode` vs `cycle.yaml` `gates.acceptance`
- **问题**: `mode: manual|auto|timeout` 与 `gates.acceptance: auto|confirm|manual_qa` 没有显式映射。
- **建议**: 在 config-spec 中文档化映射关系。

## Pending Hypotheses

- `plan:generate` 是否设置 `current.phase` 到 `plan_generate`？规范未明确声明
- `review_tests`/`review_code` 的 Worker Separation 角色分配是否明确？
