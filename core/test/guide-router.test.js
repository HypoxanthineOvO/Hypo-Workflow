import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildDesignConceptArtifacts,
  evaluateDiscoverGrillMeRisk,
  routeGuideIntent,
} from "../src/index.js";

test("guide router recommends one path for lifecycle and intent scenarios", () => {
  const missing = routeGuideIntent({ has_pipeline: false, intent: "start here" });
  assert.equal(missing.id, "init");
  assert.deepEqual(missing.command_flow, ["/hw:init", "/hw:plan", "/hw:start"]);

  const revision = routeGuideIntent({
    has_pipeline: true,
    state: {
      pipeline: { status: "running" },
      current: { phase: "needs_revision" },
      acceptance: { state: "rejected", feedback_ref: ".pipeline/acceptance/cycle-C5-rejection.yaml" },
    },
    cycle: { cycle: { number: 5, status: "active", acceptance: { state: "rejected" } } },
    intent: "continue",
  });
  assert.equal(revision.id, "resume_revision");
  assert.deepEqual(revision.command_flow, ["/hw:resume"]);
  assert.equal(revision.sense.phase, "needs_revision");

  const followUp = routeGuideIntent({
    has_pipeline: true,
    state: {
      pipeline: { status: "stopped" },
      current: { phase: "follow_up_planning" },
      continuation: { kind: "follow_up_plan", status: "active" },
    },
    cycle: {
      cycle: {
        number: 5,
        status: "follow_up_planning",
        continuations: [{ id: "C5-follow-up", kind: "follow_up_plan", status: "active" }],
      },
    },
    intent: "plan the follow up",
  });
  assert.equal(followUp.id, "follow_up_plan");
  assert.match(followUp.command_flow.join(" "), /follow_up/);

  const repair = routeGuideIntent({
    has_pipeline: true,
    derived_refresh: { status: "warning" },
    intent: "repair state",
  });
  assert.equal(repair.id, "sync_repair");
  assert.deepEqual(repair.command_flow, ["/hw:sync --light", "/hw:check"]);

  const docs = routeGuideIntent({ has_pipeline: true, intent: "update user docs and README" });
  assert.equal(docs.id, "docs");
  assert.deepEqual(docs.command_flow, ["/hw:docs"]);
  assert.equal(docs.forward_compatible, true);

  const config = routeGuideIntent({ has_pipeline: true, intent: "change config defaults" });
  assert.equal(config.id, "config_tui");
  assert.deepEqual(config.command_flow, ["/hw:setup"]);
});

test("guide router covers plan, deep Grill-Me, batch, patch, and explore intents", () => {
  assert.equal(routeGuideIntent({ has_pipeline: true, intent: "plan a small feature" }).id, "ordinary_plan");
  assert.equal(routeGuideIntent({ has_pipeline: true, intent: "fix login bug" }).id, "patch");
  assert.equal(routeGuideIntent({ has_pipeline: true, intent: "explore a risky approach" }).id, "explore");
  assert.equal(routeGuideIntent({ has_pipeline: true, intent: "batch roadmap with DAG dependencies" }).id, "batch_dag_plan");
  assert.equal(routeGuideIntent({ has_pipeline: true, intent: "plan one small feature" }).id, "ordinary_plan");
  const deep = routeGuideIntent({ has_pipeline: true, intent: "redesign architecture source of truth" });
  assert.equal(deep.id, "deep_grill_me_plan");
  assert.deepEqual(deep.command_flow, ["/hw:plan", "/hw:start"]);
  assert.equal(deep.discover_mode, "deep_grill_me");
});

test("adaptive Discover escalates only design-risk tasks to Grill-Me", () => {
  const lowRisk = evaluateDiscoverGrillMeRisk({
    intent: "add a button label fix",
    workflow_kind: "build",
  });
  assert.equal(lowRisk.mode, "light_discover");
  assert.equal(lowRisk.requires_design_concept_alignment, false);
  assert.deepEqual(lowRisk.first_questions, ["task_category", "desired_effect", "verification_method"]);

  const highRisk = evaluateDiscoverGrillMeRisk({
    intent: "change workflow lifecycle architecture and source of truth",
    workflow_kind: "build",
  });
  assert.equal(highRisk.mode, "deep_grill_me");
  assert.equal(highRisk.requires_design_concept_alignment, true);
  assert.ok(highRisk.reasons.includes("architecture_or_source_of_truth"));
});

test("design concept artifacts keep machine concepts, glossary, and knowledge indexes separate", () => {
  const artifacts = buildDesignConceptArtifacts({
    concepts: [
      {
        id: "workflow-kind",
        term: "workflow_kind",
        definition: "Cycle-scoped workflow lane.",
        boundaries: ["Not a Test Profile."],
        source_of_truth: [".pipeline/cycle.yaml"],
        state_transitions: ["plan_generate -> start -> report"],
        decision_refs: ["D-20260503-09"],
        prompt_hints: ["Include workflow_kind in generated prompts."],
      },
    ],
    glossary: [
      {
        term: "Runnable vertical slice",
        definition: "A narrow end-to-end behavior with real validation.",
        examples: ["One command path with tests."],
        non_examples: ["Schema-only milestone."],
        misunderstandings: ["Not a marketing prototype."],
      },
    ],
  });

  assert.equal(artifacts["design-concepts.yaml"].artifact, "design-concepts");
  assert.equal(artifacts["design-concepts.yaml"].concepts[0].id, "workflow-kind");
  assert.deepEqual(artifacts["design-concepts.yaml"].concepts[0].source_of_truth, [".pipeline/cycle.yaml"]);
  assert.match(artifacts["glossary.md"], /# Glossary/);
  assert.match(artifacts["glossary.md"], /Runnable vertical slice/);
  assert.match(artifacts["glossary.md"], /workflow_kind/);
  assert.deepEqual(artifacts.knowledge_index_guidance.categories, ["decisions", "references"]);
  assert.match(artifacts.knowledge_index_guidance.rule, /do not copy full glossary/i);
});

test("guide and Discover contracts document router, adaptive Grill-Me, and artifact layering", async () => {
  const guideSkill = await readFile("skills/guide/SKILL.md", "utf8");
  const discoverSkill = await readFile("skills/plan-discover/SKILL.md", "utf8");
  const knowledgeSpec = await readFile("references/knowledge-spec.md", "utf8");
  const commandsSpec = await readFile("references/commands-spec.md", "utf8");

  assert.match(guideSkill, /intent router/i);
  assert.match(guideSkill, /one next path/i);
  assert.match(guideSkill, /deep Grill-Me/i);
  assert.match(guideSkill, /Plan long-running or multi-Feature work/);
  assert.match(guideSkill, /do not force deep Grill-Me/i);
  assert.match(guideSkill, /\/hw:docs/);
  assert.match(discoverSkill, /Adaptive Grill-Me|自适应追问/i);
  assert.match(discoverSkill, /\.pipeline\/design-concepts\.yaml/);
  assert.match(discoverSkill, /\.pipeline\/glossary\.md/);
  assert.match(knowledgeSpec, /Design Concept And Glossary Indexing/);
  assert.match(commandsSpec, /routeGuideIntent/);
});
