import test from "node:test";
import assert from "node:assert/strict";
import * as core from "../src/index.js";

test("global knowledge projection aggregates safe surfaces without copying raw project records", () => {
  const buildGlobalKnowledgeProjection = requireFunction(core, "buildGlobalKnowledgeProjection");

  const projection = buildGlobalKnowledgeProjection({
    generated_at: "2026-05-19T15:30:00+08:00",
    project_surfaces: [
      {
        object_id: "hypo-writer",
        compact: {
          path: "/workspace/hypo-writer/.pipeline/knowledge/knowledge.compact.md",
          hash: "sha256:compact-writer",
          summary: "Hypo-Writer publishes accepted article summaries through a secret_ref capability.",
          freshness: "current",
        },
        indexes: [
          {
            category: "secret-refs",
            path: "/workspace/hypo-writer/.pipeline/knowledge/index/secret-refs.yaml",
            entries: [
              {
                id: "wechat-publisher-ref",
                title: "WeChat publisher secret reference",
                summary: "Publishing uses local_secret:wechat-publisher; raw values are not projected.",
                sensitivity: "secret_ref",
                evidence_refs: ["hypo-writer:index/secret-refs.yaml#wechat-publisher-ref"],
              },
            ],
          },
        ],
        raw_records: [
          {
            id: "raw-project-record-must-not-copy",
            details: { note: "RAW_PROJECT_DETAIL_SHOULD_NOT_PROJECT" },
            messages: ["private raw record message should not project"],
            blocks: [{ text: "raw transcript block should not project" }],
            api_key: "sk-project-raw-secret",
          },
        ],
      },
      {
        object_id: "hypo-infra",
        compact: {
          title: "Infrastructure Compact",
          summary: "Infrastructure facts compact keeps explicit evidence refs even without a file path.",
          evidence_refs: ["global:infra-compact#server-facts"],
        },
      },
    ],
    global_authored_records: [
      {
        id: "global.shared-publishing-sop",
        category: "publishing_sop",
        title: "Shared publishing SOP",
        summary: "Use accepted summaries and secret references when publishing through shared channels.",
        authority: "global_authored_record",
        evidence_refs: ["~/.hypo-workflow/knowledge/records/shared-publishing-sop.yaml"],
      },
    ],
    consolidation_candidates: [
      {
        id: "gcc-accepted-cross-project",
        status: "accepted",
        type: "knowledge",
        title: "Accepted cross-project summary",
        summary: "Daily consolidation found a reusable cross-project maintenance pattern.",
        evidence_refs: [".pipeline/reviews/C16/M6/acceptance.md#gcc-accepted-cross-project"],
      },
      {
        id: "gcc-pending-cross-project",
        status: "pending_review",
        title: "Pending summary must stay non-authoritative",
        summary: "PENDING_CANDIDATE_SHOULD_NOT_PROJECT",
      },
      {
        id: "gcc-rejected-cross-project",
        status: "rejected",
        title: "Rejected summary must stay out",
        summary: "REJECTED_CANDIDATE_SHOULD_NOT_PROJECT",
      },
    ],
  });

  assert.equal(projection.projection, "global_knowledge");
  assert.equal(projection.raw_project_records_copied, false);
  assert.ok(Array.isArray(projection.entries), "projection.entries must be an array");

  assert.ok(projection.entries.some((entry) => entry.id === "hypo-writer.wechat-publisher-ref"));
  assert.deepEqual(
    projection.entries.find((entry) => entry.id === "hypo-infra.compact")?.evidence_refs,
    ["global:infra-compact#server-facts"],
  );
  assert.ok(projection.entries.some((entry) => entry.id === "global.shared-publishing-sop"));
  assert.ok(projection.entries.some((entry) => entry.id === "gcc-accepted-cross-project"));
  assert.equal(projection.entries.some((entry) => entry.id === "gcc-pending-cross-project"), false);
  assert.equal(projection.entries.some((entry) => entry.id === "gcc-rejected-cross-project"), false);

  for (const entry of projection.entries) {
    assert.ok(entry.source_ref || entry.evidence_refs?.length, `entry ${entry.id} must keep source evidence`);
    assert.notEqual(entry.authority, "project_raw_record", `entry ${entry.id} must not promote raw project records`);
  }
  assertNoForbiddenKeys(projection, ["raw_value", "value", "token", "api_key", "password", "authorization"]);
  assertNoRawMarkers(projection, [
    "RAW_PROJECT_DETAIL_SHOULD_NOT_PROJECT",
    "private raw record message should not project",
    "raw transcript block should not project",
    "sk-project-raw-secret",
    "PENDING_CANDIDATE_SHOULD_NOT_PROJECT",
    "REJECTED_CANDIDATE_SHOULD_NOT_PROJECT",
  ]);
});

