#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

test -x cli/bin/hypo-workflow
test -f cli/README.md

tmp_home="$(mktemp -d)"
tmp_project="$(mktemp -d)"

HOME="$tmp_home" node cli/bin/hypo-workflow setup --platform opencode --model qwen --yes
test -f "$tmp_home/.hypo-workflow/config.yaml"
grep -Fq 'platform: opencode' "$tmp_home/.hypo-workflow/config.yaml"
grep -Fq 'model: qwen' "$tmp_home/.hypo-workflow/config.yaml"

HOME="$tmp_home" node cli/bin/hypo-workflow profile list > "$tmp_home/profiles.txt"
grep -Fq 'opencode' "$tmp_home/profiles.txt"
grep -Fq 'team-strict' "$tmp_home/profiles.txt"

HOME="$tmp_home" node cli/bin/hypo-workflow profile use team-strict
grep -Fq 'active_profile: team-strict' "$tmp_home/.hypo-workflow/config.yaml"

HOME="$tmp_home" node cli/bin/hypo-workflow profile edit opencode --model kimi --platform opencode
grep -Fq 'model: kimi' "$tmp_home/.hypo-workflow/profiles/opencode.yaml"

HOME="$tmp_home" node cli/bin/hypo-workflow doctor > "$tmp_home/doctor.txt"
grep -Fq 'Hypo-Workflow Doctor' "$tmp_home/doctor.txt"
grep -Fq 'OpenCode:' "$tmp_home/doctor.txt"
grep -Fq 'Codex:' "$tmp_home/doctor.txt"
grep -Fq 'Claude Code:' "$tmp_home/doctor.txt"

HOME="$tmp_home" node cli/bin/hypo-workflow sync --platform opencode --project "$tmp_project"
test -f "$tmp_project/.opencode/commands/hw:plan.md"
test -f "$tmp_project/.opencode/agents/hw-plan.md"
test -f "$tmp_project/.opencode/opencode.json"
test ! -f "$tmp_project/tui.json"
test ! -f "$tmp_project/.opencode/tui/hypo-workflow-tui.tsx"

HOME="$tmp_home" node cli/bin/hypo-workflow init-project --platform opencode --project "$tmp_project"
test -f "$tmp_project/.pipeline/config.yaml"
test -f "$tmp_project/.opencode/commands/hw:start.md"

node cli/bin/hypo-workflow --help > "$tmp_home/help.txt"
grep -Fq 'setup utility, not a runner' "$tmp_home/help.txt"
! grep -Fq 'start pipeline' "$tmp_home/help.txt"

echo "s53 passed"
