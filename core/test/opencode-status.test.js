import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildOpenCodeStatusModel } from "../src/index.js";

test("OpenCode status model tolerates an empty workspace", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-status-empty-"));
  const model = await buildOpenCodeStatusModel(root);

  assert.equal(model.ok, false);
  assert.equal(model.pipeline.status, "missing_pipeline");
  assert.equal(model.progress.completed, 0);
  assert.equal(model.progress.total, 0);
  assert.equal(model.metrics.duration_ms, "n/a");
  assert.equal(model.metrics.token_count, "n/a");
  assert.equal(model.metrics.cost, "n/a");
  assert.deepEqual(model.recent_events, []);
  assert.match(model.footer.text, /HW missing_pipeline/);
});

test("OpenCode status model reads active state, queue, events, metrics, and latest score", async () => {
  const root = await fixtureRoot();
  await writePipeline(root, {
    "state.yaml": activeStateYaml(),
    "cycle.yaml": cycleYaml(),
    "feature-queue.yaml": featureQueueYaml({ currentFeature: "F003", f003Status: "active" }),
    "metrics.yaml": metricsYaml(),
    "log.yaml": logYaml(12),
    "reports.compact.md": reportsCompact(),
  });
  await writeOpenCodeMetadata(root);

  const model = await buildOpenCodeStatusModel(root, {
    opencode: {
      current: { agent: "hw-build", model: "mimo/mimo-v2.5-pro" },
      active_subagent: {
        agent: "hw-test",
        model: { providerID: "deepseek", modelID: "deepseek-v4-pro" },
      },
    },
  });

  assert.equal(model.ok, true);
  assert.equal(model.cycle.id, "C2");
  assert.equal(model.pipeline.status, "running");
  assert.equal(model.current.milestone_id, "M08");
  assert.equal(model.current.step, "write_tests");
  assert.equal(model.feature.id, "F003");
  assert.equal(model.feature.gate, "confirm");
  assert.equal(model.progress.completed, 7);
  assert.equal(model.progress.total, 12);
  assert.equal(model.queue.current_feature, "F003");
  assert.equal(model.recent_events.length, 10);
  assert.equal(model.latest_score.diff_score, 2);
  assert.equal(model.metrics.duration_ms, "n/a");
  assert.equal(model.metrics.token_count, "n/a");
  assert.equal(model.metrics.cost, "n/a");
  assert.equal(model.models.current.agent, "hw-build");
  assert.equal(model.models.current.model, "mimo/mimo-v2.5-pro");
  assert.equal(model.models.active_subagent.agent, "hw-test");
  assert.equal(model.models.active_subagent.model, "deepseek/deepseek-v4-pro");
  assert.equal(model.models.active_subagent.evidence_scope, "runtime_observation");
  assert.ok(model.models.subagents.some((agent) => agent.agent === "hw-code-a" && agent.model === "mimo/mimo-v2.5-pro"));
  assert.match(model.sidebar.summary, /M08/);
  assert.ok(model.sidebar.sections.some((section) => section.title === "Feature Queue"));
  assert.ok(model.sidebar.sections.some((section) => section.title === "Milestones"));
  assert.match(model.sidebar.sections.find((section) => section.title === "Models").items.join("\n"), /Current: hw-build -> mimo\/mimo-v2\.5-pro/);
  assert.match(model.sidebar.sections.find((section) => section.title === "Models").items.join("\n"), /Active subagent \(runtime only\): hw-test -> deepseek\/deepseek-v4-pro/);
  assert.ok(model.sidebar.sections.some((section) => section.title === "Blocked \/ Deferred"));
  assert.match(model.sidebar.sections.find((section) => section.title === "Feature Queue").items.join("\n"), /F003.*OpenCode status panels/);
  assert.match(model.sidebar.sections.find((section) => section.title === "Milestones").items.join("\n"), /M09/);
  assert.equal(model.sidebar.sections.find((section) => section.title === "Recent").items.length, 10);
  assert.match(model.footer.text, /C2/);
  assert.match(model.footer.text, /M08/);
});

