---
name: hypo-workflow-plan
version: 8.3.0
description: Plan Mode sub-skill for Hypo-Workflow. Use this file when the user invokes `/hw:plan`, `/hw:plan:*`, `/hw:plan:review`, or the compatibility alias `/hw:review`.
---

# Plan Mode

Use this sub-skill when the user wants to design or revise a pipeline before implementation starts, or when a completed milestone requires plan review.

## Commands

| Command | Description |
|---------|-------------|
| `/hw:plan` | Enter the Discover-first planning flow |
| `/hw:plan:discover` | Collect requirements, constraints, stack, and current repo context |
| `/hw:plan:technical-stack` | Decide implementation substrate, existing stack fit, validation tooling, and integration mechanisms |
| `/hw:plan:architecture` | Read the architecture baseline, map components/integration points, and produce Mermaid/table architecture artifacts |
| `/hw:plan:decompose` | Split the work into milestones with test specs |
| `/hw:plan:generate` | Generate `.pipeline/` config, prompts, and architecture baseline |
| `/hw:plan:extend` | Append milestones to the active Cycle without closing it |
| `/hw:plan:review` | Review architecture and downstream prompt impact for the current milestone or all milestones with `--full` |

`/hw:plan --batch` is a mode flag on `/hw:plan`, not a separate command. It plans multiple Features into `.pipeline/feature-queue.yaml`.

If the user invokes `/hw:plan:xxx` and `xxx` is not recognized, return:

`Unknown command: /hw:plan:xxx. Available: /hw:plan, /hw:plan:deep, /hw:plan:discover, /hw:plan:technical-stack, /hw:plan:architecture, /hw:plan:decompose, /hw:plan:generate, /hw:plan:extend, /hw:plan:review`

## Progressive Disclosure

Load planning resources in layers:

1. this file as the planning L2 entry point
2. `plan/assets/` for shared plan-generation templates
3. `plan/templates/` for reusable scenario presets
4. `references/commands-spec.md` and `references/plan-review-spec.md` for detailed semantics

## Template Language

Resolve `output.language` before reading reusable planning or evaluation templates.

- `zh-CN` / `zh` -> prefer localized Chinese templates when present
- `en` / `en-US` -> prefer English templates
- missing localized template -> fall back to the existing root template

All user-facing planning prompts, status summaries, and generated PROGRESS/report prose must follow `output.language`; internal `state.yaml` and `log.yaml` keys remain English.

## Plan Modes

Read `plan.mode` from `.pipeline/config.yaml` when present. If it is missing, fall back to `~/.hypo-workflow/config.yaml` `plan.default_mode`, then `interactive`.

- `interactive` is the default:
  - Discover asks targeted questions in rounds
  - the user participates at checkpoints
  - every major phase must show its artifact before moving forward
  - confirmation is captured through in-phase Question Tool / Ask gates
  - read `plan.interaction_depth`:
    - `low` -> at least 2 question rounds
    - `medium` -> at least 3 question rounds
    - `high` -> at least 5 question rounds
  - `plan.interactive.min_rounds` can raise the floor
  - Discover may enter Decompose only after the user explicitly says「够了」「开始吧」「可以了」or an equivalent end signal
- `auto` is unattended:
  - Claude completes named Plan phases without pausing unless blocked by missing critical information
  - confirmation gates become summary checkpoints only when configuration explicitly allows unattended planning

## Batch Plan Mode

Use Batch Plan Mode when the user wants to plan several Features in one interaction.

Behavior:

- run one Discover interview for all Feature candidates
- produce a prioritized Feature Queue
- support `gate: confirm` per Feature
- resolve `batch.decompose_mode`:
  - `upfront`: decompose every Feature into Milestones before execution
  - `just_in_time`: defer Milestone decomposition until the Feature becomes current
- generate Markdown and Mermaid artifacts:
  - Feature Queue table
  - Feature dependency graph
  - Feature-level architecture impact map
- write planning state to `.plan-state/batch-discover.yaml` and `.plan-state/batch-decompose.yaml`
- write queue output to `.pipeline/feature-queue.yaml` only after confirmation

Mermaid output should use `graph TD` and include every Feature ID. Upfront mode should attach planned Milestones under each Feature node.

## Phase Skeleton

### Discover

