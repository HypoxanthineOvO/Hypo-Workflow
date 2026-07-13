import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { canonicalHash, stringifyYaml } from "../src/serialization/index.js";
import { recoverWorkspaceTransaction } from "../src/workspace-store/index.js";
import {
  FIXED_NOW,
  LATER_NOW,
  assertLegacySentinelsUnchanged,
  assertRecoveredWorkspaceMatches,
  assertSecretSafeError,
  captureError,
  exists,
  fixtureManifest,
  listFiles,
  readText,
  snapshotTree,
  temporaryCurrentWorkspace,
  writeText,
} from "./fixtures/c21-m2/helpers.js";

const REQUIRED_API = [
  "buildSnapshotProjection",
  "writeSnapshot",
  "readSnapshot",
];

const SNAPSHOTS_PROBE = await Promise.all([
  import("../src/snapshots/index.js"),
  import("../src/records/index.js"),
])
  .then(([api, records]) => ({ api, records, error: null }))
  .catch((error) => ({ api: null, records: null, error }));
const snapshotTest = SNAPSHOTS_PROBE.error ? test.skip : test;

test("snapshots module publishes projection, writer, and reader APIs", async () => {
  const api = await loadSnapshotsApi();
  for (const name of REQUIRED_API) assert.equal(typeof api[name], "function", `${name} must be exported`);
});

snapshotTest("accepted Goal and checkpoint Cycle Snapshots contain reconstructable cross-clone semantics", async (t) => {
  const api = await loadSnapshotsApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-snapshot-kinds-", { withLegacySentinels: true });
  const records = await persistSnapshotRecords(root, "snapshot-kinds");
  const fixtures = [
    {
      name: "accepted-goal",
      input: snapshotInput(records),
      path: /^\.pipeline\/snapshots\/goals\/goal-alpha\/.+\.yaml$/,
    },
    {
      name: "checkpoint-cycle",
      input: snapshotInput(records, {
        snapshot_kind: "checkpoint",
        object: {
          object_ref: { kind: "delivery", id: "cycle-c21" },
          object_type: "cycle",
          state: "checkpoint",
          plan_hash: canonicalHash({ plan: "cycle-c21-m2" }),
          checkpoint_at: FIXED_NOW,
          checkpoint_ref: "C21-M2",
        },
      }),
      path: /^\.pipeline\/snapshots\/cycles\/cycle-c21\/.+\.yaml$/,
    },
  ];

  for (const fixture of fixtures) {
    await t.test(fixture.name, async () => {
      const write = await api.writeSnapshot(root, fixture.input, { id: `snapshot-${fixture.name}` });
      assert.match(write.path, fixture.path);
      assert.equal(await exists(join(root, write.path)), true);
      const snapshot = await api.readSnapshot(root, write.path);
      assert.equal(snapshot.schema_version, "1");
      assert.equal(snapshot.authority_role, "projection");
      assert.equal(snapshot.snapshot_kind, fixture.input.snapshot_kind);
      assert.deepEqual(snapshot.project, {
        format: fixture.input.manifest.format,
        schema_version: fixture.input.manifest.schema_version,
        project_id: fixture.input.manifest.project_id,
      });
      assert.deepEqual(snapshot.object, fixture.input.object);
      assert.equal(snapshot.records.length, fixture.input.records.length);
      assert.match(snapshot.semantic_hash, /^[a-f0-9]{64}$/);
      for (const source of fixture.input.records) {
        const sourceId = source.attributes.id;
        const projected = snapshot.records.find((record) => record.attributes?.id === sourceId);
        assert.ok(projected, `Snapshot must preserve durable Record ${sourceId}`);
        assert.equal("id" in source, false, "readRecord() keeps identity in persisted attributes");
        assert.equal("id" in projected, false, "Snapshot Record projection must not add a second identity field");
        assert.equal(projected.body, source.body);
        assert.equal(projected.attributes.schema_version, source.attributes.schema_version);
        assert.equal(projected.attributes.semantic_hash, source.attributes.semantic_hash);
        assert.equal(projected.attributes.dedupe_key, source.attributes.dedupe_key);
        assert.deepEqual(projected.attributes.source_refs, source.attributes.source_refs);
      }
    });
  }
  await assertLegacySentinelsUnchanged(root);
});

