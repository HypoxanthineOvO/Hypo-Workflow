import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_GLOBAL_CONFIG,
  appendKnowledgeRecord,
  buildKnowledgeLoadPlan,
  commandByCanonical,
  commandMap,
  normalizeKnowledgeRecord,
  normalizeKnowledgeSourceRef,
  parseYaml,
  rebuildKnowledgeIndexes,
  rebuildKnowledgeLedger,
  redactKnowledgeSecrets,
  renderKnowledgeCompact,
  validateKnowledgeRecord,
} from "../src/index.js";

test("knowledge ledger fixture satisfies the session record contract", async () => {
  const raw = await readFile("core/test/fixtures/knowledge/M01-milestone-record.yaml", "utf8");
  const record = parseYaml(raw);
  const result = validateKnowledgeRecord(record);

  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(record.type, "milestone");
  assert.equal(record.source.cycle, "C4");
  assert.equal(record.source.milestone, "M01");
  assert.deepEqual(record.categories, ["dependencies", "decisions", "secret-refs"]);
  assert.equal(record.secret_refs[0].env, "OPENAI_API_KEY");
  assert.equal(Object.hasOwn(record.secret_refs[0], "raw_value"), false);
});

test("knowledge redaction removes common secret field names recursively", () => {
  const redacted = redactKnowledgeSecrets({
    provider: "openai",
    api_key: "sk-live-value",
    token: "token-value",
    headers: {
      Authorization: "Bearer raw-token",
      "x-api-token": "nested-token",
    },
    nested: [
      { password: "plain-password" },
      { client_secret: "plain-client-secret" },
    ],
    secret_refs: [
      {
        provider: "openai",
        env: "OPENAI_API_KEY",
        redacted_value: "sk-...abcd",
      },
    ],
  });

  assert.equal(redacted.provider, "openai");
  assert.equal(redacted.api_key, "[REDACTED]");
  assert.equal(redacted.token, "[REDACTED]");
  assert.equal(redacted.headers.Authorization, "[REDACTED]");
  assert.equal(redacted.headers["x-api-token"], "[REDACTED]");
  assert.equal(redacted.nested[0].password, "[REDACTED]");
  assert.equal(redacted.nested[1].client_secret, "[REDACTED]");
  assert.equal(redacted.secret_refs[0].provider, "openai");
  assert.equal(redacted.secret_refs[0].env, "OPENAI_API_KEY");
  assert.equal(redacted.secret_refs[0].redacted_value, "sk-...abcd");
});

test("knowledge config defaults load compact plus category indexes only at SessionStart", () => {
  assert.equal(DEFAULT_GLOBAL_CONFIG.knowledge.enabled, true);
  assert.equal(DEFAULT_GLOBAL_CONFIG.knowledge.loading.session_start, true);
  assert.equal(DEFAULT_GLOBAL_CONFIG.knowledge.loading.records, false);
  assert.deepEqual(DEFAULT_GLOBAL_CONFIG.knowledge.loading.indexes, [
    "dependencies",
    "references",
    "pitfalls",
    "decisions",
    "config-notes",
    "secret-refs",
  ]);

  const plan = buildKnowledgeLoadPlan(DEFAULT_GLOBAL_CONFIG.knowledge);
  assert.equal(plan.compact, ".pipeline/knowledge/knowledge.compact.md");
  assert.deepEqual(plan.indexes, [
    ".pipeline/knowledge/index/dependencies.yaml",
    ".pipeline/knowledge/index/references.yaml",
    ".pipeline/knowledge/index/pitfalls.yaml",
    ".pipeline/knowledge/index/decisions.yaml",
    ".pipeline/knowledge/index/config-notes.yaml",
    ".pipeline/knowledge/index/secret-refs.yaml",
  ]);
  assert.deepEqual(plan.records, []);
});

