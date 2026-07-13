import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  detectWorkspaceFormat,
  parseYaml,
  planRecoveryRestore,
  readActivePointer,
  readContextCapsule,
  readRuntimeObject,
  readSnapshot,
  validateRecoveryPack,
  validateWorkspaceManifest,
} from "../src/index.js";
import {
  BOOTSTRAP_JOB_REF,
  copyReferenceWorkspace,
  DELIVERY_REF,
  legacyAuthoritySnapshot,
  listFiles,
  NEXT_ACTION,
  prepareStagedBootstrap,
  snapshotTree,
  temporaryDirectory,
  writeText,
} from "./fixtures/c21-m5/helpers.js";

const MIGRATION_MODULE_URL = new URL("../src/migration/index.js", import.meta.url).href;
const MIGRATION_PROBE = await import(MIGRATION_MODULE_URL)
  .then((api) => ({ api, error: null }))
  .catch((error) => ({ api: null, error }));
const ROOT_API = await import("../src/index.js");
const REQUIRED_ACTIVATION_APIS = Object.freeze([
  "createBootstrapProposal",
  "mergeBootstrapProposals",
  "curateBootstrapProposals",
  "auditBootstrapProposal",
  "stageBootstrapWorkspace",
  "activateBootstrapWorkspace",
  "recoverBootstrapActivation",
  "rollbackBootstrapActivation",
  "restoreBootstrapWorkspace",
]);
const HAS_ACTIVATION_APIS = !MIGRATION_PROBE.error
  && REQUIRED_ACTIVATION_APIS.every((name) => typeof MIGRATION_PROBE.api?.[name] === "function");

function activationBehavior(name, fn) {
  return test(name, {
    skip: HAS_ACTIVATION_APIS ? false : "C21-M5 bootstrap activation/recovery APIs are not implemented",
  }, fn);
}

test("M5 publishes activate, recover, rollback, and fresh restore APIs from migration and Core root", () => {
  if (MIGRATION_PROBE.error) {
    assert.fail(`core/src/migration/index.js must import cleanly: ${MIGRATION_PROBE.error.code || MIGRATION_PROBE.error.message}`);
  }
  for (const name of [
    "activateBootstrapWorkspace",
    "recoverBootstrapActivation",
    "rollbackBootstrapActivation",
    "restoreBootstrapWorkspace",
  ]) {
    assert.equal(typeof MIGRATION_PROBE.api[name], "function", `migration module must export ${name}`);
    assert.equal(typeof ROOT_API[name], "function", `Core root must export ${name}`);
  }
});

