#!/usr/bin/env bash
set -euo pipefail

project_root="${1:-${HOME}/Hypo-Workflow}"
shift || true

# By default this scheduler creates safe-local dry-run evidence. Pass
# --notify --confirmed to send through Hypo-Claw QQ.
node "$project_root/cli/bin/hypo-workflow" daily-summary-scheduler --project "$project_root" "$@"
