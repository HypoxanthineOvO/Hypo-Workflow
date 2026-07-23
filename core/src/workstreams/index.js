import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  compileRuntimeObjectDocuments,
  readRuntimeObject,
} from "../runtime/index.js";
import {
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  normalizeAuthorityObjectRef,
  normalizeSafeIdentifier,
  normalizeTimestamp,
  readCurrentManifest,
  sameObjectRef,
  storedObjectRef,
} from "../runtime/internal.js";
import { parseYaml, stringifyYaml } from "../serialization/index.js";
import { assertWorkspacePathAllowed, commitWorkspaceTransaction } from "../workspace-store/index.js";

const REGISTRY_PATH = ".pipeline/runtime/workstreams.yaml";
const ROUTING_CLASSES = new Set(["mechanical", "standard", "explore", "critical", "escalation"]);
const CAPABILITIES = new Set(["vision", "tool_use", "context_window"]);

export function createWorkstreamStore(input = {}) {
  assertPlainObject(input, "Workstream store options");
  assertExactKeys(input, ["clock"], "Workstream store options");
  if (typeof input.clock !== "function") {
    throw workstreamError("ERR_WORKSTREAM_SCHEMA_INVALID", "Workstream store clock must be a zero-argument function");
  }
  const clock = input.clock;
  return Object.freeze({
    create(root, request, options = {}) {
      return create(root, request, options, clock);
    },
    read,
    bindSession(root, request, options = {}) {
      return update(root, request, options, clock, "bind_session");
    },
    recordEvidence(root, request, options = {}) {
      return update(root, request, options, clock, "record_evidence");
    },
    resume,
    close(root, request, options = {}) {
      return update(root, request, options, clock, "close");
    },
  });
}

async function create(root, request, options, clock) {
  const input = normalizeCreateInput(request);
  const operation = normalizeOptions(options, `workstream-create-${input.id}`);
  const delivery = await readDelivery(root, input.delivery_ref);
  assertBindingMatchesDelivery(input.session_binding, delivery);
  await assertBindingMatchesWorkspace(root, input.session_binding);
  const registryState = await readRegistry(root);
  if (registryState.value.workstreams.some((item) => item.id === input.id)) {
    throw workstreamError("ERR_WORKSTREAM_EXISTS", `Workstream ${input.id} already exists`);
  }
  assertScopeAvailable(input.code_scope, registryState.value.workstreams);
  assertSessionAvailable(input.session_binding, registryState.value.workstreams);

  const timestamp = now(clock);
  const workstream = normalizeView({
    schema_version: "1",
    object_ref: { kind: "activity", id: input.id },
    activity_kind: "workstream",
    status: "active",
    generation: 0,
    delivery_ref: input.delivery_ref,
    session_binding: input.session_binding,
    routing: input.routing,
    code_scope: input.code_scope,
    evidence_refs: [],
    created_at: timestamp,
    updated_at: timestamp,
  });
  const nextRegistry = registryWith(registryState.value, workstream);
  await persist(root, workstream, nextRegistry, registryState.hash, operation, { create: true });
  return clone(workstream);
}

async function read(root, objectRefInput) {
  const objectRef = storedObjectRef(normalizeAuthorityObjectRef(objectRefInput));
  if (objectRef.kind !== "activity") throw workstreamError("ERR_WORKSTREAM_OBJECT_MISMATCH", "Workstream must reference kind activity");
  let authority;
  try {
    authority = await readRuntimeObject(root, objectRef);
  } catch (error) {
    if (error?.code === "ERR_AUTHORITY_OBJECT_NOT_FOUND") {
      throw workstreamError("ERR_WORKSTREAM_NOT_FOUND", "Workstream object was not found");
    }
    throw error;
  }
  return normalizeView(authority.runtime);
}

