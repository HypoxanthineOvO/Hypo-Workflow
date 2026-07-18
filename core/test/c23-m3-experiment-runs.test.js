import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as CORE from "../src/index.js";
import {
  assertLegacySentinelsUnchanged,
  captureError,
  listFiles,
  snapshotTree,
  temporaryCurrentWorkspace,
} from "./fixtures/c21-m2/helpers.js";

const FIXTURE_ROOT = fileURLToPath(new URL("./fixtures/c23-m3/", import.meta.url));
const FIXED_NOW = "2026-07-18T15:00:00+08:00";
const RUN_API_AVAILABLE = (
  typeof CORE.compileExperimentRunSpec === "function"
  && typeof CORE.expandExperimentScan === "function"
  && typeof CORE.createExperimentStore === "function"
  && typeof CORE.createExperimentStore({ clock: () => FIXED_NOW }).recordRun === "function"
);
const runTest = RUN_API_AVAILABLE ? test : test.skip;

test("C23 M3 publishes pure run compilation, deterministic scan expansion, and Attempt recording", () => {
  assert.equal(typeof CORE.compileExperimentRunSpec, "function");
  assert.equal(typeof CORE.expandExperimentScan, "function");
  const store = CORE.createExperimentStore({ clock: () => FIXED_NOW });
  assert.equal(typeof store.recordRun, "function");
});

test("C23 M3 fixtures describe uv, snapshots, machines, external data, commands, outputs, and explicit scans", async () => {
  const nerf = await readFixture("nerf.json");
  const acesim = await readFixture("acesim.json");
  for (const fixture of [nerf, acesim]) {
    const run = fixture.base_run;
    assert.equal(run.environment.manager, "uv");
    assert.deepEqual(run.environment.run_prefix.slice(0, 2), ["uv", "run"]);
    assert.match(run.environment.lockfile.sha256, /^[a-f0-9]{64}$/);
    assert.match(run.code_snapshot.commit, /^[a-f0-9]{40}$/);
    assert.match(run.code_snapshot.tree, /^[a-f0-9]{40}$/);
    assert.ok(run.machine.gpu.memory_bytes > 0);
    assert.ok(run.machine.host_memory_bytes > 0);
    assert.ok(run.machine.external_locations.every((entry) => entry.path.startsWith("/")));
    assert.ok(run.dataset.external_location_id);
    assert.ok(run.command.argv.length > 0);
    assert.ok(run.command.argument_bindings.length > 0);
    assert.ok(run.output.log_file && run.output.config_file && run.output.metrics_file);
    assert.ok(run.resource_limits.host_memory_bytes > 0);
  }
  assert.equal(nerf.full_scan.cases.length, 8);
  assert.deepEqual(acesim.frequency_scan.axes.map(({ name }) => name), ["frequency_mhz"]);
  assert.deepEqual(acesim.cache_cross_scan.axes.map(({ name }) => name), ["l1_cache_kib", "l2_cache_kib"]);
});

runTest("C23 M3 compiles one canonical reproducible run without probing machine-local external data", async () => {
  const fixture = await readFixture("nerf.json");
  const input = runInput(fixture.base_run, {
    parameters: { method: "re-grid-v2", seed: 7 },
  });
  const before = structuredClone(input);
  const first = CORE.compileExperimentRunSpec(input);
  const second = CORE.compileExperimentRunSpec(structuredClone(input));

  assert.deepEqual(input, before, "pure compilation must not mutate caller input");
  assert.deepEqual(second, first, "canonical compilation must be byte-stable for equal input");
  assert.equal(JSON.stringify(second), JSON.stringify(first));
  assert.equal(first.schema_version, "1");
  assert.equal(first.run_id, "nerf-chair-method-re-grid-v2-seed-7");
  assert.match(first.identity_hash, /^[a-f0-9]{64}$/);
  assert.deepEqual(first.code_snapshot, input.code_snapshot);
  assert.deepEqual(first.environment, input.environment);
  assert.equal(first.machine.external_locations[0].path, "/mnt/datasets/nerf_synthetic");
  assert.equal(first.dataset.external_location_id, "nerf-synthetic-a100");
  assert.deepEqual(first.resource_limits, input.resource_limits);

  const positiveTemperature = CORE.compileExperimentRunSpec(runInput(fixture.base_run, {
    parameters: { method: "re-grid-v2", seed: 7, temperature_k: 77 },
  }));
  const negativeTemperature = CORE.compileExperimentRunSpec(runInput(fixture.base_run, {
    parameters: { method: "re-grid-v2", seed: 7, temperature_k: -77 },
  }));
  assert.notEqual(negativeTemperature.run_id, positiveTemperature.run_id);
  assert.notEqual(negativeTemperature.identity_hash, positiveTemperature.identity_hash);
  assert.match(negativeTemperature.run_id, /temperature-k-neg-77/);
  assert.match(positiveTemperature.run_id, /temperature-k-77/);
});

