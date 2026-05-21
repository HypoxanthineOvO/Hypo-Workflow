import test from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as api from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = join(__dirname, "fixtures", "final-assistant-output");
const codexSessionPath = join(
  fixtureRoot,
  "codex-sessions",
  "2026",
  "05",
  "20",
  "rollout-2026-05-20T09-15-00-final-output-fixture.jsonl",
);
const missingAssistantPath = join(fixtureRoot, "codex-missing-assistant.jsonl");
const opencodeProbePath = join(fixtureRoot, "opencode-probe.jsonl");

const EXPECTED_FINAL_OUTPUT = [
  "Final assistant output starts here.",
  "",
  "```bash",
  "printf 'keep this exact code fence'",
  "```",
  "",
  "Token-looking text must stay intact: sk-codex-fixture-secret and Bearer opencode-raw-token.",
  "Do not redact [brackets], truncate long-looking content, or summarize this message.",
  "Line after blank line is part of the answer.",
].join("\n");

test("parseCodexFinalAssistantOutput returns the exact last assistant output from a Codex JSONL session", async () => {
  const parseCodexFinalAssistantOutput = requireApi("parseCodexFinalAssistantOutput");

  const result = await parseCodexFinalAssistantOutput({
    session_path: codexSessionPath,
  });

  assert.equal(result.status, "captured");
  assert.equal(result.platform, "codex");
  assert.equal(result.output, EXPECTED_FINAL_OUTPUT);
  assert.equal(result.source?.kind, "codex_jsonl");
  assert.equal(result.source?.path, codexSessionPath);
  assert.equal(result.side_effect, "local_read");
  assert.deepEqual(result.planned_external_actions, []);
  assert.doesNotMatch(JSON.stringify(result), /\[REDACTED\]/);
  assert.doesNotMatch(JSON.stringify(result), /summary/i);
});

test("captureFinalAssistantOutput supports an explicit Codex session path", async () => {
  const captureFinalAssistantOutput = requireApi("captureFinalAssistantOutput");

  const result = await captureFinalAssistantOutput({
    platform: "codex",
    session_path: codexSessionPath,
  });

  assert.equal(result.status, "captured");
  assert.equal(result.output, EXPECTED_FINAL_OUTPUT);
  assert.equal(result.lookup?.mode, "explicit_path");
  assert.equal(result.source?.path, codexSessionPath);
  assert.equal(result.side_effect, "local_read");
  assert.deepEqual(result.planned_external_actions, []);
});

test("captureFinalAssistantOutput can resolve a Codex session id from a dated sessions root", async () => {
  const captureFinalAssistantOutput = requireApi("captureFinalAssistantOutput");

  const result = await captureFinalAssistantOutput({
    platform: "codex",
    sessions_root: join(fixtureRoot, "codex-sessions"),
    session_id: "final-output-fixture",
  });

  assert.equal(result.status, "captured");
  assert.equal(result.output, EXPECTED_FINAL_OUTPUT);
  assert.equal(result.lookup?.mode, "session_id");
  assert.equal(result.lookup?.session_id, "final-output-fixture");
  assert.equal(result.source?.path, codexSessionPath);
  assert.equal(result.side_effect, "local_read");
  assert.deepEqual(result.planned_external_actions, []);
});

test("captureFinalAssistantOutput fails closed when a Codex session has no assistant message", async () => {
  const captureFinalAssistantOutput = requireApi("captureFinalAssistantOutput");

  const result = await captureFinalAssistantOutput({
    platform: "codex",
    session_path: missingAssistantPath,
  });

  assert.equal(result.status, "capture_failed");
  assert.equal(result.side_effect, "local_read");
  assert.equal(typeof result.reason, "string");
  assert.match(result.reason, /assistant/i);
  assert.ok(!Object.hasOwn(result, "output"));
  assert.doesNotMatch(JSON.stringify(result), /summary|fallback/i);
  assert.deepEqual(result.planned_external_actions, []);
});

test("probeFinalAssistantOutputSource keeps OpenCode probe-only unless exact extraction is verified", async () => {
  const probeFinalAssistantOutputSource = requireApi("probeFinalAssistantOutputSource");

  const result = await probeFinalAssistantOutputSource({
    platform: "opencode",
    session_path: opencodeProbePath,
  });

  assert.ok(["unsupported", "probe_only"].includes(result.status));
  assert.notEqual(result.status, "captured");
  assert.equal(result.platform, "opencode");
  assert.equal(result.side_effect, "local_read");
  assert.equal(result.exact_extraction_verified, false);
  assert.ok(!Object.hasOwn(result, "output"));
  assert.deepEqual(result.planned_external_actions, []);
});

function requireApi(name) {
  assert.equal(typeof api[name], "function", `expected ${name} to be exported from ../src/index.js`);
  return api[name];
}
