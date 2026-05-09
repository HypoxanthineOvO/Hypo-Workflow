#!/bin/bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../../../.." && pwd)"

cd "$repo_root"

rg -q 'version: [0-9]+\.[0-9]+\.[0-9]+' SKILL.md
rg -q '查看全部 39 个用户指令' SKILL.md
rg -q '\| `/hw:compact` \|' SKILL.md
rg -q '\| `/hw:knowledge` \|' SKILL.md
rg -q '\| `/hw:guide` \|' SKILL.md
rg -q '\| `/hw:rules` \|' SKILL.md
rg -q '/hw:patch fix' README.md
rg -q '/hw:compact' README.md
rg -q '/hw:guide' README.md
rg -q '/hw:rules' README.md
rg -q '39 个用户指令' README.md
rg -q '\[Commands Reference\]\(docs/reference/commands.md\)' README.md
rg -q '"version": "[0-9]+\.[0-9]+\.[0-9]+"' .claude-plugin/plugin.json

echo "s43-v8-2-registration: PASS"
