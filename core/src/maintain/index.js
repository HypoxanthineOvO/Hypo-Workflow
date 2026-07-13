import { lstat, readFile } from "node:fs/promises";
import { canonicalHash, parseYaml, stringifyYaml } from "../serialization/index.js";
import {
  commitRecordPatch,
  createRecordPatch,
  rebuildRecordIndexes,
} from "../records/index.js";
import { createRecoveryStore } from "../recovery/index.js";
import {
  assertSecretSafe,
  normalizeClock,
  normalizeRecoveryObjectRef,
  normalizeWriter,
  readClock,
} from "../recovery/shared.js";
import {
  AUTHORITY_SCHEMA_VERSION,
  assertExactKeys,
  assertPlainObject,
  authorityError,
  normalizeSafeIdentifier,
  readCurrentManifest,
} from "../runtime/internal.js";
import {
  assertWorkspacePathAllowed,
  commitWorkspaceTransaction,
} from "../workspace-store/index.js";

const AMBIENT_OBJECT_REF = Object.freeze({ kind: "activity", id: "ambient-maintain" });
const INBOX_ROOT = ".pipeline/memory/inbox";
const CAPTURE_KEYS = Object.freeze([
  "object_ref",
  "session_id",
  "turn_id",
  "writer",
  "source",
  "summary",
  "semantic_delta",
]);
const SEMANTIC_DELTA_KEYS = Object.freeze([
  "scope",
  "kind",
  "source_refs",
  "confidence",
  "dedupe_key",
  "supersedes",
  "secret_refs",
  "body",
]);

export function createAmbientMaintainStore(input = {}) {
  assertPlainObject(input, "Ambient Maintain store options");
  assertExactKeys(input, ["clock"], "Ambient Maintain store options");
  const clock = normalizeClock(input.clock);
  const recovery = createRecoveryStore({ clock });

  return Object.freeze({
    captureSemanticDelta(root, value, options = {}) {
      return captureSemanticDeltaWithStore(root, value, options, { clock, recovery });
    },
    evaluateRecorderProposal,
    promoteRecordPatch,
  });
}

async function captureSemanticDeltaWithStore(root, input, options, store) {
  const operationId = normalizeOperationOptions(options, "Ambient Maintain capture options");
  const normalized = normalizeCaptureInput(input);
  if (normalized.semantic_delta === null) {
    return {
      status: "ignored",
      semantic_dirty: false,
      journal_ref: null,
      inbox_ref: null,
      record_patch: null,
    };
  }

  const manifest = await readCurrentManifest(root);
  const timestamp = readClock(store.clock);
  const recordPatch = createRecordPatch({
    ...normalized.semantic_delta,
    created_at: timestamp,
    updated_at: timestamp,
  });
  const journalWrite = await store.recovery.appendRecoveryEvent(root, {
    object_ref: normalized.object_ref,
    session_id: normalized.session_id,
    writer: normalized.writer,
    turn_id: normalized.turn_id,
    type: "turn.user",
    summary: normalized.summary,
    payload: {
      kind: "ambient_maintain_delta",
      source: normalized.source,
      semantic_dirty: true,
      record_patch: recordPatch,
    },
  });
  const journalRef = {
    path: journalWrite.path,
    event_id: journalWrite.event.event_id,
  };
  const inboxPath = `${INBOX_ROOT}/${operationId}.yaml`;
  const inbox = {
    schema_version: AUTHORITY_SCHEMA_VERSION,
    authority_role: "proposal",
    kind: "ambient_maintain",
    status: "staged",
    object_ref: normalized.object_ref,
    session_id: normalized.session_id,
    turn_id: normalized.turn_id,
    writer: normalized.writer,
    source: normalized.source,
    summary: normalized.summary,
    staged_at: timestamp,
    journal_ref: journalRef,
    record_patch: recordPatch,
  };
  await commitWorkspaceTransaction(root, {
    id: operationId,
    manifest,
    writes: [{ path: inboxPath, content: `${stringifyYaml(inbox).trimEnd()}\n` }],
  });

  return {
    status: "staged",
    semantic_dirty: true,
    journal_ref: journalRef,
    inbox_ref: { path: inboxPath },
    record_patch: recordPatch,
  };
}

