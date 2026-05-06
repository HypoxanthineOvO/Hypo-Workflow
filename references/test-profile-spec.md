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

Then apply category-specific follow-up:

- webapp: which browser path, what interaction, what screenshot or visual result
- agent-service: what CLI surface, how CLI shares the same core interface, which scenario to run
- research: what baseline, what direction, what validation script, and what environment constraints

## WebApp Profile

Requirements:

- must run E2E
- must interact with the browser
- must capture screenshot or other visual evidence
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
- split core logic between CLI and UI is not acceptable

## Research Profile

Requirements:

- baseline metric must be named
- expected direction must be declared
- validation script must be explicit
- validation must execute the script and record before / after / delta
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
