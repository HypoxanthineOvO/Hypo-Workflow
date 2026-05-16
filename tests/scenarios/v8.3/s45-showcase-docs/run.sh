#!/bin/bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../../../.." && pwd)"

cd "$repo_root"

rg -q 'README.md.*required|README.md.*必需' skills/showcase/SKILL.md
rg -q 'SKILL.md' skills/showcase/SKILL.md
rg -q 'PROJECT-INTRO.md' skills/showcase/SKILL.md
rg -q 'TECHNICAL-DOC.md' skills/showcase/SKILL.md
rg -q 'non-developer users|非开发人员用户' skills/showcase/SKILL.md
rg -q 'developers and contributors|开发人员和贡献者' skills/showcase/SKILL.md
rg -q 'artifacts:' skills/showcase/SKILL.md

echo "s45-showcase-docs: PASS"
