import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  renderHypoWorkflowMetadata,
  renderOpenCodeStatusTuiPlugin,
  writeOpenCodeArtifacts,
} from "../src/index.js";

test("renderOpenCodeStatusTuiPlugin is disabled for VSP OpenCode built-in dashboard", async () => {
  const source = await renderOpenCodeStatusTuiPlugin();

  assert.equal(source, "");
});

test("writeOpenCodeArtifacts emits server plugin files without deprecated TUI plugin", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-opencode-panels-"));
  await writeOpenCodeArtifacts(dir, { profile: "standard" });

  const serverPlugin = await readFile(join(dir, ".opencode", "plugins", "hypo-workflow.ts"), "utf8");
  const statusModule = await readFile(join(dir, ".opencode", "runtime", "hypo-workflow-status.js"), "utf8");
  const rootConfig = JSON.parse(await readFile(join(dir, "opencode.json"), "utf8"));

  assert.match(serverPlugin, /evaluateOpenCodeFileGuard/);
  assert.match(serverPlugin, /commandMap/);
  assert.match(serverPlugin, /const server/);
  assert.match(serverPlugin, /export default server/);
  assert.match(statusModule, /buildOpenCodeStatusModel/);
  assert.deepEqual(rootConfig.plugin, [".opencode/plugins/hypo-workflow.ts"]);
  await assert.rejects(readFile(join(dir, "tui.json"), "utf8"));
  await assert.rejects(readFile(join(dir, ".opencode", "tui", "hypo-workflow-tui.tsx"), "utf8"));
});

test("generated OpenCode server plugin is importable and exposes OpenCode module entrypoints", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-opencode-plugin-import-"));
  await writeOpenCodeArtifacts(dir, { profile: "standard" });
  const serverSource = await readFile(join(dir, ".opencode", "plugins", "hypo-workflow.ts"), "utf8");
  assert.match(serverSource, /\.\.\/runtime\/hypo-workflow-hooks\.js/);
  const serverModulePath = join(dir, ".opencode", "plugins", "hypo-workflow-node-import.mjs");
  await writeFile(serverModulePath, serverSource, "utf8");

  const server = await import(serverModulePath);
  assert.equal(typeof server.default, "function");
  const module = await server.default({ client: { log() {} } });
  for (const hook of [
    "event",
    "command.execute.before",
    "tool.execute.before",
    "tool.execute.after",
    "permission.ask",
    "experimental.session.compacting",
    "experimental.compaction.autocontinue",
  ]) {
    assert.equal(typeof module[hook], "function", `missing server hook ${hook}`);
  }
  const compacting = { context: [] };
  await module["experimental.session.compacting"]({}, compacting);
  assert.match(compacting.context[0], /\.pipeline\/state\.yaml/);
  const permission = {};
  await module["permission.ask"]({ args: { filePath: ".pipeline/state.yaml" } }, permission);
  assert.ok(permission.status);
});

test("writeOpenCodeArtifacts removes deprecated plugin-side and TUI status helpers", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-opencode-panels-cleanup-"));
  const legacyPlugin = join(dir, ".opencode", "plugins", "hypo-workflow.js");
  const legacy = join(dir, ".opencode", "plugins", "hypo-workflow-status.js");
  await mkdir(join(dir, ".opencode", "plugins"), { recursive: true });
  await mkdir(join(dir, ".opencode", "tui"), { recursive: true });
  await writeFile(legacyPlugin, "export default {};\n", "utf8");
  await writeFile(legacy, "export const legacy = true;\n", "utf8");
  await writeFile(join(dir, ".opencode", "plugins", "hypo-workflow-tui.tsx"), "export const legacyTui = true;\n", "utf8");
  await writeFile(join(dir, ".opencode", "tui", "hypo-workflow-tui.tsx"), "export const tui = true;\n", "utf8");
  await writeFile(
    join(dir, "tui.json"),
    `${JSON.stringify({ $schema: "https://opencode.ai/tui.json", plugin: [".opencode/tui/hypo-workflow-tui.tsx"] }, null, 2)}\n`,
    "utf8",
  );

  await writeOpenCodeArtifacts(dir, { profile: "standard" });

  await assert.rejects(readFile(legacyPlugin, "utf8"));
  await assert.rejects(readFile(legacy, "utf8"));
  await assert.rejects(readFile(join(dir, ".opencode", "plugins", "hypo-workflow-tui.tsx"), "utf8"));
  await assert.rejects(readFile(join(dir, ".opencode", "tui", "hypo-workflow-tui.tsx"), "utf8"));
  await assert.rejects(readFile(join(dir, "tui.json"), "utf8"));
});

