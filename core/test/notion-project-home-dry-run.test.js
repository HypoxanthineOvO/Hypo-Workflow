import test from "node:test";
import assert from "node:assert/strict";
import * as api from "../src/index.js";

const ALLOWED_DRY_RUN_PHASES = Object.freeze([
  "discover",
  "classify",
  "bind",
  "merge-plan",
  "dry-run",
]);

test("Notion Project Home dry-run emits evidence only and never calls write-capable client methods", async () => {
  const planNotionProjectHomeDryRun = requireApi("planNotionProjectHomeDryRun");
  const client = assertReadOnlyNotionClient();

  const result = await planNotionProjectHomeDryRun({
    template: storageTemplate(),
    notion: {
      target_ref: { page_id: "project-home-page" },
      capabilities: {
        read: true,
        write: false,
        create: false,
        update: false,
        delete: false,
      },
      client,
    },
    existingContent: legacyNotionContent(),
  }, { now: "2026-05-19T17:20:00+08:00", dryRun: true });

  assert.equal(result.mode, "dry-run");
  assert.equal(result.remote_writes_enabled, false);
  assert.deepEqual(result.capabilities, {
    read: true,
    write: false,
    create: false,
    update: false,
    delete: false,
  });
  assert.ok(Array.isArray(result.evidence));
  assert.ok(result.evidence.length >= ALLOWED_DRY_RUN_PHASES.length);
  assert.deepEqual([...new Set(result.evidence.map((item) => item.phase))], ALLOWED_DRY_RUN_PHASES);
  assert.ok(result.operations.every((operation) => operation.action === "dry-run"));
  assert.equal(client.writeCalls.length, 0);
});

test("legacy Notion content is classified as merge input before merge-plan operations are produced", async () => {
  const planNotionProjectHomeDryRun = requireApi("planNotionProjectHomeDryRun");

  const result = await planNotionProjectHomeDryRun({
    template: storageTemplate(),
    notion: {
      target_ref: { page_id: "project-home-page" },
      capabilities: { read: true, write: false },
      client: assertReadOnlyNotionClient(),
    },
    existingContent: legacyNotionContent(),
  }, { now: "2026-05-19T17:20:00+08:00", dryRun: true });

  const classifyEvidence = result.evidence.filter((item) => item.phase === "classify");
  assert.ok(classifyEvidence.length > 0, "expected classify evidence for legacy Notion content");
  assert.ok(classifyEvidence.some((item) => (
    item.source_ref === "notion:block:legacy-status" &&
    item.classification === "merge_input" &&
    item.slot_id === "progress"
  )));
  assert.ok(classifyEvidence.some((item) => (
    item.source_ref === "notion:block:legacy-architecture" &&
    item.classification === "merge_input" &&
    item.slot_id === "architecture"
  )));

  const firstMergePlanIndex = result.evidence.findIndex((item) => item.phase === "merge-plan");
  const lastClassifyIndex = result.evidence.reduce(
    (last, item, index) => item.phase === "classify" ? index : last,
    -1,
  );
  assert.ok(firstMergePlanIndex > lastClassifyIndex);

  assert.ok(
    result.operations.every((operation) => operation.legacy_policy !== "append_only"),
    "legacy blocks must not be blindly appended without classification",
  );
});

test("dry-run operation hashes are deterministic when input order changes", async () => {
  const planNotionProjectHomeDryRun = requireApi("planNotionProjectHomeDryRun");
  const options = { now: "2026-05-19T17:20:00+08:00", dryRun: true };

  const first = await planNotionProjectHomeDryRun({
    template: storageTemplate(),
    notion: {
      target_ref: { page_id: "project-home-page" },
      capabilities: { read: true, write: false },
      client: assertReadOnlyNotionClient(),
    },
    existingContent: legacyNotionContent(),
  }, options);

  const second = await planNotionProjectHomeDryRun({
    template: storageTemplate({ reverseSlots: true }),
    notion: {
      target_ref: { page_id: "project-home-page" },
      capabilities: { read: true, write: false },
      client: assertReadOnlyNotionClient({ reverseBlocks: true }),
    },
    existingContent: reversed(legacyNotionContent()),
  }, options);

  assert.deepEqual(operationHashList(first), operationHashList(second));
  assert.ok(operationHashList(first).length > 0);
  for (const operation of first.operations) {
    assert.match(operation.operation_hash, /^[a-f0-9]{64}$/);
  }
});

