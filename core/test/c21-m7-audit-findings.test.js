import test from "node:test";
import assert from "node:assert/strict";
import { readdir, rmdir, symlink } from "node:fs/promises";
import { join } from "node:path";
import * as api from "../src/index.js";
import {
  ACTOR,
  AMBIENT_REF,
  listFiles,
  readText,
  seedActiveRecovery,
  temporaryCurrentWorkspace,
  temporaryGitWorkspace,
  writeText,
} from "./fixtures/c21-m7/helpers.js";

const FIXED_NOW = "2026-07-12T18:00:00+08:00";
const BLOB_DIGEST = "a".repeat(64);
const SECOND_BLOB_DIGEST = "b".repeat(64);
const RECOVERY_PATHS = Object.freeze([
  ".pipeline/runtime/recovery",
  ".pipeline/runtime/recovery/blobs",
  `.pipeline/runtime/recovery/blobs/${BLOB_DIGEST}`,
  `.pipeline/runtime/recovery/blobs/${SECOND_BLOB_DIGEST}/child.txt`,
]);

test("ordinary deletion manifests protect the complete Recovery store at ancestor, exact, and descendant paths", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m7-r2-recovery-manifest-");
  await writeText(join(root, `.pipeline/runtime/recovery/blobs/${BLOB_DIGEST}`), "recovery blob bytes\n");
  await writeText(join(root, `.pipeline/runtime/recovery/blobs/${SECOND_BLOB_DIGEST}/child.txt`), "descendant bytes\n");

  for (const path of RECOVERY_PATHS) {
    await assert.rejects(
      () => api.buildDeletionManifest(root, {
        paths: [path],
        reason: "Probe ordinary cleanup protection without deleting anything.",
        replacement: "Recovery retention is a separate audited path.",
      }),
      /protected|recovery|authority|evidence/i,
      `${path} must stay outside ordinary deletion manifests`,
    );
  }
});

test("deletion Receipt context independently rejects crafted Recovery-store bindings", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m7-r2-recovery-receipt-");
  const baseline = await api.buildDeletionManifest(root, {
    paths: ["docs/obsolete.md"],
    reason: "Create a valid manifest shell for adversarial rebinding.",
    replacement: "src/live.js",
  });

  for (const path of RECOVERY_PATHS) {
    const { manifest_hash: _ignored, ...body } = structuredClone(baseline);
    body.entries = [{ ...body.entries[0], path }];
    const crafted = { ...body, manifest_hash: api.canonicalHash(body) };
    assert.throws(
      () => api.buildDeletionReceiptContext(crafted, { actor: ACTOR }),
      /protected|recovery|authority|evidence/i,
      `${path} must not receive ordinary deletion authority`,
    );
  }
});

test("UserPromptSubmit stages only a bounded semantic sentence in both Inbox and Journal", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-m7-r2-semantic-");
  const durable = "Durable requirement: Public API changes must update project documentation.";
  const transientMarkers = Array.from(
    { length: 40 },
    (_, index) => `TRACE_${String(index).padStart(2, "0")}: console.log transient diagnostic line ${index}`,
  );
  const prompt = [durable, ...transientMarkers].join("\n");

  await api.evaluateCodexHookEvent(root, userPromptPayload(root, prompt), {
    id: "m7-r2-semantic-extraction",
    clock: () => FIXED_NOW,
  });

  const inboxPaths = (await listFiles(root)).filter((path) => path.startsWith(".pipeline/memory/inbox/"));
  assert.equal(inboxPaths.length, 1, "one clear durable statement should stage exactly one Inbox item");
  const inbox = api.parseYaml(await readText(join(root, inboxPaths[0])));
  const recovery = api.createRecoveryStore({ clock: () => FIXED_NOW });
  const replay = await recovery.replayRecoveryJournal(root, { object_ref: AMBIENT_REF });
  const journalEvent = replay.events.find((event) => event.payload?.kind === "ambient_maintain_delta");
  assert.ok(journalEvent, "the staged semantic delta must be recoverable from the Journal");

  const persistedBodies = [
    ["Inbox", inbox.record_patch.body],
    ["Journal", journalEvent.payload.record_patch.body],
  ];
  for (const [surface, body] of persistedBodies) {
    await t.test(surface, () => {
      assert.match(body, /Public API changes must update project documentation/);
      assert.notEqual(body, prompt, `${surface} must not persist the complete raw prompt`);
      assert.ok(Buffer.byteLength(body, "utf8") <= 512, `${surface} semantic body must be bounded`);
      for (const marker of transientMarkers) {
        assert.doesNotMatch(body, new RegExp(marker.split(":")[0]), `${surface} must exclude ${marker}`);
      }
    });
  }
});