export async function evaluateRecorderProposal(root, input) {
  const normalized = normalizeRecorderProposal(input);
  await readCurrentManifest(root);
  return {
    status: "proposal_only",
    authority_write: false,
    object_ref: normalized.object_ref,
    session_id: normalized.session_id,
    turn_id: normalized.turn_id,
    writer: normalized.writer,
    record_patch: normalized.record_patch,
  };
}

export async function promoteRecordPatch(root, input, options = {}) {
  const operationId = normalizeOperationOptions(options, "Ambient Maintain promotion options");
  const normalized = normalizePromotionInput(input);
  const staged = await readStagedInbox(root, normalized.inbox_ref.path);
  if (canonicalHash(staged.record_patch) !== canonicalHash(normalized.record_patch)) {
    throw authorityError(
      "ERR_MAINTAIN_PROPOSAL_MISMATCH",
      "Record Patch does not match the staged Ambient Maintain Inbox item",
    );
  }

  const committed = await commitRecordPatch(root, normalized.record_patch, { id: operationId });
  const indexes = await rebuildRecordIndexes(root, { id: `${operationId}-index` });
  return {
    status: "promoted",
    authority_write: true,
    inbox_ref: normalized.inbox_ref,
    record_ref: { id: committed.id, path: committed.path },
    deduplicated: committed.deduplicated,
    index_ref: { path: indexes.index_path },
  };
}

function normalizeCaptureInput(input) {
  assertPlainObject(input, "Ambient Maintain capture input");
  assertExactKeys(input, CAPTURE_KEYS, "Ambient Maintain capture input");
  assertSecretSafe(input, "Ambient Maintain capture input", { allowSecretRefs: true });
  const objectRef = requireAmbientObjectRef(input.object_ref, "Ambient Maintain capture input.object_ref");
  const writer = normalizeWriter(input.writer, "Ambient Maintain capture input.writer");
  if (writer.kind !== "main") {
    throw authorityError("ERR_MAINTAIN_WRITER_FORBIDDEN", "Only the main agent may capture Ambient Maintain authority");
  }
  const semanticDelta = input.semantic_delta === null
    ? null
    : normalizeSemanticDelta(input.semantic_delta);
  return {
    object_ref: objectRef,
    session_id: normalizeSafeIdentifier(input.session_id, "Ambient Maintain capture input.session_id"),
    turn_id: normalizeSafeIdentifier(input.turn_id, "Ambient Maintain capture input.turn_id"),
    writer,
    source: normalizeSafeIdentifier(input.source, "Ambient Maintain capture input.source"),
    summary: normalizeSummary(input.summary, "Ambient Maintain capture input.summary"),
    semantic_delta: semanticDelta,
  };
}

function normalizeSemanticDelta(input) {
  assertPlainObject(input, "Ambient Maintain semantic_delta");
  assertExactKeys(input, SEMANTIC_DELTA_KEYS, "Ambient Maintain semantic_delta");
  return {
    scope: input.scope,
    kind: input.kind,
    source_refs: input.source_refs,
    confidence: input.confidence,
    dedupe_key: input.dedupe_key,
    supersedes: input.supersedes,
    ...(input.secret_refs === undefined ? {} : { secret_refs: input.secret_refs }),
    body: input.body,
  };
}

function normalizeRecorderProposal(input) {
  assertPlainObject(input, "Ambient Maintain recorder proposal");
  assertExactKeys(
    input,
    ["object_ref", "session_id", "turn_id", "writer", "proposal"],
    "Ambient Maintain recorder proposal",
  );
  assertSecretSafe(input, "Ambient Maintain recorder proposal", { allowSecretRefs: true });
  const writer = normalizeWriter(input.writer, "Ambient Maintain recorder proposal.writer");
  if (writer.kind !== "subagent") {
    throw authorityError("ERR_MAINTAIN_RECORDER_FORBIDDEN", "Recorder proposals must come from a subagent");
  }
  assertPlainObject(input.proposal, "Ambient Maintain recorder proposal.proposal");
  assertExactKeys(input.proposal, ["record_patch"], "Ambient Maintain recorder proposal.proposal");
  return {
    object_ref: requireAmbientObjectRef(input.object_ref, "Ambient Maintain recorder proposal.object_ref"),
    session_id: normalizeSafeIdentifier(input.session_id, "Ambient Maintain recorder proposal.session_id"),
    turn_id: normalizeSafeIdentifier(input.turn_id, "Ambient Maintain recorder proposal.turn_id"),
    writer,
    record_patch: createRecordPatch(input.proposal.record_patch),
  };
}

