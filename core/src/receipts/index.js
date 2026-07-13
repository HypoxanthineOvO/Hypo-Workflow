import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { canonicalHash, parseYaml, stringifyYaml } from "../serialization/index.js";
import {
  assertWorkspacePathAllowed,
  commitWorkspaceTransaction,
} from "../workspace-store/index.js";
import {
  AUTHORITY_SCHEMA_VERSION,
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  containsForbiddenReasoning,
  normalizeAuthorityObjectRef,
  normalizeCanonicalValue,
  normalizeSafeIdentifier,
  normalizeSha256,
  normalizeTimestamp,
  normalizeTransactionOptions,
  readCurrentManifest,
  storedObjectRef,
} from "../runtime/internal.js";

const RECEIPTS_ROOT = ".pipeline/runtime/receipts";
const RECEIPT_STATES = new Set(["issued", "reserved", "consumed", "invalidated", "revoked"]);
const ISSUE_KEYS = Object.freeze([
  "actor",
  "intent",
  "object_ref",
  "scope",
  "plan_hash",
  "issued_at",
  "expires_at",
]);
const CONTEXT_KEYS = Object.freeze(["actor", "intent", "object_ref", "scope", "plan_hash"]);
const RECEIPT_KEYS = Object.freeze([
  "schema_version",
  "authority_role",
  "receipt_id",
  "actor",
  "intent",
  "object_ref",
  "scope_hash",
  "plan_hash",
  "issued_at",
  "expires_at",
  "state",
  "reserved_by",
  "reserved_at",
  "consumed_at",
  "invalidated_at",
  "invalidated_reason",
  "revoked_at",
  "revoked_reason",
]);
const receiptLocks = new Map();
const HOST_CLOCK = () => new Date().toISOString();

export function createReceiptStore(input = {}) {
  assertPlainObject(input, "Receipt store options");
  assertExactKeys(input, ["clock"], "Receipt store options");
  const clock = normalizeReceiptClock(input.clock);
  return Object.freeze({
    async issueReceipt(root, receiptInput, options = {}) {
      assertNoPerCallTimeOverride(options, "issueReceipt");
      return issueReceipt(root, receiptInput, options);
    },
    readReceipt,
    async validateReceipt(root, id, context, options = {}) {
      assertNoPerCallTimeOverride(options, "validateReceipt");
      return validateReceiptWithClock(clock, root, id, context, options);
    },
    async reserveReceipt(root, id, context, options = {}) {
      assertNoPerCallTimeOverride(options, "reserveReceipt");
      return reserveReceiptWithClock(clock, root, id, context, options);
    },
    async consumeReceipt(root, id, context, options = {}) {
      assertNoPerCallTimeOverride(options, "consumeReceipt");
      return consumeReceiptWithClock(clock, root, id, context, options);
    },
    async invalidateReceipt(root, id, transition, options = {}) {
      assertNoPerCallTimeOverride(options, "invalidateReceipt");
      const trustedTransition = normalizeStoreTerminalTransition(transition, "invalidateReceipt", clock);
      return invalidateReceipt(root, id, trustedTransition, options);
    },
    async revokeReceipt(root, id, transition, options = {}) {
      assertNoPerCallTimeOverride(options, "revokeReceipt");
      const trustedTransition = normalizeStoreTerminalTransition(transition, "revokeReceipt", clock);
      return revokeReceipt(root, id, trustedTransition, options);
    },
  });
}

