import test from "node:test";
import assert from "node:assert/strict";
import {
  commandMap,
  commitRecordPatch,
  resolveCommandRoute,
} from "../src/index.js";
import {
  approvedBootstrapInputs,
  copyReferenceWorkspace,
  excludedRubricCandidates,
  proposalInput,
  referenceCandidates,
  snapshotTree,
  temporaryDirectory,
  writeText,
} from "./fixtures/c21-m5/helpers.js";

const MIGRATION_MODULE_URL = new URL("../src/migration/index.js", import.meta.url).href;
const MIGRATION_PROBE = await import(MIGRATION_MODULE_URL)
  .then((api) => ({ api, error: null }))
  .catch((error) => ({ api: null, error }));
const ROOT_API = await import("../src/index.js");
const REQUIRED_PROPOSAL_APIS = Object.freeze([
  "createBootstrapProposal",
  "mergeBootstrapProposals",
  "curateBootstrapProposals",
  "auditBootstrapProposal",
]);
const HAS_PROPOSAL_APIS = !MIGRATION_PROBE.error
  && REQUIRED_PROPOSAL_APIS.every((name) => typeof MIGRATION_PROBE.api?.[name] === "function");

function migrationBehavior(name, fn) {
  return test(name, {
    skip: HAS_PROPOSAL_APIS ? false : "C21-M5 bootstrap proposal/curation/audit APIs are not implemented",
  }, fn);
}

test("M5 publishes proposal, deterministic merge, curation, and audit APIs from migration and Core root", () => {
  if (MIGRATION_PROBE.error) {
    assert.fail(`core/src/migration/index.js must import cleanly: ${MIGRATION_PROBE.error.code || MIGRATION_PROBE.error.message}`);
  }
  for (const name of REQUIRED_PROPOSAL_APIS) {
    assert.equal(typeof MIGRATION_PROBE.api[name], "function", `migration module must export ${name}`);
    assert.equal(typeof ROOT_API[name], "function", `Core root must export ${name}`);
  }
});

test("Bootstrap remains an internal Job and never creates a public migrate/bootstrap command", async () => {
  const publicInventory = commandMap();
  assert.equal(
    publicInventory.some((entry) => /(?:migrate|bootstrap)/i.test(String(entry.canonical))),
    false,
  );
  for (const spelling of [
    "/hw:migrate",
    "/hypo-workflow:migrate",
    "$hypo-workflow:migrate",
    "/hw:bootstrap",
  ]) {
    const route = await resolveCommandRoute(spelling);
    assert.equal(route.status, "unknown");
    assert.equal(route.canonical, null);
    assert.deepEqual(route.writes, []);
  }
});

migrationBehavior("Extractor, Curator, and Auditor outputs remain proposals and cannot be committed as Record authority", async (t) => {
  const root = await temporaryDirectory(t, "hw-m5-proposal-authority-");
  await copyReferenceWorkspace(root);
  const api = MIGRATION_PROBE.api;
  const candidates = await referenceCandidates(root);
  const before = await snapshotTree(root);
  const { proposals, merged, curation, audit } = await approvedBootstrapInputs(api, root, { candidates });

  for (const output of [...proposals, merged, curation, audit]) {
    assert.equal(output.authority_role, "proposal");
    assert.match(output.proposal_kind, /bootstrap_(?:extraction|merge|curation|audit)/);
    assert.match(output.semantic_hash, /^[a-f0-9]{64}$/);
  }
  assert.equal(audit.status, "approved");
  assert.deepEqual(audit.findings, []);
  assert.deepEqual(await snapshotTree(root), before, "read-only workers must not create staging or Record authority");

  await assert.rejects(
    commitRecordPatch(root, proposals[0], { id: "extractor-direct-record-write" }),
    /record|patch|schema|field|manifest|authority/i,
  );
  await assert.rejects(
    commitRecordPatch(root, curation, { id: "curator-direct-record-write" }),
    /record|patch|schema|field|manifest|authority/i,
  );
  await assert.rejects(
    commitRecordPatch(root, audit, { id: "auditor-direct-record-write" }),
    /record|patch|schema|field|manifest|authority/i,
  );
  assert.throws(
    () => api.curateBootstrapProposals(merged, {
      worker: { role: "extractor", id: "extractor-cannot-curate" },
    }),
    /curator|role|worker|separation/i,
  );
  await assert.rejects(
    api.auditBootstrapProposal(root, curation, {
      worker: { role: "curator", id: "curator-cannot-audit" },
    }),
    /auditor|role|worker|separation/i,
  );
  assert.deepEqual(await snapshotTree(root), before, "direct proposal-to-Record attempts must fail before writes");
});

