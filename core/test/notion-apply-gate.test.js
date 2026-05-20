import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as api from "../src/index.js";

const NOW = "2026-05-20T00:10:00+08:00";
const RAW_MARKERS = Object.freeze([
  "raw-apply-secret-token",
  "Authorization: Bearer raw-apply-token",
  "RAW_KNOWLEDGE_BLOCK_APPLY_SHOULD_NOT_PROJECT",
  "RAW_KNOWLEDGE_MESSAGE_APPLY_SHOULD_NOT_PROJECT",
  "RAW_KNOWLEDGE_RECORD_APPLY_SHOULD_NOT_PROJECT",
]);

test("/hw:maintain apply preflight rejects missing explicit confirmation and required approved dry-run inputs", async () => {
  const applyApprovedNotionDryRunBundle = requireApi("applyApprovedNotionDryRunBundle");
  const bundle = approvedDryRunBundle();

  for (const [field, patch] of [
    ["explicit_user_confirmation", { explicit_user_confirmation: undefined }],
    ["dry_run_id", { dry_run_id: undefined }],
    ["dry_run_hash", { dry_run_hash: undefined }],
    ["reviewed_apply_plan", { reviewed_apply_plan: undefined }],
    ["target_page_ids", { target_page_ids: undefined }],
  ]) {
    const notion = fakeNotionClient();
    const result = await applyApprovedNotionDryRunBundle({
      ...approvedApplyInput(bundle, notion),
      ...patch,
    }, { now: NOW });

    assert.equal(result.ok, false, `${field} should fail preflight`);
    assert.match(result.errors.join("\n"), new RegExp(field));
    assert.equal(notion.writeCalls.length, 0, `${field} failure must not call Notion writes`);
    assert.equal(result.queue_item?.status, "waiting_confirmation");
  }
});

test("apply preflight rejects false confirmation, empty target maps, and reviewed plan bundle mismatch before writes", async () => {
  const applyApprovedNotionDryRunBundle = requireApi("applyApprovedNotionDryRunBundle");
  const bundle = approvedDryRunBundle();

  for (const [name, patch, pattern] of [
    ["false_confirmation", { explicit_user_confirmation: false }, /explicit_user_confirmation|confirmation/i],
    ["negated_confirmed_string", { explicit_user_confirmation: "not confirmed" }, /explicit_user_confirmation|confirmation/i],
    ["negated_approval_string", { explicit_user_confirmation: "I do not approve applying this reviewed Notion dry-run bundle" }, /explicit_user_confirmation|confirmation/i],
    ["casual_approve_string", { explicit_user_confirmation: "approve applying" }, /explicit_user_confirmation|confirmation/i],
    ["empty_target_page_ids", { target_page_ids: {} }, /target_page_ids|target/i],
    ["reviewed_plan_missing_dry_run_id_hash", {
      reviewed_apply_plan: omit(reviewedPlan(bundle), ["dry_run_id", "dry_run_hash"]),
    }, /reviewed_apply_plan|dry_run_id|dry_run_hash/i],
    ["reviewed_plan_dry_run_id_mismatch", {
      reviewed_apply_plan: { ...reviewedPlan(bundle), dry_run_id: "different-dry-run" },
    }, /reviewed_apply_plan|dry_run_id/i],
    ["reviewed_plan_dry_run_hash_mismatch", {
      reviewed_apply_plan: { ...reviewedPlan(bundle), dry_run_hash: "sha256:different" },
    }, /reviewed_apply_plan|dry_run_hash/i],
  ]) {
    const notion = fakeNotionClient();
    const result = await applyApprovedNotionDryRunBundle({
      ...approvedApplyInput(bundle, notion),
      ...patch,
    }, { now: NOW });

    assert.equal(result.ok, false, `${name} should fail`);
    assert.match(result.errors.join("\n"), pattern);
    assert.equal(notion.writeCalls.length, 0, `${name} must not call Notion writes`);
  }
});

