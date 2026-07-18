---
name: experiment
description: Maintain a non-linear, reproducible experiment lane with project knowledge, run identity, parameter scans, long-run supervision, scientific review, immutable Git records, and instant materialized status. Use for /hw:experiment, experiment setup or reruns, NeRF/AceSim-style comparisons, baseline changes, parameter sweeps, result triage, and questions such as "现在实验怎么样".
---

# Experiment

Experiment is a durable project lane alongside Goal, Cycle, and Maintain. It is not a runner: the host Agent executes commands and monitors processes; Workflow validates and records the evidence.

## 输出语言规则

用户可见内容遵循项目输出语言；缺失时跟随当前对话语言。Schema key、命令、路径、指标名和专有英文术语保持英文。

## Start Or Resume

1. Read the current manifest and project Experiment status projection first. Do not answer status by scanning the repository, result tree, or every immutable event.
2. If the projection is missing after a clone or Git merge, rebuild it from `.pipeline/memory/experiment-events/<project_id>/` once, then use the projection for ordinary status questions.
3. Load only the referenced project knowledge needed for the task: purpose, metric meanings, dataset units, module roles, concept-to-code mappings, paper expectations, and stale source/version warnings.
4. State the intended experiment, baseline context, dataset or scene, changed and fixed parameters, success evidence, resource boundary, and next action before launching work.

## Prepare And Run

1. Capture a code snapshot, `uv` environment and lock digest, machine/GPU/driver/CUDA facts, external dataset location, command, resource limits, readable output directory, and parameters through the Experiment Core APIs. Do not introduce Conda by default.
2. Treat the same code, parameters, dataset, scene, and explicit user-directed rerun as one logical run identity with a new Attempt. A different dataset or scene is a different experiment identity.
3. Expand explicit one-axis or cross-axis scans before execution. Record fixed parameters, axes, selected cases, feasibility limits, and why a screening scan expands to all data.
4. Run through the host in foreground or an isolated, uniquely named tmux session. Poll when the user asks the Agent to watch. Record interruption evidence; resume from a real checkpoint when available, otherwise record restart-from-scratch.
5. Preserve logs, config, metrics, output references, failure evidence, and scientific review. Operational completion alone is not scientific success.

## Review And Change History

1. Compare results with baselines, paper expectations, neighboring runs, resource limits, and metric semantics. If a result is suspicious, create a pending confirmation; do not silently accept or reject it.
2. When local results differ from a paper, list plausible causes such as environment, dataset preprocessing, configuration, randomness, metric definition, resource limits, and implementation. Do not jump directly to "implementation is wrong."
3. Record baseline changes with their scope. Multiple default and contextual baselines may coexist.
4. Trash incorrect or obsolete Attempts instead of deleting them. Restore retained history when the user reverses the judgment. Delete only with fresh explicit authorization.
5. Before rerunning a same-identity Attempt, preserve or trash old bytes when output references overlap. Surface this retention risk in status.
6. When code changes, check whether metric, module, optimization-location, and concept-to-code knowledge became stale; update the knowledge record or flag the unresolved difference.

## Record And Synchronize

Append one content-addressed immutable event for each baseline, dataset, scan, Attempt, exception, lifecycle change, and next action. Rebuild the materialized projection after local writes and after Git event unions. If two branches change the same `event_key` without explicit supersession, stop, summarize the difference, and ask the user unless they explicitly delegated the choice.

For status, lead with the default and contextual baselines, hardware/configuration context, dataset meaning, scans and their purpose, outcome counts, suspicious or resource-limited results, retention state, and concrete next actions. Render a compact Markdown table from `table_model`; follow its detail references only when the user asks for drill-down.

NeRF-like screening and full-scene expansion and AceSim-like frequency/cache/trace scans are reference fixtures. Real NeRF, AceSim, GPU, paper-project, GitLab remote, SSH/SCP, large-trace, and long-run behavior is not validated yet; state this pilot boundary until a later real-project Pilot Goal validates it.

Never store raw credentials, hidden reasoning, full transcripts, or paper PDFs inside Experiment events. Store safe references to authorized locations instead.
