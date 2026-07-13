import test from "node:test";
import assert from "node:assert/strict";
import { readFile, utimes } from "node:fs/promises";
import { join } from "node:path";
import {
  assertLegacyWorkspaceWritable,
  commitRecordPatch,
  createRecordPatch,
  detectWorkspaceFormat,
  LEGACY_WORKSPACE_WRITER_INVENTORY,
  parseYaml,
  readRecord,
  rebuildRecordIndexes,
} from "../src/index.js";
import {
  approvedBootstrapInputs,
  bootstrapStageInput,
  copyReferenceWorkspace,
  FIXED_NOW,
  FIXTURE_ROOT,
  legacyAuthoritySnapshot,
  listFiles,
  proposalInput,
  referenceCandidates,
  snapshotTree,
  temporaryDirectory,
  writeText,
} from "./fixtures/c21-m5/helpers.js";

const MIGRATION_PROBE = await import("../src/migration/index.js")
  .then((api) => ({ api, error: null }))
  .catch((error) => ({ api: null, error }));
const ROOT_API = await import("../src/index.js");
const REQUIRED_WRITER_APIS = Object.freeze([
  "createBootstrapProposal",
  "mergeBootstrapProposals",
  "curateBootstrapProposals",
  "auditBootstrapProposal",
  "stageBootstrapWorkspace",
  "activateBootstrapWorkspace",
]);
const HAS_WRITER_APIS = !MIGRATION_PROBE.error
  && REQUIRED_WRITER_APIS.every((name) => typeof MIGRATION_PROBE.api?.[name] === "function");

function writerBehavior(name, fn) {
  return test(name, {
    skip: HAS_WRITER_APIS ? false : "C21-M5 deterministic bootstrap writer APIs are not implemented",
  }, fn);
}

test("M5 publishes the deterministic staging writer from migration and Core root", () => {
  if (MIGRATION_PROBE.error) {
    assert.fail(`core/src/migration/index.js must import cleanly: ${MIGRATION_PROBE.error.code || MIGRATION_PROBE.error.message}`);
  }
  assert.equal(typeof MIGRATION_PROBE.api.stageBootstrapWorkspace, "function");
  assert.equal(typeof ROOT_API.stageBootstrapWorkspace, "function");
});