test("apply rejects stale or mutated dry-run bundle hashes before any Notion write", async () => {
  const applyApprovedNotionDryRunBundle = requireApi("applyApprovedNotionDryRunBundle");
  const bundle = approvedDryRunBundle();
  const mutatedBundle = {
    ...bundle,
    sections: {
      ...bundle.sections,
      notion_merge_plan: {
        ...bundle.sections.notion_merge_plan,
        operations: [
          ...bundle.sections.notion_merge_plan.operations,
          operation("op-drift-extra", {
            target_ref: "notion:page/hypo-workflow",
            target_page_id: "page-safe-main",
            action: "append_child_block",
            expected: { text: "Unexpected extra block" },
          }),
        ],
      },
    },
  };
  const notion = fakeNotionClient();

  const result = await applyApprovedNotionDryRunBundle({
    ...approvedApplyInput(mutatedBundle, notion),
    dry_run_hash: bundle.bundle_hash,
  }, { now: NOW });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /dry_run_hash|hash|stale|mutated/i);
  assert.equal(notion.writeCalls.length, 0);
  assert.equal(result.apply_result?.writes_attempted ?? 0, 0);
});

test("apply rejects unresolved conflicts, unconfirmed remote/external candidates, publication candidates, and external actions", async () => {
  const applyApprovedNotionDryRunBundle = requireApi("applyApprovedNotionDryRunBundle");
  const unsafeCases = [
    ["unresolved_conflicts", {
      review: { conflicts: [{ id: "conflict-progress", status: "unresolved", target_ref: "notion:block/legacy-progress" }] },
    }],
    ["remote_candidates_unconfirmed", {
      review: { remote_write_candidates: [{ id: "remote-2", target_ref: "notion:page/other", status: "pending_review", confirmation_required: true }] },
    }],
    ["external_candidates_unconfirmed", {
      review: { external_action_candidates: [{ id: "external-1", side_effect: "external_action", status: "pending_review" }] },
    }],
    ["publication_candidate", {
      review: { external_action_candidates: [{ id: "publication:hypo-info:noon-report", side_effect: "external_action", status: "approved" }] },
    }],
    ["external_action_operation", {
      operations: [
        operation("op-safe-append"),
        operation("op-external", {
          target_ref: "external:webhook:maintenance-summary",
          side_effect: "external_action",
          action: "publish",
        }),
      ],
      reviewed_apply_plan: { approved_operation_ids: ["op-safe-append", "op-external"] },
    }],
  ];

  for (const [name, patch] of unsafeCases) {
    const bundle = approvedDryRunBundle(patch);
    const notion = fakeNotionClient();
    const result = await applyApprovedNotionDryRunBundle({
      ...approvedApplyInput(bundle, notion),
      reviewed_apply_plan: patch.reviewed_apply_plan ? { ...reviewedPlan(bundle), ...patch.reviewed_apply_plan } : reviewedPlan(bundle),
    }, { now: NOW });

    assert.equal(result.ok, false, `${name} should fail`);
    assert.match(result.errors.join("\n"), /conflict|remote|external|publication|unsupported|confirmation/i);
    assert.equal(notion.writeCalls.length, 0, `${name} must not call Notion writes`);
  }
});

test("apply rejects raw secret fields or raw Knowledge blocks/messages/raw_records in bundle, report, or operations", async () => {
  const applyApprovedNotionDryRunBundle = requireApi("applyApprovedNotionDryRunBundle");
  const unsafeCases = [
    ["raw_secret_field", {
      metadata: { api_key: RAW_MARKERS[0] },
    }],
    ["raw_secret_value_in_report", {
      review_report: `Approved report with ${RAW_MARKERS[1]}`,
    }],
    ["raw_knowledge_blocks", {
      sections: { global_projections: { blocks: [{ text: RAW_MARKERS[2] }] } },
    }],
    ["raw_knowledge_messages", {
      sections: { global_consolidation: { messages: [RAW_MARKERS[3]] } },
    }],
    ["raw_records", {
      sections: { global_consolidation: { raw_records: [{ text: RAW_MARKERS[4] }] } },
    }],
    ["raw_operation_payload", {
      operations: [
        operation("op-safe-append"),
        operation("op-raw-payload", {
          raw_blocks: [{ text: "do not project raw operation blocks" }],
          raw_value: RAW_MARKERS[0],
        }),
      ],
      reviewed_apply_plan: { approved_operation_ids: ["op-safe-append", "op-raw-payload"] },
    }],
  ];

  for (const [name, patch] of unsafeCases) {
    const bundle = approvedDryRunBundle(patch);
    const notion = fakeNotionClient();
    const result = await applyApprovedNotionDryRunBundle({
      ...approvedApplyInput(bundle, notion),
      reviewed_apply_plan: patch.reviewed_apply_plan ? { ...reviewedPlan(bundle), ...patch.reviewed_apply_plan } : reviewedPlan(bundle),
    }, { now: NOW });

    assert.equal(result.ok, false, `${name} should fail`);
    assert.match(result.errors.join("\n"), /raw|secret|knowledge|payload|redaction/i);
    assert.equal(notion.writeCalls.length, 0);
  }
});

