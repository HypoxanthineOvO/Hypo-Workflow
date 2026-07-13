#!/usr/bin/env node

import { createHash } from "node:crypto";
import { cp, lstat, mkdir, readFile, readdir, rm, utimes, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACT_ROOT = join(ROOT, "contracts", "host", "v1");
const DIST_ROOT = join(ROOT, "dist");
const STAGING_ROOT = join(DIST_ROOT, ".host-artifacts-staging");
const INSTALLED_DESCRIPTOR_PATH = "contracts/host/v1/installed-release.json";
const BUNDLE_MANIFEST_PATH = "bundle-manifest.json";
const PUBLIC_SKILLS = ["guide", "init", "goal", "plan", "cycle", "maintain", "resume", "accept", "reject"];

const plugin = JSON.parse(await readFile(join(ROOT, ".codex-plugin", "plugin.json"), "utf8"));
const version = plugin.version;
const sourceCommit = git(["rev-parse", "HEAD"]).trim();
if (!/^[a-f0-9]{40}$/.test(sourceCommit)) throw new Error("Unable to resolve the source commit");
const sourceDate = new Date(Number(git(["show", "-s", "--format=%ct", sourceCommit]).trim()) * 1000);

await rm(STAGING_ROOT, { recursive: true, force: true });
await mkdir(STAGING_ROOT, { recursive: true });

const common = [
  "SKILL.md",
  "package.json",
  "core/package.json",
  "core/src",
  "hooks/hooks.json",
  "hooks/codex-hook.mjs",
  "contracts/host/v1/command-manifest.json",
  "contracts/host/v1/host-status.schema.json",
  "contracts/host/v1/release-manifest.schema.json",
  ...PUBLIC_SKILLS.map((name) => `skills/${name}/SKILL.md`),
];
const targets = [
  {
    key: "codex_plugin",
    file: `hypo-workflow-${version}-codex-plugin.zip`,
    sources: [...common, ".codex-plugin/plugin.json", ".agents/plugins/marketplace.json"],
  },
  {
    key: "portable_bundle",
    file: `hypo-workflow-${version}-portable.zip`,
    sources: common,
  },
];

const sourcePaths = [...new Set([
  ...targets.flatMap((target) => target.sources),
  "scripts/build-host-artifacts.mjs",
])].sort();
const dirtySources = git(["status", "--porcelain=v1", "--", ...sourcePaths]).trim();
if (dirtySources) {
  throw new Error(`Release inputs must match source commit ${sourceCommit}:\n${dirtySources}`);
}

const commandBytes = await readFile(join(CONTRACT_ROOT, "command-manifest.json"));
const installedDescriptor = {
  schema_version: "1",
  contract_version: "1",
  release: { version, source_commit: sourceCommit },
  command_manifest: {
    path: "contracts/host/v1/command-manifest.json",
    sha256: createHash("sha256").update(commandBytes).digest("hex"),
  },
};
const installedDescriptorBytes = Buffer.from(`${JSON.stringify(installedDescriptor, null, 2)}\n`, "utf8");
await writeFile(join(ROOT, INSTALLED_DESCRIPTOR_PATH), installedDescriptorBytes);

const artifacts = {};
for (const target of targets) {
  const stage = join(STAGING_ROOT, target.key);
  await mkdir(stage, { recursive: true });
  for (const source of target.sources) {
    const from = join(ROOT, source);
    const to = join(stage, source);
    await mkdir(dirname(to), { recursive: true });
    await cp(from, to, { recursive: true, dereference: false, preserveTimestamps: false });
  }
  await mkdir(dirname(join(stage, INSTALLED_DESCRIPTOR_PATH)), { recursive: true });
  await writeFile(join(stage, INSTALLED_DESCRIPTOR_PATH), installedDescriptorBytes);
  if (target.key === "portable_bundle") {
    const bundleManifest = {
      schema_version: "1",
      contract_version: "1",
      files: await inventory(stage),
    };
    await writeFile(join(stage, BUNDLE_MANIFEST_PATH), `${JSON.stringify(bundleManifest, null, 2)}\n`, "utf8");
  }
  await normalizeTimes(stage, sourceDate);
  const output = join(DIST_ROOT, target.file);
  await rm(output, { force: true });
  const files = git(["ls-files", "--cached", "--others", "--exclude-standard"], stage)
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .sort();
  if (!files.length) throw new Error(`No files staged for ${target.key}`);
  run("zip", ["-X", "-q", output, ...files], stage, { TZ: "UTC", LC_ALL: "C" });
  const bytes = await readFile(output);
  artifacts[target.key] = {
    path: relative(ROOT, output).replaceAll("\\", "/"),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

const release = {
  schema_version: "1",
  contract_version: "1",
  release: { version, source_commit: sourceCommit },
  command_manifest: {
    path: "command-manifest.json",
    sha256: createHash("sha256").update(commandBytes).digest("hex"),
  },
  installed_descriptor: {
    path: INSTALLED_DESCRIPTOR_PATH,
    sha256: createHash("sha256").update(installedDescriptorBytes).digest("hex"),
  },
  artifacts,
};
await writeFile(join(CONTRACT_ROOT, "release-manifest.json"), `${JSON.stringify(release, null, 2)}\n`, "utf8");
await rm(STAGING_ROOT, { recursive: true, force: true });
process.stdout.write(`${JSON.stringify(release, null, 2)}\n`);

function git(args, cwd = ROOT) {
  return run("git", args, cwd);
}

async function inventory(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolute);
        continue;
      }
      const path = relative(root, absolute).replaceAll("\\", "/");
      if (path === BUNDLE_MANIFEST_PATH) continue;
      const stats = await lstat(absolute);
      if (!stats.isFile() || stats.isSymbolicLink()) throw new Error(`Unsafe portable bundle entry: ${path}`);
      const bytes = await readFile(absolute);
      files.push({ path, sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length });
    }
  }
  await visit(root);
  return files;
}

async function normalizeTimes(root, timestamp) {
  const directories = [];
  async function visit(directory) {
    directories.push(directory);
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else await utimes(absolute, timestamp, timestamp);
    }
  }
  await visit(root);
  for (const directory of directories.reverse()) await utimes(directory, timestamp, timestamp);
}

function run(command, args, cwd, extraEnv = {}) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", env: { ...process.env, ...extraEnv } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  return result.stdout;
}