test("OpenCode active subtask is runtime-only and not worker evidence", async () => {
  const root = await fixtureRoot();
  await writePipeline(root, {
    "state.yaml": activeStateYaml(),
  });

  const model = await buildOpenCodeStatusModel(root, {
    opencode: {
      current: { agent: "hw-build", model: "deepseek/deepseek-v4-pro" },
      active_subagent: {
        agent: "codex-subcodex",
        model: "deepseek/deepseek-v4-flash",
        source: "codex_internal_subtask",
      },
    },
  });

  assert.equal(model.models.active_subagent.agent, "codex-subcodex");
  assert.equal(model.models.active_subagent.evidence_scope, "runtime_observation");
  assert.equal(model.models.active_subagent.worker_evidence, false);
  assert.equal("runtime_workers" in model, false);
  assert.match(model.sidebar.sections.find((section) => section.title === "Models").items.join("\n"), /runtime only/);
});

test("OpenCode status model surfaces confirm gates without an active current feature", async () => {
  const root = await fixtureRoot();
  await writePipeline(root, {
    "state.yaml": gatedStateYaml(),
    "feature-queue.yaml": featureQueueYaml({ currentFeature: null, f003Status: "queued" }),
    "log.yaml": logYaml(2),
  });

  const model = await buildOpenCodeStatusModel(root);

  assert.equal(model.pipeline.status, "stopped");
  assert.equal(model.gate.status, "waiting_confirmation");
  assert.equal(model.gate.feature_id, "F003");
  assert.equal(model.feature.id, "F003");
  assert.equal(model.queue.current_feature, null);
  assert.match(model.footer.text, /confirm/);
});

test("OpenCode status model shows concise DAG board only when dependencies exist", async () => {
  const root = await fixtureRoot();
  await writePipeline(root, {
    "state.yaml": activeStateYaml(),
    "feature-queue.yaml": featureQueueYaml({
      currentFeature: null,
      f003Status: "queued",
      includeDependency: true,
    }),
    "log.yaml": logYaml(2),
  });

  const model = await buildOpenCodeStatusModel(root);

  assert.equal(model.queue.dag.visible, true);
  assert.deepEqual(model.queue.dag.ready_features, ["F003"]);
  assert.match(model.sidebar.sections.find((section) => section.title === "Feature DAG").items.join("\n"), /Ready: F003/);

  const ordinaryRoot = await fixtureRoot();
  await writePipeline(ordinaryRoot, {
    "state.yaml": activeStateYaml(),
    "feature-queue.yaml": featureQueueYaml({ currentFeature: "F003", f003Status: "active" }),
  });
  const ordinary = await buildOpenCodeStatusModel(ordinaryRoot);
  assert.equal(ordinary.queue.dag.visible, false);
  assert.equal(ordinary.sidebar.sections.some((section) => section.title === "Feature DAG"), false);
});

test("OpenCode status model handles failed state and malformed optional files", async () => {
  const root = await fixtureRoot();
  await writePipeline(root, {
    "state.yaml": failedStateYaml(),
    "feature-queue.yaml": "features:\n  - id: F900\n    status: active\n",
    "metrics.yaml": "not: [valid\n",
    "log.yaml": logYaml(1),
  });

  const model = await buildOpenCodeStatusModel(root);

  assert.equal(model.ok, true);
  assert.equal(model.pipeline.status, "blocked");
  assert.equal(model.current.milestone_id, "M99");
  assert.equal(model.metrics.duration_ms, "n/a");
  assert.equal(model.metrics.token_count, "n/a");
  assert.equal(model.metrics.cost, "n/a");
  assert.ok(model.sources.some((source) => source.path.endsWith("metrics.yaml") && source.status === "error"));
  assert.ok(model.warnings.some((warning) => /metrics\.yaml/.test(warning)));
});

test("OpenCode status model reports malformed lease repair guidance", async () => {
  const root = await fixtureRoot();
  await writePipeline(root, {
    "state.yaml": activeStateYaml(),
    ".lock": `
platform: opencode
heartbeat_at: invalid
`,
  });

  const model = await buildOpenCodeStatusModel(root);

  assert.equal(model.lease.action, "repair");
  assert.match(model.lease.repair_hint, /hw:check/i);
  assert.match(model.sidebar.sections.find((section) => section.title === "Recovery").items.join("\n"), /malformed_lease/);
});

