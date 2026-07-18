import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import * as CORE from "../src/index.js";
import {
  assertLegacySentinelsUnchanged,
  captureError,
  fixtureManifest,
  listFiles,
  snapshotTree,
  temporaryCurrentWorkspace,
} from "./fixtures/c21-m2/helpers.js";

const execFileAsync = promisify(execFile);
const M3_FIXTURE_ROOT = fileURLToPath(new URL("./fixtures/c23-m3/", import.meta.url));
const M4_FIXTURE_ROOT = fileURLToPath(new URL("./fixtures/c23-m4/", import.meta.url));
const FIXED_NOW = "2026-07-18T16:00:00+08:00";
const FAR_EXPIRY = "2099-01-01T00:00:00Z";
const USER_ACTOR = Object.freeze({ type: "user", id: "operator" });

const SUPERVISION_API_AVAILABLE = typeof CORE.compileExperimentSupervisionPlan === "function";
const REVIEW_API_AVAILABLE = typeof CORE.compileExperimentScientificReview === "function";
const STORE_API_AVAILABLE = (
  SUPERVISION_API_AVAILABLE
  && REVIEW_API_AVAILABLE
  && typeof CORE.createExperimentStore === "function"
  && typeof CORE.createExperimentStore({ clock: () => FIXED_NOW }).recordSupervisedRun === "function"
  && typeof CORE.createExperimentStore({ clock: () => FIXED_NOW }).resolveScientificReview === "function"
);
const supervisionTest = SUPERVISION_API_AVAILABLE ? test : test.skip;
const reviewTest = REVIEW_API_AVAILABLE ? test : test.skip;
const storeTest = STORE_API_AVAILABLE ? test : test.skip;

test("C23 M4 publishes pure supervision/review compilers and Receipt-gated review resolution", () => {
  assert.equal(typeof CORE.compileExperimentSupervisionPlan, "function");
  assert.equal(typeof CORE.compileExperimentScientificReview, "function");
  const store = CORE.createExperimentStore({ clock: () => FIXED_NOW });
  assert.equal(typeof store.recordSupervisedRun, "function");
  assert.equal(typeof store.resolveScientificReview, "function");
});

test("C23 M4 fixture distinguishes foreground/tmux, checkpoint fallback, and multi-cause review", async () => {
  const fixture = await readM4Fixture();
  assert.equal(fixture.foreground.mode, "foreground");
  assert.equal(fixture.foreground.checkpoint.supported, false);
  assert.equal(fixture.tmux.mode, "tmux");
  assert.equal(fixture.tmux.checkpoint.supported, true);
  assert.equal(fixture.reasonable_review.assessment, "reasonable");
  assert.equal(fixture.inconsistent_review.assessment, "inconsistent");
  assert.ok(fixture.inconsistent_review.reference_comparisons.length > 0);
  assert.ok(new Set(fixture.inconsistent_review.candidate_causes.map(({ code }) => code)).size >= 2);
});

supervisionTest("C23 M4 compiles deterministic foreground supervision without running a process", async () => {
  const { runSpec, m4 } = await compiledNerfRun("chair", "baseline");
  const input = supervisionInput(runSpec, "nerf-chair-foreground-1", m4.foreground);
  const before = structuredClone(input);
  const first = CORE.compileExperimentSupervisionPlan(input);
  const second = CORE.compileExperimentSupervisionPlan(structuredClone(input));

  assert.deepEqual(input, before, "pure compilation must not mutate input");
  assert.deepEqual(second, first, "equal supervision input must compile identically");
  assert.equal(first.schema_version, "1");
  assert.match(first.plan_id, /^plan-[a-f0-9]{32}$/);
  assert.equal(first.attempt_id, input.attempt_id);
  assert.equal(first.run_id, runSpec.run_id);
  assert.equal(first.identity_hash, runSpec.identity_hash);
  assert.equal(first.source, "deterministic_policy");
  assert.equal(first.runner_authority, "host");
  assert.equal(first.workflow_is_runner, false);
  assert.deepEqual(first.launch, {
    mode: "foreground",
    cwd: runSpec.command.cwd,
    argv: runSpec.command.argv,
    env: runSpec.command.env,
  });
  assert.deepEqual(first.observation, {
    poll_interval_seconds: 1,
    log_path: runSpec.output.log_path,
    config_path: runSpec.output.config_path,
    metrics_path: runSpec.output.metrics_path,
  });
  assert.deepEqual(first.checkpoint, { supported: false });
  assert.deepEqual(first.interruption_policy, {
    evidence_required: true,
    recovery_strategy: "restart_from_scratch",
    requires_rerun_parent: true,
  });
  assert.equal(Object.hasOwn(first.launch, "session_name"), false);
  assert.doesNotMatch(JSON.stringify(first), /"(?:pid|process_id|job_id|started_at|finished_at)"/);
});

supervisionTest("C23 M4 gives each tmux attempt an isolated session and a checkpoint resume descriptor", async () => {
  const { nerf, runSpec, m4 } = await compiledNerfRun("chair", "re-grid-v2");
  const checkpointRef = `${runSpec.output.directory}/${m4.tmux.checkpoint.artifact_name}`;
  const resumeArgv = [...runSpec.command.argv, ...m4.tmux.checkpoint.resume_arguments, checkpointRef];
  const input = supervisionInput(runSpec, "nerf-chair-tmux-1", {
    ...m4.tmux,
    checkpoint: {
      supported: true,
      artifact_ref: checkpointRef,
      resume_argv: resumeArgv,
    },
  });
  const plan = CORE.compileExperimentSupervisionPlan(input);
  const samePlan = CORE.compileExperimentSupervisionPlan(structuredClone(input));
  const rerunPlan = CORE.compileExperimentSupervisionPlan({ ...input, attempt_id: "nerf-chair-tmux-2" });
  const otherExperimentRun = CORE.compileExperimentRunSpec({
    ...structuredClone(nerf.base_run),
    experiment_id: "nerf-re-method-study-other",
    parameters: { method: "re-grid-v2", seed: 7 },
  });
  const otherCheckpointRef = `${otherExperimentRun.output.directory}/${m4.tmux.checkpoint.artifact_name}`;
  const otherExperimentPlan = CORE.compileExperimentSupervisionPlan(supervisionInput(
    otherExperimentRun,
    input.attempt_id,
    {
      ...m4.tmux,
      checkpoint: {
        supported: true,
        artifact_ref: otherCheckpointRef,
        resume_argv: [...otherExperimentRun.command.argv, "--resume", otherCheckpointRef],
      },
    },
  ));
  const longAttemptPlan = CORE.compileExperimentSupervisionPlan({
    ...input,
    attempt_id: `nerf-chair-${"x".repeat(90)}`,
  });

  assert.equal(plan.launch.mode, "tmux");
  assert.match(plan.launch.session_name, /^hw-exp-[a-z0-9-]+-[a-f0-9]{12}$/);
  assert.equal(samePlan.launch.session_name, plan.launch.session_name);
  assert.notEqual(plan.launch.session_name, rerunPlan.launch.session_name);
  assert.notEqual(
    plan.launch.session_name,
    otherExperimentPlan.launch.session_name,
    "the same project and attempt_id must remain isolated across Experiments",
  );
  assert.ok(plan.launch.session_name.includes(runSpec.project_id));
  assert.ok(Buffer.byteLength(longAttemptPlan.launch.session_name, "utf8") <= 128);
  assert.match(longAttemptPlan.launch.session_name, /-[a-f0-9]{12}$/);
  assert.deepEqual(plan.checkpoint, {
    supported: true,
    artifact_ref: checkpointRef,
    resume_argv: resumeArgv,
  });
  assert.equal(plan.interruption_policy.recovery_strategy, "resume_from_checkpoint");
  assert.ok(Array.isArray(plan.launch.argv));
  assert.equal(Object.hasOwn(plan.launch, "shell"), false);
});

