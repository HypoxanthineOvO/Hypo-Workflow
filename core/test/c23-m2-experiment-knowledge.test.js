import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as CORE from "../src/index.js";
import { renderRecordDocument } from "../src/records/frontmatter.js";
import { buildPersistedRecord, recordScopeDirectory } from "../src/records/schema.js";
import {
  assertLegacySentinelsUnchanged,
  captureError,
  listFiles,
  snapshotTree,
  temporaryCurrentWorkspace,
  writeText,
} from "./fixtures/c21-m2/helpers.js";

const FIXTURE_ROOT = fileURLToPath(new URL("./fixtures/c23-m2/", import.meta.url));
const FIXED_NOW = "2026-07-18T12:00:00+08:00";
const STORE_METHODS = Object.freeze([
  "recordFact",
  "list",
  "resolve",
  "assessFreshness",
]);
const KNOWLEDGE_API_AVAILABLE = typeof CORE.createExperimentKnowledgeStore === "function";
const knowledgeTest = KNOWLEDGE_API_AVAILABLE ? test : test.skip;

test("C23 M2 publishes the project-scoped Experiment Knowledge Store API", () => {
  assert.equal(
    typeof CORE.createExperimentKnowledgeStore,
    "function",
    "Core must export createExperimentKnowledgeStore",
  );
  const store = CORE.createExperimentKnowledgeStore({ clock: () => FIXED_NOW });
  for (const method of STORE_METHODS) {
    assert.equal(typeof store[method], "function", `Experiment Knowledge Store must expose ${method}`);
  }
});

test("C23 M2 fixtures bind every local code locator to exact repository bytes", async () => {
  for (const name of ["nerf", "acesim"]) {
    const fixture = await readFixture(name);
    assert.ok(fixture.facts.some((fact) => fact.fact_type === "principle"));
    assert.ok(fixture.facts.some((fact) => fact.fact_type === "metric"));
    assert.ok(fixture.facts.some((fact) => fact.fact_type === "module"));
    assert.ok(fixture.facts.some((fact) => fact.fact_type === "optimization"));
    for (const fact of fixture.facts) {
      assert.match(fact.version_ref.ref, /^fixture:/);
      assert.ok(fact.source_refs.every((source) => source.version), `${fact.fact_key} must cite a source version`);
      for (const codeRef of fact.code_refs) {
        const bytes = await readFile(join(FIXTURE_ROOT, name, "repository", codeRef.path));
        assert.equal(sha256(bytes), codeRef.sha256, `${fact.fact_key} code digest must match fixture bytes`);
        assert.match(codeRef.locator, /^(symbol|section|block):/);
      }
    }
  }
});

knowledgeTest("C23 M2 persists one typed fact per Record and lists active project knowledge", async (t) => {
  const { fixture, root } = await fixtureWorkspace(t, "nerf", "hw-c23-m2-records-");
  const store = createStore();
  const committed = await seedFacts(store, root, fixture, "nerf-records");
  assert.equal(committed.length, fixture.facts.length);
  assert.ok(committed.every((entry) => entry.record_ref?.kind === "record"));
  assert.ok(committed.every((entry) => /^[a-z]+-[a-f0-9]{32}$/.test(entry.record_ref.id)));

  const facts = await store.list(root, { project_id: fixture.project.id });
  assert.ok(Array.isArray(facts), "list must return a bounded fact array");
  assert.equal(facts.length, fixture.facts.length);
  assert.deepEqual(
    [...new Set(facts.map((fact) => fact.fact_type))].sort(),
    ["metric", "module", "optimization", "principle"],
  );
  assert.ok(facts.every((fact) => fact.active === true));
  assert.ok(facts.every((fact) => fact.project_id === fixture.project.id));

  const recordFiles = (await listFiles(root)).filter((path) => (
    path.startsWith(".pipeline/memory/records/") && path.endsWith(".md")
  ));
  assert.equal(recordFiles.length, fixture.facts.length, "each fact must have one durable Markdown Record");
  assert.deepEqual(
    (await listFiles(root)).filter((path) => path.startsWith(".pipeline/knowledge/")),
    [".pipeline/knowledge/legacy.md"],
    "the domain Store must not extend legacy Knowledge Ledger authority",
  );
  await assertLegacySentinelsUnchanged(root);
});

