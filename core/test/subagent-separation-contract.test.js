import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { selectExecutionTopology } from "../src/index.js";

test("Subagent spec defines authorization, hidden tests, and degraded mode", async () => {
  const spec = await readFile("references/subagent-spec.md", "utf8");

  assert.match(spec, /P0 Configure.*Subagent authorization/is);
  assert.match(spec, /implementation Subagent.*must not read test source/is);
  assert.match(spec, /fixtures.*snapshot.*assertion/i);
  assert.match(spec, /pass\/fail.*sanitized failure summary/i);
  assert.match(spec, /test\/review\/audit Subagent.*final diff/is);
  assert.match(spec, /degraded mode.*explicit user confirmation/is);
  assert.match(spec, /report.*role.*degraded.*reason/is);
});

test("Subagent prompt assembly defines two-layer injection contract", async () => {
  const spec = await readFile("references/subagent-spec.md", "utf8");

  assert.match(spec, /two-layer injection contract/i);
  assert.match(spec, /Layer 1 host\/orchestrator envelope fields are mandatory/is);
  assert.match(spec, /Layer 2 task injection fields are mandatory/is);

  for (const field of [
    "compact_rules_summary",
    "authorization_state",
    "role_boundary",
    "out_of_scope_stop_rule",
    "user_requested_checks",
    "milestone_audit_fields",
    "evidence_required",
    "expected_output_artifact",
  ]) {
    assert.match(spec, new RegExp(`\\\`${field}\\\``), `spec missing ${field}`);
  }

  assert.match(spec, /task-specific text weaken the host\/orchestrator envelope/i);
  assert.match(spec, /stop instead of editing, reading, spawning, validating, or deciding outside the declared role\/scope/i);
});

test("Subagent templates carry host envelope and task injection fields", async () => {
  const files = [
    "templates/subagent/full-delegation.md",
    "templates/subagent/review-code.md",
    "templates/subagent/review-tests.md",
  ];
  const requiredFields = [
    "compact_rules_summary",
    "authorization_state",
    "role_boundary",
    "out_of_scope_stop_rule",
    "user_requested_checks",
    "milestone_audit_fields",
    "evidence_required",
    "expected_output_artifact",
  ];

  for (const file of files) {
    const template = await readFile(file, "utf8");
    assert.match(template, /Layer 1: Host\/Orchestrator Envelope/, `${file}: missing Layer 1 heading`);
    assert.match(template, /Layer 2: Task Injection/, `${file}: missing Layer 2 heading`);
    for (const field of requiredFields) {
      assert.match(template, new RegExp(`\\b${field}:`), `${file}: missing ${field}`);
    }
    assert.match(template, /out_of_scope_stop_rule/i, `${file}: missing stop rule`);
    assert.match(template, /evidence/i, `${file}: missing evidence output`);
    assert.match(template, /artifact/i, `${file}: missing artifact output`);
  }
});

test("execution skills carry the same Subagent separation contract", async () => {
  const files = [
    "SKILL.md",
    "skills/start/SKILL.md",
    "skills/resume/SKILL.md",
    "skills/patch/SKILL.md",
    "skills/plan/SKILL.md",
  ];
  const combined = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");

  const strict = selectExecutionTopology({
    task_kind: "engineering",
    change_size: "material",
    reversible: true,
    policy: { profile: "auto", allow_solo_verified: false },
  });
  assert.equal(strict.profile, "strict");
  assert.deepEqual(strict.required_roles, ["test", "implement", "audit"]);
  assert.match(combined, /implement.*test source.*fixtures.*snapshot.*assertion|implementation Subagent 不应读取测试源码、fixtures、snapshots 或 assertion 细节|implement.*不得.*测试.*fixture.*snapshot.*assertion/is);
  assert.match(combined, /degraded mode.*user confirmation|降级模式.*用户明确确认/is);
  assert.match(combined, /non-delegation rationale|非委托理由/i);
});