export async function issueReceipt(root, input, options = {}) {
  const normalized = normalizeIssueInput(input);
  const immutable = {
    actor: normalized.actor,
    intent: normalized.intent,
    object_ref: normalized.object_ref,
    scope_hash: normalized.scope_hash,
    plan_hash: normalized.plan_hash,
    issued_at: normalized.issued_at,
    expires_at: normalized.expires_at,
  };
  const id = `receipt-${canonicalHash(immutable).slice(0, 32)}`;
  const path = receiptPath(id);
  const receipt = {
    schema_version: AUTHORITY_SCHEMA_VERSION,
    authority_role: "receipt",
    receipt_id: id,
    ...immutable,
    state: "issued",
  };
  const existing = await optionalReadReceipt(root, id);
  if (existing) {
    if (!sameImmutableBindings(existing, receipt)) {
      throw authorityError("ERR_RECEIPT_INTEGRITY", "Deterministic Receipt id collides with different immutable bindings");
    }
    return { id, path };
  }
  const transaction = normalizeTransactionOptions(options, "receipt-issue", receipt);
  await writeReceipt(root, receipt, transaction);
  return { id, path };
}

export async function readReceipt(root, idInput) {
  return publicReceiptView(await readReceiptAuthority(root, idInput));
}

async function readReceiptAuthority(root, idInput) {
  const id = normalizeReceiptId(idInput);
  const path = receiptPath(id);
  const workspaceRoot = resolve(root || ".");
  const guarded = await assertWorkspacePathAllowed(workspaceRoot, path);
  let stats;
  try {
    stats = await lstat(guarded.path);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      throw authorityError("ERR_RECEIPT_NOT_FOUND", "Receipt was not found");
    }
    throw error;
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw authorityError("ERR_WORKSPACE_PATH_FORBIDDEN", "Receipt path is not a regular file");
  }
  let parsed;
  try {
    parsed = parseYaml(await readFile(guarded.path, "utf8"));
  } catch {
    throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", "Receipt file is unreadable or malformed");
  }
  return normalizePersistedReceipt(parsed, id);
}

export async function validateReceipt(root, idInput, context, options = {}) {
  assertNoPerCallTimeOverride(options, "validateReceipt");
  return validateReceiptWithClock(HOST_CLOCK, root, idInput, context, options);
}

async function validateReceiptWithClock(clock, root, idInput, context, options) {
  const id = normalizeReceiptId(idInput);
  const normalizedContext = normalizeReceiptContext(context);
  return withReceiptLock(root, id, async () => {
    const receipt = await readReceiptAuthority(root, id);
    const now = readReceiptClock(clock);
    await assertUsableReceipt(root, receipt, normalizedContext, now, options);
    return { ok: true, receipt_id: id, state: "issued" };
  });
}

export async function reserveReceipt(root, idInput, context, options = {}) {
  assertNoPerCallTimeOverride(options, "reserveReceipt");
  return reserveReceiptWithClock(HOST_CLOCK, root, idInput, context, options);
}

async function reserveReceiptWithClock(clock, root, idInput, context, options) {
  const id = normalizeReceiptId(idInput);
  const toolUseId = normalizeBoundString(options.tool_use_id, "reserve options.tool_use_id");
  const normalizedContext = normalizeReceiptContext(context);
  return withReceiptLock(root, id, async () => {
    const receipt = await readReceiptAuthority(root, id);
    if (receipt.state !== "issued") throw unusableReceiptError(receipt.state, "reserve");
    const now = readReceiptClock(clock);
    await assertUsableReceipt(root, receipt, normalizedContext, now, options);
    const next = normalizePersistedReceipt({
      ...receipt,
      state: "reserved",
      reserved_by: toolUseId,
      reserved_at: now,
    }, id);
    const transaction = normalizeTransactionOptions(options, "receipt-reserve", {
      receipt_id: id,
      tool_use_id: toolUseId,
      now,
    });
    await writeReceipt(root, next, transaction);
    return {
      id,
      path: receiptPath(id),
      state: next.state,
      reservation: { tool_use_id: toolUseId },
      receipt: next,
    };
  });
}

export async function consumeReceipt(root, idInput, context, options = {}) {
  assertNoPerCallTimeOverride(options, "consumeReceipt");
  return consumeReceiptWithClock(HOST_CLOCK, root, idInput, context, options);
}

