import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildChangeRequestCreateProposal,
  parseYaml,
  writeChangeRequestCreateProposal,
} from "../src/index.js";

test("builds PR Create proposals for ask, worktree, and plan modes", () => {
  const base = {
    provider: "gitlab",
    host: "gitlab.internal.example",
    owner: "hypo/group",
    repository: "workflow",
    url: "https://gitlab.internal.example/hypo/group/workflow",
  };

  const ask = buildChangeRequestCreateProposal(base, { mode: "ask" });
  const worktree = buildChangeRequestCreateProposal(base, { mode: "from_worktree" });
  const planned = buildChangeRequestCreateProposal(base, { mode: "plan" });

  assert.equal(ask.mode, "ask");
  assert.equal(ask.guidance.next_question, "你已经有本地改动要提 PR/MR 吗？");
  assert.equal(worktree.mode, "from_worktree");
  assert.match(worktree.guidance.summary, /dirty worktree/);
  assert.equal(planned.mode, "plan");
  assert.deepEqual(planned.plan_handoff.command_flow, ["/hw:plan", "/hw:start", "/hw:pr create --from-worktree"]);
});

test("PR Create proposal archives confirmation summary and remote-write actions", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-pr-create-contract-"));

  const proposal = await writeChangeRequestCreateProposal(root, {
    provider: "github",
    owner: "hypo-ai",
    repository: "workflow",
    url: "https://github.com/hypo-ai/workflow",
  }, {
    mode: "from_worktree",
    date: "20260509",
    now: "2026-05-09T00:10:00+08:00",
    source_branch: "feature/pr-create",
    target_branch: "main",
    title: "Add PR Create guide",
    body: "Implements guided PR creation.",
    reviewers: ["maintainer"],
    labels: ["workflow"],
  });

  assert.equal(proposal.id, "PR-20260509-001");
  assert.equal(proposal.request.provider, "github");
  assert.equal(proposal.request.kind, "pull_request_create");
  assert.equal(proposal.remote_source_of_truth, false);
  assert.equal(proposal.decisions.confirmation_required, true);
  assert.equal(proposal.decisions.confirmation_scope, "single_create_flow");
  assert.deepEqual(proposal.decisions.proposed_remote_writes, [
    "push",
    "create_change_request",
    "reviewer_write",
    "label_write",
    "target_branch_write",
  ]);

  const request = parseYaml(await readFile(join(proposal.path, "request.yaml"), "utf8"));
  const decisions = parseYaml(await readFile(join(proposal.path, "decisions.yaml"), "utf8"));
  const createProposal = parseYaml(await readFile(join(proposal.path, "create-proposal.yaml"), "utf8"));
  const summary = await readFile(join(proposal.path, "summary.md"), "utf8");

  assert.equal(request.source_branch, "feature/pr-create");
  assert.equal(request.target_branch, "main");
  assert.equal(decisions.proposed_operation, "create");
  assert.equal(createProposal.title, "Add PR Create guide");
  assert.deepEqual(createProposal.reviewers, ["maintainer"]);
  assert.match(summary, /一次性确认/);
  assert.match(summary, /push/);
  assert.match(summary, /create_change_request/);
});