- inspect the current repository when applicable
- capture goals, constraints, tech stack, and deliverables
- write or update `.pipeline/design-spec.md`
- persist intermediate state in `.plan-state/discover.yaml`

Discover should use a two-pass discussion shape:

1. global framing
   - task category
   - desired effect
   - verification method
   - real test method
   - pseudo-test rejection policy
   - target users
   - delivery artifact
   - constraints
2. focused drilling
   - assumption statement
   - ambiguity resolution
   - tradeoff review
   - validation criteria
   - architecture expectations
   - testing expectations
   - closed-loop validation path
   - implementation versus validation ownership
   - integration boundaries
   - migration or compatibility constraints

Interactive questioning rules:

- ask 2-3 targeted questions per round
- move from broad framing to detailed drilling
- start with task category, desired effect, and verification method before implementation detail
- summarize what was learned after each round
- convert "verification method" into a closed-loop real test contract before leaving Discover: exact command or scenario, observable pass/fail signal, who independently validates it, and whether audit rejects pseudo tests
- before leaving Discover on Codex, capture execution subworker authorization for `/hw:start` and `/hw:resume` even when `execution.worker_separation.mode` already exists; without one explicit outcome, Discover must not enter Decompose
- valid Codex Discover authorization outcomes are `authorized recommended`, `authorized strict`, `start/resume blocked until authorization`, or explicit user-confirmed fastest single-agent `execution.worker_separation.mode=off`
- before leaving Discover on Claude Code, choose execution subworker backend `subcodex` or `subclaude`; no separate subworker authorization gate is required
- before leaving Discover on OpenCode, use configured native agents/subagents; no separate subworker authorization gate is required
- Generate must pre-assign subworker tasks in each prompt instead of leaving role boundaries for `/hw:start` to invent later. Use a `Subworker Assignment Plan` with exactly three worker roles: `test`, `implement`, and `audit`, concrete scope, non-overlap rules, evidence outputs, and artifact paths. `review_tests` is a TDD step name owned by the `test` role, not a worker role; `review_code` is an audit/review step or artifact stage, not a worker role.
- Each generated subworker assignment must declare write scope: spawned workers can edit only `.pipeline/` files and explicitly scoped root-level non-project documentation such as `README.md`, `CHANGELOG.md`, and `PROJECT-SUMMARY.md`; `audit` is read-only and must not edit files. Out-of-scope needs must stop and report the path instead of editing, and no worker may revert or overwrite another worker's changes without explicit prompt-scope authorization.
- do not leave Discover until the configured minimum question rounds are complete and the user signals that the requirement interview is sufficient
- never treat "确认一下" or a plain answer as permission to enter Decompose

Context injection:

- `/hw:plan --context audit,patches,deferred,debug` preloads Discover with selected evidence
- `cycle.context_sources` is used when `/hw:plan` has no explicit `--context`
- supported sources:
  - `audit`: newest `.pipeline/audits/` report
  - `patches`: open Patch files in `.pipeline/patches/`
  - `deferred`: all `.pipeline/archives/*/deferred.yaml`
  - `debug`: newest `.pipeline/debug/` report
- injected context must be presented to the user before questions begin
- injected context must not skip the interactive round requirement

Repository scan rules:

- if the repo already contains source files, summarize the current structure before proposing milestones
- if `.pipeline/` already exists, treat the plan as append-or-revise rather than greenfield
- if the repo is effectively empty, skip structural scan and say that the plan is greenfield

Required Discover outputs:

- `.pipeline/design-spec.md`
- `.plan-state/discover.yaml`
- a concise list of unresolved questions, if any

Batch Discover adds:

- `.plan-state/batch-discover.yaml`
- Feature candidate table with category, desired effect, verification method, priority, gate, dependency, and decompose mode
- unresolved cross-Feature questions

### Decompose

- split work into milestones
- attach test specs and boundary coverage expectations
- keep milestones serial and reviewable
- prefer a runnable vertical slice for implementation milestones: one narrow behavior that can be exercised with real validation
- flag horizontal-only splits such as database/API/UI/schema-only milestones when they do not produce a runnable behavior

Decompose output rules:

- each milestone should map to one generated prompt file
- every milestone must include:
  - objective
  - implementation scope
  - test spec
  - expected artifacts