async function consumeReceiptWithClock(clock, root, idInput, context, options) {
  const id = normalizeReceiptId(idInput);
  const toolUseId = normalizeBoundString(
    options.tool_use_id ?? context?.tool_use_id,
    "consume options.tool_use_id",
  );
  const normalizedContext = normalizeReceiptContext(context);
  return withReceiptLock(root, id, async () => {
    const receipt = await readReceiptAuthority(root, id);
    if (receipt.state !== "reserved") throw unusableReceiptError(receipt.state, "consume");
    if (receipt.reserved_by !== toolUseId) {
      throw authorityError("ERR_RECEIPT_OWNER_MISMATCH", "Receipt is reserved by a different tool use");
    }
    const now = readReceiptClock(clock);
    await assertExactContextOrInvalidate(root, receipt, normalizedContext, now, options);
    if (Date.parse(now) < Date.parse(receipt.issued_at)) {
      throw authorityError("ERR_RECEIPT_NOT_YET_VALID", "Receipt is not yet valid");
    }
    if (Date.parse(now) >= Date.parse(receipt.expires_at)) {
      await transitionToInvalidated(root, receipt, "expired", now, options);
      throw authorityError("ERR_RECEIPT_EXPIRED", "Receipt has expired");
    }
    const next = normalizePersistedReceipt({
      ...receipt,
      state: "consumed",
      consumed_at: now,
    }, id);
    const transaction = normalizeTransactionOptions(options, "receipt-consume", {
      receipt_id: id,
      tool_use_id: toolUseId,
      now,
    });
    await writeReceipt(root, next, transaction);
    return {
      id,
      path: receiptPath(id),
      state: next.state,
      consumption: { tool_use_id: toolUseId },
      receipt: next,
    };
  });
}

export async function invalidateReceipt(root, idInput, transition, options = {}) {
  const id = normalizeReceiptId(idInput);
  const { reason, now } = normalizeTerminalTransition(transition, "invalidate");
  return withReceiptLock(root, id, async () => {
    const receipt = await readReceiptAuthority(root, id);
    if (["consumed", "invalidated", "revoked"].includes(receipt.state)) {
      throw unusableReceiptError(receipt.state, "invalidate");
    }
    const next = await transitionToInvalidated(root, receipt, reason, now, options);
    return { id, path: receiptPath(id), state: next.state, receipt: next };
  });
}

export async function revokeReceipt(root, idInput, transition, options = {}) {
  const id = normalizeReceiptId(idInput);
  const { reason, now } = normalizeTerminalTransition(transition, "revoke");
  return withReceiptLock(root, id, async () => {
    const receipt = await readReceiptAuthority(root, id);
    if (["consumed", "invalidated", "revoked"].includes(receipt.state)) {
      throw unusableReceiptError(receipt.state, "revoke");
    }
    const next = normalizePersistedReceipt({
      ...receipt,
      state: "revoked",
      revoked_at: now,
      revoked_reason: reason,
    }, id);
    const transaction = normalizeTransactionOptions(options, "receipt-revoke", {
      receipt_id: id,
      reason,
      now,
    });
    await writeReceipt(root, next, transaction);
    return { id, path: receiptPath(id), state: next.state, receipt: next };
  });
}

function normalizeIssueInput(input) {
  assertPlainObject(input, "Receipt issue input");
  assertExactKeys(input, ISSUE_KEYS, "Receipt issue input");
  assertNoRawSecrets(input, "Receipt issue input");
  const issuedAt = normalizeTimestamp(input.issued_at, "Receipt issued_at");
  const expiresAt = normalizeTimestamp(input.expires_at, "Receipt expires_at");
  if (Date.parse(expiresAt) <= Date.parse(issuedAt)) {
    throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", "Receipt expires_at must be later than issued_at");
  }
  const scope = normalizeReceiptScope(input.scope);
  return {
    actor: normalizeReceiptActor(input.actor, "Receipt actor"),
    intent: normalizeBoundString(input.intent, "Receipt intent"),
    object_ref: storedObjectRef(normalizeAuthorityObjectRef(input.object_ref, "Receipt object_ref")),
    scope_hash: canonicalHash(scope),
    plan_hash: normalizeSha256(input.plan_hash, "Receipt plan_hash"),
    issued_at: issuedAt,
    expires_at: expiresAt,
  };
}

