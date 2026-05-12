#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

node --test core/test/audit-governance-contract.test.js

echo "s64-audit-governance-contract: PASS"
