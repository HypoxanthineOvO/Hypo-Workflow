# C15-M5 Test Evidence

Worker: test
Scope: final integration smoke for C15-M1 through C15-M4 combined behavior.
Write boundary: this evidence file only.
Date: 2026-05-16

## Context Read

- Read `.pipeline/prompts/04-integration-smoke-release-readiness.md`.
- Read `.pipeline/state.yaml`; current milestone is C15-M5 `Integration Smoke And Release Readiness`, step `write_tests`.
- Read M1-M4 reports:
  - `.pipeline/reports/00-p2-technical-route-gate.report.md`
  - `.pipeline/reports/01-detailed-completion-report-contract.report.md`
  - `.pipeline/reports/02-interactive-analysis-state-command-entry.report.md`
  - `.pipeline/reports/03-shared-skill-asset-path-contract.report.md`

## Required Command Results

### 1. Targeted Node tests

Command:

```bash
uv run -- node --test core/test/analysis*.test.js core/test/chat*.test.js core/test/response-contract.test.js core/test/skill*.test.js core/test/sync-standardization.test.js core/test/progressive-discover.test.js
```

Result: PASS.

Summary:

- 58 tests passed.
- 0 failed.
- Covered Analysis command/runtime/state, chat recovery, response contract, skill quality/spec, sync standardization, and progressive discover.

M5 blocker: no.

### 2. Regression command

Command:

```bash
uv run python tests/run_regression.py --scenario s24-audit-report --scenario s25-debug-flow --scenario s38-patch-fix-flow --scenario s62-analysis-preset-runtime
```

Result: FAIL, exit code 1.

Important output:

- Requested focus scenarios all passed:
  - `PASS s24-audit-report`
  - `PASS s25-debug-flow`
  - `PASS s38-patch-fix-flow`
  - `PASS s62-analysis-preset-runtime`
- Runner executed the broader suite despite the repeated `--scenario` filters.
- Overall summary: `55/68 passed`.
- Failing non-focus scenarios shown in the run:
  - `s32-import-history-keyword`
  - `s33-import-history-merge`
  - `s34-import-history-time-gap`
  - `s35-import-history-interactive`
  - `s37-import-history-existing-pipeline`
  - `s42-guide-flow`
  - `s44-showcase-skeleton`
  - `s45-showcase-docs`
  - `s46-showcase-slides-poster`
  - `s47-showcase-lifecycle`
  - `s52-core-config-artifacts`
  - `s56-agents-ask-todo-plan-discipline`
  - `s60-progress-board-format`

Observed detailed failure sample:

- `s52-core-config-artifacts` ran Node tests and reported `501/514` passing, `13` failing.
- One visible failing subtest was `workflow commit helper contract is documented for lifecycle commands`, where `core/test/workflow-commit.test.js` expected `/workflow commit helper/` in `skills/accept/SKILL.md`; the file currently says "使用工作流提交助手" instead.

M5 blocker: warning, not a C15-M1..M4 integration smoke blocker, because all four requested focus scenarios passed. It remains a release-readiness warning because the required command exits nonzero due broader-suite failures.

### 3. Diff whitespace check

Command:

```bash
git diff --check
```

Result: PASS, no output.

M5 blocker: no.

## Focused Smoke Evidence

### P2 route gate rejects goal-only decomposition

Command:

```bash
uv run -- node --test core/test/p2-technical-route-contract.test.js core/test/analysis-state-ledger.test.js core/test/analysis-command-entry.test.js core/test/skill-quality.test.js
```

Result: PASS.

Summary:

- 21 tests passed.
- P2-specific passing subtests included:
  - `P2 contract fixture defines a complete technical-route contract for every milestone`
  - `P2 docs require technical solution, route, and research status before proposed/P3`
  - `research-required signals are a hard P2 gate until asked, resolved, or explicitly deferred`
  - `user challenge to the technical route sends P2 back to revision or in_progress`
  - `P3 Generate preserves P2 technical route fields in generated prompts`

Additional readonly evidence:

- `skills/plan-decompose/SKILL.md` says P2 must not enter `proposed` as a goal-only checkpoint and must stay `in_progress` or `revision` if technical route fields are missing.
- `skills/plan-generate/SKILL.md` says missing P2 technical route fields or active blocking research must stop Generate and return to P2 revision.

M5 blocker: no.

### Analysis continuation keeps ledger path and main question

Command:

```bash
uv run -- node --test core/test/p2-technical-route-contract.test.js core/test/analysis-state-ledger.test.js core/test/analysis-command-entry.test.js core/test/skill-quality.test.js
```

