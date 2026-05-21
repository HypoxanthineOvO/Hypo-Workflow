import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseYaml } from "../src/config/index.js";
import * as api from "../src/index.js";

test("project-events ledger emits artifact.ready with local append-only side effects", async () => {
  const emitProjectEvent = requireApi("emitProjectEvent");
  const home = await mkdtemp(join(tmpdir(), "hw-project-events-home-"));

  const result = await emitProjectEvent({
    home_dir: home,
    event_type: "artifact.ready",
    source_project: "hypo-info-v2",
    target_project: "hypo-writer",
    object_ref: "http://127.0.0.1:18000/api/exports/writer/news?topic=ai-news&date=2026-05-21&limit=30",
    summary: "Hypo-Info-V2 writer news artifact is ready.",
    evidence_refs: ["/tmp/news.log"],
    metadata: {
      topic: "ai-news",
      report_date: "2026-05-21",
      input_url: "http://127.0.0.1:18000/api/exports/writer/news?topic=ai-news&date=2026-05-21&limit=30",
    },
  }, { now: "2026-05-21T12:00:00+08:00" });

  assert.equal(result.ok, true);
  assert.equal(result.event.event_type, "artifact.ready");
  assert.equal(result.event.source_project, "hypo-info-v2");
  assert.equal(result.event.target_project, "hypo-writer");
  assert.equal(result.event.remote_writes_enabled, false);
  assert.equal(result.event.external_actions_enabled, false);
  assert.equal(result.ledger_path, join(home, ".hypo-workflow", "project-events", "ledger.jsonl"));
  const events = await readJsonlEvents(result.ledger_path);
  assert.deepEqual(events.map((event) => event.event_type), ["artifact.ready"]);
  assert.equal(events[0].source_project, "hypo-info-v2");
  assert.equal(events[0].target_project, "hypo-writer");
  assert.equal(events[0].remote_writes_enabled, false);
  assert.equal(events[0].external_actions_enabled, false);
  assertSecretSafe(events);
  await assertCompactSummary(result.ledger_path, {
    event_count: 1,
    latest_event_id: events[0].id,
  });
});

test("project-events router converts artifact.ready into writer.issue.ready and dry-run notification", async () => {
  const emitProjectEvent = requireApi("emitProjectEvent");
  const routeProjectEvent = requireApi("routeProjectEvent");
  const home = await mkdtemp(join(tmpdir(), "hw-project-route-home-"));
  const artifact = await emitProjectEvent({
    home_dir: home,
    event_type: "artifact.ready",
    source_project: "hypo-info-v2",
    target_project: "hypo-writer",
    object_ref: "http://127.0.0.1:18000/api/exports/writer/news?topic=ai-news&date=2026-05-21&limit=30",
    metadata: {
      topic: "ai-news",
      report_date: "2026-05-21",
      input_url: "http://127.0.0.1:18000/api/exports/writer/news?topic=ai-news&date=2026-05-21&limit=30",
    },
  }, { now: "2026-05-21T12:00:00+08:00" });

  const calls = [];
  const result = await routeProjectEvent({
    home_dir: home,
    event_id: artifact.event.id,
    route: "writer.news.issue",
    writer_root: "/tmp/Hypo-Writer",
  }, {
    now: "2026-05-21T12:01:00+08:00",
    runner: async (command, args, options) => {
      calls.push({ command, args, options });
      return { status: 0, stdout: "generated", stderr: "" };
    },
    spawn: async () => {
      throw new Error("dry-run notification must not spawn Hypo-Claw");
    },
  });

  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, process.execPath);
  assert.equal(calls[0].options.cwd, "/tmp/Hypo-Writer");
  assert.deepEqual(calls[0].args.slice(0, 5), ["--import", "tsx", "manager/src/cli/index.ts", "news", "generate"]);
  assert.equal(result.writer_issue_event.event_type, "writer.issue.ready");
  assert.equal(result.writer_issue_event.object_ref, "/tmp/Hypo-Writer/workspace/series/news-pipeline/issues/ai-news/2026-05-21");
  assert.equal(result.writer_issue_event.metadata.remote_publish, false);
  assert.equal(result.writer_issue_event.metadata.wechat_draft_created, false);
  assert.equal(result.notification.status, "dry_run");
  assert.equal(result.notification.external_contacted, false);
  assert.match(result.notification.message, /Writer Issue Ready/);
  const events = await readJsonlEvents(result.ledger_path);
  assert.deepEqual(events.map((event) => event.event_type), ["artifact.ready", "writer.issue.ready"]);
  assert.equal(events[1].metadata.remote_publish, false);
  assert.equal(events[1].metadata.wechat_draft_created, false);
  assertSecretSafe(events);
});