snapshotTest("same semantic input is stable across clone-local manifest and runtime changes", async (t) => {
  const api = await loadSnapshotsApi();
  const firstRoot = await temporaryCurrentWorkspace(t, "hw-m2-snapshot-clone-a-");
  const secondRoot = await temporaryCurrentWorkspace(t, "hw-m2-snapshot-clone-b-", {
    manifest: {
      workspace_id: "different-clone-workspace",
      created_at: LATER_NOW,
    },
  });
  const firstRecords = await persistSnapshotRecords(firstRoot, "snapshot-clone-a");
  const secondRecords = await persistSnapshotRecords(secondRoot, "snapshot-clone-b");
  const first = snapshotInput(firstRecords, {
    local_context: localContext("clone-a"),
  });
  const second = snapshotInput([...secondRecords].reverse(), {
    manifest: fixtureManifest({
      workspace_id: "different-clone-workspace",
      created_at: LATER_NOW,
    }),
    local_context: localContext("clone-b"),
  });

  const firstProjection = await api.buildSnapshotProjection(first);
  const secondProjection = await api.buildSnapshotProjection(second);
  assert.deepEqual(secondProjection, firstProjection);
  assert.equal(stringifyYaml(secondProjection), stringifyYaml(firstProjection));
  assert.equal(firstProjection.project.project_id, "m2-fixture-project");
  assert.equal("workspace_id" in firstProjection.project, false);
  assert.equal("created_at" in firstProjection.project, false);
});

snapshotTest("Snapshot preserves portable sources and rejects or excludes local filesystem locators", async (t) => {
  const api = await loadSnapshotsApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-snapshot-source-portability-");
  const records = await persistSnapshotRecords(root, "snapshot-source-portability");
  const portable = await api.buildSnapshotProjection(snapshotInput(records));
  assert.deepEqual(
    portable.records[0].attributes.source_refs,
    records[0].attributes.source_refs,
    "repo-relative source plus semantic locator must remain portable",
  );

  const localLocators = [
    "/home/local-user/session.jsonl",
    "file:///tmp/local-session.jsonl",
    "C:\\Users\\local-user\\session.jsonl",
    "../../outside-workspace/session.jsonl",
  ];
  for (const [index, locator] of localLocators.entries()) {
    const localRoot = await temporaryCurrentWorkspace(t, `hw-m2-snapshot-source-local-${index}-`);
    const localRecords = await persistSnapshotRecords(
      localRoot,
      `snapshot-source-local-${index}`,
      { sourceLocator: locator },
    );
    let projection;
    let rejection;
    try {
      projection = await api.buildSnapshotProjection(snapshotInput(localRecords));
    } catch (error) {
      rejection = error;
    }
    if (rejection) {
      assert.match(
        String(rejection.message || rejection),
        /source|locator|portable|local|absolute|relative|path/i,
        `non-portable locator case ${index} must fail for portability`,
      );
    } else if (JSON.stringify(projection).includes(locator)) {
      throw new Error(`Snapshot retained non-portable source locator case ${index}`);
    }
  }
});

snapshotTest("durable semantic changes alter Snapshot content and semantic hash", async (t) => {
  const api = await loadSnapshotsApi();
  const originalRoot = await temporaryCurrentWorkspace(t, "hw-m2-snapshot-semantic-original-");
  const changedRoot = await temporaryCurrentWorkspace(t, "hw-m2-snapshot-semantic-changed-");
  const originalRecords = await persistSnapshotRecords(originalRoot, "snapshot-semantic-original");
  const changedRecords = await persistSnapshotRecords(changedRoot, "snapshot-semantic-changed", {
    runtimeBody: "# Runtime authority\n\nDurably revised semantic decision.\n",
  });
  const original = snapshotInput(originalRecords);
  const changed = snapshotInput(changedRecords);
  const first = await api.buildSnapshotProjection(original);
  const second = await api.buildSnapshotProjection(changed);
  assert.notEqual(second.semantic_hash, first.semantic_hash);
  assert.notEqual(stringifyYaml(second), stringifyYaml(first));
});

