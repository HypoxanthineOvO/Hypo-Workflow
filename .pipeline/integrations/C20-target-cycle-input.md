# C20 Target Cycle Input

生成时间：2026-06-30T20:58:42+08:00

## Status

Status: `target handoff ready / target-local Cycle required`.

C20 source closure 已完成；本文件只是给 `Codex-VSP` 和 `VSP-Open-Code` 准备目标仓本地 Cycle 输入包。本 source Cycle 保持 no-write / no edits inside `/home/heyx/Codex-VSP` 和 `/home/heyx/VSP-Open-Code`，不声称目标仓已经部署 C20 行为。

## Source Summary

C20 的源端行为合同是协商优先的修改启动边界：

- `discussion`、`background`、`idea`、`complaint`、`question`、`solution-discussion` 是 non-editing signals，必须先输出 Mini-contract，顺序为 `我的理解` -> `问题原因` -> `推荐方案`。
- clear imperative 且有 concrete target 的请求可以 direct execution。
- 已展示计划、Mini-contract 或推荐方案后，`可以`、`确认`、`OK`、`go ahead`、`apply it` 等 post-plan affirmative replies 只授权已展示范围内的执行。
- Direct sync scope 只覆盖 source-owned managed surfaces；Target-owned scope 必须留给目标仓本地 Cycle。

## Source Evidence

权威 source evidence：

- `.pipeline/reports/02-source-regression-and-managed-artifact-closure.report.md`
- `.pipeline/reviews/C20/M3/audit.md`
- `.pipeline/reviews/C20/M4/test-evidence.md`
- `references/consultation-first-action-boundary.md`

已确认的 source closure 结果：

- focused C20/artifact/log regression：`30/30` passing。
- full regression：`npm test` `687/687` passing。
- whitespace validation：`git diff --check` passing。
- M3 audit verdict：`PASS_WITH_WARNINGS`，warnings 来自 source 和 target 既有 dirty worktree，不是 C20 source contract blocker。

## Direct sync scope

Direct sync scope / 直接同步范围只包括 source-owned managed surfaces，例如：

- Hypo-Workflow shared guidance。
- generated command / agent instruction surfaces。
- root `AGENTS.md` / OpenCode / Claude adapters。
- documentation contracts、tests、release checklists。

这些同步只传递 C20 行为规则本身：讨论类输入先 Mini-contract，明确具体任务可直接执行，计划后确认只授权已展示范围。Direct sync 不应夹带目标仓本地 prompt 优化、模型选择策略或 runtime reminder 改写。

## Target-owned scope

Target-owned scope / 目标仓自有范围必须在目标仓本地 Cycle 中完成：

- `Codex-VSP`：per-model prompt files、model catalog、model selection prompts、runtime prompt tuning、effective base-instructions path 验证。
- `VSP-Open-Code`：local reminders、runtime prompt details、provider/model behavior、reminder wording、本地 `Prefer automation` 表述修正。

本 source Cycle 不写目标仓；后续 target-local Cycle 需要独立列出文件清单、确认 dirty baseline、执行目标仓验证，并在目标仓记录自己的 Cycle evidence。

## Read-Only Target Baseline

### Codex-VSP

Path: `/home/heyx/Codex-VSP`

Read-only command:

```bash
git -C /home/heyx/Codex-VSP status --short
```

Baseline: dirty before C20-M4 implementation. Representative observed paths:

- `.pipeline/PROGRESS.md`
- `.pipeline/chat/journal.yaml`
- `.pipeline/log.yaml`
- `.pipeline/inbox/items.yaml`
- multiple `.pipeline/chats/mini-cycle-*` deleted/modified/untracked entries
- `codex-rs/app-server/src/request_processors/thread_processor.rs`
- `codex-rs/app-server/tests/suite/v2/thread_resume.rs`
- `codex-rs/cli/src/main.rs`
- `codex-rs/cli/src/vscode_cmd.rs`
- `codex-rs/cli/tests/vscode.rs`
- `scripts/install/install.sh`
- untracked `.pipeline/debug/*` reports

Read-only path evidence:

- `codex-rs/core/src/config/mod.rs` contains `model_instructions_file` and `base_instructions` loading.
- `codex-rs/core/src/session/mod.rs` records runtime priority: `config.base_instructions`, conversation history, then current model instructions.
- `codex-rs/models-manager/src/model_info.rs` applies model `base_instructions` and config overrides.

