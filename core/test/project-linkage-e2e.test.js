import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as api from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = join(__dirname, "fixtures", "project-linkage-e2e");
const scenarioPath = join(fixtureRoot, "scenario.json");

test("project linkage e2e dry-run bundle is exported as a production orchestration contract", () => {
  assert.equal(
    typeof api.buildProjectLinkageE2EDryRunBundle,
    "function",
    "expected buildProjectLinkageE2EDryRunBundle to be exported from ../src/index.js",
  );
});

test("project linkage e2e dry-run wires registry, stop events, capture, notification, and daily summary with no external side effects", async () => {
  const buildProjectLinkageE2EDryRunBundle = requireApi("buildProjectLinkageE2EDryRunBundle");
  const scenario = await readJson(scenarioPath);
  const sideEffects = sideEffectTraps();

  const bundle = await buildProjectLinkageE2EDryRunBundle(scenario, {
    mode: "dry-run",
    now: "2026-05-21T00:30:00+08:00",
    timezone: "Asia/Shanghai",
    max_chars: 320,
    spawn: sideEffects.spawn,
    qq_client: sideEffects.qq_client,
    notion_client: sideEffects.notion_client,
    publish: sideEffects.publish,
  });

  assert.equal(bundle.kind, "project_linkage_e2e_dry_run_bundle");
  assert.equal(bundle.schema_version, "1");
  assert.equal(bundle.mode, "dry-run");
  assert.match(bundle.bundle_id, /^project-linkage-e2e-/);
  assert.match(bundle.bundle_hash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(bundle.generated_at, "2026-05-21T00:30:00+08:00");

  assertBundleSection(bundle, "registry");
  assertBundleSection(bundle, "stop_events");
  assertBundleSection(bundle, "capture_results");
  assertBundleSection(bundle, "notification_dry_run");
  assertBundleSection(bundle, "daily_summary");
  assertBundleSection(bundle, "no_external_side_effects");

  assert.equal(bundle.remote_writes_enabled, false);
  assert.equal(bundle.external_actions_enabled, false);
  assert.equal(bundle.publish_enabled, false);
  assert.deepEqual(bundle.planned_actions, []);

  assert.equal(bundle.sections.registry.remote_writes_enabled, false);
  assert.equal(bundle.sections.registry.external_actions_enabled, false);
  assert.ok(bundle.sections.registry.projects.some((project) => project.id === "hypo-workflow"));
  assert.ok(bundle.sections.registry.projects.some((project) => project.id === "hypo-claw"));

  const validStop = findByProject(bundle.sections.stop_events.events, "hypo-workflow");
  assert.equal(validStop.stop_reason, "waiting_acceptance");
  assert.equal(validStop.notification_state, "dry_run_ready");

  const missingOutputStop = findByProject(bundle.sections.stop_events.events, "hypo-claw");
  assert.equal(missingOutputStop.stop_reason, "failed");
  assert.equal(missingOutputStop.notification_state, "blocked_capture_failed");

  const validCapture = findByProject(bundle.sections.capture_results.results, "hypo-workflow");
  assert.equal(validCapture.status, "captured");
  assert.equal(validCapture.output, scenario.expected.valid_final_output);
  assert.equal(validCapture.side_effect, "local_read");
  assert.deepEqual(validCapture.planned_external_actions, []);

  const missingCapture = findByProject(bundle.sections.capture_results.results, "hypo-claw");
  assert.equal(missingCapture.status, "capture_failed");
  assert.match(missingCapture.reason, /assistant output not found|missing final assistant output/i);
  assert.equal(Object.hasOwn(missingCapture, "output"), false);
  assert.equal(missingCapture.side_effect, "local_read");
  assert.deepEqual(missingCapture.planned_external_actions, []);

  const validNotification = findByProject(bundle.sections.notification_dry_run.results, "hypo-workflow");
  assert.equal(validNotification.status, "dry_run");
  assert.equal(validNotification.mode, "dry-run");
  assert.equal(validNotification.channel, "hypo-claw-qq");
  assert.equal(validNotification.external_contacted, false);
  assert.equal(validNotification.qq_contacted, false);
  assert.equal(validNotification.spawned, false);
  assert.ok(validNotification.segments.length >= 1);
  assert.equal(validNotification.segments.map((segment) => segment.body).join(""), validNotification.message);
  assert.equal(countOccurrences(validNotification.message, scenario.expected.valid_final_output), 1);

  const blockedNotification = findByProject(bundle.sections.notification_dry_run.results, "hypo-claw");
  assert.equal(blockedNotification.status, "blocked");
  assert.match(blockedNotification.reason, /capture/i);
  assert.equal(blockedNotification.external_contacted, false);
  assert.equal(blockedNotification.qq_contacted, false);
  assert.equal(blockedNotification.spawned, false);
  assert.deepEqual(blockedNotification.segments, []);

  assert.equal(bundle.sections.daily_summary.summary.kind, "daily_project_summary");
  assert.ok(
    bundle.sections.daily_summary.summary.notification_failures.some((failure) =>
      failure.project_id === "hypo-claw" && /assistant output/i.test(failure.reason || ""),
    ),
    "missing final output must be represented in the daily summary failure section",
  );
  assert.match(bundle.sections.daily_summary.message, /通知失败/);
  assert.match(bundle.sections.daily_summary.message, /Hypo-Claw/);
  assert.match(bundle.sections.daily_summary.message, /assistant output/i);
  assert.ok(
    bundle.sections.daily_summary.message.indexOf("通知失败") <
      bundle.sections.daily_summary.message.indexOf("项目动态"),
    "failure section must precede project activity",
  );
  assert.equal(bundle.sections.daily_summary.notification.status, "dry_run");
  assert.equal(bundle.sections.daily_summary.notification.external_contacted, false);
  assert.equal(bundle.sections.daily_summary.notification.qq_contacted, false);
  assert.equal(bundle.sections.daily_summary.notification.remote_writes_enabled, false);

  assert.deepEqual(bundle.sections.no_external_side_effects, {
    qq_sent: false,
    notion_written: false,
    publish_called: false,
    spawned: false,
    remote_writes_enabled: false,
    external_actions_enabled: false,
  });
  assert.deepEqual(sideEffects.calls, []);
  assert.doesNotMatch(JSON.stringify(bundle), /\bstatus["']?\s*:\s*["']?(sent|published)\b/i);
  assert.doesNotMatch(JSON.stringify(bundle), /\b(remote_write|notion_write|qq_send|publish_action)\b/i);
});

function requireApi(name) {
  assert.equal(typeof api[name], "function", `expected ${name} to be exported from ../src/index.js`);
  return api[name];
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function assertBundleSection(bundle, name) {
  assert.ok(bundle.sections?.[name], `missing bundle.sections.${name}`);
}

function findByProject(items, projectId) {
  const found = items.find((item) => item.project_id === projectId || item.project?.id === projectId);
  assert.ok(found, `missing item for ${projectId}`);
  return found;
}

function countOccurrences(value, needle) {
  return String(value).split(needle).length - 1;
}

function sideEffectTraps() {
  const calls = [];
  return {
    calls,
    spawn: (...args) => {
      calls.push(["spawn", ...args]);
      throw new Error("dry-run must not spawn Hypo-Claw or any external process");
    },
    qq_client: {
      send(...args) {
        calls.push(["qq.send", ...args]);
        throw new Error("dry-run must not send QQ messages");
      },
    },
    notion_client: {
      appendBlock(...args) {
        calls.push(["notion.appendBlock", ...args]);
        throw new Error("dry-run must not write Notion");
      },
      updatePage(...args) {
        calls.push(["notion.updatePage", ...args]);
        throw new Error("dry-run must not write Notion");
      },
    },
    publish: (...args) => {
      calls.push(["publish", ...args]);
      throw new Error("dry-run must not publish");
    },
  };
}
