#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../../../.." && pwd)"

cd "$repo_root"

node --test core/test/worker-separation-spawn-enforcement.test.js

echo "s67-worker-separation-spawn-enforcement: PASS"
