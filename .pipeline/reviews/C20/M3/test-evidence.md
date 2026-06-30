# C20-M3 Test Evidence

## Scope

- Worker: `test`
- Prompt: `.pipeline/prompts/02-source-regression-and-managed-artifact-closure.md`
- Allowed write: `.pipeline/reviews/C20/M3/test-evidence.md`
- Source/test/generated/docs changes: none by this worker.
- Note: the parent directory `.pipeline/reviews/C20/M3/` did not exist and was created only to place this evidence file.

## Commands And Results

### Context and prompt load

Commands:

```bash
sed -n '1,240p' .pipeline/state.yaml
sed -n '1,260p' .pipeline/prompts/02-source-regression-and-managed-artifact-closure.md
git status --short
```

Result:

- Current Workflow state is running prompt index `2`, prompt file `.pipeline/prompts/02-source-regression-and-managed-artifact-closure.md`, step `write_tests`.
- The prompt requires focused C20/artifact tests, full `npm test`, `git diff --check`, managed artifact freshness verification, stale wording classification, and evidence under this file.
- Worktree was already heavily dirty before this worker wrote evidence, including source, tests, docs, managed OpenCode artifacts, pipeline state/log/progress, and untracked C20 files. This worker did not revert or normalize those changes.

### Managed artifact freshness scan

Command:

```bash
rg -n "Consultation-First Action Boundary|consultation[- ]first|协商优先|Mini-contract|我的理解|问题原因|推荐方案|Clear imperative|direct execution|Direct sync scope|Target-owned scope|Post-plan affirmative" AGENTS.md .opencode/commands/hw:plan.md .opencode/agents/hw-plan.md .claude/agents/hw-test.md .claude/agents/hw-plan.md commands/plan.md plugins/opencode/templates/AGENTS.md
```

Result:

- Exit code `1`; no matches in the current checked-in/generated managed surfaces scanned.
- This means the current working-tree versions of `AGENTS.md`, `.opencode/commands/hw:plan.md`, `.opencode/agents/hw-plan.md`, Claude agent/command surfaces checked above, and `plugins/opencode/templates/AGENTS.md` do not yet contain the C20 consultation-first / Mini-contract guidance anchors.
- Adjacent scan did find the source guidance in `references/consultation-first-action-boundary.md` and `core/src/artifacts/agent-guidance.js`.
- Focused tests below prove the artifact generators can project the C20 guidance into temporary OpenCode and Claude outputs, but the currently checked-in managed surfaces appear stale until regenerated/refreshed.

Additional observed surface state:

- `.opencode/commands/hw:plan.md` and `.opencode/agents/hw-plan.md` contain the C18/C19 visible phase artifact / in-phase Ask gate wording.
- `.claude/agents/hw-plan.md` contains general Ask Questions Discipline, but not the C20 Consultation-First Action Boundary anchors.
- `AGENTS.md` contains required decision/report/state guidance, but not the C20 Mini-contract anchors.

Classification:

- Blocker: current managed source artifacts are not fresh for C20 guidance.
- Non-blocker: source contract and generator-level shared guidance are present; the failure is artifact freshness, not missing source guidance.

### Focused tests

Command:

```bash
node --test core/test/c20-consultation-boundary.test.js core/test/commands-rules-artifacts.test.js core/test/c18-instruction-quality-contract.test.js
```

Result:

- Pass.
- TAP summary: `tests 23`, `pass 23`, `fail 0`, duration about `474ms`.
- Covered signals include:
  - C20 contract treats discussion/background/idea/complaint/question/solution-discussion as non-editing signals.
  - Mini-contract order is `我的理解 -> 问题原因 -> 推荐方案`.
  - Clear imperative requests with concrete targets preserve direct execution.
  - Post-plan affirmative replies authorize execution within shown scope.
  - Direct sync scope remains separated from target-owned scope for `Codex-VSP` and `VSP-Open-Code`.
  - Generated OpenCode command/agent/root surfaces project consultation-first guidance.
  - Generated Claude command/agent surfaces project consultation-first guidance.
  - Plan confirm remains removed from user-facing command maps.
  - C18 visible phase artifact / report-surface contracts remain covered.

### Full regression

Command:

```bash
npm test
```

Result:

- Failed.
- TAP summary: `tests 686`, `pass 685`, `fail 1`, duration about `4114ms`.
- Failure isolated by rerun filter:

```bash
npm test 2>&1 | rg -C 12 "not ok|ERR_|AssertionError|failureType|error:"
```

Failure:

```text
not ok 398 - current lifecycle log validates real event families and statuses
location: /home/heyx/Hypo-Workflow/core/test/log-evidence.test.js:16:1
failureType: testCodeFailure
error:
  entries[37].status unsupported: ready_for_visible_gate
  entries[38].type unsupported: gate_feedback
  entries[38].status unsupported: needs_prompt_source_before_vsp_opencode_write
  entries[39].type unsupported: gate_feedback
  entries[39].status unsupported: needs_plan_visible_summary
```

Evidence:

- The unsupported entries are present in `.pipeline/log.yaml` around lines `542`, `555`, `557`, `568`, and `570`.
- This appears to be lifecycle log schema/status drift, not a focused C20 consultation boundary failure.

