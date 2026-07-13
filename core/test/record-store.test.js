import test from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { parseFrontmatter, stringifyYaml } from "../src/serialization/index.js";
import { recoverWorkspaceTransaction } from "../src/workspace-store/index.js";
import {
  FIXED_NOW,
  LATER_NOW,
  assertRecoveredWorkspaceMatches,
  assertSecretSafeError,
  captureError,
  exists,
  fileByteMap,
  listFiles,
  readText,
  readYamlFile,
  snapshotTree,
  temporaryCurrentWorkspace,
  writeText,
} from "./fixtures/c21-m2/helpers.js";

const REQUIRED_API = [
  "createRecordPatch",
  "commitRecordPatch",
  "readRecord",
  "rebuildRecordIndexes",
];

const RECORDS_PROBE = await import("../src/records/index.js")
  .then((api) => ({ api, error: null }))
  .catch((error) => ({ api: null, error }));
const recordTest = RECORDS_PROBE.error ? test.skip : test;

test("records module publishes staged-patch, deterministic-writer, reader, and index APIs", async () => {
  const api = await loadRecordsApi();
  for (const name of REQUIRED_API) assert.equal(typeof api[name], "function", `${name} must be exported`);
});

recordTest("one typed semantic fact round-trips as one stable Markdown Record", async (t) => {
  const api = await loadRecordsApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-record-roundtrip-");
  const patch = api.createRecordPatch(recordPatch());
  assert.equal("id" in patch, false, "a staged Record Patch must not allocate authority ids");
  assert.equal("record_id" in patch, false);

  const committed = await api.commitRecordPatch(root, patch, { id: "record-roundtrip-first" });
  assert.match(committed.id, /^[A-Za-z0-9][A-Za-z0-9._-]*$/);
  assert.match(committed.path, /^\.pipeline\/memory\/records\/.+\/decision\/.+\.md$/);
  assert.equal(await exists(join(root, committed.path)), true);
  assert.equal((await listFiles(root)).filter((path) => path.endsWith(".md") && path.includes("/records/")).length, 1);

  const loaded = await api.readRecord(root, committed.id);
  assert.equal(loaded.path, committed.path);
  assert.equal(loaded.attributes.id, committed.id);
  assert.deepEqual(loaded.attributes.scope, patch.scope);
  assert.equal(loaded.attributes.kind, patch.kind);
  assert.deepEqual(loaded.attributes.source_refs, patch.source_refs);
  assert.equal(loaded.attributes.confidence, patch.confidence);
  assert.equal(loaded.attributes.dedupe_key, patch.dedupe_key);
  assert.deepEqual(loaded.attributes.supersedes, []);
  assert.equal(loaded.body, patch.body);

  const firstBytes = await readText(join(root, committed.path));
  const repeated = await api.commitRecordPatch(root, patch, { id: "record-roundtrip-repeat" });
  assert.equal(repeated.id, committed.id);
  assert.equal(repeated.path, committed.path);
  assert.equal(repeated.deduplicated, true);
  assert.equal(await readText(join(root, committed.path)), firstBytes);
});

recordTest("Record Patch validation rejects unsafe scope, unknown kind, malformed sources, and invalid metadata", async () => {
  const api = await loadRecordsApi();
  const invalid = [
    { ...recordPatch(), scope: { type: "project", ref: "../outside" } },
    { ...recordPatch(), scope: { type: "unknown", ref: "m2-fixture-project" } },
    { ...recordPatch(), kind: "miscellaneous" },
    { ...recordPatch(), source_refs: [] },
    {
      ...recordPatch(),
      source_refs: [{ type: "workflow_artifact", ref: "/etc/passwd", locator: "root" }],
    },
    {
      ...recordPatch(),
      source_refs: [{ type: "workflow_artifact", ref: "../../outside.md", locator: "escape" }],
    },
    { ...recordPatch(), confidence: "certain" },
    { ...recordPatch(), dedupe_key: "../decision" },
    { ...recordPatch(), created_at: "yesterday" },
    { ...recordPatch(), body: "" },
  ];
  for (const input of invalid) {
    assert.throws(
      () => api.createRecordPatch(input),
      /record|patch|scope|kind|source|reference|confidence|dedupe|timestamp|body|unsafe/i,
    );
  }
});