snapshotTest("Snapshot excludes local runtime, Journal, Receipts, recovery data, paths, locks, secrets, and hidden reasoning", async (t) => {
  const api = await loadSnapshotsApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-snapshot-exclusion-");
  const records = await persistSnapshotRecords(root, "snapshot-exclusion");
  const sentinels = [
    "M2_RUNTIME_LOCAL_SENTINEL",
    "M2_JOURNAL_RAW_SENTINEL",
    "M2_RECEIPT_LOCAL_SENTINEL",
    "M2_RECOVERY_BLOB_SENTINEL",
    "M2_TRANSCRIPT_LOCAL_SENTINEL",
    "M2_LOCK_LOCAL_SENTINEL",
    "M2_HIDDEN_REASONING_SENTINEL",
  ];
  const input = snapshotInput(records, { local_context: localContext(sentinels.join("-")) });
  const write = await api.writeSnapshot(root, input, { id: "snapshot-exclusion" });
  const text = await readText(join(root, write.path));
  for (const sentinel of sentinels) assert.doesNotMatch(text, new RegExp(sentinel));
  assert.doesNotMatch(
    text,
    /^(?:runtime|journal|events|receipts|recovery|transcript_path|local_path|temp|locks|chain_of_thought):/m,
  );

  const seededSecret = ["sk", "proj", "M2_SNAPSHOT_SENTINEL_0123456789"].join("-");
  const unsafe = snapshotInput(records, {
    records: [{
      ...records[0],
      body: `# Unsafe Snapshot\n\nRaw credential ${seededSecret}\n`,
    }],
  });
  const before = await snapshotTree(root);
  const error = await captureError(() => api.writeSnapshot(root, unsafe, { id: "snapshot-secret-reject" }));
  assertSecretSafeError(error, seededSecret);
  assert.deepEqual(await snapshotTree(root), before);

  const hidden = snapshotInput(records, {
    records: [{
      ...records[0],
      attributes: {
        ...records[0].attributes,
        chain_of_thought: "private hidden reasoning",
      },
    }],
  });
  assert.throws(
    () => api.buildSnapshotProjection(hidden),
    /chain|thought|hidden|reason|record|field/i,
  );

  const nestedSecret = ["M2", "SNAPSHOT", "NESTED", "SENSITIVE"].join("_");
  const nestedReasoning = ["M2", "SNAPSHOT", "NESTED", "REASONING"].join("_");
  const nestedCases = [
    {
      sample: nestedSecret,
      input: snapshotInput(records, {
        records: [{
          ...records[0],
          attributes: {
            ...records[0].attributes,
            metadata: { nested: { credentials: { value: nestedSecret } } },
          },
        }],
      }),
    },
    {
      sample: nestedReasoning,
      input: snapshotInput(records, {
        object: {
          ...snapshotInput(records).object,
          metadata: { review: { private: { chain_of_thought: nestedReasoning } } },
        },
      }),
    },
    {
      sample: nestedSecret,
      input: snapshotInput(records, {
        local_context: { nested: { tool: { output: nestedSecret } } },
      }),
    },
  ];
  for (const fixture of nestedCases) {
    let projection;
    let rejection;
    try {
      projection = await api.buildSnapshotProjection(fixture.input);
    } catch (error) {
      rejection = error;
    }
    if (rejection) {
      assertSecretSafeError(rejection, fixture.sample);
    } else if (JSON.stringify(projection).includes(fixture.sample)) {
      throw new Error("Snapshot projected a seeded nested sensitive sample");
    }
  }
});

snapshotTest("Snapshot writes expose the M1 prepared-transaction recovery seam", async (t) => {
  const api = await loadSnapshotsApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-snapshot-transaction-");
  const records = await persistSnapshotRecords(root, "snapshot-transaction");
  const before = await snapshotTree(root);
  const id = "snapshot-after-prepare";
  await assert.rejects(
    api.writeSnapshot(root, snapshotInput(records), {
      id,
      faultInjector: async ({ phase }) => {
        if (phase === "after_prepare") throw new Error("injected M2 Snapshot interruption");
      },
    }),
    /injected M2 Snapshot interruption/,
  );
  assert.equal(await exists(join(root, ".pipeline", "runtime", "transactions", id, "transaction.yaml")), true);
  assert.equal((await listFiles(root)).some((path) => path.startsWith(".pipeline/snapshots/")), false);
  assert.equal((await recoverWorkspaceTransaction(root, { id })).action, "rolled_back");
  await assertRecoveredWorkspaceMatches(root, before);
});

snapshotTest("invalid Snapshot schemas and unsafe read paths fail before writes or escape", async (t) => {
  const api = await loadSnapshotsApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-snapshot-invalid-");
  const records = await persistSnapshotRecords(root, "snapshot-invalid");
  const valid = snapshotInput(records);
  const invalid = [
    snapshotInput(records, { snapshot_kind: "live" }),
    snapshotInput(records, { object: { ...valid.object, state: "executing" } }),
    snapshotInput(records, { object: { ...valid.object, object_type: "analysis" } }),
    snapshotInput(records, { records: [] }),
  ];
  for (const [index, input] of invalid.entries()) {
    const before = await snapshotTree(root);
    await assert.rejects(
      api.writeSnapshot(root, input, { id: `snapshot-invalid-${index}` }),
      /snapshot|accepted|checkpoint|object|record|schema|state|type/i,
    );
    assert.deepEqual(await snapshotTree(root), before);
  }
  await assert.rejects(api.readSnapshot(root, "../../outside.yaml"), /path|escape|snapshot|forbidden/i);
  await assert.rejects(api.readSnapshot(root, "/tmp/outside.yaml"), /path|absolute|snapshot|forbidden/i);
});

