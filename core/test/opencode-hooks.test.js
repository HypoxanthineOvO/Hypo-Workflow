import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectOpenCodeToolPaths,
  classifyOpenCodeBashCommand,
  decideOpenCodePermission,
  evaluateOpenCodeBashPolicy,
  evaluateOpenCodeFileGuard,
  isOpenCodeStopEquivalent,
  serializeOpenCodePermissionEvent,
  shouldOpenCodeAutoContinue,
  writeOpenCodeArtifacts,
} from "../src/index.js";

test("OpenCode hook policy guards protected, knowledge, worktree, and secret paths", () => {
  const context = {
    projectRoot: "/repo/project",
    homeDir: "/home/heyx",
  };

  assert.deepEqual(collectOpenCodeToolPaths({
    file: ".pipeline/state.yaml",
    nested: { filePath: ".pipeline/cycle.yaml" },
    edits: [{ path: ".pipeline/config.yaml" }],
  }), [".pipeline/state.yaml", ".pipeline/cycle.yaml", ".pipeline/config.yaml"]);

  assert.equal(evaluateOpenCodeFileGuard({ args: { filePath: ".pipeline/state.yaml" }, ...context }).behavior, "deny");
  assert.equal(evaluateOpenCodeFileGuard({ args: { filePath: ".pipeline/state.yaml" }, workflowMutationActive: true, ...context }).behavior, "allow");
  assert.equal(evaluateOpenCodeFileGuard({ args: { path: ".pipeline/knowledge/records/M03.yaml" }, ...context }).behavior, "allow");
  assert.equal(evaluateOpenCodeFileGuard({ args: { path: ".pipeline/config.yaml" }, ...context }).severity, "warn");
  assert.equal(evaluateOpenCodeFileGuard({ args: { path: "/home/heyx/.hypo-workflow/worktrees/project/E001/file.js" }, ...context }).behavior, "allow");
  assert.equal(evaluateOpenCodeFileGuard({ args: { path: "/home/heyx/.hypo-workflow/secrets.yaml" }, ...context }).behavior, "deny");
});

test("OpenCode permission and auto-continue policies are conservative by default", () => {
  assert.equal(decideOpenCodePermission({ args: { path: ".pipeline/state.yaml" } }).status, "deny");
  assert.equal(decideOpenCodePermission({ args: { path: ".pipeline/knowledge/index/decisions.yaml" } }).status, "allow");
  assert.equal(decideOpenCodePermission({ args: { path: ".pipeline/config.yaml" } }).status, "ask");
  assert.equal(decideOpenCodePermission({ permission: "bash", args: { command: "uv run node --test core/test/config.test.js" } }).status, "allow");
  assert.equal(decideOpenCodePermission({ permission: "bash", args: { command: "git push origin main" } }).status, "ask");
  assert.equal(decideOpenCodePermission({ permission: "bash", args: { command: "rm -rf .pipeline" } }).status, "ask");

  assert.equal(shouldOpenCodeAutoContinue({ mode: "ask", testsPassed: true }), false);
  assert.equal(shouldOpenCodeAutoContinue({ mode: "safe", testsPassed: true, errorRules: false, interactiveGateOpen: false, protectedFileDirty: false }), true);
  assert.equal(shouldOpenCodeAutoContinue({ mode: "safe", testsPassed: true, interactiveGateOpen: true }), false);
  assert.equal(shouldOpenCodeAutoContinue({ mode: "aggressive", interactiveGateOpen: false, status: "idle" }), true);
  assert.equal(shouldOpenCodeAutoContinue({ mode: "aggressive", interactiveGateOpen: true, status: "idle" }), false);

  assert.equal(isOpenCodeStopEquivalent({ status: "idle", unfinishedMilestones: 0, missingReport: false, stepRunning: false }), true);
  assert.equal(isOpenCodeStopEquivalent({ status: "idle", unfinishedMilestones: 1, missingReport: false, stepRunning: false }), false);
});

test("OpenCode bash policy allows local execution but gates external, destructive, and system commands", () => {
  assert.equal(classifyOpenCodeBashCommand("uv run pytest"), "local");
  assert.equal(classifyOpenCodeBashCommand("git status --short"), "local");
  assert.equal(classifyOpenCodeBashCommand("git push origin main"), "external");
  assert.equal(classifyOpenCodeBashCommand("curl https://example.com"), "external");
  assert.equal(classifyOpenCodeBashCommand("sudo apt install ripgrep"), "system_install");
  assert.equal(classifyOpenCodeBashCommand("git reset --hard HEAD"), "destructive");

  assert.equal(evaluateOpenCodeBashPolicy({ permission: "bash", args: { command: "npm test" } }).status, "allow");
  assert.equal(evaluateOpenCodeBashPolicy({ permission: "bash", args: { command: "npm publish" } }).status, "ask");
  assert.equal(evaluateOpenCodeBashPolicy({ permission: "bash", args: { command: "uv run node --test" }, bash: { mode: "ask" } }).status, "ask");
  assert.equal(evaluateOpenCodeBashPolicy({ permission: "bash" }).status, "ask");
});

test("OpenCode permission events serialize without leaking secret values", () => {
  const event = serializeOpenCodePermissionEvent("permission.ask", {
    tool: "edit",
    args: {
      path: "/home/heyx/.hypo-workflow/secrets.yaml",
      api_key: "sk-raw-value",
      nested: { token: "raw-token" },
    },
    decision: "ask",
  });

  assert.equal(event.type, "permission.ask");
  assert.equal(event.tool, "edit");
  assert.equal(event.decision, "ask");
  assert.equal(event.args.api_key, "[REDACTED]");
  assert.equal(event.args.nested.token, "[REDACTED]");
  assert.doesNotMatch(JSON.stringify(event), /sk-raw-value|raw-token/);
});

test("generated OpenCode plugin imports runtime hook policy helpers", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-opencode-hooks-"));
  try {
    await writeOpenCodeArtifacts(dir, { profile: "standard" });

    const plugin = await readFile(join(dir, ".opencode", "plugins", "hypo-workflow.ts"), "utf8");
    const runtime = await readFile(join(dir, ".opencode", "runtime", "hypo-workflow-hooks.js"), "utf8");

    assert.match(plugin, /from "\.\.\/runtime\/hypo-workflow-hooks\.js"/);
    assert.match(plugin, /decideOpenCodePermission/);
    assert.match(plugin, /const bashExecution =/);
    assert.match(plugin, /output\.status = permission\.status/);
    assert.match(plugin, /isOpenCodeStopEquivalent/);
    assert.match(runtime, /export function evaluateOpenCodeFileGuard/);
    assert.match(runtime, /export function evaluateOpenCodeBashPolicy/);
    assert.match(runtime, /export function shouldOpenCodeAutoContinue/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