- every implementation milestone must also include:
  - `technical_solution`: architecture choice, state/data/interface contract, and key implementation strategy
  - `technical_route`: ordered route across modules, boundaries, migrations or compatibility handling, and non-goals
  - `research_required`: status, evidence, blocking questions, or user-approved deferrals
  - `risks_and_alternatives`: major risks, alternatives considered, and why the selected route is preferred
  - `validation_path`: closed-loop command or executable scenario, pass/fail signal, and validation owner
  - `audit_focus`: specific behavior, evidence, and risk that audit must inspect
  - a closed-loop validation path with exact command or executable scenario
  - observable pass/fail evidence
  - independent validation ownership when non-trivial or delegated
  - Codex execution subworker authorization scope for start/resume, or a recorded explicit user-confirmed fast/off single-agent downgrade decision
  - Claude Code execution subworker backend choice: `subcodex` or `subclaude`
  - the user-declared real test method and audit pseudo-test rejection policy
- implementation milestones should include a slice quality note:
  - runnable behavior
  - touched layers
  - validation command or evidence
  - non-goals that keep the slice narrow
- prefer 3-6 milestones for medium projects
- prefer narrower milestones when architecture review is likely to change downstream prompts
- do not split solely by technical layer unless the milestone is explicitly analysis, docs, setup, or migration-only
- reject open-loop milestone plans that only say "implement", "add tests", or "verify later" without a credible execution path
- reject goal-only Decompose checkpoints. A Decompose checkpoint may not be marked `proposed` if it only contains goals, acceptance criteria, Feature Queue items, or test titles without the implementation milestone fields above. Legacy `P2 checkpoint` references mean this same Decompose checkpoint.
- treat unknown tools, external services, third-party libraries, platform capabilities, and user-private schemas as hard `research_required` triggers. Decompose can be presented only after each trigger is resolved with evidence, converted into a user-facing blocking question, or explicitly deferred by the user; Decompose cannot be confirmed and Generate cannot start while a blocking question remains unanswered.
- if the user challenges a technical route, move Decompose back to `revision` or `in_progress`, record the challenge, perform targeted research, and present a revised checkpoint before Generate.

Persist milestone planning state in `.plan-state/decompose.yaml` when possible, and persist the human technical route checkpoint in `.plan-state/technical-route.md`.

Batch Decompose:

- upfront mode decomposes all Features immediately
- just_in_time mode writes Feature scaffolds only
- both modes generate a Markdown queue table and Mermaid graph
- single-feature `/hw:plan` behavior is unchanged when `--batch` is absent
- Feature DAG fields belong only to batch planning. Do not add Feature DAG requirements to ordinary single-feature Decompose checkpoints.

Interactive Decompose checkpoint:

- show the complete milestone split after Decompose
- show the technical solution, technical route, research status, risks/alternatives, validation path, and audit focus for every implementation milestone
- ask the user to confirm before entering Generate
- do not write `.pipeline/` files, prompt files, or architecture files until Generate

Append conflict rules:

- never silently renumber an existing executed prompt
- when generated prompt numbers collide with existing prompts:
  - preserve already-executed prompt filenames
  - append new prompts after the highest existing sequence number by default
  - create a patch proposal instead of rewriting history
- if a full resequence is truly needed, summarize the proposed renumbering and require explicit approval before mutating prompt files

### Generate

- write `.pipeline/config.yaml`
- write `.pipeline/prompts/*.md`
- write `.pipeline/architecture.md`
- choose a preset and template
- draft a detailed implementation plan for each milestone before converting it into prompt text

Generate rules:

- use `plan/assets/prompt-template.md` as the default prompt shape
- detect append mode when `.pipeline/config.yaml` or `.pipeline/prompts/` already exists
- in append mode:
  - read the existing config and prompt list first
  - preserve numbering unless the user explicitly wants a re-sequence
  - summarize what is being appended versus revised

Preset selection rules:

- choose `tdd` for engineering projects with executable tests
- choose `implement-only` for documentation, research, or planning-heavy work
- choose `analysis` for root-cause analysis, metric investigation, or repo/system investigation where the primary deliverable is an evidence-backed conclusion
- choose `custom` only when the user explicitly needs a non-standard sequence
- for each milestone, write a concrete implementation plan with ordered steps, dependencies, verification points, test spec, and constraints before rendering the prompt file
  - preserve the Decompose technical route contract in each generated implementation prompt: `technical_solution`, `technical_route`, `research_required`, `risks_and_alternatives`, `validation_path`, and `audit_focus`; legacy references to the "P2 technical route" mean this same internal compatibility contract
