import test from "node:test";
import assert from "node:assert/strict";
import * as api from "../src/index.js";

test("historical backfill planner starts at 2026-03-01 and creates deterministic daily shards", () => {
  const planHistoricalBackfillShards = requireApi("planHistoricalBackfillShards");

  const first = planHistoricalBackfillShards({
    start_date: "2026-03-01",
    end_date: "2026-03-04",
    granularity: "daily",
    timezone: "Asia/Shanghai",
    source_kinds: ["codex_sessions", "opencode_sessions", "claude_sessions", "notion_pages"],
  });
  const second = planHistoricalBackfillShards({
    source_kinds: ["notion_pages", "claude_sessions", "opencode_sessions", "codex_sessions"],
    timezone: "Asia/Shanghai",
    granularity: "daily",
    end_date: "2026-03-04",
    start_date: "2026-03-01",
  });

  assert.deepEqual(first, second);
  assert.equal(first.mode, "historical_backfill");
  assert.equal(first.initial_backfill_start, "2026-03-01");
  assert.deepEqual(first.shards.map((shard) => shard.id), [
    "global-consolidation-daily-2026-03-01",
    "global-consolidation-daily-2026-03-02",
    "global-consolidation-daily-2026-03-03",
  ]);
  assert.deepEqual(first.shards.map((shard) => shard.cursor), [
    "daily:2026-03-01:codex_sessions,opencode_sessions,claude_sessions,notion_pages",
    "daily:2026-03-02:codex_sessions,opencode_sessions,claude_sessions,notion_pages",
    "daily:2026-03-03:codex_sessions,opencode_sessions,claude_sessions,notion_pages",
  ]);
  assert.ok(first.shards.every((shard) => shard.status === "pending"));
  assert.ok(first.shards.every((shard) => shard.resume_metadata?.timezone === "Asia/Shanghai"));
});

test("weekly backfill shards cover the same history with stable inclusive/exclusive boundaries", () => {
  const planHistoricalBackfillShards = requireApi("planHistoricalBackfillShards");

  const plan = planHistoricalBackfillShards({
    start_date: "2026-03-01",
    end_date: "2026-03-15",
    granularity: "weekly",
    timezone: "Asia/Shanghai",
    source_kinds: ["codex_sessions", "opencode_sessions", "claude_sessions", "notion_pages"],
  });

  assert.deepEqual(plan.shards.map(({ start_date, end_date }) => [start_date, end_date]), [
    ["2026-03-01", "2026-03-08"],
    ["2026-03-08", "2026-03-15"],
  ]);
  assert.deepEqual(plan.shards.map((shard) => shard.id), [
    "global-consolidation-weekly-2026-03-01",
    "global-consolidation-weekly-2026-03-08",
  ]);
  assert.ok(plan.shards.every((shard) => shard.resume_metadata?.cursor === shard.cursor));
});

test("resume state advances deterministically from completed shards without embedding raw content", () => {
  const planHistoricalBackfillShards = requireApi("planHistoricalBackfillShards");
  const buildConsolidationResumeState = requireApi("buildConsolidationResumeState");
  const plan = planHistoricalBackfillShards({
    start_date: "2026-03-01",
    end_date: "2026-03-05",
    granularity: "daily",
    timezone: "Asia/Shanghai",
    source_kinds: ["codex_sessions", "opencode_sessions", "claude_sessions", "notion_pages"],
  });

  const resume = buildConsolidationResumeState({
    run_id: "mr-global-consolidation-20260301-backfill",
    shards: plan.shards,
    completed_shard_ids: [
      "global-consolidation-daily-2026-03-01",
      "global-consolidation-daily-2026-03-02",
    ],
    last_record_refs: {
      codex_sessions: "codex_sessions:2026-03-02:last",
      notion_pages: "notion_pages:2026-03-02:last",
    },
  }, { now: "2026-05-19T04:30:00+08:00" });

  assert.equal(resume.run_id, "mr-global-consolidation-20260301-backfill");
  assert.equal(resume.status, "active");
  assert.equal(resume.next_shard_id, "global-consolidation-daily-2026-03-03");
  assert.equal(resume.cursor, "daily:2026-03-03:codex_sessions,opencode_sessions,claude_sessions,notion_pages");
  assert.deepEqual(resume.completed_shard_ids, [
    "global-consolidation-daily-2026-03-01",
    "global-consolidation-daily-2026-03-02",
  ]);
  assert.deepEqual(resume.last_record_refs, {
    codex_sessions: "codex_sessions:2026-03-02:last",
    notion_pages: "notion_pages:2026-03-02:last",
  });

  const serialized = JSON.stringify(resume);
  assert.doesNotMatch(serialized, /content|messages|blocks|password|authorization|token|api_key/i);
});

function requireApi(name) {
  assert.equal(typeof api[name], "function", `expected ${name} to be exported from ../src/index.js`);
  return api[name];
}
