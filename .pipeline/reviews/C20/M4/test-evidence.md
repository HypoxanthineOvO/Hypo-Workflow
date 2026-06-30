# C20-M4 Test Evidence

## Conclusion

Result: `EXPECTED_FAIL_PRE_IMPLEMENTATION / NEEDS_IMPLEMENTATION`.

M4 的只读验证基线已完成。当前 `.pipeline/integrations/matrix.yaml` 仍是 C19 状态，尚未更新到 C20 source evidence / target handoff；`.pipeline/integrations/C20-target-cycle-input.md` 当前不存在，因此 distribution package existence check 失败是预期的 pre-implementation gap。

本 worker 没有写业务代码、没有写 integration package、没有写 matrix、没有写任何 target repository。唯一写入是本证据文件；目标仓只做 `git status --short` 和 `rg` 只读查找。

## Scope And Required Context

Worker: `test`

Prompt: `.pipeline/prompts/03-target-cycle-input-and-distribution-boundary-package.md`

Allowed write:

- `.pipeline/reviews/C20/M4/test-evidence.md`

Required context read:

- `.pipeline/state.yaml`
- `.pipeline/prompts/03-target-cycle-input-and-distribution-boundary-package.md`
- `references/consultation-first-action-boundary.md`
- `.pipeline/reports/02-source-regression-and-managed-artifact-closure.report.md`
- `.pipeline/reviews/C20/M3/test-evidence.md`
- `.pipeline/reviews/C20/M3/implementation-evidence.md`
- `.pipeline/reviews/C20/M3/audit.md`
- `.pipeline/integrations/matrix.yaml`

## Pre-Implementation Expected Failure / Needs

### Distribution package existence check

Command:

```bash
node -e "const fs=require('fs'); for (const f of ['.pipeline/integrations/C20-target-cycle-input.md','.pipeline/integrations/matrix.yaml']) fs.accessSync(f)"
```

Result: fail, expected before implementation.

Key error:

```text
Error: ENOENT: no such file or directory, access '.pipeline/integrations/C20-target-cycle-input.md'
```

Interpretation:

- `.pipeline/integrations/matrix.yaml` exists.
- `.pipeline/integrations/C20-target-cycle-input.md` does not exist yet.
- Implement worker still needs to create the C20 target Cycle input package before this command can pass.

### Integration matrix state

Read-only check confirms current matrix is still C19:

```text
cycle: C19
feature: workflow-core-plan-mode-optimization
source_evidence:
  - .pipeline/reports/C19-M4-source-closure.report.md
targets:
  - name: Codex-VSP
    status: applied
  - name: VSP-Open-Code
    status: applied
release_gate:
  status: completed
```

M4 needs:

- update `cycle` / feature context to C20.
- replace or extend stale C19 source evidence with C20 source closure evidence.
- record target handoff instead of target applied status.
- explicitly record source-Cycle target no-write status.

## Source Closure Evidence Confirmation

Command:

```bash
rg -n 'focused 30/30|30/30|npm test.*687/687|687/687|git diff --check.*pass|source-side closure is complete|`git diff --check`: passing' .pipeline/reports/02-source-regression-and-managed-artifact-closure.report.md
```

Result: pass.

Confirmed report anchors:

- `C20 source-side closure is complete`.
- Focused validation: `30/30` passing.
- Full regression: `npm test` `687/687` passing.
- Whitespace validation: `git diff --check` passing.

This source evidence is suitable input for the C20 matrix and target handoff package, but it is not yet reflected in `.pipeline/integrations/matrix.yaml`.

## Target Dirty Baseline

### Codex-VSP

Command:

```bash
git -C /home/heyx/Codex-VSP status --short
```

Result: dirty before any M4 implementation.