runTest("C23 M3 materializes argv and a readable output layout from structured bindings", async () => {
  const fixture = await readFixture("nerf.json");
  const compiled = CORE.compileExperimentRunSpec(runInput(fixture.base_run, {
    parameters: { method: "re-grid-v2", seed: 7 },
  }));

  assert.deepEqual(compiled.command.argv, [
    "uv", "run", "--frozen", "python", "train.py",
    "--scene", "chair", "--method", "re-grid-v2", "--seed", "7",
  ]);
  assert.deepEqual(compiled.command.env, fixture.base_run.command.env);
  assert.deepEqual(compiled.output, {
    root: "results/nerf/re-method-study",
    directory: `results/nerf/re-method-study/${compiled.run_id}`,
    log_path: `results/nerf/re-method-study/${compiled.run_id}/run.log`,
    config_path: `results/nerf/re-method-study/${compiled.run_id}/resolved-config.json`,
    metrics_path: `results/nerf/re-method-study/${compiled.run_id}/metrics.json`,
  });
  assert.doesNotMatch(compiled.run_id, /[a-f0-9]{16,}|2026|\d{8}t\d{6}/i);
});

runTest("C23 M3 expands a NeRF chair screen and promotes the selected method across all eight scenes", async () => {
  const fixture = await readFixture("nerf.json");
  const screening = CORE.expandExperimentScan(scanInput(fixture.base_run, fixture.screening_scan));
  assert.equal(screening.run_count, 3);
  assert.deepEqual(screening.runs.map(({ run_id }) => run_id), fixture.screening_scan.expected_run_ids);
  assert.deepEqual(screening.runs.map(({ parameters }) => parameters), [
    { method: "baseline", seed: 7 },
    { method: "re-grid", seed: 7 },
    { method: "re-grid-v2", seed: 7 },
  ]);
  assert.ok(screening.runs.every((run) => run.dataset.scene === "chair"));

  const full = CORE.expandExperimentScan(scanInput(fixture.base_run, fixture.full_scan));
  assert.equal(full.run_count, 8);
  assert.equal(full.design.derived_from_scan_id, fixture.full_scan.derived_from_scan_id);
  assert.deepEqual(full.design.selection, fixture.full_scan.selection);
  assert.deepEqual(full.runs.map(({ dataset }) => dataset.scene), fixture.full_scan.expected_scenes);
  assert.ok(full.runs.every((run) => run.parameters.method === "re-grid-v2"));
  const selectedScreen = screening.runs.find((run) => run.parameters.method === "re-grid-v2");
  assert.equal(full.runs[0].identity_hash, selectedScreen.identity_hash);
  assert.equal(full.runs[0].run_id, selectedScreen.run_id);
  assert.equal(new Set(full.runs.map(({ identity_hash }) => identity_hash)).size, 8);
});

runTest("C23 M3 expands an AceSim single frequency axis over trace cases in stable order", async () => {
  const fixture = await readFixture("acesim.json");
  const expanded = CORE.expandExperimentScan(scanInput(fixture.base_run, fixture.frequency_scan));
  assert.equal(expanded.run_count, fixture.frequency_scan.expected_run_count);
  assert.deepEqual(expanded.runs.map((run) => [run.dataset.trace, run.parameters.frequency_mhz]), [
    ["vectoradd-small", 1000],
    ["vectoradd-small", 2000],
    ["vectoradd-small", 3000],
    ["bfs-large", 1000],
    ["bfs-large", 2000],
    ["bfs-large", 3000],
  ]);
  assert.ok(expanded.runs.every((run) => run.parameters.temperature_k === 77));
  assert.ok(expanded.runs.every((run) => run.parameters.l1_cache_kib === 128));
  assert.ok(expanded.runs.every((run) => run.parameters.l2_cache_kib === 6144));
  assert.equal(new Set(expanded.runs.map(({ run_id }) => run_id)).size, expanded.run_count);
});

