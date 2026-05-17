# Health Check Spec

Use this reference for `/hw:check`, the quick health probe for a `.pipeline/` workspace.

## Preconditions

- if `.pipeline/` is missing, stop early with `请先运行 /hw:init`
- if a narrower flag is provided, check only that surface

## Check Matrix

| Check | What to inspect | Pass condition |
|---|---|---|
| Config | `.pipeline/config.yaml` exists, parses, and matches `config.schema.yaml`; `~/.hypo-workflow/config.yaml` parses when present | project parse succeeds and schema validation passes; global config is either absent or readable |
| Pipeline | `.pipeline/` directory completeness | `config.yaml` exists and `prompts/` is non-empty |
| State | `state.yaml` consistency | referenced prompt exists and `step_index` is valid |
| Prompts | prompt files referenced by state | each file exists and is non-empty |
| Notion | Notion token + target access, only when `source/output=notion` | API call returns 200 and target page/database is readable |
| Architecture | architecture baseline presence | file or folder exists and is non-empty |
| Execution lease | `.pipeline/.lock` when present | structured lease parses; fresh/stale/malformed status is explicit; malformed leases show repair guidance |

## Command Forms

- `/hw:check`
  Run all seven checks.
- `/hw:check --config`
  Validate config only.
- `/hw:check --notion`
  Check Notion connectivity only.
- `/hw:check --state`
  Check state consistency only.

## Output Format

Use a compact report with per-check status, overall verdict, and next action.

```text
✅ Config       config.yaml valid
⚠️ State       step_index points past the custom sequence length
❌ Architecture missing .pipeline/architecture.md

Overall: warning
Action: run /hw:init --rescan to rebuild architecture, then fix state.yaml.
```

Status meanings:

- `✅` pass
- `⚠️` degraded but recoverable
- `❌` blocking failure

## Action Guidance

- Config failure: fix `config.yaml` first
- Global config warning: rerun `/hypo-workflow:setup` or edit `~/.hypo-workflow/config.yaml`
- Pipeline failure: run `/hw:init`
- State failure: repair or reset state before `/hw:resume`
- Execution lease warning: fresh foreign lease means wait or confirm handoff; stale lease can be taken over with evidence; malformed lease requires `/hw:check` repair guidance before resume
- Prompt failure: recreate or restore prompt files
- Notion failure: verify token, permissions, and target ids
- Architecture failure: run `/hw:init --rescan`
