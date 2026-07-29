import { randomUUID } from "node:crypto";
import { appendFile, lstat, mkdir, open, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { canonicalHash } from "../serialization/index.js";
import { assertBootstrapAcceptanceWriteAllowed } from "../workspace-store/bootstrap-acceptance.js";
import { assertWorkspacePathAllowed } from "../workspace-store/index.js";
import {
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  normalizeCanonicalValue,
  normalizeSafeIdentifier,
  normalizeSha256,
  normalizeTimestamp,
  readCurrentManifest,
} from "../runtime/internal.js";
import {
  RECOVERY_SCHEMA_VERSION,
  compareCursorStreams,
  cursorStreamMap,
  emptyCursor,
  hashBytes,
  normalizeCursor,
  normalizeDigest,
  normalizeRecoveryObjectRef,
  normalizeSegmentId,
  normalizeWriter,
  objectDirectory,
  readClock,
  redactSensitivePayload,
  streamKey,
} from "./shared.js";

export const RECOVERY_EVENT_TYPES = Object.freeze([
  "turn.user",
  "turn.agent",
  "plan.updated",
  "decision.recorded",
  "tool.started",
  "tool.completed",
  "files.changed",
  "verification.completed",
  "worker.started",
  "worker.stopped",
  "hook.observed",
  "receipt.observed",
  "record.flushed",
  "compact.started",
  "compact.completed",
  "restore.started",
  "restore.completed",
]);

const EVENT_TYPES = new Set(RECOVERY_EVENT_TYPES);
const STREAM_LOCK_POLL_MS = 10;
const STREAM_LOCK_TIMEOUT_MS = 20_000;
const STREAM_LOCK_STALE_MS = 120_000;
const streamLocks = new Map();
const blobLocks = new Map();

export async function appendRecoveryEventWithPolicy(root, input, policy) {
  const normalized = normalizeAppendInput(input);
  const workspaceRoot = resolve(root || ".");
  await assertBootstrapAcceptanceWriteAllowed(workspaceRoot);
  const lockKey = `${workspaceRoot}\0${normalized.object_ref.kind}\0${normalized.object_ref.id}\0${streamKey(normalized.session_id, normalized.writer)}`;
  return withStreamLock(workspaceRoot, lockKey, async () => {
    await readCurrentManifest(workspaceRoot);
    const streamDirectory = journalStreamDirectory(normalized.object_ref, normalized.session_id, normalized.writer);
    const stream = await readJournalStream(workspaceRoot, {
      object_ref: normalized.object_ref,
      session_id: normalized.session_id,
      writer: normalized.writer,
      directory: streamDirectory,
    });
    const sequence = (stream.events.at(-1)?.sequence ?? 0) + 1;
    const segmentNumber = chooseAppendSegment(stream, policy.max_events_per_segment);
    const segmentId = String(segmentNumber).padStart(8, "0");
    const payload = await externalizeLargeStrings(
      workspaceRoot,
      redactSensitivePayload(normalized.payload),
      policy.inline_output_bytes,
    );
    const occurredAt = readClock(policy.clock);
    const hashInput = {
      schema_version: RECOVERY_SCHEMA_VERSION,
      object_ref: normalized.object_ref,
      session_id: normalized.session_id,
      writer: normalized.writer,
      turn_id: normalized.turn_id,
      type: normalized.type,
      summary: normalized.summary,
      ...(normalized.rationale_summary === undefined ? {} : { rationale_summary: normalized.rationale_summary }),
      payload,
      occurred_at: occurredAt,
      sequence,
      segment_id: segmentId,
    };
    const event = { ...hashInput, event_id: canonicalHash(hashInput) };
    const relativePath = `${streamDirectory}/${segmentId}.jsonl`;
    const guarded = await assertWorkspacePathAllowed(workspaceRoot, relativePath);
    await mkdir(dirname(guarded.path), { recursive: true });
    await appendFile(guarded.path, `${JSON.stringify(event)}\n`, { encoding: "utf8", flag: "a" });
    const replay = await replayRecoveryJournalInternal(workspaceRoot, { object_ref: normalized.object_ref });
    return { path: relativePath, event, cursor: deepFreeze(replay.cursor) };
  });
}

export async function replayRecoveryJournalInternal(root, input) {
  assertPlainObject(input, "Recovery Journal replay input");
  assertExactKeys(input, ["object_ref", "after_cursor"], "Recovery Journal replay input");
  const objectRef = normalizeRecoveryObjectRef(input.object_ref);
  const afterCursor = input.after_cursor === undefined
    ? emptyCursor(objectRef)
    : normalizeCursor(input.after_cursor, objectRef, "after_cursor");
  const afterStreams = cursorStreamMap(afterCursor);
  const workspaceRoot = resolve(root || ".");
  await readCurrentManifest(workspaceRoot);
  const streamDescriptors = await discoverStreams(workspaceRoot, objectRef);
  const streams = [];
  const warnings = [];
  for (const descriptor of streamDescriptors) {
    const stream = await readJournalStream(workspaceRoot, descriptor);
    streams.push(stream);
    warnings.push(...stream.warnings);
  }

  const cursorStreams = [];
  const allEvents = [];
  for (const stream of streams) {
    const last = stream.events.at(-1);
    if (last) {
      cursorStreams.push({
        session_id: last.session_id,
        writer: last.writer,
        sequence: last.sequence,
        segment_id: last.segment_id,
        event_id: last.event_id,
      });
    }
    const key = streamKey(stream.session_id, stream.writer);
    const after = afterStreams.get(key);
    if (after) {
      const anchor = stream.events.find((event) => event.sequence === after.sequence);
      if (!anchor || anchor.event_id !== after.event_id || anchor.segment_id !== after.segment_id) {
        throw authorityError("ERR_RECOVERY_CURSOR_DRIFT", "Recovery cursor no longer matches its Journal stream");
      }
    }
    const afterSequence = after?.sequence ?? 0;
    allEvents.push(...stream.events.filter((event) => event.sequence > afterSequence));
  }

  for (const [key] of afterStreams) {
    if (!streams.some((stream) => streamKey(stream.session_id, stream.writer) === key)) {
      throw authorityError("ERR_RECOVERY_CURSOR_DRIFT", "Recovery cursor references a missing Journal stream");
    }
  }

  allEvents.sort(compareEvents);
  cursorStreams.sort(compareCursorStreams);
  return {
    events: allEvents,
    cursor: { schema_version: RECOVERY_SCHEMA_VERSION, object_ref: objectRef, streams: cursorStreams },
    warnings: warnings.sort((left, right) => left.path.localeCompare(right.path)),
  };
}

export async function replayRecoveryJournalDeltaInternal(root, input) {
  assertPlainObject(input, "Recovery Journal delta input");
  assertExactKeys(input, ["object_ref", "after_cursor"], "Recovery Journal delta input");
  const objectRef = normalizeRecoveryObjectRef(input.object_ref);
  const afterCursor = normalizeCursor(input.after_cursor, objectRef, "after_cursor");
  const afterStreams = cursorStreamMap(afterCursor);
  const workspaceRoot = resolve(root || ".");
  await readCurrentManifest(workspaceRoot);
  const descriptors = await discoverStreams(workspaceRoot, objectRef);
  const descriptorKeys = new Set(descriptors.map((entry) => streamKey(entry.session_id, entry.writer)));
  for (const [key] of afterStreams) {
    if (!descriptorKeys.has(key)) {
      throw authorityError("ERR_RECOVERY_CURSOR_DRIFT", "Recovery cursor references a missing Journal stream");
    }
  }

  const events = [];
  const warnings = [];
  const cursorStreams = [];
  for (const descriptor of descriptors) {
    const key = streamKey(descriptor.session_id, descriptor.writer);
    const anchor = afterStreams.get(key);
    const stream = anchor
      ? await readJournalStreamAfterCursor(workspaceRoot, descriptor, anchor)
      : await readJournalStream(workspaceRoot, descriptor);
    events.push(...stream.events);
    warnings.push(...stream.warnings);
    const last = stream.events.at(-1);
    if (last) {
      cursorStreams.push(cursorEntryFromEvent(last));
    } else if (anchor) {
      cursorStreams.push({
        session_id: anchor.session_id,
        writer: anchor.writer,
        sequence: anchor.sequence,
        segment_id: anchor.segment_id,
        event_id: anchor.event_id,
      });
    }
  }
  events.sort(compareEvents);
  cursorStreams.sort(compareCursorStreams);
  return {
    events,
    cursor: { schema_version: RECOVERY_SCHEMA_VERSION, object_ref: objectRef, streams: cursorStreams },
    warnings: warnings.sort((left, right) => left.path.localeCompare(right.path)),
  };
}

export async function readRecoveryBlobInternal(root, descriptorInput) {
  const descriptor = normalizeBlobDescriptor(descriptorInput);
  const digest = descriptor.digest;
  const hex = digest.slice(7);
  const relativePath = `.pipeline/runtime/recovery/blobs/${hex}`;
  const workspaceRoot = resolve(root || ".");
  const guarded = await assertWorkspacePathAllowed(workspaceRoot, relativePath);
  let stats;
  try {
    stats = await lstat(guarded.path);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      throw authorityError("ERR_RECOVERY_BLOB_NOT_FOUND", "Recovery blob was not found");
    }
    throw error;
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw authorityError("ERR_RECOVERY_PATH_FORBIDDEN", "Recovery blob path is not a regular file");
  }
  const content = await readFile(guarded.path);
  if (hashBytes(content) !== hex) {
    throw authorityError("ERR_RECOVERY_BLOB_INTEGRITY", "Recovery blob digest does not match its content");
  }
  if (content.length !== descriptor.bytes) {
    throw authorityError("ERR_RECOVERY_BLOB_INTEGRITY", "Recovery blob byte length does not match its descriptor");
  }
  return { digest, bytes: content.length, media_type: "text/plain", content: content.toString("utf8") };
}