runTest("C23 M3 expands AceSim L1/L2 cross scans with declared-axis Cartesian ordering", async () => {
  const fixture = await readFixture("acesim.json");
  const expanded = CORE.expandExperimentScan(scanInput(fixture.base_run, fixture.cache_cross_scan));
  assert.equal(expanded.run_count, fixture.cache_cross_scan.expected_run_count);
  assert.deepEqual(
    expanded.runs.slice(0, 4).map((run) => [
      run.dataset.trace,
      run.parameters.l1_cache_kib,
      run.parameters.l2_cache_kib,
    ]),
    [
      ["vectoradd-small", 64, 4096],
      ["vectoradd-small", 64, 8192],
      ["vectoradd-small", 128, 4096],
      ["vectoradd-small", 128, 8192],
    ],
  );
  assert.deepEqual(
    expanded.runs.slice(4).map((run) => run.dataset.trace),
    ["bfs-large", "bfs-large", "bfs-large", "bfs-large"],
  );
  assert.equal(new Set(expanded.runs.map(({ identity_hash }) => identity_hash)).size, expanded.run_count);
});

runTest("C23 M3 records deterministic host-memory exhaustion as structured Attempt evidence", async (t) => {
  const fixture = await readFixture("acesim.json");
  const root = await experimentWorkspace(t, fixture, "hw-c23-m3-oom-");
  const store = createStore();
  const expanded = CORE.expandExperimentScan(scanInput(fixture.base_run, fixture.frequency_scan));
  const runSpec = expanded.runs.find((run) => (
    run.dataset.trace === fixture.resource_failure.trace
    && run.parameters.frequency_mhz === 2000
  ));
  assert.ok(runSpec);
  assert.equal(runSpec.run_id, "acesim-bfs-large-frequency-mhz-2000-l1-cache-kib-128-l2-cache-kib-6144-temperature-k-77");

  const recorded = await store.recordRun(root, {
    experiment_id: fixture.experiment.id,
    run_spec: runSpec,
    outcome: fixture.resource_failure.outcome,
  }, { id: "c23-m3-acesim-oom" });
  assert.equal(recorded.status, "failed");
  const attempt = recorded.attempts[0];
  assert.equal(attempt.id, fixture.resource_failure.outcome.attempt_id);
  assert.equal(attempt.run_id, runSpec.run_id);
  assert.equal(attempt.identity_hash, runSpec.identity_hash);
  assert.deepEqual(attempt.run_spec, runSpec);
  assert.deepEqual(attempt.failure, fixture.resource_failure.outcome.failure);
  assert.equal(attempt.failure.reason_code, "resource_exhausted");
  assert.equal(attempt.failure.resource, "host_memory");
  assert.ok(attempt.failure.observed_peak_bytes > attempt.failure.limit_bytes);
  assert.ok(attempt.output_refs.includes(attempt.failure.evidence_ref));
  await assertLegacySentinelsUnchanged(root);
});

runTest("C23 M3 requires same-identity rerun parents while a different scene is a distinct run", async (t) => {
  const fixture = await readFixture("nerf.json");
  const root = await experimentWorkspace(t, fixture, "hw-c23-m3-rerun-");
  const store = createStore();
  const chair = CORE.compileExperimentRunSpec(runInput(fixture.base_run, {
    parameters: { method: "re-grid-v2", seed: 7 },
  }));
  const firstOutcome = completedOutcome(chair, chair.run_id, "2026-07-18T15:00:00+08:00");
  await store.recordRun(root, {
    experiment_id: fixture.experiment.id,
    run_spec: chair,
    outcome: firstOutcome,
  }, { id: "c23-m3-chair-first" });

  const duplicateBefore = await snapshotTree(root);
  await assert.rejects(store.recordRun(root, {
    experiment_id: fixture.experiment.id,
    run_spec: chair,
    outcome: completedOutcome(chair, `${chair.run_id}-rerun-1`, "2026-07-18T16:00:00+08:00"),
  }, { id: "c23-m3-chair-missing-parent" }), /rerun|parent|identity|duplicate/i);
  assert.deepEqual(await snapshotTree(root), duplicateBefore);

  await store.recordRun(root, {
    experiment_id: fixture.experiment.id,
    run_spec: chair,
    rerun_of_attempt_id: firstOutcome.attempt_id,
    outcome: completedOutcome(chair, `${chair.run_id}-rerun-1`, "2026-07-18T16:00:00+08:00"),
  }, { id: "c23-m3-chair-rerun" });

  const drums = CORE.compileExperimentRunSpec(runInput(fixture.base_run, {
    dataset: { ...fixture.base_run.dataset, scene: "drums" },
    parameters: { method: "re-grid-v2", seed: 7 },
  }));
  assert.notEqual(drums.run_id, chair.run_id);
  assert.notEqual(drums.identity_hash, chair.identity_hash);
  await store.recordRun(root, {
    experiment_id: fixture.experiment.id,
    run_spec: drums,
    outcome: completedOutcome(drums, drums.run_id, "2026-07-18T17:00:00+08:00"),
  }, { id: "c23-m3-drums-first" });

  const wrongParentBefore = await snapshotTree(root);
  await assert.rejects(store.recordRun(root, {
    experiment_id: fixture.experiment.id,
    run_spec: drums,
    rerun_of_attempt_id: firstOutcome.attempt_id,
    outcome: completedOutcome(drums, `${drums.run_id}-rerun-1`, "2026-07-18T18:00:00+08:00"),
  }, { id: "c23-m3-drums-wrong-parent" }), /rerun|parent|identity|same experiment/i);
  assert.deepEqual(await snapshotTree(root), wrongParentBefore);

  const loaded = await store.read(root, { kind: "experiment", id: fixture.experiment.id });
  assert.deepEqual(loaded.attempts.map((attempt) => attempt.rerun_of_attempt_id || null), [
    null,
    firstOutcome.attempt_id,
    null,
  ]);
  await assertLegacySentinelsUnchanged(root);
});