test("knowledge specs and skill document command semantics and state boundary", async () => {
  const knowledgeSpec = await readFile("references/knowledge-spec.md", "utf8");
  const commandsSpec = await readFile("references/commands-spec.md", "utf8");
  const configSpec = await readFile("references/config-spec.md", "utf8");
  const rootSkill = await readFile("SKILL.md", "utf8");
  const knowledgeSkill = await readFile("skills/knowledge/SKILL.md", "utf8");

  for (const heading of [
    "# Knowledge Ledger Spec",
    "## Directory Layout",
    "## Session Records",
    "## Category Indexes",
    "## Compact Summary",
    "## Secret References",
    "## Loading Policy",
    "## Cycle Archive Summary",
  ]) {
    assert.match(knowledgeSpec, new RegExp(`^${escapeRegExp(heading)}$`, "m"));
  }

  for (const phrase of [
    ".pipeline/knowledge/records/*.yaml",
    ".pipeline/knowledge/index/dependencies.yaml",
    ".pipeline/knowledge/index/secret-refs.yaml",
    ".pipeline/knowledge/knowledge.compact.md",
    "~/.hypo-workflow/secrets.yaml",
    "state.yaml must not store full knowledge records",
    "SessionStart loads the compact summary and category indexes only",
  ]) {
    assert.match(knowledgeSpec, new RegExp(escapeRegExp(phrase), "i"));
  }

  for (const subcommand of ["list", "view", "compact", "index", "search"]) {
    assert.match(commandsSpec, new RegExp(`\\b${subcommand}\\b`, "i"));
    assert.match(knowledgeSkill, new RegExp(`\\b${subcommand}\\b`, "i"));
  }
  assert.match(commandsSpec, /\/hw:knowledge/);
  assert.match(configSpec, /knowledge\.loading\.session_start/);
  assert.match(configSpec, /knowledge\.redaction\.secret_keys/);
  assert.match(rootSkill, /\/hw:knowledge/);
});

test("knowledge command is exposed through the canonical OpenCode command map", () => {
  const commands = commandMap("opencode");
  const knowledge = commandByCanonical("/hw:knowledge");

  assert.equal(commands.length, 40);
  assert.equal(knowledge.opencode, "/hw-knowledge");
  assert.equal(knowledge.agent, "hw-compact");
  assert.equal(knowledge.route, "tool");
  assert.equal(knowledge.skill, "skills/knowledge/SKILL.md");
});

test("knowledge record normalization is deterministic and contract-safe", () => {
  const input = {
    type: "milestone",
    source: {
      cycle: "4",
      feature: "f001",
      milestone: "2",
      prompt_file: ".pipeline/prompts/01-knowledge-helpers-compact-index.md",
    },
    created_at: "2026-05-02T20:12:46+08:00",
    summary: "Knowledge helpers and compact index",
    details: {
      dependencies: [{ name: "node:crypto", reason: "stable record ids" }],
      decisions: ["Generate category indexes from raw records deterministically"],
      api_key: "sk-raw-value",
    },
    tags: [" Knowledge ", "helpers", "Knowledge"],
    categories: ["Dependencies", "secret_refs", "decisions", "dependencies"],
    refs: { files: ["core/src/knowledge/index.js"] },
    secret_refs: [{ provider: "openai", env: "OPENAI_API_KEY", purpose: "image smoke", redacted_value: "sk-...abcd" }],
  };

  const first = normalizeKnowledgeRecord(input);
  const second = normalizeKnowledgeRecord(input);

  assert.equal(first.id, second.id);
  assert.match(first.id, /^C4-M02-knowledge-helpers-and-compact-index-[a-f0-9]{8}$/);
  assert.deepEqual(first.source, {
    cycle: "C4",
    feature: "F001",
    milestone: "M02",
    prompt_file: ".pipeline/prompts/01-knowledge-helpers-compact-index.md",
  });
  assert.deepEqual(first.tags, ["knowledge", "helpers"]);
  assert.deepEqual(first.categories, ["dependencies", "decisions", "secret-refs"]);
  assert.equal(first.details.api_key, "[REDACTED]");
  assert.equal(validateKnowledgeRecord(first).ok, true);

  assert.deepEqual(normalizeKnowledgeSourceRef("C4/M02"), {
    kind: "milestone",
    ref: "C4/M02",
    cycle: "C4",
    milestone: "M02",
  });
  assert.deepEqual(normalizeKnowledgeSourceRef("P006"), { kind: "patch", ref: "P006", patch: "P006" });
  assert.deepEqual(normalizeKnowledgeSourceRef("E001"), { kind: "explore", ref: "E001", explore_id: "E001" });
});

