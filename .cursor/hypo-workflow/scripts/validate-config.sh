#!/bin/bash
# Pipeline Config Validator — 校验 config.yaml
#
# 用法：bash scripts/validate-config.sh [config_path]
#   config_path 默认为 .pipeline/config.yaml
#
# 检查项：
# 1. 文件存在且可读
# 2. pipeline.name 非空
# 3. pipeline.source 是 local|notion 之一
# 4. pipeline.output 是 local|notion 之一
# 5. execution.steps.preset 是 tdd|implement-only|custom|analysis 之一
# 6. 如果 execution.mode=subagent，subagent_tool 必须存在
# 7. 如果 hooks.enabled=true，hooks/ 目录必须存在
# 8. platform 如果存在，必须是 auto|claude|codex 之一
# 9. 如果 source/output 使用 notion，必须提供 notion 段并满足最小字段要求
# 10. automation.level 如果存在，必须是 manual|balanced|full 之一
#
# 输出：每条错误一行。退出码：0=通过, 1=有错误
#
# 实现要求：
# - 纯 bash + grep/sed，简单 YAML 字段提取
# - 不依赖外部 YAML 校验库

set -euo pipefail

config_path="${1:-.pipeline/config.yaml}"
errors=0

trim() {
  sed -E 's/^[[:space:]"]+//; s/[[:space:]"]+$//'
}

extract_top() {
  local key="$1"
  sed -nE "s/^${key}:[[:space:]]*(.*)$/\\1/p" "$config_path" | head -n1 | trim
}

extract_section() {
  local section="$1"
  local key="$2"
  awk -v section="$section" -v key="$key" '
    $0 ~ "^" section ":" { in_section=1; next }
    in_section && $0 ~ "^[^[:space:]]" { in_section=0 }
    in_section && match($0, "^[[:space:]]*" key ":[[:space:]]*(.*)$", m) {
      print m[1]
      exit
    }
  ' "$config_path" | trim
}

if [[ ! -r "$config_path" ]]; then
  echo "Config file missing or unreadable: $config_path"
  exit 1
fi

config_dir="$(cd "$(dirname "$config_path")" && pwd)"
project_root="$(cd "$config_dir/.." && pwd)"

pipeline_name="$(extract_section pipeline name)"
pipeline_source="$(extract_section pipeline source)"
pipeline_output="$(extract_section pipeline output)"
execution_mode="$(extract_section execution mode)"
subagent_tool="$(extract_section execution subagent_tool)"
preset="$(sed -nE 's/^[[:space:]]*preset:[[:space:]]*(.*)$/\1/p' "$config_path" | head -n1 | trim)"
hooks_enabled="$(extract_section hooks enabled)"
platform="$(extract_top platform)"
notion_token_file="$(extract_section notion token_file)"
notion_source_database_id="$(extract_section notion source_database_id)"
notion_source_page_id="$(extract_section notion source_page_id)"
notion_output_parent_page_id="$(extract_section notion output_parent_page_id)"
notion_output_database_id="$(extract_section notion output_database_id)"
automation_level="$(extract_section automation level)"

if [[ -z "$pipeline_name" ]]; then
  echo "pipeline.name must not be empty"
  errors=1
fi

case "$pipeline_source" in
  local|notion) ;;
  *)
    echo "pipeline.source must be one of: local, notion"
    errors=1
    ;;
esac

case "$pipeline_output" in
  local|notion) ;;
  *)
    echo "pipeline.output must be one of: local, notion"
    errors=1
    ;;
esac

case "$preset" in
  tdd|implement-only|custom|analysis) ;;
  *)
    echo "execution.steps.preset must be one of: tdd, implement-only, custom, analysis"
    errors=1
    ;;
esac

if [[ "$execution_mode" == "subagent" && -z "$subagent_tool" ]]; then
  echo "execution.subagent_tool must be set when execution.mode=subagent"
  errors=1
fi

if [[ "$hooks_enabled" == "true" && ! -d "$project_root/hooks" ]]; then
  echo "hooks.enabled=true but hooks/ directory is missing"
  errors=1
fi

if [[ -n "$platform" ]]; then
  case "$platform" in
    auto|claude|codex) ;;
    *)
      echo "platform must be one of: auto, claude, codex"
      errors=1
      ;;
  esac
fi

if [[ -n "$automation_level" ]]; then
  case "$automation_level" in
    manual|balanced|full) ;;
    *)
      echo "automation.level must be one of: manual, balanced, full"
      errors=1
      ;;
  esac
fi

if [[ "$pipeline_source" == "notion" || "$pipeline_output" == "notion" ]]; then
  if [[ -z "${NOTION_TOKEN:-}" && -z "$notion_token_file" ]]; then
    echo "notion.token_file or NOTION_TOKEN is required when using notion adapters"
    errors=1
  fi

  if [[ -n "$notion_token_file" ]]; then
    token_candidate="$notion_token_file"
    if [[ "$token_candidate" != /* ]]; then
      token_candidate="$project_root/$token_candidate"
    fi
    if [[ ! -r "$token_candidate" ]]; then
      echo "notion.token_file is not readable: $notion_token_file"
      errors=1
    fi
  fi
fi

if [[ "$pipeline_source" == "notion" ]]; then
  if [[ -z "$notion_source_database_id" && -z "$notion_source_page_id" ]]; then
    echo "notion.source_database_id or notion.source_page_id is required when pipeline.source=notion"
    errors=1
  fi
fi

if [[ "$pipeline_output" == "notion" ]]; then
  if [[ -z "$notion_output_parent_page_id" && -z "$notion_output_database_id" ]]; then
    echo "notion.output_parent_page_id or notion.output_database_id is required when pipeline.output=notion"
    errors=1
  fi
fi

exit "$errors"
