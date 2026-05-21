import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { parseYaml } from "../src/config/index.js";
import * as api from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = join(__dirname, "fixtures", "global-consolidation");
const SOURCE_KINDS = Object.freeze([
  "codex_sessions",
  "opencode_sessions",
  "claude_sessions",
  "notion_pages",
]);
const CANDIDATE_FIELDS = Object.freeze([
  "knowledge_candidates",
  "rule_habit_candidates",
  "template_candidates",
  "project_relation_candidates",
  "infrastructure_candidates",
]);

test("daily 04:00 Asia/Shanghai consolidation is planned as a system maintenance run, not a pipeline runner", () => {
  const planGlobalConsolidationRun = requireApi("planGlobalConsolidationRun");

  const planned = planGlobalConsolidationRun({
    schedule: "04:00 Asia/Shanghai",
    source_kinds: SOURCE_KINDS,
    initial_backfill_start: "2026-03-01",
  }, { now: "2026-05-19T04:00:00+08:00" });

  assert.equal(planned.run.kind, "maintenance_run");
  assert.equal(planned.run.run_type, "global_consolidation");
  assert.equal(planned.run.initiated_by, "system");
  assert.equal(planned.run.status, "planned");
  assert.equal(planned.run.schedule.local_time, "04:00");
  assert.equal(planned.run.schedule.timezone, "Asia/Shanghai");
  assert.equal(planned.run.initial_backfill_start, "2026-03-01");
  assert.deepEqual(planned.run.source_kinds, SOURCE_KINDS);
  assert.equal(planned.run.pipeline_runner, false);
  assert.equal(planned.run.service_restart_required, false);
  assert.equal(planned.run.remote_writes_enabled, false);
  assert.ok(planned.items.every((item) => item.side_effect === "local_read" || item.side_effect === "local_derived_write"));
});

test("maintenance scheduler entry creates daily 04:00 safe-local evidence and ledger event", async () => {
  const runMaintenanceScheduler = requireApi("runMaintenanceScheduler");
  const home = await mkdtemp(join(tmpdir(), "hw-maintain-scheduler-home-"));
  const result = await runMaintenanceScheduler({
    home_dir: home,
    fixture_root: fixtureRoot,
    source_kinds: SOURCE_KINDS,
    mode: "dry-run",
  }, { now: "2026-05-20T04:00:00+08:00" });

  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.scheduler.status, "completed");
  assert.equal(result.scheduler.schedule.local_time, "04:00");
  assert.equal(result.scheduler.schedule.timezone, "Asia/Shanghai");
  assert.equal(result.run.run_type, "global_consolidation");
  assert.equal(result.run.pipeline_runner, false);
  assert.equal(result.run.remote_writes_enabled, false);
  assert.equal(result.notion_projection.remote_writes_enabled, false);
  assert.equal(result.notion_projection.apply_required, false);
  assert.ok(result.evidence_paths.run.endsWith("mr-global-consolidation-20260520.yaml"));
  assert.ok(result.evidence_paths.outputs.endsWith("mr-global-consolidation-20260520-outputs.yaml"));
  assert.ok(result.evidence_paths.notion_dry_run.endsWith("mr-global-consolidation-20260520-notion-dry-run.yaml"));
  assert.match(await readFile(result.evidence_paths.outputs, "utf8"), /knowledge_candidates/);
  const events = await readJsonlEvents(result.ledger_path);
  assert.equal(events.length, 1);
  assert.equal(events[0].event_type, "global_consolidation_scheduled");
  assert.equal(events[0].metadata.remote_writes_enabled, false);
  assert.equal(events[0].metadata.apply_required, false);
  assert.equal(result.scheduler.status, "completed");
  await assertCompactSummary(result.ledger_path, {
    event_count: 1,
    latest_event_id: events[0].id,
  });
});

