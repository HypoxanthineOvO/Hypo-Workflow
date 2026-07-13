import { createHash } from "node:crypto";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const FIXTURE_ROOT = dirname(fileURLToPath(import.meta.url));

export async function temporaryDirectory(t, prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

export async function copyFixture(name, destination) {
  await cp(join(FIXTURE_ROOT, name), destination, {
    recursive: true,
    force: false,
    preserveTimestamps: true,
  });
  return destination;
}

export async function writeText(root, path, content) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
  return target;
}

export async function readText(root, path) {
  return readFile(join(root, path), "utf8");
}

export async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return false;
    throw error;
  }
}

export async function listFiles(root) {
  const entries = await snapshotTree(root);
  return Object.keys(entries).filter((path) => entries[path].type === "file").sort();
}

export async function snapshotTree(root, options = {}) {
  const absoluteRoot = resolve(root);
  const excluded = new Set(options.exclude || []);
  const snapshot = {};
  await walk(absoluteRoot, absoluteRoot, excluded, snapshot);
  return snapshot;
}

async function walk(root, directory, excluded, snapshot) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return;
    throw error;
  }

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolutePath = join(directory, entry.name);
    const path = relative(root, absolutePath).split(sep).join("/");
    if ([...excluded].some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) continue;
    const info = await lstat(absolutePath, { bigint: true });
    if (info.isSymbolicLink()) {
      snapshot[path] = {
        type: "symlink",
        target: await readlink(absolutePath),
        mtime_ns: String(info.mtimeNs),
      };
      continue;
    }
    if (info.isDirectory()) {
      await walk(root, absolutePath, excluded, snapshot);
      continue;
    }
    if (!info.isFile()) {
      snapshot[path] = { type: "other", mtime_ns: String(info.mtimeNs) };
      continue;
    }
    const bytes = await readFile(absolutePath);
    snapshot[path] = {
      type: "file",
      bytes: bytes.toString("base64"),
      sha256: createHash("sha256").update(bytes).digest("hex"),
      size: Number(info.size),
      mode: Number(info.mode),
      mtime_ns: String(info.mtimeNs),
    };
  }
}

export async function prepareSkillBundle(t, repositoryRoot) {
  const bundle = await temporaryDirectory(t, "hw-m4-skill-bundle-");
  await mkdir(join(bundle, "skills", "init"), { recursive: true });
  await mkdir(join(bundle, "skills", "guide"), { recursive: true });
  await cp(join(repositoryRoot, "SKILL.md"), join(bundle, "SKILL.md"));
  await cp(join(repositoryRoot, "skills", "init", "SKILL.md"), join(bundle, "skills", "init", "SKILL.md"));
  await cp(join(repositoryRoot, "skills", "guide", "SKILL.md"), join(bundle, "skills", "guide", "SKILL.md"));
  return bundle;
}

export function assertSafeRelativePath(path) {
  if (typeof path !== "string" || !path || path.startsWith("/") || path.includes("\\")) return false;
  return !path.split("/").some((part) => part === "" || part === "." || part === "..");
}
