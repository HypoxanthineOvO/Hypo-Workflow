#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

tmp_user="${USER:-$(id -un 2>/dev/null || echo unknown)}"
tmp_log_dir="${TMPDIR:-/tmp}/${tmp_user}"
mkdir -p "$tmp_log_dir"
chmod 700 "$tmp_log_dir" 2>/dev/null || true

opencode_debug_log="$(mktemp "$tmp_log_dir/hw-s54-opencode-config.XXXXXX.log")"

test -f plugins/opencode/templates/plugin.ts
test -f plugins/opencode/templates/AGENTS.md
test -f plugins/opencode/templates/package.json
test -f plugins/opencode/README.md

tmp_home="$(mktemp -d)"
tmp_project="$(mktemp -d)"
tmp_xdg_data="$(mktemp -d)"

HOME="$tmp_home" node cli/bin/hypo-workflow init-project --platform opencode --project "$tmp_project"

test -f "$tmp_project/opencode.json"
test -f "$tmp_project/AGENTS.md"
test -f "$tmp_project/.opencode/package.json"
test -f "$tmp_project/.opencode/hypo-workflow.json"
test -f "$tmp_project/.opencode/plugins/hypo-workflow.ts"
test -f "$tmp_project/.opencode/commands/hw:plan.md"
test -f "$tmp_project/.opencode/agents/hw-plan.md"

grep -Fq 'Hypo-Workflow managed' "$tmp_project/AGENTS.md"
grep -Fq 'version' "$tmp_project/.opencode/package.json"
grep -Fq 'permission:' "$tmp_project/.opencode/agents/hw-plan.md"
! grep -Fq 'tools: read, grep' "$tmp_project/.opencode/agents/hw-plan.md"
grep -Fq 'commandMap' "$tmp_project/.opencode/plugins/hypo-workflow.ts"
grep -Fq '/hw:plan' "$tmp_project/.opencode/plugins/hypo-workflow.ts"
grep -Fq 'tool.execute.before' "$tmp_project/.opencode/plugins/hypo-workflow.ts"
grep -Fq 'session.idle' "$tmp_project/.opencode/plugins/hypo-workflow.ts"
grep -Fq 'does not implement business tasks' "$tmp_project/.opencode/plugins/hypo-workflow.ts"
grep -Fq '"compaction"' "$tmp_project/opencode.json"
grep -Fq '"auto_continue"' "$tmp_project/.opencode/hypo-workflow.json"

if command -v opencode >/dev/null 2>&1; then
  (cd "$tmp_project" && HOME="$tmp_home" XDG_DATA_HOME="$tmp_xdg_data" opencode debug config >"$opencode_debug_log" 2>&1) || {
    cat "$opencode_debug_log" >&2
    exit 1
  }
fi

echo "s54 passed"
