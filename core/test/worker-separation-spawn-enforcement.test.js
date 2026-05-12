import test from "node:test";
import assert from "node:assert/strict";
import {
  assessWorkerSeparationStatus,
  buildRuntimeWorkerMirrorFromState,
  evaluateAcceptanceReadiness,
} from "../src/index.js";

const DONE = Object.freeze({
  requested: "requested",
  started: "started",
  status: "completed",
  closed: "closed",
});

const AUTHORIZED = Object.freeze({
  status: "authorized",
  scope: ["/hw:start", "/hw:resume"],
});

function readiness(mode, workers, extra = {}) {
  return evaluateAcceptanceReadiness(
    { acceptance: { state: "pending" } },
    {
      projectConfig: {
        agent: { platform: "codex" },
        execution: {
          worker_separation: {
            mode,
            authorization: AUTHORIZED,
          },
        },
      },
      workers,
      ...extra,
    },
  );
}

test("recommended and strict modes reject one worker satisfying both test and implement roles", () => {
  for (const mode of ["recommended", "strict"]) {
    const result = readiness(mode, [
      { role: "implement", worker_id: "worker-a", lifecycle: DONE },
      { role: "test", worker_id: "worker-a", lifecycle: DONE },
      { role: "audit", worker_id: "audit-a", lifecycle: DONE },
    ]);

    assert.equal(result.blocked, true, `${mode} must block implement/test identity reuse`);
    assert.deepEqual(result.worker_separation.collisions, ["implement_test_shared_worker"]);
    assert.match(result.reasons.join("\n"), /shared workers/i);
  }
});

test("strict mode requires audit identity distinct from implement and test", () => {
  const implementAudit = readiness("strict", [
    { role: "implement", worker_id: "worker-a", lifecycle: DONE },
    { role: "test", worker_id: "worker-b", lifecycle: DONE },
    { role: "audit", worker_id: "worker-a", lifecycle: DONE },
  ]);
  assert.equal(implementAudit.blocked, true);
  assert.deepEqual(implementAudit.worker_separation.collisions, ["implement_audit_shared_worker"]);

  const testAudit = readiness("strict", [
    { role: "implement", worker_id: "worker-a", lifecycle: DONE },
    { role: "test", worker_id: "worker-b", lifecycle: DONE },
    { role: "audit", worker_id: "worker-b", lifecycle: DONE },
  ]);
  assert.equal(testAudit.blocked, true);
  assert.deepEqual(testAudit.worker_separation.collisions, ["test_audit_shared_worker"]);
});

test("runtime-only subtask observations never count as acceptance worker evidence", () => {
  const mirror = buildRuntimeWorkerMirrorFromState({
    runtime_workers: {
      workers: [
        {
          role: "implement",
          worker_id: "impl-runtime",
          lifecycle: DONE,
          evidence_scope: "runtime_observation",
          source: "codex_internal_subtask",
        },
        {
          role: "test",
          worker_id: "test-runtime",
          lifecycle: DONE,
          evidence_scope: "runtime_observation",
          source: "opencode_active_subtask",
        },
        { role: "audit", worker_id: "audit-a", lifecycle: DONE },
      ],
    },
  });

  assert.deepEqual(mirror.workers, [
    { role: "audit", worker_id: "audit-a", lifecycle: DONE },
  ]);

  const result = readiness("recommended", mirror.workers);
  assert.equal(result.blocked, true);
  assert.deepEqual(result.worker_separation.missing_roles.sort(), ["implement", "test"]);
});

test("missing closed or close_failed lifecycle closure rejects worker evidence", () => {
  const missingClosed = assessWorkerSeparationStatus(
    {
      mode: "strict",
      authorization: AUTHORIZED,
    },
    {
      workers: [
        { role: "implement", worker_id: "impl-a", lifecycle: DONE },
        {
          role: "test",
          worker_id: "test-a",
          lifecycle: { requested: "requested", started: "started", status: "completed" },
        },
        { role: "audit", worker_id: "audit-a", lifecycle: DONE },
      ],
    },
  );

  assert.equal(missingClosed.acceptance_blocked, true);
  assert.deepEqual(missingClosed.lifecycle_blocked, ["test_lifecycle_missing_close"]);

  const closeFailed = assessWorkerSeparationStatus(
    {
      mode: "strict",
      authorization: AUTHORIZED,
    },
    {
      workers: [
        { role: "implement", worker_id: "impl-a", lifecycle: DONE },
        {
          role: "test",
          worker_id: "test-a",
          lifecycle: { requested: "requested", started: "started", status: "completed", closed: "close_failed" },
        },
        { role: "audit", worker_id: "audit-a", lifecycle: DONE },
      ],
    },
  );

  assert.equal(closeFailed.acceptance_blocked, true);
  assert.deepEqual(closeFailed.lifecycle_blocked, ["test_lifecycle_close_failed"]);
});

