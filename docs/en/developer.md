# Developer Guide

[中文](../developer.md) | English

Core helpers live under `core/src/` and are shared by the CLI, skills, OpenCode artifacts, and tests. Prefer changing those sources first, then refresh derived docs and adapters through docs/sync.

## Contracts

- `.pipeline/` is the source of truth for state, Cycle, Rules, PROGRESS, logs, prompts, and reports.
- Generated adapters are derived artifacts and must not become authority.
- Protected authority files such as `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, and `.pipeline/rules.yaml` must be written through lifecycle commands or workflow commit helpers.
- Command names, config keys, filenames, and platform-specific terms stay in English; user-facing Chinese docs remain the default localized surface.

## Documentation

- `README.md` is the Chinese entrypoint.
- `README.en.md` is the English entrypoint and links only to `docs/en/...` pages.
- `docs/reference/*.md` and `docs/en/reference/*.md` are generated from core helpers.
- Run `/hw:docs repair` after changing docs source helpers.
