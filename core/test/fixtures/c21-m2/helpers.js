import assert from "node:assert/strict";
import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { createWorkspaceManifest } from "../../../src/manifest/index.js";
import { parseYaml, stringifyYaml } from "../../../src/serialization/index.js";

export const FIXED_NOW = "2026-07-12T09:00:00+08:00";
export const LATER_NOW = "2026-07-12T09:30:00+08:00";
export const EXPIRED_NOW = "2026-07-12T10:30:00+08:00";

export const LEGACY_SENTINELS = Object.freeze({
  ".pipeline/state.yaml": "legacy-state-sentinel\n",
  ".pipeline/cycle.yaml": "legacy-cycle-sentinel\n",
  ".pipeline/log.yaml": "legacy-log-sentinel\n",
  ".pipeline/knowledge/legacy.md": "legacy-knowledge-sentinel\n",
});

export function fixtureManifest(overrides = {}) {
  return createWorkspaceManifest({
    workspace_id: "m2-fixture-workspace",
    project_id: "m2-fixture-project",
    created_at: FIXED_NOW,
    ...overrides,
  });
}

export async function temporaryCurrentWorkspace(t, prefix, options = {}) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeText(
    join(root, ".pipeline", "manifest.yaml"),
    `${stringifyYaml(fixtureManifest(options.manifest)).trimEnd()}\n`,
  );
  if (options.withLegacySentinels) {
    for (const [path, content] of Object.entries(LEGACY_SENTINELS)) {
      await writeText(join(root, path), content);
    }
  }
  return root;
}

export async function writeText(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

export async function readText(path) {
  return readFile(path, "utf8");
}

export async function readYamlFile(path) {
  return parseYaml(await readText(path));
}

export async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function snapshotTree(root) {
  const entries = [];
  await visit(root, root, entries);
  return entries;
}

export async function listFiles(root) {
  return (await snapshotTree(root))
    .filter((entry) => entry.type === "file")
    .map((entry) => entry.path);
}

export async function fileByteMap(root, pathPrefix = "") {
  const result = new Map();
  for (const entry of await snapshotTree(root)) {
    if (entry.type !== "file" || !entry.path.startsWith(pathPrefix)) continue;
    result.set(entry.path, entry.content);
  }
  return result;
}

export async function captureError(action) {
  try {
    await action();
    return null;
  } catch (error) {
    return error;
  }
}

export async function expectZeroWriteRejection(root, action, pattern) {
  const before = await snapshotTree(root);
  const error = await captureError(action);
  assert.ok(error, "operation must reject");
  if (pattern) assert.match(String(error.message || error), pattern);
  assert.deepEqual(await snapshotTree(root), before, "rejection must happen before any workspace write");
  return error;
}

export async function assertRecoveredWorkspaceMatches(root, before) {
  const after = await snapshotTree(root);
  const allowedEmptyBaseDirectories = new Set([
    ".pipeline/runtime",
    ".pipeline/runtime/transactions",
  ]);
  const transactionDescendants = after.filter((entry) => (
    entry.path.startsWith(".pipeline/runtime/transactions/")
  ));
  assert.deepEqual(
    transactionDescendants,
    [],
    "recovery must remove every transaction marker and private transaction artifact",
  );

  for (const path of allowedEmptyBaseDirectories) {
    const entry = after.find((candidate) => candidate.path === path);
    if (entry) assert.equal(entry.type, "directory", `${path} may survive only as an empty directory`);
  }

  const withoutAllowedBaseDirectories = (entries) => entries.filter((entry) => (
    !allowedEmptyBaseDirectories.has(entry.path)
  ));
  assert.deepEqual(
    withoutAllowedBaseDirectories(after),
    withoutAllowedBaseDirectories(before),
    "recovery must restore every file byte and leave no target or non-base directory residue",
  );
}

export async function assertLegacySentinelsUnchanged(root) {
  for (const [path, content] of Object.entries(LEGACY_SENTINELS)) {
    assert.equal(await readText(join(root, path)), content, `${path} must remain byte-identical`);
  }
}

export function assertSecretSafeError(error, secret) {
  assert.ok(error, "secret-bearing input must reject");
  if (String(error.message || error).includes(secret)) {
    const sanitized = new Error("rejection echoed a seeded sensitive sample");
    sanitized.code = "ERR_TEST_SENSITIVE_SAMPLE_ECHOED";
    throw sanitized;
  }
}

export async function allFileText(root) {
  const chunks = [];
  for (const entry of await snapshotTree(root)) {
    if (entry.type !== "file") continue;
    chunks.push(`${entry.path}\n${Buffer.from(entry.content, "base64").toString("utf8")}`);
  }
  return chunks.join("\n");
}

async function visit(root, path, entries) {
  const stats = await lstat(path);
  const relativePath = relative(root, path) || ".";
  if (stats.isDirectory()) {
    entries.push({ path: relativePath, type: "directory" });
    const children = await readdir(path);
    for (const child of children.sort()) await visit(root, join(path, child), entries);
    return;
  }
  if (stats.isSymbolicLink()) {
    entries.push({ path: relativePath, type: "symlink" });
    return;
  }
  entries.push({
    path: relativePath,
    type: "file",
    content: (await readFile(path)).toString("base64"),
  });
}
