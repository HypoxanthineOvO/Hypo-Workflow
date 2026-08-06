#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CODEX_HOOK_EVENTS,
  createWorkspaceManifest,
  stringifyYaml,
  validateCodexHookInput,
} from "../core/src/index.js";

const pluginRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
const wrapper = join(pluginRoot, "hooks", "codex-hook.mjs");
const root = await mkdtemp(join(tmpdir(), "hypo-workflow-codex-hook-smoke-"));

try {
  const manifest = createWorkspaceManifest({
    workspace_id: "codex-hook-smoke",
    project_id: "codex-hook-smoke",
    created_at: new Date().toISOString(),
  });
  await writeText(join(root, ".pipeline", "manifest.yaml"), `${stringifyYaml(manifest).trimEnd()}\n`);

  const cases = officialShapeCases(root);
  assert.deepEqual(new Set(cases.map((entry) => entry.hook_event_name)), new Set(CODEX_HOOK_EVENTS));
  for (const payload of cases) validateCodexHookInput(payload);

  const payload = cases.find((entry) => entry.hook_event_name === "UserPromptSubmit");
  const valid = spawnSync(process.execPath, [wrapper], {
    cwd: root,
    encoding: "utf8",
    input: `${JSON.stringify(payload)}\n`,
    env: {
      ...process.env,
      PLUGIN_ROOT: pluginRoot,
      HYPO_WORKFLOW_TEST_OPERATION_ID: "codex-hook-smoke-prompt",
    },
  });
  assert.equal(valid.status, 0, valid.stderr);
  const lines = valid.stdout.split(/\r?\n/).filter(Boolean);
  assert.equal(lines.length, 1);
  JSON.parse(lines[0]);

  const invalid = spawnSync(process.execPath, [wrapper], {
    cwd: root,
    encoding: "utf8",
    input: "{invalid json\n",
    env: { ...process.env, PLUGIN_ROOT: pluginRoot },
  });
  assert.equal(invalid.status, 0);
  assert.deepEqual(JSON.parse(invalid.stdout), {});
  assert.match(invalid.stderr, /invalid|json|parse/i);

  process.stdout.write("Codex Hook synthetic/process smoke: PASS (10 schemas and fail-open wrapper path)\n");
} finally {
  await rm(root, { recursive: true, force: true });
}

async function writeText(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

function officialShapeCases(cwd) {
  const common = {
    session_id: "smoke-session",
    transcript_path: null,
    cwd,
    model: "codex-smoke",
  };
  const turn = { ...common, turn_id: "smoke-turn" };
  return [
    { ...common, hook_event_name: "SessionStart", permission_mode: "default", source: "startup" },
    { ...turn, hook_event_name: "UserPromptSubmit", permission_mode: "default", prompt: "Remember that public API changes require documentation." },
    { ...turn, hook_event_name: "PreToolUse", permission_mode: "default", tool_name: "Bash", tool_use_id: "tool-pre", tool_input: { command: "echo ok" } },
    { ...turn, hook_event_name: "PermissionRequest", permission_mode: "default", tool_name: "Bash", tool_input: { command: "echo ok" } },
    { ...turn, hook_event_name: "PostToolUse", permission_mode: "default", tool_name: "Bash", tool_use_id: "tool-post", tool_input: { command: "echo ok" }, tool_response: { status: "completed" } },
    { ...turn, hook_event_name: "PreCompact", trigger: "auto" },
    { ...turn, hook_event_name: "PostCompact", trigger: "auto" },
    { ...turn, hook_event_name: "SubagentStart", permission_mode: "default", agent_id: "worker-test", agent_type: "test" },
    { ...turn, hook_event_name: "SubagentStop", permission_mode: "default", agent_id: "worker-test", agent_type: "test", agent_transcript_path: null, stop_hook_active: false, last_assistant_message: null },
    { ...turn, hook_event_name: "Stop", permission_mode: "default", stop_hook_active: false, last_assistant_message: null },
  ];
}
