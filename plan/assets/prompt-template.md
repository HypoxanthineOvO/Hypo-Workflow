# Prompt Template

## Objective

- State the runnable vertical slice or outcome this milestone must deliver.

## 需求

- Describe the milestone goal in concrete terms.
- Keep scope limited to one milestone.

## Boundaries

- List the implementation layers or files in scope.
- Keep the slice narrow enough to validate in one milestone.

## Non-Goals

- List tempting follow-up work that must stay out of this milestone.

## 预期测试

- List observable validation points.
- Describe the closed-loop validation path, not just the code area being touched.
- Include boundary or failure coverage when relevant.
- Call out compatibility checks if the project already exists.

## Validation Commands

- List exact local commands expected to prove the slice works.
- Include the executable scenario that closes the loop when validation is not a single command.
- Include non-automated validation only when automation is not practical.

## Evidence

- Describe the pass/fail output, report, screenshot, metric delta, or before/after observation that must be recorded.
- Make the evidence specific enough that a different validator can challenge the result.

## Human QA

- List any manual review expectations that remain after automated checks.
- Name the independent validation owner when implementation and validation should be separated.

## Subworker Assignment Plan

- `test`: owns `write_tests` and `review_tests`; independently designs or edits red tests, validates the real test method, checks failure evidence, final test run, and pseudo-test rejection rule.
- `implement`: owns scoped implementation edits for this milestone.
- `audit`: reviews final diff, evidence quality, worker identity separation, and acceptance risks.
- Record input context, output artifact path, allowed scope, and non-overlap rule for each role.
- Declare write scope in every spawned worker prompt:
  - spawned workers may edit only `.pipeline/` files and explicitly scoped root-level non-project documentation such as `README.md`, `CHANGELOG.md`, and `PROJECT-SUMMARY.md`.
  - spawned workers must not edit project source, tests, fixtures, runtime code, package manifests, generated adapters, rules, skills, templates, or config outside `.pipeline/` unless the user grants a separate explicit local-execution scope outside the spawned worker contract.
  - `audit`: read-only; no file edits.
- If a worker needs an out-of-scope file, it must stop and report the requested path and owning role. Workers must not revert or overwrite another worker's changes unless explicitly authorized in their prompt scope.
- The main agent orchestrates only; it must not write red tests or implementation locally before the `test` and `implement` workers are authorized or assigned, and it must not satisfy any of the three worker roles itself.
- On Codex without `/hw:start` and `/hw:resume` execution subworker authorization, keep this plan with `status: blocked_until_authorized` and require start/resume authorization before role-sensitive work.

## 预期产出

- List the files or artifacts expected from this milestone.
- Mention reports, architecture notes, or follow-up review hooks when needed.
