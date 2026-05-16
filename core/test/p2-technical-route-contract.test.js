import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseYaml } from "../src/index.js";

const ROUTE_FIELDS = [
  "technical_solution",
  "technical_route",
  "research_required",
  "risks_and_alternatives",
  "validation_path",
  "audit_focus",
];

const ROUTE_DOCS = [
  "skills/plan/SKILL.md",
  "skills/plan-decompose/SKILL.md",
  "skills/plan-generate/SKILL.md",
  "plan/PLAN-SKILL.md",
  "references/commands-spec.md",
];

const ROUTE_FIXTURE_DIR = "core/test/fixtures/p2-technical-route";

test("P2 contract fixture defines a complete technical-route contract for every milestone", async () => {
  const decomposeRaw = await readFile(`${ROUTE_FIXTURE_DIR}/decompose.yaml`, "utf8");
  const decompose = parseYaml(decomposeRaw);
  const routeReview = await readFile(`${ROUTE_FIXTURE_DIR}/technical-route.md`, "utf8");

  assert.deepEqual(decompose.technical_route_contract.required_for_each_milestone, ROUTE_FIELDS);

  for (const milestone of extractMilestoneSections(decomposeRaw)) {
    for (const field of ROUTE_FIELDS) {
      expectMatch(milestone.body, new RegExp(`^    ${escapeRegExp(field)}:`, "m"), `${milestone.id} must include ${field}`);
    }
  }

  for (const field of ROUTE_FIELDS) {
    expectMatch(routeReview, new RegExp(escapeRegExp(field)), `technical-route fixture must include ${field}`);
  }
});

test("P2 docs require technical solution, route, and research status before proposed/P3", async () => {
  const docs = await readDocs(ROUTE_DOCS);

  for (const file of [
    "skills/plan/SKILL.md",
    "skills/plan-decompose/SKILL.md",
    "plan/PLAN-SKILL.md",
    "references/commands-spec.md",
  ]) {
    const text = docs[file];
    for (const field of ROUTE_FIELDS) {
      expectMatch(text, new RegExp(escapeRegExp(field)), `${file} must name ${field}`);
    }
  }

  const p2Contract = [
    docs["skills/plan-decompose/SKILL.md"],
    docs["plan/PLAN-SKILL.md"],
    docs["references/commands-spec.md"],
  ].join("\n");

  expectMatch(p2Contract, /P2[\s\S]*(proposed|P3)[\s\S]*(technical_solution|technical solution)/i, "P2 must require technical_solution before proposed/P3");
  expectMatch(p2Contract, /P2[\s\S]*(proposed|P3)[\s\S]*(technical_route|technical route)/i, "P2 must require technical_route before proposed/P3");
  expectMatch(p2Contract, /P2[\s\S]*(proposed|P3)[\s\S]*(research_required|research required)/i, "P2 must require research_required before proposed/P3");
  expectMatch(p2Contract, /goal-only|only goals|目标.*(验收|范围)|milestone-only/i, "P2 docs must reject goal-only checkpoints");
  expectMatch(p2Contract, /(in_progress|revision)[\s\S]*goal-only|goal-only[\s\S]*(in_progress|revision)/i, "goal-only checkpoints must stay in revision/in_progress");
});

test("research-required signals are a hard P2 gate until asked, resolved, or explicitly deferred", async () => {
  const docs = await readDocs([
    "skills/plan/SKILL.md",
    "skills/plan-decompose/SKILL.md",
    "plan/PLAN-SKILL.md",
    "references/commands-spec.md",
  ]);
  const contract = Object.values(docs).join("\n");
  const decompose = parseYaml(await readFile(`${ROUTE_FIXTURE_DIR}/decompose.yaml`, "utf8"));

  assert.equal(decompose.technical_route_contract.hard_research_gate.enabled, true);
  assert.deepEqual(decompose.technical_route_contract.hard_research_gate.triggers, [
    "unknown_tool",
    "external_service",
    "third_party_library",
    "platform_capability",
    "user_private_schema",
  ]);

  const triggerTerms = {
    unknown_tool: /unknown[_ -]tool|未知工具/i,
    external_service: /external[_ -]service|外部服务/i,
    third_party_library: /third[_ -]party[_ -]library|第三方库/i,
    platform_capability: /platform[_ -]capability|平台能力/i,
    user_private_schema: /user[_ -]private[_ -]schema|用户私有 schema|用户私有.*数据契约/i,
  };

  for (const trigger of decompose.technical_route_contract.hard_research_gate.triggers) {
    expectMatch(contract, triggerTerms[trigger], `docs must define hard-gate trigger ${trigger}`);
  }

  expectMatch(contract, /research_required[\s\S]*(hard gate|硬门控|blocking|阻塞)/i, "research_required must be documented as a hard/blocking gate");
  expectMatch(contract, /(ask|question|询问|提问)[\s\S]*(user|用户)/i, "research gate must require asking the user when unresolved");
  expectMatch(contract, /(explicitly deferred|explicit deferral|deferred by the user|用户.*(延后|延期)|明确.*延后)/i, "research gate must allow only explicit user deferral");
  expectMatch(contract, /(must not|不得|cannot|不能)[\s\S]*(proposed|P3)[\s\S]*research_required/i, "unresolved research_required must block proposed/P3");
});