async function update(root, request, options, clock, action) {
  const normalized = normalizeUpdateInput(request, action);
  const operation = normalizeOptions(options, `workstream-${action}`);
  const current = await read(root, normalized.object_ref);
  if (current.generation !== normalized.expected_generation) {
    throw workstreamError("ERR_WORKSTREAM_GENERATION_CONFLICT", "Workstream generation is stale");
  }
  if (current.status !== "active") {
    throw workstreamError("ERR_WORKSTREAM_STATE_INVALID", `Workstream ${current.object_ref.id} is not active`);
  }

  const registryState = await readRegistry(root);
  const registryEntry = registryState.value.workstreams.find((item) => item.id === current.object_ref.id);
  if (!registryEntry || registryEntry.generation !== current.generation) {
    throw workstreamError("ERR_WORKSTREAM_GENERATION_CONFLICT", "Workstream registry generation is stale");
  }

  let next;
  if (action === "bind_session") {
    const delivery = await readDelivery(root, current.delivery_ref);
    assertBindingMatchesDelivery(normalized.session_binding, delivery);
    await assertBindingMatchesWorkspace(root, normalized.session_binding);
    assertSessionAvailable(normalized.session_binding, registryState.value.workstreams, current.object_ref.id);
    next = { ...current, session_binding: normalized.session_binding };
  } else if (action === "record_evidence") {
    next = { ...current, evidence_refs: [...current.evidence_refs, ...normalized.evidence_refs] };
  } else {
    next = { ...current, status: "closed" };
  }
  next = normalizeView({
    ...next,
    generation: current.generation + 1,
    updated_at: now(clock),
  });
  const nextRegistry = registryWith(registryState.value, next);
  await persist(root, next, nextRegistry, registryState.hash, operation, { create: false });
  return clone(next);
}

async function resume(root, input) {
  assertPlainObject(input, "Workstream resume input");
  assertExactKeys(input, ["host", "session_id"], "Workstream resume input");
  const host = normalizeSafeIdentifier(input.host, "Workstream resume input.host");
  const sessionId = normalizeSafeIdentifier(input.session_id, "Workstream resume input.session_id");
  const registry = (await readRegistry(root)).value;
  const matching = registry.workstreams.filter((item) => (
    item.status === "active"
    && item.session_binding.host === host
    && item.session_binding.session_id === sessionId
  ));
  if (matching.length !== 1) {
    throw workstreamError("ERR_WORKSTREAM_NOT_FOUND", "No unique active Workstream session binding was found");
  }
  const workstream = await read(root, { kind: "activity", id: matching[0].id });
  const delivery = await readDelivery(root, workstream.delivery_ref);
  return { workstream, delivery };
}

async function persist(root, workstream, registry, registryHash, operation, flags) {
  const docs = compileRuntimeObjectDocuments(toRuntimeDocuments(workstream));
  const manifest = await readCurrentManifest(root);
  const expected = flags.create ? { runtime: null, continuation: null } : await authorityHashes(root, docs);
  await commitWorkspaceTransaction(root, {
    id: operation.id,
    faultInjector: operation.faultInjector,
    manifest,
    writes: [
      { path: docs.runtime_path, content: renderYaml(docs.runtime), expected_hash: expected.runtime },
      { path: docs.continuation_path, content: renderYaml(docs.continuation), expected_hash: expected.continuation },
      { path: REGISTRY_PATH, content: renderYaml(registry), expected_hash: registryHash },
    ],
  });
}

function toRuntimeDocuments(workstream) {
  return {
    object_ref: workstream.object_ref,
    runtime: workstream,
    continuation: {
      schema_version: "1",
      object_ref: workstream.object_ref,
      next_action: workstream.status === "active" ? "resume_bound_session" : "workstream_closed",
      delivery_ref: workstream.delivery_ref,
      generation: workstream.generation,
      updated_at: workstream.updated_at,
    },
  };
}

