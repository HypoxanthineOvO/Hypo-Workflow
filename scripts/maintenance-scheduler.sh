#!/bin/bash
# Hypo-Workflow Maintenance Scheduler
#
# Cron example:
#   0 4 * * * /home/heyx/Hypo-Workflow/scripts/maintenance-scheduler.sh /home/heyx/Hypo-Workflow
#
# This scheduler only creates safe-local dry-run evidence. It does not perform
# remote writes, Notion apply, service restarts, or pipeline execution.

set -euo pipefail

project_root="${1:-$(pwd)}"
shift || true

node "$project_root/cli/bin/hypo-workflow" maintain-scheduler --project "$project_root" --dry-run "$@"
