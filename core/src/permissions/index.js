import { canonicalHash } from "../serialization/index.js";
import {
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  normalizeCanonicalValue,
  normalizeSafeIdentifier,
  normalizeSha256,
} from "../runtime/internal.js";
import { normalizeDeletionPath } from "../deletion/policy.js";

const DELETION_SCHEMA_VERSION = "1";
const MANIFEST_KEYS = Object.freeze([
  "schema_version",
  "authority_role",
  "reason",
  "replacement",
  "git",
  "entries",
  "manifest_hash",
]);

export function buildDeletionReceiptContext(manifestInput, input) {
  assertPlainObject(input, "Deletion Receipt context input");
  assertExactKeys(input, ["actor"], "Deletion Receipt context input");
  const actor = normalizeActor(input.actor);
  const manifest = normalizeManifestBinding(manifestInput);
  return {
    actor,
    intent: "deletion.execute",
    object_ref: {
      kind: "activity",
      id: `deletion-${manifest.manifest_hash.slice(0, 24)}`,
    },
    scope: {
      manifest_hash: manifest.manifest_hash,
      git_binding: {
        head: manifest.git.head,
        tree: manifest.git.tree,
        target_state_hash: manifest.git.target_state_hash,
      },
      paths: manifest.entries.map((entry) => ({
        path: entry.path,
        kind: entry.kind,
        content_hash: entry.sha256,
      })),
    },
    plan_hash: manifest.manifest_hash,
  };
}

function normalizeManifestBinding(value) {
  assertPlainObject(value, "Deletion Manifest");
  assertExactKeys(value, MANIFEST_KEYS, "Deletion Manifest");
  assertNoRawSecrets(value, "Deletion Manifest");
  if (value.schema_version !== DELETION_SCHEMA_VERSION || value.authority_role !== "deletion_manifest") {
    throw authorityError("ERR_DELETION_MANIFEST_INVALID", "Deletion Manifest schema or authority role is invalid");
  }
  const normalized = normalizeCanonicalValue(value, "Deletion Manifest");
  const hash = normalizeSha256(normalized.manifest_hash, "Deletion Manifest manifest_hash");
  const { manifest_hash: _hash, ...body } = normalized;
  if (canonicalHash(body) !== hash) {
    throw authorityError("ERR_DELETION_MANIFEST_INTEGRITY", "Deletion Manifest hash does not match its bindings");
  }
  assertPlainObject(normalized.git, "Deletion Manifest git binding");
  assertExactKeys(normalized.git, ["head", "tree", "target_state_hash"], "Deletion Manifest git binding");
  normalizeGitObjectId(normalized.git.head, "Deletion Manifest git.head");
  normalizeGitObjectId(normalized.git.tree, "Deletion Manifest git.tree");
  normalizeSha256(normalized.git.target_state_hash, "Deletion Manifest git.target_state_hash");
  if (!Array.isArray(normalized.entries) || normalized.entries.length === 0) {
    throw authorityError("ERR_DELETION_MANIFEST_INVALID", "Deletion Manifest entries must be a non-empty array");
  }
  const entries = normalized.entries.map((entry, index) => {
    assertPlainObject(entry, `Deletion Manifest entries[${index}]`);
    assertExactKeys(entry, ["path", "kind", "sha256", "size_bytes", "entry_count"], `Deletion Manifest entries[${index}]`);
    const path = normalizeDeletionPath(entry.path);
    if (!['file', 'directory'].includes(entry.kind)) {
      throw authorityError("ERR_DELETION_MANIFEST_INVALID", "Deletion Manifest entry kind is invalid");
    }
    const sha256 = normalizeSha256(entry.sha256, `Deletion Manifest entries[${index}].sha256`);
    if (entry.kind === "file") {
      if (!Number.isSafeInteger(entry.size_bytes) || entry.size_bytes < 0 || Object.hasOwn(entry, "entry_count")) {
        throw authorityError("ERR_DELETION_MANIFEST_INVALID", "Deletion file entry requires a non-negative size_bytes only");
      }
      return { path, kind: "file", sha256, size_bytes: entry.size_bytes };
    }
    if (!Number.isSafeInteger(entry.entry_count) || entry.entry_count < 0 || Object.hasOwn(entry, "size_bytes")) {
      throw authorityError("ERR_DELETION_MANIFEST_INVALID", "Deletion directory entry requires a non-negative entry_count only");
    }
    return { path, kind: "directory", sha256, entry_count: entry.entry_count };
  });
  for (const [index, entry] of entries.entries()) {
    if (index > 0 && entries[index - 1].path.localeCompare(entry.path) >= 0) {
      throw authorityError("ERR_DELETION_PATH_OVERLAP", "Deletion Manifest entries must be unique and lexically ordered");
    }
    if (entries.some((other, otherIndex) => otherIndex !== index && entry.path.startsWith(`${other.path}/`))) {
      throw authorityError("ERR_DELETION_PATH_OVERLAP", "Deletion Manifest entries must not contain ancestor overlaps");
    }
  }
  return { ...normalized, manifest_hash: hash, entries };
}

function normalizeGitObjectId(value, field) {
  if (typeof value !== "string" || !/^[a-f0-9]{40}$|^[a-f0-9]{64}$/.test(value)) {
    throw authorityError("ERR_DELETION_MANIFEST_INVALID", `${field} must be a native Git object id`);
  }
  return value;
}

function normalizeActor(value) {
  assertPlainObject(value, "Deletion Receipt actor");
  assertExactKeys(value, ["type", "id"], "Deletion Receipt actor");
  return {
    type: normalizeSafeIdentifier(value.type, "Deletion Receipt actor.type"),
    id: normalizeSafeIdentifier(value.id, "Deletion Receipt actor.id"),
  };
}
