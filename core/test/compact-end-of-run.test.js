import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  compactEndOfRunTargets,
  runEndOfRunCompact,
  writeConfig,
} from "../src/index.js";

test("end-of-run compact refreshes dirty targets after a successful run only", async () => {
  const root = await fixtureRoot();
  await writeFile(join(root, ".pipeline", "PROGRESS.compact.md"), "# Old Progress Compact\n", "utf8");
  await writeFile(join(root, ".pipeline", "state.compact.yaml"), "pipeline:\n  status: stale\n", "utf8");
  await writeFile(join(root, ".pipeline", "log.compact.yaml"), "entries: []\n", "utf8");
  await sleepForMtime();
  await writeFile(join(root, ".pipeline", "PROGRESS.md"), "# Progress\n\nnew end of run event\n", "utf8");
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { name: "Compact Fixture", status: "completed", prompts_completed: 1, prompts_total: 1 },
    current: { phase: "completed", prompt_name: "M01", step: null },
    history: {
      completed_prompts: [
        { prompt_name: "M01", result: "pass", report_file: ".pipeline/reports/M01.report.md" },
      ],
    },
  });
  await writeConfig(join(root, ".pipeline", "log.yaml"), {
    entries: [
      { id: "M00-OLDER", type: "milestone_complete", timestamp: "2026-05-09T09:00:00+08:00" },
      { id: "M01-COMPLETE", type: "milestone_complete", timestamp: "2026-05-09T10:00:00+08:00" },
    ],
  });

  const result = await runEndOfRunCompact(root, {
    success: true,
    now: "2026-05-09T10:05:00+08:00",
    compact: { log_recent: 1 },
  });

  assert.equal(result.ok, true);
  assert.equal(result.skipped, false);
  assert.ok(result.refreshed.includes(".pipeline/PROGRESS.compact.md"));
  assert.ok(result.refreshed.includes(".pipeline/state.compact.yaml"));
  assert.ok(result.refreshed.includes(".pipeline/log.compact.yaml"));
  assert.match(await readFile(join(root, ".pipeline", "PROGRESS.compact.md"), "utf8"), /new end of run event/);
  assert.match(await readFile(join(root, ".pipeline", "state.compact.yaml"), "utf8"), /status: completed/);
  const logCompact = await readFile(join(root, ".pipeline", "log.compact.yaml"), "utf8");
  assert.match(logCompact, /M01-COMPLETE/);
  assert.doesNotMatch(logCompact, /M00-OLDER/);
});

test("end-of-run compact skips failed or disabled runs", async () => {
  const failedRoot = await fixtureRoot();
  await writeFile(join(failedRoot, ".pipeline", "PROGRESS.compact.md"), "old compact\n", "utf8");
  await sleepForMtime();
  await writeFile(join(failedRoot, ".pipeline", "PROGRESS.md"), "# Progress\n\nfailed run text\n", "utf8");

  const failed = await runEndOfRunCompact(failedRoot, { success: false });
  assert.equal(failed.skipped, true);
  assert.equal(failed.reason, "run_not_successful");
  assert.equal(await readFile(join(failedRoot, ".pipeline", "PROGRESS.compact.md"), "utf8"), "old compact\n");

  const disabledRoot = await fixtureRoot({ compact: { auto: false } });
  const disabled = await runEndOfRunCompact(disabledRoot, { success: true });
  assert.equal(disabled.skipped, true);
  assert.equal(disabled.reason, "compact_auto_disabled");
});

test("dirty-only compact leaves fresh targets untouched and never compacts old compact text", async () => {
  const root = await fixtureRoot();
  await writeFile(join(root, ".pipeline", "PROGRESS.md"), "# Progress\n\nfresh source\n", "utf8");
  await writeFile(join(root, ".pipeline", "metrics.yaml"), "runs:\n  - id: M01\n", "utf8");
  await sleepForMtime();
  await writeFile(join(root, ".pipeline", "PROGRESS.compact.md"), "# Progress\n\nfresh source\n", "utf8");
  await writeFile(join(root, ".pipeline", "metrics.compact.yaml"), "old compact text that must survive\n", "utf8");
  const metricsBefore = await stat(join(root, ".pipeline", "metrics.compact.yaml"));
  await sleepForMtime();
  await writeFile(join(root, ".pipeline", "PROGRESS.md"), "# Progress\n\nfresh source\nnew dirty text\n", "utf8");

  const result = await runEndOfRunCompact(root, { success: true });

  assert.ok(result.refreshed.includes(".pipeline/PROGRESS.compact.md"));
  assert.ok(!result.refreshed.includes(".pipeline/metrics.compact.yaml"));
  assert.equal(await readFile(join(root, ".pipeline", "metrics.compact.yaml"), "utf8"), "old compact text that must survive\n");
  assert.equal((await stat(join(root, ".pipeline", "metrics.compact.yaml"))).mtimeMs, metricsBefore.mtimeMs);
  assert.doesNotMatch(await readFile(join(root, ".pipeline", "PROGRESS.compact.md"), "utf8"), /Old Progress Compact/);
});

test("end-of-run compact target set is compact-only", () => {
  const targets = compactEndOfRunTargets();
  assert.ok(targets.length >= 5);
  assert.ok(targets.every((target) => target.path.includes(".compact.")));
  assert.ok(targets.every((target) => typeof target.refresh === "function"));
});

async function fixtureRoot(config = {}) {
  const root = await mkdtemp(join(tmpdir(), "hw-compact-end-"));
  await mkdir(join(root, ".pipeline", "reports"), { recursive: true });
  await mkdir(join(root, ".pipeline", "patches"), { recursive: true });
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    pipeline: { name: "Compact Fixture" },
    execution: { mode: "self", steps: { preset: "tdd" } },
    compact: {
      auto: true,
      end_of_run: true,
      refresh_policy: "dirty_only",
      ...(config.compact || {}),
    },
  });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { name: "Compact Fixture", status: "running", prompts_completed: 0, prompts_total: 1 },
    current: { phase: "executing", prompt_name: "M01", step: "review_code", step_index: 0 },
  });
  await writeConfig(join(root, ".pipeline", "log.yaml"), { entries: [] });
  await writeFile(join(root, ".pipeline", "PROGRESS.md"), "# Progress\n\ninitial\n", "utf8");
  await writeFile(join(root, ".pipeline", "reports", "M01.report.md"), "# M01 Report\n\n- Result: pass\n", "utf8");
  return root;
}

async function sleepForMtime() {
  await new Promise((resolve) => setTimeout(resolve, 20));
}