function normalizeReceiptContext(context) {
  assertPlainObject(context, "Receipt validation context");
  const normalizedContext = { ...context };
  delete normalizedContext.tool_use_id;
  assertExactKeys(normalizedContext, CONTEXT_KEYS, "Receipt validation context");
  assertNoRawSecrets(normalizedContext, "Receipt validation context");
  return {
    actor: normalizeReceiptActor(normalizedContext.actor, "Receipt context actor"),
    intent: normalizeBoundString(normalizedContext.intent, "Receipt context intent"),
    object_ref: storedObjectRef(normalizeAuthorityObjectRef(normalizedContext.object_ref, "Receipt context object_ref")),
    scope_hash: canonicalHash(normalizeReceiptScope(normalizedContext.scope)),
    plan_hash: normalizeSha256(normalizedContext.plan_hash, "Receipt context plan_hash"),
  };
}

function normalizePersistedReceipt(value, expectedId) {
  assertPlainObject(value, "Receipt");
  assertExactKeys(value, RECEIPT_KEYS, "Receipt");
  assertNoRawSecrets(value, "Receipt");
  if (value.schema_version !== AUTHORITY_SCHEMA_VERSION || value.authority_role !== "receipt") {
    throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", "Receipt schema or authority role is invalid");
  }
  const id = normalizeReceiptId(value.receipt_id);
  if (id !== expectedId) throw authorityError("ERR_RECEIPT_INTEGRITY", "Receipt id does not match its path");
  if (!RECEIPT_STATES.has(value.state)) {
    throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", "Receipt lifecycle state is invalid");
  }
  const normalized = {
    schema_version: AUTHORITY_SCHEMA_VERSION,
    authority_role: "receipt",
    receipt_id: id,
    actor: normalizeReceiptActor(value.actor, "Receipt actor"),
    intent: normalizeBoundString(value.intent, "Receipt intent"),
    object_ref: storedObjectRef(normalizeAuthorityObjectRef(value.object_ref, "Receipt object_ref")),
    scope_hash: normalizeSha256(value.scope_hash, "Receipt scope_hash"),
    plan_hash: normalizeSha256(value.plan_hash, "Receipt plan_hash"),
    issued_at: normalizeTimestamp(value.issued_at, "Receipt issued_at"),
    expires_at: normalizeTimestamp(value.expires_at, "Receipt expires_at"),
    state: value.state,
  };
  if (Date.parse(normalized.expires_at) <= Date.parse(normalized.issued_at)) {
    throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", "Receipt expiry is not later than issuance");
  }
  normalizeLifecycleFields(value, normalized);
  const expectedIdFromBindings = `receipt-${canonicalHash({
    actor: normalized.actor,
    intent: normalized.intent,
    object_ref: normalized.object_ref,
    scope_hash: normalized.scope_hash,
    plan_hash: normalized.plan_hash,
    issued_at: normalized.issued_at,
    expires_at: normalized.expires_at,
  }).slice(0, 32)}`;
  if (expectedIdFromBindings !== id) {
    throw authorityError("ERR_RECEIPT_INTEGRITY", "Receipt id does not match its immutable bindings");
  }
  return normalized;
}