function normalizeBlobDescriptor(value) {
  assertPlainObject(value, "Recovery blob descriptor");
  assertExactKeys(value, ["storage", "digest", "bytes", "media_type", "summary"], "Recovery blob descriptor");
  if (value.storage !== "content_addressed_blob") {
    throw authorityError("ERR_RECOVERY_BLOB_INVALID", "Recovery blob descriptor storage is invalid");
  }
  if (!Number.isSafeInteger(value.bytes) || value.bytes <= 0) {
    throw authorityError("ERR_RECOVERY_BLOB_INVALID", "Recovery blob descriptor bytes must be a positive safe integer");
  }
  if (value.media_type !== "text/plain") {
    throw authorityError("ERR_RECOVERY_BLOB_INVALID", "Recovery blob descriptor media_type must be text/plain");
  }
  if (typeof value.summary !== "string" || value.summary !== value.summary.trim() || !value.summary || /[\0\r\n]/.test(value.summary)) {
    throw authorityError("ERR_RECOVERY_BLOB_INVALID", "Recovery blob descriptor summary must be concise text");
  }
  return {
    storage: "content_addressed_blob",
    digest: normalizeDigest(value.digest, "Recovery blob descriptor.digest"),
    bytes: value.bytes,
    media_type: "text/plain",
    summary: value.summary,
  };
}

