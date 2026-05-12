#!/bin/bash
# Rules Summary — deterministic loader for Hypo-Workflow rules context.
#
# Usage: bash scripts/rules-summary.sh [project_root]
#
# This helper intentionally keeps parsing shallow and dependency-free. The
# authoritative rule semantics live in rules/* and skills/rules/SKILL.md.

set -euo pipefail

project_root="${1:-$(pwd)}"
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
pipeline_dir="$project_root/.pipeline"
rules_file="$pipeline_dir/rules.yaml"

trim() {
  sed -E 's/^[[:space:]"]+//; s/[[:space:]"]+$//'
}

yaml_value() {
  local key="$1"
  local file="$2"
  sed -nE "s/^${key}:[[:space:]]*(.*)$/\\1/p" "$file" 2>/dev/null | head -n1 | trim
}

severity_for() {
  local name="$1"
  local preset="$2"
  local severity
  severity="$(awk -v name="$name" '
    $0 ~ "^rules:" { in_rules=1; next }
    in_rules && $0 ~ "^[^[:space:]]" { in_rules=0 }
    in_rules && $0 ~ "^[[:space:]]*" name ":" {
      sub("^[[:space:]]*" name ":[[:space:]]*", "")
      print
      exit
    }
  ' "$rules_file" 2>/dev/null | trim)"
  if [[ -n "$severity" ]]; then
    printf '%s' "$severity"
    return 0
  fi
  awk -v name="$name" '
    $0 ~ "^rules:" { in_rules=1; next }
    in_rules && $0 ~ "^[^[:space:]]" { in_rules=0 }
    in_rules && $0 ~ "^[[:space:]]*" name ":" {
      sub("^[[:space:]]*" name ":[[:space:]]*", "")
      print
      exit
    }
  ' "$repo_root/rules/presets/${preset}.yaml" 2>/dev/null | trim
}

field_for() {
  local field="$1"
  local file="$2"
  sed -nE "s/^${field}:[[:space:]]*(.*)$/\\1/p" "$file" | head -n1 | trim
}

hooks_for() {
  local file="$1"
  awk '
    /^hooks:/ { in_hooks=1; next }
    in_hooks && /^[^[:space:]]/ { in_hooks=0 }
    in_hooks && /^[[:space:]]*-[[:space:]]*/ {
      sub(/^[[:space:]]*-[[:space:]]*/, "")
      hooks = hooks ? hooks "," $0 : $0
    }
    END { print hooks }
  ' "$file"
}

custom_field() {
  local label="$1"
  local file="$2"
  sed -nE "s/^- \\*\\*${label}\\*\\*:[[:space:]]*(.*)$/\\1/p" "$file" | head -n1 | trim
}

custom_content() {
  local file="$1"
  awk '
    /^## 规则内容/ { in_body=1; next }
    in_body { print }
  ' "$file" | sed -n '1,80p'
}

extends_value="recommended"
if [[ -f "$rules_file" ]]; then
  configured_extends="$(yaml_value extends "$rules_file")"
  if [[ -n "$configured_extends" ]]; then
    extends_value="$configured_extends"
  fi
fi

case "$extends_value" in
  recommended|strict|minimal) preset="$extends_value" ;;
  *) preset="recommended" ;;
esac

