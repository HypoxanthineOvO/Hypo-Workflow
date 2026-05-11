#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../../../.." && pwd)"

cd "$repo_root"

node --test core/test/codex-skill-snapshot-isolation-guidance.test.js

echo "s70-codex-skill-snapshot-isolation-guidance: PASS"
