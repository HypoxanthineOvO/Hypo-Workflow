# Chat Mode Spec

Use this reference for the lightweight append conversation lane exposed by `/hw:chat`.

## Goal

`/hw:chat` is a lightweight follow-up mode for discussion and small edits after a Cycle or Milestone state has already been established.

It exists to preserve Workflow context between “full plan / execute / accept” loops without forcing every small follow-up into a new Patch or a new Cycle.

## Command Forms

- `/hw:chat`
- `/hw:chat end`

## Core Behavior

### `/hw:chat`

- reload Workflow context from `state.yaml + cycle.yaml + PROGRESS.md + recent report`
- enter append conversation mode without opening a new Milestone
- keep normal discussion and small code edits allowed
- record activity in chat log rather than Milestone report

### `/hw:chat end`

- close the active chat session explicitly
- generate a chat summary when the summary policy says one is needed
- otherwise preserve at least chat entries and modification traces

## Relationship To Cycle / Milestone / Patch

- chat mode does not replace Cycle / Milestone / Patch
- Cycle remains the delivery container
- Milestone remains the tracked implementation unit in `state.yaml`
- Patch remains the side track for persistent small fixes
- chat mode is an append conversation lane around existing Workflow state

## Recovery Paths

The contract must support four paths:

1. enter — user explicitly starts `/hw:chat`
2. recover — SessionStart sees `chat.active == true` and restores chat context
3. end — user explicitly runs `/hw:chat end`
4. abnormal exit — Stop Hook decides whether to write auto summary or only log chat + modifications

## Context Sources

When entering or recovering chat mode, the agent should prioritize:

- `.pipeline/state.yaml`
- `.pipeline/cycle.yaml`
- `.pipeline/PROGRESS.md`
- the most recent report under `.pipeline/reports/`
- optional open Patch files when they are relevant

## Summary Policy

The design supports two persistence levels:

1. full summary
   - write a structured chat summary for the session
   - use when the session changed intent, files, decisions, or future work materially
2. minimal log-only
   - keep chat entries plus modification traces without a long summary
   - use when the session stayed small or was mostly exploratory

The policy is represented by `summary_policy` and may be influenced by Hook-time heuristics or explicit user intent.

## Patch Escalation

chat mode may recommend upgrade to Patch when changes stop being lightweight.

Signals may include:

- too many edited files
- too many changed lines
- sustained multi-turn repair work
- repeated bug-fix intent
- user asks for durable tracking

Escalation should remain a recommendation or confirmation gate, not a silent automatic Patch creation.
