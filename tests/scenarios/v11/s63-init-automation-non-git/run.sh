#!/bin/bash
set -euo pipefail

tmp_home="$(mktemp -d)"
tmp_project="$(mktemp -d)"
repo_root="$(cd "$(dirname "$0")/../../../.." && pwd)"
tmp_user="${USER:-$(id -un 2>/dev/null || echo unknown)}"
tmp_log_dir="${TMPDIR:-/tmp}/${tmp_user}"
mkdir -p "$tmp_log_dir"
chmod 700 "$tmp_log_dir" 2>/dev/null || true

init_log="$(mktemp "$tmp_log_dir/hw-s63-init.XXXXXX.log")"
bad_log="$(mktemp "$tmp_log_dir/hw-s63-bad.XXXXXX.log")"

HOME="$tmp_home" node "$repo_root/cli/bin/hypo-workflow" init-project --platform opencode --project "$tmp_project" --automation full >"$init_log"

test -f "$tmp_project/.pipeline/config.yaml"
test ! -d "$tmp_project/.git"
grep -Fq 'automation:' "$tmp_project/.pipeline/config.yaml"
grep -Fq '  level: full' "$tmp_project/.pipeline/config.yaml"
! grep -Fq 'levels:' "$tmp_project/.pipeline/config.yaml"
bash "$repo_root/scripts/validate-config.sh" "$tmp_project/.pipeline/config.yaml"

bad_config="$tmp_project/.pipeline/bad-config.yaml"
cp "$tmp_project/.pipeline/config.yaml" "$bad_config"
perl -0pi -e 's/level: full/level: reckless/' "$bad_config"
if bash "$repo_root/scripts/validate-config.sh" "$bad_config" >"$bad_log" 2>&1; then
  echo "expected invalid automation level to fail"
  exit 1
fi
grep -Fq 'automation.level must be one of: manual, balanced, full' "$bad_log"

echo "s63-init-automation-non-git: PASS"
