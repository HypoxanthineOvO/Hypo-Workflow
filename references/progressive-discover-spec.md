# Progressive Discover Spec

Use this reference when planning needs stronger structure than “ask a few rounds and hope for the best”.

## Big Questions First

Before the first P1 question, a new Cycle should pass through `P0 Configure` when no current-Cycle configure decision exists. `P0 Configure` runs after `cycle new` and before `P1 Discover`; it asks about automation, Subagent authorization, acceptance mode, PR/MR remote write confirmation, full regression, analysis boundaries, and worker separation. Users may reuse previous settings. Reuse follows `cycle_explicit -> previous_cycle_snapshot -> project_config -> global_config -> built_in_default` and must leave an auditable `.plan-state/p0-configure.yaml` or equivalent report note.

Progressive Discover starts from three big questions before deeper drilling:

1. task category
2. desired effect
3. verification method

The Agent should ask these early for both ordinary `/hw:plan` and `/hw:plan --batch`. This keeps later Milestone decomposition tied to the right task class and test surface.

## P0 Configure

Before those P1 questions, a new Cycle should run or explicitly reuse `P0 Configure`. The stage runs after `cycle new` and before `P1 Discover`; it confirms automation, Subagent authorization, acceptance mode, PR/MR remote write policy, full regression, analysis boundaries, and worker separation. Reuse must preserve its source order: `cycle_explicit`, `previous_cycle_snapshot`, `project_config`, `global_config`, `built_in_default`.

The verification answer must become a real test contract, not a vague testing note. Ask for the 真实测试方法 / real test method, the exact scenario or command, the observable pass/fail signal, and the independent validator. For example, an agent-service project may require "use NapCat to simulate the main account sending a message to the agent"; unit mocks or pseudo tests do not satisfy that contract unless the user explicitly defined them as the real acceptance method.

## Progressive Stages

After the big questions, the default full structure is:

1. assumption statement
2. ambiguity resolution
3. tradeoff review
4. validation criteria

This is a strong template, not a rigid questionnaire. The Agent may merge related prompts in one round, but it should not skip the structure entirely.

## Adaptive Grill-Me

After the big questions, Discover decides whether to stay light or enter deep Grill-Me.

Use light Discover for low-risk, incremental tasks. Escalate to deep Grill-Me when the request affects architecture, source-of-truth ownership, workflow lifecycle semantics, user-facing product concepts, long-running batch/DAG coordination, or prompt-generation vocabulary.

Deep Grill-Me records confirmed concepts rather than raw conversation:

- stable terms
- examples and non-examples
- common misunderstandings
- source-of-truth ownership
- state transitions
- prompt-generation hints and non-goals

The pure helper `evaluateDiscoverGrillMeRisk` exposes the deterministic risk decision for tests and command adapters.

## Design Concept Artifacts

Confirmed design concepts use two durable artifact layers:

- `.pipeline/design-concepts.yaml` stores machine-readable concept records with `id`, `term`, `definition`, `boundaries`, `source_of_truth`, `state_transitions`, `decision_refs`, and `prompt_hints`.
- `.pipeline/glossary.md` explains stable terms for humans with examples, non-examples, and common misunderstandings.

These artifacts do not replace `.pipeline/architecture.md` or the Knowledge Ledger. Architecture remains the system contract; Knowledge Ledger indexes confirmed decisions and references without copying full glossary or design-concepts bodies into every context.

## Batch Discover

Batch Discover still runs one unified interview, but every Feature candidate should capture:

- workflow_kind: `build`, `analysis`, or `showcase`
- analysis_kind when `workflow_kind=analysis`: `root_cause`, `metric`, or `repo_system`
- task category
- desired effect
- verification method
- real test scenario
- observable pass/fail signal
- independent validator
- audit policy for rejecting pseudo tests
- gate preference
- decompose mode
- acceptance boundary

Feature Queue previews should carry category and verification metadata so later Test Profiles can reuse them.

`workflow_kind` decides the workflow lane. `analysis_kind` refines investigative work without turning analysis into a Test Profile:

- `root_cause`: debug or explain an unexpected behavior.
- `metric`: compare trends, measurements, or before/after data.
- `repo_system`: inspect codebase architecture or system behavior.

## Plan Extend Coverage

`/hw:plan:extend` uses lightweight Progressive Discover:

- keep big questions first
- confirm category, desired effect, and verification method
- reuse assumption statement and validation criteria
- do not force the full four-stage interview when the change is clearly incremental

## RTL Domain

Progressive Discover may select or suggest a Domain Pack from task text after the big questions. For RTL work, triggers include Verilog, SystemVerilog, SpinalHDL, HDL, combinational/sequential logic, clock/reset, testbench, simulator, waveform, FPGA, ASIC, or synthesis terms.

If RTL is selected, Discover should confirm the HDL language, whether the design is combinational or sequential, clock/reset assumptions, testbench expectations, and simulator evidence. Non-RTL tasks should not receive RTL checklist text.

## Karpathy Guidelines Rule Pack

`@karpathy/guidelines` is an optional rule pack. It is not default enabled.

The pack contains:

- `karpathy-think-before-coding`
- `karpathy-simplicity-first`
- `karpathy-surgical-changes`
- `karpathy-goal-driven-execution`

When enabled, these rules act as always-on planning and implementation guidance rather than hardcoded control flow.

## Runtime Notes

- keep natural-language user input as the source; structured fields are extracted after the conversation
- preserve existing `interaction_depth`, `min_rounds`, and explicit Discover completion semantics
- do not replace normal `/hw:plan`; make it more disciplined
