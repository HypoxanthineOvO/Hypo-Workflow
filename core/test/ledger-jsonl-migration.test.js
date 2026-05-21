import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseYaml } from "../src/config/index.js";
import * as api from "../src/index.js";

const LEDGER_HELPERS = Object.freeze([
  "appendJsonlLedgerEntry",
  "readJsonlLedger",
  "migrateYamlLedgerToJsonl",
  "writeCompactLedgerSummary",
]);

test("shared JSONL ledger helper API is exported from the public core surface", () => {
  for (const name of LEDGER_HELPERS) {
    assert.equal(typeof api[name], "function", `expected ${name} to be exported by core/src/index.js`);
  }
});

test("JSONL ledger append is append-only and every line is independently parseable", async () => {
  const appendJsonlLedgerEntry = requireApi("appendJsonlLedgerEntry");
  const readJsonlLedger = requireApi("readJsonlLedger");
  const root = await mkdtemp(join(tmpdir(), "hw-jsonl-ledger-"));
  const ledgerFile = join(root, "ledger.jsonl");

  await appendJsonlLedgerEntry(ledgerFile, event("evt-001", "first"));
  const firstSnapshot = await readFile(ledgerFile, "utf8");
  const firstStat = await stat(ledgerFile);

  await appendJsonlLedgerEntry(ledgerFile, event("evt-002", "second"));
  const secondSnapshot = await readFile(ledgerFile, "utf8");
  const secondStat = await stat(ledgerFile);

  await appendJsonlLedgerEntry(ledgerFile, event("evt-003", "third"));
  const finalSnapshot = await readFile(ledgerFile, "utf8");
  const finalStat = await stat(ledgerFile);

  assert.ok(secondSnapshot.startsWith(firstSnapshot), "second append must preserve existing bytes at the front");
  assert.ok(finalSnapshot.startsWith(secondSnapshot), "third append must preserve existing bytes at the front");
  assert.ok(secondStat.size > firstStat.size);
  assert.ok(finalStat.size > secondStat.size);

  const lines = finalSnapshot.trimEnd().split("\n");
  assert.deepEqual(lines.map((line) => JSON.parse(line).id), ["evt-001", "evt-002", "evt-003"]);

  const read = await readJsonlLedger(ledgerFile);
  assert.deepEqual(read.events.map((entry) => entry.id), ["evt-001", "evt-002", "evt-003"]);
});

test("YAML ledger migration is idempotent and writes compact deterministic YAML summary", async () => {
  const migrateYamlLedgerToJsonl = requireApi("migrateYamlLedgerToJsonl");
  const readJsonlLedger = requireApi("readJsonlLedger");
  const root = await mkdtemp(join(tmpdir(), "hw-ledger-migration-"));
  const yamlLedger = join(root, "ledger.yaml");
  const jsonlLedger = join(root, "ledger.jsonl");
  const compactSummary = join(root, "ledger.summary.yaml");

  await writeFile(yamlLedger, [
    "schema_version: '1'",
    "events:",
    "  - id: evt-001",
    "    event_type: scan_completed",
    "    timestamp: 2026-05-21T10:00:00+08:00",
    "    summary: first migrated event",
    "  - id: evt-002",
    "    event_type: verify_completed",
    "    timestamp: 2026-05-21T11:00:00+08:00",
    "    summary: second migrated event",
    "",
  ].join("\n"), "utf8");

  const first = await migrateYamlLedgerToJsonl({
    yaml_path: yamlLedger,
    jsonl_path: jsonlLedger,
    compact_summary_path: compactSummary,
  });
  const firstJsonl = await readFile(jsonlLedger, "utf8");
  const firstSummary = await readFile(compactSummary, "utf8");

  const second = await migrateYamlLedgerToJsonl({
    yaml_path: yamlLedger,
    jsonl_path: jsonlLedger,
    compact_summary_path: compactSummary,
  });
  const secondJsonl = await readFile(jsonlLedger, "utf8");
  const secondSummary = await readFile(compactSummary, "utf8");

  assert.equal(secondJsonl, firstJsonl, "second migration must not append duplicate events");
  assert.equal(secondSummary, firstSummary, "compact summary must be deterministic across repeated migration");
  assert.deepEqual((await readJsonlLedger(jsonlLedger)).events.map((entry) => entry.id), ["evt-001", "evt-002"]);
  assert.equal(first.migrated_count, 2);
  assert.equal(second.migrated_count, 0);

  const summary = parseYaml(secondSummary);
  assert.equal(summary.authority, "jsonl");
  assert.equal(summary.authority_path, jsonlLedger);
  assert.equal(summary.event_count, 2);
  assert.equal(summary.latest_event_id, "evt-002");
  assert.deepEqual(summary.event_ids, ["evt-001", "evt-002"]);
});

