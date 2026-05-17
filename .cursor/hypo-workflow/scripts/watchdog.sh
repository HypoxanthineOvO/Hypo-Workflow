#!/bin/bash
# Hypo-Workflow Auto Resume Watchdog
#
# Usage:
#   bash scripts/watchdog.sh [project_root] [--dry-run]
#
# Environment:
#   HYPO_WORKFLOW_RESUME_CMD  Optional command used to trigger resume.

set -euo pipefail

project_root="${1:-$(pwd)}"
dry_run="false"
if [[ "${2:-}" == "--dry-run" || "${1:-}" == "--dry-run" ]]; then
  dry_run="true"
  if [[ "${1:-}" == "--dry-run" ]]; then
    project_root="$(pwd)"
  fi
fi

pipeline_dir="$project_root/.pipeline"
config_file="$pipeline_dir/config.yaml"
global_config="${HOME}/.hypo-workflow/config.yaml"
state_file="$pipeline_dir/state.yaml"
lock_file="$pipeline_dir/.lock"
log_file="$pipeline_dir/watchdog.log"
watchdog_state="$pipeline_dir/watchdog.state"

if [[ ! -d "$pipeline_dir" ]]; then
  exit 0
fi

log() {
  printf '%s %s\n' "$(date -Iseconds)" "$*" >> "$log_file"
}

trim() {
  sed -E 's/^[[:space:]"]+//; s/[[:space:]"]+$//'
}

extract_section_key() {
  local file="$1"
  local section="$2"
  local key="$3"

  [[ -r "$file" ]] || return 0

  awk -v section="$section" -v key="$key" '
    $0 ~ "^" section ":" { in_section=1; next }
    in_section && $0 ~ "^[^[:space:]]" { in_section=0 }
    in_section {
      line=$0
      sub(/^[[:space:]]+/, "", line)
      if (line ~ "^" key ":[[:space:]]*") {
        sub("^" key ":[[:space:]]*", "", line)
        print line
        exit
      }
    }
  ' "$file" | trim
}

config_value() {
  local section="$1"
  local key="$2"
  local default_value="$3"
  local value

  value="$(extract_section_key "$config_file" "$section" "$key")"
  if [[ -z "$value" ]]; then
    value="$(extract_section_key "$global_config" "$section" "$key")"
  fi
  if [[ -z "$value" ]]; then
    value="$default_value"
  fi
  printf '%s\n' "$value"
}

