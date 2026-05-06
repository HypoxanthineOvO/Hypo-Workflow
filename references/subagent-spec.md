# Subagent Spec

Use this reference when a step may delegate work to another agent runtime.

## Codex Preference

Codex should strongly prefer concrete Subagent delegation for substantial work when `execution.mode=subagent` and an eligible step override allows delegation. Codex Subagents are Codex/GPT runtime workers; do not treat Claude, DeepSeek, Mimo, or other external models as Codex Subagent routing choices.

Trivial one-file edits, pure inspection, or tasks where the Subagent tool is unavailable may stay local. Substantial local execution must leave a non-delegation rationale in the report, Patch file, or lifecycle log.

Documentation and README tasks should prefer docs-specific assistance when available.

## Implementation and Validation Separation

Implementation and validation separation is mandatory for non-trivial delegated work:

- use an implementation Subagent only for scoped edits or concrete production work
- use a separate test/review Subagent for test design, failure evidence, final diff review, or assumption challenge
- use separate worker identities or sessions for implementation and validation; the same Subagent instance must not author and certify the same change
- an implementation Subagent must not be the sole validator of its own changes
- non-trivial testable delivery should plan at least two workers when tooling allows: one implementation worker and one validation worker
- if only one delegated worker is available, the main agent must personally run the adversarial validation pass and record that limitation explicitly
- validation must try to falsify the change with closed-loop evidence such as a real command, scenario replay, before/after output, screenshot, metric delta, or failure fixture
- the main agent remains responsible for integration, state/log/report updates, and final judgment
- use a lightweight proposer/challenger pass for contract, runtime-gate, adapter, or onboarding changes

## Mode Switch

- `execution.mode=self`
  Always execute locally in the main agent.
- `execution.mode=subagent`
  Allow per-step delegation based on normalized step overrides.

Override precedence:

1. top-level `step_overrides.<step_name>`
2. legacy `execution.step_overrides.<step_name>`
3. global defaults from `~/.hypo-workflow/config.yaml`
4. preset defaults

## Tool Selection

Effective `subagent_tool` resolution:

1. step override `subagent_tool`
2. step override `subagent`
3. `execution.subagent_tool`
4. global `subagent.provider`
5. default `auto`

`auto` means:

- Claude Code + `.claude/agents/` exists -> Claude subagent path
- Codex CLI + `codex exec` available -> Codex path
- otherwise -> fallback to self

Explicit modes:

- `claude`
  Prefer Claude subagent definitions or `claude -p`. This is a Claude/cross-tool path, not Codex Subagent external model selection.
- `codex`
  Prefer `codex exec`

## Prompt Assembly

Step override executor fields:

- prefer `executor` when present
- otherwise accept legacy `reviewer`
- `executor=subagent` and `reviewer=subagent` both delegate the step
- when both fields appear, `executor` wins

Mixed-mode examples may use `subagent: codex` or `subagent: claude`; normalize that alias to `subagent_tool`.

Subagent prompts should include:

- the current prompt `需求`
- the relevant `预期测试` or `预期产出`
- changed code or a focused diff
- relevant test files
- the exact JSON response shape expected for the step

Template map:

- `review_tests` -> `templates/subagent/review-tests.md`
- `review_code` -> `templates/subagent/review-code.md`
- any broader delegated execution -> `templates/subagent/full-delegation.md`

## Result Handling

When delegation succeeds:

- parse the JSON payload
- persist `executor=subagent`
- persist the actual `subagent_tool`
- store the parsed payload in `subagent_result`
- copy key values such as `verdict`, `issues`, `code_quality`, or `diff_score` into step notes or prompt scores

When parsing fails:

- treat it as delegation failure
- fall back to self execution for the same step

## Fallback Policy

Delegation failure alone must not block the pipeline.

Required fallback behavior:

1. switch the effective executor to `self`
2. run the same step locally
3. add `subagent_fallback=true` to the log entry
4. add a machine-readable `reason`
5. note the fallback in `steps[].notes`

Recommended fallback reason values:

- `tool_unavailable`
- `exec_nonzero`
- `json_parse_failed`
- `template_missing`
- `platform_unsupported`

## Log Format

Preferred note fragments for delegated steps:

- success:
  `executor=subagent tool=codex verdict=pass`
- fallback:
  `executor=self subagent_fallback=true reason=tool_unavailable`

Keep the reason concise. Avoid dumping full stderr into state or reports.
