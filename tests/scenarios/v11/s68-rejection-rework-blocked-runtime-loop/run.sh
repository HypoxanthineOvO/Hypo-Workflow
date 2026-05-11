#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../../../.." && pwd)"

cd "$repo_root"

node --test core/test/rejection-rework-blocked-runtime-loop.test.js

echo "s68-rejection-rework-blocked-runtime-loop: PASS"
