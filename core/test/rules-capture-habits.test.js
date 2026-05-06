import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildRememberRuleProposal,
  detectRememberRuleCandidates,
  loadStructuredRulesAuthority,
  renderStructuredHabitsDocument,
  renderStructuredRulesInstructionBlock,
  writeConfirmedStructuredRule,
  writeOpenCodeArtifacts,
  writeStructuredHabitsDocument,
  writeThirdPartyAdapterArtifacts,
} from "../src/index.js";

test("buildRememberRuleProposal parses command form and keeps ordinary candidates confirmable", () => {
  const proposal = buildRememberRuleProposal(
    "/hw:rules remember --id frontend-layout-density --scope cycle --severity error --label frontend --hook always 前端页面优先使用紧凑、可扫描的工具型布局。",
  );

  assert.equal(proposal.id, "frontend-layout-density");
  assert.equal(proposal.scope, "cycle");
  assert.equal(proposal.severity, "error");
  assert.equal(proposal.label, "frontend");
  assert.equal(proposal.force, false);
  assert.equal(proposal.requires_confirmation, true);
  assert.deepEqual(proposal.hooks, ["always"]);
  assert.match(proposal.content.instruction, /紧凑、可扫描/);
});

test("detectRememberRuleCandidates does not block the current discussion", () => {
  const result = detectRememberRuleCandidates("顺便记住这条规则：所有 Review 报告必须列出 checked 和 skipped surfaces。");

  assert.equal(result.blocking, false);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].requires_confirmation, true);
  assert.match(result.confirmation_prompt, /是否把以下要求记为规则/);
  assert.match(result.confirmation_prompt, /checked 和 skipped surfaces/);
});

test("force-write proposal writes a structured rule and appears in effective habits", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-rules-remember-"));
  const proposal = buildRememberRuleProposal(
    "/hw:rules remember --force --id review-surface-evidence --scope project --severity warn --label review Review 报告必须列出 checked 和 skipped surfaces。",
  );

  assert.equal(proposal.force, true);
  assert.equal(proposal.requires_confirmation, false);

  const written = await writeConfirmedStructuredRule(root, proposal, {
    source: { captured_from: "command", author: "user" },
  });
  assert.equal(written.scope, "project");
  assert.ok(written.path.endsWith(join(".pipeline", "rules", "structured", "project", "review-surface-evidence.yaml")));

  const authority = await loadStructuredRulesAuthority(root, ".");
  const rule = authority.effective.rules.find((item) => item.id === "review-surface-evidence");
  assert.equal(rule.scope, "project");
  assert.equal(rule.severity, "warn");

  const habits = renderStructuredHabitsDocument(authority, { title: "Project Habits" });
  assert.match(habits, /# Project Habits/);
  assert.match(habits, /review-surface-evidence/);
  assert.match(habits, /Review 报告必须列出 checked 和 skipped surfaces/);

  const block = renderStructuredRulesInstructionBlock(authority);
  assert.match(block, /Active Rules\/Habits/);
  assert.match(block, /Review 报告必须列出 checked 和 skipped surfaces/);
});

test("structured rule writers create nested parent directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-rules-dirname-"));
  const proposal = buildRememberRuleProposal(
    "/hw:rules remember --force --id dirname-functional-rule --scope project --label review Functional writer checks need real file evidence.",
  );

  const written = await writeConfirmedStructuredRule(root, proposal);
  assert.match(await readFile(written.path, "utf8"), /dirname-functional-rule/);

  const habitsPath = join(root, "generated", "nested", "HABITS.md");
  const habits = await writeStructuredHabitsDocument(root, ".", { path: habitsPath });
  assert.equal(habits.path, habitsPath);
  assert.match(await readFile(habitsPath, "utf8"), /dirname-functional-rule/);
});

test("adapter artifact rendering injects active structured rules into managed instruction surfaces", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-rules-adapters-"));
  const proposal = buildRememberRuleProposal(
    "/hw:rules remember --force --id adapter-rules-authority --scope project --label workflow 所有平台适配器必须声明结构化 rules 是 authority。",
  );
  await writeConfirmedStructuredRule(root, proposal);

  await writeOpenCodeArtifacts(root, { profile: "standard" });
  await writeThirdPartyAdapterArtifacts(root, { platform: "copilot" });

  const agents = await readFile(join(root, "AGENTS.md"), "utf8");
  const habits = await readFile(join(root, ".pipeline", "HABITS.md"), "utf8");
  const copilot = await readFile(join(root, ".github", "copilot-instructions.md"), "utf8");

  assert.match(habits, /# Hypo-Workflow Habits/);
  assert.match(habits, /adapter-rules-authority/);
  assert.match(agents, /Active Rules\/Habits/);
  assert.match(agents, /所有平台适配器必须声明结构化 rules 是 authority/);
  assert.match(copilot, /Active Rules\/Habits/);
  assert.match(copilot, /所有平台适配器必须声明结构化 rules 是 authority/);
});