function normalizeCreateInput(value) {
  assertPlainObject(value, "Workstream create input");
  assertExactKeys(value, ["id", "delivery_ref", "session_binding", "routing", "code_scope"], "Workstream create input");
  const id = normalizeSafeIdentifier(value.id, "Workstream id");
  const deliveryRef = storedObjectRef(normalizeAuthorityObjectRef(value.delivery_ref, "Workstream delivery_ref"));
  if (deliveryRef.kind !== "delivery") throw workstreamError("ERR_WORKSTREAM_SCHEMA_INVALID", "Workstream delivery_ref must reference a Delivery");
  const result = {
    id,
    delivery_ref: deliveryRef,
    session_binding: normalizeSessionBinding(value.session_binding),
    routing: normalizeRouting(value.routing),
    code_scope: normalizeCodeScope(value.code_scope),
  };
  assertNoRawSecrets(result, "Workstream create input");
  return result;
}

function normalizeUpdateInput(value, action) {
  assertPlainObject(value, `Workstream ${action} input`);
  const keys = action === "bind_session"
    ? ["object_ref", "expected_generation", "session_binding"]
    : action === "record_evidence"
      ? ["object_ref", "expected_generation", "evidence_refs"]
      : ["object_ref", "expected_generation"];
  assertExactKeys(value, keys, `Workstream ${action} input`);
  const objectRef = storedObjectRef(normalizeAuthorityObjectRef(value.object_ref));
  if (objectRef.kind !== "activity") throw workstreamError("ERR_WORKSTREAM_OBJECT_MISMATCH", "Workstream must reference kind activity");
  if (!Number.isSafeInteger(value.expected_generation) || value.expected_generation < 0) {
    throw workstreamError("ERR_WORKSTREAM_SCHEMA_INVALID", "Workstream expected_generation must be a non-negative integer");
  }
  return {
    object_ref: objectRef,
    expected_generation: value.expected_generation,
    ...(action === "bind_session" ? { session_binding: normalizeSessionBinding(value.session_binding) } : {}),
    ...(action === "record_evidence" ? { evidence_refs: normalizeEvidence(value.evidence_refs) } : {}),
  };
}

function normalizeView(value) {
  assertPlainObject(value, "Workstream view");
  const objectRef = storedObjectRef(normalizeAuthorityObjectRef(value.object_ref));
  if (objectRef.kind !== "activity" || value.activity_kind !== "workstream") {
    throw workstreamError("ERR_WORKSTREAM_OBJECT_MISMATCH", "Activity is not a Workstream");
  }
  if (!new Set(["active", "closed"]).has(value.status)) throw workstreamError("ERR_WORKSTREAM_SCHEMA_INVALID", "Workstream status is invalid");
  if (!Number.isSafeInteger(value.generation) || value.generation < 0) throw workstreamError("ERR_WORKSTREAM_SCHEMA_INVALID", "Workstream generation is invalid");
  const normalized = {
    ...value,
    schema_version: "1",
    object_ref: objectRef,
    delivery_ref: storedObjectRef(normalizeAuthorityObjectRef(value.delivery_ref)),
    session_binding: normalizeSessionBinding(value.session_binding),
    routing: normalizeRouting(value.routing),
    code_scope: normalizeCodeScope(value.code_scope),
    evidence_refs: normalizeEvidence(value.evidence_refs),
    created_at: normalizeTimestamp(value.created_at, "Workstream created_at"),
    updated_at: normalizeTimestamp(value.updated_at, "Workstream updated_at"),
  };
  assertNoRawSecrets(normalized, "Workstream view");
  return clone(normalized);
}

function normalizeSessionBinding(value) {
  assertPlainObject(value, "Workstream session_binding");
  assertExactKeys(value, ["host", "session_id", "workspace_id", "delivery_ref", "plan_hash", "revision"], "Workstream session_binding");
  const deliveryRef = storedObjectRef(normalizeAuthorityObjectRef(value.delivery_ref));
  if (deliveryRef.kind !== "delivery") throw workstreamError("ERR_WORKSTREAM_SCHEMA_INVALID", "session_binding.delivery_ref must reference a Delivery");
  if (typeof value.plan_hash !== "string" || !/^[a-f0-9]{64}$/.test(value.plan_hash)) throw workstreamError("ERR_WORKSTREAM_SCHEMA_INVALID", "session_binding.plan_hash is invalid");
  if (!Number.isSafeInteger(value.revision) || value.revision < 0) throw workstreamError("ERR_WORKSTREAM_SCHEMA_INVALID", "session_binding.revision is invalid");
  return {
    host: normalizeSafeIdentifier(value.host, "session_binding.host"),
    session_id: normalizeSafeIdentifier(value.session_id, "session_binding.session_id"),
    workspace_id: normalizeSafeIdentifier(value.workspace_id, "session_binding.workspace_id"),
    delivery_ref: deliveryRef,
    plan_hash: value.plan_hash,
    revision: value.revision,
  };
}

