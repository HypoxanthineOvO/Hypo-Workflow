# C20-M4 Implementation Evidence

## Conclusion

Result: `PASS`.

C20 target handoff package 已在 source repo 内生成，integration matrix 已从旧 Cycle 状态更新为 C20 target handoff 状态。本 worker 没有写 `/home/heyx/Codex-VSP` 或 `/home/heyx/VSP-Open-Code`；两个目标仓只执行了 read-only `git status --short` 和 `rg` 锚点检查。

注意：按用户本轮明确禁止，未写 `.pipeline/state.yaml`、`.pipeline/log.yaml`、`.pipeline/PROGRESS.md`、`.pipeline/.lock`、`.pipeline/cycle.yaml`。

## Modified Files

- `.pipeline/integrations/C20-target-cycle-input.md`
  - 新建 C20 target-local Cycle 输入包。
  - 包含 Status、Source Summary、Source Evidence、Direct sync scope、Target-owned scope、Read-Only Target Baseline、Codex-VSP Target-local Cycle Brief、VSP-Open-Code Target-local Cycle Brief、Explicit Non-Targets、Validation Candidates、Recommended Sequence、Risks。
- `.pipeline/integrations/matrix.yaml`
  - 更新为 `cycle: C20`。
  - 记录 source evidence、focused `30/30`、`npm test` `687/687`、`git diff --check pass`、M3 audit `PASS_WITH_WARNINGS`。
  - 记录两个 target 的 dirty baseline、`target_cycle_input_ready` / `pending_target_local_cycle`、validation candidates、`source_runtime_state_copied: false`、`target_writes_in_source_cycle: false`。
- `.pipeline/reviews/C20/M4/implementation-evidence.md`
  - 记录本实现证据、命令结果和 target no-write 声明。

## Technical Notes

- Source closure evidence 采用 `.pipeline/reports/02-source-regression-and-managed-artifact-closure.report.md` 和 `.pipeline/reviews/C20/M3/audit.md`。
- Target package 明确区分 Direct sync scope 和 Target-owned scope。
- Codex-VSP brief 要求先验证 effective base-instructions path，再决定是否编辑 per-model prompt files。
- VSP-Open-Code brief 将 `Prefer automation` 定义为“清晰具体任务可自动执行”，不得覆盖 discussion/background/question 等输入的 Mini-contract 边界。
- 本 source Cycle 只准备 handoff，不 claim target deployment。

## Read-Only Target Evidence

### Codex-VSP

Command:

```bash
git -C /home/heyx/Codex-VSP status --short
```

Result: dirty baseline already present; no source-Cycle target write performed.

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

Read-only anchor command:

```bash
rg -n "model_instructions_file|base_instructions|model instructions" /home/heyx/Codex-VSP/codex-rs/core/src/config/mod.rs /home/heyx/Codex-VSP/codex-rs/core/src/session/mod.rs /home/heyx/Codex-VSP/codex-rs/models-manager/src/model_info.rs
```

Result: pass. Anchors confirm Codex-VSP has runtime `base_instructions` / `model_instructions_file` loading paths that must be verified before per-model prompt edits.

### VSP-Open-Code

Command:

```bash
git -C /home/heyx/VSP-Open-Code status --short
```

Result: dirty baseline already present; no source-Cycle target write performed.

```text
 M .opencode/opencode.jsonc
 M .pipeline/config.yaml
 M AGENTS.md
?? .pipeline/chat/
?? .pipeline/chats/
?? .pipeline/inbox/
?? temp/
```

Read-only anchor command:

```bash
rg -n "Prefer automation|Workflow reminder|SessionReminders|AGENTS.md" /home/heyx/VSP-Open-Code/AGENTS.md /home/heyx/VSP-Open-Code/packages/opencode/src/session/reminders.ts /home/heyx/VSP-Open-Code/packages/opencode/src/session/prompt.ts
```

Result: pass. Anchors confirm `Prefer automation` is in root `AGENTS.md`, while `SessionReminders` and workflow reminder injection are owned by runtime prompt code and need target-local validation before edits.

## Validation Results

Command:

```bash
scripts/validate-config.sh
```

Result: pass, exit code `0`, no output.

Command:

```bash
node -e "const fs=require('fs'); for (const f of ['.pipeline/integrations/C20-target-cycle-input.md','.pipeline/integrations/matrix.yaml']) fs.accessSync(f)"
```

Result: pass, exit code `0`, no output.

Command:

```bash
ruby -e 'require "yaml"; YAML.load_file(".pipeline/integrations/matrix.yaml"); puts "ok"'
```

Result: pass, output `ok`.

Command:

```bash
rg -n 'cycle: C20|C20|target handoff|no-write|source evidence|02-source-regression-and-managed-artifact-closure' .pipeline/integrations/matrix.yaml .pipeline/integrations/C20-target-cycle-input.md
```

Result: pass. Key hits include:

- `.pipeline/integrations/matrix.yaml:1:cycle: C20`
- `.pipeline/integrations/matrix.yaml:12:.pipeline/reports/02-source-regression-and-managed-artifact-closure.report.md`
- `.pipeline/integrations/matrix.yaml:24:target handoff: true`
- `.pipeline/integrations/matrix.yaml:25:no-write: true`
- `.pipeline/integrations/C20-target-cycle-input.md:7:Status: target handoff ready / target-local Cycle required`

Command:

```bash
rg -n 'Codex-VSP|VSP-Open-Code|Direct sync scope|Target-owned scope|target-local Cycle|no edits inside' .pipeline/integrations/C20-target-cycle-input.md
```

Result: pass. Key hits include:

- `Codex-VSP` and `VSP-Open-Code` sections.
- `Direct sync scope` section.
- `Target-owned scope` section.
- `target-local Cycle` guidance.
- `no edits inside` non-target statements.

Command:

```bash
git diff --check
```

Result: pass, exit code `0`, no output.

## Problems Encountered

- Source worktree was already dirty before this worker started; this worker only changed the three allowed files listed above.
- `.pipeline/integrations/matrix.yaml` was already modified in the worktree relative to HEAD. This task intentionally updates the working tree matrix to C20 per user instruction.
- The target repositories are already dirty. This evidence records them as read-only baselines and does not attribute them to C20-M4.

## Follow-up / Risks

- Main agent still needs to run final M4 audit/review if required by the Cycle.
- Target adaptation must occur in target-local Cycles with exact file lists and target-local validation.
- Codex-VSP should not edit per-model prompt files until the effective base-instructions path is proven.
- VSP-Open-Code should preserve automation for clear concrete tasks while adding the Mini-contract boundary for discussion/background/question inputs.
