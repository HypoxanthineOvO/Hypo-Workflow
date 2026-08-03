# Hypo-Workflow Hooks

Hooks provide bounded recovery, relevant reminders, worker evidence, and an additional safety guardrail. They do not own Delivery lifecycle, Experiment records, human acceptance, or permission authority. Non-safety Hook processing is best-effort and must not block host work.

## Official Codex Adapter

Enabled plugins discover `hooks/hooks.json` by default. Hypo-Workflow uses one process wrapper for ten current events:

- `SessionStart`
- `UserPromptSubmit`
- `PreToolUse`
- `PermissionRequest`
- `PostToolUse`
- `PreCompact`
- `PostCompact`
- `SubagentStart`
- `SubagentStop`
- `Stop`

Commands use `PLUGIN_ROOT` to locate the installed bundle. Timeout values are seconds. `hooks/codex-hook.mjs` writes exactly one valid JSON line to stdout and sends diagnostics to stderr. Wrapper, import, or host-payload compatibility failures emit `{}` with exit status 0 so a reminder cannot disable the host.

Main behavior:

- `UserPromptSubmit` reminds the main Agent to use semantic judgment. For a selected Experiment it also reminds the Agent to maintain the ordinary-file Experiment record.
- `PostToolUse` records bounded tool evidence and emits effect-aware, deduplicated docs/Record reminders.
- `PreCompact` seals a Recovery Pack from a validated Capsule; `PostCompact` records the outcome.
- `SessionStart(source=compact)` injects bounded restore context, never a raw transcript or full Journal.
- `SubagentStart` and `SubagentStop` use per-writer Journal streams for role and evidence references.
- An unbound Session is reported as context; it does not block prompts, tools, diagnostics, or ordinary Experiment record writes.
- `PreToolUse` and `PermissionRequest` reject or explain obvious direct deletion paths. They do not enforce Session selection.

## Trust And Limits

Non-managed plugin Hooks do not run merely because the plugin is installed. Review and trust them through Codex `/hooks`. Trust is hash-bound, so changed definitions require review again. Project-local discovery also depends on project trust.

Multiple matching command Hooks launch concurrently. `PreToolUse` interception is incomplete and does not cover every equivalent execution path. Hooks are therefore reminders, guardrails, and optional evidence producers, not a complete enforcement boundary or a source of workflow correctness. Auxiliary Hook errors degrade to a bounded warning; only explicit safety guards return a denial.

Real deletion requires all of:

1. an exact hashed Deletion Manifest with Git binding shown in chat
2. fresh explicit user approval for that Manifest
3. a scoped `deletion.execute` Receipt
4. Core controlled executor revalidation immediately before execution

Hash, tree, or Git drift invalidates the authorization and returns to the user gate.

## Ambient Maintain Authority

Ambient capture first produces a Journal event and staged Inbox proposal. A proposal is not a durable Record. Only the main Agent may promote an exact bound `RecordPatch`, after which Core writes the Markdown Record and refreshes derived indexes. Recorder Subagents may propose but cannot commit authority.

Raw credentials, full transcripts, and hidden reasoning are excluded. Metadata-only `secret_refs` may point to separately authorized secret locations.

## Deferred Platforms

Claude Code Hook files remain isolated under `hooks/claude/` as deferred source material. OpenCode and other platform adapters are also deferred. These assets do not constitute current adapter support and must not be parsed as Official Codex Hook configuration.

## Validation

```bash
node scripts/codex-hook-smoke.mjs
python3 /home/heyx/.vsp-codex/skills/.system/plugin-creator/scripts/validate_plugin.py .
```

Real-host probing is conditional:

```bash
CODEX_HOOK_SMOKE=1 node scripts/codex-real-hook-smoke.mjs
```

If the compatible current Official Codex host, plugin enablement, or Hook trust path is unavailable, report `SKIP` / `UNAVAILABLE`. Never count an old binary or VSP fork as a current-host PASS.