function normalizeAppendInput(input) {
  assertPlainObject(input, "Recovery event input");
  assertExactKeys(input, [
    "object_ref",
    "session_id",
    "writer",
    "turn_id",
    "type",
    "summary",
    "rationale_summary",
    "payload",
  ], "Recovery event input");
  assertNoRawSecrets({
    object_ref: input.object_ref,
    session_id: input.session_id,
    writer: input.writer,
    turn_id: input.turn_id,
  }, "Recovery event routing metadata");
  assertRoutingIdentifiersSecretSafe([
    input.object_ref?.id,
    input.session_id,
    input.writer?.id,
    input.turn_id,
  ]);
  const objectRef = normalizeRecoveryObjectRef(input.object_ref);
  const sessionId = normalizeSafeIdentifier(input.session_id, "Recovery event session_id");
  const writer = normalizeWriter(input.writer, "Recovery event writer");
  const turnId = normalizeSafeIdentifier(input.turn_id, "Recovery event turn_id");
  if (!EVENT_TYPES.has(input.type)) {
    throw authorityError("ERR_RECOVERY_EVENT_INVALID", "Recovery event type is not in the explicit taxonomy");
  }
  const summary = normalizeEventText(input.summary, "Recovery event summary");
  const rationale = input.rationale_summary === undefined
    ? undefined
    : normalizeEventText(input.rationale_summary, "Recovery event rationale_summary");
  if (!Object.hasOwn(input, "payload")) {
    throw authorityError("ERR_RECOVERY_EVENT_INVALID", "Recovery event payload is required");
  }
  // Redaction happens after this recursive rejection so forbidden reasoning can never be masked into persistence.
  redactSensitivePayload(input.payload);
  return {
    object_ref: objectRef,
    session_id: sessionId,
    writer,
    turn_id: turnId,
    type: input.type,
    summary,
    ...(rationale === undefined ? {} : { rationale_summary: rationale }),
    payload: input.payload,
  };
}

function normalizeEventText(value, field) {
  if (typeof value !== "string" || value !== value.trim() || !value || value.length > 4096 || /[\0\r]/.test(value)) {
    throw authorityError("ERR_RECOVERY_EVENT_INVALID", `${field} must be non-empty concise text`);
  }
  return redactSensitivePayload(value, field).replace(/\r\n?/g, "\n");
}

