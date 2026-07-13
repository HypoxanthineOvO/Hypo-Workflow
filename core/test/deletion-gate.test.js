import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import * as api from "../src/index.js";
import {
  ACTOR,
  OTHER_ACTOR,
  exists,
  overwrite,
  runGit,
  temporaryGitWorkspace,
  writeProtectedFixturePaths,
} from "./fixtures/c21-m7/helpers.js";

const TARGET = "docs/obsolete.md";
const PROTECTED_PATHS = Object.freeze([
  ".pipeline/manifest.yaml",
  ".pipeline/runtime/objects/delivery/c21/runtime.yaml",
  ".pipeline/runtime/objects/delivery/c21/continuation.yaml",
  ".pipeline/runtime/objects/delivery/c21/events/session/main/00000001.jsonl",
  ".pipeline/memory/capsules/delivery/c21.yaml",
  ".pipeline/memory/records/project/test/decision/record.md",
  ".pipeline/snapshots/cycles/c21/checkpoint-test.yaml",
  ".pipeline/runtime/recovery/packs/delivery/c21/test/pack.yaml",
  ".pipeline/runtime/migrations/c21-reference-bootstrap/acceptance.yaml",
  ".pipeline/runtime/migrations/c21-reference-bootstrap/rollback-checkpoint.yaml",
  ".pipeline/reviews/C21/M5/legacy-freeze-acceptance-baseline.json",
]);

test("Deletion Manifest binds path hashes and Git state and excludes the M5 accepted-bootstrap protected set", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m7-delete-protected-");
  requireDeletionApi();
  await writeProtectedFixturePaths(root, PROTECTED_PATHS);
  for (const path of PROTECTED_PATHS) {
    await assert.rejects(
      () => api.buildDeletionManifest(root, { paths: [path], reason: "cleanup", replacement: "none" }),
      /protected|authority|acceptance|recovery|evidence/i,
      `${path} must never enter an ordinary Deletion Manifest`,
    );
    assert.equal(await exists(join(root, path)), true);
  }

  const manifest = await api.buildDeletionManifest(root, {
    paths: [TARGET],
    reason: "Remove the obsolete fixture after replacement.",
    replacement: "src/live.js",
  });
  assert.match(manifest.manifest_hash, /^[a-f0-9]{64}$/);
  assert.equal(manifest.git.head, runGit(root, ["rev-parse", "HEAD"]));
  assert.equal(manifest.entries[0].path, TARGET);
  assert.match(manifest.entries[0].sha256, /^[a-f0-9]{64}$/);
});

test("no Receipt, wrong owner, expiry, content drift, and Git drift all leave targets intact", async (t) => {
  const scenarios = ["missing", "owner", "expired", "content", "git"];
  for (const scenario of scenarios) {
    await t.test(scenario, async (subtest) => {
      const root = await temporaryGitWorkspace(subtest, `hw-m7-delete-${scenario}-`);
      requireDeletionApi();
      const manifest = await api.buildDeletionManifest(root, {
        paths: [TARGET],
        reason: "Remove obsolete fixture.",
        replacement: "src/live.js",
      });
      let receiptId;
      if (scenario !== "missing") {
        const context = api.buildDeletionReceiptContext(manifest, { actor: ACTOR });
        const issuedAt = scenario === "expired" ? "2020-01-01T00:00:00Z" : new Date(Date.now() - 1_000).toISOString();
        const expiresAt = scenario === "expired" ? "2020-01-02T00:00:00Z" : new Date(Date.now() + 3_600_000).toISOString();
        const issued = await api.issueReceipt(root, { ...context, issued_at: issuedAt, expires_at: expiresAt }, {
          id: `m7-delete-${scenario}-receipt`,
        });
        receiptId = issued.id;
      }
      if (scenario === "content") await overwrite(join(root, TARGET), "drifted target bytes\n");
      if (scenario === "git") {
        await overwrite(join(root, "src", "new.js"), "export const changed = true;\n");
        runGit(root, ["add", "src/new.js"]);
        runGit(root, ["commit", "-qm", "drift HEAD"]);
      }
      await assert.rejects(
        () => api.executeDeletionManifest(root, {
          manifest,
          ...(receiptId ? { receipt_id: receiptId } : {}),
          actor: scenario === "owner" ? OTHER_ACTOR : ACTOR,
          tool_use_id: `tool-${scenario}`,
        }, { id: `m7-delete-${scenario}-execute` }),
        /receipt|owner|expired|drift|hash|git|manifest|required/i,
      );
      assert.equal(await exists(join(root, TARGET)), true, `${scenario} rejection must perform zero deletion`);
    });
  }
});

test("controlled executor reserves, revalidates, deletes once, consumes Receipt, and writes evidence", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m7-delete-success-");
  requireDeletionApi();
  const manifest = await api.buildDeletionManifest(root, {
    paths: [TARGET],
    reason: "Remove obsolete fixture.",
    replacement: "src/live.js",
  });
  const context = api.buildDeletionReceiptContext(manifest, { actor: ACTOR });
  assert.equal(context.intent, "deletion.execute");
  assert.equal(context.plan_hash, manifest.manifest_hash);
  const issued = await api.issueReceipt(root, {
    ...context,
    issued_at: new Date(Date.now() - 1_000).toISOString(),
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  }, { id: "m7-delete-success-receipt" });

  const result = await api.executeDeletionManifest(root, {
    manifest,
    receipt_id: issued.id,
    actor: ACTOR,
    tool_use_id: "tool-delete-success",
  }, { id: "m7-delete-success-execute" });
  assert.deepEqual(result.deleted_paths, [TARGET]);
  assert.equal(await exists(join(root, TARGET)), false);
  assert.equal((await api.readReceipt(root, issued.id)).state, "consumed");
  assert.match(result.report_ref.path, /^\.pipeline\/runtime\/.+deletion.+/);
  assert.equal(await exists(join(root, result.report_ref.path)), true);
});

test("repository deletion keeps Receipt authority separate from the exact target repository", async (t) => {
  const authorityRoot = await temporaryGitWorkspace(t, "hw-m7-delete-authority-");
  const targetRoot = await temporaryGitWorkspace(t, "hw-m7-delete-target-");
  const manifest = await api.buildDeletionManifest(targetRoot, {
    paths: [TARGET],
    reason: "Remove obsolete target-owned source through central authority.",
    replacement: "src/live.js",
  });
  const context = api.buildDeletionReceiptContext(manifest, { actor: ACTOR });
  const issued = await api.issueReceipt(authorityRoot, {
    ...context,
    issued_at: new Date(Date.now() - 1_000).toISOString(),
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  }, { id: "m7-delete-external-receipt" });

  const result = await api.executeRepositoryDeletionManifest(authorityRoot, targetRoot, {
    manifest,
    receipt_id: issued.id,
    actor: ACTOR,
    tool_use_id: "tool-delete-external",
  }, { id: "m7-delete-external-execute" });

  assert.deepEqual(result.deleted_paths, [TARGET]);
  assert.equal(await exists(join(targetRoot, TARGET)), false);
  assert.equal(await exists(join(authorityRoot, result.report_ref.path)), true);
  assert.equal(await api.readReceipt(authorityRoot, issued.id).then((receipt) => receipt.state), "consumed");
});

function requireDeletionApi() {
  for (const name of [
    "buildDeletionManifest",
    "validateDeletionManifest",
    "buildDeletionReceiptContext",
    "executeDeletionManifest",
    "executeRepositoryDeletionManifest",
  ]) assert.equal(typeof api[name], "function", `${name} must be exported from the Core root`);
}