knowledgeTest("C23 M2 resolves NeRF RE sampling semantics to code whose names do not say sample", async (t) => {
  const { fixture, root } = await fixtureWorkspace(t, "nerf", "hw-c23-m2-nerf-resolve-");
  const store = createStore();
  await seedFacts(store, root, fixture, "nerf-resolve");
  const contract = fixture.queries[0];

  const resolution = await store.resolve(root, {
    project_id: fixture.project.id,
    query: contract.query,
  });
  const match = findMatch(resolution, contract.expected_fact_key);
  assert.equal(match.fact_type, "optimization");
  assert.match(match.details.mechanism, /occupancy|terminated rays/i);
  assert.ok(match.details.module_refs.includes("module.render-engine"));
  assert.ok(match.details.principle_refs.includes("principle.volume-rendering"));
  assert.ok(match.aliases.includes("RE 加速"));
  assert.ok(match.aliases.includes("采样加速"));

  const codeRef = match.code_refs.find((ref) => (
    ref.path === contract.expected_path && ref.locator === contract.expected_locator
  ));
  assert.ok(codeRef, "semantic answer must locate the registered implementation symbol");
  assert.doesNotMatch(codeRef.path, /sample/i);
  assert.doesNotMatch(codeRef.locator, /sample/i);
  assert.equal(match.freshness, "fresh");
});

knowledgeTest("C23 M2 explains metric meaning, direction, unit, and comparison limits", async (t) => {
  const { fixture, root } = await fixtureWorkspace(t, "nerf", "hw-c23-m2-metric-");
  const store = createStore();
  await seedFacts(store, root, fixture, "nerf-metric");
  const contract = fixture.queries[1];

  const match = findMatch(await store.resolve(root, {
    project_id: fixture.project.id,
    query: contract.query,
  }), contract.expected_fact_key);
  assert.equal(match.details.direction, contract.expected_direction);
  assert.equal(match.details.unit, contract.expected_unit);
  assert.match(match.details.meaning, /higher PSNR|lower pixel reconstruction error/i);
  assert.match(match.details.comparability_notes, /same image range|crop|mask|split/i);
  assert.deepEqual(match.version_ref, fixture.project.version_ref);
  assert.equal(match.source_refs[0].version, "fixture:nerf-v1");
});

knowledgeTest("C23 M2 resolves AceSim temperature/cache ownership and simulator metrics", async (t) => {
  const { fixture, root } = await fixtureWorkspace(t, "acesim", "hw-c23-m2-acesim-resolve-");
  const store = createStore();
  await seedFacts(store, root, fixture, "acesim-resolve");

  const scanContract = fixture.queries[0];
  const scan = findMatch(await store.resolve(root, {
    project_id: fixture.project.id,
    query: scanContract.query,
  }), scanContract.expected_fact_key);
  assert.equal(scan.fact_type, "optimization");
  assert.ok(scan.details.module_refs.includes("module.gpu-profile"));
  assert.match(scan.summary, /frequency|L1\/L2 cache/i);
  assert.ok(scan.code_refs.some((ref) => (
    ref.path === scanContract.expected_path && ref.locator === scanContract.expected_locator
  )));

  const metricContract = fixture.queries[1];
  const metric = findMatch(await store.resolve(root, {
    project_id: fixture.project.id,
    query: metricContract.query,
  }), metricContract.expected_fact_key);
  assert.equal(metric.details.direction, metricContract.expected_direction);
  assert.equal(metric.details.unit, metricContract.expected_unit);
  assert.match(metric.details.meaning, /simulated cycle|modeled instruction throughput/i);

  const memory = (await store.list(root, { project_id: fixture.project.id }))
    .find((fact) => fact.fact_key === "metric.trace-host-memory");
  assert.match(memory.details.meaning, /not the simulated GPU memory/i);
});