recordTest("only the deterministic writer allocates Record ids and caller ids cannot overwrite authority", async (t) => {
  const api = await loadRecordsApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-record-id-owner-");
  assert.throws(
    () => api.createRecordPatch({ ...recordPatch(), id: "record-caller-selected" }),
    /id|writer|authority|caller|patch/i,
  );

  const staged = api.createRecordPatch(recordPatch());
  const first = await api.commitRecordPatch(root, staged, { id: "record-id-owner-seed" });
  const firstBytes = await readText(join(root, first.path));
  const tamperedPatch = {
    ...staged,
    record_id: first.id,
    body: "# Replacement attempt\n\nCaller-selected authority must not overwrite.\n",
  };
  const before = await snapshotTree(root);
  await assert.rejects(
    api.commitRecordPatch(root, tamperedPatch, { id: "record-id-owner-overwrite" }),
    /id|writer|authority|overwrite|patch/i,
  );
  assert.deepEqual(await snapshotTree(root), before);
  assert.equal(await readText(join(root, first.path)), firstBytes);
});

recordTest("raw secret-like values in Record metadata or body fail before any write with sanitized errors", async (t) => {
  const api = await loadRecordsApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-record-secret-");
  const seededSecret = ["sk", "proj", "M2_RECORD_SENTINEL_0123456789"].join("-");
  const variants = [
    { ...recordPatch(), body: `# Unsafe\n\nCredential: ${seededSecret}\n` },
    { ...recordPatch(), metadata: { credential: seededSecret } },
    {
      ...recordPatch(),
      metadata: { context: { credentials: { value: seededSecret } } },
    },
  ];

  for (const input of variants) {
    const before = await snapshotTree(root);
    const error = await captureError(async () => {
      const staged = api.createRecordPatch(input);
      await api.commitRecordPatch(root, staged, { id: "record-secret-reject" });
    });
    assertSecretSafeError(error, seededSecret);
    assert.deepEqual(await snapshotTree(root), before);
  }
});

recordTest("secret references are allowed while hidden reasoning and unrestricted rationale fields are rejected", async (t) => {
  const api = await loadRecordsApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-record-secret-ref-");
  const patch = api.createRecordPatch({
    ...recordPatch({ dedupe_key: "preference.credential-reference" }),
    kind: "preference",
    secret_refs: [{ provider: "env", ref: "OPENAI_API_KEY" }],
    body: "# Credential handling\n\nUse the configured environment credential by reference.\n",
  });
  const committed = await api.commitRecordPatch(root, patch, { id: "record-secret-ref" });
  const text = await readText(join(root, committed.path));
  assert.match(text, /OPENAI_API_KEY/);

  for (const forbidden of ["chain_of_thought", "hidden_reasoning", "rationale_dump"]) {
    assert.throws(
      () => api.createRecordPatch({ ...recordPatch(), [forbidden]: "private internal reasoning" }),
      /reason|thought|hidden|rationale|field|record/i,
    );
  }

  const hiddenSample = ["M2", "NESTED", "PRIVATE", "REASONING"].join("_");
  const nestedHiddenInputs = [
    { metadata: { analysis: { chain_of_thought: hiddenSample } } },
    { metadata: { review: { private: { hidden_reasoning: hiddenSample } } } },
    { metadata: { rationale: { unrestricted_dump: hiddenSample } } },
  ];
  for (const [index, nested] of nestedHiddenInputs.entries()) {
    const before = await snapshotTree(root);
    const error = await captureError(async () => {
      const staged = api.createRecordPatch({
        ...recordPatch({ dedupe_key: `decision.nested-hidden-${index}` }),
        ...nested,
      });
      await api.commitRecordPatch(root, staged, { id: `record-nested-hidden-${index}` });
    });
    assertSecretSafeError(error, hiddenSample);
    assert.deepEqual(await snapshotTree(root), before);
  }
});

recordTest("derived indexes rebuild from individual Records without changing Record bytes", async (t) => {
  const api = await loadRecordsApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-record-index-rebuild-");
  const first = await api.commitRecordPatch(
    root,
    api.createRecordPatch(recordPatch()),
    { id: "record-index-first" },
  );
  const second = await api.commitRecordPatch(
    root,
    api.createRecordPatch(recordPatch({
      kind: "requirement",
      dedupe_key: "requirement.manual-acceptance",
      body: "# Manual acceptance\n\nCompleted delivery waits for explicit user acceptance.\n",
    })),
    { id: "record-index-second" },
  );
  await api.rebuildRecordIndexes(root, { id: "record-index-initial" });

  const recordsBefore = await fileByteMap(root, ".pipeline/memory/records/");
  await writeText(join(root, ".pipeline", "memory", "index.yaml"), "tampered: true\n");
  await rm(join(root, ".pipeline", "memory", "INDEX.md"), { force: true });
  await api.rebuildRecordIndexes(root, { id: "record-index-repair" });

  assert.deepEqual(await fileByteMap(root, ".pipeline/memory/records/"), recordsBefore);
  const machine = await readYamlFile(join(root, ".pipeline", "memory", "index.yaml"));
  const human = await readText(join(root, ".pipeline", "memory", "INDEX.md"));
  assert.equal(machine.authority_role, "derived");
  assert.equal(machine.active_by_dedupe_key["decision.runtime-authority"], first.id);
  assert.equal(machine.active_by_dedupe_key["requirement.manual-acceptance"], second.id);
  assert.match(human, /derived|generated/i);
  assert.match(human, new RegExp(first.id));
  assert.match(human, new RegExp(second.id));
});

