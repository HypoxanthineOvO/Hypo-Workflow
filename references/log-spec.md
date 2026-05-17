# Unified Log Spec

Use this reference for the V6 lifecycle ledger at `.pipeline/log.yaml`.

## Goal

`log.yaml` is the durable, queryable activity ledger for milestone delivery and post-plan lifecycle work. Status and dashboard Recent Events are filtered user activity feeds derived from this ledger; they are not the complete audit history.

## File Location

- canonical path: `.pipeline/log.yaml`
- optional report directories created on demand:
  - `.pipeline/fixes/`
  - `.pipeline/audits/`
  - `.pipeline/debug/`

## Schema

```yaml
entries:
  - id: "M0"
    type: milestone_start | milestone_complete | feature_start | feature_complete | step_complete | cycle_accept | cycle_reject | sync_repair | lease_takeover | handoff | derived_refresh | platform_failure | audit | debug | release | patch | pr | watchdog | chat_entry | chat_session
    ref: "C5/M08"
    status: active | completed | warning | blocked | failed | proposed | queued | skipped | accepted | rejected | deferred | running | done | closed | revised | pending_acceptance | waiting_confirmation | confirmed | review_ready | remote_review_submitted | rereview_passed | merged
    timestamp: "2026-04-24T10:00:00Z"
    summary: "Added unified logging foundation."
    report: ".pipeline/fixes/fix-001.md"
    trigger: plan_review | audit | debug | user | regression | auto
    related_milestone: "M0"
```

Field rules:

- `id`: stable entry id such as `M0`, `FIX-003`, `AUDIT-002`
- `type`: belongs to one lifecycle family: cycle, plan, feature, milestone, step, patch, pr, acceptance, sync, recovery, handoff, derived refresh, platform, audit, debug, release, watchdog, or chat
- `ref`: human-readable pointer to a prompt, command, report, release tag, or issue
- `status`: lifecycle result for the entry
- `timestamp`: ISO-8601 timestamp
- `summary`: one-line activity summary
- `report`: optional path to a detailed markdown report
- `trigger`: one of `plan_review`, `audit`, `debug`, `user`, `regression`, `auto`
- `related_milestone`: nearest owning milestone such as `M4`; optional for pure release work

Detailed completion narratives linked from `report` must follow `references/completion-report-contract.md`. Keep `summary` one line; do not inline the full completion payload into `log.yaml`.

## Write Triggers

Write a new entry when:

- a milestone closes
- a fix report is written
- an audit report is written
- a debug investigation finishes
- a plan review produces architecture delta notes
- a release is prepared or published
- a Cycle opens, closes, archives, pauses, or is abandoned
- a Patch opens, closes, or is resolved by a milestone
- a PR/MR archive is reviewed, re-reviewed, remotely commented on, merged, or closed
- watchdog retries are exhausted or automatic resume succeeds
- a chat summary is written
- a chat session starts, ends, or is recovered

## Recent Feed

Status and dashboard Recent Events must:

- sort entries by `timestamp` newest-first rather than relying on file order
- include user-relevant lifecycle entries such as cycle, feature, milestone, patch, pr, acceptance, sync, recovery, handoff, derived refresh, audit, debug, release, and chat
- exclude internal noise such as step heartbeats, hook heartbeats, platform heartbeats, watchdog heartbeats, and compact refreshes unless the event is blocked, failed, or warning-level and affects user action
- pass summaries through the shared secret-safe evidence redaction helper before rendering

The full `/hw:log` view may show all durable entries with filtering flags. Recent is intentionally a concise first-screen activity feed.

## Secret-Safe Evidence

All durable and user-facing evidence surfaces share one conservative redaction contract:

- debug reports
- audit reports
- milestone reports
- Patch records and completion narratives
- `log.yaml`
- status/dashboard Recent
- Knowledge Ledger records, indexes, and compact views

Raw API keys, tokens, Authorization headers, cookies, passwords, private keys, access tokens, refresh tokens, client secrets, and similar provider credentials must be redacted or blocked before durable writes. Successful reports cannot be marked successful when secret validation finds unredacted raw secret evidence.

## Chat Logging

Use chat logging when work belongs to append conversation rather than a Milestone report.

Suggested patterns:

- `type: chat_session`
  - session start
  - session end
  - session recovery
- `type: chat_entry`
  - compact discussion note
  - modified files summary
  - auto summary fallback note from Stop Hook

Chat logging rules:

- prefer chat log rather than Milestone report for `/hw:chat`
- keep summaries short and durable
- include whether the session used full summary or minimal log-only persistence
- mention recent report / recent files when they are part of recovery context
- allow Stop Hook to write a chat summary fallback when the user forgets `/hw:chat end`

## Read Behavior

`/hw:log` should format entries as:

- default: newest 10 entries
- `--all`: all entries
- `--type <type>`: filter by `type`
- `--since <milestone>`: show entries whose `related_milestone` is that milestone or later

If `log.yaml` does not exist, respond with `暂无日志，执行 Pipeline 后自动生成`.

When displaying entries, use `output.language` and convert timestamps to `output.timezone`.

## Fix Report Template

```markdown
# Fix-NNN: [title]

## Metadata
- Trigger: [user / regression / audit / debug]
- Related Milestone: [Mx]
- Status: [completed / warning / failed]

## Problem
- [symptom or failing behavior]

## Root Cause
- [why it happened]

## Fix
- [what changed]

## Verification
- [tests / checks / evidence]

## Completion Narrative
- Change Summary: [what changed]
- Technical Approach: [how the fix was made]
- Modified Files / Modules: [files/modules]
- Test Design: [planned validation]
- Validation Results: [actual checks]
- Expected Result: [expected behavior]
- Problems Encountered: [issues or none]
- Risks / Follow-Up: [risks or none]

## Architecture Impact
- [none / what changed in architecture]
```

## Audit Report Template

```markdown
# Audit Report — YYYY-MM-DD

## Metadata
- Scope: [full project / dir]
- Focus: [all / security / bugs / arch / perf / tests / quality]
- Trigger: [audit / user / regression]

## Findings
- Critical: X
- Warning: Y
- Info: Z

## Key Findings
- [top findings]

## Recommended Actions
- [next steps]

## Completion Narrative
- Change Summary: [audit result]
- Technical Approach: [scan method]
- Modified Files / Modules: [reviewed files/modules]
- Test Design: [validation basis]
- Validation Results: [findings/checks]
- Expected Result: [expected remediation behavior]
- Problems Encountered: [constraints or none]
- Risks / Follow-Up: [remaining risks]
```

## Debug Report Template

```markdown
# Debug-NNN: [symptom title]

## Metadata
- Trigger: [debug / trace / user]
- Related Milestone: [Mx]
- Status: [confirmed / partial / unresolved]

## Symptom
- [error or behavior]

## Hypotheses
1. [candidate root cause]
2. [candidate root cause]

## Validation
- [how each hypothesis was checked]

## Root Cause
- [confirmed explanation]

## Fix Recommendation
- [diff or concrete code suggestion]

## Completion Narrative
- Change Summary: [root cause or applied fix]
- Technical Approach: [hypothesis strategy]
- Modified Files / Modules: [reviewed or changed files]
- Test Design: [reproduction/validation plan]
- Validation Results: [confirmed/rejected evidence]
- Expected Result: [expected behavior after fix]
- Problems Encountered: [constraints or none]
- Risks / Follow-Up: [remaining risks]

## Architecture Impact
- [none / required update]
```