supervisionTest("C23 M4 checkpoint resume extends the original command and binds the declared artifact", async () => {
  const { runSpec, m4 } = await compiledNerfRun("chair", "re-grid-v2");
  const checkpointRef = `${runSpec.output.directory}/${m4.tmux.checkpoint.artifact_name}`;
  const wrongCheckpointRef = `${runSpec.output.directory}/checkpoints/other.pt`;
  const variants = [
    [...runSpec.command.argv, "--resume", wrongCheckpointRef],
    ["uv", "run", "--frozen", "python", "other.py", "--resume", checkpointRef],
  ];
  for (const [index, resumeArgv] of variants.entries()) {
    assert.throws(() => CORE.compileExperimentSupervisionPlan(supervisionInput(runSpec, `nerf-checkpoint-binding-${index}`, {
      ...m4.tmux,
      checkpoint: {
        supported: true,
        artifact_ref: checkpointRef,
        resume_argv: resumeArgv,
      },
    })), /checkpoint|artifact|resume|binding|original run command/i);
  }
});

storeTest("C23 M4 rejects a tampered tmux session even when plan_id is recomputed", async (t) => {
  const nerf = await readM3Fixture("nerf.json");
  const m4 = await readM4Fixture();
  const root = await experimentWorkspace(t, nerf, "hw-c23-m4-tmux-tamper-");
  const store = createStore();
  const runSpec = compileRun(nerf.base_run, "chair", "baseline");
  const attemptId = "nerf-tmux-tampered";
  const plan = CORE.compileExperimentSupervisionPlan(supervisionInput(runSpec, attemptId, {
    ...m4.foreground,
    mode: "tmux",
  }));
  const tampered = structuredClone(plan);
  tampered.launch.session_name = "hw-exp-substituted-session-000000000000";
  delete tampered.plan_id;
  tampered.plan_id = `plan-${CORE.canonicalHash(tampered).slice(0, 32)}`;
  const before = await snapshotTree(root);
  await assert.rejects(store.recordSupervisedRun(root, {
    experiment_id: nerf.experiment.id,
    run_spec: runSpec,
    outcome: interruptedOutcome(runSpec, tampered, attemptId),
  }, { id: "c23-m4-tmux-tampered" }), /tmux|session|supervision|launch|binding/i);
  assert.deepEqual(await snapshotTree(root), before, "tampered session rejection must be zero-write");
  await assertLegacySentinelsUnchanged(root);
});

supervisionTest("C23 M4 host harness can supervise a real short foreground process from the descriptor", async () => {
  const { runSpec, m4 } = await compiledNerfRun("chair", "baseline");
  const plan = CORE.compileExperimentSupervisionPlan(
    supervisionInput(runSpec, "nerf-short-process-1", m4.foreground),
  );
  const result = await execFileAsync(process.execPath, ["-e", "process.stdout.write('c23-m4-short-ok')"], {
    timeout: plan.observation.poll_interval_seconds * 5_000,
  });
  assert.equal(result.stdout, "c23-m4-short-ok");
  assert.equal(result.stderr, "");
});

supervisionTest("C23 M4 tmux smoke uses only its generated session and cleans it up", async (t) => {
  if (!(await tmuxAvailable())) {
    t.skip("tmux is not installed on this host");
    return;
  }
  const { runSpec, m4 } = await compiledNerfRun("chair", "re-grid-v2");
  const checkpointRef = `${runSpec.output.directory}/${m4.tmux.checkpoint.artifact_name}`;
  const smokeAttemptId = `nerf-tmux-smoke-${process.pid}`;
  const plan = CORE.compileExperimentSupervisionPlan(supervisionInput(runSpec, smokeAttemptId, {
    ...m4.tmux,
    checkpoint: {
      supported: true,
      artifact_ref: checkpointRef,
      resume_argv: [...runSpec.command.argv, "--resume", checkpointRef],
    },
  }));
  const before = await listTmuxSessions();
  assert.equal(before.includes(plan.launch.session_name), false, "smoke must allocate a fresh isolated session");
  t.after(async () => {
    await execFileAsync("tmux", ["kill-session", "-t", plan.launch.session_name]).catch(() => {});
  });

  await execFileAsync("tmux", [
    "new-session", "-d", "-s", plan.launch.session_name, "--",
    process.execPath, "-e", "setTimeout(() => {}, 750)",
  ]);
  const during = await listTmuxSessions();
  assert.ok(during.includes(plan.launch.session_name));
  assert.deepEqual(before.filter((name) => name !== plan.launch.session_name), before);
  await execFileAsync("tmux", ["kill-session", "-t", plan.launch.session_name]);
  const after = await listTmuxSessions();
  assert.deepEqual(after, before, "smoke cleanup must preserve all pre-existing sessions");
});

storeTest("C23 M4 records interruption evidence and chooses checkpoint resume or restart from scratch", async (t) => {
  const nerf = await readM3Fixture("nerf.json");
  const m4 = await readM4Fixture();
  const root = await experimentWorkspace(t, nerf, "hw-c23-m4-interrupt-");
  const store = createStore();
  const firstRun = compileRun(nerf.base_run, "chair", "baseline");
  const noCheckpoint = CORE.compileExperimentSupervisionPlan(
    supervisionInput(firstRun, "nerf-interrupt-no-checkpoint", m4.foreground),
  );
  const firstOutcome = interruptedOutcome(firstRun, noCheckpoint, "nerf-interrupt-no-checkpoint");
  const first = await store.recordSupervisedRun(root, {
    experiment_id: nerf.experiment.id,
    run_spec: firstRun,
    outcome: firstOutcome,
  }, { id: "c23-m4-interrupt-no-checkpoint" });
  assert.equal(first.status, "interrupted");
  assert.deepEqual(first.attempts[0].supervision.events.map(({ state }) => state), ["started", "interrupted"]);
  assert.equal(first.attempts[0].supervision.recovery.strategy, "restart_from_scratch");
  assert.equal(Object.hasOwn(first.attempts[0].supervision, "operational_completion"), false);

  const secondRun = compileRun(nerf.base_run, "drums", "re-grid-v2");
  const checkpointRef = `${secondRun.output.directory}/checkpoints/latest.pt`;
  const checkpointPlan = CORE.compileExperimentSupervisionPlan(supervisionInput(secondRun, "nerf-interrupt-checkpoint", {
    ...m4.tmux,
    checkpoint: {
      supported: true,
      artifact_ref: checkpointRef,
      resume_argv: [...secondRun.command.argv, "--resume", checkpointRef],
    },
  }));
  const missingCheckpointEvidence = interruptedOutcome(
    secondRun,
    checkpointPlan,
    "nerf-interrupt-checkpoint",
  );
  missingCheckpointEvidence.supervision.recovery.checkpoint_ref = checkpointRef;
  const beforeMissingCheckpoint = await snapshotTree(root);
  await assert.rejects(store.recordSupervisedRun(root, {
    experiment_id: nerf.experiment.id,
    run_spec: secondRun,
    outcome: missingCheckpointEvidence,
  }, { id: "c23-m4-interrupt-missing-checkpoint-output" }), /checkpoint|output|evidence|retained/i);
  assert.deepEqual(await snapshotTree(root), beforeMissingCheckpoint);

  const checkpointOutcome = interruptedOutcome(secondRun, checkpointPlan, "nerf-interrupt-checkpoint");
  checkpointOutcome.output_refs.push(checkpointRef);
  checkpointOutcome.supervision.recovery.checkpoint_ref = checkpointRef;
  const second = await store.recordSupervisedRun(root, {
    experiment_id: nerf.experiment.id,
    run_spec: secondRun,
    outcome: checkpointOutcome,
  }, { id: "c23-m4-interrupt-checkpoint" });
  assert.equal(second.attempts[1].supervision.recovery.strategy, "resume_from_checkpoint");
  assert.equal(second.attempts[1].supervision.recovery.checkpoint_ref, checkpointRef);
  await assertLegacySentinelsUnchanged(root);
});