test("infrastructure fact projection preserves metadata fields and omits raw secrets", () => {
  const buildInfrastructureFactProjection = requireFunction(core, "buildInfrastructureFactProjection");

  const projection = buildInfrastructureFactProjection({
    generated_at: "2026-05-19T15:31:00+08:00",
    facts: [
      {
        id: "infra.hypo-claw-api",
        kind: "service_endpoint",
        title: "Hypo-Claw API endpoint",
        summary: "Hypo-Claw API is available through a local secret reference.",
        sensitivity: "secret_ref",
        freshness: "current",
        authority: "workspace_authority",
        evidence_refs: ["~/.hypo-workflow/workspace.yaml#secret_refs.hypo-claw-api"],
        details: {
          base_url: "https://claw.example.invalid",
          authorization: "Bearer raw-infra-token",
          password: "raw-infra-password",
        },
      },
    ],
  });

  assert.equal(projection.projection, "infrastructure_facts");
  assert.ok(Array.isArray(projection.facts), "projection.facts must be an array");
  assert.equal(projection.facts.length, 1);
  assert.deepEqual(
    pick(projection.facts[0], ["id", "sensitivity", "freshness", "authority", "evidence_refs"]),
    {
      id: "infra.hypo-claw-api",
      sensitivity: "secret_ref",
      freshness: "current",
      authority: "workspace_authority",
      evidence_refs: ["~/.hypo-workflow/workspace.yaml#secret_refs.hypo-claw-api"],
    },
  );
  assertNoForbiddenKeys(projection, ["raw_value", "value", "token", "api_key", "password", "authorization"]);
  assertNoRawMarkers(projection, ["raw-infra-token", "raw-infra-password"]);
});

test("Notion-projectable global summary includes accepted safe summaries only", () => {
  const buildNotionProjectableGlobalSummary = requireFunction(core, "buildNotionProjectableGlobalSummary");

  const summary = buildNotionProjectableGlobalSummary({
    generated_at: "2026-05-19T15:32:00+08:00",
    global_knowledge_projection: {
      projection: "global_knowledge",
      entries: [
        {
          id: "global.safe-summary",
          status: "accepted",
          title: "Safe Global Knowledge summary",
          summary: "Accepted maintenance summary safe for Notion.",
          sensitivity: "internal",
          projection: "summary_only",
          evidence_refs: ["global:knowledge-index#safe-summary"],
        },
        {
          id: "global.raw-knowledge",
          status: "raw",
          title: "Raw Knowledge must not project",
          summary: "RAW_KNOWLEDGE_SHOULD_NOT_REACH_NOTION",
          details: { blocks: ["raw block"] },
          projection: "raw_record",
        },
      ],
    },
    secret_capability_projection: {
      projection: "secret_capabilities",
      secret_refs: [
        {
          id: "notion-main",
          provider: "notion",
          allowed_for: ["sync"],
          health: { status: "unknown" },
          redaction_policy: { raw_projected: false, mode: "metadata_only" },
          secret_ref: { store_ref: "local_secret:notion-main" },
        },
      ],
      raw_secret_store: {
        value: { token: "raw-notion-token-must-not-project" },
      },
    },
    raw_knowledge_records: [
      {
        id: "raw-project-record",
        messages: ["RAW_NOTION_MESSAGE_SHOULD_NOT_PROJECT"],
        api_key: "sk-notion-raw-secret",
      },
    ],
  });

  assert.equal(summary.projection, "notion_global_summary");
  assert.equal(summary.remote_writes_enabled, false);
  assert.ok(Array.isArray(summary.blocks), "Notion summary must expose safe blocks for downstream dry-run/apply payloads");
  assert.ok(summary.blocks.some((block) => block.type === "summary" && block.id === "global.safe-summary"));
  assert.ok(summary.blocks.some((block) => block.type === "secret_ref" && block.id === "notion-main"));
  assert.match(JSON.stringify(summary), /Safe Global Knowledge summary/);
  assert.match(JSON.stringify(summary), /notion-main/);
  assertNoForbiddenKeys(summary, ["raw_value", "value", "token", "api_key", "password", "authorization"]);
  assertNoRawMarkers(summary, [
    "RAW_KNOWLEDGE_SHOULD_NOT_REACH_NOTION",
    "RAW_NOTION_MESSAGE_SHOULD_NOT_PROJECT",
    "sk-notion-raw-secret",
    "raw-notion-token-must-not-project",
  ]);
});

function requireFunction(moduleNamespace, name) {
  assert.equal(typeof moduleNamespace[name], "function", `${name} must be exported`);
  return moduleNamespace[name];
}

function pick(object, keys) {
  return Object.fromEntries(keys.map((key) => [key, object[key]]));
}

function assertNoForbiddenKeys(value, keys) {
  const forbidden = new Set(keys.map((key) => key.toLowerCase()));
  const found = [];
  visit(value, (key) => {
    if (forbidden.has(String(key).toLowerCase())) found.push(key);
  });
  assert.deepEqual(found, []);
}

function assertNoRawMarkers(value, markers) {
  const serialized = JSON.stringify(value);
  for (const marker of markers) {
    assert.doesNotMatch(serialized, new RegExp(escapeRegExp(marker), "i"));
  }
}

function visit(value, onKey) {
  if (Array.isArray(value)) {
    for (const item of value) visit(item, onKey);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    onKey(key);
    visit(child, onKey);
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