activationBehavior("manifest-last activation installs complete C21 authority and preserves stale legacy bytes and mtimes", async (t) => {
  const root = await temporaryDirectory(t, "hw-m5-activation-complete-");
  await copyReferenceWorkspace(root);
  const legacyBefore = await legacyAuthoritySnapshot(root);
  const staleLegacyState = await readFile(join(root, ".pipeline/state.yaml"), "utf8");
  assert.match(staleLegacyState, /prompt_index: 3/);
  assert.match(staleLegacyState, /init-workspace-adoption/);

  const { stage } = await prepareStagedBootstrap(MIGRATION_PROBE.api, root, {
    stageId: "m5-complete-stage",
  });
  assert.equal(stage.status, "staged");
  assert.deepEqual(stage.bootstrap_job_ref, BOOTSTRAP_JOB_REF);
  assert.match(stage.semantic_hash, /^[a-f0-9]{64}$/);
  assert.ok(stage.write_set.length >= 10, "stage must compile complete authority rather than a manifest-only cutover");
  assert.equal(await detectWorkspaceFormat(root).then((value) => value.kind), "legacy");
  assert.deepEqual(await legacyAuthoritySnapshot(root), legacyBefore);

  const activated = await MIGRATION_PROBE.api.activateBootstrapWorkspace(root, stage, {
    id: "m5-complete-activate",
  });
  assert.equal(activated.status, "activated");
  assert.deepEqual(activated.bootstrap_job_ref, BOOTSTRAP_JOB_REF);
  assert.deepEqual(activated.object_ref, DELIVERY_REF);
  assert.equal(activated.transaction_id, "m5-complete-activate");
  assert.ok(activated.rollback_checkpoint_ref, "activation must retain a rollback checkpoint before acceptance");
  assert.equal(await detectWorkspaceFormat(root).then((value) => value.kind), "mixed_current_with_legacy_residue");
  assert.deepEqual(await legacyAuthoritySnapshot(root), legacyBefore);

  const manifest = validateWorkspaceManifest(parseYaml(
    await readFile(join(root, ".pipeline/manifest.yaml"), "utf8"),
  ));
  assert.equal(manifest.project_id, "hypo-workflow-reference-fixture");
  assert.deepEqual(activated.manifest, manifest);

  const active = await readActivePointer(root);
  assert.deepEqual(active.active, { delivery: DELIVERY_REF });
  assert.equal(Object.hasOwn(active.active, "bootstrap_job"), false, "completed Bootstrap Job must not masquerade as Main Delivery");

  const runtimeObject = await readRuntimeObject(root, DELIVERY_REF);
  assert.equal(runtimeObject.runtime.status, "executing");
  assert.equal(runtimeObject.runtime.cycle_id, "C21");
  assert.equal(runtimeObject.runtime.current_milestone, "M5");
  assert.equal(runtimeObject.runtime.current_step, "bootstrap_activation");
  assert.equal(runtimeObject.continuation.current_milestone, "M5");
  assert.equal(runtimeObject.continuation.next_milestone, "M6");
  assert.equal(runtimeObject.continuation.next_action, NEXT_ACTION);

  const index = parseYaml(await readFile(join(root, ".pipeline/memory/index.yaml"), "utf8"));
  assert.equal(index.authority_role, "derived");
  assert.equal(index.records.length, 7);
  assert.equal(Object.keys(index.active_by_dedupe_key).length, 6);
  assert.equal(
    index.active_by_dedupe_key["architecture/product-boundary"],
    activated.records.find((record) => record.key === "architecture-skill-first-current").id,
  );

  const capsule = await readContextCapsule(root, DELIVERY_REF);
  assert.equal(capsule.authority_role, "derived");
  assert.deepEqual(capsule.object_ref, DELIVERY_REF);
  assert.equal(capsule.context.next_action, NEXT_ACTION);

  const packValidation = await validateRecoveryPack(root, activated.pack_ref);
  assert.equal(packValidation.valid, true, JSON.stringify(packValidation.errors));
  const restore = await planRecoveryRestore(root, { object_ref: DELIVERY_REF, budget_bytes: 32_768 });
  assert.deepEqual(restore.selected_pack_ref, activated.pack_ref);
  assert.equal(restore.next_action, NEXT_ACTION);

  const checkpoint = await readSnapshot(root, activated.checkpoint.path);
  assert.equal(checkpoint.snapshot_kind, "checkpoint");
  assert.equal(checkpoint.object.object_type, "cycle");
  assert.deepEqual(checkpoint.object.object_ref, DELIVERY_REF);
  assert.equal(checkpoint.object.state, "checkpoint");
  assert.equal(checkpoint.object.object_ref.kind, "delivery");
  assert.notEqual(checkpoint.object.object_ref.kind, "bootstrap_job");

  const files = await listFiles(root);
  for (const required of [
    ".pipeline/manifest.yaml",
    ".pipeline/runtime/active.yaml",
    ".pipeline/runtime/objects/delivery/c21/runtime.yaml",
    ".pipeline/runtime/objects/delivery/c21/continuation.yaml",
    ".pipeline/memory/index.yaml",
    ".pipeline/memory/INDEX.md",
    ".pipeline/memory/capsules/delivery/c21.yaml",
  ]) {
    assert.ok(files.includes(required), `activation omitted ${required}`);
  }
  assert.ok(files.some((path) => path.startsWith(".pipeline/memory/records/") && path.endsWith(".md")));
  assert.ok(files.some((path) => path.startsWith(".pipeline/runtime/recovery/packs/delivery/c21/") && path.endsWith("/pack.yaml")));
  assert.ok(files.some((path) => path.startsWith(".pipeline/snapshots/cycles/c21/checkpoint-") && path.endsWith(".yaml")));
});

