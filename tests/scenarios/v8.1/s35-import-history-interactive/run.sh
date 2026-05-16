#!/bin/bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../../../.." && pwd)"

cd "$repo_root"

rg -q -- '--interactive' skills/init/SKILL.md
rg -q 'wait for user confirmation|等待明确确认' skills/init/SKILL.md
rg -q 'merge, split, rename, or switch signal|合并、拆分、重命名或切换拆分信号' skills/init/SKILL.md
rg -q -- '--import-history --interactive' references/commands-spec.md
rg -q 'Support `--rescan`, `--folder`, `--single`, `--import-history`, and `--import-history --interactive`' SKILL.md
rg -q 'with `--import-history --interactive`, show the proposed split and wait for explicit user confirmation' references/commands-spec.md

echo "s35-import-history-interactive: PASS"