storeTest("C23 M4 recovered rerun binds restarted evidence to its interrupted parent Attempt", async (t) => {
  const nerf = await readM3Fixture("nerf.json");
  const m4 = await readM4Fixture();
  const root = await experimentWorkspace(t, nerf, "hw-c23-m4-restarted-");
  const store = createStore();
  const runSpec = compileRun(nerf.base_run, "chair", "re-grid-v2");
  const checkpointRef = `${runSpec.output.directory}/checkpoints/latest.pt`;
  const parentAttemptId = "nerf-restart-parent";
  const childAttemptId = "nerf-restart-child";
  const checkpointConfig = {
    ...m4.tmux,
    checkpoint: {
      supported: true,
      artifact_ref: checkpointRef,
      resume_argv: [...runSpec.command.argv, "--resume", checkpointRef],
    },
  };
  const parentPlan = CORE.compileExperimentSupervisionPlan(
    supervisionInput(runSpec, parentAttemptId, checkpointConfig),
  );
  const parentOutcome = interruptedOutcome(runSpec, parentPlan, parentAttemptId);
  parentOutcome.output_refs.push(checkpointRef);
  parentOutcome.supervision.recovery.checkpoint_ref = checkpointRef;
  await store.recordSupervisedRun(root, {
    experiment_id: nerf.experiment.id,
    run_spec: runSpec,
    outcome: parentOutcome,
  }, { id: "c23-m4-restarted-parent" });

  const childPlan = CORE.compileExperimentSupervisionPlan(
    supervisionInput(runSpec, childAttemptId, checkpointConfig),
  );
  const outcome = completedOutcome(runSpec, childPlan, childAttemptId, { psnr_db: 31.5 });
  outcome.started_at = "2026-07-18T15:01:00+08:00";
  outcome.finished_at = "2026-07-18T15:02:00+08:00";
  outcome.output_refs.push(checkpointRef);
  outcome.supervision.events = [
    {
      sequence: 1,
      state: "started",
      observed_at: "2026-07-18T15:01:00+08:00",
      evidence_ref: runSpec.output.log_path,
    },
    {
      sequence: 2,
      state: "restarted",
      observed_at: "2026-07-18T15:01:01+08:00",
      evidence_ref: checkpointRef,
    },
    {
      ...outcome.supervision.events[1],
      sequence: 3,
      observed_at: "2026-07-18T15:02:00+08:00",
    },
  ];
  outcome.supervision.recovery = {
    strategy: "resume_from_checkpoint",
    interrupted_attempt_id: parentAttemptId,
    interruption_event_sequence: 2,
    checkpoint_ref: checkpointRef,
  };
  const review = CORE.compileExperimentScientificReview(
    scientificReviewInput(runSpec, outcome, m4.reasonable_review),
  );
  const valid = { ...outcome, scientific_review: review };
  const invalid = [
    mutate(valid, (copy) => { copy.supervision.recovery.interrupted_attempt_id = "other-attempt"; }),
    mutate(valid, (copy) => { copy.supervision.recovery.interruption_event_sequence = 1; }),
    mutate(valid, (copy) => {
      copy.started_at = "2026-07-18T15:00:20+08:00";
      copy.supervision.events[0].observed_at = copy.started_at;
      copy.supervision.events[1].observed_at = "2026-07-18T15:00:21+08:00";
    }),
    mutate(valid, (copy) => {
      const [started, restarted, completed] = copy.supervision.events;
      copy.supervision.events = [
        started,
        {
          sequence: 2,
          state: "heartbeat",
          observed_at: "2026-07-18T15:01:00+08:00",
          evidence_ref: runSpec.output.log_path,
        },
        { ...restarted, sequence: 3 },
        { ...completed, sequence: 4 },
      ];
    }),
    mutate(valid, (copy) => {
      const [started, restarted, completed] = copy.supervision.events;
      copy.supervision.events = [
        started,
        restarted,
        { ...restarted, sequence: 3, observed_at: "2026-07-18T15:01:02+08:00" },
        { ...completed, sequence: 4 },
      ];
    }),
    mutate(valid, (copy) => {
      const childPlan = copy.supervision.plan;
      childPlan.checkpoint.resume_argv.push("--alternate-resume-mode");
      delete childPlan.plan_id;
      childPlan.plan_id = `plan-${CORE.canonicalHash(childPlan).slice(0, 32)}`;
    }),
  ];
  for (const [index, wrongBinding] of invalid.entries()) {
    const before = await snapshotTree(root);
    await assert.rejects(store.recordSupervisedRun(root, {
      experiment_id: nerf.experiment.id,
      run_spec: runSpec,
      rerun_of_attempt_id: parentAttemptId,
      outcome: wrongBinding,
    }, { id: `c23-m4-restarted-wrong-binding-${index}` }), /attempt|parent|interruption|restart|sequence|recovery|checkpoint|plan/i);
    assert.deepEqual(await snapshotTree(root), before);
  }

  const recorded = await store.recordSupervisedRun(root, {
    experiment_id: nerf.experiment.id,
    run_spec: runSpec,
    rerun_of_attempt_id: parentAttemptId,
    outcome: valid,
  }, { id: "c23-m4-restarted-valid" });
  assert.deepEqual(recorded.attempts[1].supervision.events.map(({ state }) => state), [
    "started",
    "restarted",
    "completed",
  ]);
  assert.equal(recorded.attempts[1].rerun_of_attempt_id, parentAttemptId);
  assert.equal(recorded.attempts[1].supervision.recovery.interrupted_attempt_id, parentAttemptId);
  assert.equal(recorded.attempts[1].supervision.recovery.interruption_event_sequence, 2);
  await assertLegacySentinelsUnchanged(root);
});

storeTest("C23 M4 operational completion requires zero exit and declared log/config/metrics evidence", async (t) => {
  const nerf = await readM3Fixture("nerf.json");
  const m4 = await readM4Fixture();
  const root = await experimentWorkspace(t, nerf, "hw-c23-m4-completion-");
  const store = createStore();
  const runSpec = compileRun(nerf.base_run, "chair", "baseline");
  const plan = CORE.compileExperimentSupervisionPlan(
    supervisionInput(runSpec, "nerf-completion-1", m4.foreground),
  );
  const completed = completedOutcome(runSpec, plan, "nerf-completion-1", { psnr_db: 31.5 });
  const review = CORE.compileExperimentScientificReview(
    scientificReviewInput(runSpec, completed, m4.reasonable_review),
  );
  const valid = { ...completed, scientific_review: review };
  const variants = [
    {
      label: "missing supervision",
      outcome: omit(valid, "supervision"),
    },
    {
      label: "undefined supervision",
      outcome: { ...structuredClone(valid), supervision: undefined },
    },
    {
      label: "missing scientific review",
      outcome: omit(valid, "scientific_review"),
    },
    {
      label: "undefined scientific review",
      outcome: { ...structuredClone(valid), scientific_review: undefined },
    },
    {
      label: "nonzero exit",
      outcome: mutate(valid, (copy) => { copy.supervision.operational_completion.exit_code = 1; }),
    },
    {
      label: "terminal state mismatch",
      outcome: mutate(valid, (copy) => { copy.supervision.events[1].state = "interrupted"; }),
    },
    {
      label: "start event before Attempt",
      outcome: mutate(valid, (copy) => {
        copy.supervision.events[0].observed_at = "2026-07-18T14:59:59+08:00";
      }),
    },
    {
      label: "terminal event after Attempt",
      outcome: mutate(valid, (copy) => {
        copy.supervision.events[1].observed_at = "2026-07-18T15:01:01+08:00";
      }),
    },
    {
      label: "missing log",
      outcome: mutate(valid, (copy) => {
        copy.output_refs = copy.output_refs.filter((path) => path !== runSpec.output.log_path);
      }),
    },
    {
      label: "verified output was not retained",
      outcome: mutate(valid, (copy) => {
        copy.supervision.operational_completion.verified_output_refs.push(
          `${runSpec.output.directory}/not-retained.json`,
        );
      }),
    },
    {
      label: "unparented Attempt claims restart",
      outcome: mutate(valid, (copy) => {
        copy.supervision.events = [
          copy.supervision.events[0],
          {
            sequence: 2,
            state: "restarted",
            observed_at: "2026-07-18T15:00:30+08:00",
            evidence_ref: runSpec.output.log_path,
          },
          { ...copy.supervision.events[1], sequence: 3 },
        ];
        copy.supervision.recovery = {
          strategy: "restart_from_scratch",
          interrupted_attempt_id: "missing-parent",
          interruption_event_sequence: 2,
        };
      }),
    },
    {
      label: "bare down status",
      outcome: mutate(valid, (copy) => { copy.status = "down"; }),
    },
  ];
  for (const variant of variants) {
    const before = await snapshotTree(root);
    await assert.rejects(store.recordSupervisedRun(root, {
      experiment_id: nerf.experiment.id,
      run_spec: runSpec,
      outcome: variant.outcome,
    }, { id: `c23-m4-completion-${variant.label.replaceAll(" ", "-")}` }), /supervision|review|terminal|exit|completed|output|log|status|down|time|start|finish|boundary|parent|restart|recovery|retained|verified/i);
    assert.deepEqual(await snapshotTree(root), before, `${variant.label} must be zero-write`);
  }

  const recorded = await store.recordSupervisedRun(root, {
    experiment_id: nerf.experiment.id,
    run_spec: runSpec,
    outcome: valid,
  }, { id: "c23-m4-completion-valid" });
  assert.equal(recorded.status, "completed");
  assert.equal(recorded.attempts[0].supervision.operational_completion.exit_code, 0);
  assert.deepEqual(recorded.attempts[0].output_refs, [
    runSpec.output.log_path,
    runSpec.output.config_path,
    runSpec.output.metrics_path,
  ]);
  await assertLegacySentinelsUnchanged(root);
});

