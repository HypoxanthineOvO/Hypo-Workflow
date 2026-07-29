import test from "node:test";
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, utimes, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  OBJECT_REF,
  OTHER_OBJECT_REF,
  allFileText,
  assertLegacySentinelsUnchanged,
  createRecoveryTestStore,
  findJournalSegments,
  generatedSecret,
  journalEvent,
  largeOutput,
  listFiles,
  readJsonl,
  relativeToRoot,
  sha256,
  snapshotTree,
  temporaryCurrentWorkspace,
} from "./fixtures/c21-m3/helpers.js";

const REQUIRED_JOURNAL_API = Object.freeze([
  "createRecoveryStore",
  "appendRecoveryEvent",
  "replayRecoveryJournal",
  "readRecoveryBlob",
]);
const REQUIRED_EVENT_TYPES = Object.freeze([
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
const MULTIPROCESS_APPEND_FIXTURE = fileURLToPath(
  new URL("./fixtures/c21-m3/recovery-journal-append-child.mjs", import.meta.url),
);

const RECOVERY_PROBE = await import("../src/recovery/index.js")
  .then((api) => ({ api, error: null }))
  .catch((error) => ({ api: null, error }));
const JOURNAL_READY = !RECOVERY_PROBE.error
  && REQUIRED_JOURNAL_API.every((name) => typeof RECOVERY_PROBE.api?.[name] === "function")
  && Array.isArray(RECOVERY_PROBE.api?.RECOVERY_EVENT_TYPES);
const journalTest = JOURNAL_READY ? test : test.skip;

test("recovery module publishes the segmented Journal and blob API", async () => {
  const api = await loadRecoveryApi();
  for (const name of REQUIRED_JOURNAL_API) {
    assert.equal(typeof api[name], "function", `${name} must be exported`);
  }
  assert.ok(Array.isArray(api.RECOVERY_EVENT_TYPES), "RECOVERY_EVENT_TYPES must be an explicit array");
});

journalTest("Journal segments are partitioned by object, session, and writer identity", async (t) => {
  const api = await loadRecoveryApi();
  const { store } = createRecoveryTestStore(api, { maxEventsPerSegment: 2 });
  const root = await temporaryCurrentWorkspace(t, "hw-m3-journal-partitions-", {
    withLegacySentinels: true,
  });

  const first = await store.appendRecoveryEvent(root, journalEvent({ summary: "main event one" }));
  const second = await store.appendRecoveryEvent(root, journalEvent({ summary: "main event two" }));
  const rotated = await store.appendRecoveryEvent(root, journalEvent({ summary: "main event three" }));
  const otherSession = await store.appendRecoveryEvent(root, journalEvent({
    session_id: "session-other",
    summary: "other session",
  }));
  const subagent = await store.appendRecoveryEvent(root, journalEvent({
    writer: { kind: "subagent", id: "test-worker" },
    summary: "subagent stream",
  }));
  const otherObject = await store.appendRecoveryEvent(root, journalEvent({
    object_ref: OTHER_OBJECT_REF,
    summary: "other object",
  }));

  assert.equal(
    first.path,
    ".pipeline/runtime/objects/delivery/goal-alpha/events/session-main/main/main/00000001.jsonl",
  );
  assert.equal(second.path, first.path, "one writer fills its current segment before rotation");
  assert.equal(
    rotated.path,
    ".pipeline/runtime/objects/delivery/goal-alpha/events/session-main/main/main/00000002.jsonl",
  );
  assert.equal(
    otherSession.path,
    ".pipeline/runtime/objects/delivery/goal-alpha/events/session-other/main/main/00000001.jsonl",
  );
  assert.equal(
    subagent.path,
    ".pipeline/runtime/objects/delivery/goal-alpha/events/session-main/subagent/test-worker/00000001.jsonl",
  );
  assert.equal(
    otherObject.path,
    ".pipeline/runtime/objects/delivery/cycle-beta/events/session-main/main/main/00000001.jsonl",
  );

  assert.equal((await readJsonl(join(root, first.path))).length, 2);
  assert.equal((await readJsonl(join(root, rotated.path))).length, 1);
  const objectSegments = await findJournalSegments(root, OBJECT_REF);
  assert.equal(objectSegments.length, 4);
  assert.deepEqual(
    objectSegments.map((path) => relativeToRoot(root, path)),
    [first.path, rotated.path, subagent.path, otherSession.path].sort(),
  );
  await assertLegacySentinelsUnchanged(root);
});

journalTest("vector cursors are stable and replay returns only the delta from every stream", async (t) => {
  const api = await loadRecoveryApi();
  const { store } = createRecoveryTestStore(api, { maxEventsPerSegment: 2 });
  const root = await temporaryCurrentWorkspace(t, "hw-m3-journal-cursor-");

  await store.appendRecoveryEvent(root, journalEvent({ summary: "main before cursor" }));
  await store.appendRecoveryEvent(root, journalEvent({
    writer: { kind: "subagent", id: "implement-worker" },
    type: "worker.started",
    summary: "worker before cursor",
  }));
  const base = await store.replayRecoveryJournal(root, { object_ref: OBJECT_REF });

  assert.equal(base.events.length, 2);
  assert.equal(base.cursor.schema_version, "1");
  assert.deepEqual(base.cursor.object_ref, OBJECT_REF);
  assert.equal(base.cursor.streams.length, 2);
  assert.deepEqual(
    JSON.parse(JSON.stringify(base.cursor)),
    base.cursor,
    "cursor must be a stable serializable value",
  );
  for (const stream of base.cursor.streams) {
    assert.match(stream.event_id, /^[a-f0-9]{64}$/);
    assert.equal(stream.sequence, 1);
  }

  await store.appendRecoveryEvent(root, journalEvent({
    type: "files.changed",
    summary: "main after cursor",
  }));
  await store.appendRecoveryEvent(root, journalEvent({
    writer: { kind: "subagent", id: "implement-worker" },
    type: "worker.stopped",
    summary: "worker after cursor",
  }));
  const delta = await store.replayRecoveryJournal(root, {
    object_ref: OBJECT_REF,
    after_cursor: base.cursor,
  });

  assert.deepEqual(
    delta.events.map((event) => event.summary).sort(),
    ["main after cursor", "worker after cursor"],
  );
  assert.deepEqual(delta.events.map((event) => event.sequence).sort(), [2, 2]);
  const empty = await store.replayRecoveryJournal(root, {
    object_ref: OBJECT_REF,
    after_cursor: delta.cursor,
  });
  assert.deepEqual(empty.events, []);
  assert.deepEqual(empty.cursor, delta.cursor);
});

journalTest("append returns a stable vector cursor that replays only later cross-stream events", async (t) => {
  const api = await loadRecoveryApi();
  const { store } = createRecoveryTestStore(api, { maxEventsPerSegment: 2 });
  const root = await temporaryCurrentWorkspace(t, "hw-m3-journal-append-cursor-");

  const initial = await store.appendRecoveryEvent(root, journalEvent({
    summary: "cursor boundary event",
  }));
  assert.ok(initial.cursor, "append must return the vector cursor committed with its event");
  assert.equal(initial.cursor.schema_version, "1");
  assert.deepEqual(initial.cursor.object_ref, OBJECT_REF);
  assert.equal(initial.cursor.streams.length, 1);
  assert.equal(initial.cursor.streams[0].event_id, initial.event.event_id);
  assert.equal(initial.cursor.streams[0].sequence, initial.event.sequence);
  const stableCursor = JSON.parse(JSON.stringify(initial.cursor));

  await store.appendRecoveryEvent(root, journalEvent({
    writer: { kind: "subagent", id: "cursor-worker" },
    type: "worker.started",
    summary: "new stream after append cursor",
  }));
  await store.appendRecoveryEvent(root, journalEvent({
    type: "files.changed",
    summary: "same stream after append cursor",
  }));

  const delta = await store.replayRecoveryJournal(root, {
    object_ref: OBJECT_REF,
    after_cursor: initial.cursor,
  });
  assert.deepEqual(
    delta.events.map((event) => event.summary).sort(),
    ["new stream after append cursor", "same stream after append cursor"],
  );
  assert.deepEqual(initial.cursor, stableCursor, "later appends cannot mutate a returned cursor value");
  const repeated = await store.replayRecoveryJournal(root, {
    object_ref: OBJECT_REF,
    after_cursor: stableCursor,
  });
  assert.deepEqual(repeated.events, delta.events);
  assert.deepEqual(repeated.cursor, delta.cursor);
});

journalTest("same-writer concurrent appends serialize while subagents retain separate streams", async (t) => {
  const api = await loadRecoveryApi();
  const { store } = createRecoveryTestStore(api, { maxEventsPerSegment: 4 });
  const root = await temporaryCurrentWorkspace(t, "hw-m3-journal-concurrent-");
  const count = 16;

  const writes = await Promise.all(Array.from({ length: count }, (_, index) => (
    store.appendRecoveryEvent(root, journalEvent({
      turn_id: `turn-${String(index).padStart(3, "0")}`,
      type: "tool.completed",
      summary: `parallel-main-${index}`,
    }))
  )));
  assert.equal(new Set(writes.map((write) => write.event.event_id)).size, count);
  assert.deepEqual(
    writes.map((write) => write.event.sequence).sort((a, b) => a - b),
    Array.from({ length: count }, (_, index) => index + 1),
  );

  const replay = await store.replayRecoveryJournal(root, { object_ref: OBJECT_REF });
  const main = replay.events.filter((event) => event.writer.kind === "main");
  assert.deepEqual(
    main.map((event) => event.sequence),
    Array.from({ length: count }, (_, index) => index + 1),
    "disk replay must preserve same-stream sequence order",
  );

  const [testWorker, auditWorker] = await Promise.all([
    store.appendRecoveryEvent(root, journalEvent({
      writer: { kind: "subagent", id: "test-worker" },
      type: "worker.started",
      summary: "test worker stream",
    })),
    store.appendRecoveryEvent(root, journalEvent({
      writer: { kind: "subagent", id: "audit-worker" },
      type: "worker.started",
      summary: "audit worker stream",
    })),
  ]);
  assert.notEqual(testWorker.path, auditWorker.path);
  assert.notEqual(testWorker.path, writes[0].path);
  assert.match(testWorker.path, /\/subagent\/test-worker\/00000001\.jsonl$/);
  assert.match(auditWorker.path, /\/subagent\/audit-worker\/00000001\.jsonl$/);
});

journalTest("same-writer appends serialize across independent Hook processes", async (t) => {
  const api = await loadRecoveryApi();
  const { store } = createRecoveryTestStore(api);
  const root = await temporaryCurrentWorkspace(t, "hw-m3-journal-multiprocess-");
  const count = 12;
  const workers = Array.from({ length: count }, (_, index) => (
    startJournalAppendProcess(root, index)
  ));
  t.after(() => {
    for (const worker of workers) {
      if (!worker.child.killed) worker.child.kill();
    }
  });

  await Promise.all(workers.map((worker) => worker.ready));
  for (const worker of workers) worker.child.send({ type: "start" });
  const writes = await Promise.all(workers.map((worker) => worker.result));

  assert.deepEqual(
    writes.map((write) => write.sequence).sort((left, right) => left - right),
    Array.from({ length: count }, (_, index) => index + 1),
  );
  const replay = await store.replayRecoveryJournal(root, { object_ref: OBJECT_REF });
  const events = replay.events.filter((event) => (
    event.session_id === "session-multiprocess" && event.writer.kind === "main"
  ));
  assert.equal(events.length, count);
  assert.deepEqual(
    events.map((event) => event.sequence),
    Array.from({ length: count }, (_, index) => index + 1),
  );
});

journalTest("an abandoned stale reaper cannot permanently block the stream", async (t) => {
  const api = await loadRecoveryApi();
  const { store } = createRecoveryTestStore(api);
  const root = await temporaryCurrentWorkspace(t, "hw-m3-journal-stale-reaper-");
  const sessionId = "session-stale-reaper";
  const writer = { kind: "main", id: "main" };
  const lockKey = `${resolve(root)}\0${OBJECT_REF.kind}\0${OBJECT_REF.id}\0${sessionId}\0${writer.kind}\0${writer.id}`;
  const digest = createHash("sha256").update(Buffer.from(lockKey, "utf8")).digest("hex");
  const lockDirectory = join(root, ".pipeline", "runtime", "recovery", "locks");
  const lockPath = join(lockDirectory, `${digest}.lock`);
  const reaperPath = `${lockPath}.reaper`;
  const staleOwner = `${JSON.stringify({ pid: null, token: "abandoned", acquired_at_ms: 0 })}\n`;
  const staleTime = new Date(Date.now() - 180_000);
  await mkdir(lockDirectory, { recursive: true });
  await writeFile(lockPath, staleOwner, "utf8");
  await writeFile(reaperPath, staleOwner, "utf8");
  await utimes(lockPath, staleTime, staleTime);
  await utimes(reaperPath, staleTime, staleTime);

  const result = await store.appendRecoveryEvent(root, journalEvent({
    session_id: sessionId,
    writer,
    summary: "append after stale reaper recovery",
  }));
  assert.equal(result.event.sequence, 1);
  await assert.rejects(readFile(lockPath, "utf8"), { code: "ENOENT" });
  await assert.rejects(readFile(reaperPath, "utf8"), { code: "ENOENT" });
});

journalTest("at least sixteen writer streams concurrently converge on one redacted content-addressed blob", async (t) => {
  const api = await loadRecoveryApi();
  const { store } = createRecoveryTestStore(api, {
    maxEventsPerSegment: 2,
    inlineOutputBytes: 64,
  });
  const root = await temporaryCurrentWorkspace(t, "hw-m3-journal-blob-concurrency-");
  const secret = generatedSecret();
  const sharedOutput = `${largeOutput(524_288)}\npassword=${secret}`;
  const writerCount = 32;

  const settled = await Promise.allSettled(Array.from({ length: writerCount }, (_, index) => (
    store.appendRecoveryEvent(root, journalEvent({
      writer: { kind: "subagent", id: `blob-writer-${String(index).padStart(2, "0")}` },
      turn_id: `turn-blob-${index}`,
      type: "tool.completed",
      summary: `shared redacted output ${index}`,
      payload: { output: sharedOutput },
    }))
  )));
  const failures = settled
    .filter((entry) => entry.status === "rejected")
    .map((entry) => String(entry.reason?.code || entry.reason?.message || "rejected"));
  assert.deepEqual(failures, [], "every distinct writer append must fulfill under blob contention");

  const writes = settled.map((entry) => entry.value);
  assert.equal(new Set(writes.map((entry) => entry.path)).size, writerCount);
  const descriptors = writes.map((entry) => entry.event.payload.output);
  assert.equal(new Set(descriptors.map((entry) => entry.digest)).size, 1);
  for (const descriptor of descriptors) assert.deepEqual(descriptor, descriptors[0]);

  for (const write of writes) {
    const persisted = await readJsonl(join(root, write.path));
    assert.equal(persisted.length, 1);
    assert.equal(persisted[0].event_id, write.event.event_id);
    assert.deepEqual(persisted[0].payload.output, descriptors[0]);
  }
  const blobs = (await listFiles(root)).filter((path) => (
    path.startsWith(".pipeline/runtime/recovery/blobs/")
  ));
  assert.equal(blobs.length, 1, "all concurrent writers must converge on one blob path");
  const loaded = await store.readRecoveryBlob(root, descriptors[0]);
  assert.equal(loaded.digest, descriptors[0].digest);
  assert.equal(loaded.content.includes(secret), false);
  assert.match(loaded.content, /\[REDACTED\]/);
  assert.equal((await allFileText(root)).includes(secret), false);
});

journalTest("event taxonomy is explicit, rationale_summary persists, and hidden reasoning fails before write", async (t) => {
  const api = await loadRecoveryApi();
  const published = new Set(api.RECOVERY_EVENT_TYPES);
  for (const type of REQUIRED_EVENT_TYPES) assert.equal(published.has(type), true, `missing event type ${type}`);
  const { store } = createRecoveryTestStore(api);
  const root = await temporaryCurrentWorkspace(t, "hw-m3-journal-taxonomy-");

  const rationale = "Segmented streams avoid a shared append contention point.";
  const appended = await store.appendRecoveryEvent(root, journalEvent({
    type: "decision.recorded",
    summary: "Partition each writer stream.",
    rationale_summary: rationale,
  }));
  assert.equal(appended.event.rationale_summary, rationale);
  assert.equal((await readJsonl(join(root, appended.path)))[0].rationale_summary, rationale);

  const invalidInputs = [
    journalEvent({ type: "model.chain_of_thought", summary: "invalid type" }),
    journalEvent({ chain_of_thought: "M3-HIDDEN-DIRECT", summary: "invalid field" }),
    journalEvent({ payload: { nested: { hidden_reasoning: "M3-HIDDEN-NESTED" } } }),
    journalEvent({ payload: { scratchpad: "M3-HIDDEN-SCRATCHPAD" } }),
  ];
  for (const input of invalidInputs) {
    const before = await snapshotTree(root);
    await assert.rejects(
      store.appendRecoveryEvent(root, input),
      (error) => {
        const rendered = String(error?.message || error);
        assert.match(rendered, /event|reason|hidden|scratchpad|taxonomy|type/i);
        assert.doesNotMatch(rendered, /M3-HIDDEN-/);
        return true;
      },
    );
    assert.deepEqual(await snapshotTree(root), before, "invalid hidden reasoning must be zero-write");
  }
});

journalTest("sensitive-like routing metadata rejects before path selection without echo or residue", async (t) => {
  const api = await loadRecoveryApi();
  const cases = ["object_ref.id", "session_id", "writer.id", "turn_id"];

  for (const [index, field] of cases.entries()) {
    await t.test(field, async (subtest) => {
      const { store } = createRecoveryTestStore(api);
      const root = await temporaryCurrentWorkspace(subtest, `hw-m3-journal-sensitive-metadata-${index}-`);
      const sample = `${generatedSecret()}-${index}`;
      const input = journalEvent();
      if (field === "object_ref.id") input.object_ref = { ...input.object_ref, id: sample };
      if (field === "session_id") input.session_id = sample;
      if (field === "writer.id") input.writer = { ...input.writer, id: sample };
      if (field === "turn_id") input.turn_id = sample;
      const before = await snapshotTree(root);

      let result;
      let caught;
      try {
        result = await store.appendRecoveryEvent(root, input);
      } catch (error) {
        caught = error;
      }
      assert.ok(caught, `${field} sensitive metadata must reject`);
      assert.equal(result, undefined);
      assert.equal(String(caught?.message || caught).includes(sample), false);
      assert.deepEqual(await snapshotTree(root), before, `${field} must reject before any write`);
      assert.equal((await allFileText(root)).includes(sample), false);
    });
  }
});

journalTest("redaction runs before Journal or blob persistence and never echoes the seeded value", async (t) => {
  const api = await loadRecoveryApi();
  const { store } = createRecoveryTestStore(api, { inlineOutputBytes: 64 });
  const root = await temporaryCurrentWorkspace(t, "hw-m3-journal-redaction-");
  const secret = generatedSecret();

  const appended = await store.appendRecoveryEvent(root, journalEvent({
    type: "tool.completed",
    summary: "A tool returned sensitive configuration.",
    payload: {
      tool: "config-probe",
      arguments: { password: secret },
      output: `authorization=${secret}`,
    },
  }));
  const rendered = JSON.stringify(appended.event);
  assert.doesNotMatch(rendered, new RegExp(escapeRegExp(secret)));
  assert.match(rendered, /\[REDACTED\]/);

  const largeSecretOutput = `${"safe-prefix-".repeat(40)}password=${secret}`;
  const blobEvent = await store.appendRecoveryEvent(root, journalEvent({
    turn_id: "turn-002",
    type: "tool.completed",
    summary: "A large sensitive output requires redaction before hashing.",
    payload: { output: largeSecretOutput },
  }));
  assert.equal(blobEvent.event.payload.output.storage, "content_addressed_blob");
  const loaded = await store.readRecoveryBlob(root, blobEvent.event.payload.output);
  assert.equal(loaded.content.includes(secret), false);
  assert.match(loaded.content, /\[REDACTED\]/);
  assert.doesNotMatch(await allFileText(root), new RegExp(escapeRegExp(secret)));
});

journalTest("large output becomes one verified content-addressed blob and loads only on demand", async (t) => {
  const api = await loadRecoveryApi();
  const { store } = createRecoveryTestStore(api, { inlineOutputBytes: 64 });
  const root = await temporaryCurrentWorkspace(t, "hw-m3-journal-blob-");
  const output = largeOutput();

  const first = await store.appendRecoveryEvent(root, journalEvent({
    type: "tool.completed",
    summary: "Large compiler output was captured.",
    payload: { tool: "compiler", output },
  }));
  const descriptor = first.event.payload.output;
  assert.deepEqual(
    Object.keys(descriptor).sort(),
    ["bytes", "digest", "media_type", "storage", "summary"],
  );
  assert.equal(descriptor.storage, "content_addressed_blob");
  assert.equal(descriptor.digest, `sha256:${sha256(output)}`);
  assert.equal(descriptor.bytes, Buffer.byteLength(output));
  assert.equal(descriptor.media_type, "text/plain");
  assert.ok(Buffer.byteLength(descriptor.summary) <= 64);

  const digest = descriptor.digest.slice("sha256:".length);
  const blobPath = `.pipeline/runtime/recovery/blobs/${digest}`;
  assert.equal((await listFiles(root)).includes(blobPath), true);
  const segmentBytes = await readFile(join(root, first.path), "utf8");
  assert.equal(segmentBytes.includes("M3_LARGE_OUTPUT_END"), false, "full output must not remain inline");

  const loaded = await store.readRecoveryBlob(root, descriptor);
  assert.equal(loaded.digest, descriptor.digest);
  assert.equal(loaded.bytes, Buffer.byteLength(output));
  assert.equal(loaded.media_type, "text/plain");
  assert.equal(loaded.content, output);

  const second = await store.appendRecoveryEvent(root, journalEvent({
    turn_id: "turn-002",
    type: "tool.completed",
    summary: "The same compiler output was referenced again.",
    payload: { tool: "compiler", output },
  }));
  assert.equal(second.event.payload.output.digest, descriptor.digest);
  const blobFiles = (await listFiles(root)).filter((path) => path.startsWith(".pipeline/runtime/recovery/blobs/"));
  assert.deepEqual(blobFiles, [blobPath], "identical output must deduplicate by content digest");
});

async function loadRecoveryApi() {
  if (RECOVERY_PROBE.error) {
    assert.fail(`recovery module is unavailable: ${RECOVERY_PROBE.error.code || "load failure"}`);
  }
  return RECOVERY_PROBE.api;
}

function startJournalAppendProcess(root, index) {
  const child = fork(MULTIPROCESS_APPEND_FIXTURE, [root, String(index)], {
    stdio: ["ignore", "ignore", "pipe", "ipc"],
  });
  let stderr = "";
  let ready = false;
  let complete = false;
  let resolveReady;
  let rejectReady;
  let resolveResult;
  let rejectResult;
  const readyPromise = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const resultPromise = new Promise((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("message", (message) => {
    if (message?.type === "ready") {
      ready = true;
      resolveReady();
      return;
    }
    if (message?.type === "result") {
      complete = true;
      resolveResult(message.result);
      return;
    }
    if (message?.type === "error") {
      complete = true;
      rejectResult(new Error(`${message.error?.code || "child error"}: ${message.error?.message || "unknown"}`));
    }
  });
  child.on("error", (error) => {
    if (!ready) rejectReady(error);
    if (!complete) rejectResult(error);
  });
  child.on("exit", (code, signal) => {
    if (complete) return;
    const error = new Error(
      `Recovery Journal append child exited before completion (code=${code}, signal=${signal}): ${stderr.trim()}`,
    );
    if (!ready) rejectReady(error);
    rejectResult(error);
  });

  return { child, ready: readyPromise, result: resultPromise };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