function normalizeRouting(value) {
  assertPlainObject(value, "Workstream routing");
  assertExactKeys(value, ["selection_mode", "routing_class", "capability_requirements"], "Workstream routing");
  if (!new Set(["auto_group", "manual"]).has(value.selection_mode)) throw workstreamError("ERR_WORKSTREAM_SCHEMA_INVALID", "routing.selection_mode is invalid");
  if (!ROUTING_CLASSES.has(value.routing_class)) throw workstreamError("ERR_WORKSTREAM_SCHEMA_INVALID", "routing.routing_class is invalid");
  if (!Array.isArray(value.capability_requirements) || value.capability_requirements.some((item) => !CAPABILITIES.has(item))) {
    throw workstreamError("ERR_WORKSTREAM_SCHEMA_INVALID", "routing.capability_requirements is invalid");
  }
  return { ...value, capability_requirements: [...new Set(value.capability_requirements)] };
}

function normalizeCodeScope(value) {
  assertPlainObject(value, "Workstream code_scope");
  assertExactKeys(value, ["git_base", "paths"], "Workstream code_scope");
  if (typeof value.git_base !== "string" || !/^[a-f0-9]{40,64}$/.test(value.git_base)) throw workstreamError("ERR_WORKSTREAM_SCHEMA_INVALID", "code_scope.git_base is invalid");
  if (!Array.isArray(value.paths) || value.paths.length === 0) throw workstreamError("ERR_WORKSTREAM_SCHEMA_INVALID", "code_scope.paths must be non-empty");
  const paths = value.paths.map((path) => {
    if (typeof path !== "string" || path !== path.trim() || !path || path.startsWith("/") || path.includes("\\") || path.split("/").some((part) => !part || part === "." || part === "..")) {
      throw workstreamError("ERR_WORKSTREAM_SCHEMA_INVALID", `code_scope path is invalid: ${String(path)}`);
    }
    return path;
  });
  return { git_base: value.git_base, paths: [...new Set(paths)].sort() };
}

function normalizeEvidence(value) {
  if (!Array.isArray(value)) throw workstreamError("ERR_WORKSTREAM_SCHEMA_INVALID", "Workstream evidence_refs must be an array");
  return value.map((entry) => {
    assertPlainObject(entry, "Workstream evidence reference");
    assertExactKeys(entry, ["type", "ref", "summary"], "Workstream evidence reference");
    const result = {};
    for (const key of ["type", "ref", "summary"]) {
      if (typeof entry[key] !== "string" || !entry[key].trim()) throw workstreamError("ERR_WORKSTREAM_SCHEMA_INVALID", `evidence_refs.${key} is required`);
      result[key] = entry[key].trim();
    }
    assertNoRawSecrets(result, "Workstream evidence reference");
    return result;
  });
}

async function readDelivery(root, objectRef) {
  const normalized = storedObjectRef(normalizeAuthorityObjectRef(objectRef));
  if (normalized.kind !== "delivery") throw workstreamError("ERR_WORKSTREAM_SCHEMA_INVALID", "Workstream parent must be a Delivery");
  try {
    const authority = await readRuntimeObject(root, normalized);
    return authority.runtime;
  } catch (error) {
    if (error?.code === "ERR_AUTHORITY_OBJECT_NOT_FOUND") throw workstreamError("ERR_WORKSTREAM_DELIVERY_NOT_FOUND", "Workstream parent Delivery was not found");
    throw error;
  }
}

