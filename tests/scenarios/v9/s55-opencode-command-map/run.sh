#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

tmp_user="${USER:-$(id -un 2>/dev/null || echo unknown)}"
tmp_log_dir="${TMPDIR:-/tmp}/${tmp_user}"
mkdir -p "$tmp_log_dir"
chmod 700 "$tmp_log_dir" 2>/dev/null || true

init_log="$(mktemp "$tmp_log_dir/hw-s55-init.XXXXXX.log")"

tmp_project="$(mktemp -d)"
tmp_home="$(mktemp -d)"
HOME="$tmp_home" node cli/bin/hypo-workflow init-project --platform opencode --project "$tmp_project" >"$init_log"

count="$(find "$tmp_project/.opencode/commands" -maxdepth 1 -type f -name 'hw-*.md' | wc -l | tr -d ' ')"
test "$count" = "36" || {
  echo "expected 36 command files, found $count" >&2
  exit 1
}

grep -Fq 'agent: hw-plan' "$tmp_project/.opencode/commands/hw-plan.md"
grep -Fq 'agent: hw-plan' "$tmp_project/.opencode/commands/hw-plan-discover.md"
grep -Fq 'agent: hw-plan' "$tmp_project/.opencode/commands/hw-plan-confirm.md"
grep -Fq 'agent: hw-build' "$tmp_project/.opencode/commands/hw-start.md"
grep -Fq 'agent: hw-build' "$tmp_project/.opencode/commands/hw-resume.md"
grep -Fq 'agent: hw-build' "$tmp_project/.opencode/commands/hw-patch-fix.md"
grep -Fq 'agent: hw-build' "$tmp_project/.opencode/commands/hw-release.md"
grep -Fq 'agent: hw-build' "$tmp_project/.opencode/commands/hw-chat.md"
grep -Fq 'agent: hw-build' "$tmp_project/.opencode/commands/hw-accept.md"
grep -Fq 'agent: hw-build' "$tmp_project/.opencode/commands/hw-reject.md"
grep -Fq 'agent: hw-build' "$tmp_project/.opencode/commands/hw-sync.md"
grep -Fq 'agent: hw-docs' "$tmp_project/.opencode/commands/hw-docs.md"
grep -Fq 'agent: hw-explore' "$tmp_project/.opencode/commands/hw-explore.md"
grep -Fq 'agent: hw-review' "$tmp_project/.opencode/commands/hw-audit.md"
grep -Fq 'agent: hw-status' "$tmp_project/.opencode/commands/hw-status.md"
grep -Fq 'agent: hw-compact' "$tmp_project/.opencode/commands/hw-knowledge.md"

for pair in \
  "hw-plan.md:/hw:plan" \
  "hw-plan-discover.md:/hw:plan:discover" \
  "hw-patch-fix.md:/hw:patch fix" \
  "hw-chat.md:/hw:chat" \
  "hw-accept.md:/hw:accept" \
  "hw-reject.md:/hw:reject" \
  "hw-explore.md:/hw:explore" \
  "hw-sync.md:/hw:sync" \
  "hw-docs.md:/hw:docs" \
  "hw-knowledge.md:/hw:knowledge"
do
  file="${pair%%:*}"
  command="${pair#*:}"
  grep -Fq "$command" "$tmp_project/.opencode/commands/$file" || {
    echo "$file missing canonical $command" >&2
    exit 1
  }
done

grep -Fq 'Load the corresponding Hypo-Workflow skill instructions' "$tmp_project/.opencode/commands/hw-plan.md"
grep -Fq '.pipeline/state.yaml' "$tmp_project/.opencode/commands/hw-start.md"
grep -Fq '.pipeline/rules.yaml' "$tmp_project/.opencode/commands/hw-rules.md"

test -f references/opencode-command-map.md
grep -Fq '| `/hw:plan` | `/hw-plan` | `hw-plan` |' references/opencode-command-map.md
grep -Fq '| `/hw:patch fix` | `/hw-patch-fix` | `hw-build` |' references/opencode-command-map.md
grep -Fq '| `/hw:accept` | `/hw-accept` | `hw-build` |' references/opencode-command-map.md
grep -Fq '| `/hw:reject` | `/hw-reject` | `hw-build` |' references/opencode-command-map.md
grep -Fq '| `/hw:explore` | `/hw-explore` | `hw-explore` |' references/opencode-command-map.md
grep -Fq '| `/hw:sync` | `/hw-sync` | `hw-build` |' references/opencode-command-map.md
grep -Fq '| `/hw:docs` | `/hw-docs` | `hw-docs` |' references/opencode-command-map.md
grep -Fq '| `/hw:knowledge` | `/hw-knowledge` | `hw-compact` |' references/opencode-command-map.md

echo "s55 passed"
