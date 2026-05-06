import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReviewCoverageChecklist,
  reviewArtifactDir,
  validateReviewArtifact,
  resolveReviewRetry,
} from "../src/reviews/index.js";

test("reviewArtifactDir builds stable pipeline review paths", () => {
  assert.equal(
    reviewArtifactDir({ feature: "F002", milestone: "M04", stage: "plan" }),
    ".pipeline/reviews/F002/M04/plan",
  );
  assert.equal(
    reviewArtifactDir({ pipelineDir: "custom-pipeline", feature: "F002", milestone: "M05", stage: "review_code" }),
    "custom-pipeline/reviews/F002/M05/review_code",
  );
  assert.throws(
    () => reviewArtifactDir({ feature: "F002/escape", milestone: "M04", stage: "plan" }),
    /invalid review path segment/i,
  );
});

test("validateReviewArtifact accepts supported verdict schema and redacts secret-like fields", () => {
  const result = validateReviewArtifact({
    verdict: "needs_changes",
    reviewed_refs: ["core/test/review-artifacts.test.js", ".pipeline/prompts/03-review-artifact-schema-and-directory-structure.md"],
    summary: "Tests need one more boundary case with token=sk-reviewsecret",
    checked_rules: ["c8.review.schema"],
    unchecked_rules: [{ id: "c8.domain.rtl", reason: "not in scope" }],
    issues: [{ severity: "warn", ref: "core/src/reviews/index.js", message: "missing helper" }],
    retry_round: 1,
    fallback_reason: "subagent unavailable",
  });

  assert.equal(result.ok, true);
  assert.equal(result.artifact.verdict, "needs_changes");
  assert.deepEqual(result.artifact.reviewed_refs, [
    "core/test/review-artifacts.test.js",
    ".pipeline/prompts/03-review-artifact-schema-and-directory-structure.md",
  ]);
  assert.match(result.artifact.summary, /\[REDACTED\]/);
  assert.equal(result.artifact.retry_round, 1);
  assert.equal(result.errors.length, 0);
});

test("validateReviewArtifact rejects invalid verdicts, missing refs, and secrets in reject mode", () => {
  const invalid = validateReviewArtifact({ verdict: "ok", reviewed_refs: [] });

  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.some((error) => error.field === "verdict"));
  assert.ok(invalid.errors.some((error) => error.field === "reviewed_refs"));

  const leaked = validateReviewArtifact(
    {
      verdict: "pass",
      reviewed_refs: ["references/review-artifacts-spec.md"],
      notes: "Authorization: Bearer secret-token-value",
    },
    { secretMode: "reject" },
  );

  assert.equal(leaked.ok, false);
  assert.ok(leaked.errors.some((error) => error.code === "secret_detected"));
});

test("resolveReviewRetry applies bounded retry and strict blocking policy", () => {
  assert.deepEqual(resolveReviewRetry({ verdict: "pass", retry_round: 1 }), {
    action: "continue",
    blocked: false,
    next_round: null,
    should_retry: false,
    max_rounds: 3,
    reason: "review passed",
  });

  assert.deepEqual(resolveReviewRetry({ verdict: "needs_changes", retry_round: 1 }), {
    action: "repair_review",
    blocked: false,
    next_round: 2,
    should_retry: true,
    max_rounds: 3,
    reason: "needs_changes retry 2/3",
  });

  assert.deepEqual(resolveReviewRetry({ verdict: "needs_changes", retry_round: 3 }), {
    action: "block",
    blocked: true,
    next_round: null,
    should_retry: false,
    max_rounds: 3,
    reason: "needs_changes reached max review rounds",
  });

  assert.deepEqual(resolveReviewRetry({ verdict: "warn", retry_round: 1 }, { strict: true }), {
    action: "block",
    blocked: true,
    next_round: null,
    should_retry: false,
    max_rounds: 3,
    reason: "strict review gate blocked verdict warn",
  });
});

test("buildReviewCoverageChecklist records checked and skipped platform surfaces with evidence", () => {
  const checklist = buildReviewCoverageChecklist({
    checked: {
      skills: ["skills/start/SKILL.md"],
      hooks: [".opencode/hook.json"],
      agents: [".opencode/agent/hw-review.md"],
      commands: [".opencode/command/hw-start.md"],
      generated_adapters: ["AGENTS.md", ".claude/settings.json"],
    },
    skipped: {
      hooks: "host has no hook surface",
    },
  });

  assert.deepEqual(checklist.map((item) => item.surface), [
    "skills",
    "hooks",
    "agents",
    "commands",
    "generated_adapters",
  ]);
  assert.equal(checklist.find((item) => item.surface === "skills").status, "checked");
  assert.deepEqual(checklist.find((item) => item.surface === "skills").evidence, ["skills/start/SKILL.md"]);
  assert.equal(checklist.find((item) => item.surface === "hooks").status, "skipped");
  assert.equal(checklist.find((item) => item.surface === "hooks").reason, "host has no hook surface");
  assert.equal(checklist.find((item) => item.surface === "generated_adapters").status, "checked");
});
