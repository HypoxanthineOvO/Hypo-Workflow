import { createHash } from "node:crypto";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const FIXED_NOW = "2026-07-12T07:00:00+08:00";
export const LATER_NOW = "2026-07-12T07:10:00+08:00";
export const BOOTSTRAP_JOB_REF = Object.freeze({
  kind: "bootstrap_job",
  id: "c21-reference-bootstrap",
});
export const DELIVERY_REF = Object.freeze({ kind: "delivery", id: "c21" });
export const PLAN_HASH = "8b704328eac57f25f55624d8e53961479d2b5d7361fdc2184d1f6da9abfe4980";
export const NEXT_ACTION = "Finish C21-M5 bootstrap validation, then start C21-M6 Goal and Cycle delivery core with adaptive Plan.";

const HERE = dirname(fileURLToPath(import.meta.url));
export const FIXTURE_ROOT = join(HERE, "reference-workspace");

export async function temporaryDirectory(t, prefix = "hw-c21-m5-") {
  const root = await mkdtemp(join(tmpdir(), prefix));
  t.after(async () => {
    const { rm } = await import("node:fs/promises");
    await rm(root, { recursive: true, force: true });
  });
  return root;
}

export async function copyReferenceWorkspace(root) {
  await mkdir(root, { recursive: true });
  await cp(join(FIXTURE_ROOT, "README.md"), join(root, "README.md"));
  await cp(join(FIXTURE_ROOT, "legacy-pipeline"), join(root, ".pipeline"), { recursive: true });
  return JSON.parse(await readFile(join(FIXTURE_ROOT, "fixture.json"), "utf8"));
}

export async function referenceCandidates(root) {
  return [
    await recordCandidate(root, {
      key: "requirement-deletion-gate",
      source: "active-requirement.md",
      sourceClass: "active_requirement",
      dedupeKey: "requirement/destructive-cleanup-gate",
      kind: "requirement",
      body: "Destructive cleanup requires a separately approved exact manifest and must not delete tracked legacy files during Bootstrap.",
      current: true,
      supersedes: [],
      updatedAt: "2026-07-12T06:28:00+08:00",
    }),
    await recordCandidate(root, {
      key: "outcome-m1-m4-certified",
      source: "accepted-outcome.md",
      sourceClass: "accepted_outcome",
      dedupeKey: "outcome/C21/M1-M4-certified",
      kind: "decision",
      body: "C21-M1 through M4 transaction, Record, Recovery, Init, and Legacy Inspector boundaries are accepted inputs to Bootstrap.",
      current: true,
      supersedes: [],
      updatedAt: "2026-07-12T06:32:43+08:00",
    }),
    await recordCandidate(root, {
      key: "architecture-runner-legacy",
      source: "architecture-legacy.md",
      sourceClass: "architecture_decision",
      dedupeKey: "architecture/product-boundary",
      body: "Hypo-Workflow was previously treated as an installed runner with platform-owned state.",
      current: false,
      supersedes: [],
      updatedAt: "2026-07-11T21:00:00+08:00",
    }),
    await recordCandidate(root, {
      key: "architecture-skill-first-current",
      source: "architecture-current.md",
      sourceClass: "architecture_decision",
      dedupeKey: "architecture/product-boundary",
      body: "Hypo-Workflow is a Skill and protocol layer; deterministic Core owns durable mechanical authority.",
      current: true,
      supersedes: ["architecture-runner-legacy"],
      updatedAt: "2026-07-12T06:30:00+08:00",
    }),
    await recordCandidate(root, {
      key: "constraint-single-authority",
      source: "constraint.md",
      sourceClass: "cross_cycle_constraint",
      dedupeKey: "constraint/single-authority",
      kind: "requirement",
      body: "Every durable fact has one authority, and legacy authority remains frozen after activation.",
      current: true,
      supersedes: [],
      updatedAt: "2026-07-12T06:31:00+08:00",
    }),
    await recordCandidate(root, {
      key: "failure-pack-restore",
      source: "failure.md",
      sourceClass: "important_feedback_failure",
      dedupeKey: "feedback/recovery-pack-required",
      kind: "feedback",
      body: "Compaction can lose the next action; restore from a validated Pack and replay only required Journal delta.",
      current: true,
      supersedes: [],
      updatedAt: "2026-07-12T06:31:30+08:00",
    }),
    await recordCandidate(root, {
      key: "context-c21-m5",
      source: "current-context.md",
      sourceClass: "current_cycle_context",
      dedupeKey: "cycle/C21/current-context",
      kind: "requirement",
      scope: { type: "cycle", ref: "cycle:C21" },
      body: "C21 is executing M5; after bootstrap validation, M6 implements Goal and Cycle delivery core with adaptive Plan.",
      current: true,
      supersedes: [],
      updatedAt: FIXED_NOW,
    }),
  ];
}

export function excludedRubricCandidates() {
  return [
    excludedCandidate("exclude-raw-chat", "raw_chat", "material"),
    excludedCandidate("exclude-tool-log", "full_tool_log", "material"),
    excludedCandidate("exclude-duplicate-report", "duplicate_report", "none"),
    excludedCandidate("exclude-obsolete-state", "obsolete_intermediate_state", "none"),
    excludedCandidate("exclude-private-live", "private_live_data", "material"),
  ];
}

