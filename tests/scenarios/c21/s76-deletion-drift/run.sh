#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
repo_root="$(CDPATH= cd -- "$script_dir/../../../.." && pwd)"
cd "$repo_root"

exec node tests/run-node-test-pattern.mjs 'content drift, and Git drift' core/test/deletion-gate.test.js