function assertBindingMatchesDelivery(binding, delivery) {
  if (!sameObjectRef(binding.delivery_ref, delivery.object_ref) || binding.plan_hash !== delivery.plan_hash || binding.revision !== delivery.revision) {
    throw workstreamError("ERR_WORKSTREAM_BINDING_CONFLICT", "Session binding does not match current Delivery Plan authority");
  }
}

async function assertBindingMatchesWorkspace(root, binding) {
  const manifest = await readCurrentManifest(root);
  if (binding.workspace_id !== manifest.workspace_id) {
    throw workstreamError("ERR_WORKSTREAM_BINDING_CONFLICT", "Session binding does not match the current workspace");
  }
}

function assertSessionAvailable(binding, entries, exceptId = null) {
  if (entries.some((entry) => entry.id !== exceptId && entry.status === "active" && entry.session_binding.host === binding.host && entry.session_binding.session_id === binding.session_id)) {
    throw workstreamError("ERR_WORKSTREAM_SESSION_CONFLICT", "Session binding is already claimed by another active Workstream");
  }
}

function assertScopeAvailable(scope, entries) {
  for (const entry of entries) {
    if (entry.status !== "active") continue;
    for (const left of scope.paths) {
      for (const right of entry.code_scope.paths) {
        if (pathsOverlap(left, right)) throw workstreamError("ERR_WORKSTREAM_SCOPE_CONFLICT", `Workstream code scope overlaps active claim ${entry.id}`);
      }
    }
  }
}

function pathsOverlap(left, right) {
  const a = left.replace(/\/\*\*$/, "").replace(/\/\*$/, "");
  const b = right.replace(/\/\*\*$/, "").replace(/\/\*$/, "");
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

async function readRegistry(root) {
  const guard = await assertWorkspacePathAllowed(resolve(root || "."), REGISTRY_PATH);
  try {
    const stats = await lstat(guard.path);
    if (!stats.isFile() || stats.isSymbolicLink()) throw workstreamError("ERR_WORKSTREAM_REGISTRY_INVALID", "Workstream registry is not a regular file");
    const bytes = await readFile(guard.path);
    const parsed = parseYaml(bytes.toString("utf8"));
    if (parsed?.schema_version !== "1" || !Array.isArray(parsed.workstreams)) throw new Error("invalid registry");
    return { value: clone(parsed), hash: createHash("sha256").update(bytes).digest("hex") };
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return { value: { schema_version: "1", workstreams: [] }, hash: null };
    if (error?.code) throw error;
    throw workstreamError("ERR_WORKSTREAM_REGISTRY_INVALID", "Workstream registry is malformed");
  }
}

function registryWith(registry, workstream) {
  const entry = {
    id: workstream.object_ref.id,
    status: workstream.status,
    generation: workstream.generation,
    delivery_ref: workstream.delivery_ref,
    session_binding: workstream.session_binding,
    code_scope: workstream.code_scope,
  };
  const workstreams = registry.workstreams.filter((item) => item.id !== entry.id);
  workstreams.push(entry);
  workstreams.sort((a, b) => a.id.localeCompare(b.id));
  return { schema_version: "1", workstreams };
}

async function authorityHashes(root, docs) {
  return {
    runtime: await fileHashAt(root, docs.runtime_path),
    continuation: await fileHashAt(root, docs.continuation_path),
  };
}

async function fileHashAt(root, path) {
  const guard = await assertWorkspacePathAllowed(resolve(root || "."), path);
  const bytes = await readFile(guard.path);
  return createHash("sha256").update(bytes).digest("hex");
}

function normalizeOptions(value, fallback) {
  assertPlainObject(value, "Workstream transaction options");
  assertExactKeys(value, ["id", "faultInjector"], "Workstream transaction options");
  return {
    id: value.id === undefined ? fallback : normalizeSafeIdentifier(value.id, "Workstream transaction id"),
    ...(value.faultInjector === undefined ? {} : { faultInjector: value.faultInjector }),
  };
}

function now(clock) {
  return normalizeTimestamp(clock(), "Workstream clock value");
}

function renderYaml(value) {
  return `${stringifyYaml(value).trimEnd()}\n`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function workstreamError(code, message) {
  return authorityError(code, message);
}
