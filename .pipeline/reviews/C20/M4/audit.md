# C20-M4 Audit Report

> 时间：2026-06-30T21:06:15+08:00
> 语言：zh-CN
> 时区：Asia/Shanghai
> Worker：audit
> 范围：只读审计；唯一写入本报告 `.pipeline/reviews/C20/M4/audit.md`

## Verdict

PASS_WITH_WARNINGS

C20-M4 target handoff package 和 integration matrix 可以进入后续目标仓本地 Cycle。包内容准确承接 C20 source spec、M3 source closure 与 M4 test/implementation evidence；Direct sync scope 与 Target-owned scope 已分离；矩阵记录了 C20 source evidence、target handoff、no-write、target-local pending、`source_runtime_state_copied: false` 和 `target_writes_in_source_cycle: false`。

Warnings 主要来自既有 dirty baseline：source worktree 与两个 target repo 均为 dirty。M4 证据和本审计复跑结果显示目标仓当前状态与 M4 前置/实现证据中的 dirty baseline 一致，未发现 source Cycle 写目标仓的证据；但 dirty 仓无法仅凭当前状态完全反向证明每个 dirty 项的产生时间，因此保留 caveat。

## Blockers

无。

## Warnings

- Target dirty attribution caveat：`/home/heyx/Codex-VSP` 和 `/home/heyx/VSP-Open-Code` 当前仍 dirty。本审计复跑的 `git status --short` 与 `.pipeline/reviews/C20/M4/test-evidence.md`、`.pipeline/reviews/C20/M4/implementation-evidence.md` 记录的 baseline 一致，支撑“只读 baseline”判断；但无法从当前状态独立证明每个 dirty 文件都早于 C20-M4。
- Source dirty scope caveat：source worktree 当前存在大量 M3/M4 以外的 modified/untracked/deleted 文件。C20-M4 审计只覆盖 target handoff package、matrix、M4 evidence 和目标边界，不替其他 dirty changes 背书。
- Validation scope caveat：本 audit worker 遵守只读审计要求，没有运行 generator、formatter、full regression 或 target-local tests；复跑了包存在性、YAML parse、anchor scans、`git diff --check`、target `status --short` 和目标 runtime/path anchor scans。

## Evidence

已完整阅读的必读材料：

- `.pipeline/prompts/03-target-cycle-input-and-distribution-boundary-package.md`
- `.pipeline/integrations/C20-target-cycle-input.md`
- `.pipeline/integrations/matrix.yaml`
- `.pipeline/reviews/C20/M4/test-evidence.md`
- `.pipeline/reviews/C20/M4/implementation-evidence.md`
- `.pipeline/reports/02-source-regression-and-managed-artifact-closure.report.md`
- `.pipeline/reviews/C20/M3/audit.md`
- `references/consultation-first-action-boundary.md`

补充读取：

- `.pipeline/config.yaml`：`output.language=zh-CN`，`output.timezone=Asia/Shanghai`。
- `.pipeline/state.yaml`：当前处于 C20 prompt 03 / M4 `review_code` 阶段。
- `references/completion-report-contract.md` 和 `references/audit-spec.md`：用于报告结构和审计分级。

复跑的只读命令结果：

- `node -e "const fs=require('fs'); for (const f of ['.pipeline/integrations/C20-target-cycle-input.md','.pipeline/integrations/matrix.yaml']) fs.accessSync(f); console.log('ok')"`：pass，输出 `ok`。
- `ruby -e 'require "yaml"; YAML.load_file(".pipeline/integrations/matrix.yaml"); puts "ok"'`：pass，输出 `ok`。
- `rg -n 'cycle: C20|C20|target handoff|no-write|source evidence|02-source-regression-and-managed-artifact-closure|source_runtime_state_copied: false|target_writes_in_source_cycle: false' .pipeline/integrations/matrix.yaml .pipeline/integrations/C20-target-cycle-input.md`：pass，命中 C20、source evidence、target handoff、no-write 和 runtime state copied false。
- `rg -n 'Codex-VSP|VSP-Open-Code|Direct sync scope|Target-owned scope|target-local Cycle|no edits inside|effective base-instructions path|Prefer automation|Mini-contract' .pipeline/integrations/C20-target-cycle-input.md`：pass，命中两个 target brief、scope 分离、no edits、base-instructions verification、automation/Mini-contract coexistence。
- `git diff --check`：pass，无输出。
- `git -C /home/heyx/Codex-VSP status --short`：dirty，当前输出与 M4 test/implementation evidence 记录的 Codex-VSP dirty baseline 一致。
- `git -C /home/heyx/VSP-Open-Code status --short`：dirty，当前输出与 M4 test/implementation evidence 记录的 VSP-Open-Code dirty baseline 一致。
- `rg -n 'model_instructions_file|base_instructions|model instructions' /home/heyx/Codex-VSP/codex-rs/core/src/config/mod.rs /home/heyx/Codex-VSP/codex-rs/core/src/session/mod.rs /home/heyx/Codex-VSP/codex-rs/models-manager/src/model_info.rs`：pass，确认 Codex-VSP 有 base instructions / model instructions runtime path，需要 target-local verification。
- `rg -n 'Prefer automation|Workflow reminder|SessionReminders|Mini-contract|AGENTS.md' /home/heyx/VSP-Open-Code/AGENTS.md /home/heyx/VSP-Open-Code/packages/opencode/src/session/reminders.ts /home/heyx/VSP-Open-Code/packages/opencode/src/session/prompt.ts`：pass，确认 root automation guidance 与 reminder injection surfaces。

