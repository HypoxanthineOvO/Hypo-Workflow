import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildChangeRequestArchive,
  commandByCanonical,
  normalizeChangeRequestSource,
  parseYaml,
  writeChangeRequestArchive,
} from "../src/index.js";

test("command map exposes /hw:pr as a manual-gated Change Request flow", () => {
  const command = commandByCanonical("/hw:pr");
  assert.equal(command.opencode, "/hw-pr");
  assert.equal(command.agent, "hw-review");
  assert.equal(command.route, "change-request");
  assert.equal(command.skill, "skills/pr/SKILL.md");
});

test("normalizes GitHub PR and GitLab MR URLs into one Change Request shape", () => {
  assert.deepEqual(normalizeChangeRequestSource("https://github.com/hypo-ai/workflow/pull/42"), {
    provider: "github",
    kind: "pull_request",
    host: "github.com",
    owner: "hypo-ai",
    repository: "workflow",
    number: 42,
    ref: "github/hypo-ai/workflow#42",
    url: "https://github.com/hypo-ai/workflow/pull/42",
  });

  assert.deepEqual(normalizeChangeRequestSource("https://gitlab.com/hypo/group/workflow/-/merge_requests/7"), {
    provider: "gitlab",
    kind: "merge_request",
    host: "gitlab.com",
    owner: "hypo/group",
    repository: "workflow",
    number: 7,
    ref: "gitlab/hypo/group/workflow#7",
    url: "https://gitlab.com/hypo/group/workflow/-/merge_requests/7",
  });

  assert.deepEqual(normalizeChangeRequestSource("PR-20260507-001"), {
    provider: "local",
    kind: "archive",
    host: "local",
    owner: "",
    repository: "",
    number: null,
    ref: "PR-20260507-001",
    url: "",
    archive_id: "PR-20260507-001",
    archive_date: "20260507",
    archive_sequence: 1,
  });

  assert.throws(() => normalizeChangeRequestSource("https://example.com/repo/pull/1"), /Unsupported Change Request URL/);
});

test("builds a local archive contract without making remote state authoritative", () => {
  const archive = buildChangeRequestArchive("https://github.com/hypo-ai/workflow/pull/42", {
    archive_id: "PR-20260507-001",
    now: "2026-05-07T15:45:00+08:00",
    request: {
      source_branch: "feature/pr-flow",
      target_branch: "main",
      author: "heyx",
      status_snapshot: "open",
    },
  });

  assert.equal(archive.id, "PR-20260507-001");
  assert.equal(archive.remote_source_of_truth, false);
  assert.deepEqual(archive.files, [
    "request.yaml",
    "summary.md",
    "review-notes.md",
    "changes.md",
    "decisions.yaml",
    "evidence/",
  ]);
  assert.equal(archive.request.provider, "github");
  assert.equal(archive.request.number, 42);
  assert.equal(archive.request.source_branch, "feature/pr-flow");
  assert.equal(archive.request.target_branch, "main");
  assert.equal(archive.decisions.remote_write_gate, "confirm");
  assert.match(archive.summary_md, /远端写操作必须人工确认/);
  assert.match(archive.summary_md, /PR\/MR remote write/);
});

test("builds a local archive from an existing archive id input", () => {
  const archive = buildChangeRequestArchive("PR-20260507-001", {
    now: "2026-05-07T15:45:00+08:00",
  });

  assert.equal(archive.id, "PR-20260507-001");
  assert.equal(archive.request.provider, "local");
  assert.equal(archive.request.kind, "archive");
  assert.equal(archive.request.ref, "PR-20260507-001");
  assert.equal(archive.request.archive_id, "PR-20260507-001");
});

test("writes stable non-overwriting archives and redacts secret-like evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-pr-"));
  const first = await writeChangeRequestArchive(root, "https://gitlab.com/hypo/group/workflow/-/merge_requests/7", {
    date: "20260507",
    now: "2026-05-07T15:45:00+08:00",
    request: {
      source_branch: "feature/archive",
      target_branch: "main",
      author: "heyx",
      status_snapshot: "open",
    },
    evidence: {
      comments: "Authorization: Bearer raw-token",
      checks: "token=abc123",
    },
  });
  const second = await writeChangeRequestArchive(root, "https://gitlab.com/hypo/group/workflow/-/merge_requests/7", {
    date: "20260507",
    now: "2026-05-07T15:46:00+08:00",
  });

  assert.equal(first.id, "PR-20260507-001");
  assert.equal(second.id, "PR-20260507-002");

  const request = parseYaml(await readFile(join(first.path, "request.yaml"), "utf8"));
  const decisions = parseYaml(await readFile(join(first.path, "decisions.yaml"), "utf8"));
  const evidence = await readFile(join(first.path, "evidence", "snapshot.md"), "utf8");

  assert.equal(request.provider, "gitlab");
  assert.equal(request.kind, "merge_request");
  assert.equal(request.status_snapshot, "open");
  assert.equal(decisions.remote_write_gate, "confirm");
  assert.doesNotMatch(evidence, /raw-token|abc123/);
  assert.match(evidence, /\[REDACTED\]/);
});
