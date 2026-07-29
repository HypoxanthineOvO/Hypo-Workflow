# C21-M7 Ambient Maintain And Codex Hook Adapter

## Objective

Automate project memory, recovery, documentation reminders, Subagent evidence, and destructive-operation gates on the user's primary Codex platform.

## Requirements

- Maintain is ambient Journal/Inbox/Record behavior, not a workflow state machine.
- Meaningful turn deltas can become staged Record Patches; ordinary noise is not forced into Records.
- Optional cheap recorder workers produce proposals only; deterministic Core remains authority.
- Support current Codex events: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `SubagentStart`, `SubagentStop`, and `Stop`.
- Hook wrapper emits valid JSON only on stdout and diagnostics only on stderr.
- PreCompact seals Pack; PostCompact records outcome; SessionStart(compact) restores bounded context.
- Deletion uses a hashed Manifest, scoped Receipt, controlled executor, drift revalidation, and evidence report.
- Hook is an additional guardrail, never the sole deletion or authority boundary.
- Documentation/Record reminders are targeted and deduplicated.
- Repair current Codex plugin schema and isolate the legacy Claude Hook config.

## Boundaries

In scope: `core/src/maintain/`, `core/src/codex-hooks/`, `core/src/deletion/`, `core/src/permissions/`, Hook wrapper/config, plugin metadata, synthetic/process/installed-host smoke.

Out of scope: aggregate telemetry, OpenCode/Claude adapters, hard-coded model names in core schema, actual repository cleanup, generic scheduler, quota automation.

## Technical Solution

Hook handlers stay thin: parse official payload, call deterministic Core service, return documented output. Maintain consumes semantic deltas without taking an activity pointer. Deletion is authorized and executed by Core; `PreToolUse` denies obvious direct deletion and provides context, but official docs state interception is incomplete.

Use plugin default `hooks/hooks.json` discovery. Do not add a manifest `hooks` field while the repository's current plugin validator rejects it. Move or isolate the Claude-specific config so Codex does not parse unsupported events or millisecond timeouts.

## Technical Route

1. Write RED tests for ambient capture/promotion, every official Hook fixture, process stdout/stderr, compact recovery, subagent streams, Receipt permissions, deletion drift, and reminder dedupe.
2. Implement semantic-dirty detection, Inbox entries, Record Patch staging, and promotion to Goal/Cycle inputs.
3. Define optional recorder-worker request/result contracts with main-agent Patch fallback when unavailable.
4. Implement one `evaluateCodexHookEvent()` dispatcher plus `hooks/codex-hook.mjs` process wrapper.
5. Map Session/Prompt/Tool/Compact/Subagent/Stop events to Journal, Receipt, Capsule, Pack, and reminder operations.
6. Implement Deletion Manifest creation, hash/git binding, Receipt issue/reserve/execute/consume, drift invalidation, and execution report.
7. Convert default `hooks/hooks.json` to Codex-compatible seconds/schema and isolate old Claude hooks for later adapter work.
8. Repair `.codex-plugin/plugin.json` (`repo_url`, required interface prompts/capabilities) and malformed Resume Skill metadata.
9. Run pure module, official payload, process smoke, available installed Codex/VSP smoke, and compact smoke tiers.
10. Record exact host version and any skipped official-only capability; never call a skipped tier a pass.

## Research Required

Status: resolved.

Evidence:

- Current official Codex Hooks docs define all selected events, fields, decisions, concurrency, trust, and timeout units.
- Official docs state `PreToolUse` interception is incomplete and `PostToolUse` cannot undo effects.
- Current plugin validation fails on `repo_url`, missing `defaultPrompt/capabilities`, and Resume metadata.
- OpenCode, Claude, other adapters, telemetry, and general Automation Jobs are explicitly deferred by the user.

## Risks And Alternatives

- Risk: changed Hook definitions require trust and a new session.
- Risk: official Codex and installed VSP behavior differ.
- Risk: abrupt process termination skips Stop.
- Rejected: extend `codex-notify.sh`; it cannot provide recovery or gates.
- Rejected: Hook as authority; handlers run concurrently and interception is incomplete.
- Rejected: core schema names a Terra model; model selection belongs to adapter policy.
- Mitigation: incremental writes before Stop, thin adapter, official fixtures, installed-host probes, deterministic gates, and explicit capability reports.

## Test Specification

- Ordinary project discussion records meaningful semantic deltas without opening a Cycle.
- Recorder output is a Patch and cannot bypass deterministic writer.
- Every Hook fixture validates input/output schema and expected local effect.
- Wrapper stdout contains exactly one valid Hook response when required.
- Compact sequence yields a valid Pack and expected restored continuation.
- Subagent events preserve role/evidence refs without append corruption.
- No-Receipt deletion leaves target files intact; changed path/hash/Git state invalidates an issued Receipt.
- Reminder frequency remains bounded for repeated tools with no new semantic change.

## Validation Commands

```bash
node --test \
  core/test/maintain-ambient.test.js \
  core/test/codex-hooks-vnext.test.js \
  core/test/deletion-gate.test.js \
  core/test/codex-hook-process.test.js \
  core/test/recovery-pack.test.js

node scripts/codex-hook-smoke.mjs
python3 /home/heyx/.vsp-codex/skills/.system/plugin-creator/scripts/validate_plugin.py .
```

Conditional real-host command:

```bash
CODEX_HOOK_SMOKE=1 node scripts/codex-real-hook-smoke.mjs
```

Pass signal: required tests/process smoke/plugin validation pass; installed host emits real effects where supported; compact restores the expected continuation; unapproved deletion is blocked.

Pseudo-test rejection: mocked dispatcher tests without spawning the wrapper and without at least one installed-host probe do not satisfy M7.

## Evidence Paths

- `.pipeline/reviews/C21/M7/test-evidence.md`
- `.pipeline/reviews/C21/M7/real-host-smoke.md`
- `.pipeline/reviews/C21/M7/implementation-evidence.md`
- `.pipeline/reviews/C21/M7/audit.md`
- `.pipeline/reports/06-ambient-maintain-and-codex-hook-adapter.report.md`

## Audit Focus

- Hook output and timeout units match current official behavior.
- Hook cannot fabricate workflow.commit, verification.complete, or acceptance Receipts.
- Secrets are redacted before every Journal/Pack write.
- Stop is not the sole persistence point.
- Reminder behavior is useful rather than repetitive.
- Host limitations/skips are visible and honest.

## Subworker Assignment Plan

Status: authorized, strict separation.

- `test`: owns official payload fixtures, wrapper/installed-host tests, deletion fixtures, and evidence.
- `implement`: owns Maintain/Core adapter/deletion/plugin changes and cannot edit M7 tests.
- `audit`: independently checks official-schema fidelity, trust/security boundaries, redaction, host evidence, and identity separation.
- Optional `recorder` worker: may produce a Record Patch proposal for evaluation only and cannot satisfy test/implement/audit.
- Main agent: coordinates trust-sensitive smoke and protected state; no role substitution.

## Expected Artifacts

- ambient Maintain and Codex adapter modules
- Codex-compatible plugin Hook package
- deletion gate/executor
- synthetic, process, real-host, and audit evidence
