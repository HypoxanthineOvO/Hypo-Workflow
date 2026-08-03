---
name: experiment
description: Maintain a non-linear, reproducible experiment lane with project knowledge, run identity, parameter scans, long-run supervision, scientific review, immutable Git records, and instant materialized status. Use for /hw:experiment, experiment setup or reruns, NeRF/AceSim-style comparisons, baseline changes, parameter sweeps, result triage, and questions such as "现在实验怎么样".
---

# Experiment

Experiment is a durable project lane alongside Goal, Plan, and Maintain. It is not a runner: the host Agent executes commands, monitors processes, and maintains records through ordinary file operations. Workflow-specific tools are optional helpers, not prerequisites.

## 输出语言规则

用户可见内容遵循项目输出语言；缺失时跟随当前对话语言。Schema key、命令、路径、指标名和专有英文术语保持英文。

## Start Or Resume

1. Read the current manifest, then the selected Experiment record at `.pipeline/memory/experiment-records/<project_id>/<experiment_id>/experiment.yaml`. Follow only its `attempt_refs` and relevant project knowledge. Do not scan the repository or result tree for ordinary status questions.
2. If only a legacy materialized status projection exists, it may be read as a compatibility source. Rebuilding hashed events or projections is optional and must not block status, execution, or record updates.
3. Load only the referenced project knowledge needed for the task: purpose, metric meanings, dataset units, module roles, concept-to-code mappings, paper expectations, and stale source/version warnings.
4. State the intended experiment, baseline context, dataset or scene, changed and fixed parameters, success evidence, resource boundary, and next action before launching work.
5. A Session-selected Work Item improves context routing, but an unbound Session must not block ordinary prompts, tools, diagnostics, or Experiment record maintenance. Require Work Placement only before authority writes that could mix Work Items or before resource claims.

## Prepare And Run

1. Create or update the documented ordinary YAML records with the host's normal file tools. Capture the code snapshot, `uv` environment and lock digest, machine/GPU/driver/CUDA facts, external dataset location, command, resource limits, readable output directory, and parameters. Do not require a named reporting tool, and do not introduce Conda by default.
2. Use Repository Targets and Work Placement only when the run needs atomic repository or resource claims. Compatible pinned read/execute experiments may share; different snapshots or source-changing access use isolated worktrees; relocatable caches use resource isolation; fixed GPU/port/output conflicts block launch.
3. Treat the same code, parameters, dataset, scene, and explicit user-directed rerun as one logical run identity with a new Attempt. A different dataset or scene is a different experiment identity.
4. Expand explicit one-axis or cross-axis scans before execution. Record fixed parameters, axes, selected cases, feasibility limits, and why a screening scan expands to all data.
5. Run through the host in foreground or an isolated, uniquely named tmux session. Renew a fenced Placement lease only when the run acquired one. Poll when the user asks the Agent to watch. Record interruption evidence; resume from a real checkpoint when available, otherwise record restart-from-scratch.
6. Preserve logs, config, metrics, output references, failure evidence, and scientific review. Operational completion alone is not scientific success.

## Review And Change History

1. Compare results with baselines, paper expectations, neighboring runs, resource limits, and metric semantics. If a result is suspicious, create a pending confirmation; do not silently accept or reject it.
2. When local results differ from a paper, list plausible causes such as environment, dataset preprocessing, configuration, randomness, metric definition, resource limits, and implementation. Do not jump directly to "implementation is wrong."
3. Record baseline changes with their scope. Multiple default and contextual baselines may coexist.
4. Trash incorrect or obsolete Attempts instead of deleting them. Restore retained history when the user reverses the judgment. Delete only with fresh explicit authorization.
5. Before rerunning a same-identity Attempt, preserve or trash old bytes when output references overlap. Surface this retention risk in status.
6. When code changes, check whether metric, module, optimization-location, and concept-to-code knowledge became stale; update the knowledge record or flag the unresolved difference.

## Record And Synchronize

Use the Experiment Record Protocol in `docs/reference/experiment-records.md`. Keep one readable `experiment.yaml` plus one YAML file per Attempt. Use stable semantic IDs and ordinary Git history; content hashes, immutable events, materialized projections, BatchReport-like host capabilities, and Experiment Core write APIs are optional compatibility or validation helpers.

Write the record directly even when an optional helper is absent. A helper failure may produce a warning or leave optional derived state stale, but it must not stop the host command, monitoring, analysis, or the ordinary-file record update. Never fabricate missing facts merely to satisfy a schema; omit them or mark the specific value `unknown` with a reason.

If two branches change the same semantic fact incompatibly, stop before choosing a winner, summarize the difference, and ask the user unless they explicitly delegated the choice. A payload hash mismatch alone is not a reason to block an otherwise readable, unambiguous record.

For status, lead with the default and contextual baselines, hardware/configuration context, dataset meaning, scans and their purpose, outcome counts, suspicious or resource-limited results, retention state, and concrete next actions. Render a compact Markdown table directly from the selected record and referenced Attempts. A legacy `table_model` may be used when already available; follow detail references only when the user asks for drill-down.

NeRF-like screening and full-scene expansion and AceSim-like frequency/cache/trace scans are reference fixtures. Real NeRF, AceSim, GPU, paper-project, GitLab remote, SSH/SCP, large-trace, and long-run behavior is not validated yet; state this pilot boundary until a later real-project Pilot Goal validates it.

Never store raw credentials, hidden reasoning, full transcripts, or paper PDFs inside Experiment events. Store safe references to authorized locations instead.
