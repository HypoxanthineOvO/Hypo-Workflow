import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  appendLifecycleLogEntry,
  buildOpenCodeStatusModel,
  buildRecentEvents,
  redactSecrets,
  validateLifecycleLog,
  validateSecretSafeEvidence,
  writeConfig,
} from "../src/index.js";

test("current lifecycle log validates real event families and statuses", async () => {
  const source = await readFile(".pipeline/log.yaml", "utf8");
  const result = validateLifecycleLog(source);

  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.ok(result.families.includes("milestone"));
  assert.ok(result.families.includes("feature"));
});

test("lifecycle log accepts visible gate feedback statuses", () => {
  const log = {
    entries: [
      event(
        "visible-gate",
        "step_progress",
        "ready_for_visible_gate",
        "2026-06-08T20:52:37+08:00",
        "revised plan is ready for visible gate",
      ),
      event(
        "prompt-source-needed",
        "gate_feedback",
        "needs_prompt_source_before_vsp_opencode_write",
        "2026-06-08T20:49:53+08:00",
        "user requested prompt source before target write",
      ),
      event(
        "plan-summary-needed",
        "gate_feedback",
        "needs_plan_visible_summary",
        "2026-06-08T20:15:21+08:00",
        "user requested visible plan summary before confirmation",
      ),
    ],
  };

  const result = validateLifecycleLog(log);
  const recent = buildRecentEvents(log);

  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.ok(result.families.includes("step"));
  assert.ok(result.families.includes("gate"));
  assert.deepEqual(
    recent.map((entry) => [entry.family, entry.status]),
    [
      ["gate", "needs_prompt_source_before_vsp_opencode_write"],
      ["gate", "needs_plan_visible_summary"],
    ],
  );
});

test("Recent feed sorts by timestamp and filters internal platform noise", () => {
  const newestFirst = {
    entries: [
      event("internal", "platform_heartbeat", "active", "2026-05-03T12:03:00+08:00", "heartbeat"),
      event("m2", "milestone_complete", "completed", "2026-05-03T12:02:00+08:00", "completed M02"),
      event("m1", "milestone_start", "active", "2026-05-03T12:01:00+08:00", "started M01"),
    ],
  };
  const oldestFirst = { entries: [...newestFirst.entries].reverse() };

  const a = buildRecentEvents(newestFirst);
  const b = buildRecentEvents(oldestFirst);

  assert.deepEqual(a, b);
  assert.deepEqual(a.map((entry) => entry.id), ["m2", "m1"]);
});

test("lifecycle log accepts release and quality command records", () => {
  const result = validateLifecycleLog({
    entries: [
      event("release-prep", "release_prepared", "prepared", "2026-05-30T14:11:44+08:00", "prepared release"),
      event("release-pub", "release", "partially_published", "2026-05-30T14:31:40+08:00", "published release"),
      event("quality", "quality", "completed", "2026-05-31T22:28:31+08:00", "quality report"),
    ],
  });

  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.ok(result.families.includes("release"));
  assert.ok(result.families.includes("quality"));
});

test("status Recent uses sorted filtered feed with redacted summaries", async () => {
  const root = await fixtureRoot();
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { name: "Recent Fixture", status: "running", prompts_completed: 1, prompts_total: 2 },
    current: { phase: "executing", prompt_name: "M02 - Recent", step: "write_tests" },
  });
  await writeConfig(join(root, ".pipeline", "log.yaml"), {
    entries: [
      event("old", "milestone_start", "active", "2026-05-03T12:01:00+08:00", "started with api_key=sk-oldsecret"),
      event("noise", "step_heartbeat", "active", "2026-05-03T12:03:00+08:00", "heartbeat Authorization: Bearer raw-token"),
      event("new", "milestone_complete", "completed", "2026-05-03T12:02:00+08:00", "done password=hunter2"),
    ],
  });

  const model = await buildOpenCodeStatusModel(root);

  assert.deepEqual(model.recent_events.map((entry) => entry.id), ["new", "old"]);
  assert.doesNotMatch(JSON.stringify(model.recent_events), /hunter2|sk-oldsecret|raw-token/);
  assert.match(JSON.stringify(model.recent_events), /\[REDACTED\]/);
});

test("shared redaction covers keys, inline credentials, cookies, and private keys", () => {
  const redacted = redactSecrets({
    api_key: "sk-live-1234567890",
    nested: {
      Authorization: "Bearer secret-token",
      Cookie: "sessionid=raw-cookie",
      note: "password=hunter2 and token=abc123",
      pem: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----",
    },
  });

  assert.equal(redacted.api_key, "[REDACTED]");
  assert.equal(redacted.nested.Authorization, "[REDACTED]");
  assert.equal(redacted.nested.Cookie, "[REDACTED]");
  assert.doesNotMatch(redacted.nested.note, /hunter2|abc123/);
  assert.doesNotMatch(redacted.nested.pem, /BEGIN PRIVATE KEY|abc/);
});

test("log writer redacts evidence and successful reports block on secret leaks", async () => {
  const root = await fixtureRoot();
  const entry = await appendLifecycleLogEntry(root, {
    id: "sync-secret",
    type: "sync_repair",
    status: "completed",
    timestamp: "2026-05-03T12:00:00+08:00",
    summary: "Synced with Authorization: Bearer raw-token",
  });

  assert.equal(entry.entry.summary, "Synced with [REDACTED]");
  assert.doesNotMatch(await readFile(join(root, ".pipeline", "log.yaml"), "utf8"), /raw-token/);

  const failed = validateSecretSafeEvidence({
    surface: "report",
    status: "successful",
    content: "Result pass\napi_key: sk-raw-secret",
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.block, true);
});

function event(id, type, status, timestamp, summary) {
  return {
    id,
    type,
    status,
    timestamp,
    summary,
    trigger: "auto",
  };
}

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "hw-log-evidence-"));
  await mkdir(join(root, ".pipeline"), { recursive: true });
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    pipeline: { name: "Log Fixture" },
  });
  return root;
}
