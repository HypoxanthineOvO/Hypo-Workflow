# C19 Target Adaptation Plan

生成时间：2026-06-08T20:49:53+08:00

## Status

Waiting for revised target-write confirmation. Do not write `~/Codex-VSP` or `~/VSP-Open-Code` until the user confirms the file list, non-targets, validation commands, and VSP-OpenCode prompt source below.

This revision incorporates the user's latest feedback: VSP-OpenCode should receive the full prompt from the referenced Zhihu / DeepSeek-oriented AGENTS.md article because that target mainly uses DeepSeek and similar domestic Chinese models.

## Source Summary

C19 source-side changes:

- Plan phase model is now `Discover -> Technical Stack -> Architecture -> Decompose -> Generate -> Implementation`.
- `/hw:plan:technical-stack` and `/hw:plan:architecture` are user-facing phase commands.
- `/hw:plan:confirm` is no longer user-facing; confirmation is an in-phase Question Tool / Ask gate.
- Plan gates must show actual phase artifacts before Question Tool / Ask confirmation.
- Shared AGENTS/OpenCode/Claude guidance now projects four-rule discipline: Think Before Coding, Simplicity First, Surgical Changes, and Goal-Driven Execution.

## Prompt Source Status

Local Workflow artifacts contain only the short extracted themes from the referenced article:

- Think Before Coding
- Simplicity First
- Surgical Changes
- Goal-Driven Execution
- Grill-me style structured discovery

The full Zhihu article prompt text is not present in `.plan-state/`, `.pipeline/`, source prompts, or current source reports. The earlier C19 source plan explicitly rejected pasting the Zhihu block verbatim for the source repo and instead used structured local rule sources. The user's latest feedback changes only the VSP-OpenCode target strategy.

Implication:

- Codex-VSP can proceed with generated Hypo/OpenCode adapter refresh after confirmation.
- VSP-OpenCode should not claim "full article prompt integrated" until the user provides the article prompt text or a reachable link and confirms that exact source.

## Read-Only Target Inspection

### Codex-VSP

- Path: `~/Codex-VSP`
- Dirty worktree: yes.
- Relevant dirty surfaces observed: `AGENTS.md`, `.pipeline/*`, knowledge indexes/records, chat/inbox state.
- Existing Hypo/OpenCode surfaces observed: root `AGENTS.md`, `opencode.json`, `.opencode/hypo-workflow.json`, `.opencode/plugins/hypo-workflow.ts`, and `.opencode/agents/hw-*.md`.
- Gaps:
  - `opencode.json`, `.opencode/hypo-workflow.json`, and `.opencode/plugins/hypo-workflow.ts` still expose `/hw:plan:confirm`.
  - `.opencode/agents/hw-*.md` still say every `P1/P2/P3/P4` checkpoint must be represented in todo state.
  - New `/hw:plan:technical-stack` and `/hw:plan:architecture` are missing from inspected OpenCode command metadata.
  - Four-rule discipline and visible Plan gate artifact guidance are not present in inspected generated agents.

### VSP-Open-Code

- Path: `~/VSP-Open-Code`
- Dirty worktree: yes.
- Relevant dirty surface observed: `.opencode/opencode.jsonc`; additional untracked `.pipeline/chat/`, `.pipeline/chats/`, and `.pipeline/inbox/`.
- Existing surfaces observed:
  - root `AGENTS.md` is a hand-written project rule file, not a Hypo-generated adapter.
  - `.opencode/command/*` and `.opencode/agent/*` are OpenCode-native project commands/agents, not Hypo `/hw:*` generated command files.
  - `packages/opencode` owns native `question`, `todo`, TUI, workflow reminder, and validation tests.
- Revised gaps:
  - Root `AGENTS.md` should carry the full user-confirmed DeepSeek-oriented article prompt, not only the concise C19 four-rule projection.
  - `.pipeline/architecture/module-workflow.md` still refers to `Plan Confirm` through AskUserQuestion and should move to Generate final confirmation / in-phase Ask language.
  - OpenCode runtime has strong native `question` and `todo` support, so the target guidance should explicitly bind the article prompt to native `question` and `todowrite` usage.

