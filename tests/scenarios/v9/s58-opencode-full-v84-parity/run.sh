#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

tmp_user="${USER:-$(id -un 2>/dev/null || echo unknown)}"
tmp_log_dir="${TMPDIR:-/tmp}/${tmp_user}"
mkdir -p "$tmp_log_dir"
chmod 700 "$tmp_log_dir" 2>/dev/null || true

init_log="$(mktemp "$tmp_log_dir/hw-s58-init.XXXXXX.log")"

tmp_project="$(mktemp -d)"
tmp_home="$(mktemp -d)"
HOME="$tmp_home" node cli/bin/hypo-workflow init-project --platform opencode --project "$tmp_project" >"$init_log"

for command in cycle patch compact showcase release audit debug check reset log report status guide rules; do
  test -f "$tmp_project/.opencode/commands/hw:$command.md" || {
    echo "missing OpenCode command hw:$command" >&2
    exit 1
  }
done
test -f "$tmp_project/.opencode/commands/hw:patch:fix.md" || {
  echo "missing OpenCode command hw:patch:fix" >&2
  exit 1
}

grep -Fq 'Step 1: Read Patch' "$tmp_project/.opencode/commands/hw:patch:fix.md"
grep -Fq 'Step 8: Close or gate pending acceptance' "$tmp_project/.opencode/commands/hw:patch:fix.md"
grep -Fq 'implement` must not write tests or spawn validation roles' "$tmp_project/.opencode/commands/hw:patch:fix.md"
grep -Fq 'do not run Plan Discover' "$tmp_project/.opencode/commands/hw:patch:fix.md"

grep -Fq 'claude plugin validate .' "$tmp_project/.opencode/commands/hw:release.md"
grep -Fq 'Ask gate before tag or push' "$tmp_project/.opencode/commands/hw:release.md"
grep -Fq 'dirty check' "$tmp_project/.opencode/commands/hw:release.md"
grep -Fq 'git tag' "$tmp_project/.opencode/commands/hw:release.md"
grep -Fq 'git push' "$tmp_project/.opencode/commands/hw:release.md"

grep -Fq 'session.compacted' "$tmp_project/.opencode/commands/hw:compact.md"
grep -Fq 'Agent generates showcase artifacts' "$tmp_project/.opencode/commands/hw:showcase.md"

test -f references/opencode-parity.md
grep -Fq '| Cycle |' references/opencode-parity.md
grep -Fq '| Patch Fix |' references/opencode-parity.md
grep -Fq '| Release |' references/opencode-parity.md
grep -Fq 'V8.4 parity' references/opencode-spec.md

echo "s58 passed"
