#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CODEX_HOOK_EVENTS } from "../core/src/index.js";

// C027 精简版 hook smoke：验证 4 个注册事件的 wrapper 进程链路与 fail-open。
const pluginRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
const wrapper = join(pluginRoot, "hooks", "codex-hook.mjs");
const root = await mkdtemp(join(tmpdir(), "hypo-workflow-codex-hook-smoke-"));
await mkdir(join(root, ".pipeline", "cycles"), { recursive: true });
await writeFile(join(root, ".pipeline", "INDEX.md"), "---\nkind: project-index\nname: smoke\nstatus: active\n---\n\n# Smoke\n", "utf8");

try {
  assert.deepEqual(CODEX_HOOK_EVENTS, ["SessionStart", "UserPromptSubmit", "PreCompact", "Stop"]);
  const cases = [
    { session_id: "smoke-session", transcript_path: null, cwd: root, model: "codex-smoke", hook_event_name: "SessionStart", permission_mode: "default", source: "startup" },
    { session_id: "smoke-session", transcript_path: null, cwd: root, model: "codex-smoke", hook_event_name: "UserPromptSubmit", permission_mode: "default", turn_id: "smoke-turn", prompt: "Remember that public API changes require documentation." },
    { session_id: "smoke-session", transcript_path: null, cwd: root, model: "codex-smoke", hook_event_name: "PreCompact", turn_id: "smoke-turn", trigger: "auto" },
    { session_id: "smoke-session", transcript_path: null, cwd: root, model: "codex-smoke", hook_event_name: "Stop", permission_mode: "default", turn_id: "smoke-turn", stop_hook_active: false, last_assistant_message: "done" },
  ];
  for (const payload of cases) {
    const out = spawnSync(process.execPath, [wrapper], {
      cwd: root,
      encoding: "utf8",
      input: `${JSON.stringify(payload)}\n`,
      env: { ...process.env, PLUGIN_ROOT: pluginRoot },
    });
    assert.equal(out.status, 0, out.stderr);
    const lines = out.stdout.split(/\r?\n/).filter(Boolean);
    assert.equal(lines.length, 1, out.stdout);
    JSON.parse(lines[0]);
  }

  const invalid = spawnSync(process.execPath, [wrapper], {
    cwd: root,
    encoding: "utf8",
    input: "{invalid json\n",
    env: { ...process.env, PLUGIN_ROOT: pluginRoot },
  });
  assert.equal(invalid.status, 0);
  assert.deepEqual(JSON.parse(invalid.stdout), {});
  assert.match(invalid.stderr, /invalid|json|parse/i);

  process.stdout.write("Codex Hook synthetic/process smoke: PASS (4 registered events and fail-open wrapper path)\n");
} finally {
  await rm(root, { recursive: true, force: true });
}