test("writeOpenCodeArtifacts preserves non-Hypo TUI plugin config while removing deprecated reference", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-opencode-tui-config-cleanup-"));
  await writeFile(
    join(dir, "tui.json"),
    `${JSON.stringify({
      $schema: "https://opencode.ai/tui.json",
      plugin: [
        ".opencode/tui/hypo-workflow-tui.tsx",
        ".opencode/tui/custom.tsx",
      ],
      theme: "user-owned",
    }, null, 2)}\n`,
    "utf8",
  );

  await writeOpenCodeArtifacts(dir, { profile: "standard" });

  const tuiConfig = JSON.parse(await readFile(join(dir, "tui.json"), "utf8"));
  assert.deepEqual(tuiConfig.plugin, [".opencode/tui/custom.tsx"]);
  assert.equal(tuiConfig.theme, "user-owned");
});

test("writeOpenCodeArtifacts renders model matrix into role agent files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-opencode-matrix-"));
  await writeOpenCodeArtifacts(dir, {
    profile: {
      name: "standard",
      compaction: {
        effective_context_target: 777000,
      },
      agents: {
        plan: { model: "custom-plan" },
        compact: { model: "custom-compact" },
        test: { model: "custom-test" },
        "code-a": { model: "custom-code-a" },
        "code-b": { model: "custom-code-b" },
        debug: { model: "custom-debug" },
        docs: { model: "custom-docs" },
        report: { model: "custom-report" },
      },
    },
  });

  const planAgent = await readFile(join(dir, ".opencode", "agents", "hw-plan.md"), "utf8");
  const testAgent = await readFile(join(dir, ".opencode", "agents", "hw-test.md"), "utf8");
  const codeAAgent = await readFile(join(dir, ".opencode", "agents", "hw-code-a.md"), "utf8");
  const codeBAgent = await readFile(join(dir, ".opencode", "agents", "hw-code-b.md"), "utf8");
  const docsAgent = await readFile(join(dir, ".opencode", "agents", "hw-docs.md"), "utf8");
  const reportAgent = await readFile(join(dir, ".opencode", "agents", "hw-report.md"), "utf8");
  const metadata = JSON.parse(await readFile(join(dir, ".opencode", "hypo-workflow.json"), "utf8"));
  const rootConfig = JSON.parse(await readFile(join(dir, "opencode.json"), "utf8"));

  assert.match(planAgent, /^model: custom-plan$/m);
  assert.match(testAgent, /^model: custom-test$/m);
  assert.match(codeAAgent, /^model: custom-code-a$/m);
  assert.match(codeBAgent, /^model: custom-code-b$/m);
  assert.match(docsAgent, /^model: custom-docs$/m);
  assert.match(reportAgent, /^model: custom-report$/m);
  assert.equal(metadata.compaction.effective_context_target, 777000);
  assert.equal(metadata.agents.compact.model, "custom-compact");
  assert.equal(rootConfig.compaction.effective_context_target, undefined);
  assert.equal(rootConfig.agents, undefined);
});

