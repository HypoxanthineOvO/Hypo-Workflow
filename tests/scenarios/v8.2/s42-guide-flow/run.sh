#!/bin/bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../../../.." && pwd)"

cd "$repo_root"

test -f skills/guide/SKILL.md
rg -q '/hw:guide' skills/guide/SKILL.md
rg -q 'at most 5 lines|最多打印 5 行' skills/guide/SKILL.md
rg -q '你现在想做什么？' skills/guide/SKILL.md
rg -q 'Start a new project from zero|从零开始新项目' skills/guide/SKILL.md
rg -q '/hw:init --import-history' skills/guide/SKILL.md
rg -q '/hw:compact' skills/guide/SKILL.md
rg -q '要我帮你开始吗？' skills/guide/SKILL.md
rg -q 'execute the first command|执行推荐流程中的第一个命令' skills/guide/SKILL.md

echo "s42-guide-flow: PASS"