function journalStreamDirectory(objectRef, sessionId, writer) {
  return `${objectDirectory(objectRef)}/events/${sessionId}/${writer.kind}/${writer.id}`;
}

async function discoverStreams(root, objectRef) {
  const eventsDirectory = `${objectDirectory(objectRef)}/events`;
  const sessions = await readDirectories(root, eventsDirectory);
  const streams = [];
  for (const sessionId of sessions) {
    normalizeSafeIdentifier(sessionId, "Recovery Journal session directory");
    const writerKinds = await readDirectories(root, `${eventsDirectory}/${sessionId}`);
    for (const writerKind of writerKinds) {
      if (!new Set(["main", "subagent"]).has(writerKind)) {
        throw authorityError("ERR_RECOVERY_JOURNAL_CORRUPT", "Recovery Journal contains an unknown writer kind directory");
      }
      const writerIds = await readDirectories(root, `${eventsDirectory}/${sessionId}/${writerKind}`);
      for (const writerId of writerIds) {
        const writer = normalizeWriter({ kind: writerKind, id: writerId });
        streams.push({
          object_ref: objectRef,
          session_id: sessionId,
          writer,
          directory: journalStreamDirectory(objectRef, sessionId, writer),
        });
      }
    }
  }
  return streams.sort((left, right) => streamKey(left.session_id, left.writer).localeCompare(streamKey(right.session_id, right.writer)));
}

async function readDirectories(root, relativeDirectory) {
  const guarded = await assertWorkspacePathAllowed(root, relativeDirectory, { allowRoot: true });
  let entries;
  try {
    entries = await readdir(guarded.path, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return [];
    throw error;
  }
  const directories = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) throw authorityError("ERR_RECOVERY_PATH_FORBIDDEN", "Recovery Journal must not contain symbolic links");
    if (!entry.isDirectory()) throw authorityError("ERR_RECOVERY_JOURNAL_CORRUPT", "Recovery Journal hierarchy contains an unexpected file");
    directories.push(entry.name);
  }
  return directories.sort();
}

async function readJournalStream(root, descriptor) {
  const segmentNames = await listJournalSegments(root, descriptor);
  const events = [];
  const warnings = [];
  const segments = [];
  let expectedSequence = 1;
  for (const [segmentIndex, name] of segmentNames.entries()) {
    const path = `${descriptor.directory}/${name}`;
    const segmentGuard = await assertWorkspacePathAllowed(root, path);
    const stats = await lstat(segmentGuard.path);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw authorityError("ERR_RECOVERY_PATH_FORBIDDEN", "Recovery Journal segment is not a regular file");
    }
    const source = await readFile(segmentGuard.path, "utf8");
    const endedWithNewline = source.endsWith("\n");
    const lines = source.split("\n");
    if (endedWithNewline) lines.pop();
    let validCount = 0;
    for (const [lineIndex, line] of lines.entries()) {
      if (!line) throw authorityError("ERR_RECOVERY_JOURNAL_CORRUPT", "Recovery Journal contains an empty interior line");
      let parsed;
      try {
        parsed = JSON.parse(line);
      } catch {
        const finalPhysicalLine = lineIndex === lines.length - 1 && !endedWithNewline;
        if (!finalPhysicalLine) {
          throw authorityError("ERR_RECOVERY_JOURNAL_CORRUPT", "Recovery Journal contains malformed JSON before the final line");
        }
        warnings.push({ code: "truncated_final_line", path });
        break;
      }
      const event = normalizePersistedEvent(parsed, descriptor, name.slice(0, 8));
      if (event.sequence !== expectedSequence) {
        throw authorityError("ERR_RECOVERY_JOURNAL_CORRUPT", "Recovery Journal event sequence is not monotonic and contiguous");
      }
      expectedSequence += 1;
      validCount += 1;
      events.push(event);
    }
    segments.push({ segment_id: name.slice(0, 8), valid_count: validCount, truncated: warnings.some((warning) => warning.path === path) });
  }
  return { ...descriptor, events, warnings, segments };
}

