import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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

test("execution skills carry the same Subagent separation contract", async () => {
  const files = [
    "SKILL.md",
    "skills/start/SKILL.md",
    "skills/resume/SKILL.md",
    "skills/patch/SKILL.md",
    "skills/plan/SKILL.md",
  ];
  const combined = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");

  assert.match(combined, /P0 Configure.*Subagent authorization/is);
  assert.match(combined, /implement.*test source.*fixtures.*snapshot.*assertion/is);
  assert.match(combined, /degraded mode.*user confirmation/is);
  assert.match(combined, /non-delegation rationale/i);
});