## Package Assessment

结论：PASS。

`.pipeline/integrations/C20-target-cycle-input.md` 准确反映 source spec 和 source closure evidence：

- Source Summary 覆盖 C20 核心行为合同：`discussion`、`background`、`idea`、`complaint`、`question`、`solution-discussion` 是 non-editing signals；必须先输出 Mini-contract，顺序为 `我的理解` -> `问题原因` -> `推荐方案`。
- 包保留 direct execution：clear imperative 且有 concrete target 的请求可以直接执行，不把 C20 误解释成 ask-before-everything。
- 包保留 post-plan affirmative 语义：`可以`、`确认`、`OK`、`go ahead`、`apply it` 只授权已展示范围内的执行。
- Source Evidence 指向 M3 source closure report、M3 audit、M4 test evidence 和 source contract；并摘要记录 focused `30/30`、full `npm test 687/687`、`git diff --check` passing、M3 audit `PASS_WITH_WARNINGS`。
- Direct sync scope 只包含 source-owned managed surfaces；Target-owned scope 明确留给目标仓本地 Cycle。
- Explicit Non-Targets 明确禁止在 source Cycle 内写 `/home/heyx/Codex-VSP` 与 `/home/heyx/VSP-Open-Code`，并禁止复制 source runtime state 到目标仓。
- 包没有声称 target deployment，只声称 `target handoff ready / target-local Cycle required`。

Codex-VSP brief 评估：

- PASS。brief 明确要求先验证 effective base-instructions path，再决定是否编辑 per-model prompt files。
- Candidate files 被标注为 inspect-only，不是 source Cycle 预授权写入目标。
- 目标验收标准是证明 C20 guidance 是否进入有效 runtime instructions，而不是默认编辑所有 per-model prompt files。

VSP-Open-Code brief 评估：

- PASS。brief 明确保留 `Prefer automation` 作为 clear concrete tasks 的执行加速器。
- brief 同时要求 discussion/background/idea/complaint/question/solution-discussion 先 Mini-contract 且 no file edits。
- runtime reminder wording 被保留为 target-owned，要求 target-local Cycle 先检查 `SessionReminders` 注入路径和测试。

## Matrix Assessment

结论：PASS。

`.pipeline/integrations/matrix.yaml` 满足 C20-M4 要求：

- `cycle: C20`，`feature: consultation-first-action-boundary`。
- `source_summary` 同时记录 non-editing Mini-contract boundary、clear imperative direct execution、Direct sync / Target-owned scope 分离、target repos no-write。
- `source_evidence` 记录 source contract、M3 closure report、M3 audit、M4 test evidence 和 C20 target package。
- `source_validation` 记录 focused `30/30 passing`、full `npm test 687/687 passing`、`git diff --check pass`、M3 audit `PASS_WITH_WARNINGS`。
- `handoff.status: target_cycle_input_ready`，`target handoff: true`，`no-write: true`，`source_runtime_state_copied: false`，`target_writes_in_source_cycle: false`。
- 两个 target 均记录 `handoff_status: pending_target_local_cycle`、dirty baseline、target-local validation candidates、`source_runtime_state_copied: false`、`target_writes_in_source_cycle: false`。
- `release_gate.status: pending_target_local_cycle`，原因明确：source evidence closed，但目标仓需要各自 target-local Cycle，source Cycle 未写目标仓。

## Target-Boundary Assessment

结论：PASS_WITH_WARNINGS。

No-write boundary 得到遵守：