knowledgeTest("C23 M2 marks changed registered code stale without treating unrelated files as knowledge", async (t) => {
  const { fixture, root } = await fixtureWorkspace(t, "nerf", "hw-c23-m2-stale-change-");
  const store = createStore();
  await seedFacts(store, root, fixture, "nerf-stale-change");

  const fresh = await store.assessFreshness(root, { project_id: fixture.project.id });
  assert.equal(fresh.status, "fresh");
  assert.deepEqual(fresh.stale_refs, []);

  const changedPath = "src/render/occupancy.py";
  await writeFile(join(root, changedPath), "def changed_implementation():\n    return False\n", "utf8");
  await writeText(join(root, "scratch", "unregistered-result.txt"), "not project knowledge\n");
  const stale = await store.assessFreshness(root, { project_id: fixture.project.id });
  assert.equal(stale.status, "stale");
  const finding = stale.stale_refs.find((ref) => ref.path === changedPath);
  assert.ok(finding, "registered changed path must be reported");
  assert.equal(finding.reason, "digest_mismatch");
  assert.match(finding.expected_sha256, /^[a-f0-9]{64}$/);
  assert.match(finding.actual_sha256, /^[a-f0-9]{64}$/);
  assert.notEqual(finding.actual_sha256, finding.expected_sha256);
  assert.equal(stale.stale_refs.some((ref) => ref.path.includes("unregistered-result")), false);

  const resolved = findMatch(await store.resolve(root, {
    project_id: fixture.project.id,
    query: fixture.queries[0].query,
  }), fixture.queries[0].expected_fact_key);
  assert.equal(resolved.freshness, "stale", "semantic answers must expose stale code bindings");
  await assertLegacySentinelsUnchanged(root);
});

knowledgeTest("C23 M2 reports missing registered code as stale with an actionable locator", async (t) => {
  const { fixture, root } = await fixtureWorkspace(t, "acesim", "hw-c23-m2-stale-missing-");
  const store = createStore();
  await seedFacts(store, root, fixture, "acesim-stale-missing");
  const missingPath = "src/metrics/simulator_stats.py";
  await rm(join(root, missingPath));

  const stale = await store.assessFreshness(root, { project_id: fixture.project.id });
  assert.equal(stale.status, "stale");
  const findings = stale.stale_refs.filter((ref) => ref.path === missingPath);
  assert.ok(findings.length >= 1);
  assert.ok(findings.every((ref) => ref.reason === "missing"));
  assert.ok(findings.some((ref) => ref.locator === "symbol:instructions_per_cycle"));
  assert.ok(findings.some((ref) => ref.fact_key === "metric.ipc"));
});

knowledgeTest("C23 M2 requires explicit supersedes and preserves both historical metric Records", async (t) => {
  const { fixture, root } = await fixtureWorkspace(t, "nerf", "hw-c23-m2-supersedes-");
  const store = createStore();
  const originalFact = fixture.facts.find((fact) => fact.fact_key === "metric.psnr");
  const original = await store.recordFact(root, originalFact, { id: "c23-m2-supersedes-original" });
  const changed = {
    ...structuredClone(originalFact),
    summary: "PSNR computed after the corrected linear-image evaluation pipeline.",
    source_refs: originalFact.source_refs.map((source) => ({ ...source, version: "fixture:nerf-v2" })),
    version_ref: { type: "git", ref: "fixture:nerf-v2" },
  };
  const beforeConflict = await snapshotTree(root);

  await assert.rejects(
    store.recordFact(root, changed, { id: "c23-m2-supersedes-conflict" }),
    /conflict|existing|supersede|active|dedupe/i,
  );
  assert.deepEqual(await snapshotTree(root), beforeConflict, "implicit replacement must be zero-write");

  const replacement = await store.recordFact(root, {
    ...changed,
    supersedes: [original.record_ref.id],
  }, { id: "c23-m2-supersedes-replacement" });
  assert.notEqual(replacement.record_ref.id, original.record_ref.id);

  const active = await store.list(root, { project_id: fixture.project.id });
  assert.equal(active.length, 1);
  assert.equal(active[0].record_ref.id, replacement.record_ref.id);
  assert.equal(active[0].active, true);
  const history = await store.list(root, {
    project_id: fixture.project.id,
    include_superseded: true,
  });
  assert.equal(history.length, 2);
  assert.equal(history.find((fact) => fact.record_ref.id === original.record_ref.id).active, false);
  assert.equal(history.find((fact) => fact.record_ref.id === replacement.record_ref.id).active, true);

  const resolved = findMatch(await store.resolve(root, {
    project_id: fixture.project.id,
    query: "PSNR",
  }), "metric.psnr");
  assert.equal(resolved.record_ref.id, replacement.record_ref.id);
  assert.match(resolved.summary, /corrected linear-image/);
  await assertLegacySentinelsUnchanged(root);
});