test("redacted fixed fixture is synthetic, portable, bounded, and detached from the live repository pipeline", async () => {
  const files = await listFiles(FIXTURE_ROOT);
  assert.deepEqual([...files].sort(), [
    "README.md",
    "fixture.json",
    "legacy-pipeline/bootstrap-sources/accepted-outcome.md",
    "legacy-pipeline/bootstrap-sources/active-requirement.md",
    "legacy-pipeline/bootstrap-sources/architecture-current.md",
    "legacy-pipeline/bootstrap-sources/architecture-legacy.md",
    "legacy-pipeline/bootstrap-sources/constraint.md",
    "legacy-pipeline/bootstrap-sources/current-context.md",
    "legacy-pipeline/bootstrap-sources/failure.md",
    "legacy-pipeline/PROGRESS.md",
    "legacy-pipeline/cycle.yaml",
    "legacy-pipeline/log.yaml",
    "legacy-pipeline/state.yaml",
  ].sort());
  assert.equal(files.some((path) => path.startsWith(".pipeline/")), false, "fixture must not copy the live .pipeline tree");

  const rendered = (await Promise.all(files.map((path) => readFile(join(FIXTURE_ROOT, path), "utf8")))).join("\n");
  assert.doesNotMatch(rendered, /\/home\/(?:heyx|[^/]+)\//i);
  assert.doesNotMatch(rendered, /[A-Za-z]:\\|file:\/\//i);
  assert.doesNotMatch(rendered, /(?:^|\W)(?:sk|ghp|github_pat)-[A-Za-z0-9_-]{12,}/i);
  assert.doesNotMatch(rendered, /raw[_ -]?chat|full[_ -]?tool[_ -]?log|tool[_ -]?call|transcript_path|chain[_ -]?of[_ -]?thought/i);
  assert.doesNotMatch(rendered, /private[_ -]?(?:reasoning|record|live[_ -]?data)/i);
  assert.match(rendered, /synthetic reference fixture/i);
});

test("fixed fixture reproduces byte-identically in two independent clone roots", async (t) => {
  const left = await temporaryDirectory(t, "hw-m5-fixture-clone-left-");
  const right = await temporaryDirectory(t, "hw-m5-fixture-clone-right-");
  await copyReferenceWorkspace(left);
  await copyReferenceWorkspace(right);
  assert.deepEqual(await snapshotTree(left), await snapshotTree(right));
  assert.match(
    await readFile(join(left, ".pipeline/PROGRESS.md"), "utf8"),
    /Redacted C21 Fixture Progress/,
  );
});

writerBehavior("deterministic writer staging is byte-identical across Extractor completion order", async (t) => {
  const left = await temporaryDirectory(t, "hw-m5-stage-left-");
  const right = await temporaryDirectory(t, "hw-m5-stage-right-");
  await copyReferenceWorkspace(left);
  await copyReferenceWorkspace(right);
  const progressMtime = new Date("2026-07-12T06:32:43.000Z");
  await Promise.all(
    [left, right].flatMap((root) => ["PROGRESS.md", "state.yaml", "cycle.yaml", "log.yaml"]
      .map((name) => utimes(join(root, ".pipeline", name), progressMtime, progressMtime))),
  );
  const leftLegacy = await legacyAuthoritySnapshot(left);
  const rightLegacy = await legacyAuthoritySnapshot(right);

  const leftStage = await stageWithOrder(MIGRATION_PROBE.api, left, false);
  const rightStage = await stageWithOrder(MIGRATION_PROBE.api, right, true);
  assert.equal(leftStage.semantic_hash, rightStage.semantic_hash);
  assert.deepEqual(leftStage.write_set, rightStage.write_set);
  assert.deepEqual(leftStage.records, rightStage.records);
  assert.equal(JSON.stringify(leftStage), JSON.stringify(rightStage));

  const leftStaging = selectTree(await snapshotTree(left), ".pipeline/runtime/migrations/");
  const rightStaging = selectTree(await snapshotTree(right), ".pipeline/runtime/migrations/");
  assert.deepEqual(leftStaging, rightStaging);
  assert.ok(Object.keys(leftStaging).length > 0, "deterministic writer must persist real staging files");
  assert.deepEqual(await legacyAuthoritySnapshot(left), leftLegacy);
  assert.deepEqual(await legacyAuthoritySnapshot(right), rightLegacy);
  assert.equal(await detectWorkspaceFormat(left).then((value) => value.kind), "legacy");
});

writerBehavior("stage rejects non-proposal, rejected audit, and post-audit source drift before creating staging", async (t) => {
  const cases = [
    {
      name: "non-proposal-curation",
      async mutate(input) {
        input.curation = { authority_role: "record", proposal_kind: "bootstrap_curation" };
      },
    },
    {
      name: "rejected-audit",
      async mutate(input) {
        input.audit = {
          ...input.audit,
          status: "rejected",
          findings: [{ code: "ERR_BOOTSTRAP_SOURCE_DRIFT" }],
        };
      },
    },
    {
      name: "post-audit-source-drift",
      async mutate(_input, root) {
        await writeText(root, ".pipeline/bootstrap-sources/constraint.md", "source drift after audit\n");
      },
    },
  ];

  for (const entry of cases) {
    await t.test(entry.name, async (subtest) => {
      const root = await temporaryDirectory(subtest, `hw-m5-stage-reject-${entry.name}-`);
      await copyReferenceWorkspace(root);
      const { curation, audit } = await approvedBootstrapInputs(MIGRATION_PROBE.api, root);
      const input = bootstrapStageInput(curation, audit);
      await entry.mutate(input, root);
      const before = await snapshotTree(root);
      await assert.rejects(
        MIGRATION_PROBE.api.stageBootstrapWorkspace(root, input, { id: `stage-reject-${entry.name}` }),
        /proposal|audit|approved|source|drift|digest|integrity|schema/i,
      );
      assert.deepEqual(await snapshotTree(root), before);
    });
  }
});

writerBehavior("writer owns Record IDs, schema, dedupe, indexes, and the unique active leaf", async (t) => {
  const root = await temporaryDirectory(t, "hw-m5-writer-records-");
  await copyReferenceWorkspace(root);
  const { stage } = await stageWithPreparedInputs(MIGRATION_PROBE.api, root, "m5-writer-record-stage");
  const activated = await MIGRATION_PROBE.api.activateBootstrapWorkspace(root, stage, {
    id: "m5-writer-record-activate",
  });
  assert.equal(activated.status, "activated");

  const indexSource = await readFile(join(root, ".pipeline/memory/index.yaml"), "utf8");
  const index = parseYaml(indexSource);
  assert.equal(index.authority_role, "derived");
  assert.equal(index.records.length, 7);
  assert.equal(Object.keys(index.active_by_dedupe_key).length, 6);
  assert.equal(
    index.records.filter((entry) => entry.dedupe_key === "architecture/product-boundary" && entry.active).length,
    1,
  );
  const activeArchitectureId = index.active_by_dedupe_key["architecture/product-boundary"];
  const activeArchitecture = await readRecord(root, activeArchitectureId);
  assert.match(activeArchitecture.body, /Skill and protocol layer/);
  const superseded = index.records.find(
    (entry) => entry.dedupe_key === "architecture/product-boundary" && !entry.active,
  );
  assert.ok(superseded);
  assert.deepEqual(activeArchitecture.attributes.supersedes, [superseded.id]);
  for (const entry of index.records) {
    assert.match(entry.id, /^(?:requirement|preference|decision|feedback)-[a-f0-9]{32}$/);
    assert.match(entry.semantic_hash, /^[a-f0-9]{64}$/);
  }
});

writerBehavior("manifest activation freezes all 22 legacy writer families while new writers mutate only new zones", async (t) => {
  const root = await temporaryDirectory(t, "hw-m5-single-writer-fence-");
  await copyReferenceWorkspace(root);
  const legacyBefore = await legacyAuthoritySnapshot(root);
  const { stage } = await stageWithPreparedInputs(MIGRATION_PROBE.api, root, "m5-fence-stage");
  const activated = await MIGRATION_PROBE.api.activateBootstrapWorkspace(root, stage, { id: "m5-fence-activate" });
  assert.equal(LEGACY_WORKSPACE_WRITER_INVENTORY.length, 22);

  for (const writer of LEGACY_WORKSPACE_WRITER_INVENTORY) {
    await assert.rejects(
      assertLegacyWorkspaceWritable(root, writer.id),
      (error) => error?.code === "ERR_LEGACY_WORKSPACE_WRITE_BLOCKED",
      `legacy writer must remain frozen: ${writer.id}`,
    );
  }
  assert.deepEqual(await legacyAuthoritySnapshot(root), legacyBefore);

  await MIGRATION_PROBE.api.acceptBootstrapActivation(root, {
    bootstrap_job_ref: stage.bootstrap_job_ref,
    checkpoint_ref: activated.rollback_checkpoint_ref,
    mode: "strict",
    evidence_refs: [{
      type: "snapshot",
      path: activated.checkpoint.path,
      semantic_hash: activated.checkpoint.semantic_hash,
    }],
  }, { id: "m5-fence-accept" });

  const beforeNewWrite = await snapshotTree(root);
  const patch = createRecordPatch({
    scope: { type: "project", ref: "project:hypo-workflow-reference-fixture" },
    kind: "preference",
    source_refs: [{
      type: "fixture",
      ref: "fixture:C21:post-activation",
      locator: ".pipeline/bootstrap-sources/current-context.md",
    }],
    confidence: "confirmed",
    dedupe_key: "preference/post-activation-single-writer",
    created_at: FIXED_NOW,
    updated_at: FIXED_NOW,
    supersedes: [],
    body: "Post-activation writes use only the new Record Store and derived indexes.",
  });
  await commitRecordPatch(root, patch, { id: "m5-post-activation-record" });
  await rebuildRecordIndexes(root, { id: "m5-post-activation-index" });
  const afterNewWrite = await snapshotTree(root);
  const changed = changedPaths(beforeNewWrite, afterNewWrite);
  assert.ok(changed.some((path) => path.startsWith(".pipeline/memory/records/")));
  assert.ok(changed.includes(".pipeline/memory/index.yaml"));
  assert.ok(changed.includes(".pipeline/memory/INDEX.md"));
  assert.equal(changed.every((path) => path.startsWith(".pipeline/memory/")), true, changed.join("\n"));
  assert.deepEqual(await legacyAuthoritySnapshot(root), legacyBefore, "legacy state/cycle/log must never be dual-written");
});

async function stageWithPreparedInputs(api, root, id) {
  const prepared = await approvedBootstrapInputs(api, root);
  assert.equal(prepared.audit.status, "approved");
  const input = bootstrapStageInput(prepared.curation, prepared.audit);
  const stage = await api.stageBootstrapWorkspace(root, input, { id });
  return { ...prepared, input, stage };
}

async function stageWithOrder(api, root, reverse) {
  const candidates = await referenceCandidates(root);
  const splitAt = Math.ceil(candidates.length / 2);
  const first = api.createBootstrapProposal(proposalInput("extractor-a", candidates.slice(0, splitAt)));
  const second = api.createBootstrapProposal(proposalInput("extractor-b", candidates.slice(splitAt)));
  const proposals = reverse ? [first, second] : [second, first];
  const merged = api.mergeBootstrapProposals(proposals);
  const curation = api.curateBootstrapProposals(merged, {
    worker: { role: "curator", id: "curator-a" },
  });
  const audit = await api.auditBootstrapProposal(root, curation, {
    worker: { role: "auditor", id: "auditor-a" },
  });
  assert.equal(audit.status, "approved");
  return api.stageBootstrapWorkspace(root, bootstrapStageInput(curation, audit), {
    id: "m5-deterministic-stage",
  });
}

function selectTree(tree, prefix) {
  return Object.fromEntries(Object.entries(tree).filter(([path]) => path.startsWith(prefix)));
}

function changedPaths(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((path) => before[path] !== after[path])
    .sort();
}
