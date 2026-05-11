#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../../../.." && pwd)"

cd "$repo_root"

node --test core/test/audit-regression-canonical-examples.test.js

echo "s69-audit-regression-canonical-examples: PASS"
