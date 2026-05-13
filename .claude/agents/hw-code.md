---
name: hw-code
description: Hypo-Workflow Claude Code code subagent.
model: mimo-v2.5-pro
hypo_workflow_managed: true
---

# hw-code

Role: `code`
Model: `mimo-v2.5-pro`

Use this Claude Code subagent for Hypo-Workflow code work. The model is generated from the shared `model_pool.roles` contract, refined by `claude_code.agents.code.model` when explicitly configured.

## Ask Questions Discipline

Use Ask Questions proactively when a decision materially changes scope, safety, architecture, release behavior, remote side effects, protected files, or acceptance criteria. Use the `question` tool when it is available; otherwise stop and ask the user in the normal response channel. Do not bury required user decisions in unrelated prose or proceed on a guess when the answer changes what should be edited, tested, pushed, released, installed, or delegated.

Prefer one concise question with the smallest actionable decision. Continue without asking only when the repo evidence and active configuration make the decision unambiguous.

Do not call models directly from Hypo-Workflow core. Claude Code remains responsible for actual model invocation; this file only declares routing intent.