test("knowledge helpers append records, rebuild deterministic indexes, and render compact context", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-knowledge-"));
  try {
    const first = await appendKnowledgeRecord(root, {
      type: "milestone",
      source: {
        cycle: "C4",
        feature: "F001",
        milestone: "M02",
        prompt_file: ".pipeline/prompts/01-knowledge-helpers-compact-index.md",
      },
      created_at: "2026-05-02T20:12:46+08:00",
      summary: "Knowledge helpers and compact index",
      details: {
        dependencies: [{ name: "node:fs/promises", reason: "record and index writes" }],
        decisions: [{ title: "Compact loads only generated knowledge surfaces" }],
        references: [{ title: "Knowledge Ledger Spec", path: "references/knowledge-spec.md" }],
      },
      tags: ["knowledge", "helpers"],
      categories: ["dependencies", "references", "decisions"],
      refs: { files: ["core/src/knowledge/index.js"] },
    });

    const second = await appendKnowledgeRecord(root, {
      type: "patch",
      source: { patch: "P006" },
      created_at: "2026-05-02T20:20:00+08:00",
      summary: "Avoid raw secret storage in knowledge records",
      details: {
        pitfalls: [{ issue: "Raw token persisted", prevention: "Use secret_refs with redacted_value only" }],
        "config-notes": [{ key: "knowledge.loading.records", value: false }],
      },
      tags: ["security", "knowledge"],
      categories: ["pitfalls", "config-notes", "secret-refs"],
      refs: { files: ["references/knowledge-spec.md"] },
      secret_refs: [{ provider: "openai", env: "OPENAI_API_KEY", purpose: "smoke", redacted_value: "sk-...abcd" }],
    });

    assert.match(first.path, /\.pipeline\/knowledge\/records\/C4-M02-knowledge-helpers-and-compact-index-[a-f0-9]{8}\.yaml$/);
    assert.match(second.path, /\.pipeline\/knowledge\/records\/P006-avoid-raw-secret-storage-in-knowledge-records-[a-f0-9]{8}\.yaml$/);

    const indexes = await rebuildKnowledgeIndexes(root);
    assert.deepEqual(Object.keys(indexes.files).sort(), [
      "config-notes",
      "decisions",
      "dependencies",
      "pitfalls",
      "references",
      "secret-refs",
    ]);

    const dependencyIndex = parseYaml(await readFile(join(root, ".pipeline/knowledge/index/dependencies.yaml"), "utf8"));
    assert.equal(dependencyIndex.category, "dependencies");
    assert.equal(dependencyIndex.entries.length, 1);
    assert.equal(dependencyIndex.entries[0].record_id, first.record.id);
    assert.equal(dependencyIndex.entries[0].source, "C4/M02");
    assert.equal(dependencyIndex.entries[0].items[0].name, "node:fs/promises");

    const secretIndex = parseYaml(await readFile(join(root, ".pipeline/knowledge/index/secret-refs.yaml"), "utf8"));
    assert.equal(secretIndex.entries.length, 1);
    assert.equal(secretIndex.entries[0].items[0].env, "OPENAI_API_KEY");
    assert.equal(Object.hasOwn(secretIndex.entries[0].items[0], "raw_value"), false);

    const compact = await renderKnowledgeCompact(root, { max_records_per_category: 2 });
    assert.match(compact.content, /# Knowledge Compact/);
    assert.match(compact.content, /## Decisions/);
    assert.match(compact.content, /Knowledge helpers and compact index/);
    assert.match(compact.content, /Avoid raw secret storage/);
    assert.ok(compact.content.split("\n").length <= 80);

    const rebuilt = await rebuildKnowledgeLedger(root, { max_records_per_category: 2 });
    assert.equal(rebuilt.records.length, 2);
    assert.match(await readFile(join(root, ".pipeline/knowledge/knowledge.compact.md"), "utf8"), /## Secret Refs/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("knowledge ledger keeps raw records out of state.yaml", async () => {
  const state = await readWorkflowStateForKnowledgeBoundary();

  assert.doesNotMatch(state, /\.pipeline\/knowledge\/records\/.*\.yaml/);
  assert.doesNotMatch(state, /secret_refs:/);
  assert.doesNotMatch(state, /Knowledge helpers and compact index[\s\S]*details:/);
});

async function readWorkflowStateForKnowledgeBoundary() {
  try {
    return await readFile(".pipeline/state.yaml", "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return readFile(".pipeline/archives/C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode/state.yaml", "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
