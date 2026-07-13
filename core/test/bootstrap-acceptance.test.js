import test from "node:test";
import assert from "node:assert/strict";
import {
  cp,
  lstat,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  symlink,
  utimes,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import * as ROOT_API from "../src/index.js";
import {
  BOOTSTRAP_JOB_REF,
  copyReferenceWorkspace,
  DELIVERY_REF,
  FIXED_NOW,
  legacyAuthoritySnapshot,
  prepareStagedBootstrap,
  sha256,
  snapshotTree,
  temporaryDirectory,
  writeText,
} from "./fixtures/c21-m5/helpers.js";

const MIGRATION_MODULE_URL = new URL("../src/migration/index.js", import.meta.url).href;
const MIGRATION_PROBE = await import(MIGRATION_MODULE_URL)
  .then((api) => ({ api, error: null }))
  .catch((error) => ({ api: null, error }));
const ACCEPT_API = "acceptBootstrapActivation";
const HAS_ACCEPT_API = !MIGRATION_PROBE.error
  && typeof MIGRATION_PROBE.api?.[ACCEPT_API] === "function"
  && typeof ROOT_API[ACCEPT_API] === "function";
const PENDING_CODE = "ERR_BOOTSTRAP_ACCEPTANCE_PENDING";
const ACCEPTED_ROLLBACK_CODE = "ERR_BOOTSTRAP_ROLLBACK_ACCEPTED";
const PAYLOAD_MARKER = "M5_PENDING_PAYLOAD_MUST_NOT_LEAK_7Q3X";
const LEGACY_FREEZE_PATHS = Object.freeze([
  ".pipeline/PROGRESS.md",
  ".pipeline/cycle.yaml",
  ".pipeline/log.yaml",
  ".pipeline/state.yaml",
]);
const FILE_EVIDENCE_PATH = ".pipeline/bootstrap-sources/accepted-outcome.md";

function acceptanceBehavior(name, fn) {
  return test(name, {
    skip: HAS_ACCEPT_API ? false : "C21-M5 Bootstrap acceptance API is not implemented",
  }, fn);
}

test("M5 publishes internal Bootstrap acceptance from migration and Core root", () => {
  if (MIGRATION_PROBE.error) {
    assert.fail(`core/src/migration/index.js must import cleanly: ${MIGRATION_PROBE.error.code || MIGRATION_PROBE.error.message}`);
  }
  const missing = [MIGRATION_PROBE.api, ROOT_API]
    .map((api, index) => (typeof api?.[ACCEPT_API] === "function" ? null : ["migration", "Core root"][index]))
    .filter(Boolean);
  assert.deepEqual(missing, [], `${ACCEPT_API} must be an internal API exported by migration and Core root`);
});

test("new activation seals all four legacy freeze files into the rollback checkpoint", async (t) => {
  const { root, activated, legacyFreezeBefore } = await activateReferenceWorkspace(t, "legacy-freeze-seal");
  const checkpoint = ROOT_API.parseYaml(await readFile(
    join(root, activated.rollback_checkpoint_ref.path),
    "utf8",
  ));

  assert.deepEqual(
    sortedByPath(checkpoint.legacy_freeze_inventory),
    sortedByPath(legacyFreezeBefore),
    "rollback checkpoint must seal path, bytes, size, and mtime for every legacy authority file",
  );
});

test("pending Bootstrap stays readable but blocks every new-format writer with one zero-write error", async (t) => {
  await t.test("readers and fresh restore remain available", async (subtest) => {
    const { root } = await activateReferenceWorkspace(subtest, "pending-readers");
    const before = await snapshotTree(root);
    const runtime = await ROOT_API.readRuntimeObject(root, DELIVERY_REF);
    const capsule = await ROOT_API.readContextCapsule(root, DELIVERY_REF);
    const selected = await ROOT_API.selectLatestValidRecoveryPack(root, {
      object_ref: DELIVERY_REF,
    });
    const restored = await MIGRATION_PROBE.api.restoreBootstrapWorkspace(root, {
      object_ref: DELIVERY_REF,
      budget_bytes: 32_768,
    });

    assert.equal(runtime.runtime.current_milestone, "M5");
    assert.deepEqual(capsule.object_ref, DELIVERY_REF);
    assert.deepEqual(restored.selected_pack_ref, selected.pack_ref);
    assert.deepEqual(await snapshotTree(root), before, "pending readers and restore must be read-only");
  });

  await t.test("Runtime transaction writer", async (subtest) => {
    const { root } = await activateReferenceWorkspace(subtest, "pending-runtime");
    const current = await ROOT_API.readRuntimeObject(root, DELIVERY_REF);
    await expectCodeZeroWrite(root, () => ROOT_API.writeRuntimeObject(root, {
      object_ref: DELIVERY_REF,
      runtime: {
        ...current.runtime,
        current_step: "pending_acceptance_probe",
      },
      continuation: {
        ...current.continuation,
        next_action: PAYLOAD_MARKER,
      },
    }, { id: "pending-runtime-probe" }), PENDING_CODE);
  });

  await t.test("Journal direct writer", async (subtest) => {
    const { root } = await activateReferenceWorkspace(subtest, "pending-journal");
    await expectCodeZeroWrite(root, () => ROOT_API.appendRecoveryEvent(root, {
      object_ref: DELIVERY_REF,
      session_id: "bootstrap-acceptance-test",
      writer: { kind: "main", id: "main" },
      turn_id: "turn-pending-probe",
      type: "plan.updated",
      summary: PAYLOAD_MARKER,
      payload: { next_action: "accept_bootstrap_before_writes" },
    }), PENDING_CODE);
  });

  const cases = [
    ["Capsule incremental writer", async (root, activated) => ROOT_API.updateContextCapsule(root, {
      object_ref: DELIVERY_REF,
      sources: await capsuleSources(root, activated),
    }, { id: "pending-capsule-update" })],
    ["Capsule rebuild writer", async (root, activated) => ROOT_API.rebuildContextCapsule(root, {
      object_ref: DELIVERY_REF,
      sources: await capsuleSources(root, activated),
    }, { id: "pending-capsule-rebuild" })],
    ["Recovery Pack writer", async (root) => {
      const selected = await ROOT_API.selectLatestValidRecoveryPack(root, { object_ref: DELIVERY_REF });
      return ROOT_API.sealRecoveryPack(root, packInput(selected.pack), { id: "pending-pack" });
    }],
    ["Record writer", async (root) => ROOT_API.commitRecordPatch(
      root,
      ROOT_API.createRecordPatch(recordPatch()),
      { id: "pending-record" },
    )],
    ["generic transaction writer", async (root) => ROOT_API.commitWorkspaceTransaction(root, {
      id: "pending-generic-transaction",
      writes: [{
        path: ".pipeline/runtime/objects/delivery/c21/evidence/pending-probe.txt",
        content: `${PAYLOAD_MARKER}\n`,
      }],
      manifest: ROOT_API.parseYaml(await readFile(join(root, ".pipeline/manifest.yaml"), "utf8")),
    })],
  ];

  for (const [name, action] of cases) {
    await t.test(name, async (subtest) => {
      const { root, activated } = await activateReferenceWorkspace(subtest, `pending-${slug(name)}`);
      await expectCodeZeroWrite(root, () => action(root, activated), PENDING_CODE);
    });
  }
});

test("pending Bootstrap can still roll back immediately without changing legacy bytes or mtimes", async (t) => {
  const { root, activated, legacyBefore } = await activateReferenceWorkspace(t, "pending-rollback");
  const rolledBack = await MIGRATION_PROBE.api.rollbackBootstrapActivation(root, {
    bootstrap_job_ref: BOOTSTRAP_JOB_REF,
    checkpoint_ref: activated.rollback_checkpoint_ref,
  }, { id: "pending-rollback-apply" });

  assert.equal(rolledBack.status, "rolled_back");
  assert.equal((await ROOT_API.detectWorkspaceFormat(root)).kind, "legacy");
  assert.deepEqual(await legacyAuthoritySnapshot(root), legacyBefore);
});

acceptanceBehavior("fresh restore then explicit accept creates one immutable checkpoint-bound acceptance", async (t) => {
  const { root, stage, activated, legacyBefore } = await activateReferenceWorkspace(t, "strict-accept");
  const checkpointPath = join(root, activated.rollback_checkpoint_ref.path);
  const checkpointBefore = await immutableFileSnapshot(checkpointPath);
  const restored = await MIGRATION_PROBE.api.restoreBootstrapWorkspace(root, {
    object_ref: DELIVERY_REF,
    budget_bytes: 32_768,
  });
  const selected = await ROOT_API.selectLatestValidRecoveryPack(root, { object_ref: DELIVERY_REF });
  const request = await acceptanceRequest(root, activated);

  const accepted = await MIGRATION_PROBE.api.acceptBootstrapActivation(root, request, {
    id: "strict-accept-first",
  });
  await assertAcceptanceResult(accepted, {
    root,
    stage,
    activated,
    restored,
    selected,
    request,
    mode: "strict",
  });
  assert.notEqual(accepted.acceptance_ref.path, activated.rollback_checkpoint_ref.path);
  assert.deepEqual(await immutableFileSnapshot(checkpointPath), checkpointBefore);
  assert.deepEqual(await legacyAuthoritySnapshot(root), legacyBefore);

  const acceptanceBytes = await readFile(join(root, accepted.acceptance_ref.path), "utf8");
  const treeBeforeRepeat = await snapshotTree(root);
  const repeated = await ROOT_API.acceptBootstrapActivation(root, request, {
    id: "strict-accept-repeat",
  });
  assert.deepEqual(repeated.acceptance_ref, accepted.acceptance_ref);
  assert.equal(await readFile(join(root, repeated.acceptance_ref.path), "utf8"), acceptanceBytes);
  assert.deepEqual(await snapshotTree(root), treeBeforeRepeat, "repeated acceptance must be idempotent and zero-write");
});

acceptanceBehavior("accepted Bootstrap refuses rollback before baseline checks and reopens normal writers", async (t) => {
  const { root, activated } = await activateReferenceWorkspace(t, "accepted-rollback");
  const request = await acceptanceRequest(root, activated);
  await MIGRATION_PROBE.api.acceptBootstrapActivation(root, request, { id: "accepted-rollback-accept" });

  const current = await ROOT_API.readRuntimeObject(root, DELIVERY_REF);
  await ROOT_API.writeRuntimeObject(root, {
    object_ref: DELIVERY_REF,
    runtime: { ...current.runtime, current_step: "accepted_writer_open" },
    continuation: { ...current.continuation, next_action: "continue_after_bootstrap_acceptance" },
  }, { id: "accepted-runtime-write" });
  const afterWrite = await ROOT_API.readRuntimeObject(root, DELIVERY_REF);
  assert.equal(afterWrite.runtime.current_step, "accepted_writer_open");

  await expectCodeZeroWrite(root, () => MIGRATION_PROBE.api.rollbackBootstrapActivation(root, {
    bootstrap_job_ref: BOOTSTRAP_JOB_REF,
    checkpoint_ref: activated.rollback_checkpoint_ref,
  }, { id: "accepted-rollback-reject" }), ACCEPTED_ROLLBACK_CODE);
});

acceptanceBehavior("reconciliation accepts one coherent historical descendant and rejects unsafe extra authority", async (t) => {
  await t.test("coherent descendant", async (subtest) => {
    const { root, stage, activated, legacyBefore } = await activateReferenceWorkspace(subtest, "reconcile-valid");
    const historical = await constructHistoricalDescendant(subtest, root, activated, "reconcile-valid");
    const restored = await MIGRATION_PROBE.api.restoreBootstrapWorkspace(root, {
      object_ref: DELIVERY_REF,
      budget_bytes: 32_768,
    });
    const selected = await ROOT_API.selectLatestValidRecoveryPack(root, { object_ref: DELIVERY_REF });
    assert.deepEqual(restored.selected_pack_ref, historical.pack_ref);

    const request = await acceptanceRequest(root, activated, "reconciliation");
    const accepted = await MIGRATION_PROBE.api.acceptBootstrapActivation(root, request, {
      id: "reconcile-valid-accept",
    });
    await assertAcceptanceResult(accepted, {
      root,
      stage,
      activated,
      restored,
      selected,
      request,
      mode: "reconciliation",
    });
    assert.deepEqual(accepted.acceptance.validation_head.head_pack_ref, historical.pack_ref);
    assert.deepEqual(await legacyAuthoritySnapshot(root), legacyBefore);
  });

  await t.test("unexpected Record, Receipt, and Snapshot", async (subtest) => {
    const { root, activated } = await activateReferenceWorkspace(subtest, "reconcile-extra");
    await constructHistoricalDescendant(subtest, root, activated, "reconcile-extra");
    await writeText(root, ".pipeline/memory/records/project-extra/decision/unexpected.md", PAYLOAD_MARKER);
    await writeText(root, ".pipeline/runtime/receipts/unexpected.yaml", `marker: ${PAYLOAD_MARKER}\n`);
    await writeText(root, ".pipeline/snapshots/cycles/c21/unexpected.yaml", `marker: ${PAYLOAD_MARKER}\n`);
    const request = await acceptanceRequest(root, activated, "reconciliation");
    await expectFailClosedZeroWrite(
      root,
      () => MIGRATION_PROBE.api.acceptBootstrapActivation(
        root,
        request,
        { id: "reconcile-extra-accept" },
      ),
    );
  });
});

acceptanceBehavior("strict and reconciliation fail closed on legacy freeze drift", async (t) => {
  const driftCases = [
    ["state bytes drift", async (root) => {
      const path = ".pipeline/state.yaml";
      await writeText(root, path, `${await readFile(join(root, path), "utf8")}\n# ${PAYLOAD_MARKER}\n`);
    }],
    ["cycle mtime-only drift", async (root) => {
      const path = join(root, ".pipeline/cycle.yaml");
      const stats = await lstat(path);
      await utimes(path, stats.atime, new Date(stats.mtimeMs + 2_000));
    }],
    ["PROGRESS missing", async (root) => {
      await rm(join(root, ".pipeline/PROGRESS.md"));
    }],
    ["PROGRESS bytes drift", async (root) => {
      await writeText(root, ".pipeline/PROGRESS.md", `# Drifted progress\n\n${PAYLOAD_MARKER}\n`);
    }],
  ];

  for (const mode of ["strict", "reconciliation"]) {
    for (const [name, mutate] of driftCases) {
      await t.test(`${mode}: ${name}`, async (subtest) => {
        const { root, activated } = await activateReferenceWorkspace(
          subtest,
          `legacy-drift-${mode}-${slug(name)}`,
        );
        if (mode === "reconciliation") {
          await constructHistoricalDescendant(subtest, root, activated, `legacy-drift-${slug(name)}`);
        }
        await mutate(root);
        const request = await acceptanceRequest(root, activated, mode);
        await expectAcceptanceInvalidZeroWrite(
          root,
          () => MIGRATION_PROBE.api.acceptBootstrapActivation(root, request, {
            id: `legacy-drift-${mode}-${slug(name)}`,
          }),
        );
      });
    }
  }
});

acceptanceBehavior("acceptance evidence is a verified strict Snapshot-or-file union", async (t) => {
  const invalidCases = [
    ["missing Snapshot", async (root, activated) => [
      { ...snapshotEvidence(activated), path: ".pipeline/snapshots/cycles/c21/missing.yaml" },
      await fileEvidence(root),
    ]],
    ["wrong Snapshot semantic hash", async (root, activated) => [
      { ...snapshotEvidence(activated), semantic_hash: "0".repeat(64) },
      await fileEvidence(root),
    ]],
    ["unknown evidence type", async (root, activated) => [
      { ...snapshotEvidence(activated), type: "unverified_claim" },
      await fileEvidence(root),
    ]],
    ["absolute Snapshot path", async (root, activated) => [
      { ...snapshotEvidence(activated), path: join(root, activated.checkpoint.path) },
      await fileEvidence(root),
    ]],
    ["traversal Snapshot path", async (root, activated) => [
      { ...snapshotEvidence(activated), path: "../outside-snapshot.yaml" },
      await fileEvidence(root),
    ]],
    ["symlink Snapshot path", async (root, activated) => {
      const path = ".pipeline/snapshots/cycles/c21/evidence-link.yaml";
      await symlink(join(root, activated.checkpoint.path), join(root, path));
      return [{ ...snapshotEvidence(activated), path }, await fileEvidence(root)];
    }],
    ["missing file", async (_root, activated) => [
      snapshotEvidence(activated),
      { type: "file", path: ".pipeline/bootstrap-sources/missing.md", sha256: "0".repeat(64) },
    ]],
    ["wrong file digest", async (root, activated) => [
      snapshotEvidence(activated),
      { ...await fileEvidence(root), sha256: "0".repeat(64) },
    ]],
    ["absolute file path", async (root, activated) => [
      snapshotEvidence(activated),
      { ...await fileEvidence(root), path: join(root, FILE_EVIDENCE_PATH) },
    ]],
    ["traversal file path", async (root, activated) => [
      snapshotEvidence(activated),
      { ...await fileEvidence(root), path: "../outside-evidence.md" },
    ]],
    ["symlink file path", async (root, activated) => {
      const path = ".pipeline/bootstrap-sources/evidence-link.md";
      await symlink(join(root, FILE_EVIDENCE_PATH), join(root, path));
      return [snapshotEvidence(activated), { ...await fileEvidence(root), path }];
    }],
  ];

  for (const [name, buildEvidence] of invalidCases) {
    await t.test(name, async (subtest) => {
      const { root, activated } = await activateReferenceWorkspace(
        subtest,
        `invalid-evidence-${slug(name)}`,
      );
      const evidenceRefs = await buildEvidence(root, activated);
      const request = await acceptanceRequest(root, activated, "strict", evidenceRefs);
      await expectAcceptanceInvalidZeroWrite(
        root,
        () => MIGRATION_PROBE.api.acceptBootstrapActivation(root, request, {
          id: `invalid-evidence-${slug(name)}`,
        }),
        [
          "ERR_BOOTSTRAP_ACCEPTANCE_INVALID",
          "ERR_BOOTSTRAP_PATH_FORBIDDEN",
          "ERR_RECOVERY_PATH_FORBIDDEN",
        ],
      );
    });
  }
});

acceptanceBehavior("successful acceptance binds verified evidence and legacy freeze inventory hashes", async (t) => {
  for (const mode of ["strict", "reconciliation"]) {
    await t.test(mode, async (subtest) => {
      const { root, activated } = await activateReferenceWorkspace(
        subtest,
        `acceptance-binding-${mode}`,
      );
      if (mode === "reconciliation") {
        await constructHistoricalDescendant(subtest, root, activated, "acceptance-binding");
      }
      const request = await acceptanceRequest(root, activated, mode);
      const accepted = await MIGRATION_PROBE.api.acceptBootstrapActivation(root, request, {
        id: `acceptance-binding-${mode}`,
      });
      assert.match(accepted.acceptance.validation_head.verified_evidence_hash, /^[a-f0-9]{64}$/);
      assert.match(accepted.acceptance.validation_head.legacy_freeze_inventory_hash, /^[a-f0-9]{64}$/);
    });
  }
});

async function activateReferenceWorkspace(t, label) {
  const root = await temporaryDirectory(t, `hw-m5-acceptance-${label}-`);
  await copyReferenceWorkspace(root);
  await writeText(root, ".pipeline/PROGRESS.md", "# C21 fixture progress\n\nM5 Bootstrap is pending acceptance.\n");
  const legacyBefore = await legacyAuthoritySnapshot(root);
  const legacyFreezeBefore = await legacyFreezeInventory(root);
  const { stage } = await prepareStagedBootstrap(MIGRATION_PROBE.api, root, {
    stageId: `${label}-stage`,
  });
  const activated = await MIGRATION_PROBE.api.activateBootstrapWorkspace(root, stage, {
    id: `${label}-activate`,
  });
  return { root, stage, activated, legacyBefore, legacyFreezeBefore };
}

async function acceptanceRequest(root, activated, mode = "strict", evidenceRefs) {
  return {
    bootstrap_job_ref: BOOTSTRAP_JOB_REF,
    checkpoint_ref: activated.rollback_checkpoint_ref,
    mode,
    evidence_refs: evidenceRefs ?? [
      snapshotEvidence(activated),
      await fileEvidence(root),
    ],
  };
}

function snapshotEvidence(activated) {
  return {
    type: "snapshot",
    path: activated.checkpoint.path,
    semantic_hash: activated.checkpoint.semantic_hash,
  };
}

async function fileEvidence(root) {
  return {
    type: "file",
    path: FILE_EVIDENCE_PATH,
    sha256: sha256(await readFile(join(root, FILE_EVIDENCE_PATH))),
  };
}

async function legacyFreezeInventory(root) {
  const inventory = [];
  for (const path of LEGACY_FREEZE_PATHS) {
    const absolute = join(root, path);
    const stats = await lstat(absolute, { bigint: true });
    const bytes = await readFile(absolute);
    inventory.push({
      path,
      sha256: sha256(bytes),
      size_bytes: Number(stats.size),
      mtime_ns: stats.mtimeNs.toString(),
    });
  }
  return inventory;
}

async function assertAcceptanceResult(result, {
  root,
  stage,
  activated,
  restored,
  selected,
  request,
  mode,
}) {
  assert.equal(result.status, "accepted");
  assert.equal(result.acceptance_ref.path, migrationPath("acceptance.yaml"));
  assert.match(result.acceptance_ref.semantic_hash, /^[a-f0-9]{64}$/);
  assert.equal(result.acceptance.schema_version, "1");
  assert.equal(result.acceptance.authority_role, "bootstrap_acceptance");
  assert.equal(result.acceptance.acceptance_state, "accepted");
  assert.equal(result.acceptance.mode, mode);
  assert.deepEqual(result.acceptance.bootstrap_job_ref, BOOTSTRAP_JOB_REF);
  assert.deepEqual(result.acceptance.checkpoint_ref, activated.rollback_checkpoint_ref);
  assert.equal(result.acceptance.stage_hash, stage.semantic_hash);
  assert.equal(result.acceptance.manifest.path, ".pipeline/manifest.yaml");
  assert.equal(
    result.acceptance.manifest.sha256,
    sha256(await readFile(join(root, ".pipeline/manifest.yaml"))),
  );
  assert.equal(Number.isFinite(Date.parse(result.acceptance.accepted_at)), true);
  assert.deepEqual(result.acceptance.validation_head.head_pack_ref, restored.selected_pack_ref);
  assert.deepEqual(result.acceptance.validation_head.current_cursor, selected.pack.cursor);
  assert.deepEqual(
    sortedByPath(result.acceptance.evidence_refs),
    sortedByPath(request.evidence_refs),
  );
  assert.equal(result.acceptance.semantic_hash, result.acceptance_ref.semantic_hash);
}

async function expectCodeZeroWrite(root, action, code) {
  const before = await snapshotTree(root);
  const error = await captureError(action);
  assert.ok(error, `operation must reject with ${code}`);
  assert.equal(error.code, code);
  assert.equal(String(error.message || error).includes(PAYLOAD_MARKER), false);
  assert.deepEqual(await snapshotTree(root), before, `${code} rejection must be zero-write`);
  return error;
}

async function expectFailClosedZeroWrite(root, action) {
  const before = await snapshotTree(root);
  const error = await captureError(action);
  assert.ok(error, "integrity violation must reject");
  assert.match(String(error.code || ""), /^ERR_BOOTSTRAP_(?:ACCEPTANCE|RECONCILIATION|RECOVERY)_INVALID$/);
  assert.equal(String(error.message || error).includes(PAYLOAD_MARKER), false);
  assert.deepEqual(await snapshotTree(root), before, "integrity rejection must be zero-write");
  return error;
}

async function expectAcceptanceInvalidZeroWrite(
  root,
  action,
  expectedCodes = ["ERR_BOOTSTRAP_ACCEPTANCE_INVALID"],
) {
  const before = await workspaceMetadataSnapshot(root);
  const error = await captureError(action);
  assert.ok(error, "invalid acceptance input or frozen authority must reject");
  assert.ok(expectedCodes.includes(error.code), `unexpected fail-closed code ${error.code}`);
  assert.equal(String(error.message || error).includes(PAYLOAD_MARKER), false);
  assert.deepEqual(
    await workspaceMetadataSnapshot(root),
    before,
    "acceptance validation failure must happen before companion, transaction, or authority writes",
  );
  return error;
}

async function captureError(action) {
  try {
    await action();
    return null;
  } catch (error) {
    return error;
  }
}

async function capsuleSources(root, activated) {
  const runtime = await ROOT_API.readRuntimeObject(root, DELIVERY_REF);
  return {
    records: await Promise.all(activated.records.map(({ id }) => ROOT_API.readRecord(root, id))),
    continuation: runtime.continuation,
    receipts: [],
  };
}

function packInput(pack, overrides = {}) {
  return {
    object_ref: DELIVERY_REF,
    trigger: "pre_compact",
    capsule: pack.capsule,
    continuation: pack.continuation,
    record_refs: pack.record_refs,
    receipt_refs: pack.receipt_refs,
    evidence_refs: pack.evidence_refs,
    worktree_summary: pack.worktree_summary,
    cursor: pack.cursor,
    ...overrides,
  };
}

function recordPatch() {
  return {
    scope: { type: "project", ref: "project:hypo-workflow-reference-fixture" },
    kind: "decision",
    source_refs: [{
      type: "legacy_file",
      ref: "fixture:C21:current-context.md",
      locator: ".pipeline/bootstrap-sources/current-context.md",
    }],
    confidence: "confirmed",
    dedupe_key: "decision/bootstrap-acceptance-pending-probe",
    created_at: FIXED_NOW,
    updated_at: FIXED_NOW,
    supersedes: [],
    body: `A valid pending acceptance writer probe. ${PAYLOAD_MARKER}`,
  };
}

async function constructHistoricalDescendant(t, root, activated, label) {
  const scratch = await mkdtemp(join(tmpdir(), `hw-m5-historical-${label}-`));
  t.after(() => rm(scratch, { recursive: true, force: true }));
  await cp(root, scratch, { recursive: true });
  await rm(join(scratch, ".pipeline/runtime/migrations"), { recursive: true, force: true });

  const initial = await ROOT_API.selectLatestValidRecoveryPack(scratch, { object_ref: DELIVERY_REF });
  const current = await ROOT_API.readRuntimeObject(scratch, DELIVERY_REF);
  await ROOT_API.writeRuntimeObject(scratch, {
    object_ref: DELIVERY_REF,
    runtime: { ...current.runtime, current_step: `historical_${label}` },
    continuation: { ...current.continuation, next_action: `historical_${label}_next` },
  }, { id: `${label}-historical-runtime` });
  await ROOT_API.appendRecoveryEvent(scratch, {
    object_ref: DELIVERY_REF,
    session_id: `historical-${label}`,
    writer: { kind: "main", id: "main" },
    turn_id: `turn-${label}`,
    type: "plan.updated",
    summary: "Historical post-activation descendant fixture.",
    payload: { next_action: `historical_${label}_next` },
  });
  const capsule = await ROOT_API.updateContextCapsule(scratch, {
    object_ref: DELIVERY_REF,
    sources: await capsuleSources(scratch, activated),
  }, { id: `${label}-historical-capsule` });
  const replay = await ROOT_API.replayRecoveryJournal(scratch, { object_ref: DELIVERY_REF });
  const sealed = await ROOT_API.sealRecoveryPack(
    scratch,
    packInput(initial.pack, {
      capsule: capsule.capsule,
      continuation: (await ROOT_API.readRuntimeObject(scratch, DELIVERY_REF)).continuation,
      cursor: replay.cursor,
    }),
    { id: `${label}-historical-pack` },
  );

  await copyHistoricalSurface(scratch, root, ".pipeline/runtime/objects/delivery/c21/runtime.yaml");
  await copyHistoricalSurface(scratch, root, ".pipeline/runtime/objects/delivery/c21/continuation.yaml");
  await copyHistoricalSurface(scratch, root, ".pipeline/runtime/objects/delivery/c21/events", true);
  await copyHistoricalSurface(scratch, root, ".pipeline/memory/capsules/delivery/c21.yaml");
  await copyHistoricalSurface(scratch, root, dirname(sealed.path), true);
  return sealed;
}

async function copyHistoricalSurface(sourceRoot, targetRoot, path, recursive = false) {
  const source = join(sourceRoot, path);
  const target = join(targetRoot, path);
  await rm(target, { recursive: true, force: true });
  await cp(source, target, { recursive, force: true });
}

async function immutableFileSnapshot(path) {
  const stat = await lstat(path, { bigint: true });
  return {
    bytes: (await readFile(path)).toString("base64"),
    size: stat.size.toString(),
    mtime_ns: stat.mtimeNs.toString(),
  };
}

async function workspaceMetadataSnapshot(root) {
  const entries = [];
  async function visit(path) {
    const stats = await lstat(path, { bigint: true });
    const relativePath = (relative(root, path) || ".").split("\\").join("/");
    if (stats.isSymbolicLink()) {
      entries.push({
        path: relativePath,
        type: "symlink",
        target: await readlink(path),
        mtime_ns: stats.mtimeNs.toString(),
      });
      return;
    }
    if (stats.isDirectory()) {
      entries.push({ path: relativePath, type: "directory" });
      for (const name of (await readdir(path)).sort()) await visit(join(path, name));
      return;
    }
    const bytes = await readFile(path);
    entries.push({
      path: relativePath,
      type: "file",
      sha256: sha256(bytes),
      size_bytes: Number(stats.size),
      mtime_ns: stats.mtimeNs.toString(),
    });
  }
  await visit(root);
  return entries;
}

function migrationPath(name) {
  return `.pipeline/runtime/migrations/${BOOTSTRAP_JOB_REF.id}/${name}`;
}

function slug(value) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "");
}

function sortedByPath(values) {
  return structuredClone(values).sort((left, right) => left.path.localeCompare(right.path));
}