function normalizePromotionInput(input) {
  assertPlainObject(input, "Ambient Maintain promotion input");
  assertExactKeys(input, ["inbox_ref", "record_patch", "reviewer"], "Ambient Maintain promotion input");
  assertSecretSafe(input, "Ambient Maintain promotion input", { allowSecretRefs: true });
  assertPlainObject(input.inbox_ref, "Ambient Maintain promotion input.inbox_ref");
  assertExactKeys(input.inbox_ref, ["path"], "Ambient Maintain promotion input.inbox_ref");
  const path = normalizeInboxPath(input.inbox_ref.path);
  const reviewer = normalizeWriter(input.reviewer, "Ambient Maintain promotion input.reviewer");
  if (reviewer.kind !== "main") {
    throw authorityError("ERR_MAINTAIN_REVIEW_REQUIRED", "Record promotion requires a main-agent reviewer");
  }
  return {
    inbox_ref: { path },
    record_patch: createRecordPatch(input.record_patch),
    reviewer,
  };
}

async function readStagedInbox(root, relativePath) {
  const guarded = await assertWorkspacePathAllowed(root, relativePath);
  let stats;
  try {
    stats = await lstat(guarded.path);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      throw authorityError("ERR_MAINTAIN_INBOX_NOT_FOUND", "Ambient Maintain Inbox item was not found");
    }
    throw error;
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw authorityError("ERR_MAINTAIN_INBOX_INVALID", "Ambient Maintain Inbox item must be a regular file");
  }

  let parsed;
  try {
    parsed = parseYaml(await readFile(guarded.path, "utf8"));
  } catch {
    throw authorityError("ERR_MAINTAIN_INBOX_INVALID", "Ambient Maintain Inbox item is unreadable");
  }
  assertPlainObject(parsed, "Ambient Maintain Inbox item");
  if (
    parsed.schema_version !== AUTHORITY_SCHEMA_VERSION
    || parsed.authority_role !== "proposal"
    || parsed.kind !== "ambient_maintain"
    || parsed.status !== "staged"
  ) {
    throw authorityError("ERR_MAINTAIN_INBOX_INVALID", "Ambient Maintain Inbox item marker is invalid");
  }
  requireAmbientObjectRef(parsed.object_ref, "Ambient Maintain Inbox item.object_ref");
  assertSecretSafe(parsed, "Ambient Maintain Inbox item", { allowSecretRefs: true });
  return { ...parsed, record_patch: createRecordPatch(parsed.record_patch) };
}

function requireAmbientObjectRef(value, field) {
  const normalized = normalizeRecoveryObjectRef(value, field);
  if (normalized.kind !== AMBIENT_OBJECT_REF.kind || normalized.id !== AMBIENT_OBJECT_REF.id) {
    throw authorityError("ERR_MAINTAIN_OBJECT_REF_INVALID", `${field} must identify the ambient-maintain activity`);
  }
  return normalized;
}

function normalizeInboxPath(value) {
  if (
    typeof value !== "string"
    || !value.startsWith(`${INBOX_ROOT}/`)
    || !/^\.pipeline\/memory\/inbox\/[A-Za-z0-9][A-Za-z0-9._-]*\.yaml$/.test(value)
  ) {
    throw authorityError("ERR_MAINTAIN_INBOX_INVALID", "Ambient Maintain Inbox reference is invalid");
  }
  return value;
}

function normalizeOperationOptions(options, field) {
  assertPlainObject(options, field);
  assertExactKeys(options, ["id"], field);
  return normalizeSafeIdentifier(options.id, `${field}.id`);
}

function normalizeSummary(value, field) {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || !value
    || value.length > 4096
    || /[\0\r]/.test(value)
  ) {
    throw authorityError("ERR_MAINTAIN_SCHEMA_INVALID", `${field} must be concise non-empty text`);
  }
  return value.replace(/\r\n?/g, "\n");
}
