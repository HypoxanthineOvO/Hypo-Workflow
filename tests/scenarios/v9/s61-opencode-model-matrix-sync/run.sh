#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

project="$(mktemp -d)"
home="$(mktemp -d)"
mkdir -p "$project/.pipeline"
cat > "$project/.pipeline/config.yaml" <<'YAML'
opencode:
  compaction:
    effective_context_target: 640000
  agents:
    plan:
      model: scenario-plan
    compact:
      model: scenario-compact
    test:
      model: scenario-test
    code-a:
      model: scenario-code-a
    code-b:
      model: scenario-code-b
    debug:
      model: scenario-debug
    report:
      model: scenario-report
YAML

HOME="$home" node cli/bin/hypo-workflow sync --platform opencode --project "$project" >/dev/null

grep -Fq "model: scenario-plan" "$project/.opencode/agents/hw-plan.md"
grep -Fq "model: scenario-compact" "$project/.opencode/agents/hw-compact.md"
grep -Fq "model: scenario-test" "$project/.opencode/agents/hw-test.md"
grep -Fq "model: scenario-code-a" "$project/.opencode/agents/hw-build.md"
grep -Fq "model: scenario-code-a" "$project/.opencode/agents/hw-code-a.md"
grep -Fq "model: scenario-code-b" "$project/.opencode/agents/hw-code-b.md"
grep -Fq "model: scenario-debug" "$project/.opencode/agents/hw-debug.md"
grep -Fq "model: scenario-report" "$project/.opencode/agents/hw-report.md"

grep -Fq "agent: hw-compact" "$project/.opencode/commands/hw-compact.md"
grep -Fq "agent: hw-debug" "$project/.opencode/commands/hw-debug.md"
grep -Fq "agent: hw-report" "$project/.opencode/commands/hw-report.md"

node - "$project" <<'NODE'
const fs = require("fs");
const project = process.argv[2];
const metadata = JSON.parse(fs.readFileSync(`${project}/.opencode/hypo-workflow.json`, "utf8"));
const rootConfig = JSON.parse(fs.readFileSync(`${project}/opencode.json`, "utf8"));
const adapterConfig = JSON.parse(fs.readFileSync(`${project}/.opencode/opencode.json`, "utf8"));

if (metadata.compaction.effective_context_target !== 640000) {
  throw new Error("compaction target did not render into metadata");
}
if (metadata.agents["code-b"].model !== "scenario-code-b") {
  throw new Error("code-b model did not render into metadata");
}
for (const config of [rootConfig, adapterConfig]) {
  if (Object.prototype.hasOwnProperty.call(config, "agents")) {
    throw new Error("HW-private agents leaked into opencode.json");
  }
  if (Object.prototype.hasOwnProperty.call(config.compaction || {}, "effective_context_target")) {
    throw new Error("HW-private compaction target leaked into opencode.json");
  }
}
NODE

legacy="$(mktemp -d)"
HOME="$home" node cli/bin/hypo-workflow sync --platform opencode --project "$legacy" >/dev/null
grep -Fq "model: deepseek/deepseek-v4-pro" "$legacy/.opencode/agents/hw-plan.md"
grep -Fq "model: mimo/mimo-v2.5-pro" "$legacy/.opencode/agents/hw-build.md"
grep -Fq "model: deepseek/deepseek-v4-pro" "$legacy/.opencode/agents/hw-test.md"
grep -Fq "model: deepseek/deepseek-v4-pro" "$legacy/.opencode/agents/hw-code-b.md"
grep -Fq "model: deepseek/deepseek-v4-flash" "$legacy/.opencode/agents/hw-report.md"

node - "$legacy" <<'NODE'
const fs = require("fs");
const project = process.argv[2];
const metadata = JSON.parse(fs.readFileSync(`${project}/.opencode/hypo-workflow.json`, "utf8"));
if (metadata.compaction.effective_context_target !== 900000) {
  throw new Error("default compaction target missing");
}
if (metadata.agents.compact.model !== "deepseek-v4-flash") {
  throw new Error("default compact model missing");
}
if (metadata.providers !== undefined) {
  throw new Error("default sync should not render project providers");
}
NODE

grep -Fq "| \`/hw:compact\` | \`/hw-compact\` | \`hw-compact\` |" references/opencode-command-map.md
grep -Fq "| Compact | \`/hw-compact\` | \`hw-compact\` |" references/opencode-parity.md

echo "s61 passed"
