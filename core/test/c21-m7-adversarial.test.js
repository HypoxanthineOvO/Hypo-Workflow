import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import * as api from "../src/index.js";
import {
  ACTOR,
  AMBIENT_REF,
  exists,
  snapshotTree,
  temporaryCurrentWorkspace,
  temporaryGitWorkspace,
  writeText,
} from "./fixtures/c21-m7/helpers.js";

const PROTECTED_DESCENDANTS = Object.freeze([
  ".pipeline/runtime/active.yaml/child.txt",
  ".pipeline/runtime/migrations/job/acceptance.yaml/child.txt",
]);

test("Ambient Maintain rejects key-value secret text before Journal or Inbox writes", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-m7-ambient-secret-");
  const before = await snapshotTree(root);
  const store = api.createAmbientMaintainStore({ clock: () => "2026-07-12T16:00:00+08:00" });
  await assert.rejects(
    () => store.captureSemanticDelta(root, {
      object_ref: AMBIENT_REF,
      session_id: "session-adversarial",
      turn_id: "turn-adversarial",
      writer: { kind: "main", id: "main" },
      source: "user_prompt",
      summary: "A durable requirement containing secret-like text.",
      semantic_delta: {
        scope: { type: "project", ref: "project:adversarial" },
        kind: "requirement",
        confidence: "confirmed",
        dedupe_key: "adversarial:secret",
        body: "password=super-secret-value-123456789",
        source_refs: [{ type: "session", ref: "session-adversarial", locator: "turn-adversarial" }],
        supersedes: [],
      },
    }, { id: "ambient-secret" }),
    /secret|credential|forbidden/i,
  );
  assert.deepEqual(await snapshotTree(root), before, "secret rejection must be byte-for-byte zero-write");
});

test("Deletion Manifest rejects descendants of protected exact and bootstrap authority files", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m7-delete-protected-descendant-");
  for (const path of PROTECTED_DESCENDANTS) {
    await writeText(join(root, path), `protected descendant: ${path}\n`);
    await assert.rejects(
      () => api.buildDeletionManifest(root, {
        paths: [path],
        reason: "Adversarial protected-descendant check.",
        replacement: "none",
      }),
      /protected|authority|acceptance|recovery|evidence/i,
      `${path} must not enter a Deletion Manifest`,
    );
    assert.equal(await exists(join(root, path)), true);
  }
});

test("Deletion Receipt context rejects crafted manifests for protected descendants", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m7-delete-context-descendant-");
  const baseline = await api.buildDeletionManifest(root, {
    paths: ["docs/obsolete.md"],
    reason: "Build a valid baseline before adversarial rebinding.",
    replacement: "src/live.js",
  });

  for (const path of PROTECTED_DESCENDANTS) {
    const { manifest_hash: _ignored, ...body } = structuredClone(baseline);
    body.entries = [{ ...body.entries[0], path }];
    const crafted = { ...body, manifest_hash: api.canonicalHash(body) };
    assert.throws(
      () => api.buildDeletionReceiptContext(crafted, { actor: ACTOR }),
      /protected|authority|acceptance|recovery|evidence/i,
      `${path} must not receive a deletion Receipt context`,
    );
  }
});