test("apply writes only the approved Notion operation subset and rejects operation drift", async () => {
  const applyApprovedNotionDryRunBundle = requireApi("applyApprovedNotionDryRunBundle");
  const bundle = approvedDryRunBundle({
    operations: [
      operation("op-safe-append", { action: "append_child_block", expected: { text: "Approved progress block" } }),
      operation("op-unapproved-update", { action: "update_block", target_block_id: "block-existing", expected: { text: "Unapproved update" } }),
    ],
  });
  const notion = fakeNotionClient({
    pages: { "page-safe-main": ["Approved progress block"] },
    blocks: { "block-existing": "Original text" },
  });

  const result = await applyApprovedNotionDryRunBundle({
    ...approvedApplyInput(bundle, notion),
    reviewed_apply_plan: {
      dry_run_id: bundle.bundle_id,
      dry_run_hash: bundle.bundle_hash,
      approved_operation_ids: ["op-safe-append"],
      operations: [{ id: "op-safe-append", operation_hash: operationById(bundle, "op-safe-append").operation_hash }],
    },
  }, { now: NOW });

  assert.equal(result.ok, true, result.errors?.join("\n"));
  assert.deepEqual(notion.writeCalls.map((call) => call.operation_id), ["op-safe-append"]);
  assert.equal(notion.writeCalls.some((call) => call.operation_id === "op-unapproved-update"), false);
  assert.equal(result.apply_result.applied_operation_ids.length, 1);
  assert.equal(result.apply_result.skipped_operation_ids.includes("op-unapproved-update"), true);

  const drifted = approvedDryRunBundle({
    operations: [
      operation("op-safe-append", { action: "append_child_block", expected: { text: "Drifted content after review" } }),
    ],
  });
  const driftResult = await applyApprovedNotionDryRunBundle({
    ...approvedApplyInput(drifted, fakeNotionClient()),
    reviewed_apply_plan: {
      dry_run_id: drifted.bundle_id,
      dry_run_hash: drifted.bundle_hash,
      approved_operation_ids: ["op-safe-append"],
      operations: [{ id: "op-safe-append", operation_hash: operationById(bundle, "op-safe-append").operation_hash }],
    },
  }, { now: NOW });

  assert.equal(driftResult.ok, false);
  assert.match(driftResult.errors.join("\n"), /operation.*drift|operation_hash|approved/i);
});

test("apply re-reads target pages and blocks; failed verification does not complete queue item and records sanitized failure evidence", async () => {
  const applyApprovedNotionDryRunBundle = requireApi("applyApprovedNotionDryRunBundle");
  const bundle = approvedDryRunBundle();
  const notion = fakeNotionClient({
    pages: { "page-safe-main": ["different remote text after write"] },
    persistWrites: false,
  });

  const result = await applyApprovedNotionDryRunBundle(approvedApplyInput(bundle, notion), { now: NOW });

  assert.equal(result.ok, false);
  assert.equal(result.verify_result.passed, false);
  assert.equal(result.queue_item.status, "verifying");
  assert.notEqual(result.queue_item.status, "completed");
  assert.deepEqual(notion.readCalls.map((call) => call.page_id), ["page-safe-main"]);
  assert.equal(result.ledger_event.status, "failed");
  assert.match(result.ledger_event.event_type, /verify|apply/i);
  assertNoRawMarkers(result.ledger_event, RAW_MARKERS);
  assertNoForbiddenKeys(result.ledger_event, ["raw_records", "messages", "blocks", "raw_blocks", "raw_value", "api_key", "authorization"]);
  assert.ok(result.evidence_refs.some((ref) => /verify-results/.test(ref)));
});

