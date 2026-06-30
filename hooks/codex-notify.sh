#!/bin/bash
# Codex notify 脚本 — agent-turn-complete 通知
#
# 触发时机：Codex config.toml 的 notify 配置
# 这是 Codex 唯一支持的 Hook 事件
# observability, not a runner: do not resume, advance state, delete locks, or execute workflow commands here.
# Terminal-state QQ notification enqueue is retired. Hermes Codex completion
# watch owns user-facing completion reports.

set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
scripts_dir="$script_dir/../scripts"
workflow_root="$(cd "$script_dir/.." && pwd)"
cwd="$(pwd)"
pipeline_dir="$cwd/.pipeline"
state_file="$pipeline_dir/state.yaml"
continuation_file="$pipeline_dir/continuation.yaml"

if [[ ! -f "$state_file" ]]; then
  exit 0
fi

summary="$(bash "$scripts_dir/state-summary.sh" "$pipeline_dir" 2>/dev/null || true)"
if [[ -z "$summary" || "$summary" == "No active pipeline" ]]; then
  exit 0
fi

status="$(printf '%s\n' "$summary" | sed -n 's/^Status: //p' | head -n1)"
if [[ "$status" != "running" ]]; then
  bash "$scripts_dir/log-append.sh" \
    --pipeline-dir "$pipeline_dir" \
    --step "hook:codex-notify" \
    --status "done" \
    --message "agent-turn-complete; terminal_status=${status}; project-stop QQ enqueue retired; Hermes Codex completion watch handles user-facing QQ reports" >/dev/null 2>&1 || true
  exit 0
fi

current="$(printf '%s\n' "$summary" | sed -n 's/^Current: //p' | head -n1)"
next_action=""
safe_resume_command=""
if [[ -f "$continuation_file" ]]; then
  next_action="$(sed -nE 's/^next_action:[[:space:]]*"?([^"]*)"?[[:space:]]*$/\1/p' "$continuation_file" | head -n1 || true)"
  safe_resume_command="$(sed -nE 's/^safe_resume_command:[[:space:]]*"?([^"]*)"?[[:space:]]*$/\1/p' "$continuation_file" | head -n1 || true)"
fi
message="agent-turn-complete; ${current}"
if [[ -n "$next_action" ]]; then
  message="${message}; next_action=${next_action}"
fi
if [[ -n "$safe_resume_command" ]]; then
  message="${message}; safe_resume_command=${safe_resume_command}"
fi

bash "$scripts_dir/log-append.sh" \
  --pipeline-dir "$pipeline_dir" \
  --step "hook:codex-notify" \
  --status "done" \
  --message "$message" >/dev/null 2>&1 || true

if command -v notify-send >/dev/null 2>&1; then
  notify-send "Hypo-Workflow" "$message" >/dev/null 2>&1 || true
elif command -v osascript >/dev/null 2>&1; then
  osascript -e "display notification \"${message}\" with title \"Hypo-Workflow\"" >/dev/null 2>&1 || true
fi

exit 0
