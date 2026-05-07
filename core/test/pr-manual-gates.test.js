import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  planChangeRequestFix,
  prepareChangeRequestClose,
  prepareChangeRequestMerge,
  parseYaml,
} from "../src/index.js";

test("fix records local changes and keeps push as a manual remote step", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-pr-fix-"));
  const provider = readonlyProvider();

  const result = await planChangeRequestFix(root, "https://github.com/hypo-ai/workflow/pull/42", {
    provider,
    date: "20260507",
    now: "2026-05-07T16:05:00+08:00",
    local_changes: ["update core/src/pr/index.js", "add focused PR gate tests"],
    tests: ["node --test core/test/pr-manual-gates.test.js"],
  });

  assert.equal(result.mode, "fix");
  assert.equal(result.remote_write_attempted, false);
  assert.deepEqual(provider.calls, ["readChangeRequest", "readDiff", "readComments", "readChecks"]);
  assert.match(result.confirmation_prompt, /push/);

  const changes = await readFile(join(result.archive.path, "changes.md"), "utf8");
  const decisions = parseYaml(await readFile(join(result.archive.path, "decisions.yaml"), "utf8"));
  assert.match(changes, /update core\/src\/pr\/index\.js/);
  assert.match(changes, /node --test core\/test\/pr-manual-gates\.test\.js/);
  assert.equal(decisions.remote_write_gate, "confirm");
  assert.equal(decisions.proposed_operation, "fix");
  assert.equal(decisions.push_requires_confirmation, true);
});

test("merge proposal blocks on failed checks, missing approval, or conflicts", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-pr-merge-blocked-"));
  const provider = readonlyProvider({
    request: {
      source_branch: "feature/pr-flow",
      target_branch: "main",
      author: "heyx",
      status_snapshot: "open",
      mergeable: false,
      conflicts: true,
      approvals: 0,
      approvals_required: 1,
    },
    checks: [
      { name: "ci/unit", status: "passed" },
      { name: "ci/lint", status: "failed" },
    ],
  });

  const result = await prepareChangeRequestMerge(root, "https://github.com/hypo-ai/workflow/pull/42", {
    provider,
    date: "20260507",
    now: "2026-05-07T16:06:00+08:00",
  });

  assert.equal(result.mode, "merge");
  assert.equal(result.status, "blocked");
  assert.equal(result.remote_write_attempted, false);
  assert.match(result.blockers.join("\n"), /ci\/lint/);
  assert.match(result.blockers.join("\n"), /approval/);
  assert.match(result.blockers.join("\n"), /conflict/);

  const decisions = parseYaml(await readFile(join(result.archive.path, "decisions.yaml"), "utf8"));
  assert.equal(decisions.proposed_operation, "merge");
  assert.equal(decisions.confirmation_required, true);
  assert.equal(decisions.remote_write_gate, "confirm");
});

test("merge proposal still waits for confirmation when ready", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-pr-merge-ready-"));
  const provider = readonlyProvider({
    request: {
      source_branch: "feature/pr-flow",
      target_branch: "main",
      author: "heyx",
      status_snapshot: "open",
      mergeable: true,
      conflicts: false,
      approvals: 1,
      approvals_required: 1,
    },
  });

  const result = await prepareChangeRequestMerge(root, "https://gitlab.com/hypo/group/workflow/-/merge_requests/7", {
    provider,
    date: "20260507",
    now: "2026-05-07T16:07:00+08:00",
  });

  assert.equal(result.status, "waiting_confirmation");
  assert.equal(result.remote_write_attempted, false);
  assert.match(result.confirmation_prompt, /merge/);
  assert.deepEqual(provider.calls, ["readChangeRequest", "readDiff", "readComments", "readChecks"]);
});

test("close proposal requires a reason and writes a confirmation decision", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-pr-close-"));
  const provider = readonlyProvider();

  await assert.rejects(
    prepareChangeRequestClose(root, "https://github.com/hypo-ai/workflow/pull/42", { provider }),
    /close reason/,
  );

  const result = await prepareChangeRequestClose(root, "https://github.com/hypo-ai/workflow/pull/42", {
    provider,
    date: "20260507",
    now: "2026-05-07T16:08:00+08:00",
    reason: "Superseded by a smaller PR.",
  });

  assert.equal(result.mode, "close");
  assert.equal(result.remote_write_attempted, false);
  assert.equal(result.status, "waiting_confirmation");
  assert.match(result.confirmation_prompt, /close/);
  const decisions = parseYaml(await readFile(join(result.archive.path, "decisions.yaml"), "utf8"));
  assert.equal(decisions.proposed_operation, "close");
  assert.equal(decisions.close_reason, "Superseded by a smaller PR.");
  assert.equal(decisions.confirmation_required, true);
});

function readonlyProvider(overrides = {}) {
  const calls = [];
  return {
    calls,
    async readChangeRequest() {
      calls.push("readChangeRequest");
      return overrides.request || {
        source_branch: "feature/pr-flow",
        target_branch: "main",
        author: "heyx",
        status_snapshot: "open",
        mergeable: true,
        conflicts: false,
        approvals: 1,
        approvals_required: 1,
      };
    },
    async readDiff() {
      calls.push("readDiff");
      return overrides.diff || { files: [{ path: "core/src/pr/index.js", additions: 20, deletions: 1 }] };
    },
    async readComments() {
      calls.push("readComments");
      return overrides.comments || [];
    },
    async readChecks() {
      calls.push("readChecks");
      return overrides.checks || [{ name: "ci/unit", status: "passed" }];
    },
    async push() {
      throw new Error("push must not be called");
    },
    async merge() {
      throw new Error("merge must not be called");
    },
    async close() {
      throw new Error("close must not be called");
    },
  };
}