test("successful apply returns apply_result, verify_result, sanitized ledger evidence, and completes queue item only after verification passes", async () => {
  const applyApprovedNotionDryRunBundle = requireApi("applyApprovedNotionDryRunBundle");
  const bundle = approvedDryRunBundle();
  const notion = fakeNotionClient();

  const result = await applyApprovedNotionDryRunBundle(approvedApplyInput(bundle, notion), { now: NOW });

  assert.equal(result.ok, true, result.errors?.join("\n"));
  assert.equal(result.apply_result.status, "applied");
  assert.deepEqual(result.apply_result.applied_operation_ids, ["op-safe-append"]);
  assert.equal(result.verify_result.passed, true);
  assert.deepEqual(result.verify_result.verified_target_page_ids, ["page-safe-main"]);
  assert.equal(result.queue_item.status, "completed");
  assert.equal(result.ledger_event.status, "completed");
  assert.ok(result.ledger_event.evidence_refs.every((ref) => /apply-results|verify-results/.test(ref)));
  assert.deepEqual(notion.writeCalls.map((call) => call.operation_id), ["op-safe-append"]);
  assert.deepEqual(notion.readCalls.map((call) => call.page_id), ["page-safe-main"]);
  assertNoRawMarkers(result, RAW_MARKERS);
  assertNoForbiddenKeys(result.ledger_event, ["raw_records", "messages", "blocks", "raw_blocks", "raw_value", "api_key", "authorization"]);
});

function requireApi(name) {
  assert.equal(typeof api[name], "function", `expected ${name} to be exported from ../src/index.js`);
  return api[name];
}

function approvedApplyInput(bundle = approvedDryRunBundle(), notion = fakeNotionClient()) {
  return {
    command: "/hw:maintain apply",
    dry_run_id: bundle.bundle_id,
    dry_run_hash: bundle.bundle_hash,
    reviewed_apply_plan: reviewedPlan(bundle),
    explicit_user_confirmation: confirmationFor(bundle),
    target_page_ids: {
      "notion:page/hypo-workflow": "page-safe-main",
    },
    bundle,
    notion,
    queue_item: {
      id: "mq-20260520-notion-apply",
      kind: "maintenance_operation",
      object_ref: "hypo-workflow",
      operation: "notion_apply",
      target_ref: "notion:page/hypo-workflow",
      side_effect: "remote_write",
      status: "approved",
      evidence_refs: ["~/.hypo-workflow/maintenance/evidence/dry-runs/rmdrb-safe.yaml"],
    },
  };
}

function confirmationFor(bundle) {
  return `I explicitly approve applying reviewed Notion dry-run bundle ${bundle.bundle_id} with hash ${bundle.bundle_hash}`;
}

function approvedDryRunBundle(patch = {}) {
  const operations = patch.operations || [
    operation("op-safe-append", {
      action: "append_child_block",
      target_ref: "notion:page/hypo-workflow",
      target_page_id: "page-safe-main",
      expected: { text: "Approved progress block" },
    }),
  ];
  const review = mergeDeep({
    conflicts: [],
    remote_write_candidates: [
      {
        id: "notion:page/hypo-workflow",
        target_ref: "notion:page/hypo-workflow",
        status: "approved",
        side_effect: "remote_write",
        confirmation_required: true,
      },
    ],
    external_action_candidates: [],
    confirmation_requirements: [
      {
        id: "confirm-notion-page-hypo-workflow",
        target_ref: "notion:page/hypo-workflow",
        side_effect: "remote_write",
        required: true,
        status: "approved",
      },
    ],
    redaction_scan: {
      raw_secret_seen: false,
      raw_secret_recorded: false,
      evidence_refs: ["~/.hypo-workflow/maintenance/evidence/dry-runs/redaction-safe.yaml"],
    },
  }, patch.review || {});
  const sections = mergeDeep({
    notion_merge_plan: {
      mode: "dry-run",
      remote_writes_enabled: false,
      operations,
      conflicts: [],
    },
    maintenance_queue: {
      items: [
        {
          id: "mq-20260520-notion-apply",
          operation: "notion_apply",
          target_ref: "notion:page/hypo-workflow",
          status: "approved",
          side_effect: "remote_write",
        },
      ],
    },
    global_projections: { entries: [] },
  }, patch.sections || {});
  const content = {
    kind: "root_management_dry_run_review_bundle",
    schema_version: "1",
    remote_writes_enabled: false,
    apply_enabled: false,
    external_actions_enabled: false,
    sections,
    review,
  };
  const bundleHash = `sha256:${sha256Canonical(content)}`;
  return {
    ...content,
    bundle_id: "rmdrb-safe",
    bundle_hash: bundleHash,
    content_hash: bundleHash,
    generated_at: NOW,
    review_report: patch.review_report || "Approved sanitized Notion dry-run review report.",
    ...(patch.metadata ? { metadata: patch.metadata } : {}),
  };
}