reviewTest("C23 M4 compiles observation-bound scientific review and never silently confirms suspicion", async () => {
  const { runSpec, m4 } = await compiledNerfRun("chair", "re-grid-v2");
  const plan = SUPERVISION_API_AVAILABLE
    ? CORE.compileExperimentSupervisionPlan(supervisionInput(runSpec, "nerf-review-1", m4.foreground))
    : fallbackPlan(runSpec, "nerf-review-1");
  const reasonableOutcome = completedOutcome(runSpec, plan, "nerf-review-1", { psnr_db: 31.5 });
  const reasonableInput = scientificReviewInput(runSpec, reasonableOutcome, m4.reasonable_review);
  const reasonable = CORE.compileExperimentScientificReview(reasonableInput);
  assert.equal(reasonable.assessment, "reasonable");
  assert.equal(reasonable.confirmation.status, "not_required");
  assert.match(reasonable.review_id, /^review-[a-f0-9]{32}$/);
  assert.match(reasonable.review_hash, /^[a-f0-9]{64}$/);
  assert.equal(reasonable.attempt_id, reasonableOutcome.attempt_id);
  assert.equal(reasonable.run_id, runSpec.run_id);
  assert.equal(reasonable.identity_hash, runSpec.identity_hash);

  const inconsistentOutcome = completedOutcome(runSpec, plan, "nerf-review-2", { psnr_db: 26.1 });
  const inconsistentInput = scientificReviewInput(runSpec, inconsistentOutcome, m4.inconsistent_review);
  const before = structuredClone(inconsistentInput);
  const inconsistent = CORE.compileExperimentScientificReview(inconsistentInput);
  assert.deepEqual(inconsistentInput, before);
  assert.equal(inconsistent.assessment, "inconsistent");
  assert.equal(inconsistent.confirmation.status, "pending");
  assert.ok(inconsistent.references.length > 0);
  assert.ok(new Set(inconsistent.candidate_causes.map(({ category }) => category)).size >= 2);
  assert.ok(inconsistent.candidate_causes.some(({ category }) => category !== "implementation"));
  assert.equal(Object.hasOwn(inconsistent, "confirmed"), false);
  assert.equal(Object.hasOwn(inconsistent, "conclusion"), false);
});

reviewTest("C23 M4 rejects one-cause paper claims, unsafe evidence, raw secrets, and observation drift", async () => {
  const { runSpec, m4 } = await compiledNerfRun("chair", "re-grid-v2");
  const plan = SUPERVISION_API_AVAILABLE
    ? CORE.compileExperimentSupervisionPlan(supervisionInput(runSpec, "nerf-review-boundary", m4.foreground))
    : fallbackPlan(runSpec, "nerf-review-boundary");
  const outcome = completedOutcome(runSpec, plan, "nerf-review-boundary", { psnr_db: 26.1 });
  const valid = scientificReviewInput(runSpec, outcome, m4.inconsistent_review);
  const variants = [
    {
      label: "implementation-only conclusion",
      value: mutate(valid, (copy) => {
        copy.candidate_causes = [copy.candidate_causes.find(({ category }) => category === "implementation")];
      }),
    },
    {
      label: "no paper comparison",
      value: mutate(valid, (copy) => { copy.references = []; }),
    },
    {
      label: "unsafe metric evidence",
      value: mutate(valid, (copy) => { copy.metric_checks[0].evidence_refs[0] = "../outside.json"; }),
    },
    {
      label: "private authority evidence",
      value: mutate(valid, (copy) => { copy.metric_checks[0].evidence_refs[0] = ".pipeline/state.yaml"; }),
    },
    {
      label: "raw secret",
      value: mutate(valid, (copy) => { copy.summary = "API_KEY=C23_M4_RAW_SECRET"; }),
    },
    {
      label: "metric observed drift",
      value: mutate(valid, (copy) => { copy.metric_checks[0].observed = 31.5; }),
    },
    {
      label: "review precedes completion",
      value: mutate(valid, (copy) => { copy.reviewed_at = "2026-07-18T15:00:59+08:00"; }),
    },
  ];
  for (const variant of variants) {
    const error = await captureError(() => CORE.compileExperimentScientificReview(variant.value));
    assert.ok(error, `${variant.label} must reject`);
    assert.match(String(error.message || error), /review|comparison|cause|source|path|secret|inconsistent|evidence/i);
    assert.equal(String(error.message || error).includes("C23_M4_RAW_SECRET"), false);
  }

  const review = CORE.compileExperimentScientificReview(valid);
  const drifted = scientificReviewInput(runSpec, {
    ...outcome,
    metrics: { psnr_db: 26.2 },
  }, m4.inconsistent_review);
  assert.notEqual(review.review_hash, CORE.compileExperimentScientificReview(drifted).review_hash);
});

