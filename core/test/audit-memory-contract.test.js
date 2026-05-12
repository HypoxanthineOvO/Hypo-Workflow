import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseYaml } from "../src/index.js";

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
  const cycleMemory = (await loadYaml(CYCLE_MEMORY_FIXTURE)).audit_memory;
  const milestoneDelta = (await loadYaml(MILESTONE_DELTA_FIXTURE)).audit_delta;

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

function textOf(value) {
  if (typeof value === "string") return value;
  return value?.summary || value?.text || JSON.stringify(value);
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
