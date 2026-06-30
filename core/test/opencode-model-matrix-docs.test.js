import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("OpenCode command and parity docs use matrix role agents", async () => {
  const commandMap = await readFile("references/opencode-command-map.md", "utf8");
  const parity = await readFile("references/opencode-parity.md", "utf8");

  assert.match(commandMap, /\| `\/hw:report` \| `\/hw:report` \| `hw-report` \|/);
  assert.match(commandMap, /\| `\/hw:compact` \| `\/hw:compact` \| `hw-compact` \|/);
  assert.match(commandMap, /\| `\/hw:debug` \| `\/hw:debug` \| `hw-debug` \|/);
  assert.match(parity, /\| Report \| `\/hw:report` \| `hw-report` \|/);
  assert.match(parity, /\| Compact \| `\/hw:compact` \| `hw-compact` \|/);
  assert.match(parity, /\| Debug \| `\/hw:debug` \| `hw-debug` \|/);
});

test("OpenCode guide documents model matrix defaults and boundaries", async () => {
  const readme = await readFile("docs/platforms/opencode.md", "utf8");

  for (const agent of ["hw-compact", "hw-test", "hw-code-a", "hw-code-b", "hw-docs", "hw-report"]) {
    assert.ok(readme.includes(`\`${agent}\``), `README missing ${agent}`);
  }
  assert.match(readme, /opencode:\n\s+compaction:\n\s+effective_context_target: 900000/);
  assert.match(readme, /plan:\n\s+model: deepseek-v4-pro/);
  assert.match(readme, /compact:\n\s+model: deepseek-v4-flash/);
  assert.match(readme, /发布默认/);
  assert.match(readme, /OpenCode.*负责实际模型调用/);
});

test("model matrix sync scenario exists and covers generated artifacts", async () => {
  const checklist = await readFile("tests/scenarios/v9/s61-opencode-model-matrix-sync/checklist.md", "utf8");
  const run = await readFile("tests/scenarios/v9/s61-opencode-model-matrix-sync/run.sh", "utf8");

  assert.match(checklist, /model matrix/);
  assert.match(checklist, /effective_context_target/);
  assert.match(run, /hw-code-b\.md/);
  assert.match(run, /hypo-workflow\.json/);
  assert.match(run, /opencode\.json/);
  assert.match(run, /effective_context_target/);
});
