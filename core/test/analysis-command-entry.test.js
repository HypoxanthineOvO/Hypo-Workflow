import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  commandByCanonical,
  commandMap,
  writeOpenCodeArtifacts,
} from "../src/index.js";

const ROOT_SKILL = "SKILL.md";
const ANALYSIS_SKILL = "skills/analysis/SKILL.md";

test("analysis command is a first-class canonical and OpenCode entry", async () => {
  const rootSkill = await readFile(ROOT_SKILL, "utf8");
  const commandsSpec = await readFile("references/commands-spec.md", "utf8");
  const opencodeMap = await readFile("references/opencode-command-map.md", "utf8");
  const skillSpec = await readFile("references/skill-spec.md", "utf8");

  const command = commandByCanonical("/hw:analysis");
  assert.ok(command, "/hw:analysis must be present in the canonical command registry");
  assert.equal(command.opencode, "/hw-analysis");
  assert.equal(command.skill, ANALYSIS_SKILL);
  assert.ok(command.agent, "analysis command must choose an OpenCode agent");
  assert.match(command.route, /analysis|lifecycle|read|debug/);
  assert.ok(commandMap("opencode").some((item) => item.opencode === "/hw-analysis"));
  assert.ok(existsSync(ANALYSIS_SKILL), `${ANALYSIS_SKILL} must exist`);

  for (const [label, content] of Object.entries({
    rootSkill,
    commandsSpec,
    opencodeMap,
    skillSpec,
  })) {
    assert.match(content, /\/hw:analysis/, `${label} must document /hw:analysis`);
    assert.match(content, /\/hw-analysis/, `${label} must document /hw-analysis`);
    assert.match(content, /skills\/analysis\/SKILL\.md/, `${label} must point to the analysis skill`);
  }
});

test("analysis skill defines interactive investigation semantics distinct from chat", async () => {
  assert.ok(existsSync(ANALYSIS_SKILL), `${ANALYSIS_SKILL} must exist`);
  const analysisSkill = await readFile(ANALYSIS_SKILL, "utf8");
  const chatSkill = await readFile("skills/chat/SKILL.md", "utf8");

  assert.match(analysisSkill, /^name:\s*analysis$/m);
  assert.match(analysisSkill, /\/hypo-workflow:analysis|\/hw:analysis/);
  for (const mode of ["enter", "continue", "end", "report"]) {
    assert.match(analysisSkill, new RegExp(`\\b${mode}\\b`, "i"), `missing ${mode} semantics`);
  }
  for (const evidenceField of [
    "hypothesis",
    "experiment",
    "observation",
    "confidence",
    "follow[- ]?up|followup",
  ]) {
    assert.match(analysisSkill, new RegExp(evidenceField, "i"), `missing ${evidenceField} evidence semantics`);
  }
  assert.match(analysisSkill, /prompt_state\.analysis_summary/);
  assert.match(analysisSkill, /\.pipeline\/analysis\/.*ledger\.yaml|\.pipeline\/analysis\/.*analysis-ledger\.yaml/);

  assert.match(chatSkill, /lightweight append conversation mode/i);
  assert.doesNotMatch(analysisSkill, /lightweight append conversation mode/i);
  assert.doesNotMatch(analysisSkill, /不打开新的 Milestone/i);
});

test("status and report surfaces summarize analysis from compact state and ledger pointer", async () => {
  const analysisSource = await readFile("core/src/analysis/index.js", "utf8");
  const analysisSpec = await readFile("references/analysis-spec.md", "utf8");
  const ledgerSpec = await readFile("references/analysis-ledger-spec.md", "utf8");
  const statusSkill = await readFile("skills/status/SKILL.md", "utf8");
  const reportSkill = await readFile("skills/report/SKILL.md", "utf8");

  assert.match(analysisSpec, /prompt_state\.analysis_summary/);
  assert.match(analysisSpec, /ledger_path/);
  assert.match(analysisSpec, /\.pipeline\/analysis\//);
  assert.match(ledgerSpec, /prompt_state\.analysis_summary/);
  assert.match(ledgerSpec, /ledger_path/);
  assert.match(ledgerSpec, /state\.yaml`? must not store full hypotheses/i);
  assert.match(ledgerSpec, /state\.yaml`? must not store full experiments/i);
  assert.match(ledgerSpec, /\.pipeline\/analysis\//);

  assert.match(analysisSource, /buildAnalysisStateSummary/);
  assert.match(analysisSource, /analysisLedgerPath/);
  assert.match(analysisSource, /ledger_path/);
  assert.doesNotMatch(analysisSource, /prompt_state:\s*\{[\s\S]{0,400}hypotheses/);

  for (const [label, content] of Object.entries({ statusSkill, reportSkill })) {
    assert.match(content, /prompt_state\.analysis_summary|analysis_summary/, `${label} must read compact analysis summary`);
    assert.match(content, /ledger_path|analysis ledger/i, `${label} must surface the analysis ledger pointer`);
  }
});

test("debug guidance can promote sustained root-cause work into analysis state", async () => {
  const debugSkill = await readFile("skills/debug/SKILL.md", "utf8");
  const debugSpec = await readFile("references/debug-spec.md", "utf8");

  for (const [label, content] of Object.entries({ debugSkill, debugSpec })) {
    assert.match(content, /\/hw:analysis|analysis state|analysis lane|analysis preset/i, `${label} must route long investigations to Analysis`);
    assert.match(content, /hypothes/i, `${label} must retain hypothesis language`);
    assert.match(content, /experiment|observation|confidence/i, `${label} must mention Analysis-grade evidence`);
  }
});

test("OpenCode generated command and metadata include /hw-analysis", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-analysis-command-entry-"));
  await writeOpenCodeArtifacts(root, {
    config: {
      execution: {
        analysis: {
          interaction_mode: "hybrid",
        },
      },
    },
  });

  const commandFile = await readFile(join(root, ".opencode", "commands", "hw-analysis.md"), "utf8");
  const rootConfig = JSON.parse(await readFile(join(root, "opencode.json"), "utf8"));
  const metadata = JSON.parse(await readFile(join(root, ".opencode", "hypo-workflow.json"), "utf8"));

  assert.match(commandFile, /# \/hw-analysis/);
  assert.match(commandFile, /Canonical command: `\/hw:analysis`/);
  assert.match(commandFile, /Skill: `skills\/analysis\/SKILL\.md`/);
  assert.ok(rootConfig.command["hw-analysis"], "root opencode.json must expose hw-analysis command metadata");
  assert.ok(metadata.commandMap.some((item) => item.canonical === "/hw:analysis" && item.opencode === "/hw-analysis"));
  assert.equal(metadata.analysis.interaction_mode, "hybrid");
});
