#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

node --test core/test/audit-memory-contract.test.js

echo "s65-audit-memory-handoff: PASS"