async function readJournalStreamAfterCursor(root, descriptor, anchor) {
  const segmentNames = await listJournalSegments(root, descriptor);
  const anchorName = `${anchor.segment_id}.jsonl`;
  const anchorIndex = segmentNames.indexOf(anchorName);
  if (anchorIndex < 0) {
    throw authorityError("ERR_RECOVERY_CURSOR_DRIFT", "Recovery cursor segment is missing from its Journal stream");
  }
  if (Number(anchor.segment_id) > anchor.sequence) {
    throw authorityError("ERR_RECOVERY_CURSOR_DRIFT", "Recovery cursor segment cannot contain the claimed sequence");
  }
  const warnings = [];
  const events = [];
  const laterNames = segmentNames.slice(anchorIndex + 1);
  let expectedSequence = anchor.sequence + 1;
  let firstLater = null;
  if (laterNames.length) {
    firstLater = await readJournalSegment(root, descriptor, laterNames[0], null);
  }
  const firstLaterSequence = firstLater?.events[0]?.sequence ?? null;
  if (firstLaterSequence !== null && firstLaterSequence < expectedSequence) {
    throw authorityError("ERR_RECOVERY_CURSOR_DRIFT", "Recovery cursor sequence is beyond the next Journal segment");
  }
  const cursorSegmentIsSealed = firstLaterSequence === expectedSequence;
  if (!cursorSegmentIsSealed) {
    const cursorDelta = await readCursorSegmentAfterAnchor(root, descriptor, anchor, anchorName);
    events.push(...cursorDelta.events);
    warnings.push(...cursorDelta.warnings);
    expectedSequence += cursorDelta.events.length;
  }
  if (firstLater) {
    if (firstLater.events.length && firstLater.events[0].sequence !== expectedSequence) {
      throw authorityError("ERR_RECOVERY_JOURNAL_CORRUPT", "Recovery Journal cursor and next segment sequences do not join continuously");
    }
    events.push(...firstLater.events);
    warnings.push(...firstLater.warnings);
    expectedSequence += firstLater.events.length;
  }
  for (const name of laterNames.slice(firstLater ? 1 : 0)) {
    const parsed = await readJournalSegment(root, descriptor, name, expectedSequence);
    events.push(...parsed.events);
    warnings.push(...parsed.warnings);
    expectedSequence += parsed.events.length;
  }
  return { ...descriptor, events, warnings };
}

async function readCursorSegmentAfterAnchor(root, descriptor, anchor, anchorName) {
  const path = `${descriptor.directory}/${anchorName}`;
  const source = await readSegmentSource(root, path);
  const split = splitJsonLines(source);
  const later = [];
  const warnings = [];
  let foundAnchor = false;
  for (let index = split.lines.length - 1; index >= 0; index -= 1) {
    const line = split.lines[index];
    if (!line) throw authorityError("ERR_RECOVERY_JOURNAL_CORRUPT", "Recovery Journal contains an empty cursor-segment line");
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      if (index === split.lines.length - 1 && !split.ended_with_newline) {
        warnings.push({ code: "truncated_final_line", path });
        continue;
      }
      throw authorityError("ERR_RECOVERY_JOURNAL_CORRUPT", "Recovery Journal contains malformed cursor-segment JSON");
    }
    const event = normalizePersistedEvent(parsed, descriptor, anchor.segment_id);
    if (event.sequence === anchor.sequence) {
      if (event.event_id !== anchor.event_id) {
        throw authorityError("ERR_RECOVERY_CURSOR_DRIFT", "Recovery cursor event id no longer matches its Journal stream");
      }
      foundAnchor = true;
      break;
    }
    if (event.sequence < anchor.sequence) {
      throw authorityError("ERR_RECOVERY_CURSOR_DRIFT", "Recovery cursor anchor is beyond the current segment tail");
    }
    later.push(event);
  }
  if (!foundAnchor) {
    throw authorityError("ERR_RECOVERY_CURSOR_DRIFT", "Recovery cursor anchor is missing from its Journal segment");
  }
  later.reverse();
  for (const [index, event] of later.entries()) {
    if (event.sequence !== anchor.sequence + index + 1) {
      throw authorityError("ERR_RECOVERY_JOURNAL_CORRUPT", "Recovery Journal cursor-segment delta is not contiguous");
    }
  }
  return { events: later, warnings };
}

function assertRoutingIdentifiersSecretSafe(values) {
  const sensitiveSeed = /(?:^|[._-])(?:api[._-]?key|credential|password|passwd|secret|session[._-]?token|token)[._-](?:key|seed|value)[._-][A-Za-z0-9]{8,}(?:[._-]|$)/i;
  if (values.some((value) => typeof value === "string" && sensitiveSeed.test(value))) {
    throw authorityError("ERR_RAW_SECRET_FORBIDDEN", "Recovery event routing metadata contains a secret-like identifier");
  }
}

