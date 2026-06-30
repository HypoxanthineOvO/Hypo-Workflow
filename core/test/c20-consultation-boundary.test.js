import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as agentGuidance from "../src/artifacts/agent-guidance.js";
import {
  writeClaudeCodeAgentArtifacts,
  writeClaudeCodePluginArtifacts,
  writeOpenCodeArtifacts,
} from "../src/index.js";

const CONTRACT_PATH = "references/consultation-first-action-boundary.md";
const CONSULTATION_GUIDANCE_EXPORT = "CONSULTATION_FIRST_ACTION_BOUNDARY_GUIDANCE";

const NON_EDITING_SIGNALS = [
  {
    label: "discussion",
    anchors: [
      /(?:^|[^-\w])discussion\b/iu,
      /(?:普通|一般)?讨论(?:输入|类|请求|场景|信号|语境)|讨论[、/](?:背景|想法|抱怨|提问)|(?:背景|想法|抱怨|提问)[、/]讨论/u,
    ],
  },
  {
    label: "background",
    anchors: [/\bbackground\b/iu, /背景(?:输入|类|信息|材料|上下文|说明)?/u],
  },
  {
    label: "idea",
    anchors: [/\bidea\b/iu, /想法|构思|点子/u],
  },
  {
    label: "complaint",
    anchors: [/\bcomplaint\b/iu, /抱怨|吐槽|不满|投诉/u],
  },
  {
    label: "question",
    anchors: [/\bquestion\b/iu, /提问|疑问|询问|问题(?:输入|类|请求|场景|信号)/u],
  },
  {
    label: "solution-discussion",
    anchors: [/\bsolution[- ]discussion\b/iu, /方案讨论|讨论方案/u],
  },
];

const NO_FILE_EDIT_BOUNDARY =
  /non[- ]editing|no file edits?|must not edit files?|must not make file edits?|do not edit files?|不得?编辑文件|不要编辑文件|不编辑文件|不应编辑文件|禁止编辑文件|不改文件|不动文件|不写文件|不得写入/iu;

test("contract treats discussion/background/idea/complaint/question/solution-discussion as non-editing signals", async () => {
  const contract = await readContract();

  for (const signal of NON_EDITING_SIGNALS) {
    const context = contextAroundAny(
      contract,
      signal.anchors,
      900,
      `missing non-editing input signal: ${signal.label}`,
    );
    assert.match(
      context,
      /Mini[- ]contract|我的理解|问题原因|推荐方案/iu,
      `missing Mini-contract response anchor near signal: ${signal.label}`,
    );
    assert.match(
      context,
      NO_FILE_EDIT_BOUNDARY,
      `missing non-editing/no-file-edits boundary near signal: ${signal.label}`,
    );
  }
});

test("contract defines Mini-contract shape in the required order", async () => {
  const contract = await readContract();

  assertTermsInOrder(contract, ["我的理解", "问题原因", "推荐方案"], "Mini-contract structure");
});

test("contract preserves direct execution for clear imperative requests with concrete targets", async () => {
  const contract = await readContract();
  const context = contextAroundAny(
    contract,
    [/clear imperative/iu, /明确祈使/u, /祈使(?:请求|输入|语气|句)?/u],
    1000,
    "missing clear-imperative execution anchor",
  );

  assert.match(context, /concrete target|具体目标|明确目标|目标明确/iu, "missing concrete target requirement");
  assert.match(
    context,
    /direct(?:ly)? execute|direct execution|直接执行|可直接执行|允许执行/iu,
    "missing direct execution pass-through for clear imperative requests",
  );
});

test("contract treats post-plan affirmative replies as execution authorization", async () => {
  const contract = await readContract();
  const context = contextAroundAny(
    contract,
    [/post[- ]plan/iu, /方案后/u, /计划后/u, /affirmative repl(?:y|ies)/iu, /确认回复/u],
    1000,
    "missing post-plan affirmative authorization anchor",
  );

  for (const reply of ["可以", "确认", "OK", "go ahead", "apply it"]) {
    assert.match(context, new RegExp(escapeRegExp(reply), "iu"), `missing affirmative reply: ${reply}`);
  }
  assert.match(
    context,
    /authori[sz]e execution|execution authorization|执行授权|授权执行|可以执行/iu,
    "missing execution authorization semantics for post-plan affirmative replies",
  );
});

test("contract requires one-sentence explanation on first use of a new concept", async () => {
  const contract = await readContract();
  const context = contextAroundAny(
    contract,
    [/first[- ]use/iu, /首次(?:使用|出现|引入)/u, /第一次(?:使用|出现|引入)/u],
    900,
    "missing first-use concept explanation anchor",
  );

  assert.match(context, /new concept|新概念/iu, "missing new concept requirement");
  assert.match(context, /one[- ]sentence|一句话|单句/iu, "missing one-sentence explanation requirement");
  assert.match(context, /explain|解释|说明/iu, "missing explanation requirement for first-use concepts");
});