recordTest("superseded decisions remain traceable while the active index selects the replacement", async (t) => {
  const api = await loadRecordsApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-record-supersedes-");
  const original = await api.commitRecordPatch(
    root,
    api.createRecordPatch(recordPatch({
      dedupe_key: "decision.record-layout",
      body: "# Record layout\n\nStore all semantic facts in one aggregate file.\n",
    })),
    { id: "record-supersedes-original" },
  );
  const replacementPatch = api.createRecordPatch(recordPatch({
    dedupe_key: "decision.record-layout",
    updated_at: LATER_NOW,
    supersedes: [original.id],
    body: "# Record layout\n\nStore one durable semantic fact per Markdown file.\n",
  }));
  const replacement = await api.commitRecordPatch(root, replacementPatch, {
    id: "record-supersedes-replacement",
  });
  await api.rebuildRecordIndexes(root, { id: "record-supersedes-index" });

  assert.notEqual(replacement.id, original.id);
  assert.equal((await api.readRecord(root, original.id)).attributes.id, original.id);
  assert.deepEqual((await api.readRecord(root, replacement.id)).attributes.supersedes, [original.id]);
  const index = await readYamlFile(join(root, ".pipeline", "memory", "index.yaml"));
  assert.equal(index.active_by_dedupe_key["decision.record-layout"], replacement.id);
  assert.equal(index.records.find((entry) => entry.id === original.id).active, false);
  assert.equal(index.records.find((entry) => entry.id === replacement.id).active, true);
  const human = await readText(join(root, ".pipeline", "memory", "INDEX.md"));
  assert.match(human, new RegExp(original.id));
  assert.match(human, new RegExp(replacement.id));
  assert.match(human, /supersed/i);
});

recordTest("dedupe is deterministic and conflicting facts require an explicit supersedes edge", async (t) => {
  const api = await loadRecordsApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-record-dedupe-");
  const patch = api.createRecordPatch(recordPatch({ dedupe_key: "decision.dedupe-contract" }));
  const first = await api.commitRecordPatch(root, patch, { id: "record-dedupe-first" });
  const repeat = await api.commitRecordPatch(root, patch, { id: "record-dedupe-repeat" });
  assert.equal(repeat.id, first.id);
  assert.equal(repeat.deduplicated, true);
  const before = await snapshotTree(root);

  const conflict = api.createRecordPatch(recordPatch({
    dedupe_key: "decision.dedupe-contract",
    body: "# Different fact\n\nThis cannot silently replace existing authority.\n",
  }));
  await assert.rejects(
    api.commitRecordPatch(root, conflict, { id: "record-dedupe-conflict" }),
    /dedupe|conflict|supersede|existing/i,
  );
  assert.deepEqual(await snapshotTree(root), before);
});

recordTest("index rebuild fails closed for independently merged same-dedupe active leaves", async (t) => {
  const api = await loadRecordsApi();
  const localRoot = await temporaryCurrentWorkspace(t, "hw-m2-record-merge-local-");
  const remoteRoot = await temporaryCurrentWorkspace(t, "hw-m2-record-merge-remote-");
  const dedupeKey = "decision.independent-merge";
  const local = await api.commitRecordPatch(
    localRoot,
    api.createRecordPatch(recordPatch({
      dedupe_key: dedupeKey,
      body: "# Independent decision\n\nLocal branch selected the first semantic fact.\n",
    })),
    { id: "record-merge-local" },
  );
  const remote = await api.commitRecordPatch(
    remoteRoot,
    api.createRecordPatch(recordPatch({
      dedupe_key: dedupeKey,
      body: "# Independent decision\n\nRemote branch selected a different semantic fact.\n",
    })),
    { id: "record-merge-remote" },
  );
  assert.notEqual(local.id, remote.id);
  assert.deepEqual((await api.readRecord(localRoot, local.id)).attributes.supersedes, []);
  assert.deepEqual((await api.readRecord(remoteRoot, remote.id)).attributes.supersedes, []);

  await writeText(join(localRoot, remote.path), await readText(join(remoteRoot, remote.path)));
  const before = await snapshotTree(localRoot);
  await assert.rejects(
    api.rebuildRecordIndexes(localRoot, { id: "record-merge-index" }),
    /dedupe|ambiguous|multiple|active|leaf|supersede|graph/i,
  );
  assert.deepEqual(
    await snapshotTree(localRoot),
    before,
    "ambiguous merge must not select a leaf or write derived indexes",
  );
});

