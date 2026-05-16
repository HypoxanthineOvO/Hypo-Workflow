import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  applyFeatureQueueOperation,
  decomposeFeatureJustInTime,
  resolveFeatureDagBoard,
  resolveFeatureAutoChain,
  syncFeatureMetricSummary,
} from "../src/index.js";

test("queue edits require confirmation before mutating the feature queue", () => {
  const queue = sampleQueue();
  const original = structuredClone(queue);
  const operation = {
    type: "append",
    feature: {
      id: "F003",
      title: "Telemetry",
      summary: "Add runtime telemetry views",
      priority: 30,
      gate: "confirm",
      decompose_mode: "just_in_time",
    },
  };

  const proposal = applyFeatureQueueOperation(queue, operation);

  assert.equal(proposal.status, "confirmation_required");
  assert.equal(proposal.requires_confirmation, true);
  assert.equal(proposal.queue.features.length, 2);
  assert.deepEqual(queue, original);
  assert.match(proposal.summary, /append/i);
  assert.equal(proposal.diff.after.features.length, 3);

  const applied = applyFeatureQueueOperation(queue, operation, {
    confirmed: true,
    now: "2026-05-01T04:10:00+08:00",
  });

  assert.equal(applied.status, "applied");
  assert.equal(applied.requires_confirmation, false);
  assert.equal(applied.queue.features.at(-1).id, "F003");
  assert.equal(applied.queue.features.at(-1).metric_summary.duration_ms, "n/a");
  assert.equal(applied.queue.updated_at, "2026-05-01T04:10:00+08:00");
  assert.match(applied.event.summary, /append/i);
});

test("queue operations cover insert, reprioritize, pause, update, and protected move guards", () => {
  const queue = sampleQueue();
  const inserted = applyFeatureQueueOperation(
    queue,
    {
      type: "insert",
      position: "before",
      target_id: "F002",
      feature: { id: "F003", title: "Docs", summary: "Add docs", priority: 25 },
    },
    { confirmed: true },
  ).queue;

  assert.deepEqual(inserted.features.map((feature) => feature.id), ["F001", "F003", "F002"]);

  const reprioritized = applyFeatureQueueOperation(
    inserted,
    { type: "reprioritize", feature_id: "F003", priority: 15 },
    { confirmed: true },
  ).queue;
  assert.equal(reprioritized.features.find((feature) => feature.id === "F003").priority, 15);

  const paused = applyFeatureQueueOperation(
    reprioritized,
    { type: "pause", feature_id: "F003" },
    { confirmed: true },
  ).queue;
  assert.equal(paused.features.find((feature) => feature.id === "F003").gate, "confirm");

  const updated = applyFeatureQueueOperation(
    paused,
    {
      type: "update",
      feature_id: "F003",
      title: "Documentation",
      summary: "Add operator-facing docs",
      decompose_mode: "just_in_time",
    },
    { confirmed: true },
  ).queue;
  const docsFeature = updated.features.find((feature) => feature.id === "F003");
  assert.equal(docsFeature.title, "Documentation");
  assert.equal(docsFeature.summary, "Add operator-facing docs");
  assert.equal(docsFeature.decompose_mode, "just_in_time");

  const blockedMove = applyFeatureQueueOperation(
    updated,
    { type: "move", feature_id: "F001", position: "after", target_id: "F002" },
    { confirmed: true },
  );
  assert.equal(blockedMove.status, "blocked");
  assert.match(blockedMove.reason, /active/i);

  const duplicate = applyFeatureQueueOperation(
    updated,
    { type: "append", feature: { id: "F001", title: "Duplicate" } },
    { confirmed: true },
  );
  assert.equal(duplicate.status, "blocked");
  assert.match(duplicate.reason, /duplicate/i);
});

test("auto-chain advances on success, pauses on confirm gates, and skip-defers failures", () => {
  const queue = sampleQueue({
    features: [
      { id: "F001", title: "A", status: "active", gate: "auto", milestones: [{ id: "M01", status: "done" }] },
      { id: "F002", title: "B", status: "queued", gate: "auto", milestones: [] },
      { id: "F003", title: "C", status: "queued", gate: "confirm", milestones: [] },
    ],
  });

  const advanced = resolveFeatureAutoChain(queue, {
    feature_id: "F001",
    result: "pass",
    now: "2026-05-01T04:12:00+08:00",
  });
  assert.equal(advanced.action, "advance");
  assert.equal(advanced.queue.current_feature, "F002");
  assert.equal(advanced.queue.features[0].status, "done");
  assert.equal(advanced.queue.features[1].status, "active");

  const paused = resolveFeatureAutoChain(advanced.queue, {
    feature_id: "F002",
    result: "pass",
    now: "2026-05-01T04:13:00+08:00",
  });
  assert.equal(paused.action, "pause_for_confirmation");
  assert.equal(paused.next_feature_id, "F003");
  assert.equal(paused.queue.current_feature, null);
  assert.equal(paused.queue.features[2].status, "queued");

  const failed = resolveFeatureAutoChain(queue, {
    feature_id: "F001",
    result: "fail",
    failure_policy: "skip_defer",
    now: "2026-05-01T04:14:00+08:00",
  });
  assert.equal(failed.action, "advance");
  assert.equal(failed.queue.features[0].status, "deferred");
  assert.equal(failed.queue.features[1].status, "active");
});