activationBehavior("activation faults at prepare, install, before manifest, and after manifest recover deterministically", async (t) => {
  const cases = [
    { phase: "after_prepare", expectedAction: "rolled_back", expectedCurrent: false },
    { phase: "after_install_file", expectedAction: "rolled_back", expectedCurrent: false },
    { phase: "before_manifest_activation", expectedAction: "rolled_forward", expectedCurrent: true },
    { phase: "after_manifest_activation", expectedAction: "finalized", expectedCurrent: true },
  ];

  for (const entry of cases) {
    await t.test(entry.phase, async (subtest) => {
      const root = await temporaryDirectory(subtest, `hw-m5-fault-${entry.phase}-`);
      await copyReferenceWorkspace(root);
      const legacyBefore = await legacyAuthoritySnapshot(root);
      const transactionId = `m5-fault-${entry.phase.replaceAll("_", "-")}`;
      const { stage } = await prepareStagedBootstrap(MIGRATION_PROBE.api, root, {
        stageId: `${transactionId}-stage`,
      });

      await assert.rejects(
        MIGRATION_PROBE.api.activateBootstrapWorkspace(root, stage, {
          id: transactionId,
          faultInjector: async (event) => {
            if (event.phase !== entry.phase) return;
            if (entry.phase === "after_install_file" && event.index !== 0) return;
            throw new Error(`injected bootstrap activation fault at ${entry.phase}`);
          },
        }),
        new RegExp(`injected bootstrap activation fault at ${entry.phase}`),
      );
      const recovered = await MIGRATION_PROBE.api.recoverBootstrapActivation(root, {
        bootstrap_job_ref: BOOTSTRAP_JOB_REF,
        transaction_id: transactionId,
      });
      assert.equal(recovered.action, entry.expectedAction);
      assert.equal(recovered.status, entry.expectedCurrent ? "activated" : "rolled_back");
      const detected = await detectWorkspaceFormat(root);
      assert.equal(
        ["current", "mixed_current_with_legacy_residue"].includes(detected.kind),
        entry.expectedCurrent,
      );
      assert.deepEqual(await legacyAuthoritySnapshot(root), legacyBefore);
      if (entry.expectedCurrent) {
        assert.equal((await readRuntimeObject(root, DELIVERY_REF)).continuation.next_action, NEXT_ACTION);
      }
    });
  }
});

activationBehavior("a pending activation transaction blocks a parallel Bootstrap before any second staging write", async (t) => {
  const root = await temporaryDirectory(t, "hw-m5-pending-exclusive-");
  await copyReferenceWorkspace(root);
  const legacyBefore = await legacyAuthoritySnapshot(root);
  const { input, stage } = await prepareStagedBootstrap(MIGRATION_PROBE.api, root, {
    stageId: "m5-pending-first-stage",
  });
  const transactionId = "m5-pending-first-activation";
  await assert.rejects(
    MIGRATION_PROBE.api.activateBootstrapWorkspace(root, stage, {
      id: transactionId,
      faultInjector: async ({ phase }) => {
        if (phase === "after_prepare") throw new Error("leave first Bootstrap pending");
      },
    }),
    /leave first Bootstrap pending/,
  );
  const pendingTree = await snapshotTree(root);

  await assert.rejects(
    MIGRATION_PROBE.api.stageBootstrapWorkspace(root, input, { id: "m5-pending-second-stage" }),
    (error) => /PENDING|CONCURRENT|EXCLUSIVE/.test(String(error?.code))
      || /pending|concurrent|exclusive|recover/i.test(String(error?.message)),
  );
  assert.deepEqual(await snapshotTree(root), pendingTree);
  assert.deepEqual(await legacyAuthoritySnapshot(root), legacyBefore);
  assert.equal(
    (await MIGRATION_PROBE.api.recoverBootstrapActivation(root, {
      bootstrap_job_ref: BOOTSTRAP_JOB_REF,
      transaction_id: transactionId,
    })).action,
    "rolled_back",
  );
});

activationBehavior("activation revalidates audited source digests after staging and fails before manifest on drift", async (t) => {
  const root = await temporaryDirectory(t, "hw-m5-activation-source-drift-");
  await copyReferenceWorkspace(root);
  const legacyBefore = await legacyAuthoritySnapshot(root);
  const { stage } = await prepareStagedBootstrap(MIGRATION_PROBE.api, root, {
    stageId: "m5-source-drift-stage",
  });
  await writeText(root, ".pipeline/bootstrap-sources/accepted-outcome.md", "drift after deterministic staging\n");
  const beforeAttempt = await snapshotTree(root);

  await assert.rejects(
    MIGRATION_PROBE.api.activateBootstrapWorkspace(root, stage, {
      id: "m5-source-drift-activate",
    }),
    /source|drift|digest|audit|integrity/i,
  );
  assert.deepEqual(await snapshotTree(root), beforeAttempt);
  assert.deepEqual(await legacyAuthoritySnapshot(root), legacyBefore);
  assert.equal(await detectWorkspaceFormat(root).then((value) => value.kind), "legacy");
});

