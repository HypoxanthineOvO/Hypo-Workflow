# Quality Report — 2026-05-31

## Intake
- Scope: current project `/home/heyx/Hypo-Workflow`
- Mode: scorecard
- Correctness constraints: preserve Hypo-Workflow source-of-truth boundaries under `.pipeline/`; do not mutate protected state for this review; distinguish quality findings from Audit risk gate findings.
- Validation path: `npm test`; `pytest -q tests`; direct Python Notion script probes; `bash scripts/validate-config.sh`; `git diff --check`; static evidence from `core/src`, `references`, `.pipeline/log.yaml`, and prior audit reports.

## Scorecard

| Dimension | Score | Evidence | Action |
|---|---:|---|---|
| Correctness | 3 | `npm test` currently reports `664/665` passing; the failing subtest is `current lifecycle log validates real event families and statuses` because `.pipeline/log.yaml:5` uses `partially_published` and `.pipeline/log.yaml:24` uses `prepared`, while `core/src/log/index.js:28` status validation does not include them. `bash scripts/validate-config.sh` and `git diff --check` pass. | Patch log schema/status normalization and re-run `npm test`. |
| Maintainability | 3 | C17/C18 improved prior audit findings: root `package.json:5` exposes `npm test`; `core/src/utils/index.js:3` provides shared helpers; workspace split tests pass. Remaining local helper duplication persists in `core/src/notification-sender/index.js:362`, `core/src/project-linkage/index.js`, `core/src/ledger/index.js`, `core/src/opencode-status/index.js`, and related modules. | Continue low-risk utility migration through `/hw:optimize` or focused Patch. |
| Structure/Organization | 3 | The project has clear command/spec/skill boundaries (`commands/quality.md`, `skills/quality/SKILL.md`, `references/quality-spec.md`), but Quality persistence says `.pipeline/log.yaml` should use `type: quality` (`references/quality-spec.md:65`), while the log family list in `core/src/log/index.js:6` and `references/log-spec.md:22` does not define a quality family/type. | Align Quality command persistence with log schema and Recent feed behavior. |
| Test Quality | 3 | JS coverage is broad: 665 node:test subtests exercised by root `npm test`. Python tests are script-style: `pytest -q tests` reports `no tests ran`, and direct Notion probes fail because `tests/test_notion_integration.py:11` points at `/home/heyx/Hypo-Workflow/Notion-API.md`, which is absent. `python3 -m compileall -q dashboard scripts tests` passes. | Add pytest-compatible, fixture-only Notion tests and gate live-token tests separately. |
| Complexity | 3 | Largest modules remain large: `core/src/deep-plan/index.js` is 1812 lines, `core/src/config/index.js` 1658, `core/src/docs/index.js` 1503, `core/src/opencode-status/index.js` 1186, `core/src/sync/index.js` 1113. This is manageable but increases review cost. | Decompose only around active change pressure; avoid broad refactor without `/hw:plan`. |
| Observability/Operability | 3 | Lifecycle logging, progress, reports, and release records are rich, but current log schema drift breaks the log evidence test. Release entries are useful but not accepted by validator. | Treat log validation as a release/quality gate and normalize release status vocabulary. |
| Documentation/Onboarding | 4 | README, command mappings, skill specs, and architecture/progress records are extensive. C18 docs define `/hw:audit`, `/hw:quality`, `/hw:optimize`, and integration sync as a non-user command workflow. | Update log spec and Quality docs together when schema changes. |
| Performance | 4 | No hot-path runtime regression surfaced in this review. Prior audit noted append/rewrite ledger patterns; no new evidence shows these are currently user-blocking. | Revisit append-only ledger changes only if log/project-event volume becomes material. |

## Overall
- Score: 3.25 / 5
- Gate: FAIL
- Core gate: PASS for minimum core thresholds (`Correctness=3`, `Maintainability=3`, `Structure/Organization=3`), but overall is below the Quality gate threshold of 4.

## Compare
- Baseline: `.pipeline/audits/audit-001.md` from 2026-05-21 is the closest prior quality/risk snapshot, but it is an audit report rather than a `/hw:quality` baseline.
- Improved: root `npm test` exists; `js-yaml` is declared; workspace God Module has been split and related tests pass; shared utils exist.
- Regressed: current lifecycle log no longer validates after release records; Quality command persistence contract is not yet wired into log schema; Python Notion tests remain non-portable.

## Action Queue

| Action | Route | Priority | Validation |
|---|---|---|---|
| Align lifecycle log statuses and release records (`prepared`, `partially_published`) with validator/spec. | `/hw:patch` | high | `npm test`; focused `node --test core/test/log-evidence.test.js`; `git diff --check` |
| Add `quality` lifecycle family/type support or adjust Quality persistence contract to an existing family. | `/hw:patch` | high | focused tests for `references/quality-spec.md`, `references/log-spec.md`, `core/src/log/index.js`; `npm test` |
| Convert Notion script tests to pytest-compatible fixture tests and gate live token tests behind an explicit env/config flag. | `/hw:plan` | medium | `pytest -q tests`; `python3 -m compileall -q dashboard scripts tests` |
| Replace `new String()` in notification stdin payload with an explicit plain object/string evidence model. | `/hw:patch` | medium | focused notification tests; `npm test` |
| Continue migrating duplicated local helpers to `core/src/utils/index.js` where behavior matches exactly. | `/hw:optimize` | low | focused module tests plus `npm test` |

## Escalations
- Audit escalations: none found in this quality pass. The current failures are quality/schema/testability issues, not new Critical security or data-loss findings.
- Optimize candidates: helper duplication cleanup; large module decomposition where tied to active changes.
- Patch candidates: log schema/status drift; Quality log type support; notification stdin wrapper.
- Plan candidates: portable Python/Notion test strategy.

## Validation Results
- `npm test`: failed, `664/665` passing. Failure: `core/test/log-evidence.test.js:16`, unsupported statuses `partially_published` and `prepared`.
- `pytest -q tests`: failed, no tests collected.
- `python3 tests/test_notion_source_adapter.py`: failed, missing `/home/heyx/Hypo-Workflow/Notion-API.md`.
- `python3 tests/test_notion_output_adapter.py`: failed, missing `/home/heyx/Hypo-Workflow/Notion-API.md`.
- `python3 tests/test_notion_mixed_mode.py`: failed, `notion.token_file is not readable`.
- `python3 -m compileall -q dashboard scripts tests`: passed.
- `bash scripts/validate-config.sh`: passed.
- `git diff --check`: passed.

## Completion Narrative
- Change Summary: Generated the first persisted `/hw:quality` scorecard for the current project and identified quality gate failure.
- Technical Approach: Combined command/spec inspection, prior audit comparison, test execution, static source evidence, and lifecycle log validation evidence.
- Modified Files / Modules: `.pipeline/quality/quality-001.md`, `.pipeline/quality/actions.yaml`, `.pipeline/quality/state.yaml`.
- Test Design: Use existing root JS regression suite, Python test entry checks, config validation, whitespace validation, and direct source/spec evidence.
- Validation Results: See the Validation Results section above.
- Expected Result: The project now has a durable quality baseline-like scorecard and an actionable queue for Patch/Plan/Optimize routing.
- Problems Encountered: Root `npm test` is not green because lifecycle log records drifted beyond validator status vocabulary; Python tests are not pytest-collectable and depend on an absent local token file.
- Risks / Follow-Up: Fix log schema drift before treating release/runtime evidence as fully healthy; make Notion tests portable before relying on Python adapter coverage.
