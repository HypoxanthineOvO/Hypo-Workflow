import test from "node:test";
import assert from "node:assert/strict";
import {
  buildChangeRequestCreateExecution,
  summarizeWorktreeForCreate,
} from "../src/index.js";

test("PR Create execution does not call provider writes before confirmation", async () => {
  const provider = writeProvider();
  const execution = buildChangeRequestCreateExecution({
    provider: "gitlab",
    source_branch: "feature/pr-create",
    target_branch: "main",
    title: "Add PR Create execution",
    reviewers: ["maintainer"],
    labels: ["workflow"],
  });

  const result = await execution.run({ provider, confirmed: false });

  assert.equal(result.status, "waiting_confirmation");
  assert.deepEqual(provider.calls, []);
  assert.match(result.confirmation_summary, /push/);
  assert.match(result.confirmation_summary, /create_change_request/);
});

test("PR Create execution calls provider writes in deterministic order after confirmation", async () => {
  const provider = writeProvider();
  const execution = buildChangeRequestCreateExecution({
    provider: "github",
    source_branch: "feature/pr-create",
    target_branch: "main",
    title: "Add PR Create execution",
    body: "Implements create execution helpers.",
    reviewers: ["maintainer"],
    labels: ["workflow"],
  });

  const result = await execution.run({ provider, confirmed: true });

  assert.equal(result.status, "executed");
  assert.deepEqual(provider.calls, [
    "pushBranch",
    "createChangeRequest",
    "setReviewers",
    "setLabels",
  ]);
});

test("worktree summary teaches branch and file-scope decisions", () => {
  const summary = summarizeWorktreeForCreate({
    current_branch: "main",
    default_branch: "main",
    files: [
      { path: "core/src/pr/index.js", status: "modified" },
      { path: "core/test/pr-create-execution.test.js", status: "added" },
    ],
  });

  assert.equal(summary.dirty, true);
  assert.equal(summary.on_default_branch, true);
  assert.equal(summary.suggested_branch, "feature/pr-create");
  assert.deepEqual(summary.file_scope.map((item) => item.path), [
    "core/src/pr/index.js",
    "core/test/pr-create-execution.test.js",
  ]);
  assert.match(summary.guidance.join("\n"), /选择要进入 PR\/MR 的文件范围/);
  assert.match(summary.guidance.join("\n"), /feature branch/);
});

function writeProvider() {
  const calls = [];
  return {
    calls,
    async pushBranch() {
      calls.push("pushBranch");
    },
    async createChangeRequest() {
      calls.push("createChangeRequest");
      return { url: "https://example.test/change/1" };
    },
    async setReviewers() {
      calls.push("setReviewers");
    },
    async setLabels() {
      calls.push("setLabels");
    },
  };
}
