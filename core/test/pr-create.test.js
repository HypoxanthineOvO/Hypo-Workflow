import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  assessChangeRequestPathPolicy,
  buildChangeRequestCreatePlan,
  executeChangeRequestCreatePlan,
} from "../src/index.js";

test("builds a teaching-oriented create plan from a dirty worktree", () => {
  const plan = buildChangeRequestCreatePlan({
    provider: "gitlab",
    host: "gitlab.internal.example",
    owner: "hypo/group",
    repository: "workflow",
    dirty: true,
    files: ["core/src/pr/index.js", "references/pr-spec.md"],
    title: "Add PR Create guide",
    target_branch: "main",
    reviewers: ["maintainer"],
    labels: ["workflow"],
  });

  assert.equal(plan.mode, "ask");
  assert.equal(plan.provider, "gitlab");
  assert.equal(plan.host, "gitlab.internal.example");
  assert.equal(plan.dirty, true);
  assert.deepEqual(plan.files.map((file) => file.path), ["core/src/pr/index.js", "references/pr-spec.md"]);
  assert.equal(plan.source_branch, "feature/add-pr-create-guide");
  assert.equal(plan.target_branch, "main");
  assert.equal(plan.confirmation.required, true);
  assert.match(plan.confirmation.summary, /push/);
  assert.match(plan.confirmation.summary, /create_change_request/);
  assert.deepEqual(plan.remote_writes.map((item) => item.action), [
    "push",
    "create_change_request",
    "target_branch_write",
    "reviewer_write",
    "label_write",
  ]);
});

test("create plan blocks pipeline runtime files by default while allowing local PR archives", () => {
  const plan = buildChangeRequestCreatePlan({
    provider: "github",
    owner: "hypo-ai",
    repository: "workflow",
    files: [
      "core/src/pr/index.js",
      ".pipeline/state.yaml",
      ".pipeline/prompts/00-feature.md",
      ".pipeline/pr/PR-20260512-001/summary.md",
    ],
  });

  assert.equal(plan.blocked, true);
  assert.equal(plan.file_policy.ok, false);
  assert.deepEqual(plan.file_policy.blocked.map((item) => item.path), [
    ".pipeline/state.yaml",
    ".pipeline/prompts/00-feature.md",
  ]);
  assert.deepEqual(plan.file_policy.allowed, [".pipeline/pr/PR-20260512-001/summary.md"]);
});

test("path policy is reusable for review and create flows", () => {
  const result = assessChangeRequestPathPolicy([
    { path: ".pipeline/cycle.yaml" },
    { path: ".pipeline/pr/PR-20260512-001/evidence/snapshot.md" },
    { path: "references/pr-spec.md" },
  ]);

  assert.equal(result.ok, false);
  assert.deepEqual(result.blocked.map((item) => item.path), [".pipeline/cycle.yaml"]);
  assert.deepEqual(result.allowed, [".pipeline/pr/PR-20260512-001/evidence/snapshot.md"]);
});

test("plan-first mode does not schedule remote writes before implementation exists", () => {
  const plan = buildChangeRequestCreatePlan({
    mode: "plan",
    provider: "github",
    owner: "hypo-ai",
    repository: "workflow",
  });

  assert.equal(plan.mode, "plan");
  assert.deepEqual(plan.remote_writes, []);
  assert.equal(plan.confirmation.required, false);
  assert.deepEqual(plan.plan_handoff.command_flow, ["/hw:plan", "/hw:start", "/hw:pr create --from-worktree"]);
});

test("execute create plan waits for confirmation before provider writes", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-pr-create-exec-wait-"));
  const provider = writeProvider();
  const plan = buildChangeRequestCreatePlan({
    provider: "github",
    owner: "hypo-ai",
    repository: "workflow",
    source_branch: "feature/pr-create",
    target_branch: "main",
    title: "Add PR Create guide",
    reviewers: ["maintainer"],
  });

  const result = await executeChangeRequestCreatePlan(root, plan, { provider, confirmed: false });

  assert.equal(result.status, "waiting_confirmation");
  assert.equal(result.remote_write_attempted, false);
  assert.deepEqual(provider.calls, []);
});

test("execute create plan calls provider writes in confirmation order", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-pr-create-exec-confirmed-"));
  const provider = writeProvider();
  const plan = buildChangeRequestCreatePlan({
    provider: "gitlab",
    host: "gitlab.internal.example",
    owner: "hypo/group",
    repository: "workflow",
    source_branch: "feature/pr-create",
    target_branch: "main",
    title: "Add PR Create guide",
    labels: ["workflow"],
    reviewers: ["maintainer"],
  });

  const result = await executeChangeRequestCreatePlan(root, plan, {
    provider,
    confirmed: true,
    archive: {
      date: "20260509",
      now: "2026-05-09T00:20:00+08:00",
    },
  });

  assert.equal(result.status, "created");
  assert.equal(result.remote_write_attempted, true);
  assert.deepEqual(provider.calls, ["push", "createChangeRequest", "updateReviewers", "updateLabels"]);
  assert.equal(result.archive.id, "PR-20260509-001");
  assert.equal(result.archive.request.host, "gitlab.internal.example");
});

function writeProvider() {
  const calls = [];
  return {
    calls,
    async push() {
      calls.push("push");
      return { ok: true };
    },
    async createChangeRequest(plan) {
      calls.push("createChangeRequest");
      return {
        url: `https://${plan.host}/${plan.owner}/${plan.repository}/-/merge_requests/1`,
        number: 1,
      };
    },
    async updateReviewers() {
      calls.push("updateReviewers");
      return { ok: true };
    },
    async updateLabels() {
      calls.push("updateLabels");
      return { ok: true };
    },
  };
}
