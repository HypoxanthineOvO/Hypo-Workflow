import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseFrontmatter, parseYaml } from "../src/serialization/index.js";
import {
  activateHistoryRefresh,
  buildHistoryRefreshPreview,
  treeDigest,
  writeHistoryRefreshPreview,
} from "../src/history-refresh/index.js";

test("History Refresh builds deterministic semantic previews from mixed legacy quality", async (t) => {
  const root = await historyFixture(t);
  const first = await buildHistoryRefreshPreview(root);
  const second = await buildHistoryRefreshPreview(root);

  assert.equal(first.inventory.archived_cycles, 2);
  assert.equal(first.inventory.memory_records, 1);
  assert.equal(first.files.size, 16);
  assert.deepEqual([...first.files], [...second.files]);
  assert.ok(first.uncertainties.some((item) => item.includes("invalid YAML")));
  assert.ok(first.uncertainties.some((item) => item.includes("pending_acceptance")));

  const mapping = parseYaml(first.files.get("mapping.yaml"));
  assert.equal(mapping.activation_authorized, false);
  assert.equal(mapping.legacy_policy, "read-only-preserve");
  assert.equal(mapping.cycles.length, 2);
  assert.equal(mapping.cycles.find((item) => item.source.includes("C002-broken")).confidence, "review");

  const plan = parseFrontmatter(first.files.get("proposed/cycles/C001-first/PLAN.md"));
  const progress = parseFrontmatter(first.files.get("proposed/cycles/C001-first/PROGRESS.md"));
  assert.equal(plan.attributes.progress, "PROGRESS.md");
  assert.equal(progress.attributes.plan, "PLAN.md");
  assert.deepEqual(tableIds(plan.body), tableIds(progress.body));
  assert.match(plan.body, /M1[^\n]*prepare\.report\.md/);
  assert.match(plan.body, /M2[^\n]*verify\.report\.md/);
});

test("History Refresh writes beside legacy history, is idempotent, and preserves source bytes", async (t) => {
  const root = await historyFixture(t);
  const archiveRoot = join(root, ".pipeline/archives");
  const before = await treeDigest(archiveRoot);

  const written = await writeHistoryRefreshPreview(root);
  assert.equal(written.status, "written");
  assert.match(await readFile(join(root, written.output, "REPORT.md"), "utf8"), /不具备激活授权/);
  assert.equal(await treeDigest(archiveRoot), before);

  const repeated = await writeHistoryRefreshPreview(root);
  assert.equal(repeated.status, "unchanged");
  assert.equal(await treeDigest(archiveRoot), before);
});

test("History Refresh refuses to overwrite a reviewed preview after source changes", async (t) => {
  const root = await historyFixture(t);
  await writeHistoryRefreshPreview(root);
  const summary = join(root, ".pipeline/archives/C001-first/summary.md");
  await writeFile(summary, "# Changed legacy summary\n", "utf8");

  await assert.rejects(
    () => writeHistoryRefreshPreview(root),
    /already exists with different content/,
  );
});

test("History Refresh activation requires explicit approval", async (t) => {
  const root = await historyFixture(t);
  await writeHistoryRefreshPreview(root);

  await assert.rejects(
    () => activateHistoryRefresh(root),
    /requires explicit approved:true/,
  );
});

test("History Refresh activation rejects a stale reviewed preview", async (t) => {
  const root = await historyFixture(t);
  await writeHistoryRefreshPreview(root);
  await writeFile(
    join(root, ".pipeline/archives/C001-first/summary.md"),
    "# Changed after review\n",
    "utf8",
  );

  await assert.rejects(
    () => activateHistoryRefresh(root, { approved: true }),
    /preview no longer matches/,
  );
});

test("History Refresh activation stops before writes when a target Cycle conflicts", async (t) => {
  const root = await historyFixture(t);
  await writeHistoryRefreshPreview(root);
  await writeText(
    join(root, ".pipeline/cycles/C001-first/PLAN.md"),
    "# Existing Cycle\n",
  );

  await assert.rejects(
    () => activateHistoryRefresh(root, { approved: true }),
    /target Cycle conflicts/,
  );
  await assert.rejects(
    () => readFile(join(root, ".pipeline/INDEX.md"), "utf8"),
    /ENOENT/,
  );
});

