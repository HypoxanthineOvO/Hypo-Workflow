import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import * as CORE from "../src/index.js";
import {
  assertLegacySentinelsUnchanged,
  captureError,
  snapshotTree,
  temporaryCurrentWorkspace,
  writeText,
} from "./fixtures/c21-m2/helpers.js";

const FIXTURE_ROOT = fileURLToPath(new URL("./fixtures/c23-m5/", import.meta.url));
const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const FIXED_NOW = "2026-07-18T18:00:00+08:00";
const execFileAsync = promisify(execFile);
const STATUS_API_AVAILABLE = typeof CORE.createExperimentStatusStore === "function";
const STATUS_STORE_AVAILABLE = STATUS_API_AVAILABLE && hasStatusStoreContract();
const statusTest = STATUS_STORE_AVAILABLE ? test : test.skip;

test("C23 M5 publishes the Experiment event and materialized status Store", () => {
  assert.equal(typeof CORE.createExperimentStatusStore, "function");
  const store = CORE.createExperimentStatusStore({ clock: () => FIXED_NOW });
  assert.equal(typeof store.appendEvent, "function");
  assert.equal(typeof store.rebuild, "function");
  assert.equal(typeof store.readStatus, "function");
});

test("C23 M5 fixture captures layered baselines, dataset meaning, cross scans, outcomes, and next work", async () => {
  const fixture = await readFixture();
  assert.equal(fixture.schema_version, "1");
  assert.equal(fixture.project_id, "acesim-qv100");

  const events = allEvents(fixture);
  assert.ok(events.length >= 10);
  assert.equal(new Set(events.map(({ event_key }) => event_key)).size, events.length);
  assert.deepEqual(
    [...new Set(events.map(({ event_type }) => event_type))].sort(),
    [
      "attempt_recorded",
      "baseline_declared",
      "dataset_declared",
      "exception_recorded",
      "experiment_lifecycle",
      "machine_declared",
      "next_action_set",
      "scan_declared",
    ],
  );

  const baselines = events.filter(({ event_type }) => event_type === "baseline_declared");
  assert.equal(baselines.some(({ payload }) => payload.role === "default"), true);
  assert.equal(baselines.some(({ payload }) => (
    payload.role === "contextual"
    && payload.compared_to_baseline_id === "qv100-300k-stock"
  )), true);

  const dataset = events.find(({ event_type }) => event_type === "dataset_declared");
  assert.match(dataset.payload.description, /trace|cache|memory/i);
  assert.ok(dataset.payload.units.every(({ kind, meaning }) => kind === "trace" && meaning));

  const machine = events.find(({ event_type }) => event_type === "machine_declared");
  assert.equal(machine.payload.machine_id, "qv100-lab-a");
  assert.match(machine.payload.gpu, /V100/);
  assert.ok(machine.payload.driver_version && machine.payload.cuda_version);

  const scans = events.filter(({ event_type }) => event_type === "scan_declared");
  assert.equal(scans.some(({ payload }) => Object.keys(payload.axes).length === 1), true);
  assert.equal(scans.some(({ payload }) => Object.keys(payload.axes).length === 2), true);
  assert.ok(scans.every(({ payload }) => payload.purpose && payload.baseline_id && payload.dataset_id));

  const attempts = events.filter(({ event_type }) => event_type === "attempt_recorded");
  assert.equal(attempts.some(({ payload }) => payload.status === "failed"), true);
  assert.equal(attempts.some(({ payload }) => payload.scientific_review?.status === "pending_confirmation"), true);
  assert.equal(attempts.some(({ payload }) => payload.rerun_of_attempt_id), true);
  assert.equal(
    attempts.filter(({ payload }) => payload.identity_hash === attempts[0].payload.identity_hash).length,
    2,
    "fixture must expose same-identity rerun output-retention risk",
  );
});