test("compact YAML summary preserves count/latest/event ids and is regenerated from JSONL", async () => {
  const appendJsonlLedgerEntry = requireApi("appendJsonlLedgerEntry");
  const writeCompactLedgerSummary = requireApi("writeCompactLedgerSummary");
  const root = await mkdtemp(join(tmpdir(), "hw-compact-ledger-"));
  const jsonlLedger = join(root, "maintenance", "ledger.jsonl");
  const compactSummary = join(root, "maintenance", "ledger.summary.yaml");

  await appendJsonlLedgerEntry(jsonlLedger, event("evt-001", "scan_completed"));
  await appendJsonlLedgerEntry(jsonlLedger, event("evt-002", "verify_completed"));
  const first = await writeCompactLedgerSummary({
    jsonl_path: jsonlLedger,
    compact_summary_path: compactSummary,
  });
  const firstText = await readFile(compactSummary, "utf8");

  await writeFile(compactSummary, "events:\n  - id: forged-yaml-authority\n", "utf8");
  const second = await writeCompactLedgerSummary({
    jsonl_path: jsonlLedger,
    compact_summary_path: compactSummary,
  });
  const secondText = await readFile(compactSummary, "utf8");

  assert.equal(secondText, firstText, "summary regeneration must ignore prior summary contents");
  assert.deepEqual(first, second);

  const summary = parseYaml(secondText);
  assert.equal(summary.authority, "jsonl");
  assert.equal(summary.event_count, 2);
  assert.equal(summary.latest_event_id, "evt-002");
  assert.deepEqual(summary.event_ids, ["evt-001", "evt-002"]);
  assert.equal(summary.events, undefined, "compact summary must not be the long-form write authority");
});

test("affected subsystem writes use JSONL ledger authority paths instead of rewriting ledger.yaml", async () => {
  const appendMaintenanceLedgerEvent = requireApi("appendMaintenanceLedgerEvent");
  const emitProjectEvent = requireApi("emitProjectEvent");
  const enqueueProjectStopNotification = requireApi("enqueueProjectStopNotification");
  const runDailyProjectSummaryScheduler = requireApi("runDailyProjectSummaryScheduler");
  const runMaintenanceScheduler = requireApi("runMaintenanceScheduler");
  const root = await mkdtemp(join(tmpdir(), "hw-jsonl-subsystems-"));

  const maintenance = await appendMaintenanceLedgerEvent(root, maintenanceEvent("ml-001"));
  assertJsonlAuthority(maintenance.path, "maintenance ledger");

  const projectEvent = await emitProjectEvent({
    home_dir: root,
    event_type: "artifact.ready",
    source_project: "hypo-info-v2",
    target_project: "hypo-writer",
    object_ref: "local://artifact",
  }, { now: "2026-05-21T12:00:00+08:00" });
  assertJsonlAuthority(projectEvent.ledger_path, "project-events ledger");

  const notification = await enqueueProjectStopNotification(projectStopInput({ home_dir: root }), {
    now: "2026-05-21T12:05:00+08:00",
  });
  assertJsonlAuthority(notification.queue_path, "project-notifications queue ledger");

  const daily = await runDailyProjectSummaryScheduler({
    home_dir: root,
    projects: [],
    mode: "dry-run",
  }, { now: "2026-05-21T00:30:00+08:00" });
  assertJsonlAuthority(daily.ledger_path, "daily project summary ledger");

  const consolidation = await runMaintenanceScheduler({
    home_dir: root,
    source_kinds: [],
    sources: { sources: [] },
    mode: "dry-run",
  }, { now: "2026-05-21T04:00:00+08:00" });
  assertJsonlAuthority(consolidation.ledger_path, "global consolidation ledger");
});

test("core source has no long-term ledger.yaml authority writes and public root has no broad barrel exports", async () => {
  const files = await listSourceFiles("core/src");
  const findings = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const lines = source.split("\n");
    lines.forEach((line, index) => {
      if (file === join("core", "src", "index.js") && /export\s+\*\s+from/.test(line)) {
        findings.push(`${file}:${index + 1}: public root broad barrel export: ${line.trim()}`);
      }
      if (/ledger\.yaml/.test(line) && /(writeFile|writeYaml|ledgerFile|LedgerPath|join\()/i.test(line)) {
        findings.push(`${file}:${index + 1}: possible long-term ledger.yaml write/path authority: ${line.trim()}`);
      }
    });
  }

  assert.deepEqual(findings, [], findings.join("\n"));
});

function requireApi(name) {
  assert.equal(typeof api[name], "function", `expected ${name} to be exported from ../src/index.js`);
  return api[name];
}

function event(id, eventType) {
  return {
    id,
    event_type: eventType,
    timestamp: `2026-05-21T10:00:0${id.slice(-1)}+08:00`,
    summary: `${eventType} summary`,
  };
}

function maintenanceEvent(id) {
  return {
    id,
    queue_item_id: "mq-001",
    object_ref: "hypo-workflow",
    event_type: "scan_completed",
    status: "completed",
    timestamp: "2026-05-21T12:00:00+08:00",
    actor: "agent",
    summary: "Maintenance scan completed.",
    evidence_refs: [],
  };
}

function projectStopInput(overrides = {}) {
  return {
    project: {
      id: "hypo-workflow",
      display_name: "Hypo-Workflow",
      path: "/tmp/Hypo-Workflow",
    },
    source_platform: "codex",
    final_assistant_output: "Final output for local queue.",
    occurred_at: "2026-05-21T12:05:00+08:00",
    terminal_at: "2026-05-21T12:05:00+08:00",
    stop_reason: "completed",
    workflow_state: {
      pipeline: { name: "Hypo-Workflow", status: "completed" },
      current: { phase: "completed", prompt_name: "C17-M5" },
    },
    ...overrides,
  };
}

function assertJsonlAuthority(path, label) {
  assert.equal(typeof path, "string", `${label} should return its authority path`);
  assert.match(path, /\.jsonl$/, `${label} should write to .jsonl authority, got ${path}`);
  assert.doesNotMatch(path, /ledger\.yaml$/, `${label} must not continue using ledger.yaml as write authority`);
}

async function listSourceFiles(root) {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listSourceFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }
  return files.sort();
}