activationBehavior("rollback checkpoint is usable before acceptance and never deletes tracked legacy files", async (t) => {
  const root = await temporaryDirectory(t, "hw-m5-rollback-checkpoint-");
  await copyReferenceWorkspace(root);
  const legacyBefore = await legacyAuthoritySnapshot(root);
  const trackedLegacy = await snapshotTree(root, { exclude: [".pipeline/runtime"] });
  const { stage } = await prepareStagedBootstrap(MIGRATION_PROBE.api, root, {
    stageId: "m5-rollback-stage",
  });
  const activated = await MIGRATION_PROBE.api.activateBootstrapWorkspace(root, stage, {
    id: "m5-rollback-activate",
  });
  assert.ok(activated.rollback_checkpoint_ref);

  const rolledBack = await MIGRATION_PROBE.api.rollbackBootstrapActivation(root, {
    bootstrap_job_ref: BOOTSTRAP_JOB_REF,
    checkpoint_ref: activated.rollback_checkpoint_ref,
  }, { id: "m5-rollback-apply" });
  assert.equal(rolledBack.status, "rolled_back");
  assert.equal(await detectWorkspaceFormat(root).then((value) => value.kind), "legacy");
  assert.deepEqual(await legacyAuthoritySnapshot(root), legacyBefore);

  const after = await snapshotTree(root, { exclude: [".pipeline/runtime"] });
  for (const [path, digest] of Object.entries(trackedLegacy)) {
    assert.equal(after[path], digest, `rollback deleted or changed tracked legacy file ${path}`);
  }
  assert.equal(Object.hasOwn(after, ".pipeline/manifest.yaml"), false);
  assert.equal(Object.keys(after).some((path) => path.startsWith(".pipeline/memory/")), false);
  assert.equal(Object.keys(after).some((path) => path.startsWith(".pipeline/snapshots/")), false);
});

activationBehavior("fresh child process restores M5/M6 from latest valid Pack and ignores corrupt head, stale legacy state, and transcript", async (t) => {
  const root = await temporaryDirectory(t, "hw-m5-fresh-restore-");
  await copyReferenceWorkspace(root);
  const legacyBefore = await legacyAuthoritySnapshot(root);
  const { stage } = await prepareStagedBootstrap(MIGRATION_PROBE.api, root, {
    stageId: "m5-fresh-stage",
  });
  const activated = await MIGRATION_PROBE.api.activateBootstrapWorkspace(root, stage, {
    id: "m5-fresh-activate",
  });

  const corruptPackId = "f".repeat(64);
  const corruptBase = `.pipeline/runtime/recovery/packs/delivery/c21/${corruptPackId}`;
  await writeText(root, `${corruptBase}/pack.yaml`, "CORRUPT_SYNTHETIC_PACK_HEAD\n");
  await writeText(root, `${corruptBase}/seal.yaml`, "schema_version: broken\n");
  const treeBeforeRestore = await snapshotTree(root);
  const script = [
    `const api = await import(${JSON.stringify(MIGRATION_MODULE_URL)});`,
    "const result = await api.restoreBootstrapWorkspace(process.env.HW_M5_ROOT, {",
    "  object_ref: { kind: 'delivery', id: 'c21' },",
    "  budget_bytes: 32768,",
    "});",
    "process.stdout.write(JSON.stringify(result));",
  ].join("\n");
  const child = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, HW_M5_ROOT: root },
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stderr, "");
  const restored = JSON.parse(child.stdout);

  assert.equal(restored.status, "ready");
  assert.deepEqual(restored.object_ref, DELIVERY_REF);
  assert.deepEqual(restored.selected_pack_ref, activated.pack_ref);
  assert.equal(restored.next_action, NEXT_ACTION);
  assert.equal(restored.runtime.status, "executing");
  assert.equal(restored.runtime.current_milestone, "M5");
  assert.equal(restored.continuation.current_milestone, "M5");
  assert.equal(restored.continuation.next_milestone, "M6");
  assert.equal(restored.continuation.next_action, NEXT_ACTION);
  assert.equal(restored.rejected_packs.some((entry) => entry.pack_ref.id === corruptPackId), true);

  const rendered = JSON.stringify(restored);
  assert.doesNotMatch(rendered, /init-workspace-adoption-and-minimal-skill-router|prompt_index[^\d]*3/i);
  assert.doesNotMatch(rendered, /CORRUPT_SYNTHETIC_PACK_HEAD/);
  assert.doesNotMatch(rendered, /transcript|raw[_ -]?chat|full[_ -]?tool[_ -]?log/i);
  assert.deepEqual(await snapshotTree(root), treeBeforeRestore, "fresh restore must be read-only");
  assert.deepEqual(await legacyAuthoritySnapshot(root), legacyBefore);
});
