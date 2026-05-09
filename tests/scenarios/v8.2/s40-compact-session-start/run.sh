#!/bin/bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../../../.." && pwd)"

cd "$repo_root"

rg -q 'append_compact_or_full "PROGRESS"' hooks/session-start.sh
rg -q 'append_compact_or_full "state"' hooks/session-start.sh
rg -q 'append_compact_or_full "log"' hooks/session-start.sh
rg -q 'Loaded .*saved ~' hooks/session-start.sh
rg -q 'append_open_patches' hooks/session-start.sh
rg -q 'compact.auto=true' SKILL.md
rg -q 'compact.auto=true' skills/start/SKILL.md
rg -q 'compact.end_of_run=true' skills/start/SKILL.md
rg -q 'compact.refresh_policy=dirty_only' skills/start/SKILL.md
rg -q 'compact.auto=true' skills/resume/SKILL.md
rg -q 'compact.end_of_run=true' skills/resume/SKILL.md
rg -q 'compact.auto=true' skills/cycle/SKILL.md

echo "s40-compact-session-start: PASS"