statusTest("C23 M5 records immutable content-addressed events and rejects logical-key drift", async (t) => {
  const fixture = await readFixture();
  const root = await statusWorkspace(t, "hw-c23-m5-events-", fixture.project_id);
  const store = createStore();
  const first = fixture.clone_a_events[0];

  const appended = await store.appendEvent(root, first, { id: "c23-m5-event-first" });
  assert.match(appended.event_id, /^event-[a-f0-9]{32}$/);
  assert.match(
    appended.path,
    /^\.pipeline\/memory\/experiment-events\/acesim-qv100\/event-[a-f0-9]{32}\.yaml$/,
  );
  assert.equal(appended.deduplicated, false);

  const deduplicated = await store.appendEvent(root, structuredClone(first), { id: "c23-m5-event-dedupe" });
  assert.equal(deduplicated.event_id, appended.event_id);
  assert.equal(deduplicated.deduplicated, true);

  const beforeConflict = await snapshotTree(root);
  await assert.rejects(
    store.appendEvent(root, fixture.conflicting_event, { id: "c23-m5-event-conflict" }),
    /conflict|event.key|logical|supersed|drift/i,
  );
  assert.deepEqual(await snapshotTree(root), beforeConflict, "event-key conflicts must reject before writing");
  await assertLegacySentinelsUnchanged(root);
});

statusTest("C23 M5 rejects project drift, unsupported event types, and unsafe source references before writing", async (t) => {
  const fixture = await readFixture();
  const baseline = fixture.base_events[0];
  const variants = [
    ["manifest-project-drift", {
      ...structuredClone(baseline),
      event_key: "baseline/other-project",
      project_id: "another-project",
    }],
    ["unsupported-event-type", {
      ...structuredClone(baseline),
      event_key: "baseline/typo-event-type",
      event_type: "baseline_decalred",
    }],
    ["unsafe-source-reference", {
      ...structuredClone(baseline),
      event_key: "baseline/unsafe-source-ref",
      source_refs: ["../../outside/status.yaml"],
    }],
  ];
  for (const [name, event] of variants) {
    await t.test(name, async (subtest) => {
      const root = await statusWorkspace(subtest, `hw-c23-m5-${name}-`, fixture.project_id);
      const store = createStore();
      const before = await snapshotTree(root);
      await assert.rejects(
        store.appendEvent(root, event, { id: `c23-m5-${name}` }),
        /project|manifest|event.type|unsupported|source|reference|traversal|safe/i,
      );
      assert.deepEqual(await snapshotTree(root), before, `${name} must be zero-write`);
      await assertLegacySentinelsUnchanged(root);
    });
  }
});

statusTest("C23 M5 project-scoped rebuild and read fail before probing another project", async (t) => {
  const fixture = await readFixture();
  const root = await statusWorkspace(t, "hw-c23-m5-project-query-", fixture.project_id);
  const store = createStore();
  await appendAll(store, root, fixture.base_events, "c23-m5-project-query");
  for (const [name, action] of [
    ["rebuild", () => store.rebuild(
      root,
      { project_id: "another-project", limit: 20 },
      { id: "c23-m5-project-query-rebuild" },
    )],
    ["read", () => store.readStatus(root, { project_id: "another-project", limit: 20 })],
  ]) {
    const before = await snapshotTree(root);
    await assert.rejects(action, /project|manifest|mismatch/i, name);
    assert.deepEqual(await snapshotTree(root), before, `${name} project mismatch must be zero-write`);
  }
});

