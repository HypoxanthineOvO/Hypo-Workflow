# Review Artifacts Spec

Use this reference for durable Agent Review evidence created during planning, test review, code review, Skill/artifact coverage review, and final regression review.

## Location

Review artifacts live under:

```text
.pipeline/reviews/<feature>/<milestone>/<stage>/
```

Examples:

- `.pipeline/reviews/F002/M04/plan/`
- `.pipeline/reviews/F002/M05/review_tests/`
- `.pipeline/reviews/F002/M06/artifact_coverage/`

The helper `reviewArtifactDir({ feature, milestone, stage })` constructs this path. Segments must be single path components; do not accept `/`, `..`, or absolute paths.

## Schema

Each review attempt should have a machine-readable artifact with these fields:

```yaml
verdict: pass | warn | needs_changes | critical
reviewed_refs:
  - core/test/review-artifacts.test.js
summary: "Concise human-readable finding summary."
checked_rules:
  - c8.review.schema
unchecked_rules:
  - id: c8.domain.rtl
    reason: "not in scope"
issues:
  - severity: warn
    ref: core/src/reviews/index.js
    message: "Missing coverage evidence."
retry_round: 1
fallback_reason: "subagent unavailable"
```

Required fields:

- `verdict`
- `reviewed_refs`, as a non-empty list

Optional fields:

- `checked_rules`
- `unchecked_rules`
- `issues`
- `retry_round`
- `fallback_reason`
- `summary`, `notes`, `transcript_ref`, `repair_proposals`, or other evidence fields when secret-safe

## Verdict Semantics

- `pass`: reviewed evidence is sufficient.
- `warn`: non-blocking concern; record it and continue unless strict policy blocks warnings.
- `needs_changes`: repair and review again while retry budget remains.
- `critical`: block continuation unless a higher-level explicit policy records a defer/stop decision.

## Retry And Gate Policy

`needs_changes` uses a bounded repair/review loop. The default is `max_rounds=3`, counting the first review attempt as round 1.

- round 1 or 2 with `needs_changes`: repair, then create the next review artifact
- round 3 with `needs_changes`: block and record the reason
- `strict=true`: configured blocking verdicts stop continuation immediately

The compact state may store only pointers such as final verdict, retry round, and artifact path. Full notes, issues, transcripts, and coverage matrices belong under `.pipeline/reviews/`.

## Coverage Checklist

Artifact coverage reviews should list checked and skipped evidence for these surfaces:

- `skills`
- `hooks`
- `agents`
- `commands`
- `generated_adapters`

Checked entries must include evidence paths. Skipped entries must include a reason, such as host capability absence or surface not generated for the selected platform. A skipped surface is not a pass; it is explicit review evidence.

## Secret Safety

Review artifacts may summarize command output, logs, or transcripts, so they must be secret-safe.

- Secret-like field names and text patterns should be redacted before persistence.
- In strict contexts, reject the artifact and record a blocking validation error instead of writing leaked evidence.
- Do not embed raw credentials, bearer tokens, cookies, private keys, or API keys in `.pipeline/reviews/`, reports, progress, or logs.