function normalizeLifecycleFields(value, normalized) {
  const present = (key) => Object.hasOwn(value, key);
  if (["reserved", "consumed"].includes(value.state)) {
    normalized.reserved_by = normalizeBoundString(value.reserved_by, "Receipt reserved_by");
    normalized.reserved_at = normalizeTimestamp(value.reserved_at, "Receipt reserved_at");
  } else if (present("reserved_by") || present("reserved_at")) {
    if (!["invalidated", "revoked"].includes(value.state) || !present("reserved_by") || !present("reserved_at")) {
      throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", "Receipt reservation fields are inconsistent with its state");
    }
    normalized.reserved_by = normalizeBoundString(value.reserved_by, "Receipt reserved_by");
    normalized.reserved_at = normalizeTimestamp(value.reserved_at, "Receipt reserved_at");
  }
  if (normalized.reserved_at && (
    Date.parse(normalized.reserved_at) < Date.parse(normalized.issued_at)
    || Date.parse(normalized.reserved_at) >= Date.parse(normalized.expires_at)
  )) {
    throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", "Receipt reserved_at is outside its usable interval");
  }
  if (value.state === "consumed") {
    normalized.consumed_at = normalizeTimestamp(value.consumed_at, "Receipt consumed_at");
    if (
      Date.parse(normalized.consumed_at) < Date.parse(normalized.reserved_at)
      || Date.parse(normalized.consumed_at) >= Date.parse(normalized.expires_at)
    ) {
      throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", "Receipt consumed_at is outside its reserved usable interval");
    }
  } else if (present("consumed_at")) {
    throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", "Receipt consumed_at is inconsistent with its state");
  }
  if (value.state === "invalidated") {
    normalized.invalidated_at = normalizeTimestamp(value.invalidated_at, "Receipt invalidated_at");
    normalized.invalidated_reason = normalizeReason(value.invalidated_reason, "Receipt invalidated_reason");
    if (Date.parse(normalized.invalidated_at) < Date.parse(normalized.issued_at)) {
      throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", "Receipt invalidated_at predates issuance");
    }
  } else if (present("invalidated_at") || present("invalidated_reason")) {
    throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", "Receipt invalidation fields are inconsistent with its state");
  }
  if (value.state === "revoked") {
    normalized.revoked_at = normalizeTimestamp(value.revoked_at, "Receipt revoked_at");
    normalized.revoked_reason = normalizeReason(value.revoked_reason, "Receipt revoked_reason");
    if (Date.parse(normalized.revoked_at) < Date.parse(normalized.issued_at)) {
      throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", "Receipt revoked_at predates issuance");
    }
  } else if (present("revoked_at") || present("revoked_reason")) {
    throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", "Receipt revocation fields are inconsistent with its state");
  }
  if (value.state === "issued" && [
    "reserved_by", "reserved_at", "consumed_at", "invalidated_at", "invalidated_reason", "revoked_at", "revoked_reason",
  ].some(present)) {
    throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", "Issued Receipt contains terminal lifecycle fields");
  }
}

async function assertUsableReceipt(root, receipt, context, now, options) {
  if (receipt.state !== "issued") throw unusableReceiptError(receipt.state, "validate");
  await assertExactContextOrInvalidate(root, receipt, context, now, options);
  if (Date.parse(now) < Date.parse(receipt.issued_at)) {
    throw authorityError("ERR_RECEIPT_NOT_YET_VALID", "Receipt is not yet valid");
  }
  if (Date.parse(now) >= Date.parse(receipt.expires_at)) {
    await transitionToInvalidated(root, receipt, "expired", now, options);
    throw authorityError("ERR_RECEIPT_EXPIRED", "Receipt has expired");
  }
}

async function assertExactContextOrInvalidate(root, receipt, normalizedContext, now, options) {
  const exact = canonicalHash(receipt.actor) === canonicalHash(normalizedContext.actor)
    && receipt.intent === normalizedContext.intent
    && receipt.object_ref.kind === normalizedContext.object_ref.kind
    && receipt.object_ref.id === normalizedContext.object_ref.id
    && receipt.scope_hash === normalizedContext.scope_hash
    && receipt.plan_hash === normalizedContext.plan_hash;
  if (!exact) {
    await transitionToInvalidated(root, receipt, "authorization_context_drift", now, options);
    throw authorityError("ERR_RECEIPT_CONTEXT_DRIFT", "Receipt authorization context drift: actor, intent, object, scope, or plan binding changed");
  }
}