test("changed file ownership and prompt scope mismatch reject cross-role worker evidence", () => {
  const result = assessWorkerSeparationStatus(
    {
      mode: "strict",
      authorization: AUTHORIZED,
    },
    {
      workers: [
        {
          role: "implement",
          worker_id: "impl-a",
          lifecycle: DONE,
          prompt_scope: ["core/src/**", "references/**"],
          changed_files: [
            "core/src/acceptance/index.js",
            "core/test/worker-separation-spawn-enforcement.test.js",
          ],
        },
        {
          role: "test",
          worker_id: "test-a",
          lifecycle: DONE,
          prompt_scope: ["core/test/**", "tests/scenarios/**"],
          changed_files: [
            "core/test/worker-separation-spawn-enforcement.test.js",
            "core/src/config/index.js",
          ],
        },
        {
          role: "audit",
          worker_id: "audit-a",
          lifecycle: DONE,
          prompt_scope: [],
          changed_files: ["references/subagent-spec.md"],
        },
      ],
    },
  );

  assert.equal(result.acceptance_blocked, true);
  assert.deepEqual(result.scope_blocked.sort(), [
    "audit_changed_file_not_allowed:references/subagent-spec.md",
    "implement_changed_test_owned_file:core/test/worker-separation-spawn-enforcement.test.js",
    "implement_changed_file_outside_prompt_scope:core/test/worker-separation-spawn-enforcement.test.js",
    "test_changed_file_outside_prompt_scope:core/src/config/index.js",
    "test_changed_implementation_owned_file:core/src/config/index.js",
  ].sort());
  assert.match(result.summary, /scope|ownership/i);
});

test("strict mode blocks file-changing workers without persisted prompt scope or changed-file evidence", () => {
  const result = assessWorkerSeparationStatus(
    {
      mode: "strict",
      authorization: AUTHORIZED,
    },
    {
      workers: [
        { role: "implement", worker_id: "impl-a", lifecycle: DONE },
        {
          role: "test",
          worker_id: "test-a",
          lifecycle: DONE,
          prompt_scope: ["core/test/**", "tests/scenarios/**"],
        },
        {
          role: "audit",
          worker_id: "audit-a",
          lifecycle: DONE,
          prompt_scope: [],
          changed_files: [],
        },
      ],
    },
  );

  assert.equal(result.acceptance_blocked, true);
  assert.deepEqual(result.scope_blocked.sort(), [
    "implement_missing_prompt_scope",
    "implement_missing_changed_files",
    "test_missing_changed_files",
  ].sort());
  assert.match(result.summary, /missing persisted prompt scope/i);
  assert.match(result.summary, /missing persisted changed-file evidence/i);
});

test("recommended readiness exposes missing persisted scope and changed-file evidence in reasons", () => {
  const result = readiness("recommended", [
    {
      role: "implement",
      worker_id: "impl-a",
      lifecycle: DONE,
      changed_files: ["core/src/acceptance/index.js"],
    },
    { role: "test", worker_id: "test-a", lifecycle: DONE },
    {
      role: "audit",
      worker_id: "audit-a",
      lifecycle: DONE,
      prompt_scope: [],
      changed_files: [],
    },
  ]);

  assert.equal(result.blocked, true);
  assert.deepEqual(result.worker_separation.scope_blocked.sort(), [
    "implement_missing_prompt_scope",
    "test_missing_prompt_scope",
    "test_missing_changed_files",
  ].sort());
  assert.match(result.reasons.join("\n"), /missing persisted prompt scope/i);
  assert.match(result.reasons.join("\n"), /missing persisted changed-file evidence/i);
});

test("empty changed_files with persisted prompt scope is valid no-op worker evidence", () => {
  for (const mode of ["recommended", "strict"]) {
    const result = readiness(mode, [
      {
        role: "implement",
        worker_id: "impl-a",
        lifecycle: DONE,
        prompt_scope: ["core/src/**"],
        changed_files: [],
      },
      {
        role: "test",
        worker_id: "test-a",
        lifecycle: DONE,
        prompt_scope: ["core/test/**", "tests/scenarios/**"],
        changed_files: [],
      },
      {
        role: "audit",
        worker_id: "audit-a",
        lifecycle: DONE,
        prompt_scope: [],
        changed_files: [],
      },
    ]);

    assert.equal(result.blocked, false, `${mode} should allow persisted no-op file-changing workers`);
    assert.deepEqual(result.worker_separation.scope_blocked, []);
  }
});