runTest("C23 M3 rejects non-uv, unbound snapshots, raw secrets, and unsafe run paths", async () => {
  const fixture = await readFixture("nerf.json");
  const valid = runInput(fixture.base_run, { parameters: { method: "re-grid-v2", seed: 7 } });
  const variants = [
    { label: "conda", value: mutate(valid, (copy) => { copy.environment.manager = "conda"; }) },
    { label: "bad lock digest", value: mutate(valid, (copy) => { copy.environment.lockfile.sha256 = "bad"; }) },
    { label: "lock traversal", value: mutate(valid, (copy) => { copy.environment.lockfile.path = "../uv.lock"; }) },
    {
      label: "uv frozen option after an extra command token",
      value: mutate(valid, (copy) => { copy.environment.run_prefix = ["uv", "run", "python", "--frozen"]; }),
    },
    {
      label: "uv prefix with an extra option",
      value: mutate(valid, (copy) => { copy.environment.run_prefix = ["uv", "run", "--frozen", "--no-sync"]; }),
    },
    { label: "bad commit", value: mutate(valid, (copy) => { copy.code_snapshot.commit = "main"; }) },
    { label: "dirty patch incomplete", value: mutate(valid, (copy) => { delete copy.code_snapshot.dirty_patch.sha256; }) },
    { label: "cwd traversal", value: mutate(valid, (copy) => { copy.command.cwd = "../outside"; }) },
    {
      label: "empty canonical argument flag",
      value: mutate(valid, (copy) => { copy.command.argument_bindings[0].flag = "--"; }),
    },
    {
      label: "three-dash argument flag",
      value: mutate(valid, (copy) => { copy.command.argument_bindings[0].flag = "---scene"; }),
    },
    {
      label: "equals-suffixed argument flag",
      value: mutate(valid, (copy) => { copy.command.argument_bindings[0].flag = "--scene="; }),
    },
    {
      label: "space-bearing argument flag",
      value: mutate(valid, (copy) => { copy.command.argument_bindings[0].flag = "--scene name"; }),
    },
    {
      label: "base argv owns a standalone option terminator",
      value: mutate(valid, (copy) => { copy.command.argv.push("--"); }),
    },
    {
      label: "base argv repeats an exact bound flag",
      value: mutate(valid, (copy) => { copy.command.argv.push("--scene", "chair"); }),
    },
    {
      label: "base argv repeats an equals-form bound flag",
      value: mutate(valid, (copy) => { copy.command.argv.push("--scene=chair"); }),
    },
    { label: "absolute output", value: mutate(valid, (copy) => { copy.output.root = "/tmp/results"; }) },
    { label: "private output", value: mutate(valid, (copy) => { copy.output.root = ".pipeline/results"; }) },
    {
      label: "log and config output filenames collide",
      value: mutate(valid, (copy) => { copy.output.config_file = copy.output.log_file; }),
    },
    {
      label: "log and metrics output filenames collide",
      value: mutate(valid, (copy) => { copy.output.metrics_file = copy.output.log_file; }),
    },
    {
      label: "config and metrics output filenames collide",
      value: mutate(valid, (copy) => { copy.output.metrics_file = copy.output.config_file; }),
    },
    {
      label: "output filename exceeds the portable component limit",
      value: mutate(valid, (copy) => { copy.output.log_file = `${"x".repeat(237)}.log`; }),
    },
    {
      label: "output root contains an oversized path component",
      value: mutate(valid, (copy) => { copy.output.root = `results/${"x".repeat(241)}`; }),
    },
    {
      label: "output root exceeds the portable full path limit",
      value: mutate(valid, (copy) => { copy.output.root = Array.from({ length: 18 }, () => "x".repeat(220)).join("/"); }),
    },
    { label: "missing machine data binding", value: mutate(valid, (copy) => { copy.dataset.external_location_id = "other-host"; }) },
    {
      label: "raw secret literal",
      value: mutate(valid, (copy) => { copy.command.env.WANDB_API_KEY = { literal: "C23_M3_RAW_SECRET" }; }),
    },
    {
      label: "missing command binding",
      value: mutate(valid, (copy) => { copy.command.argument_bindings[0].source = "dataset.missing"; }),
    },
    {
      label: "readable run id exceeds the portable directory component limit",
      value: mutate(valid, (copy) => { copy.parameters.method = "x".repeat(300); }),
    },
  ];
  for (const variant of variants) {
    const before = structuredClone(variant.value);
    const error = await captureError(() => CORE.compileExperimentRunSpec(variant.value));
    assert.ok(error, `${variant.label} must reject`);
    assert.match(String(error.message || error), /run|uv|environment|snapshot|commit|tree|digest|path|output|secret|binding|dataset|external/i);
    assert.deepEqual(variant.value, before, `${variant.label} rejection must not mutate input`);
    assert.equal(String(error.message || error).includes("C23_M3_RAW_SECRET"), false);
  }
});

