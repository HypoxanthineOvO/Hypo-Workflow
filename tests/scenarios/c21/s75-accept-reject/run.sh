#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
repo_root="$(CDPATH= cd -- "$script_dir/../../../.." && pwd)"
cd "$repo_root"

exec node --test --test-name-pattern='real two-Milestone Cycle survives reject' core/test/cycle-lifecycle-vnext.test.js
