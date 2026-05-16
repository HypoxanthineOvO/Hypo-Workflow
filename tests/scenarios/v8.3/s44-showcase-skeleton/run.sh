#!/bin/bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../../../.." && pwd)"

cd "$repo_root"

test -f skills/showcase/SKILL.md
rg -q '/hw:showcase --all' skills/showcase/SKILL.md
rg -q '/hw:showcase --doc --poster' skills/showcase/SKILL.md
rg -q 'preset: showcase' skills/showcase/SKILL.md
rg -q -- '- analyze' skills/showcase/SKILL.md
rg -q -- '- review' skills/showcase/SKILL.md
rg -q 'Do not auto-generate all artifacts in interactive mode|不要在交互模式下自动生成所有工件' skills/showcase/SKILL.md
rg -q '\| `/hw:showcase` \|' SKILL.md

echo "s44-showcase-skeleton: PASS"
