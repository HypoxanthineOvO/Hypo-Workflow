import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  decideOpenCodePermission,
  loadKnowledgeRecords,
  parseYaml,
  renderKnowledgeCompact,
  shouldOpenCodeAutoContinue,
} from "../src/index.js";

test("F001 gate has a real Knowledge Ledger record and generated context", async () => {
  const records = await loadKnowledgeRecords(".");
  const gateRecord = records.find((record) =>
    record.type === "milestone" &&
    record.source?.cycle === "C4" &&
    record.source?.feature === "F001" &&
    record.source?.milestone === "M05"
  );

  assert.ok(gateRecord, "missing C4/M05 Knowledge Ledger record for F001 gate");
  assert.match(gateRecord.summary, /F001.*gate|Knowledge.*OpenCode/i);
  assert.deepEqual(gateRecord.categories, [
    "dependencies",
    "references",
    "pitfalls",
    "decisions",
    "config-notes",
  ]);
  assert.deepEqual(gateRecord.tags, ["f001", "knowledge", "opencode", "gate"]);
  assert.deepEqual(gateRecord.refs.files, [
    "core/src/knowledge/index.js",
    "core/src/opencode-hooks/index.js",
    "hooks/session-start.sh",
    "hooks/stop-check.sh",
    ".opencode/runtime/hypo-workflow-hooks.js",
  ]);

  const { content: compact } = await renderKnowledgeCompact(".", { records });
  assert.match(compact, new RegExp(gateRecord.id));
  assert.match(compact, /F001 Knowledge and OpenCode integration gate/);

  const decisions = parseYaml(await readFile(".pipeline/knowledge/index/decisions.yaml", "utf8"));
  assert.ok(decisions.entries.some((entry) => entry.record_id === gateRecord.id && entry.source === "C4/M05"));

  const configNotes = parseYaml(await readFile(".pipeline/knowledge/index/config-notes.yaml", "utf8"));
  assert.ok(configNotes.entries.some((entry) => entry.record_id === gateRecord.id && entry.items.some((item) =>
    item.key === "knowledge.loading.records" &&
    item.value === false
  )));
});

test("F001 gate OpenCode smoke validates generated runtime policy surfaces", async () => {
  const metadata = JSON.parse(await readFile(".opencode/hypo-workflow.json", "utf8"));
  const runtime = await readFile(".opencode/runtime/hypo-workflow-hooks.js", "utf8");
  const plugin = await readFile(".opencode/plugins/hypo-workflow.ts", "utf8");

  assert.equal(metadata.auto_continue.mode, "safe");
  assert.equal(shouldOpenCodeAutoContinue({
    mode: metadata.auto_continue.mode,
    testsPassed: true,
    errorRules: false,
    interactiveGateOpen: false,
    protectedFileDirty: false,
  }), true);

  assert.equal(decideOpenCodePermission({ args: { path: ".pipeline/state.yaml" } }).status, "deny");
  assert.equal(decideOpenCodePermission({ args: { path: ".pipeline/knowledge/records/C4-M05.yaml" } }).status, "allow");
  assert.equal(decideOpenCodePermission({ args: { path: ".pipeline/config.yaml" } }).status, "ask");

  assert.match(runtime, /export function decideOpenCodePermission/);
  assert.match(runtime, /\.pipeline\/knowledge\//);
  assert.match(plugin, /permission\.ask/);
  assert.match(plugin, /shouldOpenCodeAutoContinue/);
});