- M4 prompt 明确 audit worker 只读，implement worker 只允许写 source integration package / matrix / implementation evidence，不允许写目标仓。
- M4 implementation evidence 明确声明未写 `/home/heyx/Codex-VSP` 或 `/home/heyx/VSP-Open-Code`。
- 本审计复跑两个 target 的 `git status --short`，输出与 M4 test evidence 和 implementation evidence 中的 dirty baseline 一致。
- `C20-target-cycle-input.md` 和 `matrix.yaml` 均将目标仓写入标记为 target-local Cycle pending，而不是 source Cycle applied。

保留 warning 的原因：

- 两个 target repo 均已 dirty。当前 evidence 可以证明 C20-M4 把这些状态作为 baseline 记录，并且没有出现与 baseline 不一致的新 status 项；但无法仅凭当前 dirty 状态证明所有 dirty 项的历史来源。

## Validation Assessment

结论：PASS。

M4 validation evidence 足够支撑 handoff readiness：

- Package existence：复跑通过。
- YAML parse：复跑通过。
- Anchor scans：复跑通过，覆盖 C20、source evidence、handoff、no-write、scope separation、target-local Cycle、base-instructions verification、Prefer automation 与 Mini-contract coexistence。
- Source whitespace：`git diff --check` 复跑通过。
- Target read-only status：两个 target 的 `status --short` 已复跑并与 baseline 一致。
- Target runtime/path anchors：Codex-VSP base instructions / model instructions path 和 VSP-Open-Code `SessionReminders` / `Prefer automation` surfaces 均被只读锚点扫描确认。

未执行项：

- 未运行 generator / formatter。
- 未运行 source full `npm test`，因为 M4 审计范围是只读 handoff package 审计；source full regression 已由 M3 closure report 记录为 `687/687` passing。
- 未运行 target-local tests，因为 source Cycle 明确不进入 target-local adaptation。

## Follow-up

- 后续应在 `/home/heyx/Codex-VSP` 打开 target-local Cycle，先验证 effective base-instructions path，再决定是否编辑 adapter guidance、model catalog、templates 或 per-model prompt files。
- 后续应在 `/home/heyx/VSP-Open-Code` 打开 target-local Cycle，保持 `Prefer automation` 对明确具体任务的自动执行能力，同时补齐 discussion/background/question 等输入的 Mini-contract no-edit boundary。
- 每个目标仓 Cycle 都应记录 before/after `git status --short`，避免既有 dirty baseline 与目标本地改动混淆。
- Source closure / release 前仍需分拣 source dirty worktree，明确哪些文件属于 C20-owned closure，哪些是历史/runtime/其他 Cycle 残留。
- 不要把 C20 source closure 当作 target deployment evidence；target behavior 只有在目标仓本地验证通过后才能声明部署。

## Completion Narrative

- Change Summary：完成 C20-M4 target handoff package 和 matrix 的只读审计，结论为 `PASS_WITH_WARNINGS`，无 blockers，3 个 warnings 均为 dirty baseline / validation scope caveat。
- Technical Approach：按 GQM / source-contract traceability / target-boundary governance 检查 source spec、M3 closure、M4 test evidence、M4 implementation evidence、package、matrix、target status 与 runtime/path anchors。
- Modified Files / Modules：只写入 `.pipeline/reviews/C20/M4/audit.md`。审阅范围包括 `.pipeline/integrations/C20-target-cycle-input.md`、`.pipeline/integrations/matrix.yaml`、M3/M4 evidence、source contract、两个 target repo 的只读 status 和锚点文件。
- Test Design：复跑只读 package existence、YAML parse、anchor scans、`git diff --check`、target `status --short`、Codex-VSP base-instructions anchors、VSP-Open-Code automation/reminder anchors；不运行 generator、formatter 或 target-local tests。
- Validation Results：所有复跑校验通过；两个 target repo 当前 dirty 但与记录的 baseline 一致；source `git diff --check` 通过。
- Expected Result：C20 source Cycle 只交付 target-local Cycle input，不写目标仓、不复制 source runtime state、不声明 target deployment；目标仓后续各自执行本地 Cycle。
- Problems Encountered：source 和两个 target repos 均 dirty，限制了对 dirty 项历史来源的绝对归因；本轮用户只允许写 audit report，因此未更新 `.pipeline/state.yaml` / `.pipeline/log.yaml` / `.pipeline/PROGRESS.md`。
- Risks / Follow-Up：target adaptation 必须进入目标仓本地 Cycle；Codex-VSP 先验证 effective base-instructions path；VSP-Open-Code 保持 automation 与 Mini-contract boundary 共存；source closure 前继续分拣 dirty worktree。