async function transitionToInvalidated(root, receipt, reason, now, options) {
  const next = normalizePersistedReceipt({
    ...receipt,
    state: "invalidated",
    invalidated_at: now,
    invalidated_reason: normalizeReason(reason, "Receipt invalidation reason"),
  }, receipt.receipt_id);
  const transaction = normalizeTransactionOptions(options, "receipt-invalidate", {
    receipt_id: receipt.receipt_id,
    reason,
    now,
  });
  await writeReceipt(root, next, transaction);
  return next;
}

async function writeReceipt(root, receipt, transaction) {
  const manifest = await readCurrentManifest(root);
  await commitWorkspaceTransaction(root, {
    id: transaction.id,
    faultInjector: transaction.faultInjector,
    manifest,
    writes: [{ path: receiptPath(receipt.receipt_id), content: `${stringifyYaml(receipt).trimEnd()}\n` }],
  });
}

function normalizeReceiptScope(value) {
  assertPlainObject(value, "Receipt scope");
  if (containsForbiddenReasoning(value)) {
    throw authorityError("ERR_HIDDEN_REASONING_FORBIDDEN", "Receipt scope must not contain hidden reasoning fields");
  }
  if (!Object.keys(value).length) throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", "Receipt scope must not be empty");
  if (containsMutablePlan(value)) {
    throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", "Receipt scope must not contain confirmation flags or a raw mutable plan");
  }
  const normalized = normalizeCanonicalValue(value, "Receipt scope");
  validateScopedPaths(normalized, "Receipt scope");
  return normalized;
}

function containsMutablePlan(value) {
  if (Array.isArray(value)) return value.some(containsMutablePlan);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, nested]) => ["confirmed", "plan", "raw_plan"].includes(key) || containsMutablePlan(nested));
}