migrationBehavior("selection rubric includes only bounded facts whose absence risks a materially wrong future decision", async (t) => {
  const root = await temporaryDirectory(t, "hw-m5-selection-rubric-");
  await copyReferenceWorkspace(root);
  const api = MIGRATION_PROBE.api;
  const includedCandidates = await referenceCandidates(root);
  const excludedCandidates = excludedRubricCandidates();
  const proposal = api.createBootstrapProposal(proposalInput(
    "extractor-rubric",
    [...excludedCandidates, ...includedCandidates].reverse(),
  ));

  assert.equal(proposal.authority_role, "proposal");
  assert.equal(proposal.proposal_kind, "bootstrap_extraction");
  assert.deepEqual(
    proposal.included.map((entry) => entry.key).sort(),
    includedCandidates.map((entry) => entry.key).sort(),
  );
  assert.deepEqual(
    proposal.excluded.map((entry) => entry.key).sort(),
    excludedCandidates.map((entry) => entry.key).sort(),
  );
  for (const entry of proposal.included) {
    assert.equal(entry.future_decision_risk, "material");
    assert.equal(entry.reviewed, true);
    assert.ok(entry.record_patch && entry.sources.length > 0);
  }
  for (const entry of proposal.excluded) {
    assert.deepEqual(Object.keys(entry).sort(), ["key", "reason", "source_class"]);
    assert.match(entry.reason, /raw|tool|duplicate|obsolete|private|material|review|unsupported/i);
  }
  const rendered = JSON.stringify(proposal);
  assert.doesNotMatch(rendered, /full transcript|tool call payload|private live record/i);
});

migrationBehavior("Record Patch merge is byte-identical across worker completion order and duplicate delivery", async (t) => {
  const root = await temporaryDirectory(t, "hw-m5-merge-order-");
  await copyReferenceWorkspace(root);
  const api = MIGRATION_PROBE.api;
  const candidates = await referenceCandidates(root);
  const left = api.createBootstrapProposal(proposalInput("extractor-left", candidates.slice(0, 3)));
  const right = api.createBootstrapProposal(proposalInput("extractor-right", candidates.slice(3)));

  const leftFirst = api.mergeBootstrapProposals([left, right]);
  const rightFirst = api.mergeBootstrapProposals([right, left]);
  const duplicateDelivery = api.mergeBootstrapProposals([right, left, right]);
  assert.deepEqual(rightFirst, leftFirst);
  assert.deepEqual(duplicateDelivery, leftFirst);
  assert.equal(JSON.stringify(rightFirst), JSON.stringify(leftFirst));
  assert.equal(rightFirst.semantic_hash, leftFirst.semantic_hash);
  assert.deepEqual(
    rightFirst.included.map((entry) => entry.key),
    [...rightFirst.included.map((entry) => entry.key)].sort(),
  );
});

migrationBehavior("Curator preserves superseded decisions and selects exactly one active leaf per dedupe key", async (t) => {
  const root = await temporaryDirectory(t, "hw-m5-curation-supersedes-");
  await copyReferenceWorkspace(root);
  const api = MIGRATION_PROBE.api;
  const candidates = await referenceCandidates(root);
  const proposal = api.createBootstrapProposal(proposalInput("extractor-curation", candidates));
  const merged = api.mergeBootstrapProposals([proposal]);
  const curated = api.curateBootstrapProposals(merged, {
    worker: { role: "curator", id: "curator-supersedes" },
  });

  const oldDecision = curated.records.find((entry) => entry.key === "architecture-runner-legacy");
  const currentDecision = curated.records.find((entry) => entry.key === "architecture-skill-first-current");
  assert.ok(oldDecision, "superseded history must remain in the curation proposal");
  assert.ok(currentDecision);
  assert.deepEqual(currentDecision.supersedes, [oldDecision.key]);
  assert.equal(
    curated.active_by_dedupe_key["architecture/product-boundary"],
    currentDecision.key,
  );
  assert.equal(curated.records.filter((entry) => entry.active).length, 6);
  assert.equal(oldDecision.active, false);
  assert.equal(currentDecision.active, true);
});

migrationBehavior("Curator and merge fail closed on multiple active leaves and non-proposal inputs", async (t) => {
  const root = await temporaryDirectory(t, "hw-m5-curation-conflict-");
  await copyReferenceWorkspace(root);
  const api = MIGRATION_PROBE.api;
  const candidates = await referenceCandidates(root);
  const current = structuredClone(candidates.find((entry) => entry.key === "architecture-skill-first-current"));
  current.key = "architecture-second-active-leaf";
  current.supersedes = [];
  current.record_patch.body = "A conflicting current architecture decision with no supersedes edge.";
  const first = structuredClone(candidates.find((entry) => entry.key === "architecture-skill-first-current"));
  first.supersedes = [];
  const proposal = api.createBootstrapProposal(proposalInput("extractor-conflict", [first, current]));
  const merged = api.mergeBootstrapProposals([proposal]);

  assert.throws(
    () => api.curateBootstrapProposals(merged, { worker: { role: "curator", id: "curator-conflict" } }),
    /active|leaf|conflict|supersede|dedupe/i,
  );
  assert.throws(
    () => api.mergeBootstrapProposals([{ authority_role: "record", proposal_kind: "bootstrap_extraction" }]),
    /proposal|authority|schema|hash/i,
  );
});