async function listJournalSegments(root, descriptor) {
  const guarded = await assertWorkspacePathAllowed(root, descriptor.directory, { allowRoot: true });
  let entries;
  try {
    entries = await readdir(guarded.path, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return [];
    throw error;
  }
  const segmentNames = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink() || !entry.isFile() || !/^\d{8}\.jsonl$/.test(entry.name) || entry.name === "00000000.jsonl") {
      throw authorityError("ERR_RECOVERY_JOURNAL_CORRUPT", "Recovery Journal stream contains an invalid segment entry");
    }
    segmentNames.push(entry.name);
  }
  segmentNames.sort();
  for (const [index, name] of segmentNames.entries()) {
    if (name !== `${String(index + 1).padStart(8, "0")}.jsonl`) {
      throw authorityError("ERR_RECOVERY_JOURNAL_CORRUPT", "Recovery Journal segment sequence has a gap");
    }
  }
  return segmentNames;
}

async function readJournalSegment(root, descriptor, name, expectedSequence) {
  const path = `${descriptor.directory}/${name}`;
  const source = await readSegmentSource(root, path);
  const split = splitJsonLines(source);
  const events = [];
  const warnings = [];
  let firstSequence = expectedSequence;
  for (const [lineIndex, line] of split.lines.entries()) {
    if (!line) throw authorityError("ERR_RECOVERY_JOURNAL_CORRUPT", "Recovery Journal contains an empty post-cursor line");
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      if (lineIndex === split.lines.length - 1 && !split.ended_with_newline) {
        warnings.push({ code: "truncated_final_line", path });
        break;
      }
      throw authorityError("ERR_RECOVERY_JOURNAL_CORRUPT", "Recovery Journal contains malformed post-cursor JSON");
    }
    const event = normalizePersistedEvent(parsed, descriptor, name.slice(0, 8));
    if (firstSequence === null) firstSequence = event.sequence;
    if (event.sequence !== firstSequence + events.length) {
      throw authorityError("ERR_RECOVERY_JOURNAL_CORRUPT", "Recovery Journal post-cursor sequence is not contiguous");
    }
    events.push(event);
  }
  return { events, warnings };
}

async function readSegmentSource(root, path) {
  const guarded = await assertWorkspacePathAllowed(root, path);
  const stats = await lstat(guarded.path);
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw authorityError("ERR_RECOVERY_PATH_FORBIDDEN", "Recovery Journal segment is not a regular file");
  }
  return readFile(guarded.path, "utf8");
}

function splitJsonLines(source) {
  const endedWithNewline = source.endsWith("\n");
  const lines = source.split("\n");
  if (endedWithNewline) lines.pop();
  return { lines, ended_with_newline: endedWithNewline };
}

function cursorEntryFromEvent(event) {
  return {
    session_id: event.session_id,
    writer: event.writer,
    sequence: event.sequence,
    segment_id: event.segment_id,
    event_id: event.event_id,
  };
}

function normalizePersistedEvent(value, descriptor, expectedSegmentId) {
  assertPlainObject(value, "Recovery Journal event");
  assertExactKeys(value, [
    "schema_version",
    "event_id",
    "object_ref",
    "session_id",
    "writer",
    "turn_id",
    "type",
    "summary",
    "rationale_summary",
    "payload",
    "occurred_at",
    "sequence",
    "segment_id",
  ], "Recovery Journal event");
  if (value.schema_version !== RECOVERY_SCHEMA_VERSION || !EVENT_TYPES.has(value.type)) {
    throw authorityError("ERR_RECOVERY_JOURNAL_CORRUPT", "Recovery Journal event schema or type is invalid");
  }
  const objectRef = normalizeRecoveryObjectRef(value.object_ref, "Recovery Journal event.object_ref");
  const sessionId = normalizeSafeIdentifier(value.session_id, "Recovery Journal event.session_id");
  const writer = normalizeWriter(value.writer, "Recovery Journal event.writer");
  if (
    canonicalHash(objectRef) !== canonicalHash(descriptor.object_ref)
    || sessionId !== descriptor.session_id
    || canonicalHash(writer) !== canonicalHash(descriptor.writer)
  ) {
    throw authorityError("ERR_RECOVERY_JOURNAL_CORRUPT", "Recovery Journal event does not match its stream path");
  }
  const turnId = normalizeSafeIdentifier(value.turn_id, "Recovery Journal event.turn_id");
  const summary = normalizeEventText(value.summary, "Recovery Journal event.summary");
  const rationale = value.rationale_summary === undefined
    ? undefined
    : normalizeEventText(value.rationale_summary, "Recovery Journal event.rationale_summary");
  const payload = normalizeCanonicalValue(value.payload, "Recovery Journal event.payload");
  // Stored events must already be redacted. Re-running redaction must be a no-op.
  if (canonicalHash(payload) !== canonicalHash(redactSensitivePayload(payload))) {
    throw authorityError("ERR_RECOVERY_JOURNAL_CORRUPT", "Recovery Journal event contains unredacted sensitive payload data");
  }
  const occurredAt = normalizeTimestamp(value.occurred_at, "Recovery Journal event.occurred_at");
  if (!Number.isSafeInteger(value.sequence) || value.sequence <= 0) {
    throw authorityError("ERR_RECOVERY_JOURNAL_CORRUPT", "Recovery Journal event.sequence is invalid");
  }
  const segmentId = normalizeSegmentId(value.segment_id, "Recovery Journal event.segment_id");
  if (segmentId !== expectedSegmentId) {
    throw authorityError("ERR_RECOVERY_JOURNAL_CORRUPT", "Recovery Journal event segment id does not match its path");
  }
  const hashInput = {
    schema_version: RECOVERY_SCHEMA_VERSION,
    object_ref: objectRef,
    session_id: sessionId,
    writer,
    turn_id: turnId,
    type: value.type,
    summary,
    ...(rationale === undefined ? {} : { rationale_summary: rationale }),
    payload,
    occurred_at: occurredAt,
    sequence: value.sequence,
    segment_id: segmentId,
  };
  const eventId = normalizeSha256(value.event_id, "Recovery Journal event.event_id");
  if (eventId !== canonicalHash(hashInput)) {
    throw authorityError("ERR_RECOVERY_JOURNAL_INTEGRITY", "Recovery Journal event hash is invalid");
  }
  return { ...hashInput, event_id: eventId };
}

