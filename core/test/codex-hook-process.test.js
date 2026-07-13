import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  REPOSITORY_ROOT,
  officialHookCase,
  spawnHook,
  temporaryGitWorkspace,
} from "./fixtures/c21-m7/helpers.js";

const EVENTS = [
  "SessionStart", "UserPromptSubmit", "PreToolUse", "PermissionRequest", "PostToolUse",
  "PreCompact", "PostCompact", "SubagentStart", "SubagentStop", "Stop",
];

test("Codex plugin Hook config registers every official event with seconds-based command handlers", async () => {
  const config = JSON.parse(await readFile(join(REPOSITORY_ROOT, "hooks", "hooks.json"), "utf8"));
  assert.deepEqual(Object.keys(config.hooks).sort(), [...EVENTS].sort());
  for (const event of EVENTS) {
    assert.ok(config.hooks[event].length > 0, `${event} must have a matcher group`);
    for (const group of config.hooks[event]) {
      for (const hook of group.hooks) {
        assert.equal(hook.type, "command");
        assert.match(hook.command, /codex-hook\.mjs/);
        assert.equal(Number.isInteger(hook.timeout), true);
        assert.ok(hook.timeout > 0 && hook.timeout <= 600, "Codex timeout must be expressed in seconds");
      }
    }
  }
  assert.equal("InstructionsLoaded" in config.hooks, false, "Claude-only events must be isolated from Codex config");
});

test("wrapper emits exactly one JSON object on stdout and keeps diagnostics on stderr", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m7-hook-process-");
  const payload = await officialHookCase(root, "UserPromptSubmit");
  const child = spawnHook(root, payload, { operation_id: "m7-process-valid" });
  assert.equal(child.status, 0, child.stderr);
  const lines = child.stdout.split(/\r?\n/).filter(Boolean);
  assert.equal(lines.length, 1, `stdout must contain one JSON line, got: ${child.stdout}`);
  assert.doesNotThrow(() => JSON.parse(lines[0]));
  assert.doesNotMatch(child.stdout, /debug|diagnostic|stack|warning:/i);

  const invalid = spawnHook(root, null, { raw_input: "{not valid json\n", operation_id: "m7-process-invalid" });
  assert.notEqual(invalid.status, 0);
  assert.equal(invalid.stdout.trim(), "", "invalid-input diagnostics must not leak onto stdout");
  assert.match(invalid.stderr, /json|parse|invalid/i);
});
