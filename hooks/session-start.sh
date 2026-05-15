#!/bin/bash
# Pipeline SessionStart Hook — additionalContext 注入
#
# 触发时机：Claude Code 的 SessionStart 事件（startup / resume / clear / compact）
# Chat Recovery contract:
# - if chat.active == true, SessionStart should recover chat context
# - when no active Milestone is running, SessionStart may hint that /hw:chat is available
# - recovery should prioritize state.yaml + cycle.yaml + PROGRESS.md + recent report

set -euo pipefail

matcher="${1:-startup}"
script_dir="$(cd "$(dirname "$0")" && pwd)"
scripts_dir="$script_dir/../scripts"
payload="$(cat || true)"

json_escape() {
  local value="${1-}"
  value=${value//\\/\\\\}
  value=${value//\"/\\\"}
  value=${value//$'\n'/\\n}
  value=${value//$'\r'/}
  value=${value//$'\t'/\\t}
  printf '%s' "$value"
}

emit_empty() {
  printf '{}\n'
}

extract_json_string() {
  local key="$1"
  printf '%s' "$payload" | tr '\n' ' ' | sed -n "s/.*\"${key}\"[[:space:]]*:[[:space:]]*\"\\([^\"]*\\)\".*/\\1/p" | head -n1
}

cwd="$(extract_json_string cwd)"
if [[ -z "$cwd" ]]; then
  cwd="$(pwd)"
fi

pipeline_dir="$cwd/.pipeline"
state_file="$pipeline_dir/state.yaml"

if [[ ! -f "$state_file" ]]; then
  emit_empty
  exit 0
fi

line_count() {
  local file="$1"
  if [[ -f "$file" ]]; then
    wc -l < "$file" | tr -d ' '
  else
    printf '0'
  fi
}

append_context_file() {
  local label="$1"
  local file="$2"
  if [[ -f "$file" ]]; then
    additional_context+=$'\n\n'"[${label}: ${file#$cwd/}]"$'\n'
    additional_context+="$(sed -n '1,240p' "$file")"
  fi
}

append_compact_or_full() {
  local label="$1"
  local compact_file="$2"
  local full_file="$3"
  if [[ -f "$compact_file" ]]; then
    local compact_lines full_lines saved
    compact_lines="$(line_count "$compact_file")"
    full_lines="$(line_count "$full_file")"
    saved=0
    if [[ "$full_lines" =~ ^[0-9]+$ && "$compact_lines" =~ ^[0-9]+$ && "$full_lines" -gt "$compact_lines" ]]; then
      saved=$((full_lines - compact_lines))
    fi
    context_load_log+=$'\n'"Loaded ${compact_file#$pipeline_dir/} (${compact_lines} lines, saved ~${saved} lines)"
    append_context_file "$label compact" "$compact_file"
  elif [[ -f "$full_file" ]]; then
    local full_lines
    full_lines="$(line_count "$full_file")"
    context_load_log+=$'\n'"Loaded ${full_file#$pipeline_dir/} (${full_lines} lines, fallback full)"
    append_context_file "$label full" "$full_file"
  fi
}

append_open_patches() {
  local patch_dir="$pipeline_dir/patches"
  [[ -d "$patch_dir" ]] || return 0
  local found=0
  local patch
  for patch in "$patch_dir"/P*.md; do
    [[ -f "$patch" ]] || continue
    if grep -Eq '^- (状态|Status|status):[[:space:]]*open' "$patch"; then
      if [[ "$found" -eq 0 ]]; then
        additional_context+=$'\n\n[Open Patches]\n'
      fi
      found=1
      additional_context+=$'\n\n'
      additional_context+="$(sed -n '1,120p' "$patch")"
    fi
  done
  if [[ "$found" -eq 1 ]]; then
    context_load_log+=$'\n'"Loaded patches/ open only"
  fi
}

append_rules_context() {
  local helper="$scripts_dir/rules-summary.sh"
  [[ -x "$helper" ]] || return 0
  local rules_summary
  rules_summary="$(bash "$helper" "$cwd" 2>/dev/null || true)"
  [[ -n "$rules_summary" ]] || return 0
  additional_context+=$'\n\n'"[Rules Context]"$'\n'
  additional_context+="$(printf '%s\n' "$rules_summary" | sed -n '1,220p')"
  context_load_log+=$'\n'"Loaded rules context (always rules included)"
}

append_knowledge_context() {
  local knowledge_dir="$pipeline_dir/knowledge"
  [[ -d "$knowledge_dir" ]] || return 0

  append_context_file "Knowledge compact" "$knowledge_dir/knowledge.compact.md"

  local category
  for category in dependencies references pitfalls decisions config-notes secret-refs; do
    append_context_file "Knowledge index ${category}" "$knowledge_dir/index/${category}.yaml"
  done

  if [[ -f "$knowledge_dir/knowledge.compact.md" || -d "$knowledge_dir/index" ]]; then
    context_load_log+=$'\n'"Loaded knowledge compact and category indexes only"
  fi
}

append_sync_light_check() {
  local messages=()
  if git -C "$cwd" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    local status
    status="$(git -C "$cwd" status --short 2>/dev/null || true)"
    if [[ -n "$status" ]]; then
      messages+=("git_dirty")
    fi
  fi
  if [[ ! -f "$cwd/.opencode/hypo-workflow.json" ]]; then
    messages+=("adapter_missing")
  elif [[ -f "$pipeline_dir/config.yaml" && "$pipeline_dir/config.yaml" -nt "$cwd/.opencode/hypo-workflow.json" ]]; then
    messages+=("adapter_stale")
  fi
  if [[ ${#messages[@]} -eq 0 ]]; then
    return 0
  fi
  additional_context+=$'\n\n'"[Sync Light Check]"$'\n'
  additional_context+="External changes detected: ${messages[*]}. Review changes or run /hw:sync --light before heavier sync."
  context_load_log+=$'\n'"Ran SessionStart light sync detection (no writes)"
}

extract_state_chat_active() {
  local file="$1"
  awk '
    /^chat:/ { in_section=1; next }
    in_section && /^[^[:space:]]/ { in_section=0 }
    in_section && match($0, /^[[:space:]]*active:[[:space:]]*(.*)$/, m) {
      value=m[1]
      gsub(/^[[:space:]"]+|[[:space:]"]+$/, "", value)
      print value
      exit
    }
  ' "$file"
}

# Inject Workflow state summary if in a Cycle
if [ -f "$pipeline_dir/state.yaml" ] && [ -f "$pipeline_dir/cycle.yaml" ]; then
  CYCLE=$(grep "name:" "$pipeline_dir/cycle.yaml" | head -1 | cut -d'"' -f2)
  STATUS=$(grep "status:" "$pipeline_dir/state.yaml" | head -1 | awk '{print $2}')
  MILESTONE=$(grep "prompt_name:" "$pipeline_dir/state.yaml" | head -1 | cut -d'"' -f2)
  STEP=$(grep "step:" "$pipeline_dir/state.yaml" | head -1 | awk '{print $2}')
  echo "--- Hypo-Workflow Active ---"
  echo "Cycle: $CYCLE"
  echo "Status: $STATUS"
  echo "Current: $MILESTONE"
  echo "Step: $STEP"
  echo "Run /hw:status for details"
  echo "--- End Workflow State ---"
fi

summary="$("$scripts_dir/state-summary.sh" "$pipeline_dir" 2>/dev/null || true)"
if [[ -z "$summary" || "$summary" == "No active pipeline" ]]; then
  emit_empty
  exit 0
fi

pipeline_name="$(printf '%s\n' "$summary" | sed -n 's/^Pipeline: //p' | head -n1)"
pipeline_status="$(printf '%s\n' "$summary" | sed -n 's/^Status: //p' | head -n1)"
current_line="$(printf '%s\n' "$summary" | sed -n 's/^Current: //p' | head -n1)"
last_line="$(printf '%s\n' "$summary" | sed -n 's/^Last completed: //p' | head -n1)"

current_prompt="$(printf '%s\n' "$current_line" | sed -n 's#^\(.*\) / .* (step_index: .*#\1#p' | head -n1)"
current_step="$(printf '%s\n' "$current_line" | sed -n 's#^.* / \(.*\) (step_index: .*#\1#p' | head -n1)"
current_step_index="$(printf '%s\n' "$current_line" | sed -n 's#^.*(step_index: \(.*\))#\1#p' | head -n1)"
context_load_log="[Context Load Log]"
chat_active="$(extract_state_chat_active "$state_file")"

case "$matcher" in
  startup|clear)
    additional_context="[Hypo-Workflow Pipeline 状态]
Pipeline: ${pipeline_name}
Status: ${pipeline_status}
当前 Prompt: ${current_prompt}
当前步骤: ${current_step} (step_index: ${current_step_index})
上次完成: ${last_line}

请按照 SKILL.md 的流程从当前步骤继续执行。"
    ;;
  resume)
    additional_context="[会话恢复 — Hypo-Workflow Pipeline]
上次执行到: ${current_step} (prompt: ${current_prompt})
Pipeline 状态: ${pipeline_status}

请从中断处继续。如果当前步骤已完成，进入下一步。"
    ;;
  compact)
    additional_context="[⚠️ 上下文已压缩 — Pipeline 状态重新注入]
Pipeline: ${pipeline_name}
Status: ${pipeline_status}
当前 Prompt: ${current_prompt}
当前步骤: ${current_step} (step_index: ${current_step_index})
上次完成: ${last_line}

注意：上下文刚刚被压缩，之前的详细执行信息可能已丢失。
请以 state.yaml 和 log.md 为准，继续当前步骤。"
    ;;
  *)
    additional_context="[Hypo-Workflow Pipeline 状态]
Pipeline: ${pipeline_name}
Status: ${pipeline_status}
当前 Prompt: ${current_prompt}
当前步骤: ${current_step} (step_index: ${current_step_index})"
    ;;
esac

append_context_file "config.yaml full" "$pipeline_dir/config.yaml"
append_context_file "architecture.md full" "$pipeline_dir/architecture.md"
append_context_file "cycle.yaml full" "$pipeline_dir/cycle.yaml"

if [[ -n "$current_prompt" ]]; then
  append_context_file "current prompt full" "$pipeline_dir/prompts/$current_prompt"
  report_base="${current_prompt%.md}.report.md"
  append_context_file "current report full" "$pipeline_dir/reports/$report_base"
fi

append_compact_or_full "PROGRESS" "$pipeline_dir/PROGRESS.compact.md" "$pipeline_dir/PROGRESS.md"
append_compact_or_full "state" "$pipeline_dir/state.compact.yaml" "$pipeline_dir/state.yaml"
append_compact_or_full "log" "$pipeline_dir/log.compact.yaml" "$pipeline_dir/log.yaml"
append_context_file "patches compact" "$pipeline_dir/patches.compact.md"
append_knowledge_context
append_open_patches
append_rules_context
append_sync_light_check

if [[ "$chat_active" == "true" ]]; then
  additional_context+=$'\n\n'"[Chat Recovery]"$'\n'
  additional_context+="chat.active == true; resume /hw:chat using state.yaml + cycle.yaml + PROGRESS.md + recent report. Keep append-mode notes in chat_entry/chat_session, not Milestone report."
  context_load_log+=$'\n'"Loaded chat recovery context"
fi

additional_context+=$'\n\n'"$context_load_log"

system_message="🔄 Pipeline: ${pipeline_name} | Step: ${current_step}"

printf '{"systemMessage":"%s","additionalContext":"%s"}\n' \
  "$(json_escape "$system_message")" \
  "$(json_escape "$additional_context")"
