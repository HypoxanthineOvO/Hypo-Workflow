#!/bin/bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../../../.." && pwd)"

cd "$repo_root"

test -f skills/rules/SKILL.md
test -f references/rules-spec.md
test -x scripts/rules-summary.sh

test "$(find rules/builtin -maxdepth 1 -type f -name '*.yaml' | wc -l | tr -d ' ')" = "16"
test "$(find rules/presets -maxdepth 1 -type f -name '*.yaml' | wc -l | tr -d ' ')" = "3"
test -f rules/template/custom-rule-template.md

rg -q '\| `/hw:rules` \|' SKILL.md
rg -q '/hw:rules' skills/help/SKILL.md
rg -q 'rules.extends' references/config-spec.md
rg -q 'rules:' config.schema.yaml
rg -q '\| `/hw:rules` \|' docs/reference/commands.md
rg -q '/hw:rules' README.md
rg -q '39 个用户指令' README.md
rg -q '"version": "[0-9]+\.[0-9]+\.[0-9]+"' .claude-plugin/plugin.json

summary="$(bash scripts/rules-summary.sh "$repo_root")"
printf '%s\n' "$summary" | rg -q 'Rules: recommended'
printf '%s\n' "$summary" | rg -q 'git-clean-check[[:space:]]+guard[[:space:]]+warn[[:space:]]+pre-milestone'
printf '%s\n' "$summary" | rg -q 'knowledge-ledger-self-check[[:space:]]+hook[[:space:]]+warn[[:space:]]+post-step,post-milestone'
printf '%s\n' "$summary" | rg -q 'plan-tool-required[[:space:]]+workflow[[:space:]]+warn'
printf '%s\n' "$summary" | rg -q 'session-start-context-load[[:space:]]+hook[[:space:]]+error[[:space:]]+on-session-start'
printf '%s\n' "$summary" | rg -q 'Summary: 15/17 enabled'
printf '%s\n' "$summary" | rg -q 'prefer-chinese-output'
printf '%s\n' "$summary" | rg -q 'report-language'

tmp="$(mktemp -d)"
mkdir -p "$tmp/.pipeline/rules/custom"
cat > "$tmp/.pipeline/state.yaml" <<'YAML'
pipeline:
  name: rules-test
  status: running
current:
  prompt_file: 01-feature.md
  step: implement
  step_index: 2
YAML
cat > "$tmp/.pipeline/rules.yaml" <<'YAML'
extends: strict
rules:
  commit-format: warn
YAML
cat > "$tmp/.pipeline/rules/custom/prefer-chinese-comments.md" <<'MD'
# prefer-chinese-comments

- **标签**: style
- **严格度**: warn
- **钩子点**: always

## 规则内容

代码注释使用中文。变量名和函数名仍使用英文。
MD

hook_out="$(printf '{"cwd":"%s"}' "$tmp" | bash hooks/session-start.sh startup)"
printf '%s\n' "$hook_out" | rg -q 'Rules Context'
printf '%s\n' "$hook_out" | rg -q 'Rules: strict'
printf '%s\n' "$hook_out" | rg -q 'prefer-chinese-comments'

echo "s50-rules-system: PASS"
