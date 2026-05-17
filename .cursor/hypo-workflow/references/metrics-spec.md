# Metrics Spec

Metrics records optional runtime measurements for Cycle, Feature, Milestone, Step, and Patch work. It is intentionally separate from Feature Queue so the queue stays compact and readable.

## Scope

Metrics should answer:

- how long a Cycle, Feature, Milestone, Step, or Patch took
- how many messages or model calls were involved
- how many tokens were reported by the platform
- what cost was reported by the platform

Metrics must not estimate model cost from a hand-maintained price table. If the host platform or SDK does not provide token or cost data, store `telemetry_unavailable`.

## Metrics File

Canonical path:

```text
.pipeline/metrics.yaml
```

The file is append-friendly and grouped by dimension:

```yaml
version: 1
cycle_id: C2
updated_at: "2026-05-01T03:27:00+08:00"
cycles: []
features: []
milestones: []
steps: []
patches: []
```

## Dimensions

Supported dimensions:

- cycle
- feature
- milestone
- step
- patch

Relationship:

- cycle records aggregate Cycle totals.
- feature records aggregate Feature totals.
- milestone records one Prompt/Milestone delivery unit.
- step records individual execution steps under a Milestone.
- patch records lightweight Patch lane work.

## Field Contract

Common fields:

```yaml
id: M05
cycle_id: C2
feature_id: F004
milestone_id: M05
step: write_tests
status: running
started_at: "2026-05-01T03:27:00+08:00"
finished_at: null
duration_ms: n/a
message_count: telemetry_unavailable
tokens:
  input: telemetry_unavailable
  output: telemetry_unavailable
  total: telemetry_unavailable
token_count: telemetry_unavailable
cost: telemetry_unavailable
currency: telemetry_unavailable
telemetry_status:
  token_count: telemetry_unavailable
  cost: telemetry_unavailable
updated_at: "2026-05-01T03:27:00+08:00"
source: agent
```

Rules:

- `duration_ms` may be computed from persisted timestamps when both timestamps exist.
- `message_count` may be counted from agent-visible interactions when available.
- `tokens` and `token_count` must come from platform/SDK telemetry.
- `cost` must come from platform/SDK telemetry.
- Use `telemetry_unavailable` when token, cost, currency, or message telemetry is unavailable.
- Existing archived fixtures may still contain `n/a`; readers should normalize it to `telemetry_unavailable` when creating new records.

## Cost and Token Policy

Token and cost values are telemetry, not estimates.

- Do not infer cost from model names or public price tables.
- Do not mix currencies in one aggregate without a conversion source.
- If a platform provides input/output token split, store it under `tokens`.
- If only total tokens are available, set `tokens.total` and `token_count`.
- If no telemetry is available, use `telemetry_unavailable`.

## Update Timing

Update metrics when:

- a Cycle starts, closes, or archives
- a Feature becomes active, completes, defers, or blocks
- a Milestone starts or completes
- a Step starts or completes
- a Patch opens, starts repair, closes, or defers

Metrics updates should be best-effort. Missing telemetry must not block execution, release, or report generation.