test("History Refresh activates reviewed history once without changing legacy bytes", async (t) => {
  const root = await historyFixture(t);
  const archiveRoot = join(root, ".pipeline/archives");
  const manifestPath = join(root, ".pipeline/manifest.yaml");
  const manifest = "schema_version: 1\nactive_delivery: live\n";
  await writeText(manifestPath, manifest);
  await writeHistoryRefreshPreview(root);
  const archiveBefore = await treeDigest(archiveRoot);

  const activated = await activateHistoryRefresh(root, { approved: true });
  assert.equal(activated.status, "activated");
  assert.equal(activated.activated_cycles, 2);
  assert.equal(activated.created_cycles, 2);
  assert.equal(activated.marker, ".pipeline/history-refresh/C022-activation.md");
  assert.equal(activated.manifest_changed, false);
  assert.equal(activated.legacy_preserved, true);
  assert.equal(await treeDigest(archiveRoot), archiveBefore);
  assert.equal(await readFile(manifestPath, "utf8"), manifest);

  const plan = parseFrontmatter(
    await readFile(join(root, ".pipeline/cycles/C001-first/PLAN.md"), "utf8"),
  );
  const progress = parseFrontmatter(
    await readFile(join(root, ".pipeline/cycles/C001-first/PROGRESS.md"), "utf8"),
  );
  assert.deepEqual(tableIds(plan.body), tableIds(progress.body));
  assert.match(await readFile(join(root, ".pipeline/cycles/INDEX.md"), "utf8"), /C001-first/);
  assert.match(
    await readFile(join(root, ".pipeline/memory/HISTORY-REFRESH-INDEX.md"), "utf8"),
    /keep-history/,
  );
  assert.match(
    await readFile(join(root, ".pipeline/legacy/INDEX.md"), "utf8"),
    /pending_acceptance/,
  );
  assert.match(
    await readFile(join(root, ".pipeline/experiments/INDEX.md"), "utf8"),
    /没有可高置信识别为 Experiment/,
  );

  const repeated = await activateHistoryRefresh(root, { approved: true });
  assert.equal(repeated.status, "unchanged");
  assert.equal(await treeDigest(archiveRoot), archiveBefore);
  assert.equal(await readFile(manifestPath, "utf8"), manifest);
});

async function historyFixture(t) {
  const root = await mkdtemp(join(tmpdir(), "hw-history-refresh-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeCycle(root, "C001-first", {
    cycle: "cycle:\n  number: 1\n  name: First Cycle\n  status: completed\n  summary: First result.\n",
    state: "pipeline:\n  status: completed\nmilestones:\n  - id: M1\n    name: Prepare\n    prompt_file: .pipeline/prompts/prepare.md\n    status: done\n  - id: M2\n    name: Verify\n    prompt_file: .pipeline/prompts/verify.md\n    status: done\n",
    summary: "# First Summary\n\nFirst result passed.\n",
    progress: "# First Progress\n",
    report: "# Prepare report\n",
  });
  await writeText(join(root, ".pipeline/archives/C001-first/reports/verify.report.md"), "# Verify report\n");
  await writeCycle(root, "C002-broken", {
    cycle: "cycle:\n  number: 2\n  name: Broken Cycle\n  status: completed\n  summary: Recovered from other sources.\n",
    state: "history:\n  warnings:\n    - `unquoted legacy warning`\n",
    progress: "# Broken Progress\n",
    report: "# Recovered report\n",
  });
  await writeText(join(root, ".pipeline/memory/records/project/example.md"), "---\nkind: decision\nname: keep-history\nscope: project\nstatus: active\n---\n\n# Keep history\n");
  await writeText(join(root, ".pipeline/knowledge/knowledge.compact.md"), "# Legacy knowledge\n");
  await writeText(join(root, ".pipeline/chats/mini/state.yaml"), "status: closed\n");
  await writeText(join(root, ".pipeline/runtime/objects/delivery/live/runtime.yaml"), "delivery_kind: goal\nobject_ref:\n  id: live\n  kind: delivery\nstatus: pending_acceptance\n");
  return root;
}

async function writeCycle(root, id, files) {
  const base = join(root, ".pipeline/archives", id);
  await writeText(join(base, "cycle.yaml"), files.cycle);
  await writeText(join(base, "state.yaml"), files.state);
  if (files.summary) await writeText(join(base, "summary.md"), files.summary);
  if (files.progress) await writeText(join(base, "PROGRESS.md"), files.progress);
  if (files.report) await writeText(join(base, "reports/prepare.report.md"), files.report);
}

async function writeText(path, content) {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content, "utf8");
}

function tableIds(body) {
  return [...body.matchAll(/^\| `(M\d+|S\d+)` \|/gm)].map((match) => match[1]);
}