knowledgeTest("C23 M2 exact replay of a superseded fact reports the persisted inactive state", async (t) => {
  const { fixture, root } = await fixtureWorkspace(t, "nerf", "hw-c23-m2-superseded-replay-");
  const store = createStore();
  const originalFact = fixture.facts.find((fact) => fact.fact_key === "metric.psnr");
  const original = await store.recordFact(root, originalFact, { id: "c23-m2-replay-original" });
  const replacementFact = {
    ...structuredClone(originalFact),
    summary: "PSNR computed with the replacement evaluation pipeline.",
    version_ref: { type: "git", ref: "fixture:nerf-v2" },
    supersedes: [original.record_ref.id],
  };
  const replacement = await store.recordFact(root, replacementFact, { id: "c23-m2-replay-replacement" });

  const replay = await store.recordFact(root, originalFact, { id: "c23-m2-replay-exact-original" });
  assert.equal(replay.record_ref.id, original.record_ref.id);
  assert.equal(replay.active, false, "deduplicated replay must project current persisted graph state");
  assert.equal(replay.freshness, "fresh");

  const active = await store.list(root, { project_id: fixture.project.id });
  assert.deepEqual(active.map((fact) => fact.record_ref.id), [replacement.record_ref.id]);
  const history = await store.list(root, {
    project_id: fixture.project.id,
    include_superseded: true,
  });
  assert.equal(history.length, 2, "exact replay must not create a third historical Record");
  assert.equal(history.find((fact) => fact.record_ref.id === original.record_ref.id).active, false);
  await assertLegacySentinelsUnchanged(root);
});

knowledgeTest("C23 M2 all read APIs fail closed on invalid persisted supersedes graphs", async (t) => {
  const graphKinds = ["missing_target", "cross_dedupe", "cycle", "multiple_active_leaves"];
  for (const graphKind of graphKinds) {
    const { fixture, root } = await fixtureWorkspace(t, "nerf", `hw-c23-m2-graph-${graphKind}-`);
    const store = createStore();
    const base = fixture.facts.find((fact) => fact.fact_key === "metric.psnr");
    await installInvalidKnowledgeGraph(root, base, graphKind);
    const before = await snapshotTree(root);
    const reads = [
      ["list", () => store.list(root, { project_id: fixture.project.id })],
      ["resolve", () => store.resolve(root, { project_id: fixture.project.id, query: "PSNR" })],
      ["assessFreshness", () => store.assessFreshness(root, { project_id: fixture.project.id })],
    ];
    for (const [readName, action] of reads) {
      const error = await captureError(action);
      assert.ok(error, `${graphKind} must make ${readName} fail closed`);
      assert.match(
        String(error.message || error),
        /knowledge|record|supersede|graph|cycle|active|leaf|dedupe|integrity|hash|semantic/i,
      );
      assert.deepEqual(
        await snapshotTree(root),
        before,
        `${graphKind} ${readName} rejection must not repair or arbitrate authority implicitly`,
      );
    }
    await assertLegacySentinelsUnchanged(root);
  }
});

