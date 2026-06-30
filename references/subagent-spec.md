# Subagent Spec

Use this reference when a step may delegate work to another agent runtime.

## Codex Preference

Codex should strongly prefer concrete Subagent delegation for substantial work when `execution.mode=subagent` and an eligible step override allows delegation. Codex Subagents are Codex/GPT runtime workers; do not treat Claude, DeepSeek, Mimo, or other external models as Codex Subagent routing choices.

Trivial one-file edits, pure inspection, or tasks where the Subagent tool is unavailable may stay local. Substantial local execution must leave a non-delegation rationale in the report, Patch file, or lifecycle log.

Documentation and README tasks should prefer docs-specific assistance when available.

## Implementation and Validation Separation

`P0 Configure` asks for Subagent authorization before Discover. If the user does not authorize delegated workers, substantial work may stay local but must record a non-delegation rationale. If the user authorizes Subagents, the execution plan should record whether implement/test/audit role separation is `off`, `recommended`, or `strict`.

Implementation and validation separation is mandatory for non-trivial delegated work:

- use an implementation Subagent only for scoped edits or concrete production work
- use a separate test/review Subagent for test design, failure evidence, final diff review, or assumption challenge
- use separate worker identities or sessions for implementation and validation; the same Subagent instance must not author and certify the same change
- an implementation Subagent must not be the sole validator of its own changes
- an implementation Subagent must not read test source, test files, fixtures, snapshots, or assertion details; it may receive requirements, public interfaces, allowed edit scope, the test command, pass/fail status, and a sanitized failure summary
- test/review/audit Subagent roles may read test source and the final diff when their role is explicitly validation-oriented, but they must not be the same worker identity that authored the production change
- non-trivial testable delivery should plan at least two workers when tooling allows: one implementation worker and one validation worker
- if only one delegated worker is available and worker separation is `off`, the main agent must personally run the adversarial validation pass and record that limitation explicitly; this fallback does not apply when `execution.worker_separation.mode` is `recommended` or `strict`
- if `recommended` or `strict` cannot preserve implementation/test-source isolation, stop before role-sensitive execution or acceptance; retry, defer, stop, or request explicit user-confirmed downgrade to `off` instead of counting the run as worker-separated
- degraded mode requires explicit user confirmation before continuing when worker-separated evidence is required
- record any role isolation degradation explicitly before continuing or accepting the work
- degraded or downgraded mode must record missing roles, collisions, degraded boundaries, user decision, degraded reason, role evidence, and validation owner in the report, log, or state notes
- validation must try to falsify the change with closed-loop evidence such as a real command, scenario replay, before/after output, screenshot, metric delta, or failure fixture
- the main agent remains responsible for integration, state/log/report updates, and final judgment
- use a lightweight proposer/challenger pass for contract, runtime-gate, adapter, or onboarding changes

## Authorization Before Role-Sensitive Work

In hosts such as Codex, higher-priority runtime instructions may forbid automatic Subagent creation unless the user explicitly asks for sub-agents, delegation, or parallel agent work. Hypo-Workflow must not treat a command name by itself as permission to spawn.

Before role-sensitive work starts, resolve whether the independent worker is authorized:

1. If the user explicitly authorized Subagents/delegation for this command, proceed and record the worker identity.
2. If authorization is absent but the command requires independent worker evidence, Ask the user for authorization or stop with a clear blocking reason.
3. If the user declines or the worker is unavailable, continue only in a documented degraded mode that cannot satisfy worker-separation gates, or leave the Patch/Milestone/Review pending.

Codex plan-time authorization can carry into execution only when its saved scope explicitly includes `/hw:start` and `/hw:resume`. `/hw:plan` Discover must ask for execution subworker authorization before Decompose whenever that saved scope is missing, even if `execution.worker_separation.mode` already says `recommended` or `strict`. If Plan collected only planning reviewer/challenger authorization, Start and Resume must Ask again. If the user declines execution subworkers during Plan, generated artifacts must either block Start/Resume until authorization is granted or set the fastest single-agent `execution.worker_separation.mode=off` only after explicit user downgrade confirmation; they must not default to `recommended` or silently downgrade to `off`.

Claude Code and OpenCode do not use this extra authorization gate for configured subworkers. Claude Code planning should choose whether execution subworkers use `subcodex` or `subclaude`; OpenCode should use configured native agents/subagents.

Planning artifacts should pre-assign worker-separated execution tasks. Generated prompts must include a `Subworker Assignment Plan` for exactly three worker roles: `test`, `implement`, and `audit`, including scope, expected evidence, non-overlap rules, and artifact paths. `write_tests` and `review_tests` belong to the `test` worker role whenever worker separation is `recommended` or `strict`; implementation edits belong to the `implement` worker role; final evidence/diff review belongs to the `audit` worker role. The main agent orchestrates but must not write red tests or implementation locally before the independent test and implementation workers are authorized or assigned. On Codex, lack of execution subworker authorization marks this assignment `blocked_until_authorized`; it does not justify removing the assignment from the prompt. Missing Codex authorization must not remove the `test` / `implement` / `audit` role plan.

Every spawned worker prompt must declare its role and write scope before work starts. Default spawned-worker write scope is intentionally narrow, but role-specific prompts may grant explicit project paths when the role requires them:

