import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assessRunnableVerticalSlice, renderBatchPlanArtifacts } from "../src/index.js";

test("plan docs keep single-feature plan behavior and add --batch semantics", async () => {
  const planSkill = await readFile("skills/plan/SKILL.md", "utf8");
  const discoverSkill = await readFile("skills/plan-discover/SKILL.md", "utf8");
  const decomposeSkill = await readFile("skills/plan-decompose/SKILL.md", "utf8");
  const planReference = await readFile("plan/PLAN-SKILL.md", "utf8");
  const commandsSpec = await readFile("references/commands-spec.md", "utf8");

  assert.match(planSkill, /Use this skill for the full P1-P4 planning flow\./);
  assert.match(planSkill, /without `--batch`, preserve the existing single-feature P1-P4 flow/i);
  assert.match(planSkill, /\/hw:plan --batch/);
  assert.match(planSkill, /Feature Queue/);
  assert.match(planSkill, /batch\.decompose_mode/);
  assert.match(discoverSkill, /Batch Discover/i);
  assert.match(discoverSkill, /multiple Feature candidates/i);
  assert.match(decomposeSkill, /upfront/i);
  assert.match(decomposeSkill, /just_in_time/i);
  assert.match(planReference, /Batch Plan Mode/);
  assert.match(planReference, /Mermaid/i);
  assert.match(commandsSpec, /--batch/);
  assert.match(commandsSpec, /### `\/hw:plan`\n\nSupported flags:\n\n- none\n- `--batch`/);
  assert.match(commandsSpec, /### `\/hw:status`\n\nSupported flags:\n\n- none\n- `--full`/);
  assert.match(commandsSpec, /single-feature \/hw:plan behavior is unchanged/i);
});

test("renderBatchPlanArtifacts creates upfront queue, markdown, and Mermaid outputs", () => {
  const result = renderBatchPlanArtifacts(
    {
      cycle_id: "C9",
      features: [
        { id: "F101", title: "Search", summary: "Add search UX", priority: 10 },
        { id: "F102", title: "Export", summary: "Add export flow", priority: 20, gate: "confirm" },
      ],
    },
    { decompose_mode: "upfront", failure_policy: "skip_defer" },
  );

  assert.equal(result.queue.current_feature, "F101");
  assert.equal(result.queue.defaults.decompose_mode, "upfront");
  assert.equal(result.queue.features.length, 2);
  assert.ok(result.queue.features.every((feature) => feature.milestones.length >= 1));
  assert.equal(result.queue.features[1].gate, "confirm");
  assert.match(result.markdown, /\| Feature \| Priority \| Gate \| Decompose \| Status \| Milestones \|/);
  assert.match(result.markdown, /F101/);
  assert.match(result.mermaid, /graph TD/);
  assert.match(result.mermaid, /F101/);
  assert.match(result.mermaid, /F102/);
});

test("renderBatchPlanArtifacts honors just_in_time scaffold without full decomposition", () => {
  const result = renderBatchPlanArtifacts(
    {
      cycle_id: "C9",
      features: [
        { id: "F201", title: "Analysis", summary: "Add analysis mode", priority: 10 },
        { id: "F202", title: "Reports", summary: "Add reports", priority: 20 },
      ],
    },
    { decompose_mode: "just_in_time" },
  );

  assert.equal(result.queue.defaults.decompose_mode, "just_in_time");
  assert.equal(result.queue.features[0].milestones.length, 0);
  assert.equal(result.queue.features[1].milestones.length, 0);
  assert.match(result.markdown, /just_in_time/);
  assert.match(result.markdown, /JIT decomposition pending/);
});

test("decompose assessment flags horizontal-only milestones as weak", () => {
  const assessment = assessRunnableVerticalSlice({
    objective: "Prepare database schema, API contracts, and UI shell separately.",
    implementation_scope: [
      "database schema only",
      "API interface only",
      "UI skeleton only",
    ],
    test_spec: ["schema migration test", "type contract test"],
    expected_artifacts: ["schema.sql", "openapi.yaml", "empty page shell"],
  });

  assert.equal(assessment.status, "weak");
  assert.ok(assessment.flags.includes("horizontal_only"));
  assert.ok(assessment.flags.includes("missing_runnable_behavior"));
  assert.match(assessment.summary, /runnable vertical slice/i);
});

test("decompose assessment accepts a thin runnable vertical slice", () => {
  const assessment = assessRunnableVerticalSlice({
    objective: "User can run a CLI command that writes lifecycle state and see the status update.",
    implementation_scope: [
      "CLI command",
      "shared lifecycle core helper",
      "state persistence",
      "status output",
    ],
    test_spec: [
      "failing node:test for command-to-state behavior",
      "real CLI validation command",
    ],
    validation_commands: ["node --test core/test/workflow-commit.test.js"],
    evidence: ["before/after status output"],
  });

  assert.equal(assessment.status, "acceptable");
  assert.ok(assessment.layers.length >= 2);
  assert.equal(assessment.runnable_behavior, true);
});

test("batch plan artifacts retain explicit milestone slice-quality fixtures", () => {
  const result = renderBatchPlanArtifacts(
    {
      cycle_id: "C9",
      features: [
        {
          id: "F301",
          title: "Status command",
          category: "agent-service",
          milestones: [
            {
              id: "F301-M01",
              title: "Runnable status command slice",
              objective: "User runs hw-core status and sees persisted lifecycle phase.",
              implementation_scope: ["CLI command", "shared core", "state read", "status output"],
              test_spec: ["node:test plus real CLI validation"],
              validation_commands: ["node --test core/test/opencode-status.test.js"],
              evidence: ["before/after status output with assertion on persisted lifecycle phase"],
              expected_artifacts: ["core/src/opencode-status/index.js"],
            },
          ],
        },
      ],
    },
    { decompose_mode: "upfront" },
  );

  const [milestone] = result.queue.features[0].milestones;
  assert.equal(milestone.slice_quality.status, "acceptable");
  assert.match(result.markdown, /acceptable/);
});

test("batch plan DAG output renders dependencies without changing ordinary plans", () => {
  const result = renderBatchPlanArtifacts(
    {
      cycle_id: "C10",
      features: [
        { id: "F401", title: "Foundation", status: "done" },
        { id: "F402", title: "Dashboard", depends_on: ["F401"], execution_hint: "afk" },
        { id: "F403", title: "Release", depends_on: ["F402"], gate: "confirm", handoff_hint: "hitl" },
      ],
    },
    { decompose_mode: "upfront" },
  );

  assert.equal(result.dag.ok, true);
  assert.match(result.markdown, /Depends On/);
  assert.match(result.markdown, /Ready/);
  assert.match(result.markdown, /F402/);
  assert.match(result.mermaid, /F401\s*-->\s*F402/);
  assert.match(result.mermaid, /F402\s*-->\s*F403/);
  assert.ok(result.dag.features.find((feature) => feature.id === "F402").ready);

  const ordinary = renderBatchPlanArtifacts(
    { cycle_id: "C11", features: [{ id: "F501", title: "Single feature" }] },
    { decompose_mode: "upfront" },
  );
  assert.equal(ordinary.dag.visible, false);
  assert.doesNotMatch(ordinary.markdown, /Depends On/);
});

test("vertical-slice docs require one-behavior TDD loops, prompt evidence, and stable compact authority", async () => {
  const planSkill = await readFile("plan/PLAN-SKILL.md", "utf8");
  const decomposeSkill = await readFile("skills/plan-decompose/SKILL.md", "utf8");
  const tddSpec = await readFile("references/tdd-spec.md", "utf8");
  const promptTemplate = await readFile("plan/assets/prompt-template.md", "utf8");
  const compactSkill = await readFile("skills/compact/SKILL.md", "utf8");

  assert.match(`${planSkill}\n${decomposeSkill}`, /runnable vertical slice/i);
  assert.match(`${planSkill}\n${decomposeSkill}`, /horizontal-only/i);
  assert.match(`${planSkill}\n${decomposeSkill}`, /closed-loop/i);
  assert.match(`${planSkill}\n${decomposeSkill}`, /database\/API\/UI\/schema/i);

  assert.match(tddSpec, /one behavior/i);
  assert.match(tddSpec, /red.*green.*refactor/is);
  assert.match(tddSpec, /do not batch unrelated/i);

  for (const heading of [
    "## Objective",
    "## Boundaries",
    "## Non-Goals",
    "## Validation Commands",
    "## Evidence",
    "## Human QA",
  ]) {
    assert.match(promptTemplate, new RegExp(`^${escapeRegExp(heading)}$`, "m"));
  }

  assert.match(compactSkill, /stable prompt\/design artifacts/i);
  assert.match(compactSkill, /not.*design authority/i);
});

test("decompose assessment flags open-loop validation without observable closure", () => {
  const assessment = assessRunnableVerticalSlice({
    objective: "Implement cache invalidation path.",
    implementation_scope: [
      "cache helper",
      "command entry",
    ],
    test_spec: [
      "add tests later",
      "manual smoke if time permits",
    ],
    validation_commands: ["npm test"],
    expected_artifacts: ["src/cache.js"],
  });

  assert.equal(assessment.status, "needs_evidence");
  assert.ok(assessment.flags.includes("missing_closed_loop_validation"));
  assert.equal(assessment.closed_loop_validation, false);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
