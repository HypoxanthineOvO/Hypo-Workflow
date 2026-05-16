#!/bin/bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../../../.." && pwd)"

cd "$repo_root"

rg -q 'Keep unselected artifacts unchanged|保持未选定的工件不变' skills/showcase/SKILL.md
rg -Fq 'history/v{N}' skills/showcase/SKILL.md
rg -q 'version: 3' skills/showcase/SKILL.md
rg -q 'completeness: selected artifacts exist|完整性：选定工件存在' skills/showcase/SKILL.md
rg -q 'accuracy: data matches the analyze summary|准确性：数据匹配分析摘要' skills/showcase/SKILL.md
rg -q '/hw:showcase --all' skills/showcase/SKILL.md
rg -q 'artifacts generated, review' skills/showcase/SKILL.md

echo "s47-showcase-lifecycle: PASS"