test("Notion dry-run output redacts secret-looking metadata from evidence and operations", async () => {
  const planNotionProjectHomeDryRun = requireApi("planNotionProjectHomeDryRun");

  const result = await planNotionProjectHomeDryRun({
    template: storageTemplate({
      secretMetadata: {
        token: "raw-template-token-must-not-project",
        api_key: "raw-template-api-key-must-not-project",
      },
    }),
    notion: {
      target_ref: { page_id: "project-home-page" },
      capabilities: { read: true, write: false },
      client: assertReadOnlyNotionClient({
        metadata: {
          authorization: "Bearer raw-notion-client-token",
          notion_token: "raw-notion-metadata-token",
        },
      }),
    },
    existingContent: [
      ...legacyNotionContent(),
      {
        id: "legacy-secret",
        type: "paragraph",
        text: "API_KEY=raw-legacy-block-secret must not leak",
        metadata: {
          password: "raw-legacy-password-must-not-project",
        },
      },
    ],
  }, { now: "2026-05-19T17:20:00+08:00", dryRun: true });

  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /raw-template-(token|api-key)-must-not-project/);
  assert.doesNotMatch(serialized, /raw-notion-(client|metadata)-token/);
  assert.doesNotMatch(serialized, /raw-legacy-(block-secret|password)-must-not-project/);
  assert.doesNotMatch(serialized, /API_KEY=raw-legacy-block-secret/);
});

function requireApi(name) {
  assert.equal(typeof api[name], "function", `expected ${name} to be exported from ../src/index.js`);
  return api[name];
}

function operationHashList(result) {
  return result.operations.map((operation) => operation.operation_hash).sort();
}

function assertReadOnlyNotionClient(options = {}) {
  const blocks = options.reverseBlocks ? reversed(legacyNotionContent()) : legacyNotionContent();
  const writeCalls = [];
  return {
    writeCalls,
    metadata: options.metadata || {},
    async discoverProjectHome(ref) {
      return {
        page_id: ref.page_id,
        title: "Hypo-Workflow",
        blocks,
      };
    },
    async appendBlock(...args) {
      writeCalls.push(["appendBlock", ...args]);
      throw new Error("write method must not be called during dry-run");
    },
    async updateBlock(...args) {
      writeCalls.push(["updateBlock", ...args]);
      throw new Error("write method must not be called during dry-run");
    },
    async createPage(...args) {
      writeCalls.push(["createPage", ...args]);
      throw new Error("write method must not be called during dry-run");
    },
    async deleteBlock(...args) {
      writeCalls.push(["deleteBlock", ...args]);
      throw new Error("write method must not be called during dry-run");
    },
  };
}

function storageTemplate(options = {}) {
  const slots = [
    slot("overview", "Overview", "PROJECT-SUMMARY.md"),
    slot("progress", "Progress", ".pipeline/PROGRESS.md"),
    slot("architecture", "Architecture", ".pipeline/architecture.md"),
    slot("knowledge", "Knowledge", ".pipeline/knowledge/knowledge.compact.md"),
    slot("docs", "Docs", "docs/guide.md"),
    slot("prompts_index", "Prompts index", ".pipeline/prompts"),
    slot("reports_index", "Reports index", ".pipeline/reports"),
    slot("legacy_links", "Legacy links", "workspace:relations"),
    slot("sync_status", "Sync status", "computed:sync-status"),
  ];
  return {
    kind: "storage_sync_template",
    model: "backend-neutral-projection",
    object_id: "hypo-workflow",
    project_home: {
      title: "Hypo-Workflow",
      slots: options.reverseSlots ? reversed(slots) : slots,
    },
    metadata: options.secretMetadata || {},
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

function reversed(items) {
  return [...items].reverse();
}

function legacyNotionContent() {
  return [
    {
      id: "legacy-status",
      type: "paragraph",
      text: "Current status: C16-M3 is active and should reconcile with Progress.",
    },
    {
      id: "legacy-architecture",
      type: "heading_2",
      text: "Architecture notes from the old Project Home.",
    },
    {
      id: "legacy-random-note",
      type: "paragraph",
      text: "Older hand-written note that should be retained as Legacy links.",
    },
  ];
}
