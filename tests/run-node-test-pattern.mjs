#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const [pattern, ...files] = process.argv.slice(2);

if (!pattern || files.length === 0) {
  process.stderr.write("usage: run-node-test-pattern.mjs <pattern> <test-file>...\n");
  process.exitCode = 2;
} else {
  const childEnv = { ...process.env };
  delete childEnv.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, [
    "--test",
    "--test-reporter=tap",
    `--test-name-pattern=${pattern}`,
    ...files,
  ], {
    encoding: "utf8",
    env: childEnv,
  });

  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");

  if (result.error) throw result.error;
  if (result.signal || result.status !== 0) {
    process.exitCode = result.status || 1;
  } else {
    const hasEmptyPlan = /(?:^|\n)1\.\.0(?:\n|$)/.test(result.stdout || "");
    const passMatch = /(?:^|\n)# pass (\d+)(?:\n|$)/.exec(result.stdout || "");
    const passCount = passMatch ? Number.parseInt(passMatch[1], 10) : 0;
    if (hasEmptyPlan || passCount === 0) {
      process.stderr.write(`Scenario pattern matched no passing tests: ${pattern}\n`);
      process.exitCode = 1;
    }
  }
}