knowledgeTest("C23 M2 active-only reads validate inactive Record semantics and provenance", async (t) => {
  for (const mismatch of ["body_dedupe", "provenance"]) {
    const { fixture, root } = await fixtureWorkspace(t, "nerf", `hw-c23-m2-inactive-${mismatch}-`);
    const store = createStore();
    const base = fixture.facts.find((fact) => fact.fact_key === "metric.psnr");
    let inactive;
    if (mismatch === "body_dedupe") {
      inactive = await writeKnowledgeRecord(root, {
        ...structuredClone(base),
        fact_key: "metric.ssim",
        title: "Structural similarity stored under the wrong metadata key",
        aliases: ["SSIM"],
        summary: "This body fact key intentionally disagrees with its Record dedupe metadata.",
      }, {
        dedupe_key: `experiment.knowledge.${base.project_id}.${base.fact_key}`,
      });
    } else {
      inactive = await writeKnowledgeRecord(root, base, {
        source_refs: [{
          type: "project_document",
          ref: "docs/nerf-notes.md",
          locator: "heading:intentionally-wrong-provenance",
        }],
      });
    }
    const active = await writeKnowledgeRecord(root, {
      ...structuredClone(base),
      summary: `Active replacement for inactive ${mismatch} fixture.`,
      supersedes: [inactive.id],
    });
    assert.deepEqual(active.attributes.supersedes, [inactive.id]);
    assert.equal(active.attributes.dedupe_key, inactive.attributes.dedupe_key);

    const before = await snapshotTree(root);
    const activeOnlyReads = [
      ["list", () => store.list(root, { project_id: fixture.project.id })],
      ["resolve", () => store.resolve(root, { project_id: fixture.project.id, query: "PSNR" })],
      ["assessFreshness", () => store.assessFreshness(root, { project_id: fixture.project.id })],
    ];
    for (const [readName, action] of activeOnlyReads) {
      const error = await captureError(action);
      assert.ok(error, `${mismatch} inactive Record must make active-only ${readName} fail closed`);
      assert.match(
        String(error.message || error),
        /knowledge|record|metadata|fact|dedupe|source|provenance|integrity|semantic/i,
      );
      assert.deepEqual(
        await snapshotTree(root),
        before,
        `${mismatch} inactive Record rejection must be zero-write for ${readName}`,
      );
    }
    await assertLegacySentinelsUnchanged(root);
  }
});

knowledgeTest("C23 M2 isolates project queries when multiple experiment projects share one workspace", async (t) => {
  const nerf = await readFixture("nerf");
  const acesim = await readFixture("acesim");
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m2-project-isolation-", { withLegacySentinels: true });
  await copyTree(join(FIXTURE_ROOT, "nerf", "repository"), root);
  await copyTree(join(FIXTURE_ROOT, "acesim", "repository"), root);
  const store = createStore();
  await seedFacts(store, root, nerf, "isolation-nerf");
  await seedFacts(store, root, acesim, "isolation-acesim");

  const nerfFacts = await store.list(root, { project_id: nerf.project.id });
  const acesimFacts = await store.list(root, { project_id: acesim.project.id });
  assert.ok(nerfFacts.every((fact) => fact.project_id === nerf.project.id));
  assert.ok(acesimFacts.every((fact) => fact.project_id === acesim.project.id));
  assert.equal(nerfFacts.some((fact) => fact.fact_key === "metric.ipc"), false);
  assert.equal(acesimFacts.some((fact) => fact.fact_key === "metric.psnr"), false);

  const query = await store.resolve(root, { project_id: nerf.project.id, query: "IPC" });
  assert.deepEqual(query.matches, [], "a project-scoped query must not leak another project's facts");
});