function chooseAppendSegment(stream, maximum) {
  const latest = stream.segments.at(-1);
  if (!latest) return 1;
  if (latest.truncated || latest.valid_count >= maximum) return Number(latest.segment_id) + 1;
  return Number(latest.segment_id);
}

async function externalizeLargeStrings(root, value, threshold) {
  if (typeof value === "string") {
    if (value === "[REDACTED]") return value;
    const content = Buffer.from(value, "utf8");
    if (content.length <= threshold) return value;
    const hex = hashBytes(content);
    await persistBlob(root, hex, content);
    return {
      storage: "content_addressed_blob",
      digest: `sha256:${hex}`,
      bytes: content.length,
      media_type: "text/plain",
      summary: summarizeBlob(content.length),
    };
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((entry) => externalizeLargeStrings(root, entry, threshold)));
  }
  if (value && typeof value === "object") {
    if (value.storage === "content_addressed_blob") {
      throw authorityError("ERR_RECOVERY_EVENT_INVALID", "Recovery blob descriptors are writer-owned and cannot be supplied by callers");
    }
    const result = {};
    for (const key of Object.keys(value).sort()) {
      result[key] = await externalizeLargeStrings(root, value[key], threshold);
    }
    return result;
  }
  return value;
}

async function persistBlob(root, hex, content) {
  const workspaceRoot = resolve(root || ".");
  const key = `${workspaceRoot}\0${hex}`;
  await withBlobLock(key, async () => {
    const path = `.pipeline/runtime/recovery/blobs/${hex}`;
    const guarded = await assertWorkspacePathAllowed(workspaceRoot, path);
    await mkdir(dirname(guarded.path), { recursive: true });
    try {
      await writeFile(guarded.path, content, { flag: "wx" });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const existing = await readFile(guarded.path);
      if (existing.length !== content.length || hashBytes(existing) !== hex) {
        throw authorityError("ERR_RECOVERY_BLOB_INTEGRITY", "Existing Recovery blob does not match its content address");
      }
    }
  });
}

function summarizeBlob(bytes) {
  return `Text output stored separately (${bytes} bytes)`;
}

function compareEvents(left, right) {
  return left.occurred_at.localeCompare(right.occurred_at)
    || streamKey(left.session_id, left.writer).localeCompare(streamKey(right.session_id, right.writer))
    || left.sequence - right.sequence
    || left.event_id.localeCompare(right.event_id);
}

async function withStreamLock(root, key, operation) {
  const previous = streamLocks.get(key) || Promise.resolve();
  let release;
  const current = new Promise((resolveLock) => { release = resolveLock; });
  streamLocks.set(key, current);
  await previous.catch(() => {});
  let releaseFileLock;
  try {
    releaseFileLock = await acquireStreamFileLock(root, key);
    return await operation();
  } finally {
    try {
      if (releaseFileLock) await releaseFileLock();
    } finally {
      release();
      if (streamLocks.get(key) === current) streamLocks.delete(key);
    }
  }
}