## Proposed File List

### Codex-VSP

Write only after confirmation:

- `AGENTS.md`
- `opencode.json`
- `.opencode/hypo-workflow.json`
- `.opencode/plugins/hypo-workflow.ts`
- `.opencode/agents/hw-build.md`
- `.opencode/agents/hw-code-a.md`
- `.opencode/agents/hw-code-b.md`
- `.opencode/agents/hw-compact.md`
- `.opencode/agents/hw-debug.md`
- `.opencode/agents/hw-docs.md`
- `.opencode/agents/hw-explore.md`
- `.opencode/agents/hw-plan.md`
- `.opencode/agents/hw-report.md`
- `.opencode/agents/hw-review.md`
- `.opencode/agents/hw-status.md`
- `.opencode/agents/hw-test.md`
- Add generated command metadata/files for `/hw:plan:technical-stack` and `/hw:plan:architecture`.
- Remove generated user-facing command metadata/file for `/hw:plan:confirm`.
- Target records after validation: `.pipeline/PROGRESS.md`, `.pipeline/log.yaml`.

### VSP-Open-Code

Write only after confirmation and after the full prompt source is supplied or confirmed:

- `AGENTS.md`
  - Add a dedicated DeepSeek / domestic-model instruction block using the full user-provided article prompt text.
  - Keep the existing hand-written project guidance intact.
  - Add C19 Plan gate visibility requirements and native `question` / `todowrite` expectations around that prompt.
- `.pipeline/architecture/module-workflow.md`
  - Update Plan Confirm wording to Generate final confirmation / in-phase Ask language.
  - Note that VSP-OpenCode guidance is optimized for DeepSeek-like model behavior through root `AGENTS.md`.
- Optional, only if exact owner inspection after confirmation requires runtime reminder updates:
  - `packages/opencode/src/session/reminders.ts`
  - `packages/opencode/test/workflow/platform-awareness-contract.test.ts`
- Target records after validation: `.pipeline/PROGRESS.md`, `.pipeline/log.yaml`.

## Explicit Non-Targets

- Do not edit target secret-bearing local configs, including `~/VSP-Open-Code/.opencode/opencode.jsonc`.
- Do not copy source `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, or `.pipeline/log.yaml` into either target.
- Do not overwrite target `.pipeline/chat/`, `.pipeline/chats/`, `.pipeline/inbox/`, or knowledge records.
- Do not run root `npm test` in `~/VSP-Open-Code`; its root package explicitly rejects root tests.
- Do not reformat broad target worktrees.
- Do not edit application runtime code in either target unless a confirmed follow-up expands scope.
- Do not invent or paraphrase the "full article prompt" as if it were the original; if the full text is unavailable, stop before VSP-OpenCode writes.

## Validation Commands

### Codex-VSP

```bash
cd ~/Codex-VSP
pnpm prettier --check AGENTS.md opencode.json .opencode/hypo-workflow.json .opencode/plugins/hypo-workflow.ts .opencode/agents/*.md
git diff --check
```

### VSP-Open-Code

If only guidance and architecture docs are changed:

```bash
cd ~/VSP-Open-Code
git diff --check
```

If runtime reminder text is included:

```bash
cd ~/VSP-Open-Code/packages/opencode
bun test test/workflow/platform-awareness-contract.test.ts test/workflow/yolo-governance-contract.test.ts
bun typecheck
cd ~/VSP-Open-Code
git diff --check
```

## Recommended Target Strategy

1. Apply Codex-VSP generated-adapter refresh first because it has stale generated Hypo/OpenCode surfaces and does not depend on the missing article prompt.
2. Hold VSP-OpenCode writes until the full article prompt text or link is provided, then insert it into root `AGENTS.md` as a dedicated DeepSeek / domestic-model instruction block.
3. Preserve each target's dirty worktree exactly; if any proposed file has unrelated local edits, inspect and patch only the confirmed sections.
4. Stop immediately if a needed file is outside this confirmed list.