runTest("C23 M3 rejects ambiguous scan axes, overlaps, duplicate values, and readable-id collisions", async () => {
  const fixture = await readFixture("acesim.json");
  const valid = scanInput(fixture.base_run, fixture.frequency_scan);
  const variants = [
    {
      label: "duplicate axis",
      value: mutate(valid, (copy) => { copy.axes.push(structuredClone(copy.axes[0])); }),
    },
    {
      label: "duplicate value",
      value: mutate(valid, (copy) => { copy.axes[0].values = [1000, 1000]; }),
    },
    {
      label: "empty axis",
      value: mutate(valid, (copy) => { copy.axes[0].values = []; }),
    },
    {
      label: "fixed-axis overlap",
      value: mutate(valid, (copy) => { copy.fixed_parameters.frequency_mhz = 2000; }),
    },
    {
      label: "case-axis overlap",
      value: mutate(valid, (copy) => { copy.cases[0].parameters = { frequency_mhz: 2000 }; }),
    },
    {
      label: "duplicate case id",
      value: mutate(valid, (copy) => { copy.cases[1].id = copy.cases[0].id; }),
    },
    {
      label: "readable id collision",
      value: mutate(valid, (copy) => { copy.axes[0].values = ["a+b", "a b"]; }),
    },
  ];
  for (const variant of variants) {
    const error = await captureError(() => CORE.expandExperimentScan(variant.value));
    assert.ok(error, `${variant.label} must reject`);
    assert.match(String(error.message || error), /scan|axis|duplicate|overlap|conflict|empty|case|collision|run.id|identity/i);
  }
});

