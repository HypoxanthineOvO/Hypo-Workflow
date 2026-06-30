# C19-M4 Test Evidence

Timestamp: 2026-06-08T19:25:26+08:00

Role: C19-M4 test worker.

Scope:
- No production/source docs or code were edited by this worker.
- Evidence write limited to `.pipeline/reviews/C19/M4/test-evidence.md`.

## Required Commands

### Focused Tests

Command:

```bash
uv run -- node --test core/test/progressive-discover.test.js core/test/batch-plan.test.js core/test/commands-rules-artifacts.test.js core/test/docs-governance.test.js core/test/c18-instruction-quality-contract.test.js
```

Result: PASS

Summary:
- tests: 41
- pass: 41
- fail: 0
- duration: 491.02327 ms

### Full Source Regression

Command:

```bash
npm test
```

Result: PASS

Summary:
- tests: 674
- pass: 674
- fail: 0
- duration: 3952.108134 ms

### Whitespace Check

Command:

```bash
git diff --check
```

Result: PASS

Summary:
- No whitespace errors reported.

## Read-Only Scans

### Stale P1/P2/P3/P4 Plan Wording

Command used:

```bash
rg -n --glob '!docs/release/**' --glob '!docs/en/release/**' --glob '!docs/showcase/**' -e '\bP[1-4]\b|P1|P2|P3|P4' SKILL.md plan skills/plan* skills/guide skills/init references docs/reference docs/en/reference docs/user-guide.md docs/en/user-guide.md README.md .pipeline/architecture.md
```

Result: FAIL

Current user-facing Skills/docs/references still contain stale or compatibility-sensitive `P1`/`P2`/`P3`/`P4` wording outside release/showcase historical material. Representative current-source hits:

- `SKILL.md:445` and `SKILL.md:446` still describe minimum `P1` rounds and `P1` entering `P2`.
- `README.md:26`, `docs/user-guide.md:20`, and `docs/en/user-guide.md:22` still describe `P0 Configure` before `P1 Discover`.
- `docs/reference/configuration.md:19`, `docs/reference/configuration.md:32`, `docs/reference/configuration.md:34`, and English equivalents still describe `P2/P4` or `P1-P4` planning gates.
- `skills/plan/SKILL.md`, `skills/plan-discover/SKILL.md`, `skills/plan-decompose/SKILL.md`, and `skills/plan-generate/SKILL.md` retain many `P1`, `P2`, and `P3` phase labels.
- `references/commands-spec.md`, `references/config-spec.md`, `references/progressive-discover-spec.md`, and `references/subagent-spec.md` still use old phase numbering in active reference text.
- `.pipeline/architecture.md:43` explicitly says the old `P1/P2/P3/P4` semantics are being adjusted to the new named model.

Historical release/showcase materials were intentionally excluded from the representative scan.

### User-Facing `/hw:plan:confirm`

Commands used:

```bash
rg -n --glob '!*.pipeline/reviews/**' --glob '!*.pipeline/reports/**' --glob '!*.pipeline/log.yaml' --glob '!node_modules/**' --glob '!tests/**' --glob '!tmp/**' --glob '!vendor/**' '/hw:plan:confirm|plan:confirm|confirm command|confirm 命令' SKILL.md skills references docs README.md AGENTS.md CLAUDE.md .opencode .claude-plugin .codex core/test
find .opencode/commands commands/plan -maxdepth 1 -type f | sort | rg 'plan:confirm|plan/confirm' || true
```

Result: PASS

Findings:
- User-facing `/hw:plan:confirm` remains absent from command maps and generated OpenCode command files.
- `.opencode/commands/hw:plan:confirm.md` is absent.
- `commands/plan/confirm.md` is absent.
- Remaining hits are allowed compatibility notes or negative tests:
  - `skills/plan-confirm/SKILL.md:16`
  - `skills/plan/SKILL.md:269`
  - `core/test/docs-governance.test.js`
  - `core/test/commands-rules-artifacts.test.js`

### Generated OpenCode Artifacts: Four-Rule Discipline And Plan Gate Visibility

Commands used:

```bash
rg -l 'Think Before Coding' .opencode/commands .opencode/agents AGENTS.md | wc -l
rg -l 'For major Plan gates, show the actual phase artifacts before Question Tool / Ask confirmation' .opencode/commands .opencode/agents AGENTS.md | wc -l
test -f .opencode/commands/hw:plan:technical-stack.md
test -f .opencode/commands/hw:plan:architecture.md
test ! -e .opencode/commands/hw:plan:confirm.md
```

Result: PASS

Findings:
- 66 generated OpenCode/AGENTS surfaces include the four-rule discipline text.
- 66 generated OpenCode/AGENTS surfaces include the Plan gate visibility text.
- Generated OpenCode plan command files include `hw:plan:technical-stack.md` and `hw:plan:architecture.md`.
- Generated OpenCode plan command files do not include `hw:plan:confirm.md`.

## Overall Result

Regression commands: PASS.

Read-only scan closure: NOT PASS because current user-facing Skills/docs/references still contain stale `P1/P2/P3/P4` Plan wording outside historical release/showcase material.