Classification:

- Blocker for M3 source closure because the prompt requires full `npm test` before closure.

### Whitespace check

Command:

```bash
git diff --check
```

Result:

- Pass.
- Exit code `0`; no whitespace errors reported.

## Stale Wording Scan

### Ask-before-everything risk

Command:

```bash
rg -n "ask before every|ask-before-everything|always ask|must ask before|ask first before" --glob '!node_modules/**' --glob '!tmp/**' --glob '!**/.git/**'
```

Result:

- Exit code `1`; no exact ask-before-everything risk matches.

Classification:

- Non-blocker: no broad "always ask before anything" wording found by the targeted scan.

### Qualified Ask wording

Observed match:

- `.opencode/commands/hw:plan.md` says to use `question` / Ask for every hard interactive gate unless automation is explicitly configured, and says confirmation is an in-phase Ask gate, not a standalone command.

Classification:

- Non-blocker: this is scoped to hard interactive gates and is compatible with C18/C19 visible gate behavior. It is not an ask-before-everything rule.

### `/hw:plan:confirm` and plan confirm remnants

Command:

```bash
rg -n "/hw:plan:confirm|plan confirm|Confirm \\(P4\\)|P1-P4|P4" docs docs/en references skills plan commands .opencode .claude README.md README.en.md SKILL.md core/test/fixtures --glob '!docs/showcase/**'
```

Important matches:

- `skills/plan-confirm/SKILL.md`: compatibility note only; says new Plan command surface no longer exposes `/hw:plan:confirm`.
- `skills/plan/SKILL.md`: negative rule; says Generate completion confirmation must be an in-phase Question Tool / Ask gate and must not require `/hw:plan:confirm`.
- `core/test/commands-rules-artifacts.test.js` and `core/test/docs-governance.test.js`: regression assertions that `/hw:plan:confirm` is absent.

Classification:

- Non-blocker: remaining plan-confirm references are compatibility notes or negative regression assertions, not user-facing stale command exposure.

### P1/P2/P3/P4 remnants

Commands:

```bash
rg -l "ask before every|ask-before-everything|always ask|must ask before|ask first before|ask for every|/hw:plan:confirm|plan confirm|P1-P4|Confirm \\(P4\\)|P4|P1|P2|P3" --glob '!node_modules/**' --glob '!tmp/**' --glob '!**/.git/**'
rg -n "P1-P4|Confirm \\(P4\\)|P4" docs/showcase docs/en/release docs/release --glob '!node_modules/**'
```

Observed categories:

- Historical release/changelog mentions: `CHANGELOG.md`, `docs/release/v12.4.0.md`, `docs/en/release/v12.4.0.md`, `docs/release/v12.7.0.md`, `docs/en/release/v12.7.0.md`, `docs/release/v12.8.0.md`, `docs/en/release/v12.8.0.md`.
- Compatibility/contract mentions: `plan/PLAN-SKILL.md`, `references/commands-spec.md`, `skills/plan-decompose/SKILL.md`, `skills/plan/SKILL.md`.
- Test fixtures and assertions: `core/test/p2-technical-route-contract.test.js`, `core/test/fixtures/p2-technical-route/*`, `core/test/fixtures/audit-regression-canonical-examples/missing-audit-planning-question-failure.md`, `core/test/deep-plan-*`.
- Showcase docs with old P1-P4/P4 wording: `docs/showcase/v4-report/report.tex`, `docs/showcase/v4-report/slides.tex`, `docs/showcase/c2-report/report.tex`.

Classification:

- Non-blocker for source closure: most hits are historical release notes, compatibility aliases, or regression fixtures.
- Watch item: showcase docs still describe `P1-P4` and `Confirm (P4)`. They are not managed instruction surfaces and were not in this worker's write scope, but they are visibly stale if showcase docs are intended to represent current Plan semantics.

## Risks And Blockers

Blockers:

1. Current managed source artifacts scanned do not contain C20 consultation-first / Mini-contract guidance, even though source guidance and generator tests are present. Managed artifact refresh is still required before source closure.
2. Full `npm test` fails because `.pipeline/log.yaml` contains lifecycle event type/status values not accepted by `validateLifecycleLog`: `ready_for_visible_gate`, `gate_feedback`, `needs_prompt_source_before_vsp_opencode_write`, and `needs_plan_visible_summary`.

Non-blockers:

- Focused C20/C18/artifact tests pass.
- `git diff --check` passes.
- No exact ask-before-everything wording was found.
- Remaining `/hw:plan:confirm` references are compatibility/negative-test references.
- P1/P2/P3/P4 references in release notes, fixtures, and compatibility contracts appear historical or intentional.

Follow-up required:

- Run the established managed artifact refresh path so checked-in `AGENTS.md`, OpenCode command/agent surfaces, and Claude surfaces receive `CONSULTATION_FIRST_ACTION_BOUNDARY_GUIDANCE`.
- Re-run the C20 focused command, full `npm test`, and `git diff --check` after artifact refresh and lifecycle log schema/status drift are resolved.