storeTest("C23 M4 binds scientific review to the recorded Attempt observation", async (t) => {
  const nerf = await readM3Fixture("nerf.json");
  const m4 = await readM4Fixture();
  const root = await experimentWorkspace(t, nerf, "hw-c23-m4-review-binding-");
  const store = createStore();
  const runSpec = compileRun(nerf.base_run, "chair", "re-grid-v2");
  const plan = CORE.compileExperimentSupervisionPlan(
    supervisionInput(runSpec, "nerf-review-binding", m4.foreground),
  );
  const outcome = completedOutcome(runSpec, plan, "nerf-review-binding", { psnr_db: 26.1 });
  const review = CORE.compileExperimentScientificReview(scientificReviewInput(runSpec, outcome, m4.inconsistent_review));
  const valid = { ...outcome, scientific_review: review };
  const extraEvidence = `${runSpec.output.directory}/review-analysis.json`;
  const driftInput = scientificReviewInput(runSpec, {
    ...outcome,
    output_refs: [...outcome.output_refs, extraEvidence],
  }, m4.inconsistent_review);
  driftInput.metric_checks[0].evidence_refs = [extraEvidence];
  const outputDrifted = {
    ...outcome,
    scientific_review: CORE.compileExperimentScientificReview(driftInput),
  };
  const otherMetricsOutcome = { ...outcome, metrics: { psnr_db: 31.5 } };
  const metricDrifted = {
    ...outcome,
    scientific_review: CORE.compileExperimentScientificReview(
      scientificReviewInput(runSpec, otherMetricsOutcome, m4.reasonable_review),
    ),
  };
  for (const [index, drifted] of [outputDrifted, metricDrifted].entries()) {
    const before = await snapshotTree(root);
    await assert.rejects(store.recordSupervisedRun(root, {
      experiment_id: nerf.experiment.id,
      run_spec: runSpec,
      outcome: drifted,
    }, { id: `c23-m4-review-binding-drift-${index}` }), /review|observation|metric|hash|drift|evidence/i);
    assert.deepEqual(await snapshotTree(root), before);
  }

  const recorded = await store.recordSupervisedRun(root, {
    experiment_id: nerf.experiment.id,
    run_spec: runSpec,
    outcome: valid,
  }, { id: "c23-m4-review-binding-valid" });
  assert.equal(recorded.attempts[0].scientific_review.review_id, review.review_id);
  assert.equal(recorded.attempts[0].scientific_review.confirmation.status, "pending");
  await assertLegacySentinelsUnchanged(root);
});

storeTest("C23 M4 persisted reviews cannot bypass compiler policy by recomputing their hash", async (t) => {
  const nerf = await readM3Fixture("nerf.json");
  const m4 = await readM4Fixture();
  const root = await experimentWorkspace(t, nerf, "hw-c23-m4-review-rehash-");
  const store = createStore();
  const runSpec = compileRun(nerf.base_run, "chair", "re-grid-v2");
  const plan = CORE.compileExperimentSupervisionPlan(
    supervisionInput(runSpec, "nerf-review-rehash", m4.foreground),
  );
  const outcome = completedOutcome(runSpec, plan, "nerf-review-rehash", { psnr_db: 26.1 });
  const review = CORE.compileExperimentScientificReview(
    scientificReviewInput(runSpec, outcome, m4.inconsistent_review),
  );
  const forged = [
    rehashScientificReview(review, (copy) => {
      copy.candidate_causes = copy.candidate_causes.filter(({ category }) => category === "implementation");
    }),
    rehashScientificReview(review, (copy) => {
      copy.reason_codes = ["implementation_error_confirmed"];
    }),
  ];
  for (const [index, scientificReview] of forged.entries()) {
    const before = await snapshotTree(root);
    await assert.rejects(store.recordSupervisedRun(root, {
      experiment_id: nerf.experiment.id,
      run_spec: runSpec,
      outcome: { ...outcome, scientific_review: scientificReview },
    }, { id: `c23-m4-review-rehash-${index}` }), /review|cause|implementation|policy|inconsistent|confirm/i);
    assert.deepEqual(await snapshotTree(root), before, "forged review rejection must be zero-write");
  }
  await assertLegacySentinelsUnchanged(root);
});

storeTest("C23 M4 resolves pending review with a target-bound one-shot Receipt", async (t) => {
  const setup = await recordedPendingReview(t, "hw-c23-m4-review-resolve-");
  const resolution = {
    attempt_id: setup.outcome.attempt_id,
    review_id: setup.review.review_id,
    review_hash: setup.review.review_hash,
    decision: "confirm",
    rationale: "Operator checked the paper protocol and accepts this result as inconsistent.",
  };
  const authorization = await issueReviewReceipt(setup.root, setup.recorded, resolution, "c23-m4-review-receipt");
  const resolved = await setup.store.resolveScientificReview(setup.root, {
    ...authorization,
    resolution,
  }, { id: "c23-m4-review-resolve" });
  const storedReview = resolved.attempts[0].scientific_review;
  assert.equal(storedReview.confirmation.status, "resolved");
  assert.equal(storedReview.status, "confirmed");
  assert.equal(storedReview.resolution.decision, resolution.decision);
  assert.equal(storedReview.resolution.rationale, resolution.rationale);
  assert.equal((await CORE.readReceipt(setup.root, authorization.receipt_id)).state, "consumed");

  const beforeReplay = await snapshotTree(setup.root);
  await assert.rejects(setup.store.resolveScientificReview(setup.root, {
    ...authorization,
    resolution,
  }, { id: "c23-m4-review-replay" }), /consumed|replay|receipt|pending|state/i);
  assert.deepEqual(await snapshotTree(setup.root), beforeReplay);
  await assertLegacySentinelsUnchanged(setup.root);
});

storeTest("C23 M4 recovers an authority-activated review resolution for the Receipt actor", async (t) => {
  const interrupted = await authorityActivatedReviewResolution(
    t,
    "hw-c23-m4-review-recovery-normal-",
    "c23-m4-review-recovery-normal",
  );
  const recovery = await interrupted.setup.store.recoverTransition(
    interrupted.setup.root,
    { ...interrupted.authorization, resolution: interrupted.resolution },
    { id: interrupted.operationId },
  );
  assert.equal(recovery.action, "finalized");
  assert.equal((await CORE.readReceipt(interrupted.setup.root, interrupted.authorization.receipt_id)).state, "consumed");
  const recovered = await interrupted.setup.store.read(
    interrupted.setup.root,
    interrupted.setup.recorded.object_ref,
  );
  assert.deepEqual(recovered.attempts[0].scientific_review.resolution.actor, USER_ACTOR);
  const beforeRetry = await snapshotTree(interrupted.setup.root);
  await assert.doesNotReject(() => interrupted.setup.store.recoverTransition(
    interrupted.setup.root,
    { ...interrupted.authorization, resolution: interrupted.resolution },
    { id: interrupted.operationId },
  ));
  assert.deepEqual(await snapshotTree(interrupted.setup.root), beforeRetry);
  await assertLegacySentinelsUnchanged(interrupted.setup.root);
});

storeTest("C23 M4 recovery rejects a forged persisted resolution actor without consuming the Receipt", async (t) => {
  const interrupted = await authorityActivatedReviewResolution(
    t,
    "hw-c23-m4-review-recovery-forged-",
    "c23-m4-review-recovery-forged",
  );
  const persisted = await CORE.readRuntimeObject(
    interrupted.setup.root,
    interrupted.setup.recorded.object_ref,
  );
  const runtime = structuredClone(persisted.runtime);
  runtime.attempts[0].scientific_review.resolution.actor = { type: "user", id: "forged-operator" };
  await CORE.commitWorkspaceTransaction(interrupted.setup.root, {
    id: "c23-m4-review-recovery-forged-actor",
    manifest: fixtureManifest(),
    writes: [
      {
        path: `.pipeline/runtime/objects/experiment/${interrupted.setup.recorded.object_ref.id}/runtime.yaml`,
        content: renderYaml(runtime),
      },
      {
        path: `.pipeline/runtime/objects/experiment/${interrupted.setup.recorded.object_ref.id}/continuation.yaml`,
        content: renderYaml(persisted.continuation),
      },
    ],
  });
  const beforeRecovery = await snapshotTree(interrupted.setup.root);
  await assert.rejects(interrupted.setup.store.recoverTransition(
    interrupted.setup.root,
    { ...interrupted.authorization, resolution: interrupted.resolution },
    { id: interrupted.operationId },
  ), /actor|receipt|recovery|conflict|authority/i);
  assert.equal((await CORE.readReceipt(interrupted.setup.root, interrupted.authorization.receipt_id)).state, "reserved");
  assert.deepEqual(await snapshotTree(interrupted.setup.root), beforeRecovery);
  await assertLegacySentinelsUnchanged(interrupted.setup.root);
});

