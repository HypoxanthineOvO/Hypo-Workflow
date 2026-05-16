import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildClaudeStatusSurface,
  evaluateClaudeHookEvent,
  renderClaudeStatusMarkdown,
  renderClaudeStatusMonitorManifest,
  writeConfig,
} from "../src/index.js";

test("Claude status surface renders compact PROGRESS sections and automation basics", async () => {
  const root = await fixtureRoot();
  const surface = await buildClaudeStatusSurface(root, { now: "2026-05-05T08:00:00.000Z" });

  assert.equal(surface.ok, true);
  assert.equal(surface.progress.completed, 5);
  assert.equal(surface.progress.total, 7);
  assert.equal(surface.current.milestone_id, "M06");
  assert.equal(surface.progress_table.length, 2);
  assert.match(surface.progress_table[1].milestone, /Progress Status Surface/);
  assert.equal(surface.automation.evaluation_auto_continue, true);
  assert.equal(surface.automation.batch_auto_chain, true);
  assert.equal(surface.safety_profile, "developer");
  assert.equal(surface.analysis.ledger_path, ".pipeline/analysis/M06/ledger.yaml");
  assert.equal(surface.recent_events.length, 2);
  assert.equal(surface.monitor.supported, true);
  assert.equal(surface.monitor.decision, "fallback-required");
  assert.deepEqual(surface.fallbacks, ["monitor", "hw-status", "session-summary", "dashboard"]);
});

test("Claude status markdown uses the compact shared status model", async () => {
  const root = await fixtureRoot();
  const surface = await buildClaudeStatusSurface(root, { now: "2026-05-05T08:00:00.000Z" });
  const rendered = renderClaudeStatusMarkdown(surface);

  assert.match(rendered, /M06/);
  assert.match(rendered, /continue_execution/);
  assert.match(rendered, /evaluation\.auto_continue=true/);
  assert.match(rendered, /Analysis: Why did the status surface drift/);
  assert.match(rendered, /\.pipeline\/analysis\/M06\/ledger\.yaml/);
  assert.match(rendered, /developer/);
  assert.match(rendered, /M05 completed/);
  assert.doesNotMatch(rendered, /sk-/);
});

test("Claude monitor manifest watches PROGRESS with on-demand fallback", () => {
  const manifest = renderClaudeStatusMonitorManifest();

  assert.deepEqual(manifest, [
    {
      name: "hypo-workflow-progress",
      command: "node hooks/claude-hook.mjs ProgressMonitor",
      description: "Hypo-Workflow progress status notifications",
      when: "on-skill-invoke:hw-status",
    },
  ]);
});

test("Progress hook refresh includes Claude status surface snapshot", async () => {
  const root = await fixtureRoot();
  const result = await evaluateClaudeHookEvent(
    "FileChanged",
    { file_path: ".pipeline/PROGRESS.md" },
    { projectRoot: root },
  );

  assert.equal(result.progress_refresh.path, ".pipeline/PROGRESS.md");
  assert.equal(result.claude_status.current.milestone_id, "M06");
  assert.equal(result.claude_status.progress_table.length, 2);
  assert.match(result.claude_status.summary, /M06/);
});

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "hw-claude-status-"));
  await mkdir(join(root, ".pipeline"), { recursive: true });
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    pipeline: { name: "Claude Status Fixture" },
    evaluation: { auto_continue: true },
    batch: { auto_chain: true },
    claude_code: {
      profile: "developer",
      status: {
        surface: "auto",
        fallback_order: ["monitor", "hw-status", "session-summary", "dashboard"],
      },
    },
  });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: {
      name: "Claude Status Fixture",
      status: "running",
      prompts_total: 7,
      prompts_completed: 5,
    },
    current: {
      phase: "executing",
      prompt_name: "M06 / F001 - Claude Progress Status Surface",
      step: "write_tests",
    },
    milestones: [
      { id: "M05", feature_id: "F001", status: "done" },
      { id: "M06", feature_id: "F001", status: "in_progress" },
    ],
    prompt_state: {
      analysis_summary: {
        milestone_id: "M06",
        question: "Why did the status surface drift?",
        ledger_path: ".pipeline/analysis/M06/ledger.yaml",
        hypothesis_counts: { total: 2, confirmed: 1, pending: 1 },
        experiment_counts: { total: 2, completed: 1, pending: 1 },
        conclusion: "Compact status should expose the ledger pointer.",
        confidence: "medium",
        next_action: "inspect generated markdown",
      },
    },
  });
  await writeConfig(join(root, ".pipeline", "log.yaml"), {
    events: [
      {
        id: "e1",
        type: "milestone_complete",
        timestamp: "2026-05-05T07:58:00.000Z",
        summary: "M05 completed without token sk-secret",
      },
    ],
  });
  await writeFile(join(root, ".pipeline", "PROGRESS.md"), progressMarkdown(), "utf8");
  return root;
}

function progressMarkdown() {
  return `# Claude Status Fixture - 开发进度

> 最后更新：16:00 | 状态：执行中 | 进度：5/7 Milestone

## 当前状态

🔄 **M06 Claude Progress Status Surface** — \`write_tests\` 执行中。

## 基本设置

| 项目 | 值 |
|---|---|
| Automation | \`evaluation.auto_continue=true\`，\`batch.auto_chain=true\` |
| Safety Profiles | local \`developer\`；发布默认 \`standard\` |

## Milestone 进度

| # | Feature | Milestone | 状态 | 摘要 |
|---|---|---|---|---|
| M05 | F001 | Claude Subagent Model Routing | ✅ 完成 | routing done |
| M06 | F001 | Claude Progress Status Surface | 🔄 进行中 | status tests |

## 时间线

| 时间 | 类型 | 事件 | 结果 |
|---|---|---|---|
| 16:00 | Milestone | M05 completed | token sk-secret-value should hide |
| 15:58 | Step | M05 run_tests_green | 242/242 passed |
`;
}