knowledgeTest("C23 M2 rejects secrets, hidden reasoning, private paths, malformed digests, and incomplete provenance before writes", async (t) => {
  const { fixture, root } = await fixtureWorkspace(t, "nerf", "hw-c23-m2-boundary-");
  const store = createStore();
  const base = fixture.facts.find((fact) => fact.fact_key === "optimization.re-sampling");
  const seededSecret = ["sk", "proj", "C23_M2_SENTINEL_0123456789"].join("-");
  const hiddenSample = "C23 M2 private reasoning must never persist";
  const manifestDigest = sha256(await readFile(join(root, ".pipeline", "manifest.yaml")));
  const legacyStateDigest = sha256(await readFile(join(root, ".pipeline", "state.yaml")));
  await symlink("occupancy.py", join(root, "src", "render", "occupancy-alias.py"));
  const variants = [
    { label: "project traversal", fact: { ...structuredClone(base), project_id: "../outside" } },
    {
      label: "code traversal",
      fact: { ...structuredClone(base), code_refs: [{ ...base.code_refs[0], path: "../outside.py" }] },
    },
    {
      label: "absolute code path",
      fact: { ...structuredClone(base), code_refs: [{ ...base.code_refs[0], path: "/etc/passwd" }] },
    },
    {
      label: "malformed digest",
      fact: { ...structuredClone(base), code_refs: [{ ...base.code_refs[0], sha256: "not-a-digest" }] },
    },
    {
      label: "digest mismatch",
      fact: { ...structuredClone(base), code_refs: [{ ...base.code_refs[0], sha256: "0".repeat(64) }] },
    },
    {
      label: "code symlink",
      fact: {
        ...structuredClone(base),
        code_refs: [{ ...base.code_refs[0], path: "src/render/occupancy-alias.py" }],
      },
    },
    {
      label: "current manifest as code",
      fact: {
        ...structuredClone(base),
        code_refs: [{
          ...base.code_refs[0],
          path: ".pipeline/manifest.yaml",
          sha256: manifestDigest,
        }],
      },
    },
    {
      label: "legacy authority as code",
      fact: {
        ...structuredClone(base),
        code_refs: [{
          ...base.code_refs[0],
          path: ".pipeline/state.yaml",
          sha256: legacyStateDigest,
        }],
      },
    },
    {
      label: "empty semantic locator",
      fact: { ...structuredClone(base), code_refs: [{ ...base.code_refs[0], locator: "" }] },
    },
    {
      label: "source traversal",
      fact: { ...structuredClone(base), source_refs: [{ ...base.source_refs[0], ref: "../../outside" }] },
    },
    {
      label: "missing source version",
      fact: { ...structuredClone(base), source_refs: [{ ...base.source_refs[0], version: "" }] },
    },
    {
      label: "raw secret",
      fact: { ...structuredClone(base), summary: `Unsafe credential ${seededSecret}` },
      secret: seededSecret,
    },
    {
      label: "nested chain of thought",
      fact: {
        ...structuredClone(base),
        details: { ...structuredClone(base.details), analysis: { chain_of_thought: hiddenSample } },
      },
      forbidden: hiddenSample,
    },
    {
      label: "nested hidden reasoning",
      fact: {
        ...structuredClone(base),
        details: { ...structuredClone(base.details), review: { hidden_reasoning: hiddenSample } },
      },
      forbidden: hiddenSample,
    },
    {
      label: "nested rationale dump",
      fact: {
        ...structuredClone(base),
        details: { ...structuredClone(base.details), rationale: { rationale_dump: hiddenSample } },
      },
      forbidden: hiddenSample,
    },
  ];

  for (const [index, variant] of variants.entries()) {
    const before = await snapshotTree(root);
    const error = await captureError(() => store.recordFact(root, variant.fact, {
      id: `c23-m2-boundary-${index}`,
    }));
    assert.ok(error, `${variant.label} must reject`);
    assert.match(
      String(error.message || error),
      /knowledge|fact|project|path|code|source|version|digest|locator|secret|unsafe|hidden|reason|private/i,
    );
    if (variant.secret) assert.equal(String(error.message || error).includes(variant.secret), false);
    if (variant.forbidden) assert.equal(String(error.message || error).includes(variant.forbidden), false);
    assert.deepEqual(await snapshotTree(root), before, `${variant.label} rejection must be zero-write`);
  }
  await assertLegacySentinelsUnchanged(root);
});

function createStore() {
  const store = CORE.createExperimentKnowledgeStore({ clock: () => FIXED_NOW });
  for (const method of STORE_METHODS) assert.equal(typeof store[method], "function");
  return store;
}

async function fixtureWorkspace(t, name, prefix) {
  const fixture = await readFixture(name);
  const root = await temporaryCurrentWorkspace(t, prefix, { withLegacySentinels: true });
  await copyTree(join(FIXTURE_ROOT, name, "repository"), root);
  return { fixture, root };
}

async function seedFacts(store, root, fixture, idPrefix) {
  const committed = [];
  for (const [index, fact] of fixture.facts.entries()) {
    committed.push(await store.recordFact(root, fact, { id: `${idPrefix}-${index}` }));
  }
  return committed;
}

