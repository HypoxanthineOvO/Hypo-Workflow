# C18-M5 Test Evidence

## Focused Tests

Passing:

```bash
node --test core/test/c18-instruction-quality-contract.test.js
node --test core/test/sync-standardization.test.js core/test/knowledge-ledger.test.js
node --test core/test/analysis-command-entry.test.js core/test/cycle-acceptance.test.js core/test/explore-contract.test.js core/test/docs-governance.test.js core/test/commands-rules-artifacts.test.js
node --test core/test/deep-plan-integration.test.js core/test/explain-contract.test.js core/test/log-evidence.test.js core/test/maintenance-command-map.test.js core/test/platform-adapters.test.js core/test/pr-contract.test.js core/test/commands-rules-artifacts.test.js
```

## Full Regression

Passing:

```bash
npm test
```

Result: 665/665 passing.

Passing:

```bash
git diff --check
```

Result: no whitespace errors.

## Command Artifact Naming Findings

- OpenCode command registry and generated `.opencode/commands/*` files now use namespace names such as `/hw:quality` and `hw:quality.md`.
- Legacy OpenCode dash files such as `hw-quality.md` are removed during artifact generation.
- Cursor third-party adapters intentionally keep flat dash files such as `.cursor/skills/hw-start.md` and `.cursor/commands/hw-start.md` because that adapter documents and validates the flat Cursor skill/command layout.

## Target Read-Only Inspection

```bash
git -C ~/Codex-VSP status --short
git -C ~/VSP-Open-Code status --short
```

Both target repositories are dirty. C18-M6 must not write either repository until the user confirms the adaptation plans.