statusTest("C23 M5 reads one bounded materialized projection without rescanning event or result trees", async (t) => {
  const fixture = await readFixture();
  const root = await statusWorkspace(t, "hw-c23-m5-status-", fixture.project_id);
  const store = createStore();
  await appendAll(store, root, allEvents(fixture), "c23-m5-status");
  const rebuilt = await store.rebuild(root, {
    project_id: fixture.project_id,
    limit: 2,
  }, { id: "c23-m5-status-rebuild" });
  assert.match(rebuilt.projection_path, /experiment-status\/acesim-qv100\/status\.yaml$/);

  await rm(join(root, ".pipeline", "memory", "experiment-events"), { recursive: true, force: true });
  const status = await store.readStatus(root, { project_id: fixture.project_id, limit: 2 });
  const detailedStatus = await store.readStatus(root, { project_id: fixture.project_id, limit: 10 });
  assert.equal(status.schema_version, "1");
  assert.equal(status.authority_role, "derived");
  assert.equal(status.project_id, fixture.project_id);
  assert.equal(status.headline.default_baseline_id, "qv100-300k-stock");
  assert.equal(status.baselines.some(({ baseline_id }) => baseline_id === "qv100-77k-stock"), true);
  assert.equal(status.datasets[0].dataset_id, "rodinia-memory-traces");
  assert.ok(status.datasets[0].description);
  assert.equal(status.machines[0].machine_id, "qv100-lab-a");
  assert.equal(status.scans.length, 2);
  assert.ok(status.scans.every(({ purpose }) => purpose));
  assert.deepEqual(status.outcomes.counts, {
    completed: 3,
    failed: 1,
    interrupted: 0,
  });
  assert.equal(status.pending_confirmations.length, 1);
  assert.equal(status.next_actions.some(({ status: actionStatus }) => actionStatus === "open"), true);
  assert.equal(status.exceptions.some(({ summary }) => /host memory/i.test(summary)), true);
  assert.equal(
    detailedStatus.exceptions.some(({ kind, related_attempt_ids = [] }) => (
      kind === "same_identity_output_overlap"
      && related_attempt_ids.includes("qv100-freq-1000-a1")
      && related_attempt_ids.includes("qv100-freq-1000-a2")
    )),
    true,
    "status must explain rerun output-retention risk instead of hiding the older Attempt",
  );
  assert.equal(detailedStatus.retention.some(({ lifecycle }) => lifecycle === "trashed"), true);
  assert.equal(detailedStatus.retention.some(({ lifecycle }) => lifecycle === "restored"), true);
  assert.equal(detailedStatus.exceptions.some(({ kind }) => kind === "trash_restore_lineage"), true);
  assert.deepEqual(status.source.event_count, allEvents(fixture).length);
  assert.ok(status.source.event_ids.length <= 2);
  assert.match(status.source.event_ids_digest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(status.view.limit, 2);
  assert.equal(status.view.totals.source_event_ids, allEvents(fixture).length);
  assert.equal(status.view.totals.table_rows, status.table_model.total_rows);
  assert.ok(status.view.truncated_fields.includes("source_event_ids"));
  assert.ok(status.table_model.rows.length <= 2);
  assert.equal(status.table_model.truncated, true);
  assert.ok(Array.isArray(status.detail_refs) && status.detail_refs.length > 0);
  assert.ok(JSON.stringify(status).length < 65_536, "bounded status must not become a giant JSON dump");
  await assertLegacySentinelsUnchanged(root);
});

statusTest("C23 M5 materializes enough rows for a later bounded query to widen without an event rescan", async (t) => {
  const fixture = await readFixture();
  const root = await statusWorkspace(t, "hw-c23-m5-status-widen-", fixture.project_id);
  const store = createStore();
  await appendAll(store, root, allEvents(fixture), "c23-m5-status-widen");
  await store.rebuild(root, {
    project_id: fixture.project_id,
    limit: 1,
  }, { id: "c23-m5-status-widen-rebuild" });

  const status = await store.readStatus(root, { project_id: fixture.project_id, limit: 20 });
  assert.ok(status.table_model.total_rows > 1);
  assert.equal(
    status.table_model.rows.length,
    Math.min(status.table_model.total_rows, 20),
    "rebuild-time display limits must not permanently discard rows from the materialized projection",
  );
});

statusTest("C23 M5 bounds the complete status view and keeps the newest actionable entries", async (t) => {
  const projectId = "bulk-project";
  const root = await statusWorkspace(t, "hw-c23-m5-bounded-view-", projectId);
  const store = createStore();
  const events = bulkNextActionEvents(250, projectId);
  const projection = CORE.compileExperimentProjectStatus(events, { project_id: projectId, limit: 200 });
  assert.equal(projection.table_model.rows.length, 200);
  assert.equal(
    projection.table_model.rows.some(({ label }) => label === "next/249"),
    true,
    "the materialized latest-200 window must retain the newest event",
  );
  assert.equal(
    projection.table_model.rows.some(({ label }) => label === "next/0"),
    false,
    "the materialized latest-200 window must evict the oldest event",
  );
  await writeText(
    join(root, ".pipeline", "memory", "experiment-status", projectId, "status.yaml"),
    `${CORE.stringifyYaml(projection).trimEnd()}\n`,
  );

  const status = await store.readStatus(root, { project_id: projectId, limit: 5 });
  for (const [name, values] of [
    ["baselines", status.baselines],
    ["machines", status.machines],
    ["datasets", status.datasets],
    ["scans", status.scans],
    ["outcomes.attempts", status.outcomes.attempts],
    ["pending_confirmations", status.pending_confirmations],
    ["exceptions", status.exceptions],
    ["next_actions", status.next_actions],
    ["retention", status.retention],
    ["detail_refs", status.detail_refs],
    ["source.event_ids", status.source.event_ids],
    ["table_model.rows", status.table_model.rows],
  ]) {
    assert.ok(values.length <= 5, `${name} must obey the query limit`);
  }
  assert.equal(status.source.event_count, 250);
  assert.match(status.source.event_ids_digest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(
    status.source.event_ids_digest,
    `sha256:${CORE.canonicalHash(projection.source.event_ids)}`,
    "source digest must bind the full sorted event-id set retained by the materialized projection",
  );
  assert.equal(status.table_model.total_rows, 250);
  assert.equal(status.view.limit, 5);
  assert.equal(status.view.totals.next_actions, 250);
  assert.equal(status.view.totals.source_event_ids, 250);
  assert.equal(status.view.totals.table_rows, 250);
  assert.deepEqual(
    [...status.view.truncated_fields].sort(),
    ["detail_refs", "next_actions", "source_event_ids", "table_rows"],
  );
  assert.equal(
    status.next_actions.some(({ action_id }) => action_id === "action-249"),
    true,
    "a bounded current-status answer must retain the newest next action",
  );
  assert.equal(
    status.table_model.rows.some(({ label }) => label === "next/249"),
    true,
    "the bounded table must retain the newest action row",
  );
  assert.ok(Buffer.byteLength(JSON.stringify(status)) < 65_536, "bounded status must remain below 64 KiB");
  assert.doesNotMatch(
    JSON.stringify(status),
    /sk-audit-seeded|hidden_reasoning|private_reasoning|chain_of_thought/i,
  );
});

statusTest("C23 M5 persisted projection validation preserves the bounded status contract after rehashing", async (t) => {
  const fixture = await readFixture();
  const root = await statusWorkspace(t, "hw-c23-m5-status-integrity-", fixture.project_id);
  const store = createStore();
  await appendAll(store, root, fixture.base_events, "c23-m5-status-integrity");
  const rebuilt = await store.rebuild(root, {
    project_id: fixture.project_id,
    limit: 20,
  }, { id: "c23-m5-status-integrity-rebuild" });
  const projectionPath = join(root, rebuilt.projection_path);
  const original = CORE.parseYaml(await readFile(projectionPath, "utf8"));
  const seededRow = structuredClone(original.table_model.rows[0]);
  const variants = [
    ["more-than-maximum-rows", (projection) => {
      projection.table_model.rows = Array.from({ length: 201 }, (_, index) => ({
        ...structuredClone(seededRow),
        id: `event-${index.toString(16).padStart(32, "0")}`,
      }));
      projection.table_model.total_rows = 201;
      projection.table_model.row_limit = 200;
      projection.table_model.truncated = true;
    }],
    ["rows-exceed-declared-row-limit", (projection) => {
      projection.table_model.rows = [
        structuredClone(seededRow),
        { ...structuredClone(seededRow), id: "event-ffffffffffffffffffffffffffffffff" },
      ];
      projection.table_model.total_rows = 2;
      projection.table_model.row_limit = 1;
      projection.table_model.truncated = true;
    }],
    ["total-rows-smaller-than-materialized-rows", (projection) => {
      projection.table_model.rows = [
        structuredClone(seededRow),
        { ...structuredClone(seededRow), id: "event-eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" },
      ];
      projection.table_model.total_rows = 1;
      projection.table_model.row_limit = 20;
      projection.table_model.truncated = false;
    }],
  ];
  for (const [name, mutateProjection] of variants) {
    await t.test(name, async () => {
      const projection = structuredClone(original);
      mutateProjection(projection);
      delete projection.projection_hash;
      projection.projection_hash = CORE.canonicalHash(projection);
      await writeFile(projectionPath, `${CORE.stringifyYaml(projection).trimEnd()}\n`, "utf8");
      await assert.rejects(
        store.readStatus(root, { project_id: fixture.project_id, limit: 200 }),
        /projection|status|row|bounded|limit|integrity/i,
      );
    });
  }
});

statusTest("C23 M5 rejects semantically invalid or secret-bearing projections even after canonical re-signing", async (t) => {
  const fixture = await readFixture();
  const root = await statusWorkspace(t, "hw-c23-m5-projection-semantics-", fixture.project_id);
  const store = createStore();
  await appendAll(store, root, allEvents(fixture), "c23-m5-projection-semantics");
  const rebuilt = await store.rebuild(root, {
    project_id: fixture.project_id,
    limit: 20,
  }, { id: "c23-m5-projection-semantics-rebuild" });
  const projectionPath = join(root, rebuilt.projection_path);
  const original = CORE.parseYaml(await readFile(projectionPath, "utf8"));
  const seededSecret = "sk-audit-seeded-do-not-echo";
  const hugeText = "x".repeat(70 * 1024);
  const variants = [
    ["unknown-large-headline-field", (projection) => {
      projection.headline.audit_blob = hugeText;
    }],
    ["forged-outcome-counts", (projection) => {
      projection.outcomes.counts.completed = 999;
      projection.outcomes.counts.failed = 0;
    }],
    ["unknown-secret-source-field", (projection) => {
      projection.source.api_key = seededSecret;
    }],
    ["unknown-hidden-bucket-field", (projection) => {
      projection.baselines[0].audit = { private_reasoning: "must not enter a status view" };
    }],
    ["unsafe-detail-reference", (projection) => {
      projection.detail_refs[0] = "../../outside/private-result.json";
    }],
    ["unknown-nested-detail-reference", (projection) => {
      projection.detail_refs[0] = {
        path: projection.detail_refs[0],
        unknown: { hidden_reasoning: "must not enter a status view" },
      };
    }],
    ["combined-semantic-substitution", (projection) => {
      projection.headline.audit_blob = hugeText;
      projection.outcomes.counts.completed = 999;
      projection.source.api_key = seededSecret;
      projection.datasets[0].unknown = { hidden_reasoning: "must not enter a status view" };
      projection.detail_refs[0] = "/absolute/private-result.json";
    }],
  ];

  for (const [name, mutateProjection] of variants) {
    await t.test(name, async () => {
      const projection = structuredClone(original);
      mutateProjection(projection);
      delete projection.projection_hash;
      projection.projection_hash = CORE.canonicalHash(projection);
      await writeFile(projectionPath, `${CORE.stringifyYaml(projection).trimEnd()}\n`, "utf8");
      const error = await captureError(() => store.readStatus(root, {
        project_id: fixture.project_id,
        limit: 20,
      }));
      assert.ok(error, `${name} must fail closed`);
      assert.match(
        String(error.message || error),
        /projection|status|schema|integrity|secret|reasoning|reference|path|count|unknown|bounded/i,
      );
      assert.doesNotMatch(String(error.message || error), new RegExp(seededSecret, "i"));
    });
  }

  await writeFile(projectionPath, `${CORE.stringifyYaml(original).trimEnd()}\n`, "utf8");
  const valid = await store.readStatus(root, { project_id: fixture.project_id, limit: 20 });
  const serialized = JSON.stringify(valid);
  assert.ok(Buffer.byteLength(serialized) < 65_536);
  assert.doesNotMatch(serialized, /sk-audit-seeded|hidden_reasoning|private_reasoning|chain_of_thought/i);
});

statusTest("C23 M5 binds Attempt events to payload.attempt_id and rejects alias substitution", async (t) => {
  const fixture = await readFixture();
  const original = fixture.base_events.find(({ event_type }) => event_type === "attempt_recorded");
  const invalid = [
    ["missing-authoritative-attempt-id", (event) => {
      delete event.payload.attempt_id;
      event.payload.source_attempt_id = "qv100-freq-1000-a1";
    }],
    ["mismatched-source-attempt-id", (event) => {
      event.payload.source_attempt_id = "different-attempt-id";
    }],
  ];
  for (const [name, mutateEvent] of invalid) {
    await t.test(name, () => {
      const event = structuredClone(original);
      mutateEvent(event);
      assert.throws(
        () => CORE.compileExperimentProjectStatus([event], {
          project_id: fixture.project_id,
          limit: 20,
        }),
        /attempt|source|identity|schema|mismatch/i,
      );
    });
  }

  await t.test("same-experiment-duplicate-with-different-source-aliases", () => {
    const first = structuredClone(original);
    first.payload.source_attempt_id = first.payload.attempt_id;
    const duplicate = structuredClone(original);
    duplicate.event_key = "attempt/duplicate-local-id-with-other-source-alias";
    duplicate.occurred_at = "2026-07-02T12:01:00+08:00";
    duplicate.payload.source_attempt_id = "source-alias-two";
    duplicate.payload.run_id = "acesim-qv100-frequency-1000-duplicate";
    duplicate.payload.identity_hash = "5555555555555555555555555555555555555555555555555555555555555555";
    duplicate.payload.output_refs = ["results/duplicate/metrics.json"];
    assert.throws(
      () => CORE.compileExperimentProjectStatus([first, duplicate], {
        project_id: fixture.project_id,
        limit: 20,
      }),
      /attempt|duplicate|recorded|conflict|mismatch/i,
    );
  });

  const exactAlias = structuredClone(original);
  exactAlias.payload.source_attempt_id = exactAlias.payload.attempt_id;
  try {
    assert.equal(CORE.compileExperimentProjectStatus([exactAlias], {
      project_id: fixture.project_id,
      limit: 20,
    }).outcomes.counts.completed, 1);
  } catch (error) {
    assert.match(
      String(error.message || error),
      /source.attempt|unsupported|schema|unknown/i,
      "an implementation may reject source_attempt_id entirely instead of supporting an exact alias",
    );
  }
});

statusTest("C23 M5 scopes Attempt source identity by Experiment", async () => {
  const fixture = await readFixture();
  const original = fixture.base_events.find(({ event_type }) => event_type === "attempt_recorded");
  const sibling = structuredClone(original);
  sibling.event_key = "attempt/sibling-experiment-same-local-id";
  sibling.experiment_id = "acesim-qv100-sibling-study";
  sibling.occurred_at = "2026-07-02T12:05:00+08:00";
  sibling.source_refs = [{
    type: "experiment_attempt",
    ref: sibling.experiment_id,
    locator: `attempt:${sibling.payload.attempt_id}`,
  }];
  sibling.payload.run_id = "acesim-qv100-sibling-run";
  sibling.payload.identity_hash = "4444444444444444444444444444444444444444444444444444444444444444";
  sibling.payload.output_refs = ["results/sibling/metrics.json"];

  const status = CORE.compileExperimentProjectStatus([original, sibling], {
    project_id: fixture.project_id,
    limit: 20,
  });
  assert.equal(status.outcomes.counts.completed, 2);
  assert.deepEqual(
    status.outcomes.attempts.map(({ attempt_id }) => attempt_id),
    [original.payload.attempt_id, sibling.payload.attempt_id],
  );
});

statusTest("C23 M5 two-clone event union rebuilds deterministically without a runner or background process", async (t) => {
  const fixture = await readFixture();
  const store = createStore();
  const cloneA = await statusWorkspace(t, "hw-c23-m5-clone-a-", fixture.project_id);
  const cloneB = await statusWorkspace(t, "hw-c23-m5-clone-b-", fixture.project_id);
  const mergedAB = await statusWorkspace(t, "hw-c23-m5-merged-ab-", fixture.project_id);
  const mergedBA = await statusWorkspace(t, "hw-c23-m5-merged-ba-", fixture.project_id);

  await appendAll(store, cloneA, [...fixture.base_events, ...fixture.clone_a_events], "c23-m5-clone-a");
  await appendAll(store, cloneB, [...fixture.base_events, ...fixture.clone_b_events], "c23-m5-clone-b");

  const union = allEvents(fixture);
  await appendAll(store, mergedAB, union, "c23-m5-merge-ab");
  await appendAll(store, mergedBA, [...union].reverse(), "c23-m5-merge-ba");
  await store.rebuild(mergedAB, { project_id: fixture.project_id, limit: 20 }, { id: "c23-m5-rebuild-ab" });
  await store.rebuild(mergedBA, { project_id: fixture.project_id, limit: 20 }, { id: "c23-m5-rebuild-ba" });

  const statusAB = await store.readStatus(mergedAB, { project_id: fixture.project_id, limit: 20 });
  const statusBA = await store.readStatus(mergedBA, { project_id: fixture.project_id, limit: 20 });
  assert.deepEqual(statusBA, statusAB, "projection rebuild must be independent of clone/event arrival order");
  assert.equal(statusAB.source.event_count, union.length);
  assert.equal(statusAB.outcomes.counts.completed, 3);
  assert.equal(statusAB.outcomes.counts.failed, 1);
  assert.equal(Object.hasOwn(statusAB, "scheduler"), false);
  assert.equal(Object.hasOwn(statusAB, "processes"), false);
  assert.equal(JSON.stringify(statusAB).includes("tmux attach"), false);
  await assertLegacySentinelsUnchanged(cloneA);
  await assertLegacySentinelsUnchanged(cloneB);
  await assertLegacySentinelsUnchanged(mergedAB);
  await assertLegacySentinelsUnchanged(mergedBA);
});

statusTest("C23 M5 Git-like clones merge immutable events and fail closed on a logical conflict", async (t) => {
  const fixture = await readFixture();
  const store = createStore();
  const seed = await statusWorkspace(t, "hw-c23-m5-git-seed-", fixture.project_id);
  await appendAll(store, seed, fixture.base_events, "c23-m5-git-base");
  await initGit(seed);
  await runGit(seed, ["add", ".pipeline/manifest.yaml", ".pipeline/memory/experiment-events"]);
  await runGit(seed, ["commit", "-qm", "seed experiment events"]);

  const cloneHome = await mkdtemp(join(tmpdir(), "hw-c23-m5-git-clones-"));
  t.after(() => rm(cloneHome, { recursive: true, force: true }));
  const cloneA = join(cloneHome, "clone-a");
  const cloneB = join(cloneHome, "clone-b");
  const cloneConflict = join(cloneHome, "clone-conflict");
  await execFileAsync("git", ["clone", "-q", seed, cloneA]);
  await execFileAsync("git", ["clone", "-q", seed, cloneB]);
  await execFileAsync("git", ["clone", "-q", seed, cloneConflict]);
  for (const root of [cloneA, cloneB, cloneConflict]) await configureGit(root);

  await runGit(cloneA, ["switch", "-qc", "clone-a"]);
  await appendAll(store, cloneA, fixture.clone_a_events, "c23-m5-git-a");
  await runGit(cloneA, ["add", ".pipeline/memory/experiment-events"]);
  await runGit(cloneA, ["commit", "-qm", "append clone A experiment events"]);

  await runGit(cloneB, ["switch", "-qc", "clone-b"]);
  await appendAll(store, cloneB, fixture.clone_b_events, "c23-m5-git-b");
  await runGit(cloneB, ["add", ".pipeline/memory/experiment-events"]);
  await runGit(cloneB, ["commit", "-qm", "append clone B experiment events"]);

  await runGit(cloneA, ["remote", "add", "clone-b", cloneB]);
  await runGit(cloneA, ["fetch", "-q", "clone-b", "clone-b"]);
  await runGit(cloneA, ["merge", "--no-edit", "clone-b/clone-b"]);
  await store.rebuild(cloneA, { project_id: fixture.project_id, limit: 20 }, { id: "c23-m5-git-rebuild" });
  const merged = await store.readStatus(cloneA, { project_id: fixture.project_id, limit: 20 });
  assert.equal(merged.source.event_count, allEvents(fixture).length);
  assert.equal(merged.scans.length, 2);
  assert.equal(merged.pending_confirmations.length, 1);

  await runGit(cloneConflict, ["switch", "-qc", "clone-conflict"]);
  await store.appendEvent(cloneConflict, fixture.conflicting_event, { id: "c23-m5-git-conflict" });
  await runGit(cloneConflict, ["add", ".pipeline/memory/experiment-events"]);
  await runGit(cloneConflict, ["commit", "-qm", "append conflicting logical event"]);
  await runGit(cloneA, ["remote", "add", "clone-conflict", cloneConflict]);
  await runGit(cloneA, ["fetch", "-q", "clone-conflict", "clone-conflict"]);
  await runGit(cloneA, ["merge", "--no-edit", "clone-conflict/clone-conflict"]);
  const beforeConflictRebuild = await snapshotTree(cloneA);
  await assert.rejects(
    store.rebuild(
      cloneA,
      { project_id: fixture.project_id, limit: 20 },
      { id: "c23-m5-git-conflict-rebuild" },
    ),
    /conflict|event.key|logical|supersed|drift/i,
  );
  assert.deepEqual(
    await snapshotTree(cloneA),
    beforeConflictRebuild,
    "conflicting merged records must not replace the last valid projection",
  );
});

test("C23 M5 source and released Host Contract v1 expose /hw:experiment", async () => {
  const skill = await readFile(join(REPOSITORY_ROOT, "skills", "experiment", "SKILL.md"), "utf8");
  const protocol = await readFile(join(REPOSITORY_ROOT, "docs", "reference", "experiment-records.md"), "utf8");
  assert.match(skill, /^---[\s\S]*name:\s*experiment[\s\S]*---/);
  assert.match(skill, /not a runner|不是.*runner|host.*run|Agent.*run/i);
  assert.match(skill, /ordinary[- ]file|普通.*文件|normal file/i);
  assert.match(skill, /Attempt/);
  assert.match(skill, /baseline/i);
  assert.match(skill, /Cycle/);
  assert.match(protocol, /\.pipeline\/memory\/experiment-records/);
  assert.match(protocol, /BatchReport/);
  assert.match(protocol, /不是前置条件|不得.*阻断|继续运行/);

  const route = await CORE.resolveCommandRoute("/hw:experiment", {
    repoRoot: REPOSITORY_ROOT,
    skillRoot: REPOSITORY_ROOT,
  });
  assert.equal(route.status, "available");
  assert.equal(route.canonical, "/hw:experiment");
  assert.equal(route.skill, "skills/experiment/SKILL.md");

  const discovered = await CORE.discoverableCommandMap("codex", { skillRoot: REPOSITORY_ROOT });
  assert.equal(discovered.some(({ canonical }) => canonical === "/hw:experiment"), true);

  const releaseCommands = JSON.parse(await readFile(
    join(REPOSITORY_ROOT, "contracts", "host", "v1", "command-manifest.json"),
    "utf8",
  ));
  assert.deepEqual(
    releaseCommands.commands.map(({ name }) => `/${name}`).sort(),
    discovered.map(({ canonical }) => canonical).sort(),
  );
  assert.equal(releaseCommands.commands.some(({ name }) => name === "hw:experiment"), true);
});

test("C23 M5 README-linked User Guides describe the current source surface instead of active legacy commands", async () => {
  const guides = [
    ["docs/user-guide.md", await readFile(join(REPOSITORY_ROOT, "docs", "user-guide.md"), "utf8")],
    ["docs/en/user-guide.md", await readFile(join(REPOSITORY_ROOT, "docs", "en", "user-guide.md"), "utf8")],
  ];
  for (const [path, source] of guides) {
    assert.match(source, /\/hw:experiment/, `${path} must expose the current Experiment lane`);
    assert.match(source, /Codex/, `${path} must identify the current host surface`);
    assert.doesNotMatch(source, /\/hw:cycle\s+new/, `${path} must not teach the retired Cycle subcommand`);
    assert.doesNotMatch(
      source,
      /(?:用|Use)\s+`?\/hw:(?:start|status|report|explain|pr|sync|docs|debug|audit|release)\b/i,
      `${path} must not teach internal, deferred, or removed routes as public commands`,
    );
    assert.doesNotMatch(
      source,
      /(?:Claude Code|OpenCode|Cursor|GitHub Copilot|Trae).*(?:安装|同步|Install|Generate|Run\s+`hypo-workflow)/i,
      `${path} must not advertise a deferred platform installation surface as current`,
    );
  }
});

function hasStatusStoreContract() {
  try {
    const store = CORE.createExperimentStatusStore({ clock: () => FIXED_NOW });
    return ["appendEvent", "rebuild", "readStatus"].every((name) => typeof store[name] === "function");
  } catch {
    return false;
  }
}

function createStore() {
  return CORE.createExperimentStatusStore({ clock: () => FIXED_NOW });
}

async function readFixture() {
  return JSON.parse(await readFile(join(FIXTURE_ROOT, "status-events.json"), "utf8"));
}

function allEvents(fixture) {
  return [...fixture.base_events, ...fixture.clone_a_events, ...fixture.clone_b_events];
}

async function statusWorkspace(t, prefix, projectId) {
  return temporaryCurrentWorkspace(t, prefix, {
    withLegacySentinels: true,
    manifest: {
      workspace_id: `${projectId}-workspace`,
      project_id: projectId,
    },
  });
}

async function appendAll(store, root, events, prefix) {
  for (const [index, event] of events.entries()) {
    await store.appendEvent(root, structuredClone(event), { id: `${prefix}-${index + 1}` });
  }
}

function bulkNextActionEvents(count, projectId) {
  return Array.from({ length: count }, (_, index) => ({
    schema_version: "1",
    project_id: projectId,
    experiment_id: "bulk-experiment",
    event_type: "next_action_set",
    event_key: `next/${index}`,
    occurred_at: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
    source_refs: [{
      type: "experiment",
      ref: "bulk-experiment",
      locator: `next:${index}`,
    }],
    payload: {
      action_id: `action-${index}`,
      priority: "normal",
      status: "open",
      summary: `Action ${index} ${"x".repeat(160)}`,
    },
  }));
}

async function initGit(root) {
  await runGit(root, ["init", "-q"]);
  await configureGit(root);
}

async function configureGit(root) {
  await runGit(root, ["config", "user.name", "C23 M5 Test"]);
  await runGit(root, ["config", "user.email", "c23-m5@example.invalid"]);
}

async function runGit(root, args) {
  return execFileAsync("git", args, { cwd: root });
}