storeTest("C23 M4 fresh reread preserves an Attempt added while the review Receipt is reserved", async (t) => {
  const setup = await recordedPendingReview(t, "hw-c23-m4-review-concurrent-reserve-");
  const concurrent = await prepareConcurrentExperimentAuthority(setup, "reserve-race");
  const resolution = reviewResolution(setup, "investigate", "Concurrent authority must not be overwritten.");
  const authorization = await issueReviewReceipt(
    setup.root,
    await setup.store.read(setup.root, setup.recorded.object_ref),
    resolution,
    "c23-m4-review-concurrent-reserve-receipt",
  );
  let injected = false;
  await assert.rejects(setup.store.resolveScientificReview(setup.root, {
    ...authorization,
    resolution,
  }, {
    id: "c23-m4-review-concurrent-reserve",
    faultInjector: async (event) => {
      if (injected || event.phase !== "after_manifest_activation") return;
      injected = true;
      await writeExperimentDocuments(setup.root, concurrent);
    },
  }), /receipt|context|drift|authorization/i);
  assert.equal(injected, true);
  assert.equal((await CORE.readReceipt(setup.root, authorization.receipt_id)).state, "invalidated");
  const loaded = await setup.store.read(setup.root, setup.recorded.object_ref);
  assert.deepEqual(loaded.attempts.map(({ id }) => id), [
    setup.outcome.attempt_id,
    concurrent.concurrentAttemptId,
  ]);
  assert.equal(loaded.attempts[0].scientific_review.status, "pending_confirmation");
  assert.deepEqual(transactionPaths(await snapshotTree(setup.root)), []);
  await assertLegacySentinelsUnchanged(setup.root);
});

storeTest("C23 M4 CAS rejects authority drift after fresh read without consuming the Receipt", async (t) => {
  const setup = await recordedPendingReview(t, "hw-c23-m4-review-concurrent-prepare-");
  const concurrent = await prepareConcurrentExperimentAuthority(setup, "prepare-race");
  const resolution = reviewResolution(setup, "confirm", "Prepared authority must not overwrite concurrent bytes.");
  const authorization = await issueReviewReceipt(
    setup.root,
    await setup.store.read(setup.root, setup.recorded.object_ref),
    resolution,
    "c23-m4-review-concurrent-prepare-receipt",
  );
  let prepareCount = 0;
  await assert.rejects(setup.store.resolveScientificReview(setup.root, {
    ...authorization,
    resolution,
  }, {
    id: "c23-m4-review-concurrent-prepare",
    faultInjector: async (event) => {
      if (event.phase !== "after_prepare") return;
      prepareCount += 1;
      if (prepareCount === 2) await writeExperimentDocuments(setup.root, concurrent);
    },
  }), /transaction|target|hash|drift|conflict|precondition/i);
  assert.equal(prepareCount, 2);
  assert.notEqual((await CORE.readReceipt(setup.root, authorization.receipt_id)).state, "consumed");
  const loaded = await setup.store.read(setup.root, setup.recorded.object_ref);
  assert.deepEqual(loaded.attempts.map(({ id }) => id), [
    setup.outcome.attempt_id,
    concurrent.concurrentAttemptId,
  ]);
  assert.equal(loaded.attempts[0].scientific_review.status, "pending_confirmation");
  assert.ok(
    transactionPaths(await snapshotTree(setup.root)).some((path) => (
      path.includes("c23-m4-review-concurrent-prepare-authority")
    )),
    "CAS conflict must retain transaction evidence instead of overwriting concurrent authority",
  );
  await assertLegacySentinelsUnchanged(setup.root);
});

test("C23 M4 workspace expected_hash enforces matching and missing-file preconditions", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m4-expected-hash-", {
    withLegacySentinels: true,
  });
  const path = ".pipeline/runtime/c23-m4-cas.txt";
  await CORE.commitWorkspaceTransaction(root, {
    id: "c23-m4-expected-hash-create",
    manifest: fixtureManifest(),
    writes: [{ path, content: "version-one\n", expected_hash: null }],
  });
  await CORE.commitWorkspaceTransaction(root, {
    id: "c23-m4-expected-hash-update",
    manifest: fixtureManifest(),
    writes: [{ path, content: "version-two\n", expected_hash: sha256Text("version-one\n") }],
  });
  assert.equal(await readFile(join(root, path), "utf8"), "version-two\n");

  const invalid = [
    {
      id: "c23-m4-expected-hash-wrong",
      path,
      content: "must-not-install\n",
      expected_hash: "0".repeat(64),
    },
    {
      id: "c23-m4-expected-hash-existing",
      path,
      content: "must-not-recreate\n",
      expected_hash: null,
    },
    {
      id: "c23-m4-expected-hash-missing",
      path: ".pipeline/runtime/c23-m4-cas-missing.txt",
      content: "must-not-create\n",
      expected_hash: sha256Text("missing-old-value\n"),
    },
  ];
  for (const entry of invalid) {
    const before = await snapshotTree(root);
    await assert.rejects(CORE.commitWorkspaceTransaction(root, {
      id: entry.id,
      manifest: fixtureManifest(),
      writes: [{
        path: entry.path,
        content: entry.content,
        expected_hash: entry.expected_hash,
      }],
    }), /expected|precondition|hash|drift|conflict/i);
    assert.deepEqual(await snapshotTree(root), before, `${entry.id} must be transaction-wide zero-write`);
  }
  await assertLegacySentinelsUnchanged(root);
});

storeTest("C23 M4 rejects resolution before review time without reserving its Receipt", async (t) => {
  const setup = await recordedPendingReview(t, "hw-c23-m4-review-early-resolution-", {
    reviewed_at: "2026-07-18T17:00:00+08:00",
  });
  const resolution = {
    attempt_id: setup.outcome.attempt_id,
    review_id: setup.review.review_id,
    review_hash: setup.review.review_hash,
    decision: "investigate",
    rationale: "This resolution clock is earlier than the scientific review.",
  };
  const authorization = await issueReviewReceipt(
    setup.root,
    setup.recorded,
    resolution,
    "c23-m4-review-early-resolution-receipt",
  );
  const before = await snapshotTree(setup.root);
  const beforeExperiment = await setup.store.read(setup.root, setup.recorded.object_ref);
  await assert.rejects(setup.store.resolveScientificReview(setup.root, {
    ...authorization,
    resolution,
  }, { id: "c23-m4-review-early-resolution" }), /resolution|review|precede|time/i);
  assert.deepEqual(await setup.store.read(setup.root, setup.recorded.object_ref), beforeExperiment);
  assert.equal((await CORE.readReceipt(setup.root, authorization.receipt_id)).state, "issued");
  assert.deepEqual(await snapshotTree(setup.root), before, "known timestamp rejection must be zero-write");
  await assertLegacySentinelsUnchanged(setup.root);
});