recordTest("an attempted zero-active-leaf cycle fails persisted Record integrity before index selection", async (t) => {
  const api = await loadRecordsApi();
  const localRoot = await temporaryCurrentWorkspace(t, "hw-m2-record-cycle-local-");
  const remoteRoot = await temporaryCurrentWorkspace(t, "hw-m2-record-cycle-remote-");
  const dedupeKey = "decision.zero-leaf-cycle";
  const local = await api.commitRecordPatch(
    localRoot,
    api.createRecordPatch(recordPatch({
      dedupe_key: dedupeKey,
      body: "# Cycle candidate\n\nLocal independently persisted fact.\n",
    })),
    { id: "record-cycle-local" },
  );
  const remote = await api.commitRecordPatch(
    remoteRoot,
    api.createRecordPatch(recordPatch({
      dedupe_key: dedupeKey,
      body: "# Cycle candidate\n\nRemote independently persisted fact.\n",
    })),
    { id: "record-cycle-remote" },
  );
  await writeText(join(localRoot, remote.path), await readText(join(remoteRoot, remote.path)));

  for (const [record, supersededId] of [[local, remote.id], [remote, local.id]]) {
    const path = join(localRoot, record.path);
    const parsed = parseFrontmatter(await readText(path));
    await writeText(path, renderRecordFile({
      ...parsed.attributes,
      supersedes: [supersededId],
    }, parsed.body));
  }
  const before = await snapshotTree(localRoot);
  await assert.rejects(
    api.rebuildRecordIndexes(localRoot, { id: "record-cycle-index" }),
    /hash|integrity|semantic|cycle|supersede|graph/i,
  );
  assert.deepEqual(await snapshotTree(localRoot), before);
});

recordTest("index rebuild rejects a valid Record copied to a non-derived Record path", async (t) => {
  const api = await loadRecordsApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-record-path-binding-");
  const committed = await api.commitRecordPatch(
    root,
    api.createRecordPatch(recordPatch({ dedupe_key: "decision.path-binding" })),
    { id: "record-path-binding-seed" },
  );
  const wrongPath = join(
    dirname(committed.path),
    `misplaced-${basename(committed.path)}`,
  );
  await writeText(join(root, wrongPath), await readText(join(root, committed.path)));
  const before = await snapshotTree(root);
  await assert.rejects(
    api.rebuildRecordIndexes(root, { id: "record-path-binding-index" }),
    /path|derived|identity|location|mismatch|record/i,
  );
  assert.deepEqual(await snapshotTree(root), before);
});

recordTest("Record writes expose the M1 prepared-transaction recovery seam", async (t) => {
  const api = await loadRecordsApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-record-transaction-");
  const before = await snapshotTree(root);
  const id = "record-after-prepare";

  await assert.rejects(
    api.commitRecordPatch(root, api.createRecordPatch(recordPatch()), {
      id,
      faultInjector: async ({ phase }) => {
        if (phase === "after_prepare") throw new Error("injected M2 Record interruption");
      },
    }),
    /injected M2 Record interruption/,
  );
  assert.equal(await exists(join(root, ".pipeline", "runtime", "transactions", id, "transaction.yaml")), true);
  assert.equal((await listFiles(root)).some((path) => path.includes("/memory/records/")), false);
  assert.equal((await recoverWorkspaceTransaction(root, { id })).action, "rolled_back");
  await assertRecoveredWorkspaceMatches(root, before);
});

function recordPatch(overrides = {}) {
  return {
    scope: { type: "project", ref: "m2-fixture-project" },
    kind: "decision",
    source_refs: [{
      type: "workflow_artifact",
      ref: ".pipeline/architecture.md",
      locator: "records-receipts-and-snapshots",
    }],
    confidence: "high",
    dedupe_key: "decision.runtime-authority",
    created_at: FIXED_NOW,
    updated_at: FIXED_NOW,
    supersedes: [],
    body: "# Runtime authority\n\nLifecycle truth belongs to the referenced object runtime.\n",
    ...overrides,
  };
}

function renderRecordFile(attributes, body) {
  return `---\n${stringifyYaml(attributes).trimEnd()}\n---\n${body}`;
}

async function loadRecordsApi() {
  if (RECORDS_PROBE.error) throw RECORDS_PROBE.error;
  return RECORDS_PROBE.api;
}
