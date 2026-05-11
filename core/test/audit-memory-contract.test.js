import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseYaml } from "../src/index.js";

const CYCLE_MEMORY_AUTHORITY = ".pipeline/audit-memory/C11-audit-memory.yaml";
const MILESTONE_DELTA_AUTHORITY = ".pipeline/audit-memory/M02-audit-delta.yaml";
const CYCLE_MEMORY_FIXTURE = "core/test/fixtures/audit-memory/C11-cycle-audit-memory.yaml";
const MILESTONE_DELTA_FIXTURE = "core/test/fixtures/audit-memory/C11-M02-audit-delta.yaml";
const SCOPED_HANDOFF_FIXTURE = "core/test/fixtures/audit-memory/C11-M02-scoped-handoff.yaml";

test("cycle-level audit memory fixture persists user requirements, project rules, and cycle decisions", async () => {
  const memory = await loadYaml(CYCLE_MEMORY_FIXTURE);
  const auditMemory = memory.audit_memory;

  assert.equal(auditMemory.schema_version, 1);
  assert.equal(auditMemory.cycle_id, "C11");
  assert.ok(auditMemory.source_authority.includes("user_special_requirements"));
  assert.ok(auditMemory.source_authority.includes("project_rules_summary"));
  assert.ok(auditMemory.source_authority.includes("cycle_decisions"));
  assert.equal(auditMemory.user_special_requirements.length, 2);
  assert.equal(auditMemory.project_rules_summary.length, 2);
  assert.equal(auditMemory.cycle_decisions.length, 2);
  assert.match(auditMemory.user_special_requirements[0].summary, /survive .*handoff/i);
  assert.equal(auditMemory.raw_conversation.authority, false);
});

test("real audit memory authority files exist and persist current C11 M02 requirements", async () => {
  const cycleMemory = (await loadAuthorityYaml(CYCLE_MEMORY_AUTHORITY)).audit_memory;
  const milestoneDelta = (await loadAuthorityYaml(MILESTONE_DELTA_AUTHORITY)).audit_delta;

  assert.notEqual(CYCLE_MEMORY_AUTHORITY, CYCLE_MEMORY_FIXTURE);
  assert.notEqual(MILESTONE_DELTA_AUTHORITY, MILESTONE_DELTA_FIXTURE);

  assert.equal(cycleMemory.schema_version, 1);
  assert.equal(cycleMemory.cycle_id, "C11");
  assert.ok(cycleMemory.source_authority.includes("user_special_requirements"));
  assert.ok(cycleMemory.source_authority.includes("project_rules_summary"));
  assert.ok(cycleMemory.source_authority.includes("cycle_decisions"));
  assert.ok(cycleMemory.user_special_requirements.some((item) => /plan\/start\/resume handoff/i.test(textOf(item))));
  assert.ok(cycleMemory.user_special_requirements.some((item) => /missing user requirement carry-over/i.test(textOf(item))));
  assert.ok(cycleMemory.project_rules_summary.some((item) => /Chinese|中文/i.test(textOf(item))));
  assert.ok(cycleMemory.project_rules_summary.some((item) => /Test, implement, and audit roles/i.test(textOf(item))));
  assert.ok(cycleMemory.cycle_decisions.some((item) => /audit memory is durable cycle authority/i.test(textOf(item))));
  assertRawConversationNotAuthority(cycleMemory);

  assert.equal(milestoneDelta.schema_version, 1);
  assert.equal(milestoneDelta.cycle_id, "C11");
  assert.equal(milestoneDelta.milestone_id, "M02");
  assert.equal(milestoneDelta.cycle_memory_ref, CYCLE_MEMORY_AUTHORITY);
  assert.ok(milestoneDelta.local_special_requirements.some((item) => /test assets and fixtures/i.test(textOf(item))));
  assert.ok(milestoneDelta.local_special_requirements.some((item) => /plan\/start\/resume|plan, start, and resume/i.test(textOf(item))));
  assert.equal(milestoneDelta.authority.inherits_cycle_memory, true);
  assert.equal(milestoneDelta.authority.raw_freeform_is_authority, false);
  assert.ok(milestoneDelta.scoped_visibility.test.exclude.includes("raw_conversation"));
});

test("milestone audit delta fixture persists local special requirements without replacing cycle memory", async () => {
  const delta = (await loadYaml(MILESTONE_DELTA_FIXTURE)).audit_delta;

  assert.equal(delta.schema_version, 1);
  assert.equal(delta.cycle_id, "C11");
  assert.equal(delta.milestone_id, "M02");
  assert.equal(delta.cycle_memory_ref, ".pipeline/audit-memory/C11-audit-memory.yaml");
  assert.equal(delta.local_special_requirements.length, 2);
  assert.match(delta.local_special_requirements[0].summary, /test assets and fixtures/i);
  assert.equal(delta.authority.inherits_cycle_memory, true);
  assert.equal(delta.authority.raw_freeform_is_authority, false);
  assert.ok(delta.scoped_visibility.test.include.includes("local_special_requirements"));
  assert.ok(delta.scoped_visibility.test.exclude.includes("raw_conversation"));
});

test("plan, start, and resume scoped handoff summaries keep user requirements and hide raw conversation", async () => {
  const handoff = (await loadYaml(SCOPED_HANDOFF_FIXTURE)).scoped_handoff;

  for (const command of ["plan", "start", "resume"]) {
    const scoped = handoff[command].summary;
    assert.equal(handoff[command].command, `/hw:${command}`);
    assert.ok(scoped.user_special_requirements.some((item) => /handoff/i.test(item)));
    assert.ok(scoped.project_rules_summary.some((item) => /Chinese|中文/i.test(item)));
    assert.ok(scoped.cycle_decisions.some((item) => /audit memory/i.test(item)));
    assert.ok(scoped.local_special_requirements.some((item) => /M02/i.test(item)));
    assert.deepEqual(scoped.source_refs, [
      ".pipeline/audit-memory/C11-audit-memory.yaml",
      ".pipeline/audit-memory/M02-audit-delta.yaml",
    ]);
    assertNoRawConversationFields(scoped);
  }
});