test("writeOpenCodeArtifacts injects DeepSeek tool-calling rules only for DeepSeek agents", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-opencode-deepseek-tools-"));
  await writeOpenCodeArtifacts(dir, { profile: "standard" });

  const planAgent = await readFile(join(dir, ".opencode", "agents", "hw-plan.md"), "utf8");
  const buildAgent = await readFile(join(dir, ".opencode", "agents", "hw-build.md"), "utf8");
  const testAgent = await readFile(join(dir, ".opencode", "agents", "hw-test.md"), "utf8");
  const codeBAgent = await readFile(join(dir, ".opencode", "agents", "hw-code-b.md"), "utf8");
  const reportAgent = await readFile(join(dir, ".opencode", "agents", "hw-report.md"), "utf8");

  for (const deepSeekAgent of [planAgent, testAgent, codeBAgent, reportAgent]) {
    assert.match(deepSeekAgent, /DeepSeek Tool Calling Rules/);
    assert.match(deepSeekAgent, /When using DeepSeek through OpenCode/);
    assert.match(deepSeekAgent, /Omit optional fields you do not need/);
    assert.match(deepSeekAgent, /File paths, URLs, IDs/);
    assert.match(deepSeekAgent, /If a tool returns a validation error/);
  }
  assert.match(planAgent, /Ask Questions Discipline/);
  assert.doesNotMatch(buildAgent, /DeepSeek Tool Calling Rules/);
});

test("OpenCode metadata carries agent model matrix and compaction settings", () => {
  const metadata = renderHypoWorkflowMetadata({
    name: "standard",
    auto_continue: true,
    file_guard: "strict",
    compaction: {
      effective_context_target: 900000,
    },
    agents: {
      plan: { model: "deepseek-v4-pro" },
      compact: { model: "deepseek-v4-flash" },
      test: { model: "deepseek-v4-pro" },
      "code-a": { model: "mimo-v2.5-pro" },
      "code-b": { model: "deepseek-v4-pro" },
      debug: { model: "deepseek-v4-pro" },
      docs: { model: "deepseek-v4-pro" },
      report: { model: "deepseek-v4-flash" },
    },
  });

  assert.equal(metadata.compaction.effective_context_target, 900000);
  assert.equal(metadata.agents.plan.model, "deepseek-v4-pro");
  assert.equal(metadata.agents.compact.model, "deepseek-v4-flash");
  assert.equal(metadata.agents.test.model, "deepseek-v4-pro");
  assert.equal(metadata.agents["code-a"].model, "mimo-v2.5-pro");
  assert.equal(metadata.agents["code-b"].model, "deepseek-v4-pro");
  assert.equal(metadata.agents.debug.model, "deepseek-v4-pro");
  assert.equal(metadata.agents.docs.model, "deepseek-v4-pro");
  assert.equal(metadata.agents.report.model, "deepseek-v4-flash");
});

test("OpenCode spec documents model matrix contract without runner semantics", async () => {
  const spec = await readFile("references/opencode-spec.md", "utf8");

  assert.match(spec, /## OpenCode Model Matrix Contract/);
  assert.match(spec, /effective_context_target: 900000/);
  assert.match(spec, /plan:\n\s+model: deepseek-v4-pro/);
  assert.match(spec, /compact:\n\s+model: deepseek-v4-flash/);
  assert.match(spec, /not as a model-calling runner/);
});

test("OpenCode agent frontmatter uses provider-qualified model ids for known providers", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-opencode-qualified-models-"));
  await writeOpenCodeArtifacts(dir, { profile: "standard" });

  const planAgent = await readFile(join(dir, ".opencode", "agents", "hw-plan.md"), "utf8");
  const buildAgent = await readFile(join(dir, ".opencode", "agents", "hw-build.md"), "utf8");
  const testAgent = await readFile(join(dir, ".opencode", "agents", "hw-test.md"), "utf8");
  const reportAgent = await readFile(join(dir, ".opencode", "agents", "hw-report.md"), "utf8");
  const metadata = JSON.parse(await readFile(join(dir, ".opencode", "hypo-workflow.json"), "utf8"));

  assert.match(planAgent, /^model: deepseek\/deepseek-v4-pro$/m);
  assert.match(buildAgent, /^model: mimo\/mimo-v2\.5-pro$/m);
  assert.match(testAgent, /^model: deepseek\/deepseek-v4-pro$/m);
  assert.match(reportAgent, /^model: deepseek\/deepseek-v4-flash$/m);
  assert.equal(metadata.agents["code-a"].model, "mimo-v2.5-pro");
});