Implication: Codex-VSP must first verify the effective base-instructions path before deciding whether per-model prompt files need edits.

### VSP-Open-Code

Path: `/home/heyx/VSP-Open-Code`

Read-only command:

```bash
git -C /home/heyx/VSP-Open-Code status --short
```

Baseline: dirty before C20-M4 implementation.

```text
 M .opencode/opencode.jsonc
 M .pipeline/config.yaml
 M AGENTS.md
?? .pipeline/chat/
?? .pipeline/chats/
?? .pipeline/inbox/
?? temp/
```

Read-only path evidence:

- `/home/heyx/VSP-Open-Code/AGENTS.md` currently says `Prefer automation: execute requested actions without confirmation unless blocked by missing info or safety/irreversibility.`
- `packages/opencode/src/session/reminders.ts` constructs `Workflow reminder (...)` and references root `AGENTS.md` discipline.
- `packages/opencode/src/session/prompt.ts` applies `SessionReminders`.

Implication: VSP-Open-Code must interpret `Prefer automation` as “清晰具体任务可自动执行”，not as permission to skip discussion/background/question Mini-contract boundaries.

## Codex-VSP Target-local Cycle Brief

目标：把 C20 source contract 传递到 `Codex-VSP` 适合的 managed guidance 或 runtime instruction surfaces，同时保护既有 dirty worktree。

Target-local Cycle 必做：

1. Re-read `/home/heyx/Codex-VSP/AGENTS.md` and active Hypo/OpenCode adapter surfaces read-only.
2. Verify effective base-instructions path before editing per-model prompt files:
   - inspect `codex-rs/core/src/config/mod.rs`
   - inspect `codex-rs/core/src/session/mod.rs`
   - inspect `codex-rs/models-manager/src/model_info.rs`
   - inspect relevant model catalog / template paths only after runtime path is clear.
3. Decide whether source-managed surfaces are enough, or whether per-model files are actually in the effective runtime path.
4. If edits are needed, list exact target files before writing and preserve unrelated target dirty changes.
5. Validate with target-local checks, at minimum `git diff --check`; add Rust / app-server / CLI tests only if touched files require them.

Candidate files to inspect, not pre-authorized write targets:

- `AGENTS.md`
- `opencode.json`
- `.opencode/opencode.json`
- `codex-rs/tui/src/bottom_pane/AGENTS.md`
- `codex-rs/core/gpt-5.2-codex_prompt.md`
- `codex-rs/core/gpt-5.1-codex-max_prompt.md`
- `codex-rs/core/gpt_5_codex_prompt.md`
- `codex-rs/core/gpt_5_2_prompt.md`
- `codex-rs/core/gpt_5_1_prompt.md`
- `codex-rs/core/prompt_with_apply_patch_instructions.md`
- `codex-rs/core/templates/model_instructions/gpt-5.2-codex_instructions_template.md`
- `codex-rs/models-manager/models.json`
- `codex-rs/models-manager/src/model_info.rs`
- `codex-rs/models-manager/src/model_presets.rs`
- `codex-rs/core/src/config/mod.rs`
- `codex-rs/core/src/session/mod.rs`

Acceptance target: target-local evidence shows whether C20 guidance reaches effective runtime instructions, without assuming all per-model prompt files need edits.

## VSP-Open-Code Target-local Cycle Brief

目标：让 `VSP-Open-Code` 的 hand-written guidance / runtime reminders 正确表达 C20 boundary，同时保持 OpenCode native automation 能力。

Target-local Cycle 必做：

1. Re-read `/home/heyx/VSP-Open-Code/AGENTS.md` and reminder/runtime prompt surfaces read-only.
2. Preserve `Prefer automation` as an execution accelerator for clear concrete tasks.
3. Add the missing boundary: discussion/background/idea/complaint/question/solution-discussion must first produce Mini-contract and no file edits.
4. If runtime reminders are edited, verify how `SessionReminders` injects text and add or update target-local tests.
5. If only `AGENTS.md` is edited, validate with `git diff --check`; if runtime code changes, run focused `bun test` / `bun typecheck` from the correct package.

Candidate files to inspect, not pre-authorized write targets:

