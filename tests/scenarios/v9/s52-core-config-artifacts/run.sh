#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

tmp_user="${USER:-$(id -un 2>/dev/null || echo unknown)}"
tmp_log_dir="${TMPDIR:-/tmp}/${tmp_user}"
mkdir -p "$tmp_log_dir"
chmod 700 "$tmp_log_dir" 2>/dev/null || true

commands_log="$(mktemp "$tmp_log_dir/hw-core-commands.XXXXXX.json")"
rules_log="$(mktemp "$tmp_log_dir/hw-core-rules.XXXXXX.txt")"
shell_rules_log="$(mktemp "$tmp_log_dir/hw-shell-rules.XXXXXX.txt")"
artifact_dir="$(mktemp -d "$tmp_log_dir/hw-opencode-artifacts.XXXXXX")"

test -f core/package.json
test -x core/bin/hw-core
test -f core/src/index.js
test -f core/src/config/index.js
test -f core/src/profile/index.js
test -f core/src/platform/index.js
test -f core/src/commands/index.js
test -f core/src/rules/index.js
test -f core/src/artifacts/opencode.js

node --test core/test/*.test.js

node core/bin/hw-core commands --platform opencode > "$commands_log"
grep -Fq '"canonical": "/hw:plan"' "$commands_log"
grep -Fq '"opencode": "/hw:plan"' "$commands_log"

node core/bin/hw-core rules --project . > "$rules_log"
grep -Fq 'Rules:' "$rules_log"
grep -Fq 'git-clean-check' "$rules_log"

bash scripts/rules-summary.sh . > "$shell_rules_log"
grep -Fq 'Rules:' "$shell_rules_log"

node core/bin/hw-core artifact opencode --out "$artifact_dir"
test -f "$artifact_dir/.opencode/commands/hw:plan.md"
test -f "$artifact_dir/.opencode/agents/hw-plan.md"
test -f "$artifact_dir/opencode.json"
test -f "$artifact_dir/.opencode/hypo-workflow.json"
test -f "$artifact_dir/AGENTS.md"
grep -Fq '/hw:plan' "$artifact_dir/.opencode/commands/hw:plan.md"
grep -Fq 'todowrite' "$artifact_dir/.opencode/agents/hw-plan.md"
grep -Fq '"compaction"' "$artifact_dir/opencode.json"
grep -Fq '"auto_continue"' "$artifact_dir/.opencode/hypo-workflow.json"

grep -Riq 'not a runner' core README.md references/v9-architecture.md

echo "s52 passed"
