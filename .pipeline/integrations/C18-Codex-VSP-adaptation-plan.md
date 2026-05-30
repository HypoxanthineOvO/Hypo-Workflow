# C18 Codex-VSP Adaptation Plan

## Status

Planned only. Do not write `~/Codex-VSP` until the user confirms this file list after C18-M5.

## Read-Only Inspection

- Path: `~/Codex-VSP`
- Dirty worktree: yes, many modified `.pipeline/*`, docs, `codex-rs/core/*`, `codex-rs/tui/*`, and new workflow helper/test files.
- Current project summary: active C6 `Compact 机制、上下文管理与 Workflow 定制化接入`.
- Existing Workflow integration:
  - runtime Hypo-Workflow guidance injection
  - compact fallback context
  - ordinary root Codex turn capture to `.pipeline/chat/`, `.pipeline/inbox/`, and `.pipeline/chats/`
  - `/hw:*` and `$hypo-workflow:*` helper parsing
  - command discoverability helper API, not full TUI palette wiring

## Source Changes To Sync

- Enhanced `/hw:audit`: Intake-first, Experience/Engineering/Risk, Critical blocking, Action Queue.
- New `/hw:quality`: scorecard, baseline, compare, review, action queue.
- New `/hw:optimize`: Audit+Quality -> Implement/Test -> Audit+Quality with backup/correctness/budget/validation gates.
- Integration sync is a source-side development/release workflow, not a user command.

## Proposed File List

Confirm before editing:

- `README.md`
- `docs/vsp-codex.md`
- `docs/slash_commands.md`
- `CHANGELOG.md`
- `PROJECT-SUMMARY.md`
- `codex-rs/core/src/workflow_routing.rs`
- `codex-rs/core/src/workflow_context.rs`
- `codex-rs/core/src/workflow_conversation_capture.rs`
- `codex-rs/core/src/workflow_files.rs`
- `codex-rs/tui/src/workflow_slash_routing.rs`
- `codex-rs/core/tests/suite/workflow_routing.rs`
- `codex-rs/core/tests/suite/workflow_conversation_capture.rs`
- `codex-rs/core/tests/suite/workflow_files.rs`
- `codex-rs/tui/tests/suite/workflow_slash_routing.rs`
- `.pipeline/PROGRESS.md`
- `.pipeline/log.yaml`

## Required Adaptations

1. Command routing/discoverability:
   - add `/hw:quality` and `/hw:optimize`
   - keep `/hw:*` and `$hypo-workflow:*` prefix-only parsing
   - do not treat `/quality`, `/optimize`, `/audit`, `/review`, or ordinary text as Workflow commands
2. Runtime guidance:
   - mention enhanced Audit, Quality, Optimize
   - keep Hypo-Workflow non-runner boundary
   - preserve destructive/system dependency/network/remote side-effect gates
3. Conversation capture/inbox:
   - classify ordinary feedback related to audit, quality score, optimization, sync, and target adaptation as candidate inbox records
   - keep secret redaction and bounded context
4. Records:
   - target-side notes in CHANGELOG/PROJECT-SUMMARY/.pipeline
   - source backlink after validation

## Validation Commands

Candidate commands:

```bash
cd ~/Codex-VSP/codex-rs
just test -p codex-tui workflow_slash_routing
cargo test -p codex-core workflow_conversation_capture workflow_routing
```

Exact commands may be narrowed after reading the current test names in C18-M6.

## Risks

- Worktree already contains extensive C6 changes; edits must preserve user work.
- Some proposed files are currently untracked, so C18-M6 must inspect content before patching.
- Full TUI command palette wiring may be broader than C18; if so, document as deferred.
