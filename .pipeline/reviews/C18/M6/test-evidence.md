# C18-M6 Test Evidence

## Codex-VSP

Target: `~/Codex-VSP`

Passed:

```bash
cd ~/Codex-VSP/codex-rs
cargo fmt --check
cargo test -p codex-tui workflow_slash_routing
cargo test -p codex-core workflow_conversation_capture
cargo test -p codex-core workflow_routing
cd ~/Codex-VSP
git diff --check
```

Results:

- `cargo fmt --check`: passed; existing stable rustfmt warning for `imports_granularity = Item`.
- `workflow_slash_routing`: 9 passed.
- `workflow_conversation_capture`: 10 passed.
- `workflow_routing`: 10 passed.
- `git diff --check`: passed.

## VSP-Open-Code

Target: `~/VSP-Open-Code`

Passed:

```bash
cd ~/VSP-Open-Code/packages/opencode
bun test test/workflow/integration-contract.test.ts test/workflow/yolo-governance-contract.test.ts
bun test src/translation/continue-cache-queue.test.ts
bun test test/workflow/platform-awareness-contract.test.ts test/util/locale.test.ts
bun typecheck
cd ~/VSP-Open-Code
git diff --check
```

Results:

- `integration-contract` + `yolo-governance`: 22 passed.
- `continue-cache-queue`: 7 passed.
- `platform-awareness` + `locale`: 5 passed.
- `bun typecheck`: passed.
- `git diff --check`: passed.

## Notes

- VSP-Open-Code initially failed because the reminder text exposed `/hw:integration-sync` while the contract requires integration sync to remain non-command workflow language. Fixed inside confirmed `packages/opencode/src/session/reminders.ts`, then reran focused tests successfully.
- Tests were run from `packages/opencode` for VSP-Open-Code per target AGENTS rules.
