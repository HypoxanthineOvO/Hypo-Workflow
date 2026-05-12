import test from "node:test";
import assert from "node:assert/strict";
import * as hw from "../src/index.js";

const SOURCE_PROMPT = ".pipeline/prompts/04-orchestrator-rejection-rework-blocked-runtime-loop.md";

const rejectionInput = Object.freeze({
  cycle_id: "C11",
  feature_id: "F001",
  milestone_id: "M05",
  scope: "milestone",
  verdict: "rejected",
  reasons: [
    {
      code: "TEST-01",
      severity: "warning",
      summary: "Rejection loop has no deterministic rework routing.",
    },
  ],
  required_rework: [
    {
      id: "RW-01",
      owner_roles: ["test", "implement"],
      summary: "Add deterministic rework routing and validation evidence.",
      files: ["core/src/acceptance/index.js", "core/src/lifecycle/index.js"],
    },
  ],
  blocked_request: {
    status: "none",
    proposed_by_role: null,
    approved_by_role: null,
  },
  audit: {
    reviewer_role: "audit",
    verdict: "needs_changes",
    findings: [
      {
        id: "AUD-01",
        dimension: "TEST",
        severity: "Warning",
        summary: "Rejected work must resume through a test plus implement rework lane.",
      },
    ],
  },
  original_prompt_ref: SOURCE_PROMPT,
});

function requireHelper(name) {
  assert.equal(typeof hw[name], "function", `${name} must be exported from core/src/index.js`);
  return hw[name];
}

test("structured rejection artifact carries schema fields needed for auditable rework", () => {
  const createStructuredRejectionArtifact = requireHelper("createStructuredRejectionArtifact");

  const artifact = createStructuredRejectionArtifact({
    ...rejectionInput,
    created_at: "2026-05-11T10:00:00+08:00",
  });

  assert.equal(artifact.schema_version, 1);
  assert.equal(artifact.cycle_id, "C11");
  assert.equal(artifact.feature_id, "F001");
  assert.equal(artifact.milestone_id, "M05");
  assert.equal(artifact.scope, "milestone");
  assert.equal(artifact.verdict, "rejected");
  assert.deepEqual(artifact.reasons, rejectionInput.reasons);
  assert.deepEqual(artifact.required_rework, rejectionInput.required_rework);
  assert.deepEqual(artifact.blocked_request, rejectionInput.blocked_request);
  assert.equal(artifact.audit.reviewer_role, "audit");
  assert.equal(artifact.audit.verdict, "needs_changes");
  assert.deepEqual(artifact.audit.findings, rejectionInput.audit.findings);
});

test("rejection next step deterministically routes to rework with both test and implement roles", () => {
  const resolveRejectionNextStep = requireHelper("resolveRejectionNextStep");

  const next = resolveRejectionNextStep({
    artifact: rejectionInput,
    lifecycle_policy: { reject: { default_action: "needs_revision" } },
  });

  assert.equal(next.action, "rework");
  assert.equal(next.silent_continue, false);
  assert.equal(next.requires_acceptance, false);
  assert.deepEqual([...next.required_roles].sort(), ["implement", "test"]);
  assert.equal(next.prompt_kind, "rework");
  assert.equal(next.reason, "cycle_rejected");
});

test("blocked proposal semantics enforce implement proposal and audit-only approval", () => {
  const evaluateBlockedRuntimeDecision = requireHelper("evaluateBlockedRuntimeDecision");

  const testProposal = evaluateBlockedRuntimeDecision({
    actor_role: "test",
    action: "propose_blocked",
    evidence: { reason: "external dependency unavailable" },
  });
  assert.equal(testProposal.allowed, false);
  assert.match(testProposal.reason, /only implement may propose blocked/i);

  const implementProposal = evaluateBlockedRuntimeDecision({
    actor_role: "implement",
    actor_worker_id: "impl-1",
    action: "propose_blocked",
    evidence: { reason: "system-level dependency installation requires explicit user ask" },
  });
  assert.equal(implementProposal.allowed, true);
  assert.equal(implementProposal.status, "blocked_proposed");
  assert.equal(implementProposal.approved, false);

  const selfApproval = evaluateBlockedRuntimeDecision({
    actor_role: "implement",
    actor_worker_id: "impl-1",
    action: "approve_blocked",
    proposal: implementProposal.blocked_request,
  });
  assert.equal(selfApproval.allowed, false);
  assert.match(selfApproval.reason, /only audit may approve blocked|self-approved/i);

  const auditApproval = evaluateBlockedRuntimeDecision({
    actor_role: "audit",
    actor_worker_id: "audit-1",
    action: "approve_blocked",
    proposal: implementProposal.blocked_request,
  });
  assert.equal(auditApproval.allowed, true);
  assert.equal(auditApproval.status, "blocked_approved");
  assert.equal(auditApproval.approved, true);
});

test("rework prompt linkage preserves source prompt and derives incremental scope from required rework", () => {
  const buildReworkPromptLinkage = requireHelper("buildReworkPromptLinkage");

  const linkage = buildReworkPromptLinkage({
    rejection_artifact: rejectionInput,
    source_prompt_ref: SOURCE_PROMPT,
  });

  assert.equal(linkage.original_prompt_ref, SOURCE_PROMPT);
  assert.equal(linkage.prompt_ref, SOURCE_PROMPT);
  assert.equal(linkage.scope_mode, "incremental");
  assert.deepEqual(linkage.required_roles.sort(), ["implement", "test"]);
  assert.deepEqual(linkage.incremental_scope.required_rework, rejectionInput.required_rework);
  assert.deepEqual(linkage.incremental_scope.findings, rejectionInput.audit.findings);
  assert.equal(linkage.incremental_scope.allow_unrelated_scope, false);
});
