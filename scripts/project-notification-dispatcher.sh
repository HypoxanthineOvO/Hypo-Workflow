#!/usr/bin/env bash
set -Eeuo pipefail

export TZ="${TZ:-Asia/Shanghai}"
export PATH="${HOME}/.local/bin:${HOME}/.volta/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

project_root="${1:-${HOME}/Hypo-Workflow}"
shift || true

echo "Hypo-Workflow project-stop QQ dispatcher is retired; Hermes Codex completion watch owns user-facing completion reports."
exit 0
