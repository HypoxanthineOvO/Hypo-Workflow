import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  inspectChangeRequest,
  parseYaml,
  reviewChangeRequest,
} from "../src/index.js";

test("inspect writes remote-readonly PR evidence into the local archive", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-pr-inspect-"));
  const provider = readonlyProvider();

  const result = await inspectChangeRequest(root, "https://github.com/hypo-ai/workflow/pull/42", {
    provider,
    date: "20260507",
    now: "2026-05-07T16:00:00+08:00",
  });

  assert.equal(result.mode, "inspect");
  assert.equal(result.remote_write_attempted, false);
  assert.deepEqual(provider.calls, ["readChangeRequest", "readDiff", "readComments", "readChecks"]);
  assert.equal(result.archive.id, "PR-20260507-001");

  const request = parseYaml(await readFile(join(result.archive.path, "request.yaml"), "utf8"));
  const summary = await readFile(join(result.archive.path, "summary.md"), "utf8");
  const evidence = await readFile(join(result.archive.path, "evidence", "snapshot.md"), "utf8");

  assert.equal(request.source_branch, "feature/pr-flow");
  assert.equal(request.target_branch, "main");
  assert.equal(request.status_snapshot, "open");
  assert.match(summary, /Inspect Summary/);
  assert.match(summary, /remote-readonly/);
  assert.match(summary, /checks: 2/);
  assert.match(evidence, /ci\/unit/);
  assert.match(evidence, /review requested/);
});

test("review writes findings without calling remote write provider methods", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-pr-review-"));
  const provider = readonlyProvider({
    diff: {
      files: [
        { path: "core/src/pr/index.js", additions: 120, deletions: 2 },
        { path: "README.md", additions: 3, deletions: 1 },
      ],
    },
    checks: [
      { name: "ci/unit", status: "passed" },
      { name: "ci/lint", status: "failed" },
    ],
    comments: [
      { author: "reviewer", body: "Please cover GitLab MR conflict state." },
    ],
  });

  const result = await reviewChangeRequest(root, "https://gitlab.com/hypo/group/workflow/-/merge_requests/7", {
    provider,
    date: "20260507",
    now: "2026-05-07T16:01:00+08:00",
  });

  assert.equal(result.mode, "review");
  assert.equal(result.remote_write_attempted, false);
  assert.equal(result.merge_recommendation, "blocked");
  assert.deepEqual(provider.calls, ["readChangeRequest", "readDiff", "readComments", "readChecks"]);

  const notes = await readFile(join(result.archive.path, "review-notes.md"), "utf8");
  assert.match(notes, /ci\/lint/);
  assert.match(notes, /Please cover GitLab MR conflict state/);
  assert.match(notes, /core\/src\/pr\/index\.js/);
  assert.match(notes, /远端写操作未执行/);
});

test("review notes redact secret-like reviewer comments", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-pr-review-redact-"));
  const provider = readonlyProvider({
    comments: [
      { author: "reviewer", body: "Authorization: Bearer should-not-show" },
      { author: "reviewer", body: "token=abc123" },
    ],
  });

  const result = await reviewChangeRequest(root, "https://github.com/hypo-ai/workflow/pull/42", {
    provider,
    date: "20260507",
    now: "2026-05-07T16:02:00+08:00",
  });

  const notes = await readFile(join(result.archive.path, "review-notes.md"), "utf8");
  assert.doesNotMatch(notes, /should-not-show|abc123/);
  assert.doesNotMatch(result.findings.map((finding) => finding.summary).join("\n"), /should-not-show|abc123/);
  assert.match(notes, /\[REDACTED\]/);
});

test("inspect rejects providers that cannot supply readonly evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-pr-provider-"));
  await assert.rejects(
    inspectChangeRequest(root, "https://github.com/hypo-ai/workflow/pull/42", {
      provider: {},
    }),
    /readChangeRequest/,
  );
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
      };
    },
    async readDiff() {
      calls.push("readDiff");
      return overrides.diff || {
        files: [
          { path: "core/src/pr/index.js", additions: 50, deletions: 0 },
        ],
      };
    },
    async readComments() {
      calls.push("readComments");
      return overrides.comments || [
        { author: "reviewer", body: "review requested" },
      ];
    },
    async readChecks() {
      calls.push("readChecks");
      return overrides.checks || [
        { name: "ci/unit", status: "passed" },
        { name: "ci/lint", status: "passed" },
      ];
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