storeTest("C23 M4 rejects review target substitution and Experiment-state drift", async (t) => {
  const substituted = await recordedPendingReview(t, "hw-c23-m4-review-substitute-");
  const approved = {
    attempt_id: substituted.outcome.attempt_id,
    review_id: substituted.review.review_id,
    review_hash: substituted.review.review_hash,
    decision: "confirm",
    rationale: "Approved rationale",
  };
  const authorization = await issueReviewReceipt(
    substituted.root,
    substituted.recorded,
    approved,
    "c23-m4-review-substitute-receipt",
  );
  const beforeSubstitution = await substituted.store.read(substituted.root, substituted.recorded.object_ref);
  await assert.rejects(substituted.store.resolveScientificReview(substituted.root, {
    ...authorization,
    resolution: { ...approved, decision: "dismiss", rationale: "Substituted rationale" },
  }, { id: "c23-m4-review-substitute" }), /target|drift|context|receipt|authorization/i);
  assert.deepEqual(
    await substituted.store.read(substituted.root, substituted.recorded.object_ref),
    beforeSubstitution,
  );

  const drifted = await recordedPendingReview(t, "hw-c23-m4-review-drift-");
  const driftResolution = {
    attempt_id: drifted.outcome.attempt_id,
    review_id: drifted.review.review_id,
    review_hash: drifted.review.review_hash,
    decision: "investigate",
    rationale: "Issued before another Attempt changes Experiment authority.",
  };
  const driftAuthorization = await issueReviewReceipt(
    drifted.root,
    drifted.recorded,
    driftResolution,
    "c23-m4-review-drift-receipt",
  );
  const nextRun = compileRun(drifted.nerf.base_run, "drums", "baseline");
  const nextPlan = CORE.compileExperimentSupervisionPlan(
    supervisionInput(nextRun, "nerf-review-drift-next", drifted.m4.foreground),
  );
  const nextOutcome = completedOutcome(nextRun, nextPlan, "nerf-review-drift-next", { psnr_db: 30.9 });
  const nextReview = CORE.compileExperimentScientificReview(
    scientificReviewInput(nextRun, nextOutcome, drifted.m4.reasonable_review),
  );
  await drifted.store.recordSupervisedRun(drifted.root, {
    experiment_id: drifted.nerf.experiment.id,
    run_spec: nextRun,
    outcome: { ...nextOutcome, scientific_review: nextReview },
  }, { id: "c23-m4-review-drift-next" });
  const afterNewAttempt = await drifted.store.read(drifted.root, drifted.recorded.object_ref);
  await assert.rejects(drifted.store.resolveScientificReview(drifted.root, {
    ...driftAuthorization,
    resolution: driftResolution,
  }, { id: "c23-m4-review-drift-resolve" }), /drift|context|receipt|authorization|state/i);
  assert.deepEqual(await drifted.store.read(drifted.root, drifted.recorded.object_ref), afterNewAttempt);
  await assertLegacySentinelsUnchanged(drifted.root);
});

