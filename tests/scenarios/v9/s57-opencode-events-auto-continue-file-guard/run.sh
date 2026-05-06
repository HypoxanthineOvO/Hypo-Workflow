#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

tmp_user="${USER:-$(id -un 2>/dev/null || echo unknown)}"
tmp_log_dir="${TMPDIR:-/tmp}/${tmp_user}"
mkdir -p "$tmp_log_dir"
chmod 700 "$tmp_log_dir" 2>/dev/null || true

setup_log="$(mktemp "$tmp_log_dir/hw-s57-setup.XXXXXX.log")"
init_log="$(mktemp "$tmp_log_dir/hw-s57-init.XXXXXX.log")"

tmp_home="$(mktemp -d)"
tmp_project="$(mktemp -d)"
HOME="$tmp_home" node cli/bin/hypo-workflow setup --platform opencode --yes >"$setup_log"
HOME="$tmp_home" node cli/bin/hypo-workflow init-project --platform opencode --project "$tmp_project" >"$init_log"
plugin="$tmp_project/.opencode/plugins/hypo-workflow.ts"
runtime="$tmp_project/.opencode/runtime/hypo-workflow-hooks.js"
metadata="$tmp_project/.opencode/hypo-workflow.json"

grep -Fq 'auto_continue' "$metadata"
grep -Fq '"enabled": true' "$metadata"
grep -Fq '"mode": "safe"' "$metadata"

for event in \
  'command.executed' \
  'tool.execute.before' \
  'tool.execute.after' \
  'session.idle' \
  'session.compacted' \
  'permission.asked' \
  'permission.replied'
do
  grep -Fq "$event" "$plugin" || {
    echo "missing event $event" >&2
    exit 1
  }
done

grep -Fq 'recordCommandContext' "$plugin"
grep -Fq 'shouldOpenCodeAutoContinue' "$plugin"
grep -Fq 'evaluateOpenCodeFileGuard' "$plugin"
grep -Fq 'restoreCompactContext' "$plugin"
grep -Fq '.pipeline/state.yaml' "$plugin"
grep -Fq '.pipeline/PROGRESS' "$plugin"
grep -Fq '.pipeline/cycle.yaml' "$plugin"
grep -Fq '.pipeline/rules.yaml' "$plugin"
grep -Fq '.pipeline/patches' "$plugin"
grep -Fq 'recordPermissionEvent' "$plugin"

test -f "$runtime"
grep -Fq 'export function evaluateOpenCodeFileGuard' "$runtime"
grep -Fq 'export function decideOpenCodePermission' "$runtime"
grep -Fq 'export function shouldOpenCodeAutoContinue' "$runtime"
grep -Fq 'mode === "safe"' "$runtime"
grep -Fq 'mode === "ask"' "$runtime"
grep -Fq 'mode === "aggressive"' "$runtime"
grep -Fq 'behavior: "deny"' "$runtime"
grep -Fq 'severity: "warn"' "$runtime"
grep -Fq '.pipeline/knowledge/' "$runtime"
grep -Fq '.hypo-workflow/worktrees' "$runtime"
grep -Fq '.hypo-workflow/secrets.yaml' "$runtime"

echo "s57 passed"