async function installInvalidKnowledgeGraph(root, baseInput, graphKind) {
  const base = structuredClone(baseInput);
  if (graphKind === "missing_target") {
    await writeKnowledgeRecord(root, {
      ...base,
      supersedes: [`decision-${"f".repeat(32)}`],
    });
    return;
  }

  const first = await writeKnowledgeRecord(root, base);
  if (graphKind === "cross_dedupe") {
    await writeKnowledgeRecord(root, {
      ...base,
      fact_key: "metric.ssim",
      title: "Structural similarity",
      aliases: ["SSIM"],
      summary: "A second metric whose history must not supersede PSNR.",
      details: {
        meaning: "Structural image similarity for a comparable evaluation pipeline.",
        direction: "higher_is_better",
        unit: "ratio",
        comparability_notes: "Compare the same image range and evaluation split.",
      },
      supersedes: [first.id],
    });
    return;
  }

  const secondFact = {
    ...base,
    summary: `Independent conflicting PSNR fact for ${graphKind}.`,
  };
  const second = await writeKnowledgeRecord(root, secondFact);
  if (graphKind === "multiple_active_leaves") return;

  if (graphKind === "cycle") {
    await writeUncheckedKnowledgeRecord(root, first, { ...base, supersedes: [second.id] });
    await writeUncheckedKnowledgeRecord(root, second, { ...secondFact, supersedes: [first.id] });
    return;
  }
  throw new Error(`unsupported invalid Knowledge graph fixture ${graphKind}`);
}

async function writeKnowledgeRecord(root, fact, metadataOverrides = {}) {
  const scope = { type: "project", ref: fact.project_id };
  const record = buildPersistedRecord(CORE.createRecordPatch({
    scope,
    kind: "decision",
    source_refs: metadataOverrides.source_refs ?? [
      ...fact.source_refs.map((source) => ({
        type: source.type,
        ref: source.ref,
        locator: source.locator,
      })),
      ...fact.code_refs.map((source) => ({
        type: "code",
        ref: source.path,
        locator: source.locator,
      })),
    ],
    confidence: fact.confidence,
    dedupe_key: metadataOverrides.dedupe_key
      ?? `experiment.knowledge.${fact.project_id}.${fact.fact_key}`,
    created_at: FIXED_NOW,
    updated_at: FIXED_NOW,
    supersedes: fact.supersedes,
    body: renderKnowledgeFactBody(fact),
  }));
  const path = `.pipeline/memory/records/${recordScopeDirectory(scope)}/decision/${record.id}.md`;
  await writeText(join(root, path), renderRecordDocument(record.attributes, record.body));
  return { ...record, path };
}

async function writeUncheckedKnowledgeRecord(root, record, fact) {
  const attributes = { ...record.attributes, supersedes: fact.supersedes };
  const content = `---\n${CORE.stringifyYaml(attributes).trimEnd()}\n---\n${renderKnowledgeFactBody(fact)}\n`;
  await writeText(join(root, record.path), content);
}

function renderKnowledgeFactBody(fact) {
  return JSON.stringify({
    schema_version: "1",
    authority_role: "experiment_knowledge_fact",
    fact,
  }, null, 2);
}

function findMatch(resolution, factKey) {
  assert.equal(resolution.project_id !== undefined, true);
  assert.ok(Array.isArray(resolution.matches), "resolve must return a structured matches array");
  const match = resolution.matches.find((candidate) => candidate.fact_key === factKey);
  assert.ok(match, `resolution must include ${factKey}`);
  return match;
}

async function readFixture(name) {
  return JSON.parse(await readFile(join(FIXTURE_ROOT, name, "knowledge.json"), "utf8"));
}

async function copyTree(source, target) {
  await mkdir(target, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    const to = join(target, entry.name);
    if (entry.isDirectory()) await copyTree(from, to);
    else if (entry.isFile()) {
      await mkdir(dirname(to), { recursive: true });
      await writeFile(to, await readFile(from));
    } else {
      throw new Error(`fixture repository contains unsupported entry ${from}`);
    }
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