- default spawned workers may write only `.pipeline/` files and root-level non-project documentation such as `README.md`, `CHANGELOG.md`, and `PROJECT-SUMMARY.md` when that documentation path is explicitly included in the prompt scope.
- role-specific explicit scope may authorize the `test` worker to write named test, fixture, snapshot, or assertion paths, and may authorize the `implement` worker to write named production/runtime/documentation paths.
- spawned workers must not edit project source, tests, fixtures, runtime code, package manifests, generated adapters, rules, skills, templates, or config outside `.pipeline/` unless that exact path is included in the role-specific explicit scope.
- `test` worker: owns failure reproduction, red-test design, validation commands, fixtures, snapshots, assertions, and test evidence. When worker separation is enabled, tests must be authored or approved by this role before implementation begins.
- `implement` worker: owns production/runtime/documentation implementation only. It must not create, edit, or rewrite tests, fixtures, snapshots, assertions, or validation evidence, and it must not spawn or impersonate `test` or `audit` workers.
- `audit` worker: read-only. It must not modify any file, including `.pipeline/`, documentation, reports, tests, production code, or generated artifacts; it returns findings and evidence pointers only.
- if a worker needs a file outside its declared scope, it must stop and report the requested path, reason, and owning role instead of editing locally.
- a spawned worker must not revert, overwrite, or "clean up" another worker's changes unless that exact action is explicitly included in its declared write scope and confirmed by the orchestrating main agent.

The main agent must not implement, write tests, review tests, debug, audit, or plan locally first and then report that the independent worker was missing. That reverses the gate and invalidates the evidence.

## Worker Lifecycle

The main agent owns worker lifecycle orchestration for `/hw:plan`, `/hw:start`, `/hw:resume`, `/hw:debug`, `/hw:patch fix`, and any command that creates role-sensitive workers.

For each required worker role, record the lifecycle in the relevant prompt report, Patch file, review artifact, or `.pipeline/log.yaml`:

- `requested`: role, scope, write permissions, expected evidence, and authorization source
- `started`: worker id/session id and start time
- `completed`, `failed`, or `blocked`: verdict, evidence path, and reason
- `closed` or `close_failed`: release/close outcome after the worker is no longer needed

Lifecycle rules:

- create workers only after authorization and scope are resolved
- do not leave obsolete workers running after their result is consumed
- wait for the worker whose evidence gates the next step before moving past that gate
- close/release workers once their result has been integrated or once the command stops, blocks, aborts, or completes
- if a worker cannot be closed, record `close_failed` with the worker id and reason; unresolved lifecycle state cannot satisfy acceptance or Patch auto-close evidence
- never reuse a still-open worker for another role unless the original prompt explicitly allowed that role and worker separation mode permits it
- command summaries must distinguish `completed`, `blocked`, `failed`, and `close_failed`; "spawned" alone is not evidence

## Mode Switch

- `execution.mode=self`
  Execute locally in the main agent only when `execution.worker_separation.mode=off`; `recommended` and `strict` worker-separation gates override `self` for role-sensitive `test`, `implement`, and `audit` work.
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

Subagent prompts must be assembled with a two-layer injection contract. The main agent owns both layers and must not let task-specific text weaken the host/orchestrator envelope.

Layer 1 host/orchestrator envelope fields are mandatory for every spawned worker prompt:

- `compact_rules_summary`: concise active rule summary, including write-scope boundaries, role separation requirements, lifecycle expectations, and any protected files
- `authorization_state`: whether Subagent work is authorized, who/what granted it, scope, worker identity/session if known, and any degraded or pending authorization state
- `role_boundary`: exact role name, allowed reads, allowed writes, forbidden reads/writes, non-overlap rules, and whether the worker is `test`, `implement`, `audit`, `review`, or read-only
- `out_of_scope_stop_rule`: instruction to stop instead of editing, reading, spawning, validating, or deciding outside the declared role/scope; the worker must report the requested action/path, reason, and owning role

Layer 2 task injection fields are mandatory for the concrete delegated task:

- `user_requested_checks`: explicit checks requested by the user or current command, including any negative constraints and required confirmations
- `milestone_audit_fields`: milestone, Patch, or prompt-specific audit fields the worker must evaluate or populate, such as role evidence, changed files, risks, degraded mode, and validation owner
- `evidence_required`: concrete evidence the worker must return, such as commands, reviewed refs, focused diff notes, before/after output, screenshots, metrics, or sanitized failure summaries
- `expected_output_artifact`: exact output artifact and schema, including JSON response shape, report path, review packet, or notes field where the main agent will persist the result

Subagent prompts should also include:

- the current prompt `需求`
- the relevant `预期测试` or `预期产出`
- changed code or a focused diff
- relevant test files when the role is explicitly test/review/audit and allowed to read them
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

Codex internal subcodex/subtask events are not enough by themselves. They are runtime observations unless the Hypo-Workflow step record explicitly persists `executor=subagent` plus the parsed `subagent_result`. Status adapters may display active subtask model data, but acceptance worker evidence must ignore runtime-only subtask metadata.

When parsing fails:

- treat it as delegation failure
- for non-gated steps, fall back to self execution for the same step
- for role-sensitive worker-separation steps, do not run the same step locally; choose `retry`, `stop`, or `deferred`, or obtain explicit user-confirmed downgrade to `execution.worker_separation.mode=off` before any local edit

## Fallback Policy

Delegation failure alone must not block the pipeline for non-gated work.

This fallback rule does not override worker-separation acceptance gates. On Codex, when `execution.worker_separation.mode` is `recommended` or `strict` and execution subworker authorization is missing, declined, or a required worker fails, `/hw:start` and `/hw:resume` must block before role-sensitive work unless the plan explicitly selected the user-confirmed fastest single-agent `off` lane. For `write_tests`, `review_tests`, `implement`, and required audit/review work, delegation failure must stop, retry, or defer; the main agent must not run the same step locally as fallback. A local fallback may be logged only for non-gated work or after an explicit user-confirmed downgrade to `off`, and it cannot satisfy required implement/test/audit separation evidence.

Required fallback behavior for non-gated work:

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
