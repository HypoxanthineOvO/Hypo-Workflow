import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeActivePointer } from "../../../src/runtime/index.js";
import { createRecoveryStore } from "../../../src/recovery/index.js";
import {
  OBJECT_REF,
  capsuleSources,
  seedM2Authorities,
} from "../c21-m3/helpers.js";
import {
  exists,
  listFiles,
  readText,
  snapshotTree,
  temporaryCurrentWorkspace,
  writeText,
} from "../c21-m2/helpers.js";

export { exists, listFiles, OBJECT_REF, readText, snapshotTree, temporaryCurrentWorkspace, writeText };

export const FIXED_NOW = "2026-07-12T14:00:00+08:00";
export const LATER_NOW = "2026-07-12T14:05:00+08:00";
export const ACTOR = Object.freeze({ type: "user", id: "operator" });
export const OTHER_ACTOR = Object.freeze({ type: "user", id: "other-operator" });
export const AMBIENT_REF = Object.freeze({ kind: "activity", id: "ambient-maintain" });
export const REPOSITORY_ROOT = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
export const WRAPPER_PATH = join(REPOSITORY_ROOT, "hooks", "codex-hook.mjs");
const FIXTURE_PATH = fileURLToPath(new URL("./official-codex-hooks.json", import.meta.url));

export async function loadOfficialHookCases(root) {
  const fixture = JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
  return fixture.cases.map((entry) => ({
    ...entry,
    payload: replaceWorkspace(entry.payload, root),
  }));
}

export async function officialHookCase(root, event) {
  const found = (await loadOfficialHookCases(root)).find((entry) => entry.event === event);
  if (!found) throw new Error(`missing official Hook fixture for ${event}`);
  return structuredClone(found.payload);
}

export async function temporaryGitWorkspace(t, prefix = "hw-c21-m7-") {
  const root = await temporaryCurrentWorkspace(t, prefix);
  runGit(root, ["init", "-q"]);
  runGit(root, ["config", "user.name", "M7 Test"]);
  runGit(root, ["config", "user.email", "m7-test@example.invalid"]);
  await writeText(join(root, ".gitignore"), ".pipeline/\n");
  await writeText(join(root, "docs", "obsolete.md"), "obsolete documentation\n");
  await writeText(join(root, "src", "live.js"), "export const live = true;\n");
  runGit(root, ["add", ".gitignore", "docs/obsolete.md", "src/live.js"]);
  runGit(root, ["commit", "-qm", "M7 fixture baseline"]);
  return root;
}

export async function seedActiveRecovery(root, prefix = "m7") {
  const authorities = await seedM2Authorities(root, prefix);
  await writeActivePointer(root, {
    schema_version: "1",
    active: { delivery: OBJECT_REF },
  }, { id: `${prefix}-active` });
  const recovery = createRecoveryStore({
    clock: () => FIXED_NOW,
    max_events_per_segment: 8,
    inline_output_bytes: 256,
    default_restore_budget_bytes: 16_384,
  });
  await recovery.appendRecoveryEvent(root, {
    object_ref: OBJECT_REF,
    session_id: "session-m7",
    writer: { kind: "main", id: "main" },
    turn_id: "turn-seed",
    type: "turn.user",
    summary: "Seed the compact recovery contract.",
    payload: { message_ref: "m7-seed" },
  });
  const capsuleWrite = await recovery.updateContextCapsule(root, {
    object_ref: OBJECT_REF,
    sources: capsuleSources(authorities),
  }, { id: `${prefix}-capsule` });
  return { authorities, capsule: capsuleWrite.capsule, recovery };
}

export function spawnHook(root, payload, options = {}) {
  return spawnSync(process.execPath, [WRAPPER_PATH], {
    cwd: root,
    encoding: "utf8",
    input: options.raw_input ?? `${JSON.stringify(payload)}\n`,
    env: {
      ...process.env,
      PLUGIN_ROOT: REPOSITORY_ROOT,
      HYPO_WORKFLOW_TEST_OPERATION_ID: options.operation_id ?? `m7-${payload?.hook_event_name || "invalid"}`,
    },
  });
}

export function runGit(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `git ${args.join(" ")} failed`);
  return result.stdout.trim();
}

export async function writeProtectedFixturePaths(root, paths) {
  for (const path of paths) {
    if (path === ".pipeline/manifest.yaml") continue;
    await writeText(join(root, path), `protected fixture: ${path}\n`);
  }
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function overwrite(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

function replaceWorkspace(value, root) {
  if (Array.isArray(value)) return value.map((entry) => replaceWorkspace(entry, root));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, replaceWorkspace(nested, root)]));
  }
  return value === "__WORKSPACE__" ? root : value;
}
