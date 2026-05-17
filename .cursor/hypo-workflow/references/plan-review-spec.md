# Plan Review Spec

Use this reference when the pipeline was created through Plan Mode and the system needs to review architecture impact after a milestone completes.

## Goal

Plan Review keeps later prompts aligned with reality after earlier milestones change the shape of the project.

It complements V4 architecture drift scoring:

- V4 evaluation asks whether the completed prompt drifted from the plan
- Plan Review asks whether the plan itself now needs to change

## Inputs

- `.pipeline/architecture.md`
- current prompt report
- current prompt diff summary
- latest completed milestone prompt
- downstream prompt files that have not run yet

## Triggers

Run Plan Review:

- automatically after a milestone completes in a plan-generated pipeline
- manually through `/hw:plan:review`
- manually across all completed milestones through `/hw:plan:review --full`

## Review Procedure

1. read the latest architecture baseline
2. summarize what the completed milestone actually changed
3. classify the change under:
   - `ADDED`
   - `CHANGED`
   - `REASON`
   - `IMPACT`
4. inspect future prompts for stale assumptions
5. list downstream prompts that may require edits
6. provide concrete revision suggestions before the next prompt starts
7. write proposed prompt edits to a machine-readable queue

## Output Requirements

`architecture.md` should append a review entry with:

```markdown
## Milestone Mx / Prompt xx-name

### ADDED
- ...

### CHANGED
- ...

### REASON
- ...

### IMPACT
- downstream prompts affected: ...
- recommended prompt updates: ...
```

Plan Review should also summarize:

- whether the architecture baseline still holds
- whether downstream prompts are safe to run unchanged
- whether user confirmation is required before rewriting future prompts

## Prompt Patch Queue

When downstream prompts need edits, write `.plan-state/prompt-patch-queue.yaml`.

Use `plan/assets/prompt-patch-queue-template.yaml` as the canonical shape.

Queue rules:

- each entry maps to one downstream prompt file
- set `status=proposed` until a human or explicit command approves it
- do not mutate prompt files directly from Plan Review
- if multiple milestones affect the same downstream prompt, append a new proposal entry rather than overwriting history silently

This queue is the safety boundary between architecture analysis and prompt mutation.

## `/hw:plan:review`

Default behavior:

- review the latest completed milestone only

`--full` behavior:

- replay review across all completed milestones
- summarize cumulative architecture evolution

## Compatibility Alias

- `/hw:review` should print `⚠️ \`/hw:review\` 已迁移到 \`/hw:plan:review\`。请使用新命令。`
- keep `/hw:review --full` mentioned as a legacy compatibility reminder only

## Safety Rules

- do not silently rewrite downstream prompts
- propose changes explicitly before mutating prompt files
- keep architecture notes concise and decision-oriented
- treat missing `architecture.md` as a non-fatal skip with an explicit warning