printf 'Rules: %s\n' "$preset"
printf 'Source: %s\n' "$(if [[ -f "$rules_file" ]]; then printf '%s' "${rules_file#$project_root/}"; else printf 'builtin defaults'; fi)"
printf '\n[Built-in Rules]\n'

enabled=0
warns=0
errors=0
off=0
total=0

for file in "$repo_root"/rules/builtin/*.yaml; do
  [[ -f "$file" ]] || continue
  name="$(field_for name "$file")"
  label="$(field_for label "$file")"
  severity="$(severity_for "$name" "$preset")"
  if [[ -z "$severity" ]]; then
    severity="$(field_for default_severity "$file")"
  fi
  hooks="$(hooks_for "$file")"
  total=$((total + 1))
  case "$severity" in
    error) errors=$((errors + 1)); enabled=$((enabled + 1)) ;;
    warn) warns=$((warns + 1)); enabled=$((enabled + 1)) ;;
    off) off=$((off + 1)) ;;
  esac
  printf '%s\t%s\t%s\t%s\n' "$name" "$label" "$severity" "${hooks:-—}"
done

custom_dir="$pipeline_dir/rules/custom"
structured_project_dir="$pipeline_dir/rules/structured/project"
if [[ -d "$custom_dir" ]]; then
  printf '\n[Custom Rules]\n'
  for file in "$custom_dir"/*.md "$custom_dir"/*.yaml; do
    [[ -f "$file" ]] || continue
    name="$(basename "$file")"
    name="${name%.*}"
    label="$(custom_field "标签" "$file")"
    severity="$(severity_for "$name" "$preset")"
    if [[ -z "$severity" ]]; then
      severity="$(custom_field "严格度" "$file")"
    fi
    hooks="$(custom_field "钩子点" "$file")"
    [[ -n "$label" ]] || label="custom"
    [[ -n "$severity" ]] || severity="warn"
    [[ -n "$hooks" ]] || hooks="always"
    total=$((total + 1))
    case "$severity" in
      error) errors=$((errors + 1)); enabled=$((enabled + 1)) ;;
      warn) warns=$((warns + 1)); enabled=$((enabled + 1)) ;;
      off) off=$((off + 1)) ;;
    esac
    printf '%s\t%s\t%s\t%s\n' "$name" "$label" "$severity" "$hooks"
  done
fi

if [[ -d "$structured_project_dir" ]]; then
  printf '\n[Structured Project Rules]\n'
  for file in "$structured_project_dir"/*.yaml; do
    [[ -f "$file" ]] || continue
    name="$(field_for id "$file")"
    [[ -n "$name" ]] || name="$(basename "$file" .yaml)"
    label="$(field_for label "$file")"
    severity="$(severity_for "$name" "$preset")"
    [[ -n "$severity" ]] || severity="$(field_for severity "$file")"
    hooks="$(hooks_for "$file")"
    [[ -n "$label" ]] || label="workflow"
    [[ -n "$severity" ]] || severity="warn"
    [[ -n "$hooks" ]] || hooks="always"
    total=$((total + 1))
    case "$severity" in
      error) errors=$((errors + 1)); enabled=$((enabled + 1)) ;;
      warn) warns=$((warns + 1)); enabled=$((enabled + 1)) ;;
      off) off=$((off + 1)) ;;
    esac
    printf '%s\t%s\t%s\t%s\n' "$name" "$label" "$severity" "$hooks"
  done
fi

printf '\nSummary: %s/%s enabled | %s error | %s warn | %s off\n' "$enabled" "$total" "$errors" "$warns" "$off"

printf '\n[Always Rules]\n'
for file in "$repo_root"/rules/builtin/*.yaml; do
  [[ -f "$file" ]] || continue
  name="$(field_for name "$file")"
  severity="$(severity_for "$name" "$preset")"
  [[ -n "$severity" ]] || severity="$(field_for default_severity "$file")"
  hooks="$(hooks_for "$file")"
  if [[ "$severity" != "off" && ",$hooks," == *",always,"* ]]; then
    printf '%s\n' "- ${name} (${severity})"
  fi
done
if [[ -d "$custom_dir" ]]; then
  for file in "$custom_dir"/*.md "$custom_dir"/*.yaml; do
    [[ -f "$file" ]] || continue
    name="$(basename "$file")"
    name="${name%.*}"
    severity="$(custom_field "严格度" "$file")"
    hooks="$(custom_field "钩子点" "$file")"
    [[ -n "$severity" ]] || severity="warn"
    [[ -n "$hooks" ]] || hooks="always"
    if [[ "$severity" != "off" && ",$hooks," == *",always,"* ]]; then
      printf '\n%s\n' "- ${name} (${severity})"
      custom_content "$file"
    fi
  done
fi
if [[ -d "$structured_project_dir" ]]; then
  for file in "$structured_project_dir"/*.yaml; do
    [[ -f "$file" ]] || continue
    name="$(field_for id "$file")"
    [[ -n "$name" ]] || name="$(basename "$file" .yaml)"
    severity="$(severity_for "$name" "$preset")"
    [[ -n "$severity" ]] || severity="$(field_for severity "$file")"
    hooks="$(hooks_for "$file")"
    [[ -n "$severity" ]] || severity="warn"
    [[ -n "$hooks" ]] || hooks="always"
    if [[ "$severity" != "off" && ",$hooks," == *",always,"* ]]; then
      instruction="$(sed -nE 's/^[[:space:]]*instruction:[[:space:]]*"?([^"]*)"?[[:space:]]*$/\1/p' "$file" | head -n1)"
      if [[ -z "$instruction" ]]; then
        instruction="$(awk '
        /^[[:space:]]*instruction:[[:space:]]*>-/ { in_instruction=1; next }
        in_instruction && /^[[:space:]]*[a-zA-Z_]+:/ { in_instruction=0 }
        in_instruction {
          sub(/^[[:space:]]+/, "")
          print
        }
      ' "$file" | tr '\n' ' ' | sed -E 's/[[:space:]]+/ /g; s/[[:space:]]+$//')"
      fi
      printf '\n%s\n' "- ${name} (${severity})"
      [[ -n "$instruction" ]] && printf '%s\n' "$instruction"
    fi
  done
fi
