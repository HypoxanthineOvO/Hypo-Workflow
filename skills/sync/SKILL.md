---
name: sync
description: Synchronize Hypo-Workflow project adapters and lightweight derived context without executing pipeline milestones.
---

# /hw:sync

Use this skill when the user invokes `/hw:sync` or asks to run project sync from inside a Hypo-Workflow workspace.

## Output Language Rules

Follow the root Hypo-Workflow output language config. Use Chinese for user-facing output when `output.language` is `zh-CN` or `zh`, English when it is `en`, and follow the conversation language when it is `auto`.

## Contract

`/hw:sync` is an explicit project synchronization entrypoint. It shares semantics with `hypo-workflow sync` and never executes pipeline milestones.

For Codex skills, `/hw:sync` guidance prefers controlled sync of a generated snapshot/copy into the Codex skills directory. Do not use sync as a reason to hot-edit a live symlink skill source while running Codex may read it; that self-modifying skill-source path can expose half-updated or partially updated files. Edit the source project, test in an isolated worktree or isolated copy, then sync the snapshot. This is supporting guidance and does not replace audit/rework/worker-separation gates.

Supported modes:

- `/hw:sync --light`: refresh registry status, refresh Knowledge Ledger compact/index when source records changed, detect external changes, and report what needs attention.
- `/hw:sync`: run light sync, sync OpenCode adapters, validate config loading, check declared derived artifacts, and refresh lightweight compact views.
- `/hw:sync --check-only`: detect external changes and declared stale derived artifacts without writing adapters, compact files, reports, or protected authority files.
- `/hw:sync --repair`: run standard sync plus safe refresh of declared derived artifacts such as `PROGRESS.compact.md`, metrics/report compact views, `PROJECT-SUMMARY.md`, and derived health.
- `/hw:sync --deep`: run standard repair sync plus dependency scan and architecture rescan hints.

## Derived Artifact Map

The sync contract distinguishes protected authority files from derived views.

- Protected authority files: `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, `.pipeline/rules.yaml`.
- Safe derived views: compact files, metrics/report mirrors, project summary, OpenCode status inputs, generated references, and managed doc blocks.
- Authority conflicts must be reported as repair-needed and must not be guessed or silently fixed.
- Derived health is written to `.pipeline/derived-health.yaml` only during repair/deep sync, then surfaced by status/dashboard readers.

## SessionStart

SessionStart performs only light external-change detection. It may prompt the user to run `/hw:sync --light` or standard `/hw:sync`, but it must not run adapter generation, compact refresh, dependency scans, or pipeline milestones by itself.

## Boundaries

- Do not execute pipeline prompts or milestone steps.
- Do not mutate `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, or `.pipeline/rules.yaml`.
- `--check-only` must not write.
- `--repair` may only write declared safe derived artifacts.
- Deep sync must be explicit.
- Heavy scans, adapter writes, and compact writes are not allowed from SessionStart light detection.

## Reference Files

- `references/commands-spec.md`
- `references/opencode-command-map.md`
- `references/opencode-spec.md`
- `cli/README.md`
