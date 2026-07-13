import { authorityError } from "../runtime/internal.js";
import { normalizeWorkspacePath } from "../workspace-store/index.js";

const PROTECTED_EXACT_PATHS = Object.freeze([
  ".pipeline/manifest.yaml",
  ".pipeline/runtime/active.yaml",
]);
const PROTECTED_PREFIX_PATHS = Object.freeze([
  ".git",
  ".pipeline/runtime/objects",
  ".pipeline/runtime/evidence/deletion",
  ".pipeline/memory/capsules",
  ".pipeline/memory/records",
  ".pipeline/snapshots",
  ".pipeline/runtime/recovery",
  ".pipeline/runtime/receipts",
  ".pipeline/runtime/transactions",
  ".pipeline/reviews",
  ".pipeline/compatibility",
  ".pipeline/runtime/compatibility",
]);
const MIGRATIONS_ROOT = ".pipeline/runtime/migrations";
const PROTECTED_MIGRATION_FILES = new Set(["acceptance.yaml", "rollback-checkpoint.yaml"]);

export function normalizeDeletionPath(value, field = "Deletion path") {
  if (
    typeof value !== "string"
    || !value
    || value !== value.trim()
    || /[\0-\x1f\x7f]/.test(value)
    || /^[A-Za-z]:[\\/]/.test(value)
  ) {
    throw authorityError("ERR_DELETION_PATH_FORBIDDEN", `${field} is unsafe or ambiguous`);
  }
  let path;
  try {
    path = normalizeWorkspacePath(value);
  } catch {
    throw authorityError("ERR_DELETION_PATH_FORBIDDEN", `${field} escapes the repository`);
  }
  assertDeletionPathAllowed(path);
  return path;
}

export function assertDeletionPathAllowed(path) {
  if (isProtectedDeletionPath(path)) {
    throw authorityError(
      "ERR_DELETION_PATH_PROTECTED",
      "Protected Workflow authority, recovery, acceptance, or evidence paths cannot be deleted",
    );
  }
}

export function isProtectedDeletionPath(value) {
  const path = String(value).toLowerCase();
  if (path.split("/").includes(".git")) return true;
  if (PROTECTED_EXACT_PATHS.some((target) => pathsOverlap(path, target))) return true;
  if (PROTECTED_PREFIX_PATHS.some((target) => pathsOverlap(path, target))) return true;
  if (isProtectedMigrationPath(path)) return true;
  return path.startsWith(".pipeline/") && path.split("/").some(
    (part) => /^(?:compatibility|legacy-freeze-acceptance)[^/]*$/.test(part),
  );
}

function isProtectedMigrationPath(path) {
  if (path === MIGRATIONS_ROOT || MIGRATIONS_ROOT.startsWith(`${path}/`)) return true;
  if (!path.startsWith(`${MIGRATIONS_ROOT}/`)) return false;
  const parts = path.slice(MIGRATIONS_ROOT.length + 1).split("/");
  if (parts.length === 1) return true;
  return parts.slice(1).some((part) => PROTECTED_MIGRATION_FILES.has(part));
}

function pathsOverlap(left, right) {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}