export function proposalInput(workerId, candidates) {
  return {
    bootstrap_job_ref: BOOTSTRAP_JOB_REF,
    worker: { role: "extractor", id: workerId },
    candidates,
  };
}

export async function approvedBootstrapInputs(api, root, { candidates } = {}) {
  const selected = candidates ?? await referenceCandidates(root);
  const splitAt = Math.ceil(selected.length / 2);
  const first = api.createBootstrapProposal(proposalInput("extractor-a", selected.slice(0, splitAt)));
  const second = api.createBootstrapProposal(proposalInput("extractor-b", selected.slice(splitAt)));
  const merged = api.mergeBootstrapProposals([second, first]);
  const curation = api.curateBootstrapProposals(merged, {
    worker: { role: "curator", id: "curator-a" },
  });
  const audit = await api.auditBootstrapProposal(root, curation, {
    worker: { role: "auditor", id: "auditor-a" },
  });
  return { proposals: [first, second], merged, curation, audit };
}

export function bootstrapStageInput(curation, audit) {
  return {
    bootstrap_job_ref: BOOTSTRAP_JOB_REF,
    manifest: {
      project_id: "hypo-workflow-reference-fixture",
      workspace_id: "hypo-workflow-reference-fixture-local",
    },
    curation,
    audit,
    delivery: {
      object_ref: DELIVERY_REF,
      object_type: "cycle",
      runtime: {
        schema_version: "1",
        object_ref: DELIVERY_REF,
        status: "executing",
        cycle_id: "C21",
        current_milestone: "M5",
        current_step: "bootstrap_activation",
      },
      continuation: {
        schema_version: "1",
        object_ref: DELIVERY_REF,
        next_action: NEXT_ACTION,
        current_milestone: "M5",
        next_milestone: "M6",
      },
    },
    checkpoint: {
      snapshot_kind: "checkpoint",
      object: {
        object_ref: DELIVERY_REF,
        object_type: "cycle",
        state: "checkpoint",
        plan_hash: PLAN_HASH,
        checkpoint_at: FIXED_NOW,
        checkpoint_ref: "cycle:C21/bootstrap-cutover",
      },
    },
    recovery: {
      sealed_at: FIXED_NOW,
      worktree_summary: {
        head: "fixture-head-c21",
        dirty_paths: ["core/src/migration/index.js"],
        diff_summary: { files_changed: 1, insertions: 1, deletions: 0 },
        diff_digest: `sha256:${"3".repeat(64)}`,
      },
    },
  };
}

export async function prepareStagedBootstrap(api, root, { stageId = "m5-bootstrap-stage" } = {}) {
  const prepared = await approvedBootstrapInputs(api, root);
  assertApprovedAudit(prepared.audit);
  const input = bootstrapStageInput(prepared.curation, prepared.audit);
  const stage = await api.stageBootstrapWorkspace(root, input, { id: stageId });
  return { ...prepared, input, stage };
}

function assertApprovedAudit(audit) {
  if (audit?.status !== "approved") {
    throw new Error(`test fixture audit was not approved: ${JSON.stringify(audit?.findings ?? [])}`);
  }
}

export async function legacyAuthoritySnapshot(root) {
  const result = {};
  for (const name of ["state.yaml", "cycle.yaml", "log.yaml"]) {
    const path = join(root, ".pipeline", name);
    const stats = await lstat(path, { bigint: true });
    result[name] = {
      bytes: (await readFile(path)).toString("base64"),
      mtime_ns: stats.mtimeNs.toString(),
    };
  }
  return result;
}

export async function snapshotTree(root, { exclude = [] } = {}) {
  const files = await listFiles(root);
  const result = {};
  for (const path of files) {
    if (exclude.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) continue;
    const content = await readFile(join(root, path));
    result[path] = sha256(content);
  }
  return result;
}

export async function listFiles(root) {
  const result = [];
  async function visit(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`fixture tree contains symlink: ${absolute}`);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) result.push(relative(root, absolute).split("\\").join("/"));
    }
  }
  await visit(root);
  return result;
}

export async function writeText(root, path, content) {
  const absolute = join(root, path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, content, "utf8");
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function recordCandidate(root, input) {
  const locator = `.pipeline/bootstrap-sources/${input.source}`;
  const content = await readFile(join(root, locator));
  const sourceRef = {
    type: "legacy_file",
    ref: `fixture:C21:${input.source}`,
    locator,
  };
  return {
    key: input.key,
    source_class: input.sourceClass,
    future_decision_risk: "material",
    current: input.current,
    reviewed: true,
    support: "observed",
    sources: [{ ...sourceRef, digest: `sha256:${sha256(content)}` }],
    supersedes: input.supersedes,
    record_patch: {
      scope: input.scope ?? { type: "project", ref: "project:hypo-workflow-reference-fixture" },
      kind: input.kind ?? "decision",
      source_refs: [sourceRef],
      confidence: "confirmed",
      dedupe_key: input.dedupeKey,
      created_at: "2026-07-11T20:00:00+08:00",
      updated_at: input.updatedAt,
      supersedes: [],
      body: input.body,
    },
  };
}

function excludedCandidate(key, sourceClass, risk) {
  return {
    key,
    source_class: sourceClass,
    future_decision_risk: risk,
    current: false,
    reviewed: false,
    support: "observed",
    sources: [],
    supersedes: [],
    record_patch: null,
  };
}
