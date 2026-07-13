import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import * as api from "../src/index.js";
import {
  AMBIENT_REF,
  FIXED_NOW,
  exists,
  listFiles,
  snapshotTree,
  temporaryCurrentWorkspace,
} from "./fixtures/c21-m7/helpers.js";

test("ambient semantic delta stages M3 Journal + new Inbox + Record Patch without an activity pointer", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-m7-ambient-");
  const store = requireAmbientStore();
  assert.equal(await exists(join(root, ".pipeline/runtime/active.yaml")), false);

  const result = await store.captureSemanticDelta(root, semanticDelta(), { id: "m7-ambient-capture" });

  assert.equal(result.status, "staged");
  assert.equal(result.semantic_dirty, true);
  assert.match(result.journal_ref.path, /^\.pipeline\/runtime\/objects\/activity\/ambient-maintain\/events\//);
  assert.match(result.inbox_ref.path, /^\.pipeline\/memory\/inbox\//);
  assert.equal(await exists(join(root, result.journal_ref.path)), true);
  assert.equal(await exists(join(root, result.inbox_ref.path)), true);
  assert.equal(result.record_patch.scope.type, "project");
  assert.equal(result.record_patch.kind, "requirement");
  assert.match(result.record_patch.body, /documentation/i);
  assert.equal(await exists(join(root, ".pipeline/runtime/active.yaml")), false);

  const files = await listFiles(root);
  assert.equal(files.some((path) => path.startsWith(".pipeline/memory/records/")), false);
  assert.equal(files.some((path) => path.startsWith(".pipeline/chat/")), false);
  assert.equal(files.some((path) => path.startsWith(".pipeline/inbox/")), false);
});

test("ordinary noise does not create an Inbox item or force a Record Patch", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-m7-ambient-noise-");
  const store = requireAmbientStore();
  const before = await listFiles(root);

  const result = await store.captureSemanticDelta(root, semanticDelta({
    summary: "Thanks.",
    semantic_delta: null,
  }), { id: "m7-ambient-noise" });

  assert.equal(result.status, "ignored");
  assert.equal(result.semantic_dirty, false);
  assert.equal(result.inbox_ref, null);
  assert.equal(result.record_patch, null);
  const added = (await listFiles(root)).filter((path) => !before.includes(path));
  assert.equal(added.some((path) => path.startsWith(".pipeline/memory/inbox/")), false);
  assert.equal(added.some((path) => path.startsWith(".pipeline/memory/records/")), false);
});

test("cheap recorder output remains a zero-write proposal until deterministic main promotion", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-m7-recorder-");
  const store = requireAmbientStore();
  const staged = await store.captureSemanticDelta(root, semanticDelta(), { id: "m7-recorder-stage" });
  const beforeRecorder = await snapshotTree(root);

  const evaluated = await store.evaluateRecorderProposal(root, {
    object_ref: AMBIENT_REF,
    session_id: "session-m7",
    turn_id: "turn-m7",
    writer: { kind: "subagent", id: "recorder-cheap-1" },
    proposal: { record_patch: staged.record_patch },
  });

  assert.equal(evaluated.status, "proposal_only");
  assert.equal(evaluated.authority_write, false);
  assert.deepEqual(evaluated.record_patch, staged.record_patch);
  assert.deepEqual(await snapshotTree(root), beforeRecorder, "recorder evaluation must not write authority");

  const promoted = await store.promoteRecordPatch(root, {
    inbox_ref: staged.inbox_ref,
    record_patch: evaluated.record_patch,
    reviewer: { kind: "main", id: "main" },
  }, { id: "m7-recorder-promote" });
  assert.match(promoted.record_ref.path, /^\.pipeline\/memory\/records\//);
  assert.equal(await exists(join(root, promoted.record_ref.path)), true);
});

function requireAmbientStore() {
  assert.equal(typeof api.createAmbientMaintainStore, "function", "createAmbientMaintainStore must be exported");
  const store = api.createAmbientMaintainStore({ clock: () => FIXED_NOW });
  for (const method of ["captureSemanticDelta", "evaluateRecorderProposal", "promoteRecordPatch"]) {
    assert.equal(typeof store[method], "function", `Ambient Maintain store must expose ${method}`);
  }
  return store;
}

function semanticDelta(overrides = {}) {
  return {
    object_ref: AMBIENT_REF,
    session_id: "session-m7",
    turn_id: "turn-m7",
    writer: { kind: "main", id: "main" },
    source: "user_prompt",
    summary: "Public API changes must update project documentation.",
    semantic_delta: {
      scope: { type: "project", ref: "project:m7-fixture" },
      kind: "requirement",
      confidence: "confirmed",
      dedupe_key: "project:m7:documentation-update",
      body: "Public API changes must update project documentation.",
      source_refs: [{ type: "session", ref: "session-m7", locator: "turn-m7" }],
      supersedes: [],
    },
    ...overrides,
  };
}