test("CLI maintain-scheduler dry-run is a real cron-callable entry and does not require remote writes", async () => {
  const home = await mkdtemp(join(tmpdir(), "hw-maintain-scheduler-cli-home-"));
  const output = execFileSync(process.execPath, [
    "cli/bin/hypo-workflow",
    "maintain-scheduler",
    "--home",
    home,
    "--fixture-root",
    fixtureRoot,
    "--now",
    "2026-05-20T04:00:00+08:00",
    "--dry-run",
  ], {
    cwd: ".",
    encoding: "utf8",
  });

  assert.match(output, /global_consolidation/);
  assert.match(output, /04:00 Asia\/Shanghai/);
  assert.match(output, /remote_writes_enabled=false/);
  assert.match(output, /crontab/);
  const events = await readJsonlEvents(join(home, ".hypo-workflow", "maintenance", "ledger.jsonl"));
  assert.equal(events.at(-1).event_type, "global_consolidation_scheduled");
  assert.equal(events.at(-1).metadata.remote_writes_enabled, false);
  assert.equal(events.at(-1).metadata.apply_required, false);
});

test("global consolidation outputs Chinese sedimentation candidates after redaction and sensitivity classification", async () => {
  const discoverConsolidationSources = requireApi("discoverConsolidationSources");
  const generateGlobalConsolidationOutputs = requireApi("generateGlobalConsolidationOutputs");

  const sources = await discoverConsolidationSources({
    fixture_root: fixtureRoot,
    source_kinds: SOURCE_KINDS,
    safe_local_only: true,
  }, { now: "2026-05-19T04:00:00+08:00" });
  const outputs = generateGlobalConsolidationOutputs({
    sources,
    run_id: "mr-global-consolidation-20260519",
    language: "zh-CN",
  }, { now: "2026-05-19T04:05:00+08:00" });

  assert.equal(outputs.language, "zh-CN");
  assert.equal(outputs.redaction.raw_secret_seen, true);
  assert.equal(outputs.redaction.raw_secret_recorded, false);
  assert.ok(outputs.summary.includes("知识"));
  assert.ok(outputs.summary.includes("规则") || outputs.summary.includes("习惯"));
  assert.ok(outputs.summary.includes("模板"));
  assert.ok(outputs.summary.includes("项目关系"));
  assert.ok(outputs.summary.includes("基础设施"));

  for (const field of CANDIDATE_FIELDS) {
    assert.ok(Array.isArray(outputs[field]), `${field} must be an array`);
    assert.ok(outputs[field].length > 0, `${field} should include at least one candidate`);
    for (const candidate of outputs[field]) {
      assert.equal(candidate.language, "zh-CN");
      assert.equal(candidate.authority, "non_authoritative");
      assert.equal(candidate.status, "pending_review");
      assert.match(candidate.title, /[\u4e00-\u9fff]/, `${field} title should be Chinese user-readable text`);
      assert.match(candidate.summary, /[\u4e00-\u9fff]/, `${field} summary should be Chinese user-readable text`);
      assert.deepEqual(candidate.sensitivity, {
        raw_secret_seen: true,
        raw_secret_recorded: false,
        classification: "redacted_internal",
      });
    }
  }

  const serialized = JSON.stringify(outputs);
  assert.doesNotMatch(serialized, /sk-codex-fixture-secret/);
  assert.doesNotMatch(serialized, /opencode-raw-token/);
  assert.doesNotMatch(serialized, /hunter2-must-not-leak/);
  assert.doesNotMatch(serialized, /notion-fixture-token-must-not-leak/);
  assert.doesNotMatch(serialized, /Authorization: Bearer|password=|api_key=sk-|token=notion/i);
});

