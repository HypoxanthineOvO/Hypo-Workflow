# Experiment Record Protocol

Experiment 默认使用普通 YAML 文件记录。Agent 可以通过正常的文件读取和编辑能力维护这些文件；任何名为 `BatchReport` 的宿主能力、Experiment Core 写入 API、内容哈希事件或状态投影都不是前置条件。

## 路径

```text
.pipeline/memory/experiment-records/<project_id>/<experiment_id>/
├── experiment.yaml
└── attempts/
    ├── attempt-20260803-001.yaml
    └── attempt-20260803-002.yaml
```

`experiment.yaml` 是该 Experiment 的可读索引和当前计划。每个 Attempt 使用独立文件，重跑产生新的 `attempt_id` 并通过 `rerun_of` 引用原 Attempt。ID 使用稳定、可读的语义值，不从 payload hash 派生。

## Experiment 文件

```yaml
schema_version: '1'
project_id: example-project
experiment_id: example-screening
title: Example screening
purpose: Compare the candidate against the current baseline.
hypothesis: The candidate improves throughput without exceeding the memory limit.
baseline:
  id: baseline-v1
  scope: default
  references: []
dataset:
  id: dataset-a
  scene: scene-01
  meaning: One representative screening scene.
  location_ref: /authorized/external/path
fixed_parameters: {}
scan_axes: {}
success_evidence:
  - Throughput exceeds the baseline.
resource_boundary:
  gpu: '0'
  time_limit: 2h
  output_dir: outputs/example-screening
state: planned
attempt_refs: []
next_action: Launch the first screening Attempt.
updated_at: '2026-08-03T12:00:00+08:00'
```

## Attempt 文件

```yaml
schema_version: '1'
project_id: example-project
experiment_id: example-screening
attempt_id: attempt-20260803-001
status: completed
rerun_of: null
started_at: '2026-08-03T12:05:00+08:00'
finished_at: '2026-08-03T12:35:00+08:00'
code:
  commit: <git-commit>
  tree: <git-tree>
  dirty: false
  diff_ref: null
environment:
  runner: uv
  lock_digest: <sha256-or-unknown-with-reason>
  machine: <hostname>
  gpu: <gpu-model>
  driver: <driver-version>
  cuda: <cuda-version>
dataset:
  id: dataset-a
  scene: scene-01
parameters: {}
command: uv run --frozen python run.py
output_dir: outputs/example-screening/attempt-20260803-001
log_refs: []
config_refs: []
metrics: {}
failure: null
scientific_review:
  conclusion: pending
  suspicious: false
  notes: []
retention:
  state: retained
  overlap_risk: false
next_action: Review metrics against baseline-v1.
```

只记录已知事实。未知但重要的字段可以写成 `unknown: <reason>`，不要猜测。命令、路径和引用中不得包含凭据；保存授权位置的安全引用，而不是复制 Key、完整对话、隐藏推理或论文 PDF。

## 生命周期

启动前更新 `experiment.yaml`，写明 baseline、数据集、变化参数、固定参数、成功证据、资源边界和下一步。启动时创建 Attempt 文件并记录代码、环境、命令和输出目录。完成、失败或中断后更新同一个 Attempt 文件，保存指标、日志引用、失败证据、scientific review 和后续动作。

Hooks 可以提醒这些检查点，但不得代替语义判断或文件写入。Hooks、批量报告、校验器或投影失败时，Agent 继续运行并直接维护记录。

## 兼容性

旧的 `.pipeline/memory/experiment-events/` 和 `.pipeline/memory/experiment-status/` 可以继续读取，也可以由可选工具同步。它们不是新记录的默认写入路径。除非用户明确要求迁移，否则不要删除或重写旧事件。

Work Placement 只用于需要原子性的 repository、GPU、端口、cache 或输出目录 claim。Session 未绑定不会阻止普通读取、诊断、命令执行或本协议下的记录维护。