async function acquireStreamFileLock(root, key) {
  const digest = hashBytes(Buffer.from(key, "utf8"));
  const relativePath = `.pipeline/runtime/recovery/locks/${digest}.lock`;
  const guarded = await assertWorkspacePathAllowed(root, relativePath);
  await mkdir(dirname(guarded.path), { recursive: true, mode: 0o700 });
  const owner = {
    pid: process.pid,
    token: randomUUID(),
    acquired_at_ms: Date.now(),
  };
  const startedAt = Date.now();

  while (true) {
    if (await createExclusiveLockFile(guarded.path, owner)) {
      return () => releaseStreamFileLock(guarded.path, owner.token);
    }
    await reapStaleStreamFileLock(guarded.path);
    if (Date.now() - startedAt >= STREAM_LOCK_TIMEOUT_MS) {
      throw authorityError(
        "ERR_RECOVERY_JOURNAL_LOCK_TIMEOUT",
        "Timed out waiting for another process to release the Recovery Journal stream lock",
      );
    }
    await wait(STREAM_LOCK_POLL_MS);
  }
}

async function createExclusiveLockFile(path, owner) {
  let handle;
  try {
    handle = await open(path, "wx", 0o600);
  } catch (error) {
    if (error.code === "EEXIST") return false;
    throw error;
  }
  try {
    await handle.writeFile(`${JSON.stringify(owner)}\n`, "utf8");
  } catch (error) {
    await handle.close().catch(() => {});
    await unlink(path).catch(() => {});
    throw error;
  }
  await handle.close();
  return true;
}

async function releaseStreamFileLock(path, token) {
  const current = await readStreamFileLock(path);
  if (!current) return;
  if (current.token !== token) {
    throw authorityError(
      "ERR_RECOVERY_JOURNAL_LOCK_OWNERSHIP",
      "Recovery Journal stream lock ownership changed before release",
    );
  }
  try {
    await unlink(path);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function reapStaleStreamFileLock(path) {
  const observed = await readStreamFileLock(path);
  if (!observed || !streamFileLockIsStale(observed)) return;
  const reaperPath = `${path}.reaper`;
  const reaper = {
    pid: process.pid,
    token: randomUUID(),
    acquired_at_ms: Date.now(),
  };
  if (!(await createExclusiveLockFile(reaperPath, reaper))) {
    await removeStaleLockFile(reaperPath);
    if (!(await createExclusiveLockFile(reaperPath, reaper))) return;
  }
  try {
    const current = await readStreamFileLock(path);
    if (!current || !streamFileLockIsStale(current)) return;
    try {
      await unlink(path);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  } finally {
    await releaseStreamFileLock(reaperPath, reaper.token);
  }
}

async function removeStaleLockFile(path) {
  const observed = await readStreamFileLock(path);
  if (!observed || !streamFileLockIsStale(observed)) return;
  const current = await readStreamFileLock(path);
  if (!current || current.token !== observed.token || !streamFileLockIsStale(current)) return;
  try {
    await unlink(path);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function readStreamFileLock(path) {
  let stats;
  let source;
  try {
    stats = await lstat(path);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw authorityError(
        "ERR_RECOVERY_JOURNAL_LOCK_INVALID",
        "Recovery Journal stream lock is not a regular file",
      );
    }
    source = await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
    throw error;
  }

  let parsed = null;
  try {
    parsed = JSON.parse(source);
  } catch {
    // A newly-created lock can be observed before its owner metadata is flushed.
  }
  return {
    age_ms: Math.max(0, Date.now() - stats.mtimeMs),
    pid: Number.isSafeInteger(parsed?.pid) && parsed.pid > 0 ? parsed.pid : null,
    token: typeof parsed?.token === "string" && parsed.token ? parsed.token : null,
  };
}

function streamFileLockIsStale(lock) {
  if (lock.age_ms >= STREAM_LOCK_STALE_MS) return true;
  return lock.pid !== null && !processIsAlive(lock.pid);
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code !== "ESRCH";
  }
}

function wait(milliseconds) {
  return new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
}

async function withBlobLock(key, operation) {
  const previous = blobLocks.get(key) || Promise.resolve();
  let release;
  const current = new Promise((resolveLock) => { release = resolveLock; });
  blobLocks.set(key, current);
  await previous.catch(() => {});
  try {
    return await operation();
  } finally {
    release();
    if (blobLocks.get(key) === current) blobLocks.delete(key);
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}
