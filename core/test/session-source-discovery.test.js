import test from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as api from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = join(__dirname, "fixtures", "global-consolidation");
const REQUIRED_SOURCE_KINDS = Object.freeze([
  "codex_sessions",
  "opencode_sessions",
  "claude_sessions",
  "notion_pages",
]);

test("global consolidation source discovery exposes safe local probes for all configured source kinds", async () => {
  const discoverConsolidationSources = requireApi("discoverConsolidationSources");

  const result = await discoverConsolidationSources({
    roots: {
      codex_sessions: join(fixtureRoot, "codex_sessions"),
      opencode_sessions: join(fixtureRoot, "opencode_sessions"),
      claude_sessions: join(fixtureRoot, "claude_sessions"),
      notion_pages: join(fixtureRoot, "notion_pages"),
    },
    safe_local_only: true,
  }, { now: "2026-05-19T04:00:00+08:00" });

  assert.deepEqual(result.sources.map((source) => source.kind).sort(), [...REQUIRED_SOURCE_KINDS].sort());
  assert.equal(result.safe_local_only, true);
  assert.equal(result.remote_writes_enabled, false);
  assert.equal(result.network_enabled, false);
  assert.ok(result.probes.every((probe) => probe.side_effect === "local_read"));
  assert.ok(result.sources.every((source) => source.reader === "fixture" || source.reader === "local_probe"));
  assert.ok(result.sources.every((source) => Array.isArray(source.records) && source.records.length > 0));
});

test("fixture readers normalize Codex, OpenCode, Claude, and Notion records without requiring live environment paths", async () => {
  const discoverConsolidationSources = requireApi("discoverConsolidationSources");

  const result = await discoverConsolidationSources({
    fixture_root: fixtureRoot,
    source_kinds: REQUIRED_SOURCE_KINDS,
    safe_local_only: true,
  }, { now: "2026-05-19T04:00:00+08:00" });

  const records = result.sources.flatMap((source) => source.records.map((record) => [source.kind, record]));
  assert.equal(records.length, 4);

  for (const [kind, record] of records) {
    assert.equal(record.source_kind, kind);
    assert.match(record.source_ref, new RegExp(`^${kind}:`));
    assert.equal(typeof record.created_at, "string");
    assert.ok(Number.isFinite(Date.parse(record.created_at)), `${kind} created_at must be parseable`);
    assert.equal(record.safe_local_fixture, true);
    assert.ok(["json", "jsonl", "markdown"].includes(record.format));
    assert.ok(Array.isArray(record.messages) || Array.isArray(record.blocks));
  }

  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /https?:\/\//i);
  assert.doesNotMatch(serialized, /appendBlock|updateBlock|createPage|deleteBlock|fetch\(/);
});

test("source discovery classifies sensitive input before returning records to consolidation", async () => {
  const discoverConsolidationSources = requireApi("discoverConsolidationSources");

  const result = await discoverConsolidationSources({
    fixture_root: fixtureRoot,
    source_kinds: REQUIRED_SOURCE_KINDS,
    safe_local_only: true,
  }, { now: "2026-05-19T04:00:00+08:00" });

  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /sk-codex-fixture-secret/);
  assert.doesNotMatch(serialized, /opencode-raw-token/);
  assert.doesNotMatch(serialized, /hunter2-must-not-leak/);
  assert.doesNotMatch(serialized, /notion-fixture-token-must-not-leak/);
  assert.match(serialized, /\[REDACTED\]/);

  assert.ok(result.sources.some((source) => source.sensitivity?.raw_secret_seen === true));
  assert.ok(result.sources.every((source) => source.sensitivity?.raw_secret_recorded === false));
});

function requireApi(name) {
  assert.equal(typeof api[name], "function", `expected ${name} to be exported from ../src/index.js`);
  return api[name];
}
