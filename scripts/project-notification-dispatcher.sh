#!/usr/bin/env bash
set -Eeuo pipefail

export TZ="${TZ:-Asia/Shanghai}"
export PATH="${HOME}/.local/bin:${HOME}/.volta/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

project_root="${1:-${HOME}/Hypo-Workflow}"
shift || true

node "$project_root/cli/bin/hypo-workflow" project-notifications dispatch \
  --home "${HOME}" \
  --confirmed \
  --server "${HYPO_CLAW_SERVER:-http://localhost:3000}" \
  "$@"