runTest("C23 M3 recordRun revalidates compiled identity and remains zero-write on invalid evidence", async (t) => {
  const fixture = await readFixture("nerf.json");
  const root = await experimentWorkspace(t, fixture, "hw-c23-m3-record-boundary-");
  const store = createStore();
  const runSpec = CORE.compileExperimentRunSpec(runInput(fixture.base_run, {
    parameters: { method: "re-grid-v2", seed: 7 },
  }));
  const variants = [
    {
      label: "tampered identity",
      request: {
        experiment_id: fixture.experiment.id,
        run_spec: { ...structuredClone(runSpec), identity_hash: "0".repeat(64) },
        outcome: completedOutcome(runSpec, "tampered-identity", "2026-07-18T19:00:00+08:00"),
      },
    },
    {
      label: "unsafe evidence ref",
      request: {
        experiment_id: fixture.experiment.id,
        run_spec: runSpec,
        outcome: {
          ...completedOutcome(runSpec, "unsafe-evidence", "2026-07-18T19:00:00+08:00"),
          output_refs: ["../outside.log"],
        },
      },
    },
    {
      label: "raw secret evidence",
      request: {
        experiment_id: fixture.experiment.id,
        run_spec: runSpec,
        outcome: {
          ...completedOutcome(runSpec, "secret-evidence", "2026-07-18T19:00:00+08:00"),
          api_key: "C23_M3_RAW_SECRET",
        },
      },
    },
    ...[
      ["declared log output", runSpec.output.log_path],
      ["declared config output", runSpec.output.config_path],
      ["declared metrics output", runSpec.output.metrics_path],
    ].map(([label, omitted]) => ({
      label: `completed outcome missing ${label}`,
      request: {
        experiment_id: fixture.experiment.id,
        run_spec: runSpec,
        outcome: {
          ...completedOutcome(runSpec, `missing-${label.replaceAll(" ", "-")}`, "2026-07-18T19:00:00+08:00"),
          output_refs: [
            runSpec.output.log_path,
            runSpec.output.config_path,
            runSpec.output.metrics_path,
          ].filter((path) => path !== omitted),
        },
      },
    })),
  ];
  for (const variant of variants) {
    const before = await snapshotTree(root);
    const error = await captureError(() => store.recordRun(root, variant.request, {
      id: `c23-m3-${variant.label.replaceAll(" ", "-")}`,
    }));
    assert.ok(error, `${variant.label} must reject`);
    assert.match(String(error.message || error), /run|identity|hash|output|evidence|path|secret|unsafe/i);
    assert.equal(String(error.message || error).includes("C23_M3_RAW_SECRET"), false);
    assert.deepEqual(await snapshotTree(root), before, `${variant.label} must reject before writes`);
  }
  await assertLegacySentinelsUnchanged(root);
});

runTest("C23 M3 stores run facts without creating a scheduler, process, tmux, or job authority", async (t) => {
  const fixture = await readFixture("nerf.json");
  const root = await experimentWorkspace(t, fixture, "hw-c23-m3-no-runner-");
  const store = createStore();
  const runSpec = CORE.compileExperimentRunSpec(runInput(fixture.base_run, {
    parameters: { method: "baseline", seed: 7 },
  }));
  await store.recordRun(root, {
    experiment_id: fixture.experiment.id,
    run_spec: runSpec,
    outcome: completedOutcome(runSpec, runSpec.run_id, "2026-07-18T20:00:00+08:00"),
  }, { id: "c23-m3-no-runner-record" });

  const files = await listFiles(root);
  assert.equal(files.some((path) => /(?:scheduler|jobs?|tmux|pids?|processes)/i.test(path)), false);
  assert.ok(files.some((path) => path.includes("runtime/objects/experiment/")));
  await assertLegacySentinelsUnchanged(root);
});

function createStore() {
  const store = CORE.createExperimentStore({ clock: () => FIXED_NOW });
  assert.equal(typeof store.recordRun, "function");
  return store;
}

async function experimentWorkspace(t, fixture, prefix) {
  const root = await temporaryCurrentWorkspace(t, prefix, { withLegacySentinels: true });
  const store = createStore();
  await store.create(root, fixture.experiment, { id: `${fixture.fixture_id}-create` });
  return root;
}

function runInput(base, overrides = {}) {
  return {
    ...structuredClone(base),
    ...structuredClone(overrides),
  };
}

function scanInput(baseRun, scan) {
  return {
    schema_version: scan.schema_version,
    scan_id: scan.scan_id,
    purpose: scan.purpose,
    ...(scan.derived_from_scan_id ? { derived_from_scan_id: scan.derived_from_scan_id } : {}),
    ...(scan.selection ? { selection: structuredClone(scan.selection) } : {}),
    base_run: structuredClone(baseRun),
    fixed_parameters: structuredClone(scan.fixed_parameters),
    axes: structuredClone(scan.axes),
    cases: structuredClone(scan.cases),
  };
}

function completedOutcome(runSpec, attemptId, startedAt) {
  const finished = new Date(Date.parse(startedAt) + 60_000).toISOString();
  return {
    attempt_id: attemptId,
    status: "completed",
    started_at: startedAt,
    finished_at: finished,
    baseline_id: "nerf-synthetic-reference",
    metrics: { psnr_db: 31.5 },
    output_refs: [runSpec.output.log_path, runSpec.output.config_path, runSpec.output.metrics_path],
  };
}

function mutate(value, mutation) {
  const copy = structuredClone(value);
  mutation(copy);
  return copy;
}

async function readFixture(name) {
  return JSON.parse(await readFile(join(FIXTURE_ROOT, name), "utf8"));
}