test("Notion consolidation projection is dry-run content only and never invokes remote write/apply methods", () => {
  const projectConsolidationToNotionDryRun = requireApi("projectConsolidationToNotionDryRun");
  const client = assertReadOnlyNotionClient();
  const outputs = consolidationOutputsFixture();

  const projection = projectConsolidationToNotionDryRun({
    outputs,
    notion: {
      target_ref: { page_id: "notion-global-consolidation" },
      capabilities: {
        read: true,
        write: false,
        create: false,
        update: false,
        delete: false,
      },
      client,
    },
  }, { now: "2026-05-19T04:10:00+08:00", dryRun: true });

  assert.equal(projection.mode, "dry-run");
  assert.equal(projection.remote_writes_enabled, false);
  assert.equal(projection.apply_required, false);
  assert.ok(Array.isArray(projection.payload.blocks));
  assert.ok(projection.payload.blocks.length >= CANDIDATE_FIELDS.length);
  assert.ok(projection.operations.every((operation) => operation.action === "dry-run"));
  assert.equal(client.writeCalls.length, 0);

  const serialized = JSON.stringify(projection);
  assert.match(serialized, /知识沉淀/);
  assert.match(serialized, /规则习惯/);
  assert.match(serialized, /模板沉淀/);
  assert.match(serialized, /项目关系/);
  assert.match(serialized, /基础设施/);
  assert.doesNotMatch(serialized, /raw-output-token|sk-output-secret|Authorization: Bearer/i);
});

function requireApi(name) {
  assert.equal(typeof api[name], "function", `expected ${name} to be exported from ../src/index.js`);
  return api[name];
}

async function readJsonlEvents(file) {
  assert.match(file, /\.jsonl$/, `${file} must be a JSONL authority file`);
  const source = await readFile(file, "utf8");
  return source.trimEnd().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

async function assertCompactSummary(jsonlPath, expected) {
  const summaryPath = jsonlPath.replace(/\.jsonl$/, ".summary.yaml");
  const summary = parseYaml(await readFile(summaryPath, "utf8"));
  assert.equal(summary.authority, "jsonl");
  assert.equal(summary.authority_path, jsonlPath);
  assert.equal(summary.event_count, expected.event_count);
  assert.equal(summary.latest_event_id, expected.latest_event_id);
  assert.equal(summary.events, undefined, "compact summary must not be the maintenance write authority");
}

function assertReadOnlyNotionClient() {
  const writeCalls = [];
  return {
    writeCalls,
    async appendBlock(...args) {
      writeCalls.push(["appendBlock", ...args]);
      throw new Error("write method must not be called during consolidation dry-run");
    },
    async updateBlock(...args) {
      writeCalls.push(["updateBlock", ...args]);
      throw new Error("write method must not be called during consolidation dry-run");
    },
    async createPage(...args) {
      writeCalls.push(["createPage", ...args]);
      throw new Error("write method must not be called during consolidation dry-run");
    },
    async apply(...args) {
      writeCalls.push(["apply", ...args]);
      throw new Error("apply must not be called during consolidation dry-run");
    },
  };
}

function consolidationOutputsFixture() {
  return {
    language: "zh-CN",
    summary: "知识、规则习惯、模板、项目关系、基础设施候选已生成。token=raw-output-token",
    knowledge_candidates: [candidate("知识沉淀", "每日 04:00 维护运行应汇总聊天记录。")],
    rule_habit_candidates: [candidate("规则习惯", "全局沉淀输出前必须先脱敏。")],
    template_candidates: [candidate("模板沉淀", "历史回填分片采用可恢复 cursor。")],
    project_relation_candidates: [candidate("项目关系", "会话来源与项目对象需要建立 relation candidates。")],
    infrastructure_candidates: [candidate("基础设施", "Notion 投影保持 dry-run，不自动 apply。")],
  };
}

function candidate(title, summary) {
  return {
    title,
    summary: `${summary} api_key=sk-output-secret`,
    language: "zh-CN",
    authority: "non_authoritative",
    status: "pending_review",
    sensitivity: {
      raw_secret_seen: true,
      raw_secret_recorded: false,
      classification: "redacted_internal",
    },
  };
}