Result: PASS.

Relevant passing subtests:

- `analysis state summary stays small and points to the external ledger`
- `analysis state summary preserves an explicitly referenced legacy ledger`
- `status and report surfaces summarize analysis from compact state and ledger pointer`

Readonly evidence:

- `core/test/analysis-state-ledger.test.js` asserts:
  - main question is preserved as `How should analysis milestones persist recoverable state and reviewable evidence?`
  - canonical ledger path is `.pipeline/analysis/M06/ledger.yaml`
  - compact summary keeps `summary.ledger_path` and `summary.question`
  - legacy explicit ledger path `.pipeline/analysis/M06-analysis-ledger.yaml` is preserved when already referenced.

M5 blocker: no.

### state-init shared asset path exists in source and installed bundle

Command:

```bash
test -f assets/state-init.yaml \
  && test -f /home/heyx/.codex/skills/hypo-workflow/assets/state-init.yaml \
  && test ! -e skills/cycle/assets/state-init.yaml \
  && test ! -e /home/heyx/.codex/skills/hypo-workflow/skills/cycle/assets/state-init.yaml \
  && printf 'source-and-installed-state-init-layout-ok\n'
```

Result: PASS.

Output:

```text
source-and-installed-state-init-layout-ok
```

Readonly evidence:

- `skills/cycle/SKILL.md` uses `../../assets/state-init.yaml`.
- `skills/start/SKILL.md` uses `../../assets/state-init.yaml`.
- Installed bundle files also use the shared-root path:
  - `/home/heyx/.codex/skills/hypo-workflow/skills/cycle/SKILL.md`
  - `/home/heyx/.codex/skills/hypo-workflow/skills/start/SKILL.md`

M5 blocker: no.

### OpenCode generated artifacts include `/hw-analysis`

Commands:

```bash
rg -n "/hw:analysis|/hw-analysis|hw-analysis" .opencode opencode.json references/opencode-command-map.md /home/heyx/.codex/skills/hypo-workflow/.opencode /home/heyx/.codex/skills/hypo-workflow/opencode.json /home/heyx/.codex/skills/hypo-workflow/references/opencode-command-map.md
```

```bash
test -f .opencode/commands/hw-analysis.md && test -f /home/heyx/.codex/skills/hypo-workflow/.opencode/commands/hw-analysis.md; printf 'repo_hw_analysis=%s installed_hw_analysis=%s\n' "$(test -f .opencode/commands/hw-analysis.md && echo yes || echo no)" "$(test -f /home/heyx/.codex/skills/hypo-workflow/.opencode/commands/hw-analysis.md && echo yes || echo no)"
```

Result: PARTIAL PASS / WARNING.

Source repository generated artifacts include Analysis:

- `references/opencode-command-map.md` contains `/hw:analysis -> /hw-analysis`.
- `opencode.json` contains `hw-analysis`.
- `.opencode/hypo-workflow.json` contains canonical `/hw:analysis` and OpenCode `/hw-analysis`.
- `.opencode/commands/hw-analysis.md` exists.

Installed bundle generated surface is stale:

- `repo_hw_analysis=yes installed_hw_analysis=no`
- Listing `/home/heyx/.codex/skills/hypo-workflow/.opencode/commands` shows many `hw-*` commands but no `hw-analysis.md`.
- The broader `rg` command found `/hw-analysis` only in the source repository files, not in the installed bundle paths.

M5 blocker: warning for installed/generated surface freshness. Source generated artifacts pass; installed bundle still needs refresh for `/hw-analysis`.

## Blockers And Warnings

Blockers:

- None for C15-M1 through C15-M4 combined smoke behavior.

Warnings:

- Required regression command exits 1 because the runner executed the broader suite and unrelated historical scenarios failed. The four requested focus scenarios all passed.
- Installed OpenCode generated surface under `/home/heyx/.codex/skills/hypo-workflow` is stale for `/hw-analysis`; source repository generated artifacts include it.

## Conclusion

C15-M1 through C15-M4 integration smoke passes for the requested combined behaviors:

- P2 rejects goal-only decomposition and blocks P3 without technical route fields.
- Analysis continuation preserves compact question and ledger path.
- Shared `state-init.yaml` path exists in both source and installed bundle without child-copy masking.
- Source OpenCode generated artifacts expose `/hw:analysis`.

Release readiness has two warnings to carry forward: broader regression command nonzero due unrelated failures, and installed OpenCode generated surface stale for `/hw-analysis`.