snapshotTest("readSnapshot rejects a valid Snapshot copied to a non-derived contained path", async (t) => {
  const api = await loadSnapshotsApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-snapshot-derived-path-");
  const records = await persistSnapshotRecords(root, "snapshot-derived-path");
  const written = await api.writeSnapshot(root, snapshotInput(records), {
    id: "snapshot-derived-path-write",
  });
  const copiedPath = ".pipeline/snapshots/project/copied-valid-snapshot.yaml";
  await writeText(join(root, copiedPath), await readText(join(root, written.path)));

  await assert.rejects(
    api.readSnapshot(root, copiedPath),
    /snapshot|path|derived|object|identity|location|mismatch/i,
  );
  assert.equal(await readText(join(root, written.path)), await readText(join(root, copiedPath)));
});

function snapshotInput(records, overrides = {}) {
  const input = {
    snapshot_kind: "accepted",
    manifest: fixtureManifest(),
    object: {
      object_ref: { kind: "delivery", id: "goal-alpha" },
      object_type: "goal",
      state: "accepted",
      plan_hash: canonicalHash({ plan: "goal-alpha-v1" }),
      accepted_at: FIXED_NOW,
    },
    records,
    local_context: localContext("default"),
  };
  return { ...input, ...overrides };
}

async function persistSnapshotRecords(root, transactionPrefix, overrides = {}) {
  const specs = [
    {
      kind: "decision",
      dedupe_key: "decision.runtime-authority",
      body: overrides.runtimeBody
        ?? "# Runtime authority\n\nDurable semantic content for fresh-clone reconstruction.\n",
    },
    {
      kind: "requirement",
      dedupe_key: "requirement.manual-acceptance",
      body: "# Manual acceptance\n\nDurable semantic content for fresh-clone reconstruction.\n",
    },
  ];
  const result = [];
  for (const [index, spec] of specs.entries()) {
    const patch = SNAPSHOTS_PROBE.records.createRecordPatch({
      scope: { type: "project", ref: "m2-fixture-project" },
      kind: spec.kind,
      source_refs: [{
        type: "workflow_artifact",
        ref: ".pipeline/architecture.md",
        locator: overrides.sourceLocator ?? "records-receipts-and-snapshots",
      }],
      confidence: "high",
      dedupe_key: spec.dedupe_key,
      created_at: FIXED_NOW,
      updated_at: FIXED_NOW,
      supersedes: [],
      body: spec.body,
    });
    const committed = await SNAPSHOTS_PROBE.records.commitRecordPatch(root, patch, {
      id: `${transactionPrefix}-${index}`,
    });
    const record = await SNAPSHOTS_PROBE.records.readRecord(root, committed.id);
    assert.deepEqual(Object.keys(record).sort(), ["attributes", "body", "path"]);
    assert.equal("id" in record, false);
    assert.equal(record.attributes.id, committed.id);
    assert.equal(record.attributes.schema_version, "1");
    assert.match(record.attributes.semantic_hash, /^[a-f0-9]{64}$/);
    result.push(record);
  }
  return result;
}

function localContext(sentinel) {
  return {
    runtime: { status: "executing", value: `M2_RUNTIME_LOCAL_SENTINEL-${sentinel}` },
    journal: [{ raw: `M2_JOURNAL_RAW_SENTINEL-${sentinel}` }],
    receipts: [{ id: `M2_RECEIPT_LOCAL_SENTINEL-${sentinel}` }],
    recovery: { blob: `M2_RECOVERY_BLOB_SENTINEL-${sentinel}` },
    transcript_path: `/tmp/M2_TRANSCRIPT_LOCAL_SENTINEL-${sentinel}`,
    local_path: `/home/user/M2_LOCAL_PATH_SENTINEL-${sentinel}`,
    temp: { lock: `M2_LOCK_LOCAL_SENTINEL-${sentinel}` },
    chain_of_thought: `M2_HIDDEN_REASONING_SENTINEL-${sentinel}`,
  };
}

async function loadSnapshotsApi() {
  if (SNAPSHOTS_PROBE.error) throw SNAPSHOTS_PROBE.error;
  return SNAPSHOTS_PROBE.api;
}
