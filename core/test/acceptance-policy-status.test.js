import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  DEFAULT_GLOBAL_CONFIG,
  buildGlobalTuiModel,
  buildOpenCodeStatusModel,
  createRejectionFeedbackTemplate,
  evaluateAcceptanceReadiness,
  evaluateAcceptanceStatus,
  loadConfig,
  resolveAcceptancePolicy,
  writeConfig,
} from "../src/index.js";

test("acceptance config defaults and project override resolve policy", async () => {
  assert.equal(DEFAULT_GLOBAL_CONFIG.acceptance.mode, "auto");
  assert.equal(DEFAULT_GLOBAL_CONFIG.acceptance.timeout_hours, 72);
  assert.equal(DEFAULT_GLOBAL_CONFIG.acceptance.reject_escalation_threshold, 3);

  const dir = await mkdtemp(join(tmpdir(), "hw-acceptance-policy-"));
  const file = join(dir, "config.yaml");
  await writeConfig(file, {
    acceptance: {
      mode: "timeout",
      timeout_hours: 12,
      reject_escalation_threshold: 2,
    },
  });

  const loaded = await loadConfig(file);
  const policy = resolveAcceptancePolicy(loaded, {
    acceptance: { mode: "manual", timeout_hours: 24, reject_escalation_threshold: 4 },
  });
  assert.deepEqual(policy, {
    mode: "timeout",
    require_user_confirm: false,
    default_state: "pending",
    timeout_hours: 12,
    reject_escalation_threshold: 2,
  });
});

test("timeout acceptance is deterministic status decision, not background mutation", () => {
  const fresh = evaluateAcceptanceStatus({
    state: "pending",
    requested_at: "2026-05-03T00:00:00+08:00",
  }, {
    mode: "timeout",
    timeout_hours: 4,
  }, {
    now: "2026-05-03T02:00:00+08:00",
  });
  assert.equal(fresh.state, "pending");
  assert.equal(fresh.timed_out, false);

  const expired = evaluateAcceptanceStatus({
    state: "pending",
    requested_at: "2026-05-03T00:00:00+08:00",
  }, {
    mode: "timeout",
    timeout_hours: 1,
  }, {
    now: "2026-05-03T02:00:00+08:00",
  });
  assert.equal(expired.state, "accepted");
  assert.equal(expired.timed_out, true);
  assert.equal(expired.automatic, true);
  assert.equal(expired.reason, "timeout");
});

test("rejection feedback template is structured and iteration-aware", () => {
  const template = createRejectionFeedbackTemplate({
    scope: "patch",
    ref: "P001",
    iteration: 3,
    created_at: "2026-05-03T01:30:00+08:00",
    context: "Patch acceptance",
  });

  assert.equal(template.scope, "patch");
  assert.equal(template.ref, "P001");
  assert.equal(template.iteration, 3);
  assert.equal(template.problem, "");
  assert.equal(template.reproduce_steps, "");
  assert.equal(template.expected, "");
  assert.equal(template.actual, "");
  assert.equal(template.context, "Patch acceptance");
  assert.equal(template.created_at, "2026-05-03T01:30:00+08:00");
});

test("OpenCode status and global TUI expose acceptance policy and timeout state", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-acceptance-status-"));
  await mkdir(join(root, ".pipeline"), { recursive: true });
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    acceptance: { mode: "timeout", timeout_hours: 1, reject_escalation_threshold: 2 },
  });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { name: "Demo", status: "pending_acceptance", prompts_total: 1, prompts_completed: 1 },
    current: { prompt_name: "M01 / Demo", step: null },
    acceptance: {
      scope: "cycle",
      state: "pending",
      cycle_id: "C4",
      requested_at: "2026-05-03T00:00:00+08:00",
    },
  });
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: {
      number: 4,
      status: "pending_acceptance",
      acceptance: { mode: "timeout", state: "pending", requested_at: "2026-05-03T00:00:00+08:00" },
    },
  });

  const status = await buildOpenCodeStatusModel(root, { now: "2026-05-03T02:00:00+08:00" });
  assert.equal(status.acceptance.policy.mode, "timeout");
  assert.equal(status.acceptance.state, "accepted");
  assert.equal(status.acceptance.timed_out, true);
  assert.match(status.footer.text, /acceptance:accepted/);
  assert.match(status.sidebar.sections.find((section) => section.title === "Current").items.join("\n"), /timeout/);

  const home = join(root, "home");
  await writeConfig(join(home, ".hypo-workflow", "config.yaml"), {
    acceptance: { mode: "timeout", timeout_hours: 1, reject_escalation_threshold: 2 },
  });
  const tui = await buildGlobalTuiModel({ homeDir: home });
  assert.equal(tui.config.acceptance.mode, "timeout");
  assert.equal(tui.config.acceptance.timeout_hours, 1);
});

test("acceptance readiness can block on audit-insufficient worker separation policy", () => {
  const readiness = evaluateAcceptanceReadiness(
    {
      acceptance: {
        state: "pending",
        audit_verdict: "insufficient",
      },
    },
    {
      projectConfig: {
        execution: {
          worker_separation: {
            mode: "recommended",
          },
        },
      },
      workers: [
        { role: "implement", worker_id: "impl-1" },
        { role: "test", worker_id: "test-1" },
        { role: "audit", worker_id: "audit-1" },
      ],
      audit_verdict: "insufficient",
    },
  );

  assert.equal(readiness.blocked, true);
  assert.match(readiness.reasons.join("\n"), /insufficient/i);
  assert.equal(readiness.worker_separation.degraded, false);
});
