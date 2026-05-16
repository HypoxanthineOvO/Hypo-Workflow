# C15-M1 Audit Report

Worker: `audit`
Scope: read-only audit of C15-M1 P2 Technical Route Gate final diff and evidence.

## Findings

### Critical: new focused test depends on ignored, untracked runtime artifacts

`core/test/p2-technical-route-contract.test.js` reads `.plan-state/decompose.yaml`, `.plan-state/technical-route.md`, `.plan-state/generate.yaml`, and prompt files referenced by that runtime state (`core/test/p2-technical-route-contract.test.js:23`, `core/test/p2-technical-route-contract.test.js:69`, `core/test/p2-technical-route-contract.test.js:106`, `core/test/p2-technical-route-contract.test.js:126`).

Those files are not tracked fixtures. `.plan-state/` is ignored by `.gitignore:7`, `git ls-files .plan-state/decompose.yaml .plan-state/generate.yaml .plan-state/technical-route.md` returns no tracked files, and the current `.pipeline/prompts/00-p2-technical-route-gate.md` family is untracked in `git status --short`.

Impact: the test can pass in this dirty workspace but fail in a clean checkout/CI with `ENOENT`, or pass/fail based on unrelated local planning state rather than the committed C15-M1 contract. This makes the test evidence insufficient as portable gate evidence for P2/P3 route preservation.

Expected fix: move the required P2/P3 route examples into tracked test fixtures, generate them inside a temporary test directory, or rewrite the test to assert only tracked source/spec artifacts.

## Passed Audit Checks

- P2 required fields are documented across the plan surfaces: `technical_solution`, `technical_route`, `research_required`, `risks_and_alternatives`, `validation_path`, and `audit_focus` appear in `skills/plan/SKILL.md:91`, `skills/plan-decompose/SKILL.md:33`, `plan/PLAN-SKILL.md:181`, and `references/commands-spec.md:504`.
- Goal-only P2 checkpoints are rejected from `proposed`/P3 in the contract text: `skills/plan/SKILL.md:91`, `skills/plan-decompose/SKILL.md:53`, `skills/plan-decompose/SKILL.md:100`, `plan/PLAN-SKILL.md:203`, and `references/commands-spec.md:505`.
- Hard research triggers are documented and user-gated: unknown tools, external services, third-party libraries, platform capabilities, and user-private schemas are listed in `skills/plan-decompose/SKILL.md:55`, with allowed states `resolved`, `blocking_question`, and `deferred_by_user` in `skills/plan-decompose/SKILL.md:63`; matching command-spec language appears at `references/commands-spec.md:506`.
- User challenge behavior returns P2 to `revision`/`in_progress` and requires targeted research before Generate in `skills/plan/SKILL.md:104`, `skills/plan-decompose/SKILL.md:69`, `plan/PLAN-SKILL.md:205`, and `references/commands-spec.md:508`.
- P3 preservation and stop behavior are documented in `skills/plan-generate/SKILL.md:21`, `skills/plan-generate/SKILL.md:37`, `skills/plan-generate/SKILL.md:56`, `plan/PLAN-SKILL.md:257`, and `references/commands-spec.md:527`.
- Ordinary single-feature planning remains simple, and Feature DAG semantics are limited to batch planning in `skills/plan/SKILL.md:87`, `skills/plan-decompose/SKILL.md:119`, `plan/PLAN-SKILL.md:214`, and `references/commands-spec.md:429`.
- Worker scope separation is mostly respected: implementation evidence says only guidance/spec files were edited (`.pipeline/reviews/C15/M1/implementation-evidence.md:7`), while test evidence owns the test files and records focused commands (`.pipeline/reviews/C15/M1/test-evidence.md:7`, `.pipeline/reviews/C15/M1/test-evidence.md:17`).

## Residual Risks

- The implementation is contract/spec level. No runtime JS state-machine enforcement was added; this appears consistent with the scoped files, but it means actual enforcement depends on agents following the skill/spec text.
- The tests are content/regex assertions, not a full interactive simulation of a user challenge or P3 stop path; the test worker also records this gap in `.pipeline/reviews/C15/M1/test-evidence.md:43`.