test("just_in_time decomposition materializes milestones only when the feature becomes current", () => {
  const queue = sampleQueue({
    features: [
      { id: "F001", title: "A", status: "active", decompose_mode: "upfront", milestones: [{ id: "M01", status: "done" }] },
      { id: "F002", title: "B", status: "queued", decompose_mode: "just_in_time", milestones: [] },
    ],
  });

  const upfront = decomposeFeatureJustInTime(queue, "F001");
  assert.equal(upfront.generated, false);
  assert.equal(upfront.queue.features[0].milestones.length, 1);

  const decomposed = decomposeFeatureJustInTime(queue, "F002", {
    now: "2026-05-01T04:15:00+08:00",
  });
  assert.equal(decomposed.generated, true);
  assert.deepEqual(decomposed.queue.features[1].milestones.map((milestone) => milestone.id), ["F002-M01", "F002-M02"]);
  assert.ok(decomposed.queue.features[1].milestones.every((milestone) => milestone.status === "planned"));
  assert.equal(decomposed.queue.updated_at, "2026-05-01T04:15:00+08:00");
});

test("metric summary sync preserves telemetry and falls back to n/a when unavailable", () => {
  const queue = sampleQueue();
  const synced = syncFeatureMetricSummary(queue, {
    features: [
      { id: "F001", duration_ms: 1234, token_count: 5678, cost: "n/a" },
      { id: "F002", duration_ms: "n/a", token_count: "n/a", cost: "n/a" },
    ],
  });

  assert.deepEqual(synced.features[0].metric_summary, {
    duration_ms: 1234,
    token_count: 5678,
    cost: "n/a",
  });
  assert.deepEqual(synced.features[1].metric_summary, {
    duration_ms: "n/a",
    token_count: "n/a",
    cost: "n/a",
  });
});

test("feature DAG board computes ready, blocked, unlocks, and parallel candidates", () => {
  const board = resolveFeatureDagBoard(sampleQueue({
    current_feature: null,
    features: [
      { id: "F001", title: "Foundation", status: "done", depends_on: [] },
      { id: "F002", title: "Docs", status: "queued", depends_on: ["F001"], execution_hint: "AFK" },
      { id: "F003", title: "Dashboard", status: "queued", depends_on: ["F001"], gate: "confirm", handoff_hint: "HITL copy review" },
      { id: "F004", title: "Release", status: "queued", depends_on: ["F002", "F003"] },
    ],
  }));

  assert.equal(board.ok, true);
  assert.deepEqual(board.ready_features.map((feature) => feature.id), ["F002", "F003"]);
  assert.deepEqual(board.parallel_candidates.map((feature) => feature.id), ["F002", "F003"]);

  const release = board.features.find((feature) => feature.id === "F004");
  assert.equal(release.status, "blocked");
  assert.deepEqual(release.blocked_by, ["F002", "F003"]);
  assert.equal(release.ready_reason, "waiting_on_dependencies");

  const foundation = board.features.find((feature) => feature.id === "F001");
  assert.deepEqual(foundation.unlocks, ["F002", "F003"]);
  assert.equal(board.features.find((feature) => feature.id === "F002").execution_hint, "afk");
  assert.equal(board.features.find((feature) => feature.id === "F003").handoff_hint, "HITL copy review");
});

test("feature DAG board reports dependency cycles clearly", () => {
  const board = resolveFeatureDagBoard(sampleQueue({
    current_feature: null,
    features: [
      { id: "F001", title: "A", status: "queued", depends_on: ["F003"] },
      { id: "F002", title: "B", status: "queued", depends_on: ["F001"] },
      { id: "F003", title: "C", status: "queued", depends_on: ["F002"] },
    ],
  }));

  assert.equal(board.ok, false);
  assert.equal(board.errors[0].code, "dependency_cycle");
  assert.deepEqual(board.errors[0].cycle, ["F001", "F003", "F002", "F001"]);
  assert.match(board.errors[0].message, /dependency cycle/i);
});

test("M07 docs describe insert confirmation, auto-chain gates, JIT, and metrics fallback", async () => {
  const commandsSpec = await readFile("references/commands-spec.md", "utf8");
  const featureSpec = await readFile("references/feature-queue-spec.md", "utf8");
  const planSkill = await readFile("skills/plan/SKILL.md", "utf8");
  const startSkill = await readFile("skills/start/SKILL.md", "utf8");
  const resumeSkill = await readFile("skills/resume/SKILL.md", "utf8");

  assert.match(commandsSpec, /--insert <natural language>/);
  assert.match(commandsSpec, /summarize the queue diff/i);
  assert.match(featureSpec, /confirmation_required/);
  assert.match(featureSpec, /structured queue operation/i);
  assert.match(planSkill, /\/hw:plan --insert/);
  assert.match(startSkill, /auto[-_ ]?chain|自动链/i);
  assert.match(startSkill, /gate: confirm/);
  assert.match(resumeSkill, /just_in_time/);
  assert.match(resumeSkill, /token\/cost|令牌\/成本/i);
});

function sampleQueue(overrides = {}) {
  const features = overrides.features || [
    { id: "F001", title: "Active", status: "active", gate: "auto", decompose_mode: "upfront", milestones: [] },
    { id: "F002", title: "Queued", status: "queued", gate: "auto", decompose_mode: "upfront", milestones: [] },
  ];

  return {
    version: 1,
    cycle_id: "C9",
    current_feature: overrides.current_feature ?? "F001",
    updated_at: "2026-05-01T04:00:00+08:00",
    defaults: {
      decompose_mode: "upfront",
      failure_policy: "skip_defer",
      auto_chain: true,
      default_gate: "auto",
    },
    features: features.map((feature, index) => ({
      priority: (index + 1) * 10,
      source: "test",
      summary: "",
      metric_summary: { duration_ms: "n/a", token_count: "n/a", cost: "n/a" },
      ...feature,
    })),
  };
}