```text
 M .pipeline/PROGRESS.md
 M .pipeline/chat/journal.yaml
 D .pipeline/chats/mini-cycle-120df7cfd248811b/state.yaml
 D .pipeline/chats/mini-cycle-186c5630d313283c/state.yaml
 D .pipeline/chats/mini-cycle-237ff8f7742ae6d9/state.yaml
 D .pipeline/chats/mini-cycle-39311820eb9f4e42/state.yaml
 D .pipeline/chats/mini-cycle-4554488fd3f25737/state.yaml
 D .pipeline/chats/mini-cycle-5bff710cff8d13fd/state.yaml
 M .pipeline/chats/mini-cycle-738f710e86bcea45/state.yaml
 D .pipeline/chats/mini-cycle-78b1873dec5f98f2/state.yaml
 D .pipeline/chats/mini-cycle-bd1dfa4b74ef30e0/state.yaml
 M .pipeline/inbox/items.yaml
 M .pipeline/log.yaml
 M codex-rs/app-server/src/request_processors/thread_processor.rs
 M codex-rs/app-server/tests/suite/v2/thread_resume.rs
 M codex-rs/cli/src/main.rs
 M codex-rs/cli/src/vscode_cmd.rs
 M codex-rs/cli/tests/vscode.rs
 M scripts/install/install.sh
?? .pipeline/chats/mini-cycle-0041cfc90a910dec/
?? .pipeline/chats/mini-cycle-004df7c6c4d70d2a/
?? .pipeline/chats/mini-cycle-166accfa55130a74/
?? .pipeline/chats/mini-cycle-1ab98f383a6f5044/
?? .pipeline/chats/mini-cycle-1e1f2aac6bc4e5d2/
?? .pipeline/chats/mini-cycle-207a5359661e981e/
?? .pipeline/chats/mini-cycle-2e979c44508e92cd/
?? .pipeline/chats/mini-cycle-42f56bc42c763c17/
?? .pipeline/chats/mini-cycle-53c48e41eed0565c/
?? .pipeline/chats/mini-cycle-9319fd7769ff8855/
?? .pipeline/chats/mini-cycle-9a3f14a8f6a5c22a/
?? .pipeline/chats/mini-cycle-9d13826125004370/
?? .pipeline/chats/mini-cycle-c47e5424e95adfe0/
?? .pipeline/chats/mini-cycle-c4899e4ac71dd401/
?? .pipeline/chats/mini-cycle-c5fa0ac8c70970ff/
?? .pipeline/chats/mini-cycle-db6fe6f9cfad99fe/
?? .pipeline/chats/mini-cycle-e22182f37dde97f7/
?? .pipeline/chats/mini-cycle-e2bdbabfd461fab1/
?? .pipeline/chats/mini-cycle-e4114bae0dc0190a/
?? .pipeline/debug/20260627T211653+0800-vscode-desktop-provider-connectivity.md
?? .pipeline/debug/20260627T212448+0800-official-db-and-backend-hijack-repair.md
```

Interpretation:

- Target repository is already dirty.
- These changes are only a baseline and must not be attributed to this source Cycle.
- M4 implementation must not write `/home/heyx/Codex-VSP`.

### VSP-Open-Code

Command:

```bash
git -C /home/heyx/VSP-Open-Code status --short
```

Result: dirty before any M4 implementation.

```text
 M .opencode/opencode.jsonc
 M .pipeline/config.yaml
 M AGENTS.md
?? .pipeline/chat/
?? .pipeline/chats/
?? .pipeline/inbox/
?? temp/
```

Interpretation:

- Target repository is already dirty.
- These changes are only a baseline and must not be attributed to this source Cycle.
- M4 implementation must not write `/home/heyx/VSP-Open-Code`.

## Candidate Target Surfaces

These are read-only candidates for the future target-local Cycles. They are not edit recommendations for this source Cycle.

### Codex-VSP

Generated / adapter surfaces:

- `/home/heyx/Codex-VSP/AGENTS.md`
- `/home/heyx/Codex-VSP/opencode.json`
- `/home/heyx/Codex-VSP/.opencode/opencode.json`
- `/home/heyx/Codex-VSP/codex-rs/tui/src/bottom_pane/AGENTS.md`

Prompt / base-instructions / model prompt candidates:

- `/home/heyx/Codex-VSP/codex-rs/core/gpt-5.2-codex_prompt.md`
- `/home/heyx/Codex-VSP/codex-rs/core/gpt-5.1-codex-max_prompt.md`
- `/home/heyx/Codex-VSP/codex-rs/core/gpt_5_codex_prompt.md`
- `/home/heyx/Codex-VSP/codex-rs/core/gpt_5_2_prompt.md`
- `/home/heyx/Codex-VSP/codex-rs/core/gpt_5_1_prompt.md`
- `/home/heyx/Codex-VSP/codex-rs/core/prompt_with_apply_patch_instructions.md`
- `/home/heyx/Codex-VSP/codex-rs/core/templates/model_instructions/gpt-5.2-codex_instructions_template.md`
- `/home/heyx/Codex-VSP/codex-rs/models-manager/models.json`
- `/home/heyx/Codex-VSP/codex-rs/models-manager/src/model_info.rs`
- `/home/heyx/Codex-VSP/codex-rs/models-manager/src/model_presets.rs`
- `/home/heyx/Codex-VSP/codex-rs/core/src/config/mod.rs`
- `/home/heyx/Codex-VSP/codex-rs/core/src/session/mod.rs`

Relevant read-only evidence:

- `codex-rs/core/src/config/mod.rs` includes `model_instructions_file` and `base_instructions` loading.
- `codex-rs/core/src/session/mod.rs` documents runtime priority: `config.base_instructions`, conversation history, then current model instructions.
- `codex-rs/models-manager/src/model_info.rs` applies model `base_instructions` and config overrides.

Target-local implication:

- Codex-VSP should verify the effective base-instructions path before deciding whether any per-model prompt files should be edited.

### VSP-Open-Code

Generated / local instruction surfaces:

