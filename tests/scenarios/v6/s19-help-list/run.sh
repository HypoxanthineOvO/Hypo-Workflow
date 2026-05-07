#!/bin/bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../../../.." && pwd)"

cd "$repo_root"

count="$(awk '
  /^## Commands$/ {in_table=1; next}
  in_table && /^\| `\/hw:/ {c++}
  in_table && /^When the user types/ {print c; exit}
' SKILL.md)"

test "$count" = "38"
rg -q '38 user-facing commands across Setup, Pipeline, Plan, Lifecycle, Docs, Review, Explain, and Utility groups' references/commands-spec.md
rg -q 'lists all 38 user-facing commands grouped under Setup, Pipeline, Plan, Lifecycle, Docs, Review, Explain, and Utility' references/commands-spec.md
rg -q '\| `/hw:cycle` \|' SKILL.md
rg -q '\| `/hw:accept` \|' SKILL.md
rg -q '\| `/hw:reject` \|' SKILL.md
rg -q '\| `/hw:explore` \|' SKILL.md
rg -q '\| `/hw:sync` \|' SKILL.md
rg -q '\| `/hw:docs` \|' SKILL.md
rg -q '\| `/hw:patch` \|' SKILL.md
rg -q '\| `/hw:pr` \|' SKILL.md
rg -q '\| `/hw:explain` \|' SKILL.md
rg -q '\| `/hw:compact` \|' SKILL.md
rg -q '\| `/hw:knowledge` \|' SKILL.md
rg -q '\| `/hw:guide` \|' SKILL.md
rg -q '\| `/hw:showcase` \|' SKILL.md
rg -q '\| `/hw:rules` \|' SKILL.md
rg -q '\| `/hw:plan:extend` \|' SKILL.md
rg -q '^## 命令概览$' README.md
rg -q '\| Pipeline \|' README.md
rg -q '\| Plan \|' README.md
rg -q '\| Lifecycle \|' README.md
rg -q '\| Analysis/Review \|' README.md
rg -q '\| Utility \|' README.md
rg -q '\[Commands Reference\]\(docs/reference/commands.md\)' README.md

echo "s19-help-list: PASS"
