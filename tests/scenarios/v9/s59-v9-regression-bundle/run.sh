#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

registered_v9="$(
  python3 - <<'PY'
import ast
from pathlib import Path

source = Path("tests/run_regression.py").read_text(encoding="utf-8")
module = ast.parse(source)
for node in module.body:
    if isinstance(node, ast.Assign):
        for target in node.targets:
            if isinstance(target, ast.Name) and target.id == "TARGET_SCENARIOS":
                for name in sorted(ast.literal_eval(node.value)):
                    if name.startswith("s"):
                        try:
                            number = int(name[1:3])
                        except ValueError:
                            continue
                        if number >= 51:
                            print(name)
                raise SystemExit(0)
raise SystemExit("TARGET_SCENARIOS not found")
PY
)"

for required in \
  s61-opencode-model-matrix-sync \
  s62-analysis-preset-runtime \
  s63-init-automation-non-git
do
  grep -Fxq "$required" <<<"$registered_v9" || {
    echo "scenario not registered: $required" >&2
    exit 1
  }
done

while IFS= read -r scenario; do
  test -n "$scenario" || continue
  matches=(tests/scenarios/v*/"$scenario")
  test -d "${matches[0]}" || {
    echo "registered scenario has no scenario directory: $scenario" >&2
    exit 1
  }
  test -f "${matches[0]}/run.sh" || {
    echo "registered scenario missing run.sh: $scenario" >&2
    exit 1
  }
done <<<"$registered_v9"

for scenario_dir in tests/scenarios/v9/s*; do
  test -d "$scenario_dir" || continue
  scenario="$(basename "$scenario_dir")"
  test -f "$scenario_dir/run.sh" || {
    echo "V9 scenario directory missing run.sh: $scenario" >&2
    exit 1
  }
  grep -Fxq "$scenario" <<<"$registered_v9" || {
    echo "V9 scenario exists but is not registered: $scenario" >&2
    exit 1
  }
done

if grep -R "curl .*opencode\\|OPENAI_API_KEY\\|https://api.openai.com\\|opencode run" tests/scenarios/v9/*.*/run.sh 2>/dev/null; then
  echo "V9 smoke tests must stay offline/static" >&2
  exit 1
fi

grep -Fq 'opencode debug config' tests/scenarios/v9/s54-opencode-plugin-scaffold/run.sh

grep -Fq '40 个用户指令' README.md
grep -Fq '[Commands Reference](docs/reference/commands.md)' README.md
grep -Fq '[OpenCode Command Map](references/opencode-command-map.md)' README.md
grep -Fq '/hw:docs' README.md
grep -Fq '/hw:explore' README.md

echo "s59 passed"