- `AGENTS.md`
- `.opencode/opencode.jsonc`
- `packages/opencode/AGENTS.md`
- `packages/opencode/src/session/llm/AGENTS.md`
- `packages/app/AGENTS.md`
- `packages/desktop/AGENTS.md`
- `packages/llm/AGENTS.md`
- `packages/opencode/src/session/reminders.ts`
- `packages/opencode/src/session/prompt.ts`
- `packages/opencode/src/session/system.ts`
- `packages/opencode/src/session/instruction.ts`
- `packages/opencode/src/session/prompt/plan.txt`
- `packages/opencode/src/session/prompt/plan-mode.txt`
- `packages/opencode/src/session/prompt/plan-reminder-anthropic.txt`
- `packages/opencode/src/session/prompt/default.txt`
- `packages/opencode/src/session/prompt/gpt.txt`
- `packages/opencode/src/session/prompt/codex.txt`
- `packages/opencode/src/session/prompt/kimi.txt`
- `packages/opencode/src/session/prompt/trinity.txt`

Acceptance target: target-local evidence proves `Prefer automation` and Mini-contract boundary coexist instead of one overriding the other.

## Explicit Non-Targets

- No edits inside `/home/heyx/Codex-VSP` during this source Cycle.
- No edits inside `/home/heyx/VSP-Open-Code` during this source Cycle.
- Do not copy source `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, `.pipeline/log.yaml`, `.pipeline/PROGRESS.md`, or `.pipeline/.lock` into either target.
- Do not claim target deployment from C20 source closure alone.
- Do not decide Codex-VSP per-model prompt edits before verifying effective base-instructions path.
- Do not rewrite VSP-Open-Code local reminders before a target-local Cycle inspects runtime injection and tests.
- Do not clean, reset, reformat, or normalize target dirty worktrees from the source Cycle.

## Validation Candidates

Source-side handoff validation:

```bash
node -e "const fs=require('fs'); for (const f of ['.pipeline/integrations/C20-target-cycle-input.md','.pipeline/integrations/matrix.yaml']) fs.accessSync(f)"
rg -n 'cycle: C20|C20|target handoff|no-write|source evidence|02-source-regression-and-managed-artifact-closure' .pipeline/integrations/matrix.yaml .pipeline/integrations/C20-target-cycle-input.md
rg -n 'Codex-VSP|VSP-Open-Code|Direct sync scope|Target-owned scope|target-local Cycle|no edits inside' .pipeline/integrations/C20-target-cycle-input.md
git diff --check
git -C /home/heyx/Codex-VSP status --short
git -C /home/heyx/VSP-Open-Code status --short
```

Codex-VSP target-local validation candidates:

```bash
git -C /home/heyx/Codex-VSP diff --check
rg -n 'base_instructions|model_instructions_file|model instructions' /home/heyx/Codex-VSP/codex-rs/core/src/config/mod.rs /home/heyx/Codex-VSP/codex-rs/core/src/session/mod.rs /home/heyx/Codex-VSP/codex-rs/models-manager/src/model_info.rs
```

VSP-Open-Code target-local validation candidates:

```bash
git -C /home/heyx/VSP-Open-Code diff --check
rg -n 'Prefer automation|Workflow reminder|SessionReminders|Mini-contract' /home/heyx/VSP-Open-Code/AGENTS.md /home/heyx/VSP-Open-Code/packages/opencode/src/session/reminders.ts /home/heyx/VSP-Open-Code/packages/opencode/src/session/prompt.ts
```

## Recommended Sequence

1. Keep C20 source closure as source evidence only; do not make target deployment claims.
2. Open a `Codex-VSP` target-local Cycle first if the runtime instruction path is the highest uncertainty.
3. In `Codex-VSP`, verify effective base-instructions path, then decide whether adapter guidance, model catalog, template, or per-model prompts need edits.
4. Open a `VSP-Open-Code` target-local Cycle for `Prefer automation` / Mini-contract coexistence.
5. In `VSP-Open-Code`, start with hand-written `AGENTS.md`; only touch reminders/runtime prompt files if inspection proves root guidance is insufficient.
6. For each target, preserve existing dirty worktree and record before/after status in that target's Cycle evidence.

## Risks

- Direct sync scope and Target-owned scope may be mixed, causing accidental target prompt edits from a source Cycle.
- Dirty target baselines may hide unrelated user or runtime changes; target-local Cycles must compare before/after status carefully.
- Codex-VSP per-model prompt edits may miss the effective runtime path unless base-instructions loading is verified first.
- VSP-Open-Code `Prefer automation` may be overcorrected into ask-before-everything; target wording must preserve automatic execution for clear concrete tasks.
- Source closure evidence is strong for source-managed behavior, but it is not target deployment evidence.
