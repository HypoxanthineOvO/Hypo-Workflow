#!/bin/bash
# Pipeline Log Append — 标准化追加 log.md
#
# 用法：bash scripts/log-append.sh \
#   --step <step_name> \
#   --status <done|skipped|failed|warning> \
#   --message <message> \
#   [--pipeline-dir <dir>]  # 默认 .pipeline
#
# 追加格式：
#   ## {ISO-8601 timestamp} - {step}
#   - status: {status}
#   - message: {message}
#
# 实现要求：
# - 如果 log.md 不存在则创建
# - 时间戳用 date -u '+%Y-%m-%dT%H:%M:%SZ'
# - 验证 step 和 status 参数非空

set -euo pipefail

pipeline_dir=".pipeline"
step=""
status=""
message=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --step)
      step="${2:-}"
      shift 2
      ;;
    --status)
      status="${2:-}"
      shift 2
      ;;
    --message)
      message="${2:-}"
      shift 2
      ;;
    --pipeline-dir)
      pipeline_dir="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$step" ]]; then
  echo "--step is required" >&2
  exit 1
fi

if [[ -z "$status" ]]; then
  echo "--status is required" >&2
  exit 1
fi

log_file="$pipeline_dir/log.md"
mkdir -p "$pipeline_dir"
timestamp="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

{
  echo "## ${timestamp} - ${step}"
  echo "- status: ${status}"
  echo "- message: ${message}"
  echo
} >> "$log_file"
