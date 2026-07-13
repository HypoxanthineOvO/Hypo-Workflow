import { lstat, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { WORKSPACE_ZONES } from "../manifest/index.js";

export const WORKSPACE_ALLOWED_WRITE_ROOTS = Object.freeze(Object.values(WORKSPACE_ZONES));

export async function assertWorkspacePathAllowed(root, inputPath, options = {}) {
  const workspaceRoot = resolve(root);
  const relativePath = normalizeWorkspacePath(inputPath);
  const allowedRoots = options.allowedRoots || WORKSPACE_ALLOWED_WRITE_ROOTS;
  if (!allowedRoots.some((allowed) => relativePath === allowed || relativePath.startsWith(`${allowed}/`))) {
    throw pathError(`Workspace path escape/outside allowed roots: ${inputPath}`);
  }
  if (options.allowRoot !== true && allowedRoots.includes(relativePath)) {
    throw pathError(`Workspace path escape cannot replace an allowed zone root: ${inputPath}`);
  }
  if (
    options.allowTransactionPaths !== true
    && (relativePath === ".pipeline/runtime/transactions" || relativePath.startsWith(".pipeline/runtime/transactions/"))
  ) {
    throw pathError(`Workspace path escape into reserved transaction storage: ${inputPath}`);
  }

  const absolutePath = resolve(workspaceRoot, relativePath);
  const projectRelative = relative(workspaceRoot, absolutePath);
  if (!projectRelative || projectRelative.startsWith("..") || isAbsolute(projectRelative)) {
    throw pathError(`Workspace path escape is forbidden: ${inputPath}`);
  }

  const rootReal = await realpath(workspaceRoot);
  let cursor = workspaceRoot;
  const components = relativePath.split("/");
  for (const [index, component] of components.entries()) {
    cursor = resolve(cursor, component);
    const stats = await optionalLstat(cursor);
    if (!stats) continue;
    if (stats.isSymbolicLink()) {
      throw pathError(`Workspace path symlink is forbidden: ${relativePath} (${cursor})`);
    }
    if (index < components.length - 1 && !stats.isDirectory()) {
      throw pathError(`Workspace path escape through a non-directory component is forbidden: ${relativePath} (${cursor})`);
    }
    const cursorReal = await realpath(cursor);
    if (!isInside(rootReal, cursorReal)) {
      throw pathError(`Workspace path symlink/escape is forbidden: ${relativePath} (${cursorReal})`);
    }
  }

  return { root: workspaceRoot, path: absolutePath, relativePath };
}

export function normalizeWorkspacePath(inputPath) {
  if (typeof inputPath !== "string" || !inputPath || inputPath.includes("\0")) {
    throw pathError(`Workspace path escape is forbidden: ${String(inputPath)}`);
  }
  if (isAbsolute(inputPath) || inputPath.includes("\\")) {
    throw pathError(`Workspace path escape is forbidden: ${inputPath}`);
  }
  const components = inputPath.split("/");
  if (components.some((component) => !component || component === "." || component === "..")) {
    throw pathError(`Workspace path escape is forbidden: ${inputPath}`);
  }
  return components.join("/");
}

export function workspacePathError(message) {
  return pathError(message);
}

function isInside(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

async function optionalLstat(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
    throw error;
  }
}

function pathError(message) {
  const error = new Error(message);
  error.code = "ERR_WORKSPACE_PATH_FORBIDDEN";
  return error;
}
