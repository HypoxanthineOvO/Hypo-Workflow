#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

node --test core/test/plan-audit-interview-prompt-architecture.test.js

echo "s66-plan-audit-interview-prompt-architecture: PASS"
