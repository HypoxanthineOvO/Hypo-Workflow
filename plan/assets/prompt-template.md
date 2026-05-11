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
- Carry forward the P1 audit contract: real test method, pseudo-test rejection, rejection scope, blocked approval, and audit evidence.

## Human QA

- List any manual review expectations that remain after automated checks.
- Name the independent validation owner when implementation and validation should be separated.

## Prompt File Contract

- Each milestone must have one canonical prompt file that carries the milestone contract, acceptance shape, and subworker assignment intent.
- The canonical prompt is the milestone's release artifact by default; it is always generated even when no delegation happens.
- Subworker prompts are derived execution artifacts, not a second canonical milestone set.
- Default milestone output should stay compact: one milestone, one canonical prompt, and only create subworker prompt files when the work is actually delegated.
- When subworker prompts are needed, generate them after the canonical prompt as derived files under `.pipeline/prompts/derived/Mxx/` for the assigned worker roles.
- If the milestone stays single-agent or has no explicit delegation decision, do not create derived worker prompts at all.

## Subworker Assignment Plan

- `test`
  - Scope: owns `write_tests` and `review_tests`; independently designs or edits red tests, validates the real test method, checks failure evidence, final test run, and pseudo-test rejection rule.
  - Expected evidence: red/green test output, boundary coverage, and changed test paths.
  - Non-overlap: no implementation edits, no audit verdicts.
- `implement`
  - Scope: owns scoped implementation edits for this milestone.
  - Expected evidence: changed file list, concise change summary, and validation-ready diff.
  - Non-overlap: no tests, no audit outputs, no role impersonation.
- `audit`
  - Scope: reviews final diff, evidence quality, worker identity separation, acceptance risks, and whether the milestone contract is actually executable.
  - Expected evidence: pass/fail judgment, specific blockers, and any required rework scope.
  - Non-overlap: read-only review only.
- Record input context, output artifact path, allowed scope, and non-overlap rule for each role.
- Derived prompt release rule: only emit derived role prompts when the canonical prompt has an explicit delegation decision; otherwise keep the canonical prompt as the only milestone artifact.
- Declare write scope in every spawned worker prompt:
  - spawned workers may edit only `.pipeline/` files and explicitly scoped root-level non-project documentation such as `README.md`, `CHANGELOG.md`, and `PROJECT-SUMMARY.md`.
  - spawned workers must not edit project source, tests, fixtures, runtime code, package manifests, generated adapters, rules, skills, templates, or config outside `.pipeline/` unless the user grants a separate explicit local-execution scope outside the spawned worker contract.
  - `audit`: read-only; no file edits.
- If a worker needs an out-of-scope file, it must stop and report the requested path and owning role. Workers must not revert or overwrite another worker's changes unless explicitly authorized in their prompt scope.
- The main agent orchestrates only; it must not write red tests or implementation locally before the `test` and `implement` workers are authorized or assigned, and it must not satisfy any of the three worker roles itself.
- On Codex without `/hw:start` and `/hw:resume` execution subworker authorization, keep the canonical prompt with `status: blocked_until_authorized` and require start/resume authorization before role-sensitive work.
- Do not require four always-present role files for every milestone. Keep the canonical prompt compact and defer role-specific expansion until delegation actually happens.

## Rework Prompt

- A rework prompt must reference the original prompt or source prompt with `original_prompt_ref` / `prompt_ref`.
- A rework prompt must use rejection-driven scope from the rejection artifact, `required_rework`, and findings.
- Keep the rework prompt incremental: only the delta scope required by rejection findings or feedback is in scope.

## 预期产出

- List the files or artifacts expected from this milestone.
- Mention reports, architecture notes, or follow-up review hooks when needed.
