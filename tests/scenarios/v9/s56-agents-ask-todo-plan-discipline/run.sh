#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

tmp_user="${USER:-$(id -un 2>/dev/null || echo unknown)}"
tmp_log_dir="${TMPDIR:-/tmp}/${tmp_user}"
mkdir -p "$tmp_log_dir"
chmod 700 "$tmp_log_dir" 2>/dev/null || true

init_log="$(mktemp "$tmp_log_dir/hw-s56-init.XXXXXX.log")"

tmp_project="$(mktemp -d)"
tmp_home="$(mktemp -d)"
HOME="$tmp_home" node cli/bin/hypo-workflow init-project --platform opencode --project "$tmp_project" >"$init_log"

for agent in hw-plan hw-build hw-explore hw-review hw-debug hw-docs; do
  test -f "$tmp_project/.opencode/agents/$agent.md" || {
    echo "missing agent $agent" >&2
    exit 1
  }
done

grep -Fq 'question' "$tmp_project/.opencode/agents/hw-plan.md"
grep -Fq 'todowrite' "$tmp_project/.opencode/agents/hw-plan.md"
grep -Fq 'Ask' "$tmp_project/.opencode/agents/hw-plan.md"

grep -Fq 'agent: hw-plan' "$tmp_project/.opencode/commands/hw-plan.md"
grep -Fq 'agent: hw-plan' "$tmp_project/.opencode/commands/hw-plan-decompose.md"
grep -Fq 'question' "$tmp_project/.opencode/commands/hw-plan.md"
grep -Fq 'todowrite' "$tmp_project/.opencode/commands/hw-plan.md"

grep -Fq 'todo.updated' "$tmp_project/.opencode/plugins/hypo-workflow.ts"
grep -Fq '.plan-state/todo.yaml' "$tmp_project/.opencode/plugins/hypo-workflow.ts"

test -f rules/builtin/plan-tool-required.yaml
grep -Fq 'plan-tool-required: warn' rules/presets/recommended.yaml
grep -Fq 'plan-tool-required: error' rules/presets/strict.yaml
grep -Fq 'plan-tool-required: off' rules/presets/minimal.yaml

grep -Fq 'Plan 工具纪律' SKILL.md
grep -Fq 'plan-tool-required' skills/plan/SKILL.md
grep -Fq 'P1/P2/P3/P4 checkpoint' skills/plan/SKILL.md

echo "s56 passed"