migrationBehavior("caller-supplied Record IDs are rejected before deterministic writer staging", async (t) => {
  const root = await temporaryDirectory(t, "hw-m5-caller-id-");
  await copyReferenceWorkspace(root);
  const api = MIGRATION_PROBE.api;
  const [candidate] = await referenceCandidates(root);
  candidate.record_patch.id = "caller-owned-record-id";
  const before = await snapshotTree(root);
  assert.throws(
    () => api.createBootstrapProposal(proposalInput("extractor-caller-id", [candidate])),
    /caller|record|id|writer|forbidden|schema/i,
  );
  assert.deepEqual(await snapshotTree(root), before);
});

migrationBehavior("Auditor approves complete source-bound curation without mutating the legacy workspace", async (t) => {
  const root = await temporaryDirectory(t, "hw-m5-audit-approved-");
  await copyReferenceWorkspace(root);
  const before = await snapshotTree(root);
  const { audit, curation } = await approvedBootstrapInputs(MIGRATION_PROBE.api, root);

  assert.equal(audit.authority_role, "proposal");
  assert.equal(audit.proposal_kind, "bootstrap_audit");
  assert.equal(audit.status, "approved");
  assert.equal(audit.curation_hash, curation.semantic_hash);
  assert.deepEqual(audit.findings, []);
  assert.deepEqual(await snapshotTree(root), before);
});

migrationBehavior("Auditor rejects missing source, source drift, unsupported inference, raw secret, and hidden context without echo", async (t) => {
  const cases = [
    {
      name: "missing-source",
      async arrange(root, candidates) {
        candidates[0].sources[0].locator = ".pipeline/bootstrap-sources/missing.md";
        candidates[0].record_patch.source_refs[0].locator = ".pipeline/bootstrap-sources/missing.md";
      },
      code: /SOURCE_MISSING|MISSING_SOURCE/,
    },
    {
      name: "source-drift",
      async afterCuration(root) {
        await writeText(root, ".pipeline/bootstrap-sources/architecture-current.md", "drifted synthetic source\n");
      },
      code: /SOURCE_DRIFT|DIGEST_MISMATCH/,
    },
    {
      name: "unsupported-inference",
      async arrange(_root, candidates) {
        candidates[1].support = "inferred";
        candidates[1].record_patch.confidence = "confirmed";
      },
      code: /UNSUPPORTED_INFERENCE|CONFIDENCE/,
    },
    {
      name: "raw-secret",
      async arrange(_root, candidates) {
        const secret = ["sk", "m5fixture9Qx4Lm7Vp2Rs8Tn6"].join("-");
        candidates[1].record_patch.body = `Synthetic unsafe credential ${secret}`;
        return secret;
      },
      code: /SECRET|SENSITIVE|CREDENTIAL/,
    },
    {
      name: "hidden-context",
      async arrange(_root, candidates) {
        const hidden = ["private", "deliberation", "fixture"].join("-");
        candidates[1].record_patch.chain_of_thought = hidden;
        return hidden;
      },
      code: /HIDDEN|REASONING|SCHEMA/,
    },
  ];

  for (const entry of cases) {
    await t.test(entry.name, async (subtest) => {
      const root = await temporaryDirectory(subtest, `hw-m5-audit-${entry.name}-`);
      await copyReferenceWorkspace(root);
      const api = MIGRATION_PROBE.api;
      const candidates = await referenceCandidates(root);
      const sensitive = await entry.arrange?.(root, candidates);
      const proposal = api.createBootstrapProposal(proposalInput(`extractor-${entry.name}`, candidates));
      const merged = api.mergeBootstrapProposals([proposal]);
      const curation = api.curateBootstrapProposals(merged, {
        worker: { role: "curator", id: `curator-${entry.name}` },
      });
      await entry.afterCuration?.(root, curation);
      const before = await snapshotTree(root);
      const audit = await api.auditBootstrapProposal(root, curation, {
        worker: { role: "auditor", id: `auditor-${entry.name}` },
      });

      assert.equal(audit.status, "rejected");
      assert.ok(audit.findings.length > 0);
      assert.match(audit.findings.map((finding) => finding.code).join(" "), entry.code);
      const rendered = JSON.stringify(audit);
      if (sensitive) assert.equal(rendered.includes(sensitive), false, "audit result must not echo rejected sensitive content");
      assert.doesNotMatch(rendered, /drifted synthetic source/);
      assert.deepEqual(await snapshotTree(root), before, "Auditor rejection must be zero-write");
    });
  }
});