test("user challenge to the technical route sends P2 back to revision or in_progress", async () => {
  const docs = await readDocs([
    "skills/plan/SKILL.md",
    "skills/plan-decompose/SKILL.md",
    "plan/PLAN-SKILL.md",
    "references/commands-spec.md",
  ]);
  const contract = Object.values(docs).join("\n");
  const decompose = parseYaml(await readFile(`${ROUTE_FIXTURE_DIR}/decompose.yaml`, "utf8"));

  expectMatch(
    decompose.technical_route_contract.challenge_behavior.on_user_route_challenge,
    /revision\/in_progress/,
    "artifact must route user challenge back to revision/in_progress",
  );
  expectMatch(contract, /(user|用户)[\s\S]*(challenge|挑战|指出|质疑)[\s\S]*(technical route|technical_route|技术路线)/i, "docs must cover user challenge to technical route");
  expectMatch(contract, /(revision|in_progress)[\s\S]*(targeted research|补调研|重新.*checkpoint|revised checkpoint)/i, "challenge must trigger revision/in_progress plus targeted research");
  expectMatch(contract, /(must not|不得|cannot|不能|instead of)[\s\S]*(silently|静默)[\s\S]*(P3|Generate)/i, "challenge must not silently advance to P3");
});

test("P3 Generate preserves P2 technical route fields in generated prompts", async () => {
  const planGenerate = await readFile("skills/plan-generate/SKILL.md", "utf8");
  const planReference = await readFile("plan/PLAN-SKILL.md", "utf8");
  const commandsSpec = await readFile("references/commands-spec.md", "utf8");
  const generatedPrompt = await readFile(`${ROUTE_FIXTURE_DIR}/generated-prompt.md`, "utf8");
  const generateContract = [planGenerate, planReference, commandsSpec].join("\n");

  for (const field of ROUTE_FIELDS) {
    expectMatch(generateContract, new RegExp(escapeRegExp(field)), `P3 contract must preserve ${field}`);
    expectMatch(generatedPrompt, new RegExp(escapeRegExp(field)), `generated prompt fixture must preserve ${field}`);
  }

  expectMatch(generateContract, /preserve|carry|inherit|保留|继承/i, "P3 contract must use preserve/carry/inherit language");
  expectMatch(generateContract, /(generated prompt|prompt file|提示)[\s\S]*(technical_solution|technical solution)/i, "generated prompts must preserve technical_solution");
  expectMatch(generateContract, /(generated prompt|prompt file|提示)[\s\S]*(technical_route|technical route)/i, "generated prompts must preserve technical_route");
  expectMatch(generateContract, /(generated prompt|prompt file|提示)[\s\S]*(research_required|research required)/i, "generated prompts must preserve research_required");

  expectMatch(generatedPrompt, /Technical Solution|technical_solution|技术方案/, "generated prompts must include technical solution content");
  expectMatch(generatedPrompt, /Technical Route|technical_route|技术路线/, "generated prompts must include technical route content");
  expectMatch(generatedPrompt, /Research Required|research_required|调研/, "generated prompts must include research-required content");
});

test("ordinary single-feature planning stays simple and does not require Feature DAG", async () => {
  const planSkill = await readFile("skills/plan/SKILL.md", "utf8");
  const decomposeSkill = await readFile("skills/plan-decompose/SKILL.md", "utf8");
  const featureQueueSpec = await readFile("references/feature-queue-spec.md", "utf8");
  const contract = `${planSkill}\n${decomposeSkill}\n${featureQueueSpec}`;

  expectMatch(contract, /single-feature \/hw:plan behavior is unchanged|单 Feature.*保留|普通.*\/hw:plan.*保持简单/i, "ordinary single-feature planning must remain unchanged/simple");
  expectMatch(contract, /Feature DAG[\s\S]*(optional|only|仅属于|仅对)/i, "Feature DAG must be optional or limited to batch/long-running coordination");
  expectMatch(contract, /(ordinary|普通|single-feature|单 Feature)[\s\S]*(must not|不得|不应)[\s\S]*(require|display|暴露|显示)[\s\S]*Feature DAG/i, "ordinary single-feature planning must not require/display Feature DAG");
  expectMatch(decomposeSkill, /当不存在 `--batch` 时，保留单 Feature `\/hw:plan` 行为|single-feature \/hw:plan behavior is unchanged/i, "plan-decompose must preserve non-batch single-feature behavior");
});

function extractMilestoneSections(source) {
  const matches = [...source.matchAll(/^  - id: (C\d+-M\d+)\n/gm)];
  assert.ok(matches.length > 0, "decompose.yaml must include milestone sections");
  return matches.map((match, index) => {
    const start = match.index;
    const end = matches[index + 1]?.index ?? source.indexOf("\nresearch_gate_summary:");
    return {
      id: match[1],
      body: source.slice(start, end > start ? end : undefined),
    };
  });
}

async function readDocs(paths) {
  const entries = await Promise.all(
    paths.map(async (path) => [path, await readFile(path, "utf8")]),
  );
  return Object.fromEntries(entries);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function expectMatch(value, pattern, message) {
  assert.ok(pattern.test(value), message);
}