test("C23 M4 Core remains a protocol layer with no child-process or scheduler authority", async () => {
  const sources = await Promise.all([
    readFile(fileURLToPath(new URL("../src/experiment/index.js", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../src/experiment/supervision.js", import.meta.url)), "utf8").catch(() => ""),
  ]);
  const source = sources.join("\n");
  assert.doesNotMatch(source, /node:child_process|\bspawn(?:Sync)?\s*\(|\bexecFile(?:Sync)?\s*\(/);
  assert.doesNotMatch(source, /(?:write|persist|create).*(?:scheduler|job queue|process table|pid file)/i);
});

storeTest("C23 M4 persistence creates Experiment facts, not tmux/process/job authority", async (t) => {
  const setup = await recordedPendingReview(t, "hw-c23-m4-no-runner-");
  const files = await listFiles(setup.root);
  assert.ok(files.some((path) => path.includes("runtime/objects/experiment/")));
  assert.equal(
    files.some((path) => /runtime\/objects\/(?:scheduler|jobs?|tmux|pids?|processes)(?:\/|$)/i.test(path)),
    false,
  );
  await assertLegacySentinelsUnchanged(setup.root);
});

function createStore() {
  return CORE.createExperimentStore({ clock: () => FIXED_NOW });
}

async function experimentWorkspace(t, fixture, prefix) {
  const root = await temporaryCurrentWorkspace(t, prefix, { withLegacySentinels: true });
  await createStore().create(root, fixture.experiment, { id: `${fixture.fixture_id}-${prefix}-create` });
  return root;
}

async function compiledNerfRun(scene, method) {
  const nerf = await readM3Fixture("nerf.json");
  const m4 = await readM4Fixture();
  return { nerf, m4, runSpec: compileRun(nerf.base_run, scene, method) };
}

function compileRun(baseRun, scene, method) {
  return CORE.compileExperimentRunSpec({
    ...structuredClone(baseRun),
    dataset: { ...structuredClone(baseRun.dataset), scene },
    parameters: { method, seed: 7 },
  });
}

function supervisionInput(runSpec, attemptId, fixture) {
  return {
    schema_version: fixture.schema_version,
    attempt_id: attemptId,
    run_spec: structuredClone(runSpec),
    mode: fixture.mode,
    poll_interval_seconds: fixture.poll_interval_seconds,
    checkpoint: structuredClone(fixture.checkpoint),
  };
}

function completedOutcome(runSpec, plan, attemptId, metrics) {
  return {
    attempt_id: attemptId,
    status: "completed",
    started_at: "2026-07-18T15:00:00+08:00",
    finished_at: "2026-07-18T15:01:00+08:00",
    baseline_id: "nerf-synthetic-reference",
    metrics: structuredClone(metrics),
    output_refs: [runSpec.output.log_path, runSpec.output.config_path, runSpec.output.metrics_path],
    supervision: {
      plan: structuredClone(plan),
      events: [
        {
          sequence: 1,
          state: "started",
          observed_at: "2026-07-18T15:00:00+08:00",
          evidence_ref: runSpec.output.log_path
        },
        {
          sequence: 2,
          state: "completed",
          observed_at: "2026-07-18T15:01:00+08:00",
          evidence_ref: runSpec.output.metrics_path
        }
      ],
      recovery: {
        strategy: "none"
      },
      operational_completion: {
        exit_code: 0,
        verified_output_refs: [
          runSpec.output.log_path,
          runSpec.output.config_path,
          runSpec.output.metrics_path
        ]
      }
    }
  };
}

function interruptedOutcome(runSpec, plan, attemptId) {
  return {
    attempt_id: attemptId,
    status: "interrupted",
    started_at: "2026-07-18T15:00:00+08:00",
    finished_at: "2026-07-18T15:00:30+08:00",
    baseline_id: "nerf-synthetic-reference",
    metrics: { completed_steps: 12 },
    output_refs: [runSpec.output.log_path],
    supervision: {
      plan: structuredClone(plan),
      events: [
        {
          sequence: 1,
          state: "started",
          observed_at: "2026-07-18T15:00:00+08:00",
          evidence_ref: runSpec.output.log_path
        },
        {
          sequence: 2,
          state: "interrupted",
          observed_at: "2026-07-18T15:00:30+08:00",
          evidence_ref: runSpec.output.log_path,
          reason_code: "operator_requested",
          signal: "SIGTERM"
        }
      ],
      recovery: {
        strategy: plan.interruption_policy.recovery_strategy,
        interrupted_attempt_id: attemptId,
        interruption_event_sequence: 2
      }
    }
  };
}

function scientificReviewInput(runSpec, outcome, fixture) {
  const comparison = fixture.reference_comparisons[0];
  const categories = {
    configuration_mismatch: "parameter",
    dataset_protocol_mismatch: "dataset",
    implementation_defect: "implementation",
  };
  return {
    schema_version: "1",
    attempt_id: outcome.attempt_id,
    run_spec: structuredClone(runSpec),
    output_refs: structuredClone(outcome.output_refs),
    metrics: structuredClone(outcome.metrics),
    finished_at: outcome.finished_at,
    assessment: fixture.assessment,
    summary: fixture.summary,
    reviewed_at: FIXED_NOW,
    metric_checks: [
      {
        metric: comparison.metric,
        observed: structuredClone(outcome.metrics[comparison.metric]),
        comparison: comparison.interpretation,
        expected: structuredClone(comparison.expected),
        evidence_refs: [runSpec.output.metrics_path],
      },
    ],
    references: fixture.reference_comparisons.map((entry) => ({
      type: "paper",
      ref: entry.source_ref,
      locator: `metric:${entry.metric}`,
    })),
    reason_codes: [fixture.assessment === "reasonable" ? "within_reference_tolerance" : "paper_result_mismatch"],
    candidate_causes: fixture.candidate_causes.map((cause) => ({
      category: categories[cause.code] || "unknown",
      summary: cause.summary,
      evidence_refs: fixture.reference_comparisons.map(({ source_ref }) => source_ref),
      hypothesis: true,
    })),
  };
}

async function recordedPendingReview(t, prefix, options = {}) {
  const nerf = await readM3Fixture("nerf.json");
  const m4 = await readM4Fixture();
  const root = await experimentWorkspace(t, nerf, prefix);
  const store = createStore();
  const runSpec = compileRun(nerf.base_run, "chair", "re-grid-v2");
  const plan = CORE.compileExperimentSupervisionPlan(
    supervisionInput(runSpec, "nerf-pending-review", m4.foreground),
  );
  const outcome = completedOutcome(runSpec, plan, "nerf-pending-review", { psnr_db: 26.1 });
  const reviewInput = scientificReviewInput(runSpec, outcome, m4.inconsistent_review);
  if (options.reviewed_at !== undefined) reviewInput.reviewed_at = options.reviewed_at;
  const review = CORE.compileExperimentScientificReview(reviewInput);
  const recorded = await store.recordSupervisedRun(root, {
    experiment_id: nerf.experiment.id,
    run_spec: runSpec,
    outcome: { ...outcome, scientific_review: review },
  }, { id: `${prefix.replaceAll(/[^a-z0-9]+/gi, "-")}-record` });
  return { nerf, m4, root, store, runSpec, plan, outcome, review, recorded };
}

function reviewResolution(setup, decision, rationale) {
  return {
    attempt_id: setup.outcome.attempt_id,
    review_id: setup.review.review_id,
    review_hash: setup.review.review_hash,
    decision,
    rationale,
  };
}

async function prepareConcurrentExperimentAuthority(setup, suffix) {
  const objectRoot = `.pipeline/runtime/objects/experiment/${setup.recorded.object_ref.id}`;
  const runtimePath = `${objectRoot}/runtime.yaml`;
  const continuationPath = `${objectRoot}/continuation.yaml`;
  const initialRuntime = await readFile(join(setup.root, runtimePath), "utf8");
  const initialContinuation = await readFile(join(setup.root, continuationPath), "utf8");

  const concurrentAttemptId = `nerf-concurrent-${suffix}`;
  const runSpec = compileRun(setup.nerf.base_run, "drums", "baseline");
  const plan = CORE.compileExperimentSupervisionPlan(
    supervisionInput(runSpec, concurrentAttemptId, setup.m4.foreground),
  );
  const outcome = completedOutcome(runSpec, plan, concurrentAttemptId, { psnr_db: 30.9 });
  const review = CORE.compileExperimentScientificReview(
    scientificReviewInput(runSpec, outcome, setup.m4.reasonable_review),
  );
  await setup.store.recordSupervisedRun(setup.root, {
    experiment_id: setup.nerf.experiment.id,
    run_spec: runSpec,
    outcome: { ...outcome, scientific_review: review },
  }, { id: `c23-m4-concurrent-${suffix}` });

  const concurrentRuntime = await readFile(join(setup.root, runtimePath), "utf8");
  const concurrentContinuation = await readFile(join(setup.root, continuationPath), "utf8");
  await CORE.commitWorkspaceTransaction(setup.root, {
    id: `c23-m4-concurrent-${suffix}-restore`,
    manifest: fixtureManifest(),
    writes: [
      { path: runtimePath, content: initialRuntime },
      { path: continuationPath, content: initialContinuation },
    ],
  });

  return {
    runtimePath,
    continuationPath,
    concurrentRuntime,
    concurrentContinuation,
    concurrentAttemptId,
  };
}

async function writeExperimentDocuments(root, concurrent) {
  await Promise.all([
    writeFile(join(root, concurrent.runtimePath), concurrent.concurrentRuntime, "utf8"),
    writeFile(join(root, concurrent.continuationPath), concurrent.concurrentContinuation, "utf8"),
  ]);
}

function transactionPaths(entries) {
  return entries
    .filter(({ path }) => path.startsWith(".pipeline/runtime/transactions/"))
    .map(({ path }) => path)
    .sort();
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function issueReviewReceipt(root, experiment, resolution, operationId) {
  const context = CORE.buildExperimentReceiptContext(experiment, {
    actor: USER_ACTOR,
    intent: "experiment.review.resolve",
    target: resolution,
  });
  const issued = await CORE.createReceiptStore({ clock: () => FIXED_NOW }).issueReceipt(root, {
    ...context,
    issued_at: FIXED_NOW,
    expires_at: FAR_EXPIRY,
  }, { id: operationId });
  return {
    receipt_id: issued.id,
    ...context,
    tool_use_id: `tool-${operationId}`,
  };
}

async function authorityActivatedReviewResolution(t, prefix, operationId) {
  const setup = await recordedPendingReview(t, prefix);
  const resolution = {
    attempt_id: setup.outcome.attempt_id,
    review_id: setup.review.review_id,
    review_hash: setup.review.review_hash,
    decision: "confirm",
    rationale: "Authority activation recovery must preserve the authorizing actor.",
  };
  const authorization = await issueReviewReceipt(
    setup.root,
    setup.recorded,
    resolution,
    `${operationId}-receipt`,
  );
  await assert.rejects(setup.store.resolveScientificReview(setup.root, {
    ...authorization,
    resolution,
  }, {
    id: operationId,
    faultInjector: throwOnNthPhase("after_manifest_activation", 2, "review authority"),
  }), /injected review authority after_manifest_activation failure/);
  assert.equal((await CORE.readReceipt(setup.root, authorization.receipt_id)).state, "reserved");
  assert.equal(
    (await CORE.recoverWorkspaceTransaction(setup.root, { id: `${operationId}-authority` })).action,
    "finalized",
  );
  return { setup, resolution, authorization, operationId };
}

function throwOnNthPhase(phase, occurrence, label) {
  let seen = 0;
  return async (event) => {
    if (event.phase !== phase) return;
    seen += 1;
    if (seen === occurrence) throw new Error(`injected ${label} ${phase} failure`);
  };
}

function renderYaml(value) {
  return `${CORE.stringifyYaml(value).trimEnd()}\n`;
}

function fallbackPlan(runSpec, attemptId) {
  return {
    schema_version: "1",
    plan_id: "plan-00000000000000000000000000000000",
    source: "deterministic_policy",
    attempt_id: attemptId,
    run_id: runSpec.run_id,
    identity_hash: runSpec.identity_hash,
    runner_authority: "host",
    workflow_is_runner: false,
    launch: {
      mode: "foreground",
      cwd: runSpec.command.cwd,
      argv: runSpec.command.argv,
      env: runSpec.command.env,
    },
    observation: {
      poll_interval_seconds: 1,
      log_path: runSpec.output.log_path,
      config_path: runSpec.output.config_path,
      metrics_path: runSpec.output.metrics_path,
    },
    checkpoint: { supported: false },
    interruption_policy: {
      evidence_required: true,
      recovery_strategy: "restart_from_scratch",
      requires_rerun_parent: true,
    },
  };
}

async function tmuxAvailable() {
  try {
    await execFileAsync("tmux", ["-V"]);
    return true;
  } catch {
    return false;
  }
}

async function listTmuxSessions() {
  try {
    const { stdout } = await execFileAsync("tmux", ["list-sessions", "-F", "#{session_name}"]);
    return stdout.split("\n").map((value) => value.trim()).filter(Boolean).sort();
  } catch (error) {
    if (/no server running|failed to connect|no sessions/i.test(`${error.stderr || ""} ${error.message || ""}`)) return [];
    throw error;
  }
}

function mutate(value, mutator) {
  const copy = structuredClone(value);
  mutator(copy);
  return copy;
}

function omit(value, key) {
  const copy = structuredClone(value);
  delete copy[key];
  return copy;
}

function rehashScientificReview(review, mutator) {
  const durable = structuredClone(review);
  delete durable.review_id;
  delete durable.review_hash;
  mutator(durable);
  const reviewHash = CORE.canonicalHash(durable);
  return {
    ...durable,
    review_id: `review-${reviewHash.slice(0, 32)}`,
    review_hash: reviewHash,
  };
}

async function readM3Fixture(name) {
  return JSON.parse(await readFile(join(M3_FIXTURE_ROOT, name), "utf8"));
}

async function readM4Fixture() {
  return JSON.parse(await readFile(join(M4_FIXTURE_ROOT, "supervision-review.json"), "utf8"));
}
