# Test Profile Spec

Use this reference when planning or evaluating work where validation style depends on task category rather than only on step preset.

## Compose Model

Profile is a superset of preset.

- Preset controls step order
- profile controls the validation policy
- they may compose, for example `webapp + tdd`

Legacy projects may still use only `tdd`, `implement-only`, or `custom`. In that case the behavior remains preset-only.

## Config Surface

Recommended location:

```yaml
execution:
  steps:
    preset: tdd
  test_profiles:
    enabled: true
    selection: auto
    compose: true
    profiles: []
```

`selection: auto` means the Agent may infer a profile from Discover answers such as task category.

## Plan Guidance

Plan / Discover should ask these early:

1. this task belongs to which category
2. what effect should the user or evaluator see
3. how success will be verified

Then turn that into a closed-loop validation plan before decomposition:

- define the exact command, scenario, or procedure that proves the behavior
- define the observable pass/fail signal, not just the code path being touched
- define who performs independent validation when the work is non-trivial or delegated
- preserve the user-declared real test method so test and audit workers cannot substitute pseudo tests
- reject open-loop plans that only describe implementation steps or "add tests later"
- reject pseudo tests when the plan declares a real external scenario, for example NapCat simulating a main account message to an agent

Then apply category-specific follow-up:

- webapp: which browser path, what interaction, what screenshot or visual result
- agent-service: what CLI surface, how CLI shares the same core interface, which scenario to run
- research: what baseline, what direction, what validation script, and what environment constraints

## WebApp Profile

Requirements:

- must run E2E
- must interact with the browser
- must capture screenshot or other visual evidence
- must define a real user path with an observable pass/fail result
- for non-trivial delegated work, browser validation should be reviewed or executed by an independent validator
- must not claim success from unit tests alone

Typical evidence:

- Playwright or Cypress scenario
- button clicks / form flows
- screenshot, DOM assertion, or rendered-state proof

## Agent-Service Profile

Requirements:

- Design must include an agent-friendly CLI
- CLI and human-facing UI must share the same core interface
- validation must execute the real CLI scenario
- validation must include the exact CLI command and the expected observable output or state change
- validation must follow the plan's real test method when the user names one, such as NapCat sending a real-account-equivalent message to the agent
- audit must reject unit mocks, fake messages, or other pseudo tests when they do not execute the declared real scenario
- for non-trivial delegated work, the implementation worker and CLI validation worker must not be the same worker
- split core logic between CLI and UI is not acceptable

## Research Profile

Requirements:

- baseline metric must be named
- expected direction must be declared
- validation script must be explicit
- validation must execute the script and record before / after / delta
- validation must define what result would disprove the hypothesis or block acceptance
- for non-trivial delegated work, result review should come from an independent validator or challenger
- code diff alone is never enough

Typical report fields:

- baseline
- after
- delta
- direction
- validation script
- conclusion or blocker

## RTL Domain

RTL is a Domain Pack, not a Test Profile. When Discover or task text selects the `rtl` domain, compose it with the existing preset/profile instead of treating `rtl` as a workflow name.

RTL-specific validation should ask for HDL language, combinational/sequential classification, clock/reset assumptions, testbench expectations, and simulator evidence. Tool probes remain metadata-only; they may identify likely local tool names but must not install simulators, fetch remote packs, or execute external pack code.
