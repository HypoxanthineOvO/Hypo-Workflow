#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
repo_root="$(CDPATH= cd -- "$script_dir/../../../.." && pwd)"
cd "$repo_root"

exec node tests/run-node-test-pattern.mjs 'empty repo Init transaction' core/test/init-bootstrap.test.js
