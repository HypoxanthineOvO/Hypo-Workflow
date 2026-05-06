# C8 Review Artifacts

This directory is reserved for durable Agent Review evidence generated during C8.

Expected layout:

```text
.pipeline/reviews/
  F001-rules-habits/
    M01/
      plan/
      tests/
      code/
```

Each stage should keep:

- `transcript.md` when a subagent or host review transcript is available;
- `summary.md` for the user-facing verdict and issue list;
- `verdict.yaml` for machine-readable status, checked rules, reviewed refs, retry round, and fallback reason.

Review verdicts use `pass`, `warn`, `needs_changes`, or `critical`.