test("project-events router notify mode requires confirmation before Hypo-Claw spawn", async () => {
  const emitProjectEvent = requireApi("emitProjectEvent");
  const routeProjectEvent = requireApi("routeProjectEvent");
  const home = await mkdtemp(join(tmpdir(), "hw-project-notify-home-"));
  await emitProjectEvent({
    home_dir: home,
    event_type: "artifact.ready",
    source_project: "hypo-info-v2",
    target_project: "hypo-writer",
    object_ref: "http://127.0.0.1:18000/api/exports/writer/news?topic=ai-news&date=2026-05-21&limit=30",
    metadata: {
      topic: "ai-news",
      report_date: "2026-05-21",
      input_url: "http://127.0.0.1:18000/api/exports/writer/news?topic=ai-news&date=2026-05-21&limit=30",
    },
  }, { now: "2026-05-21T12:00:00+08:00" });

  const result = await routeProjectEvent({
    home_dir: home,
    notify: true,
    dry_run: true,
  }, {
    now: "2026-05-21T12:01:00+08:00",
    spawn: async () => {
      throw new Error("unconfirmed notify must not spawn");
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.notification.status, "blocked");
  assert.equal(result.notification.confirmation_required, true);
  assert.equal(result.notification.external_contacted, false);
});

test("CLI project-events emit and route are cron-callable with dry-run route", async () => {
  const home = await mkdtemp(join(tmpdir(), "hw-project-events-cli-home-"));
  const emitOutput = execFileSync(process.execPath, [
    "cli/bin/hypo-workflow",
    "project-events",
    "emit",
    "--home",
    home,
    "--event-type",
    "artifact.ready",
    "--source-project",
    "hypo-info-v2",
    "--target-project",
    "hypo-writer",
    "--object-ref",
    "http://127.0.0.1:18000/api/exports/writer/news?topic=ai-news&date=2026-05-21&limit=30",
    "--metadata",
    "topic=ai-news",
    "--metadata",
    "report_date=2026-05-21",
    "--metadata",
    "input_url=http://127.0.0.1:18000/api/exports/writer/news?topic=ai-news&date=2026-05-21&limit=30",
    "--now",
    "2026-05-21T12:00:00+08:00",
  ], {
    cwd: ".",
    encoding: "utf8",
  });
  assert.match(emitOutput, /Project event emitted: artifact\.ready/);

  const routeOutput = execFileSync(process.execPath, [
    "cli/bin/hypo-workflow",
    "project-events",
    "route",
    "--home",
    home,
    "--route",
    "writer.news.issue",
    "--dry-run",
    "--now",
    "2026-05-21T12:01:00+08:00",
  ], {
    cwd: ".",
    encoding: "utf8",
  });

  assert.match(routeOutput, /Project event routed:/);
  assert.match(routeOutput, /Writer issue:/);
  assert.match(routeOutput, /Notification: dry_run external_contacted=false/);
  const ledgerPath = join(home, ".hypo-workflow", "project-events", "ledger.jsonl");
  const events = await readJsonlEvents(ledgerPath);
  assert.deepEqual(events.map((event) => event.event_type), ["artifact.ready", "writer.issue.ready"]);
  assert.equal(events[1].external_actions_enabled, false);
});

test("news noon scheduler defaults to confirmed QQ notify and requires explicit opt-out", async () => {
  const script = await readFile("scripts/news-noon-scheduler.sh", "utf8");

  assert.match(script, /NEWS_NOON_NOTIFY="\$\{NEWS_NOON_NOTIFY:-true\}"/);
  assert.match(script, /NEWS_NOON_CONFIRMED="\$\{NEWS_NOON_CONFIRMED:-true\}"/);
  assert.match(script, /ROUTE_FLAGS\+=\(--notify\)/);
  assert.match(script, /ROUTE_FLAGS\+=\(--confirmed\)/);
  assert.match(script, /NEWS_NOON_NOTIFY"\s*!=\s*"0"/);
  assert.match(script, /NEWS_NOON_NOTIFY"\s*!=\s*"false"/);
  assert.doesNotMatch(script, /NEWS_NOON_NOTIFY:-false/);
  assert.doesNotMatch(script, /NEWS_NOON_CONFIRMED:-false/);
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
  assert.equal(summary.events, undefined, "compact summary must not be the write authority");
}

function assertSecretSafe(value) {
  assert.doesNotMatch(JSON.stringify(value), /\btoken\b|password|api_key/i);
}