test("a prompt with no durable statement remains zero-Inbox noise", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-m7-r2-semantic-noise-");
  const before = await listFiles(root);
  const prompt = Array.from({ length: 40 }, (_, index) => `TRACE_${index}: console output only`).join("\n");

  await api.evaluateCodexHookEvent(root, userPromptPayload(root, prompt), {
    id: "m7-r2-semantic-noise",
    clock: () => FIXED_NOW,
  });

  const added = (await listFiles(root)).filter((path) => !before.includes(path));
  assert.equal(added.some((path) => path.startsWith(".pipeline/memory/inbox/")), false);
});

test("output validator accepts the exact current documented release shapes", async (t) => {
  const accepted = [
    ["PreToolUse legacy block", "PreToolUse", { decision: "block", reason: "Block this supported tool call." }],
    ["PostToolUse feedback and context", "PostToolUse", {
      decision: "block",
      reason: "Review the completed side effect.",
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: "The command updated generated files.",
      },
    }],
    ["SessionStart common suppressOutput", "SessionStart", { suppressOutput: false }],
    ["UserPromptSubmit common suppressOutput", "UserPromptSubmit", { suppressOutput: false }],
    ["UserPromptSubmit block", "UserPromptSubmit", { decision: "block", reason: "Clarify the request first." }],
    ["Stop common suppressOutput", "Stop", { suppressOutput: false }],
    ["Stop continuation block", "Stop", { decision: "block", reason: "Run one more verification pass." }],
  ];

  for (const [name, event, output] of accepted) {
    await t.test(name, () => {
      assert.deepEqual(api.validateCodexHookOutput(event, output), output);
    });
  }
});

test("output validator keeps unsupported event-specific fields closed", async (t) => {
  const forbidden = [
    ["PreToolUse suppressOutput", "PreToolUse", { suppressOutput: false }],
    ["PermissionRequest continue", "PermissionRequest", { continue: false }],
    ["PostToolUse suppressOutput", "PostToolUse", { suppressOutput: false }],
    ["PostToolUse updated MCP output", "PostToolUse", { updatedMCPToolOutput: {} }],
    ["UserPromptSubmit updatedInput", "UserPromptSubmit", { updatedInput: { command: "echo no" } }],
    ["Stop hook-specific context", "Stop", {
      hookSpecificOutput: { hookEventName: "Stop", additionalContext: "not supported" },
    }],
  ];

  for (const [name, event, output] of forbidden) {
    await t.test(name, () => {
      assert.throws(
        () => api.validateCodexHookOutput(event, output),
        /unsupported|output|field|decision/i,
      );
    });
  }
});

test("PreToolUse rewrite validation is bound to the validated tool input", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-m7-r2-rewrite-");
  const inputs = {
    Bash: api.validateCodexHookInput(preToolPayload(root, "Bash", { command: "echo original" }, "bash")),
    apply_patch: api.validateCodexHookInput(preToolPayload(root, "apply_patch", {
      command: "*** Begin Patch\n*** Update File: src/live.js\n*** End Patch",
    }, "patch")),
    MCP: api.validateCodexHookInput(preToolPayload(root, "mcp__filesystem__read_file", {
      path: "README.md",
    }, "mcp")),
  };
  const allow = (updatedInput) => ({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      updatedInput,
    },
  });

  await t.test("Bash accepts a string command rewrite", () => {
    assert.deepEqual(api.validateCodexHookOutput("PreToolUse", allow({ command: "echo rewritten" }), inputs.Bash), allow({ command: "echo rewritten" }));
  });
  await t.test("apply_patch accepts a string command rewrite", () => {
    const output = allow({ command: "*** Begin Patch\n*** Update File: src/live.js\n*** End Patch" });
    assert.deepEqual(api.validateCodexHookOutput("PreToolUse", output, inputs.apply_patch), output);
  });
  for (const [name, toolInput, replacement] of [
    ["Bash rejects arbitrary replacement", inputs.Bash, { arbitrary: true }],
    ["Bash rejects a non-string command", inputs.Bash, { command: 42 }],
    ["apply_patch rejects a missing command", inputs.apply_patch, {}],
  ]) {
    await t.test(name, () => {
      assert.throws(
        () => api.validateCodexHookOutput("PreToolUse", allow(replacement), toolInput),
        /updatedInput|command|rewrite|unsupported|invalid/i,
      );
    });
  }
  await t.test("MCP accepts a replacement arguments object", () => {
    const output = allow({ path: "AGENTS.md", max_bytes: 512 });
    assert.deepEqual(api.validateCodexHookOutput("PreToolUse", output, inputs.MCP), output);
  });
});

test("PostToolUse derives a targeted apply_patch reminder without changed_paths", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m7-r2-reminder-target-");
  await seedActiveRecovery(root, "m7-r2-reminder-target");
  await writeText(join(root, "src/live.js"), "export const live = 2;\n");

  const output = await api.evaluateCodexHookEvent(root, postToolPayload(root, "target-1"), {
    id: "m7-r2-reminder-target-1",
    clock: () => FIXED_NOW,
  });

  assert.match(output.systemMessage, /src\/live\.js/, "the reminder must name the affected path");
});

