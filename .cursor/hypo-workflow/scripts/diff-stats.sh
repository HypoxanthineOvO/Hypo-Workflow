#!/bin/bash
# Pipeline Diff Stats — 计算 git diff 统计
#
# 用法：bash scripts/diff-stats.sh [base_ref]
#   base_ref 默认为 HEAD（即 staged + unstaged changes）
#
# 输出（stdout，key=value 格式）：
#   changed_files=N
#   added_lines=N
#   removed_lines=N
#   net_lines=N
#
# 如果不在 git repo 中，输出全 0 并退出 0
#
# 实现要求：
# - 使用 git diff --stat 和 git diff --numstat
# - 被 V4 评估复用

set -euo pipefail

base_ref="${1:-HEAD}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "changed_files=0"
  echo "added_lines=0"
  echo "removed_lines=0"
  echo "net_lines=0"
  exit 0
fi

numstat_output="$(git diff --numstat "$base_ref" 2>/dev/null || true)"

if [[ -z "$numstat_output" ]]; then
  echo "changed_files=0"
  echo "added_lines=0"
  echo "removed_lines=0"
  echo "net_lines=0"
  exit 0
fi

awk '
BEGIN {
  changed=0
  added=0
  removed=0
}
NF >= 3 {
  changed += 1
  if ($1 != "-") added += $1
  if ($2 != "-") removed += $2
}
END {
  print "changed_files=" changed
  print "added_lines=" added
  print "removed_lines=" removed
  print "net_lines=" added - removed
}
' <<< "$numstat_output"