current_phase() {
  [[ -r "$state_file" ]] || return 0
  awk '
    /^current:/ { in_current=1; next }
    in_current && /^[^[:space:]]/ { in_current=0 }
    in_current {
      line=$0
      sub(/^[[:space:]]+/, "", line)
      if (line ~ /^phase:[[:space:]]*/) {
        sub(/^phase:[[:space:]]*/, "", line)
        gsub(/"/, "", line)
        print line
        exit
      }
    }
    /^phase:[[:space:]]*/ {
      line=$0
      sub(/^phase:[[:space:]]*/, "", line)
      gsub(/"/, "", line)
      print line
      exit
    }
  ' "$state_file" | trim
}

last_heartbeat() {
  [[ -r "$state_file" ]] || return 0
  sed -nE 's/^last_heartbeat:[[:space:]]*"?([^"]*)"?[[:space:]]*$/\1/p' "$state_file" | head -n1 | trim
}

lock_value() {
  local key="$1"
  [[ -r "$lock_file" ]] || return 0
  sed -nE "s/^[[:space:]]*${key}:[[:space:]]*\"?([^\"]*)\"?[[:space:]]*$/\\1/p" "$lock_file" | head -n1 | trim
}

read_watchdog_state() {
  local key="$1"
  [[ -r "$watchdog_state" ]] || return 0
  sed -nE "s/^${key}=([0-9]+)$/\\1/p" "$watchdog_state" | head -n1
}

write_watchdog_state() {
  local failures="$1"
  local attempt_epoch="$2"
  {
    printf 'consecutive_failures=%s\n' "$failures"
    printf 'last_attempt_epoch=%s\n' "$attempt_epoch"
  } > "$watchdog_state"
}

enabled="$(config_value watchdog enabled false)"
if [[ "$enabled" != "true" ]]; then
  log "skip: watchdog disabled"
  exit 0
fi

if [[ ! -r "$state_file" ]]; then
  log "skip: state file missing"
  exit 0
fi

phase="$(current_phase)"
if [[ "$phase" != "executing" ]]; then
  log "skip: phase=$phase"
  exit 0
fi

heartbeat="$(last_heartbeat)"
if [[ -z "$heartbeat" || "$heartbeat" == "null" ]]; then
  log "skip: last_heartbeat missing"
  exit 0
fi

if ! heartbeat_epoch="$(date -d "$heartbeat" +%s 2>/dev/null)"; then
  log "skip: invalid last_heartbeat=$heartbeat"
  exit 0
fi

now_epoch="${HYPO_WORKFLOW_NOW_EPOCH:-$(date +%s)}"
timeout_s="$(config_value watchdog heartbeat_timeout 300)"
interval_s="$(config_value watchdog interval 300)"
max_retries="$(config_value watchdog max_retries 5)"
notify="$(config_value watchdog notify true)"
age_s=$((now_epoch - heartbeat_epoch))

if (( age_s < timeout_s )); then
  log "ok: heartbeat age ${age_s}s below timeout ${timeout_s}s"
  exit 0
fi

if [[ -e "$lock_file" ]]; then
  lock_session="$(lock_value session_id)"
  lock_expires="$(lock_value expires_at)"
  lock_failure="$(lock_value reported_failure)"
  if [[ -z "$lock_session" || -z "$lock_expires" ]]; then
    log "skip: legacy or malformed lock exists"
    exit 0
  fi
  if ! lock_expires_epoch="$(date -d "$lock_expires" +%s 2>/dev/null)"; then
    log "skip: malformed lock expires_at=$lock_expires"
    exit 0
  fi
  if (( now_epoch < lock_expires_epoch )) && [[ -z "$lock_failure" ]]; then
    log "skip: fresh lease exists session=${lock_session}"
    exit 0
  fi
  log "takeover: stale lease session=${lock_session} expires_at=${lock_expires}"
fi

failures="$(read_watchdog_state consecutive_failures)"
last_attempt="$(read_watchdog_state last_attempt_epoch)"
failures="${failures:-0}"
last_attempt="${last_attempt:-0}"

if (( failures >= max_retries )); then
  log "stop: max retries reached (${failures}/${max_retries})"
  if [[ "$notify" == "true" ]]; then
    log "notify: pipeline still stale after max retries"
  fi
  exit 0
fi

if (( failures >= 3 )); then
  backoff_s=$((interval_s * 3))
  since_attempt=$((now_epoch - last_attempt))
  if (( since_attempt < backoff_s )); then
    log "backoff: failures=${failures}, next retry in $((backoff_s - since_attempt))s"
    exit 0
  fi
fi

resume_cmd="${HYPO_WORKFLOW_RESUME_CMD:-}"
if [[ -z "$resume_cmd" ]]; then
  if command -v claude >/dev/null 2>&1; then
    resume_cmd='claude -p "/hw:resume"'
  elif command -v codex >/dev/null 2>&1; then
    resume_cmd='codex exec "/hw:resume"'
  else
    log "fail: no agent command available for resume"
    write_watchdog_state "$((failures + 1))" "$now_epoch"
    exit 1
  fi
fi

log "trigger: heartbeat stale age=${age_s}s timeout=${timeout_s}s command=${resume_cmd}"
write_watchdog_state "$failures" "$now_epoch"

if [[ "$dry_run" == "true" ]]; then
  log "dry-run: would trigger resume"
  exit 0
fi

if (cd "$project_root" && bash -lc "$resume_cmd"); then
  log "success: resume command completed"
  write_watchdog_state 0 "$now_epoch"
  exit 0
fi

log "fail: resume command failed"
write_watchdog_state "$((failures + 1))" "$now_epoch"
exit 1