- stop and return to Decompose revision if the approved milestone plan lacks any required Decompose technical route field, has unresolved hard `research_required` items, or still has active blocking research questions
- convert that implementation plan into the final prompt file format instead of freehand summary text
- preserve the validation intent from the milestone plan in the generated prompt's `预期测试` and constraints sections
- preserve closed-loop validation commands, real test method, scenario, pass/fail signal, evidence expectations, audit pseudo-test rejection rule, and implementation-versus-validation ownership in the generated prompt
- include a `Subworker Assignment Plan` in each generated implementation prompt whenever worker separation is enabled or independent validation is required; assign exactly `test`, `implement`, and `audit` before any implementation steps. `review_tests` remains only the TDD step for checking tests, owned by the `test` worker.
- include each role's write boundary in the generated prompt: spawned workers edit only `.pipeline/` files and explicitly scoped root-level non-project documentation such as `README.md`, `CHANGELOG.md`, and `PROJECT-SUMMARY.md`; `audit` is read-only. Generated prompts must say that scope violations stop the worker and that workers may not revert or overwrite another worker's edits unless explicitly authorized by the orchestrator.
- on Codex without execution subworker authorization, keep the assignment but mark it `blocked_until_authorized` and write the start/resume authorization gate; do not remove the subworker plan unless the user explicitly confirmed fastest single-agent `off`
- generated implementation prompts must carry Objective, Boundaries, Non-Goals, Validation Commands, Evidence, and Human QA sections when applicable

Required Generate outputs:

- `.pipeline/config.yaml`
- `~/.hypo-workflow/config.yaml`
- `.pipeline/prompts/*.md`
- `.pipeline/architecture.md`
- `.plan-state/generate.yaml`

### Confirm

- summarize generated artifacts
- confirm project name, stack, preset, prompt count, and file list
- wait for explicit `/hw:start` or natural-language equivalent

Confirm summary must include:

- project name
- tech stack
- selected preset
- milestone count
- test point count
- generated file list
- whether the plan is greenfield or append mode

Interactive mode is a hard gate and must wait for explicit `确认`, `/hw:start`, or a natural-language equivalent. Auto mode may treat Confirm as a pass-through summary and continue.

### Extend

- require `.pipeline/cycle.yaml` with `cycle.status=active`
- require `.pipeline/state.yaml`
- list current milestones before asking for additions
- ask at least one targeted question round
- propose appended milestones and wait for explicit confirmation
- generate prompt files under `.pipeline/prompts/`
- append new milestone records to `.pipeline/state.yaml`
- start numbering from the current highest milestone number + 1
- never renumber or reorder existing milestones

Detailed behavior lives in `skills/plan-extend/SKILL.md`.

### Review

- inspect architecture deltas after a milestone
- identify downstream prompt impact
- propose prompt updates before the next milestone runs

Review rules:

- default `/hw:plan:review` inspects the latest completed milestone
- `/hw:plan:review --full` summarizes all completed milestones
- append review notes to `.pipeline/architecture.md`
- use `ADDED`, `CHANGED`, `REASON`, and `IMPACT` headings
- never silently rewrite future prompts; propose edits first
- write downstream prompt edits to `.plan-state/prompt-patch-queue.yaml`
- use `plan/assets/prompt-patch-queue-template.yaml` as the default queue shape

Compatibility:

- `/hw:review` should not run the review directly anymore
- it should print `⚠️ \`/hw:review\` 已迁移到 \`/hw:plan:review\`。请使用新命令。此兼容提示将在 V7 中移除。`
- keep `/hw:review --full` documented as a compatibility reminder until V7

## Shared Planning Artifacts

Use these files when relevant:

- `plan/assets/design-spec-template.md`
- `plan/assets/prompt-template.md`
- `plan/assets/prompt-patch-queue-template.yaml`
- `plan/templates/`
- `.plan-state/discover.yaml`
- `.plan-state/decompose.yaml`
- `.plan-state/technical-route.md`
- `references/plan-review-spec.md`

`.plan-state/` is runtime planning state and should not be committed. Use it for resumable planning phases in the same spirit as `.pipeline/state.yaml`.
