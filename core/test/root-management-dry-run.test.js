import test from "node:test";
import assert from "node:assert/strict";
import * as api from "../src/index.js";

const NOW = "2026-05-19T23:40:00+08:00";
const EVIDENCE_ROOT = "~/.hypo-workflow/maintenance/evidence/dry-runs/";
const RAW_MARKERS = Object.freeze([
  "secret_notion_token_must_not_project",
  "raw-workspace-api-key-must-not-project",
  "raw-legacy-block-secret-must-not-project",
  "raw-template-token-must-not-project",
  "raw-queue-password-must-not-project",
  "RAW_KNOWLEDGE_RECORD_SHOULD_NOT_PROJECT",
  "RAW_KNOWLEDGE_MESSAGE_SHOULD_NOT_PROJECT",
  "RAW_KNOWLEDGE_BLOCK_SHOULD_NOT_PROJECT",
  "sk-root-dry-run-secret",
  "Authorization: Bearer raw-root-dry-run-token",
]);

test("/hw:maintain plan builds one end-to-end dry-run review bundle from M1-M7 surfaces", async () => {
  const buildRootManagementDryRunBundle = requireApi("buildRootManagementDryRunBundle");
  const input = rootManagementFixture();

  const bundle = await buildRootManagementDryRunBundle(input, {
    now: NOW,
    evidenceRoot: EVIDENCE_ROOT,
    dryRun: true,
    language: "zh-CN",
  });

  assert.equal(bundle.kind, "root_management_dry_run_review_bundle");
  assert.equal(bundle.schema_version, "1");
  assert.match(bundle.bundle_id, /^rmdrb-[a-z0-9-]+$/);
  assert.match(bundle.bundle_hash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(bundle.generated_at, NOW);
  assert.equal(bundle.evidence_root, EVIDENCE_ROOT);
  assert.ok(bundle.review_report, "bundle must include rendered Chinese review report");

  assertSection(bundle, "workspace_draft");
  assertSection(bundle, "object_registry");
  assertSection(bundle, "artifact_catalog");
  assertSection(bundle, "storage_sync_template");
  assertSection(bundle, "notion_merge_plan");
  assertSection(bundle, "maintenance_queue");
  assertSection(bundle, "run_plans");
  assertSection(bundle, "global_projections");
  assertSection(bundle, "backups_preview");
  assertSection(bundle, "redaction_scan");

  assert.deepEqual(bundle.sections.workspace_draft.object_ids.sort(), ["hypo-info", "hypo-workflow"]);
  assert.ok(bundle.sections.artifact_catalog.entries.some((entry) => entry.kind === "project_overview"));
  assert.ok(bundle.sections.storage_sync_template.project_home?.slots?.some((slot) => slot.id === "progress"));
  assert.ok(bundle.sections.notion_merge_plan.operations.every((operation) => operation.action === "dry-run"));
  assert.ok(bundle.sections.maintenance_queue.items.length >= 3);
  assert.ok(bundle.sections.run_plans.some((run) => run.run_type === "orchestration"));
  assert.ok(bundle.sections.global_projections.entries.some((entry) => entry.id === "global.safe-maintenance-pattern"));
  assert.ok(bundle.sections.backups_preview.items.some((item) => item.action === "preview"));
});

test("dry-run bundle hash is stable for identical content and independent from generated_at/output paths", async () => {
  const buildRootManagementDryRunBundle = requireApi("buildRootManagementDryRunBundle");
  const input = rootManagementFixture();

  const first = await buildRootManagementDryRunBundle(input, {
    now: "2026-05-19T23:40:00+08:00",
    outputPath: "/tmp/hw-dry-run/first/bundle.json",
    evidenceRoot: EVIDENCE_ROOT,
    dryRun: true,
  });
  const second = await buildRootManagementDryRunBundle(input, {
    now: "2026-05-20T00:05:00+08:00",
    outputPath: "/tmp/hw-dry-run/second/bundle.json",
    evidenceRoot: EVIDENCE_ROOT,
    dryRun: true,
  });

  assert.equal(first.bundle_hash, second.bundle_hash);
  assert.equal(first.content_hash || first.bundle_hash, second.content_hash || second.bundle_hash);
  assert.match(first.bundle_hash, /^sha256:[a-f0-9]{64}$/);
  assert.match(second.bundle_hash, /^sha256:[a-f0-9]{64}$/);
  if (first.instance_id || second.instance_id) {
    assert.notEqual(first.instance_id, second.instance_id, "instance_id may vary when content_hash remains stable");
  }
});

test("bundle classifies unchanged, conflict, stale, and secret-containing fixtures into reviewable candidate buckets", async () => {
  const buildRootManagementDryRunBundle = requireApi("buildRootManagementDryRunBundle");

  const bundle = await buildRootManagementDryRunBundle(rootManagementFixture(), {
    now: NOW,
    evidenceRoot: EVIDENCE_ROOT,
    dryRun: true,
  });

  assert.deepEqual(Object.keys(bundle.review).sort(), [
    "confirmation_requirements",
    "conflicts",
    "external_action_candidates",
    "local_write_candidates",
    "redaction_scan",
    "remote_write_candidates",
  ]);

  assertCandidate(bundle.review.local_write_candidates, "hypo-workflow:PROJECT-SUMMARY.md", {
    status: "stale",
    side_effect: "local_document_write_with_backup",
  });
  assertCandidate(bundle.review.remote_write_candidates, "notion:project-home:hypo-workflow", {
    status: "conflict",
    side_effect: "remote_write",
    dry_run: true,
  });
  assertCandidate(bundle.review.external_action_candidates, "publication:hypo-info:noon-report", {
    status: "blocked",
    side_effect: "external_action",
    dry_run: true,
  });
  assertConflict(bundle.review.conflicts, "notion:block:legacy-progress", "progress");
  assertConfirmation(bundle.review.confirmation_requirements, "notion:project-home:hypo-workflow");
  assert.equal(bundle.review.redaction_scan.raw_secret_seen, true);
  assert.equal(bundle.review.redaction_scan.raw_secret_recorded, false);
  assert.ok(bundle.review.redaction_scan.evidence_refs.length > 0);
});

test("bundle and report serialization omit raw secrets and raw Knowledge records while preserving metadata-only refs", async () => {
  const buildRootManagementDryRunBundle = requireApi("buildRootManagementDryRunBundle");

  const bundle = await buildRootManagementDryRunBundle(rootManagementFixture(), {
    now: NOW,
    evidenceRoot: EVIDENCE_ROOT,
    dryRun: true,
    language: "zh-CN",
  });

  assertNoRawMarkers(bundle, RAW_MARKERS);
  assertNoForbiddenKeys(bundle, ["raw_records", "messages", "blocks", "raw_blocks", "raw_value", "api_key", "password", "authorization"]);

  const serialized = JSON.stringify(bundle);
  assert.match(serialized, /local_secret:notion-main/);
  assert.match(serialized, /metadata_only/);
  assert.match(serialized, /secret_ref/);
  assert.match(bundle.review_report, /local_secret:notion-main/);
  assert.doesNotMatch(bundle.review_report, /RAW_KNOWLEDGE|raw-root-dry-run-token|secret_notion_token/i);
});

test("dry-run bundle removes raw block containers and normalizes upstream write-looking actions", async () => {
  const buildRootManagementDryRunBundle = requireApi("buildRootManagementDryRunBundle");

  const input = rootManagementFixture({
    global_projections: {
      entries: globalProjections().entries,
      blocks: [
        {
          text: "Plain raw knowledge block text must not enter the dry-run review bundle.",
        },
      ],
      raw_blocks: [
        {
          text: "Plain raw block payload must not enter the dry-run review bundle.",
        },
      ],
    },
    notion_dry_run: {
      ...notionDryRun(throwingNoWriteClient("notion")),
      operations: [
        {
          id: "notion:project-home:hypo-workflow",
          operation: "update_remote_block",
          action: "update",
          target_ref: "notion:project-home:hypo-workflow",
          slot_id: "progress",
          status: "conflict",
          side_effect: "remote_write",
          confirmation_required: true,
        },
      ],
    },
  });

  const bundle = await buildRootManagementDryRunBundle(input, {
    now: NOW,
    evidenceRoot: EVIDENCE_ROOT,
    dryRun: true,
    language: "zh-CN",
  });
  const serialized = JSON.stringify(bundle);

  assertNoForbiddenKeys(bundle, ["blocks", "raw_blocks"]);
  assert.doesNotMatch(serialized, /Plain raw knowledge block text/);
  assert.doesNotMatch(serialized, /Plain raw block payload/);
  assert.ok(bundle.sections.notion_merge_plan.operations.every((operation) => operation.action === "dry-run"));
  assert.ok(bundle.review.remote_write_candidates.every((candidate) => candidate.dry_run === true));
});

test("Notion, publication, and external actions remain dry-run/no-write and never call write hooks", async () => {
  const buildRootManagementDryRunBundle = requireApi("buildRootManagementDryRunBundle");
  const notionClient = throwingNoWriteClient("notion");
  const publicationClient = throwingNoWriteClient("publication");
  const externalClient = throwingNoWriteClient("external");

  const bundle = await buildRootManagementDryRunBundle(rootManagementFixture({
    clients: {
      notion: notionClient,
      publication: publicationClient,
      external: externalClient,
    },
  }), {
    now: NOW,
    evidenceRoot: EVIDENCE_ROOT,
    dryRun: true,
  });

  assert.equal(bundle.remote_writes_enabled, false);
  assert.equal(bundle.apply_enabled, false);
  assert.equal(bundle.external_actions_enabled, false);
  assert.equal(notionClient.writeCalls.length, 0);
  assert.equal(publicationClient.writeCalls.length, 0);
  assert.equal(externalClient.writeCalls.length, 0);

  const remotePlans = [
    ...bundle.sections.notion_merge_plan.operations,
    ...bundle.review.remote_write_candidates,
    ...bundle.review.external_action_candidates,
  ];
  assert.ok(remotePlans.length > 0);
  assert.ok(remotePlans.every((operation) => operation.dry_run === true || operation.action === "dry-run"));
  assert.ok(remotePlans.every((operation) => operation.remote_writes_enabled === false));
});

test("Chinese review report names bundle hash, redaction evidence, no-write evidence, and confirmation gates", async () => {
  const buildRootManagementDryRunBundle = requireApi("buildRootManagementDryRunBundle");

  const bundle = await buildRootManagementDryRunBundle(rootManagementFixture(), {
    now: NOW,
    evidenceRoot: EVIDENCE_ROOT,
    dryRun: true,
    language: "zh-CN",
  });

  assert.match(bundle.review_report, /# C16-M8 端到端 Dry-Run Review Pack/);
  assert.match(bundle.review_report, /Bundle Hash|bundle hash|哈希/);
  assert.match(bundle.review_report, /脱敏证据|Redaction Evidence/);
  assert.match(bundle.review_report, /No-Write Evidence|无写入证据|不写入证据/);
  assert.match(bundle.review_report, /本地写入候选/);
  assert.match(bundle.review_report, /远程写入候选/);
  assert.match(bundle.review_report, /外部动作候选/);
  assert.match(bundle.review_report, /冲突/);
  assert.match(bundle.review_report, /用户确认|确认门禁/);
  assert.match(bundle.review_report, new RegExp(escapeRegExp(bundle.bundle_hash)));
  assertNoRawMarkers(bundle.review_report, RAW_MARKERS);
});

function requireApi(name) {
  assert.equal(typeof api[name], "function", `expected ${name} to be exported from ../src/index.js`);
  return api[name];
}

function rootManagementFixture(overrides = {}) {
  const clients = overrides.clients || {};
  return {
    command: "/hw:maintain plan",
    mode: "dry-run",
    workspace: workspaceAuthority(),
    object_registry: {
      kind: "object_registry",
      objects: [
        { object_id: "hypo-workflow", source_ref: "workspace:objects.hypo-workflow", status: "current" },
        { object_id: "hypo-info", source_ref: "workspace:objects.hypo-info", status: "current" },
      ],
    },
    artifact_catalog: artifactCatalog(),
    storage_sync_template: storageSyncTemplate(),
    notion_dry_run: notionDryRun(clients.notion || throwingNoWriteClient("notion")),
    maintenance_queue: maintenanceQueue(),
    run_plans: runPlans(),
    global_consolidation: {
      run_id: "mr-global-consolidation-20260519",
      outputs: {
        language: "zh-CN",
        summary: "知识、规则习惯、模板、项目关系和基础设施候选已生成。",
        raw_records: [
          {
            id: "raw-knowledge-record",
            details: "RAW_KNOWLEDGE_RECORD_SHOULD_NOT_PROJECT",
            messages: ["RAW_KNOWLEDGE_MESSAGE_SHOULD_NOT_PROJECT"],
            blocks: [{ text: "RAW_KNOWLEDGE_BLOCK_SHOULD_NOT_PROJECT" }],
            api_key: "sk-root-dry-run-secret",
          },
        ],
      },
    },
    global_projections: globalProjections(),
    backups_preview: {
      kind: "maintenance_backups_preview",
      items: [
        {
          id: "backup-project-summary",
          target_ref: "hypo-workflow:PROJECT-SUMMARY.md",
          action: "preview",
          dry_run: true,
          remote_writes_enabled: false,
          backup_path: "~/.hypo-workflow/maintenance/backups/hypo-workflow-project-summary.yaml",
        },
      ],
    },
    publication: {
      client: clients.publication || throwingNoWriteClient("publication"),
      candidates: [
        {
          id: "publication:hypo-info:noon-report",
          status: "blocked",
          side_effect: "external_action",
          dry_run: true,
          remote_writes_enabled: false,
          confirmation_required: true,
          evidence_refs: ["maintenance:evidence/dry-runs/publication-noon-report.yaml"],
        },
      ],
    },
    external_actions: {
      client: clients.external || throwingNoWriteClient("external"),
      candidates: [
        {
          id: "external:webhook:maintenance-summary",
          status: "blocked",
          side_effect: "external_action",
          dry_run: true,
          remote_writes_enabled: false,
          confirmation_required: true,
        },
      ],
    },
    scenarios: [
      { id: "unchanged-progress", status: "unchanged", target_ref: "hypo-workflow:.pipeline/PROGRESS.md" },
      { id: "conflict-notion-progress", status: "conflict", target_ref: "notion:block:legacy-progress", slot_id: "progress" },
      { id: "stale-summary", status: "stale", target_ref: "hypo-workflow:PROJECT-SUMMARY.md" },
      { id: "secret-containing-knowledge", status: "secret-containing", target_ref: "global:knowledge/raw-record" },
    ],
    ...overrides,
  };
}

function workspaceAuthority() {
  return {
    schema_version: "1",
    workspace: {
      id: "hypoxanthine-main",
      display_name: "Hypoxanthine Workspace",
      roots: ["/home/heyx"],
      authority: "workspace_yaml",
      updated_at: "2026-05-19T23:30:00+08:00",
    },
    objects: [
      projectObject("hypo-workflow", "/home/heyx/Hypo-Workflow"),
      projectObject("hypo-info", "/home/heyx/Hypo-Info"),
    ],
    relations: [
      { from: "hypo-workflow", to: "notion:project-home:hypo-workflow", type: "sync_target" },
    ],
    sync_targets: [
      {
        id: "notion-project-home",
        backend: "notion",
        display_name: "Project Home",
        root_ref: { page_id: "notion-project-home-root" },
      },
    ],
    policies: [
      { id: "local-artifacts-to-storage-projection", type: "sync", authority: "workspace" },
    ],
    secret_refs: [
      {
        id: "notion-main",
        provider: "notion",
        store_ref: "local_secret:notion-main",
        purpose: "Notion dry-run and gated apply",
        value_policy: "raw_value_never_projected",
        value: "secret_notion_token_must_not_project",
      },
    ],
    metadata: {
      api_key: "raw-workspace-api-key-must-not-project",
    },
  };
}

function projectObject(id, path) {
  return {
    id,
    type: "project",
    status: "current",
    display_name: id === "hypo-workflow" ? "Hypo-Workflow" : "Hypo Info",
    local: {
      path,
      state_authority: ".pipeline/state.yaml",
      artifact_authority: ".pipeline",
    },
    sync_target_refs: ["notion-project-home"],
    policy_refs: ["local-artifacts-to-storage-projection"],
    secret_refs: ["notion-main"],
  };
}

function artifactCatalog() {
  return {
    kind: "artifact_catalog",
    entries: [
      catalogEntry("hypo-workflow", "current_state", ".pipeline/state.yaml", "local_workflow", "current"),
      catalogEntry("hypo-workflow", "progress", ".pipeline/PROGRESS.md", "local_workflow", "current"),
      catalogEntry("hypo-workflow", "project_overview", "PROJECT-SUMMARY.md", "derived", "stale"),
      catalogEntry("hypo-workflow", "knowledge", ".pipeline/knowledge/knowledge.compact.md", "local_workflow", "current"),
      catalogEntry("hypo-info", "project_overview", "README.md", "derived", "current"),
      {
        ...catalogEntry("hypo-workflow", "service_config_ref", "workspace:secret_refs.notion-main", "secret_ref", "unknown"),
        sensitivity: "secret_ref",
        projection: "none",
        metadata: {
          store_ref: "local_secret:notion-main",
          metadata_only: true,
          token: "raw-template-token-must-not-project",
        },
      },
    ],
  };
}

function catalogEntry(objectId, kind, path, authority, freshness) {
  return {
    object_id: objectId,
    artifact_id: `${objectId}:${kind}:${path}`,
    kind,
    path_or_remote_ref: path,
    authority,
    freshness,
    parseability: "current",
    sensitivity: "internal",
    projection: kind === "project_overview" ? "summary" : "summary_only",
    evidence_refs: [`${path}:fixture`],
  };
}

function storageSyncTemplate() {
  return {
    kind: "storage_sync_template",
    model: "backend-neutral-projection",
    object_id: "hypo-workflow",
    project_home: {
      title: "Hypo-Workflow",
      slots: [
        slot("overview", "Overview", "PROJECT-SUMMARY.md"),
        slot("progress", "Progress", ".pipeline/PROGRESS.md"),
        slot("architecture", "Architecture", ".pipeline/architecture.md"),
        slot("knowledge", "Knowledge", ".pipeline/knowledge/knowledge.compact.md"),
        slot("docs", "Docs", "docs/guide.md"),
        slot("prompts_index", "Prompts", ".pipeline/prompts"),
        slot("reports_index", "Reports", ".pipeline/reports"),
        slot("legacy_links", "Legacy links", "workspace:relations"),
        slot("sync_status", "Sync status", "computed:sync-status"),
      ],
    },
    metadata: {
      token: "raw-template-token-must-not-project",
    },
  };
}

function slot(id, title, sourceRef) {
  return {
    id,
    title,
    authority: id === "sync_status" ? "computed" : "local_workflow",
    sources: [{ ref: sourceRef, projection: id }],
    content: `${title} fixture content`,
  };
}

function notionDryRun(client) {
  return {
    mode: "dry-run",
    remote_writes_enabled: false,
    apply_required: false,
    client,
    existing_content: [
      {
        id: "legacy-progress",
        type: "paragraph",
        text: "Old progress says C16-M6 is active and conflicts with current C16-M8.",
      },
      {
        id: "legacy-secret",
        type: "paragraph",
        text: "API_KEY=raw-legacy-block-secret-must-not-project",
      },
    ],
    operations: [
      {
        id: "notion:project-home:hypo-workflow",
        operation: "merge_project_home",
        action: "dry-run",
        target_ref: "notion:project-home:hypo-workflow",
        slot_id: "progress",
        status: "conflict",
        dry_run: true,
        remote_writes_enabled: false,
        side_effect: "remote_write",
        confirmation_required: true,
        evidence_refs: ["maintenance:evidence/dry-runs/notion-project-home.yaml"],
      },
    ],
    conflicts: [
      {
        id: "conflict-notion-progress",
        target_ref: "notion:block:legacy-progress",
        slot_id: "progress",
        reason: "Remote Progress block conflicts with local Workflow state.",
      },
    ],
  };
}

function maintenanceQueue() {
  return {
    kind: "maintenance_queue",
    items: [
      queueItem("mq-summary-refresh", "hypo-workflow:PROJECT-SUMMARY.md", "refresh_project_summary", "local_document_write_with_backup", "stale"),
      queueItem("mq-notion-project-home", "notion:project-home:hypo-workflow", "notion_project_home_dry_run", "remote_write", "conflict"),
      queueItem("mq-publication-noon-report", "publication:hypo-info:noon-report", "publication_dry_run", "external_action", "blocked"),
    ],
  };
}

function queueItem(id, targetRef, operation, sideEffect, status) {
  return {
    id,
    kind: "maintenance_operation",
    object_ref: "hypo-workflow",
    operation,
    target_ref: targetRef,
    scope: { source: "root-management-dry-run" },
    status: "planned",
    review_status: status,
    priority: status === "blocked" ? "high" : "normal",
    side_effect: sideEffect,
    confirmation_required: sideEffect !== "local_document_write_with_backup",
    dependencies: [],
    policy_refs: ["local-artifacts-to-storage-projection"],
    evidence_refs: [`maintenance:evidence/dry-runs/${id}.yaml`],
    created_at: NOW,
    updated_at: NOW,
    metadata: {
      password: "raw-queue-password-must-not-project",
    },
  };
}

function runPlans() {
  return [
    {
      id: "mr-root-management-plan",
      kind: "maintenance_run",
      title: "Root management dry-run plan",
      run_type: "orchestration",
      object_ref: "hypo-workflow",
      status: "planned",
      review_mode: "batch",
      remote_writes_enabled: false,
      planned_items: ["mq-summary-refresh", "mq-notion-project-home", "mq-publication-noon-report"],
      evidence_refs: ["maintenance:evidence/dry-runs/mr-root-management-plan.yaml"],
      created_at: NOW,
      updated_at: NOW,
    },
  ];
}

function globalProjections() {
  return {
    kind: "global_projections",
    entries: [
      {
        id: "global.safe-maintenance-pattern",
        title: "Safe maintenance pattern",
        summary: "Accepted global projection for dry-run planning.",
        authority: "global_authored_record",
        sensitivity: "internal",
        evidence_refs: ["~/.hypo-workflow/knowledge/records/safe-maintenance-pattern.yaml"],
      },
      {
        id: "global.notion-main-secret-ref",
        title: "Notion main secret reference",
        summary: "Notion uses local_secret:notion-main; raw values are not projected.",
        sensitivity: "secret_ref",
        secret_ref: {
          store_ref: "local_secret:notion-main",
          metadata_only: true,
        },
        redaction_policy: {
          mode: "metadata_only",
          raw_projected: false,
        },
        evidence_refs: ["workspace:secret_refs.notion-main"],
      },
    ],
  };
}

function throwingNoWriteClient(name) {
  const writeCalls = [];
  return {
    writeCalls,
    async discover() {
      return { ok: true };
    },
    async read() {
      return { ok: true };
    },
    async appendBlock(...args) {
      writeCalls.push(["appendBlock", ...args]);
      throw new Error(`${name} write method must not be called during dry-run`);
    },
    async updateBlock(...args) {
      writeCalls.push(["updateBlock", ...args]);
      throw new Error(`${name} write method must not be called during dry-run`);
    },
    async createPage(...args) {
      writeCalls.push(["createPage", ...args]);
      throw new Error(`${name} write method must not be called during dry-run`);
    },
    async apply(...args) {
      writeCalls.push(["apply", ...args]);
      throw new Error(`${name} apply method must not be called during dry-run`);
    },
    async publish(...args) {
      writeCalls.push(["publish", ...args]);
      throw new Error(`${name} publish method must not be called during dry-run`);
    },
  };
}

function assertSection(bundle, name) {
  assert.ok(bundle.sections?.[name], `missing bundle.sections.${name}`);
}

function assertCandidate(candidates, id, expected) {
  assert.ok(Array.isArray(candidates), "candidates must be an array");
  const found = candidates.find((candidate) => candidate.id === id || candidate.target_ref === id);
  assert.ok(found, `missing candidate ${id}`);
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(found[key], value, `${id}.${key}`);
  }
}

function assertConflict(conflicts, targetRef, slotId) {
  assert.ok(Array.isArray(conflicts), "conflicts must be an array");
  assert.ok(conflicts.some((conflict) => (
    conflict.target_ref === targetRef &&
    conflict.slot_id === slotId
  )), `missing conflict for ${targetRef}/${slotId}`);
}

function assertConfirmation(requirements, targetRef) {
  assert.ok(Array.isArray(requirements), "confirmation_requirements must be an array");
  assert.ok(requirements.some((requirement) => (
    requirement.target_ref === targetRef &&
    requirement.required === true
  )), `missing confirmation requirement for ${targetRef}`);
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