test("OpenCode status model tolerates legacy scalar-aligned milestone blocks", async () => {
  const root = await fixtureRoot();
  await writePipeline(root, {
    "state.yaml": `
pipeline:
  name: Legacy
  status: completed
  prompts_total: 1
  prompts_completed: 1
current:
  prompt_name: "R7: Legacy prompt"
  step: done
milestones:
- name: "R7: Legacy prompt"
  status: done
`,
  });

  const model = await buildOpenCodeStatusModel(root);

  assert.equal(model.ok, true);
  assert.equal(model.pipeline.status, "completed");
  assert.match(model.footer.text, /completed/);
});

test("OpenCode status model parses dash-only YAML array items from workflow commits", async () => {
  const root = await fixtureRoot();
  await writePipeline(root, {
    "state.yaml": `
pipeline:
  name: Demo
  status: running
  prompts_total: 2
  prompts_completed: 1
current:
  phase: executing
  prompt_name: M02 - Demo
  step: write_tests
  step_index: 0
milestones:
  -
    id: M01
    feature_id: F001
    status: done
  -
    id: M02
    feature_id: F002
    status: in_progress
prompt_state:
  steps:
    -
      name: write_tests
      status: running
acceptance:
  scope: cycle
  state: accepted
  mode: auto
  cycle_id: C9
history:
  completed_prompts:
    -
      prompt_index: 0
      result: pass
      evaluation:
        diff_score: 2
        warnings:
          -
            "contains: colon"
`,
    "cycle.yaml": `
cycle:
  number: 9
  status: active
  acceptance:
    state: accepted
`,
  });

  const model = await buildOpenCodeStatusModel(root);

  assert.equal(model.ok, true);
  assert.equal(model.current.milestone_id, "M02");
  assert.equal(model.acceptance.state, "accepted");
  assert.equal(model.lifecycle.phase, "executing");
  assert.equal(model.progress.completed, 1);
  assert.equal(model.latest_score.diff_score, 2);
  assert.deepEqual(model.latest_score.warnings, ["contains: colon"]);
});

test("OpenCode status model summarizes completed pipelines", async () => {
  const root = await fixtureRoot();
  await writePipeline(root, {
    "state.yaml": completedStateYaml(),
    "feature-queue.yaml": featureQueueYaml({ currentFeature: null, f003Status: "done" }),
    "metrics.yaml": metricsYaml({ cycleStatus: "completed", cycleDuration: 123456 }),
    "log.yaml": logYaml(3),
  });

  const model = await buildOpenCodeStatusModel(root);

  assert.equal(model.pipeline.status, "completed");
  assert.equal(model.progress.completed, 12);
  assert.equal(model.progress.total, 12);
  assert.equal(model.latest_score.overall, 1);
  assert.equal(model.metrics.duration_ms, 123456);
  assert.match(model.sidebar.summary, /12\/12/);
  assert.match(model.footer.text, /completed/);
});

test("OpenCode status spec records official TUI/plugin capability baseline", async () => {
  const spec = await readFile("references/opencode-spec.md", "utf8");

  assert.match(spec, /TUI Status Model/);
  assert.match(spec, /sidebar_content/);
  assert.match(spec, /sidebar_footer/);
  assert.match(spec, /home_footer/);
  assert.match(spec, /TUI Slot API/);
  assert.match(spec, /read-only status model/i);
  assert.match(spec, /token\/cost.*n\/a/i);
});

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "hw-status-"));
  await mkdir(join(root, ".pipeline"), { recursive: true });
  return root;
}

async function writeOpenCodeMetadata(root) {
  await mkdir(join(root, ".opencode"), { recursive: true });
  await writeFile(join(root, ".opencode", "hypo-workflow.json"), JSON.stringify({
    profile: "standard",
    agents: {
      plan: { model: "deepseek-v4-pro" },
      compact: { model: "deepseek-v4-flash" },
      test: { model: "deepseek-v4-pro" },
      "code-a": { model: "mimo-v2.5-pro" },
      "code-b": { model: "deepseek-v4-pro" },
      debug: { model: "deepseek-v4-pro" },
      report: { model: "deepseek-v4-flash" },
    },
  }, null, 2), "utf8");
}

