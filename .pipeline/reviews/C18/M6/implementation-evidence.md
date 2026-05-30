# C18-M6 Implementation Evidence

## Scope

User-confirmed target adaptations were applied to:

- `~/Codex-VSP`
- `~/VSP-Open-Code`

No source `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, or `.pipeline/log.yaml` was copied into either target.

## Codex-VSP

Implemented target-side C18 coverage:

- `/hw:audit`, `/hw:quality`, `/hw:optimize` helper routing and discoverability.
- C18 guidance for enhanced Audit, Quality scorecard, and Optimize closed loop.
- Ordinary conversation capture candidate categories: `audit`, `quality`, `optimize`, `integration_sync`.
- Target docs and target `.pipeline` records.

Evidence paths:

- `codex-rs/core/src/workflow_routing.rs`
- `codex-rs/core/src/workflow_conversation_capture.rs`
- `codex-rs/tui/src/workflow_slash_routing.rs`
- `codex-rs/core/tests/suite/workflow_routing.rs`
- `codex-rs/core/tests/suite/workflow_conversation_capture.rs`
- `codex-rs/tui/tests/suite/workflow_slash_routing.rs`
- `README.md`
- `docs/vsp-codex.md`
- `docs/slash_commands.md`
- `CHANGELOG.md`
- `PROJECT-SUMMARY.md`
- `.pipeline/PROGRESS.md`
- `.pipeline/log.yaml`

## VSP-Open-Code

Implemented target-side C18 coverage:

- Added `/hw:quality` and `/hw:optimize` to the shared Workflow command registry.
- Added C18 Skill routing guidance for `/hw:audit`, `/hw:quality`, and `/hw:optimize`.
- Added Workflow reminder guidance for Audit/Quality/Optimize and kept integration sync out of the user slash-command namespace.
- Added compact Workflow status discoverability line for quality commands.
- Added lightweight ordinary-feedback candidate classifier for `audit`, `quality`, `optimize`, and `integration_sync`.
- Updated target README, changelog, project summary, and target `.pipeline` lifecycle records.

Confirmed extra files beyond the original M5 list:

- `packages/opencode/src/cli/cmd/workflow/registry.ts`
- `packages/opencode/src/session/reminders.ts`

Reason: actual OpenCode command registration and reminder injection live there. User confirmed the expansion through Request Tool during M6.

Evidence paths:

- `packages/opencode/src/cli/cmd/workflow/registry.ts`
- `packages/opencode/src/session/reminders.ts`
- `packages/opencode/src/cli/cmd/workflow/state.ts`
- `packages/opencode/src/translation/continue-cache.ts`
- `packages/opencode/test/workflow/integration-contract.test.ts`
- `packages/opencode/test/workflow/platform-awareness-contract.test.ts`
- `packages/opencode/src/translation/continue-cache-queue.test.ts`
- `README.md`
- `CHANGELOG.md`
- `PROJECT-SUMMARY.md`
- `.pipeline/log.yaml`
- `.pipeline/state.yaml`

## Dirty Worktree Preservation

Both targets were dirty before M6 target writes. Existing unrelated changes were not reverted.

VSP-Open-Code still contains unrelated dirty files from prior target work, including installer/release/plugin/OAuth/localization files. C18 reports only the scoped C18 adaptation paths.