test("contract separates direct sync scope from target-owned scope and names target boundaries", async () => {
  const contract = await readContract();
  const directSyncIndex = firstIndexOf(contract, [/direct sync scope/iu, /直接同步范围/u, /direct sync/iu]);
  const targetOwnedIndex = firstIndexOf(contract, [/target-owned scope/iu, /目标仓自有范围/u, /目标侧自有范围/u]);

  assert.notEqual(directSyncIndex, -1, "missing direct sync scope anchor");
  assert.notEqual(targetOwnedIndex, -1, "missing target-owned scope anchor");
  assert.notEqual(
    directSyncIndex,
    targetOwnedIndex,
    "direct sync scope and target-owned scope must be separately identified",
  );

  const targetBoundary = contextAroundAny(
    contract,
    [/Codex-VSP/u, /VSP-Open-Code/u],
    1200,
    "missing Codex-VSP/VSP-Open-Code target boundary anchor",
  );
  assert.match(targetBoundary, /Codex-VSP/u, "missing Codex-VSP target boundary");
  assert.match(targetBoundary, /VSP-Open-Code/u, "missing VSP-Open-Code target boundary");
  assert.match(
    targetBoundary,
    /target-owned scope|目标仓自有范围|目标侧自有范围|boundary|边界|不写入|不得写入|不编辑|local adaptation/iu,
    "missing target-owned boundary semantics for Codex-VSP/VSP-Open-Code",
  );
});

test("agent guidance exports consultation-first shared guidance", () => {
  assertConsultationFirstGuidance(
    agentGuidance[CONSULTATION_GUIDANCE_EXPORT],
    `agent-guidance.js ${CONSULTATION_GUIDANCE_EXPORT}`,
  );
});

test("OpenCode command, agent, and root instruction surfaces project consultation-first guidance", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-c20-opencode-consultation-"));
  await writeOpenCodeArtifacts(dir, { profile: "standard" });

  const surfaces = [
    ["OpenCode /hw:plan command", await readFile(join(dir, ".opencode", "commands", "hw:plan.md"), "utf8")],
    ["OpenCode hw-plan agent", await readFile(join(dir, ".opencode", "agents", "hw-plan.md"), "utf8")],
    ["OpenCode root AGENTS.md", await readFile(join(dir, "AGENTS.md"), "utf8")],
  ];

  for (const [name, surface] of surfaces) {
    assertConsultationFirstGuidance(surface, name);
  }
});

test("Claude command and agent surfaces project consultation-first guidance", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-c20-claude-consultation-"));
  await writeClaudeCodePluginArtifacts(dir);
  await writeClaudeCodeAgentArtifacts(dir);

  const surfaces = [
    ["Claude /hw:plan command", await readFile(join(dir, "commands", "plan.md"), "utf8")],
    ["Claude hw-test agent", await readFile(join(dir, ".claude", "agents", "hw-test.md"), "utf8")],
  ];

  for (const [name, surface] of surfaces) {
    assertConsultationFirstGuidance(surface, name);
  }
});

async function readContract() {
  try {
    return await readFile(CONTRACT_PATH, "utf8");
  } catch (error) {
    assert.fail(`missing consultation-first action boundary contract at ${CONTRACT_PATH}: ${error.message}`);
  }
}

function assertConsultationFirstGuidance(surface, name) {
  assert.equal(typeof surface, "string", `${name}: missing consultation-first shared guidance string`);
  assert.match(surface, /consultation[- ]first|协商优先/iu, `${name}: missing consultation-first heading or label`);
  assertMiniContractGuidance(surface, name);
  assertNonEditingSignalGuidance(surface, name);
  assertDirectExecutionGuidance(surface, name);
  assertPostPlanAuthorizationGuidance(surface, name);
  assertFirstUseConceptGuidance(surface, name);
  assertDistributionBoundaryGuidance(surface, name);
}

function assertMiniContractGuidance(surface, name) {
  assert.match(surface, /Mini[- ]contract/iu, `${name}: missing Mini-contract concept`);
  assertTermsInOrder(surface, ["我的理解", "问题原因", "推荐方案"], `${name} Mini-contract structure`);
}

function assertNonEditingSignalGuidance(surface, name) {
  for (const signal of NON_EDITING_SIGNALS) {
    const context = contextAroundAny(
      surface,
      signal.anchors,
      900,
      `${name}: missing non-editing input signal: ${signal.label}`,
    );
    assert.match(
      context,
      /Mini[- ]contract|我的理解|问题原因|推荐方案/iu,
      `${name}: missing Mini-contract response anchor near signal: ${signal.label}`,
    );
    assert.match(
      context,
      NO_FILE_EDIT_BOUNDARY,
      `${name}: missing non-editing/no-file-edits boundary near signal: ${signal.label}`,
    );
  }
}