test("PostToolUse suppresses no-new-effect repeats but reminds after the same path changes again", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m7-r2-reminder-effect-");
  await seedActiveRecovery(root, "m7-r2-reminder-effect");
  await writeText(join(root, "src/live.js"), "export const live = 2;\n");

  const first = await api.evaluateCodexHookEvent(root, postToolPayload(root, "effect-1"), {
    id: "m7-r2-reminder-effect-1",
    clock: () => FIXED_NOW,
  });
  const repeated = await api.evaluateCodexHookEvent(root, postToolPayload(root, "effect-2"), {
    id: "m7-r2-reminder-effect-2",
    clock: () => FIXED_NOW,
  });
  assert.equal(typeof first.systemMessage, "string");
  assert.equal(repeated.systemMessage, undefined, "an identical event with no new worktree effect must deduplicate");

  await writeText(join(root, "src/live.js"), "export const live = 3;\n");
  const changedAgain = await api.evaluateCodexHookEvent(root, postToolPayload(root, "effect-3"), {
    id: "m7-r2-reminder-effect-3",
    clock: () => FIXED_NOW,
  });
  assert.match(changedAgain.systemMessage, /src\/live\.js/, "a materially changed effect may remind again");
});

test("PostToolUse fails through the Hook error contract when reminder markers cannot be created", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m7-r2-reminder-io-");
  await seedActiveRecovery(root, "m7-r2-reminder-io");
  await writeText(join(root, ".pipeline/runtime/codex-hooks"), "blocks the marker directory\n");

  await assert.rejects(
    () => api.evaluateCodexHookEvent(root, postToolPayload(root, "io-1"), {
      id: "m7-r2-reminder-io-1",
      clock: () => FIXED_NOW,
    }),
    (error) => error?.code === "ERR_CODEX_HOOK_REMINDER_MARKER_FAILED",
  );
});

test("PostToolUse rejects a reminder marker parent symlink that escapes the workspace", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m7-r2-reminder-symlink-");
  const outside = await temporaryCurrentWorkspace(t, "hw-m7-r2-reminder-outside-");
  await seedActiveRecovery(root, "m7-r2-reminder-symlink");
  await symlink(outside, join(root, ".pipeline/runtime/codex-hooks"), process.platform === "win32" ? "junction" : "dir");

  await assert.rejects(
    () => api.evaluateCodexHookEvent(root, postToolPayload(root, "symlink-1"), {
      id: "m7-r2-reminder-symlink-1",
      clock: () => FIXED_NOW,
    }),
    (error) => error?.code === "ERR_CODEX_HOOK_REMINDER_MARKER_FAILED",
  );
});

test("PostToolUse rejects an ordinary file that replaces the final reminder marker", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m7-r2-reminder-file-");
  await seedActiveRecovery(root, "m7-r2-reminder-file");
  const payload = postToolPayload(root, "file-1");
  const first = await api.evaluateCodexHookEvent(root, payload, {
    id: "m7-r2-reminder-file-1",
    clock: () => FIXED_NOW,
  });
  assert.equal(typeof first.systemMessage, "string");

  const markerRoot = join(root, ".pipeline/runtime/codex-hooks/reminders");
  const entries = await readdir(markerRoot, { withFileTypes: true });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].isDirectory(), true);
  const markerPath = join(markerRoot, entries[0].name);
  await rmdir(markerPath);
  await writeText(markerPath, "not a marker directory\n");

  await assert.rejects(
    () => api.evaluateCodexHookEvent(root, postToolPayload(root, "file-2"), {
      id: "m7-r2-reminder-file-2",
      clock: () => FIXED_NOW,
    }),
    (error) => error?.code === "ERR_CODEX_HOOK_REMINDER_MARKER_FAILED",
  );
});

function userPromptPayload(root, prompt) {
  return {
    session_id: "session-m7-r2",
    transcript_path: null,
    cwd: root,
    hook_event_name: "UserPromptSubmit",
    model: "official-codex-test",
    permission_mode: "default",
    turn_id: "turn-m7-r2",
    prompt,
  };
}

function preToolPayload(root, toolName, toolInput, suffix) {
  return {
    session_id: "session-m7-r2",
    transcript_path: null,
    cwd: root,
    hook_event_name: "PreToolUse",
    model: "official-codex-test",
    permission_mode: "default",
    turn_id: `turn-${suffix}`,
    tool_name: toolName,
    tool_use_id: `tool-${suffix}`,
    tool_input: toolInput,
  };
}

function postToolPayload(root, toolUseId) {
  return {
    session_id: "session-m7-r2",
    transcript_path: null,
    cwd: root,
    hook_event_name: "PostToolUse",
    model: "official-codex-test",
    permission_mode: "default",
    turn_id: "turn-reminder",
    tool_name: "apply_patch",
    tool_use_id: toolUseId,
    tool_input: {
      command: "*** Begin Patch\n*** Update File: src/live.js\n*** End Patch",
    },
    tool_response: { status: "success" },
  };
}
