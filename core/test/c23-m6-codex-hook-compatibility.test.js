import test from "node:test";
import assert from "node:assert/strict";
import * as api from "../src/index.js";
import {
  REPOSITORY_ROOT,
  officialHookCase,
  spawnHook,
  temporaryGitWorkspace,
} from "./fixtures/c21-m7/helpers.js";

const OPTIONAL_TURN_EVENTS = Object.freeze([
  "UserPromptSubmit",
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "PreCompact",
  "PostCompact",
  "SubagentStart",
  "SubagentStop",
  "Stop",
]);

const SUBAGENT_CONTEXT_EVENTS = Object.freeze([
  "UserPromptSubmit",
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "PreCompact",
  "PostCompact",
]);

test("VSP command hooks accept paired subagent context and reject partial context", async () => {
  for (const event of SUBAGENT_CONTEXT_EVENTS) {
    const payload = await officialHookCase(REPOSITORY_ROOT, event);
    const subagentPayload = { ...payload, agent_id: "vsp-worker-1", agent_type: "test" };
    assert.deepEqual(api.validateCodexHookInput(subagentPayload), subagentPayload);
  }

  const payload = await officialHookCase(REPOSITORY_ROOT, "PostToolUse");
  assert.throws(
    () => api.validateCodexHookInput({ ...payload, agent_id: "vsp-worker-1" }),
    /agent_id|agent_type|provided together/i,
  );
});

test("C23 M6 accepts host-compatible payloads that omit optional turn identifiers", async (t) => {
  for (const event of OPTIONAL_TURN_EVENTS) {
    await t.test(event, async () => {
      const payload = await officialHookCase(REPOSITORY_ROOT, event);
      delete payload.turn_id;
      assert.doesNotThrow(() => api.validateCodexHookInput(payload));
    });
  }
});

test("C23 M6 accepts tool payloads that omit the optional tool-use identifier", async (t) => {
  for (const event of ["PreToolUse", "PostToolUse"]) {
    await t.test(event, async () => {
      const payload = await officialHookCase(REPOSITORY_ROOT, event);
      delete payload.tool_use_id;
      assert.doesNotThrow(() => api.validateCodexHookInput(payload));
    });
  }
});

test("C23 M6 wrapper does not repeatedly fail when compatible host payloads omit optional identifiers", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-c23-m6-hook-optional-");
  for (const event of ["PreToolUse", "Stop"]) {
    const payload = await officialHookCase(root, event);
    delete payload.turn_id;
    delete payload.tool_use_id;
    const child = spawnHook(root, payload, { operation_id: `c23-m6-optional-${event.toLowerCase()}` });
    assert.equal(child.status, 0, `${event}: ${child.stderr}`);
    const lines = child.stdout.split(/\r?\n/).filter(Boolean);
    assert.equal(lines.length, 1, `${event} must emit exactly one JSON object`);
    assert.doesNotThrow(() => JSON.parse(lines[0]));
  }
});

test("C23 M6 still validates optional identifiers when the host provides them", async (t) => {
  const cases = [
    ["Stop", "turn_id", "non-string", 42],
    ["Stop", "turn_id", "unsafe identifier", "../unsafe-turn"],
    ["Stop", "turn_id", "secret-like identifier", "sk-c23optionalturnsecret"],
    ["PreToolUse", "tool_use_id", "non-string", { id: "tool" }],
    ["PreToolUse", "tool_use_id", "unsafe identifier", "tool/unsafe"],
    ["PreToolUse", "tool_use_id", "secret-like identifier", "sk-c23optionaltoolsecret"],
  ];
  for (const [event, field, label, value] of cases) {
    await t.test(`${event}.${field} rejects ${label}`, async () => {
      const payload = await officialHookCase(REPOSITORY_ROOT, event);
      payload[field] = value;
      assert.throws(
        () => api.validateCodexHookInput(payload),
        /identifier|safe|secret|schema|invalid|text/i,
      );
    });
  }
});

test("C23 M6 optional-input compatibility does not widen event-specific output schemas", () => {
  const forbidden = [
    ["PreToolUse", { continue: false }],
    ["PreToolUse", { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "ask" } }],
    ["PermissionRequest", { updatedInput: { command: "echo rewritten" } }],
    ["PermissionRequest", { interrupt: true }],
    ["PostToolUse", { suppressOutput: true }],
    ["PostToolUse", { updatedMCPToolOutput: {} }],
  ];
  for (const [event, output] of forbidden) {
    assert.throws(
      () => api.validateCodexHookOutput(event, output),
      /unsupported|output|field|decision/i,
    );
  }
});