function assertDirectExecutionGuidance(surface, name) {
  const context = contextAroundAny(
    surface,
    [/clear imperative/iu, /明确祈使/u, /祈使(?:请求|输入|语气|句)?/u],
    1000,
    `${name}: missing clear-imperative execution anchor`,
  );

  assert.match(context, /concrete target|具体目标|明确目标|目标明确/iu, `${name}: missing concrete target requirement`);
  assert.match(
    context,
    /direct(?:ly)? execute|direct execution|execute directly|直接执行|可直接执行|允许执行/iu,
    `${name}: missing direct execution carve-out for clear imperative requests`,
  );
}

function assertPostPlanAuthorizationGuidance(surface, name) {
  const context = contextAroundAny(
    surface,
    [/post[- ]plan/iu, /方案后/u, /计划后/u, /affirmative repl(?:y|ies)/iu, /确认回复/u],
    1000,
    `${name}: missing post-plan affirmative authorization anchor`,
  );

  for (const reply of ["可以", "确认", "OK", "go ahead", "apply it"]) {
    assert.match(context, new RegExp(escapeRegExp(reply), "iu"), `${name}: missing affirmative reply: ${reply}`);
  }
  assert.match(
    context,
    /authori[sz]e execution|execution authorization|执行授权|授权执行|可以执行/iu,
    `${name}: missing execution authorization semantics for post-plan affirmative replies`,
  );
}

function assertFirstUseConceptGuidance(surface, name) {
  const context = contextAroundAny(
    surface,
    [/first[- ]use/iu, /首次(?:使用|出现|引入)/u, /第一次(?:使用|出现|引入)/u],
    900,
    `${name}: missing first-use concept explanation anchor`,
  );

  assert.match(context, /new concept|新概念/iu, `${name}: missing new concept requirement`);
  assert.match(context, /one[- ]sentence|一句话|单句/iu, `${name}: missing one-sentence explanation requirement`);
  assert.match(context, /explain|解释|说明/iu, `${name}: missing explanation requirement for first-use concepts`);
}

function assertDistributionBoundaryGuidance(surface, name) {
  const directSyncIndex = firstIndexOf(surface, [/direct sync scope/iu, /直接同步范围/u, /source-owned managed surfaces/iu]);
  const targetOwnedIndex = firstIndexOf(surface, [/target-owned scope/iu, /目标仓自有范围/u, /目标侧自有范围/u]);

  assert.notEqual(directSyncIndex, -1, `${name}: missing direct sync scope guidance`);
  assert.notEqual(targetOwnedIndex, -1, `${name}: missing target-owned scope guidance`);
  assert.notEqual(directSyncIndex, targetOwnedIndex, `${name}: direct sync and target-owned scopes must stay distinct`);

  const targetBoundary = contextAroundAny(
    surface,
    [/Codex-VSP/u, /VSP-Open-Code/u],
    1400,
    `${name}: missing Codex-VSP/VSP-Open-Code target boundary anchor`,
  );
  assert.match(targetBoundary, /Codex-VSP/u, `${name}: missing Codex-VSP target boundary`);
  assert.match(targetBoundary, /VSP-Open-Code/u, `${name}: missing VSP-Open-Code target boundary`);
  assert.match(
    targetBoundary,
    /per-model prompts|local reminders|runtime prompt|prompt|提示|提醒/iu,
    `${name}: missing target-owned prompt surface examples`,
  );
  assert.match(
    targetBoundary,
    /target-owned scope|目标仓自有范围|目标侧自有范围|local Cycle|本地 Cycle|不由 source-side direct sync|不得?直接写入|不直接写入|不编辑/iu,
    `${name}: missing target-owned no-direct-source-implementation boundary`,
  );
}

function assertTermsInOrder(value, terms, label) {
  let cursor = -1;
  for (const term of terms) {
    const index = value.indexOf(term, cursor + 1);
    assert.notEqual(index, -1, `missing ${label} term: ${term}`);
    assert.ok(index > cursor, `${label} term is out of order: ${term}`);
    cursor = index;
  }
}

function contextAroundAny(value, patterns, radius, missingMessage) {
  const index = firstIndexOf(value, patterns);
  assert.notEqual(index, -1, missingMessage);
  return value.slice(Math.max(0, index - radius), Math.min(value.length, index + radius));
}

function firstIndexOf(value, patterns) {
  const indexes = patterns
    .map((pattern) => {
      const match = pattern.exec(value);
      pattern.lastIndex = 0;
      return match?.index ?? -1;
    })
    .filter((index) => index !== -1);

  return indexes.length > 0 ? Math.min(...indexes) : -1;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