function reviewedPlan(bundle = approvedDryRunBundle()) {
  return {
    dry_run_id: bundle.bundle_id,
    dry_run_hash: bundle.bundle_hash,
    approved_operation_ids: ["op-safe-append"],
    operations: [
      {
        id: "op-safe-append",
        operation_hash: operationById(bundle, "op-safe-append").operation_hash,
        target_page_id: "page-safe-main",
      },
    ],
    reviewed_by: "user",
    reviewed_at: NOW,
  };
}

function omit(object, keys) {
  const result = { ...object };
  for (const key of keys) delete result[key];
  return result;
}

function operation(id, overrides = {}) {
  const base = {
    id,
    operation: "notion_apply",
    action: "append_child_block",
    side_effect: "remote_write",
    target_ref: "notion:page/hypo-workflow",
    target_page_id: "page-safe-main",
    dry_run: true,
    remote_writes_enabled: false,
    status: "approved",
    block: {
      type: "paragraph",
      text: "Approved progress block",
    },
    expected: {
      text: "Approved progress block",
    },
  };
  const merged = mergeDeep(base, overrides);
  const hashInput = {
    id: merged.id,
    operation: merged.operation,
    action: merged.action,
    target_ref: merged.target_ref,
    target_page_id: merged.target_page_id,
    target_block_id: merged.target_block_id || null,
    block: merged.block || null,
    expected: merged.expected || null,
  };
  return {
    ...merged,
    operation_hash: `sha256:${sha256Canonical(hashInput)}`,
  };
}

function operationById(bundle, id) {
  const found = bundle.sections.notion_merge_plan.operations.find((item) => item.id === id);
  assert.ok(found, `missing operation ${id}`);
  return found;
}

function fakeNotionClient(options = {}) {
  const writeCalls = [];
  const readCalls = [];
  const pages = { ...(options.pages || {}) };
  const blocks = { ...(options.blocks || {}) };
  const persistWrites = options.persistWrites !== false;
  return {
    writeCalls,
    readCalls,
    async appendBlock(input) {
      writeCalls.push({ method: "appendBlock", ...input });
      if (persistWrites) {
        if (!pages[input.page_id]) pages[input.page_id] = [];
        pages[input.page_id].push(input.block?.text || input.block?.paragraph?.text || "");
      }
      return { ok: true, block_id: input.block_id || `block-${writeCalls.length}` };
    },
    async updateBlock(input) {
      writeCalls.push({ method: "updateBlock", ...input });
      if (persistWrites) blocks[input.block_id] = input.block?.text || input.text || "";
      return { ok: true, block_id: input.block_id };
    },
    async readPage(input) {
      const pageId = typeof input === "string" ? input : input.page_id;
      readCalls.push({ method: "readPage", page_id: pageId });
      return { ok: true, page_id: pageId, text: (pages[pageId] || []).join("\n") };
    },
    async readBlock(input) {
      const blockId = typeof input === "string" ? input : input.block_id;
      readCalls.push({ method: "readBlock", block_id: blockId });
      return { ok: true, block_id: blockId, text: blocks[blockId] || "" };
    },
  };
}

function sha256Canonical(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function mergeDeep(base, patch) {
  if (Array.isArray(base) || Array.isArray(patch)) return patch === undefined ? base : patch;
  if (!base || typeof base !== "object" || !patch || typeof patch !== "object") {
    return patch === undefined ? base : patch;
  }
  const next = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    next[key] = mergeDeep(base[key], value);
  }
  return next;
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
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
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