test("repository contract names durable audit memory as authority instead of raw free-form conversation", async () => {
  const combined = await readContractSources([
    "references/audit-spec.md",
    "references/state-contract.md",
    "references/commands-spec.md",
    "SKILL.md",
  ]);

  assertRegex(combined, /\baudit[_ -]memory\b/i, "contract must name durable audit memory");
  assertRegex(combined, /\bcycle-level\b[\s\S]{0,240}\buser requirements\b/i, "contract must define cycle-level user requirements");
  assertRegex(combined, /\bmilestone-level\b[\s\S]{0,240}\baudit delta\b/i, "contract must define milestone-level audit delta");
  assertRegex(combined, /\/hw:plan[\s\S]{0,240}scoped audit summar/i, "contract must feed /hw:plan from scoped audit summaries");
  assertRegex(combined, /\/hw:start[\s\S]{0,240}scoped audit summar/i, "contract must feed /hw:start from scoped audit summaries");
  assertRegex(combined, /\/hw:resume[\s\S]{0,240}scoped audit summar/i, "contract must feed /hw:resume from scoped audit summaries");
  assertRegex(
    combined,
    /raw[\s\S]{0,120}free-form[\s\S]{0,160}not[\s\S]{0,120}(authority|source of truth)/i,
    "contract must reject raw free-form conversation as source of truth",
  );
});

test("audit memory runtime surface validates, merges, and renders scoped handoff summaries", async () => {
  const core = await import("../src/index.js");
  const requiredExports = [
    "validateAuditMemory",
    "mergeAuditMemoryForMilestone",
    "buildScopedAuditSummary",
    "auditMemoryPath",
    "auditDeltaPath",
  ];
  const missing = requiredExports.filter((name) => typeof core[name] !== "function");
  assert.deepEqual(missing, []);

  const cycleMemory = (await loadYaml(CYCLE_MEMORY_FIXTURE)).audit_memory;
  const milestoneDelta = (await loadYaml(MILESTONE_DELTA_FIXTURE)).audit_delta;
  assert.equal(core.auditMemoryPath("C11"), ".pipeline/audit-memory/C11-audit-memory.yaml");
  assert.equal(core.auditDeltaPath("M02"), ".pipeline/audit-memory/M02-audit-delta.yaml");

  const validation = core.validateAuditMemory(cycleMemory);
  assert.equal(validation.ok, true, validation.errors?.join("\n"));

  const merged = core.mergeAuditMemoryForMilestone(cycleMemory, milestoneDelta);
  assert.equal(merged.cycle_id, "C11");
  assert.equal(merged.milestone_id, "M02");
  assert.equal(merged.user_special_requirements.length, 2);
  assert.equal(merged.local_special_requirements.length, 2);
  assert.equal(merged.raw_conversation?.authority, false);

  for (const command of ["/hw:plan", "/hw:start", "/hw:resume"]) {
    const summary = core.buildScopedAuditSummary(merged, { command, role: "implement" });
    assert.ok(summary.user_special_requirements.some((item) => /handoff/i.test(textOf(item))));
    assert.ok(summary.local_special_requirements.some((item) => /M02/i.test(textOf(item))));
    assertNoRawConversationFields(summary);
  }
});

test("raw free-form conversation cannot be the only authority for audit memory", async () => {
  const cycleMemory = (await loadAuthorityYaml(CYCLE_MEMORY_AUTHORITY)).audit_memory;
  const milestoneDelta = (await loadAuthorityYaml(MILESTONE_DELTA_AUTHORITY)).audit_delta;

  for (const authorityField of ["user_special_requirements", "project_rules_summary", "cycle_decisions"]) {
    assert.ok(
      cycleMemory.source_authority.includes(authorityField),
      `cycle source_authority must include ${authorityField}`,
    );
    assert.ok(Array.isArray(cycleMemory[authorityField]) && cycleMemory[authorityField].length > 0);
  }

  assertRawConversationNotAuthority(cycleMemory);
  assert.equal(milestoneDelta.authority.raw_freeform_is_authority, false);
  assert.ok(Array.isArray(milestoneDelta.local_special_requirements) && milestoneDelta.local_special_requirements.length > 0);
});

async function loadYaml(path) {
  return parseYaml(await readFile(path, "utf8"));
}

async function loadAuthorityYaml(path) {
  try {
    return await loadYaml(path);
  } catch (error) {
    if (error?.code === "ENOENT") {
      assert.fail(`real audit memory authority file must exist: ${path}`);
    }
    throw error;
  }
}

async function readContractSources(files) {
  const chunks = await Promise.all(files.map((file) => readFile(file, "utf8")));
  return chunks.join("\n");
}

function textOf(value) {
  if (typeof value === "string") return value;
  return value?.summary || value?.text || JSON.stringify(value);
}

function assertRegex(value, pattern, message) {
  assert.ok(pattern.test(value), message);
}

function assertNoRawConversationFields(value) {
  assert.equal(Object.hasOwn(value, "raw_conversation"), false);
  assert.equal(Object.hasOwn(value, "free_form_conversation"), false);
  assert.equal(Object.hasOwn(value, "raw_freeform_conversation"), false);
}

function assertRawConversationNotAuthority(memory) {
  assert.equal(memory.raw_conversation?.authority, false);
  assert.match(memory.raw_conversation?.note || "", /not .*only authority|not .*source of truth/i);
}
