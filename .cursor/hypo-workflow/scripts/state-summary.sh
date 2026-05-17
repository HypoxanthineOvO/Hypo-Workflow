#!/bin/bash
# Pipeline State Summary — 提取 state.yaml 关键信息
#
# 用法：bash scripts/state-summary.sh [pipeline_dir]
#   pipeline_dir 默认为 .pipeline
#
# 输出（stdout）：
#   Pipeline: <name>
#   Status: <status>
#   Current: <prompt_file> / <step> (step_index: N)
#   Last completed: <prompt> - <status> (diff_score: N)
#
# 如果 state.yaml 不存在，输出 "No active pipeline" 并退出 0
#
# 实现要求：
# - 纯 bash + grep/sed/awk，不依赖 python 或 yq
# - 执行时间 < 500ms
# - 被 V3 Hook 的 session-start.sh 复用

set -euo pipefail

pipeline_dir="${1:-.pipeline}"
state_file="$pipeline_dir/state.yaml"

if [[ ! -f "$state_file" ]]; then
  echo "No active pipeline"
  exit 0
fi

awk '
function trim(value) {
  gsub(/^[[:space:]"]+|[[:space:]"]+$/, "", value)
  return value
}
/^pipeline:/ { section="pipeline"; next }
/^current:/ { section="current"; next }
/^history:/ { section="history"; next }
/^[^[:space:]]/ {
  if ($0 !~ /^(pipeline|current|history):/) {
    section=""
  }
}
section=="pipeline" && match($0, /^[[:space:]]*name:[[:space:]]*(.*)$/, m) {
  pipeline_name=trim(m[1])
}
section=="pipeline" && match($0, /^[[:space:]]*status:[[:space:]]*(.*)$/, m) {
  pipeline_status=trim(m[1])
}
section=="current" && match($0, /^[[:space:]]*prompt_file:[[:space:]]*(.*)$/, m) {
  current_prompt=trim(m[1])
}
section=="current" && match($0, /^[[:space:]]*step:[[:space:]]*(.*)$/, m) {
  current_step=trim(m[1])
}
section=="current" && match($0, /^[[:space:]]*step_index:[[:space:]]*(.*)$/, m) {
  current_step_index=trim(m[1])
}
section=="history" && match($0, /^[[:space:]]*-[[:space:]]*prompt_file:[[:space:]]*(.*)$/, m) {
  last_prompt=trim(m[1])
  in_item=1
  next
}
section=="history" && in_item && match($0, /^[[:space:]]*result:[[:space:]]*(.*)$/, m) {
  last_result=trim(m[1])
  next
}
section=="history" && in_item && match($0, /^[[:space:]]*diff_score:[[:space:]]*(.*)$/, m) {
  last_diff=trim(m[1])
  next
}
END {
  if (pipeline_name == "") pipeline_name="unknown"
  if (pipeline_status == "") pipeline_status="unknown"
  if (current_prompt == "") current_prompt="none"
  if (current_step == "") current_step="none"
  if (current_step_index == "") current_step_index="0"

  print "Pipeline: " pipeline_name
  print "Status: " pipeline_status
  print "Current: " current_prompt " / " current_step " (step_index: " current_step_index ")"

  if (last_prompt == "") {
    print "Last completed: none"
  } else {
    if (last_result == "") last_result="unknown"
    if (last_diff == "") last_diff="n/a"
    print "Last completed: " last_prompt " - " last_result " (diff_score: " last_diff ")"
  }
}
' "$state_file"