- `/home/heyx/VSP-Open-Code/AGENTS.md`
- `/home/heyx/VSP-Open-Code/.opencode/opencode.jsonc`
- `/home/heyx/VSP-Open-Code/packages/opencode/AGENTS.md`
- `/home/heyx/VSP-Open-Code/packages/opencode/src/session/llm/AGENTS.md`
- `/home/heyx/VSP-Open-Code/packages/app/AGENTS.md`
- `/home/heyx/VSP-Open-Code/packages/desktop/AGENTS.md`
- `/home/heyx/VSP-Open-Code/packages/llm/AGENTS.md`

Reminder / runtime prompt candidates:

- `/home/heyx/VSP-Open-Code/packages/opencode/src/session/reminders.ts`
- `/home/heyx/VSP-Open-Code/packages/opencode/src/session/prompt.ts`
- `/home/heyx/VSP-Open-Code/packages/opencode/src/session/system.ts`
- `/home/heyx/VSP-Open-Code/packages/opencode/src/session/instruction.ts`
- `/home/heyx/VSP-Open-Code/packages/opencode/src/session/prompt/plan.txt`
- `/home/heyx/VSP-Open-Code/packages/opencode/src/session/prompt/plan-mode.txt`
- `/home/heyx/VSP-Open-Code/packages/opencode/src/session/prompt/plan-reminder-anthropic.txt`
- `/home/heyx/VSP-Open-Code/packages/opencode/src/session/prompt/default.txt`
- `/home/heyx/VSP-Open-Code/packages/opencode/src/session/prompt/gpt.txt`
- `/home/heyx/VSP-Open-Code/packages/opencode/src/session/prompt/codex.txt`
- `/home/heyx/VSP-Open-Code/packages/opencode/src/session/prompt/kimi.txt`
- `/home/heyx/VSP-Open-Code/packages/opencode/src/session/prompt/trinity.txt`

Relevant read-only evidence:

- `/home/heyx/VSP-Open-Code/AGENTS.md:5` currently says `Prefer automation: execute requested actions without confirmation unless blocked by missing info or safety/irreversibility.`
- `packages/opencode/src/session/reminders.ts` constructs `Workflow reminder (...)` and references root `AGENTS.md` discipline.
- `packages/opencode/src/session/prompt.ts` applies `SessionReminders`.
- `packages/opencode/src/session/prompt/plan*.txt` files are system-reminder surfaces.

Target-local implication:

- VSP-Open-Code should treat `Prefer automation` as compatible with clear concrete tasks, but not as permission to skip the C20 discussion/background/question Mini-contract boundary.
- Exact local reminder wording expansion remains target-owned and should be verified in a target-local Cycle.

## Validation Checklist

Current read-only results:

- `node -e "const fs=require('fs'); for (const f of ['.pipeline/integrations/C20-target-cycle-input.md','.pipeline/integrations/matrix.yaml']) fs.accessSync(f)"`: fails because `C20-target-cycle-input.md` is missing. Expected pre-implementation failure.
- `git diff --check`: pass, exit code `0`, no output.
- `git -C /home/heyx/Codex-VSP status --short`: recorded dirty baseline.
- `git -C /home/heyx/VSP-Open-Code status --short`: recorded dirty baseline.
- Read-only `rg` surface scans completed for both target repositories.
- Source closure report exists and records focused `30/30`, full `npm test` `687/687`, and `git diff --check` passing.
- Current integration matrix is C19 and needs C20 update.

Post-implementation validation expectations:

```bash
node -e "const fs=require('fs'); for (const f of ['.pipeline/integrations/C20-target-cycle-input.md','.pipeline/integrations/matrix.yaml']) fs.accessSync(f)"
git diff --check
git -C /home/heyx/Codex-VSP status --short
git -C /home/heyx/VSP-Open-Code status --short
```

Additional recommended read-only checks after implementation:

```bash
rg -n 'cycle: C20|C20|target handoff|no-write|source evidence|02-source-regression-and-managed-artifact-closure' .pipeline/integrations/matrix.yaml .pipeline/integrations/C20-target-cycle-input.md
rg -n 'Codex-VSP|VSP-Open-Code|Direct sync scope|Target-owned scope|target-local Cycle|no edits inside' .pipeline/integrations/C20-target-cycle-input.md
```

Expected green state:

- Existence command passes.
- Matrix records C20 source evidence and target-local handoff, not C19 applied target state.
- Target status commands do not show new source-Cycle writes under `/home/heyx/Codex-VSP` or `/home/heyx/VSP-Open-Code`.
- `git diff --check` remains clean.

## Risks / Follow-up

- `matrix.yaml` is stale C19 state; implement worker must update it before M4 can pass.
- `C20-target-cycle-input.md` is missing; implement worker must create it before existence validation can pass.
- Both target repositories are already dirty; M4 must continue to record them as baseline caveats and avoid claiming deployment to targets.
- Codex-VSP per-model prompt edits are explicitly deferred until a target-local Cycle verifies the effective base-instructions path.
- VSP-Open-Code local reminder/runtime prompt wording is explicitly deferred until a target-local Cycle inspects reminder runtime and tests.
- Source `git diff --check` currently passes, but this only proves whitespace cleanliness; package content and matrix semantics still require post-implementation validation.
