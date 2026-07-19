import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  decideOpenCodePermission,
  loadKnowledgeRecords,
  parseYaml,
  renderKnowledgeCompact,
  shouldOpenCodeAutoContinue,
} from "../src/index.js";
import { temporaryCurrentWorkspace, writeText } from "./fixtures/c21-m2/helpers.js";

test("F001 gate has a real Knowledge Ledger record and generated context", async (t) => {
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

  const mixedRoot = await temporaryCurrentWorkspace(t, "hw-f001-knowledge-mixed-", {
    withLegacySentinels: true,
  });
  const liveCompactPath = join(mixedRoot, ".pipeline/knowledge/knowledge.compact.md");
  await writeText(liveCompactPath, "existing compact fixture\n");
  const liveCompactBefore = await readFile(liveCompactPath);
  const liveCompactStatBefore = await stat(liveCompactPath, { bigint: true });
  await assert.rejects(
    renderKnowledgeCompact(mixedRoot, { records }),
    {
      code: "ERR_LEGACY_WORKSPACE_WRITE_BLOCKED",
      message: /legacy\.knowledge.*mixed_current_with_legacy_residue/,
    },
  );
  const liveCompactAfter = await readFile(liveCompactPath);
  const liveCompactStatAfter = await stat(liveCompactPath, { bigint: true });
  assert.deepEqual(liveCompactAfter, liveCompactBefore, "blocked live render must not change compact bytes");
  assert.deepEqual(
    {
      size: liveCompactStatAfter.size,
      mtimeNs: liveCompactStatAfter.mtimeNs,
      ctimeNs: liveCompactStatAfter.ctimeNs,
    },
    {
      size: liveCompactStatBefore.size,
      mtimeNs: liveCompactStatBefore.mtimeNs,
      ctimeNs: liveCompactStatBefore.ctimeNs,
    },
    "blocked live render must not write the compact file",
  );

  const legacyRoot = await mkdtemp(join(tmpdir(), "hw-f001-knowledge-gate-"));
  t.after(() => rm(legacyRoot, { recursive: true, force: true }));
  await mkdir(join(legacyRoot, ".pipeline/knowledge"), { recursive: true });
  const { path: compactPath, content: compact } = await renderKnowledgeCompact(legacyRoot, { records });
  assert.equal(compactPath, join(legacyRoot, ".pipeline/knowledge/knowledge.compact.md"));
  assert.equal(await readFile(compactPath, "utf8"), compact);
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

  assert.equal(decideOpenCodePermission({ args: { path: ".pipeline/state.yaml" } }).status, "allow");
  assert.equal(decideOpenCodePermission({ args: { path: ".pipeline/knowledge/records/C4-M05.yaml" } }).status, "allow");
  assert.equal(decideOpenCodePermission({ args: { path: ".pipeline/config.yaml" } }).status, "allow");

  assert.match(runtime, /export function decideOpenCodePermission/);
  assert.match(runtime, /\.pipeline\/knowledge\//);
  assert.match(plugin, /permission\.ask/);
  assert.match(plugin, /shouldOpenCodeAutoContinue/);
});