function validateScopedPaths(value, field) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => validateScopedPaths(entry, `${field}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (key === "path" || key.endsWith("_path")) {
      validateScopePath(nested, field);
    } else if (key === "paths" || key.endsWith("_paths")) {
      if (!Array.isArray(nested)) {
        throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", `${field} path collection must be an array`);
      }
      for (const [index, entry] of nested.entries()) {
        if (typeof entry === "string") {
          validateScopePath(entry, `${field}.${key}[${index}]`);
        } else {
          assertPlainObject(entry, `${field}.${key}[${index}]`);
          if (!containsPathLeaf(entry)) {
            throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", `${field}.${key}[${index}] must contain a path leaf`);
          }
        }
      }
    }
    if (key === "content_hash" || key.endsWith("_content_hash")) {
      normalizeSha256(nested, `${field}.${key}`);
    }
    validateScopedPaths(nested, `${field}.${key}`);
  }
}

function containsPathLeaf(value) {
  if (Array.isArray(value)) return value.some(containsPathLeaf);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, nested]) => key === "path" || key.endsWith("_path") || containsPathLeaf(nested));
}

function validateScopePath(value, field) {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || !value
    || value.startsWith("/")
    || /^[A-Za-z]:[\\/]/.test(value)
    || value.includes("\\")
    || value.split("/").some((part) => part === "." || part === "..")
  ) {
    throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", `${field} contains an unsafe path binding`);
  }
}

function normalizeTerminalTransition(value, action) {
  assertPlainObject(value, `Receipt ${action} transition`);
  assertExactKeys(value, ["reason", "now"], `Receipt ${action} transition`);
  return {
    reason: normalizeReason(value.reason, `Receipt ${action} reason`),
    now: normalizeTimestamp(value.now, `Receipt ${action} now`),
  };
}

function normalizeReason(value, field) {
  if (typeof value !== "string" || value !== value.trim() || !value || value.length > 256 || /[\0\r\n]/.test(value)) {
    throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", `${field} must be concise non-empty text`);
  }
  assertNoRawSecrets(value, field);
  return value;
}

function normalizeBoundString(value, field) {
  if (typeof value !== "string" || value !== value.trim() || !value || value.length > 256 || /[\0\r\n]/.test(value)) {
    throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", `${field} must be a safe non-empty binding`);
  }
  assertNoRawSecrets(value, field);
  return value;
}

function normalizeReceiptClock(value) {
  if (typeof value === "function") return value;
  if (value && typeof value === "object" && !Array.isArray(value) && typeof value.now === "function") {
    return value.now.bind(value);
  }
  throw authorityError("ERR_RECEIPT_CLOCK_INVALID", "Receipt store clock must be a function or expose now()");
}

function readReceiptClock(clock) {
  return normalizeTimestamp(clock(), "Receipt clock value");
}

function assertNoPerCallTimeOverride(options, operation) {
  assertPlainObject(options, `${operation} options`);
  if (Object.hasOwn(options, "now")) {
    throw authorityError("ERR_RECEIPT_CLOCK_OVERRIDE", `${operation} does not accept a per-call time override`);
  }
}

function normalizeStoreTerminalTransition(value, operation, clock) {
  assertPlainObject(value, `${operation} transition`);
  if (Object.hasOwn(value, "now")) {
    throw authorityError("ERR_RECEIPT_CLOCK_OVERRIDE", `${operation} transition does not accept a caller-supplied timestamp`);
  }
  assertExactKeys(value, ["reason"], `${operation} transition`);
  return {
    reason: normalizeReason(value.reason, `${operation} reason`),
    now: readReceiptClock(clock),
  };
}

function normalizeReceiptActor(value, field) {
  assertPlainObject(value, field);
  assertExactKeys(value, ["type", "id"], field);
  return {
    type: normalizeSafeIdentifier(value.type, `${field}.type`),
    id: normalizeSafeIdentifier(value.id, `${field}.id`),
  };
}

function normalizeReceiptId(value) {
  const id = normalizeSafeIdentifier(value, "Receipt id");
  if (!/^receipt-[a-f0-9]{32}$/.test(id)) {
    throw authorityError("ERR_RECEIPT_SCHEMA_INVALID", "Receipt id has an invalid deterministic format");
  }
  return id;
}

function receiptPath(id) {
  return `${RECEIPTS_ROOT}/${id}.yaml`;
}

async function optionalReadReceipt(root, id) {
  try {
    return await readReceiptAuthority(root, id);
  } catch (error) {
    if (error.code === "ERR_RECEIPT_NOT_FOUND") return null;
    throw error;
  }
}

function publicReceiptView(receipt) {
  const view = {
    ...receipt,
    actor: { ...receipt.actor },
    object_ref: { ...receipt.object_ref },
  };
  if (["reserved", "consumed"].includes(receipt.state)) {
    view.reservation = { tool_use_id: receipt.reserved_by };
  }
  if (receipt.state === "consumed") {
    view.consumption = { tool_use_id: receipt.reserved_by };
  }
  return view;
}

function sameImmutableBindings(left, right) {
  return canonicalHash({
    actor: left.actor,
    intent: left.intent,
    object_ref: left.object_ref,
    scope_hash: left.scope_hash,
    plan_hash: left.plan_hash,
    issued_at: left.issued_at,
    expires_at: left.expires_at,
  }) === canonicalHash({
    actor: right.actor,
    intent: right.intent,
    object_ref: right.object_ref,
    scope_hash: right.scope_hash,
    plan_hash: right.plan_hash,
    issued_at: right.issued_at,
    expires_at: right.expires_at,
  });
}

function unusableReceiptError(state, action) {
  const code = state === "consumed" ? "ERR_RECEIPT_REPLAY" : "ERR_RECEIPT_UNUSABLE";
  return authorityError(code, `Receipt in state ${state} cannot be used to ${action}`);
}

async function withReceiptLock(root, id, operation) {
  const key = `${resolve(root || ".")}\0${id}`;
  const previous = receiptLocks.get(key) || Promise.resolve();
  let release;
  const current = new Promise((resolveLock) => { release = resolveLock; });
  receiptLocks.set(key, current);
  await previous.catch(() => {});
  try {
    return await operation();
  } finally {
    release();
    if (receiptLocks.get(key) === current) receiptLocks.delete(key);
  }
}