async function writePipeline(root, files) {
  for (const [name, contents] of Object.entries(files)) {
    await writeFile(join(root, ".pipeline", name), contents, "utf8");
  }
}

function activeStateYaml() {
  return `
pipeline:
  name: Demo
  status: running
  prompts_total: 12
  prompts_completed: 7
last_heartbeat: "2026-05-01T11:35:31+08:00"
current:
  prompt_index: 7
  prompt_file: ".pipeline/prompts/07-opencode-tui-status-data-adapter.md"
  prompt_name: "M08 / F003 — OpenCode TUI Status Data Adapter"
  step: write_tests
  step_index: 0
milestones:
  - id: M07
    feature_id: F004
    status: done
  - id: M08
    feature_id: F003
    status: in_progress
history:
  completed_prompts:
    - prompt_index: 6
      prompt_name: "M07 / F004 — Queue Insert, Auto-Chain, and JIT Milestones"
      report_file: ".pipeline/reports/06-queue-insert-auto-chain-jit.report.md"
      evaluation:
        diff_score: 2
        overall: 1
        code_quality: 4
`;
}

function gatedStateYaml() {
  return activeStateYaml()
    .replace("status: running", "status: stopped")
    .replace("prompts_completed: 7", "prompts_completed: 7")
    .replace("status: in_progress", "status: pending");
}

function failedStateYaml() {
  return `
pipeline:
  name: Demo
  status: blocked
  prompts_total: 2
  prompts_completed: 1
current:
  prompt_name: "M99 / F900 — Broken"
  step: run_tests_green
milestones:
  - id: M99
    feature_id: F900
    status: failed
prompt_state:
  result: blocked
  diff_score: 5
  code_quality: 2
`;
}

function completedStateYaml() {
  return `
pipeline:
  name: Demo
  status: completed
  prompts_total: 12
  prompts_completed: 12
current:
  phase: completed
history:
  completed_prompts:
    - prompt_name: "M12 / F005 — Beamer Slides"
      evaluation:
        diff_score: 1
        overall: 1
        code_quality: 5
`;
}

function cycleYaml() {
  return `
cycle:
  number: 2
  name: Maintainability, Observability, and Showcase Expansion
  status: active
`;
}

function featureQueueYaml({ currentFeature, f003Status, includeDependency = false }) {
  const current = currentFeature === null ? "null" : currentFeature;
  const dependencyFeature = includeDependency
    ? `  - id: F002
    title: Foundation
    status: done
    gate: auto
    decompose_mode: upfront
    milestones:
      - id: M07
        status: done
    metric_summary:
      duration_ms: n/a
      token_count: n/a
      cost: n/a
`
    : "";
  const dependencyFields = includeDependency
    ? `    depends_on:
      - F002
    execution_hint: afk
    handoff_hint: HITL copy review
`
    : "";
  return `
version: 1
cycle_id: C2
current_feature: ${current}
defaults:
  auto_chain: true
  failure_policy: skip_defer
features:
${dependencyFeature}\
  - id: F003
    title: OpenCode status panels
    status: ${f003Status}
    gate: confirm
    decompose_mode: just_in_time
${dependencyFields}\
    milestones:
      - id: M08
        status: ${f003Status === "active" ? "in_progress" : "queued"}
      - id: M09
        status: queued
    metric_summary:
      duration_ms: n/a
      token_count: n/a
      cost: n/a
`;
}

function metricsYaml({ cycleStatus = "running", cycleDuration = "n/a" } = {}) {
  return `
version: 1
cycle_id: C2
cycles:
  - id: C2
    status: ${cycleStatus}
    duration_ms: ${cycleDuration}
    token_count: n/a
    cost: n/a
features:
  - id: F003
    status: active
    duration_ms: n/a
    token_count: n/a
    cost: n/a
`;
}

function logYaml(count) {
  const entries = Array.from({ length: count }, (_, index) => `  - id: "E${index + 1}"
    type: milestone
    status: completed
    timestamp: "2026-05-01T11:${String(index).padStart(2, "0")}:00+08:00"
    summary: "event ${index + 1}"`).join("\n");
  return `entries:\n${entries}\n`;
}

function reportsCompact() {
  return `
# Reports Compact

- latest: diff_score=2 overall=1
`;
}
