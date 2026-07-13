#!/usr/bin/env node

import { spawnSync } from "node:child_process";

if (process.env.CODEX_HOOK_SMOKE !== "1") {
  process.stdout.write("Official Codex real-host Hook smoke: SKIP (set CODEX_HOOK_SMOKE=1 to probe an installed host)\n");
  process.exit(0);
}

const binary = process.env.CODEX_BIN || "/usr/local/bin/codex";
const version = spawnSync(binary, ["--version"], { encoding: "utf8" });
if (version.error || version.status !== 0) {
  process.stdout.write(`Official Codex real-host Hook smoke: UNAVAILABLE (${version.error?.message || version.stderr.trim() || "version probe failed"})\n`);
  process.exit(0);
}

const renderedVersion = (version.stdout || version.stderr).trim();
const help = spawnSync(binary, ["--help"], { encoding: "utf8" });
if (help.status !== 0 || !/hook/i.test(`${help.stdout}\n${help.stderr}`)) {
  process.stdout.write(`Official Codex real-host Hook smoke: SKIP (${renderedVersion}; installed host exposes no verifiable Hook surface)\n`);
  process.exit(0);
}

process.stdout.write(`Official Codex real-host Hook smoke: MANUAL_TRUST_REQUIRED (${renderedVersion}; project Hook trust and a fresh interactive session are required)\n`);
