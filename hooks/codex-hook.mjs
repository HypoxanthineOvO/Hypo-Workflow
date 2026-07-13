#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

try {
  const source = await readStdin();
  let payload;
  try {
    payload = JSON.parse(source);
  } catch (error) {
    throw new Error(`Invalid Codex Hook JSON input: ${error.message}`);
  }

  const pluginRoot = resolve(
    process.env.PLUGIN_ROOT
      || process.env.CLAUDE_PLUGIN_ROOT
      || fileURLToPath(new URL("..", import.meta.url)),
  );
  const moduleUrl = pathToFileURL(resolve(pluginRoot, "core/src/codex-hooks/index.js")).href;
  const { evaluateCodexHookEvent } = await import(moduleUrl);
  const operationId = process.env.HYPO_WORKFLOW_TEST_OPERATION_ID
    || `codex-hook-${String(payload?.hook_event_name || "event").toLowerCase()}-${randomUUID()}`;
  const output = await evaluateCodexHookEvent(process.cwd(), payload, { id: operationId });
  process.stdout.write(`${JSON.stringify(output)}\n`);
} catch (error) {
  process.stderr.write(`Codex Hook failed: ${error?.message || String(error)}\n`);
  process.exitCode = 1;
}

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  if (!data.trim()) throw new Error("Invalid Codex Hook JSON input: stdin is empty");
  return data;
}
