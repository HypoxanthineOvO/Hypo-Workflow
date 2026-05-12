# PR-20260512-001 Review Notes

## Findings

1. Blocking: PR #7 conflicts with current local `main`.

   Evidence: temporary merge of `refs/tmp/pr7` into `d6df07f release: v12.4.0` failed. Conflicts include `.pipeline/PROGRESS.md`, `.pipeline/confirm-summary.md`, `.pipeline/cycle.yaml`, `.pipeline/feature-queue.yaml`, `.pipeline/log.yaml`, README files, `SKILL.md`, `core/src/docs/index.js`, release notes, and Subagent templates. The C10 archive rename conflict is especially risky because both sides move the same old prompt files to different archive directories.

2. Blocking: PR #7 mixes durable implementation with `.pipeline/` runtime state and release surfaces.

   The core implementation appears valuable, but the diff also rewrites active Cycle files, C10/C11 prompt archives, release notes, docs generator outputs, package versions, and adapters. These are high-conflict generated/runtime surfaces and should be regenerated from the accepted implementation on top of current main.

3. Warning: PR #7 has no CI/check evidence in GitHub.

   `statusCheckRollup` is empty. The PR body lists only two targeted Node test files and says `14/14 passing`; it does not show full core regression, full scenario regression, config validation, docs checks, sync repair, or `git diff --check`.

4. Warning: `/hw:achieve` command semantics need a product decision before merging.

   The PR adds `.opencode/commands/hw-achieve.md` and maps it to `skills/accept/SKILL.md`. This may be useful as an alias, but it changes the public command surface and should be reflected consistently in command counts, help output, docs, regression scenarios, and compatibility policy.

## Useful Content To Preserve

- audit-memory model and scoped audit summaries
- structured rejection artifact and rework prompt linkage
- blocked-runtime proposal and audit approval helper
- worker prompt-scope / changed-file evidence checks
- new focused tests and scenarios `s64`-`s70`
- subworker canonical prompt-path guidance

## Merge Advice

Use a clean integration branch from current `main`; port implementation slices in small commits and leave runtime `.pipeline/` authority files alone unless they are intentionally part of the current cycle. Do not use the GitHub merge button for PR #7 as-is.
