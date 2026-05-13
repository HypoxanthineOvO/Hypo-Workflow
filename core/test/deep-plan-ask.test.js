import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as api from "../src/index.js";

test("deep plan ask APIs are exported through the public index", () => {
  assert.equal(typeof api.generateDeepPlanAskQuestions, "function");
  assert.equal(typeof api.recordDeepPlanAskRound, "function");
  assert.equal(typeof api.assessDeepPlanShallowPlanGate, "function");
});

test("generateDeepPlanAskQuestions challenges unclear requirements from first principles", async () => {
  const root = await fixtureRoot();
  const generateDeepPlanAskQuestions = requiredApi("generateDeepPlanAskQuestions");
  const created = await api.createDeepPlanPackage(root, {
    title: "Agent memory rewrite",
    summary: "Rewrite memory because the current workflow feels confusing and slow.",
    conversation_summary: [
      "The user wants a big memory rewrite.",
      "No concrete failure, minimum loop, or decision evidence has been established yet.",
    ].join(" "),
    readiness_depth: "directional",
    now: "2026-05-12T10:10:00+08:00",
  });
  const packageData = await api.readDeepPlanPackage(root, created.id);

  const result = await generateDeepPlanAskQuestions(packageData, {
    target_readiness_depth: "architecture-ready",
    max_questions: 6,
    locale: "zh-CN",
  });

  assert.equal(result.ref, "DP001");
  assert.ok(Array.isArray(result.questions), "questions should be an ordered ask queue");
  assert.ok(result.questions.length >= 4, "unclear requirements need multiple first-principles challenges");
  assert.deepEqual(result.questions.slice(0, 4).map((question) => question.challenge), [
    "necessity",
    "minimum_viable_loop",
    "falsifying_evidence",
    "essential_vs_habitual",
  ]);

  const questionText = result.questions.map((question) => question.question).join("\n");
  assert.match(questionText, /为什么|必要|necessary|need/i);
  assert.match(questionText, /最小|minimum|smallest|loop/i);
  assert.match(questionText, /证伪|反证|falsif|disconfirm|evidence/i);
  assert.match(questionText, /本质|习惯|essential|habitual/i);

  const defaultQuestion = result.questions.find((question) => question.default === true) || result.questions[0];
  assert.ok(defaultQuestion, "one question should be selected as the default next ask");
  assert.doesNotMatch(defaultQuestion.question, /who is the user|用户是谁/i);
});

test("generateDeepPlanAskQuestions uses persisted next recommendation after an answered necessity round", async () => {
  const generateDeepPlanAskQuestions = requiredApi("generateDeepPlanAskQuestions");
  const result = await generateDeepPlanAskQuestions({
    deep_plan: {
      id: "DP101",
      title: "Iterative ask package",
      status: "drafting",
      readiness_depth: "directional",
      conversation_summary: "The first necessity answer is recorded; the package needs the next ask round.",
    },
    decisions: [],
    tracks: [],
    architecture: { open_questions: [] },
    ask_rounds: [
      {
        question: {
          id: "Q001",
          challenge: "necessity",
          question: "为什么必须做这件事？",
        },
        answer: "It prevents premature conversion when requirements are shallow.",
      },
    ],
    next_recommended_question: {
      challenge: "minimum_viable_loop",
      question: "能验证方向成立的最小可行 loop 是什么？",
    },
  }, {
    target_readiness_depth: "architecture-ready",
    max_questions: 4,
    locale: "zh-CN",
  });

  const defaultQuestion = result.questions.find((question) => question.default === true) || result.questions[0];
  assert.equal(defaultQuestion.challenge, "minimum_viable_loop");
  assert.equal(result.questions[0].challenge, "minimum_viable_loop");
  assert.notEqual(defaultQuestion.challenge, "necessity");
});

test("generateDeepPlanAskQuestions does not keep an answered challenge as the default", async () => {
  const generateDeepPlanAskQuestions = requiredApi("generateDeepPlanAskQuestions");
  const result = await generateDeepPlanAskQuestions({
    deep_plan: {
      id: "DP102",
      title: "Answered next recommendation",
      status: "drafting",
      readiness_depth: "directional",
      conversation_summary: "Necessity and minimum loop were answered; falsifying evidence remains unresolved.",
    },
    decisions: [],
    tracks: [],
    architecture: { open_questions: [] },
    ask_rounds: [
      {
        question: { id: "Q001", challenge: "necessity", question: "Why is this necessary?" },
        answer: "It prevents shallow planning.",
      },
      {
        question: { id: "Q002", challenge: "minimum_viable_loop", question: "What is the smallest viable loop?" },
        answer: "Read package, append one ask, and reassess readiness.",
      },
    ],
    next_recommended_question: {
      challenge: "minimum_viable_loop",
      question: "What is the smallest viable loop?",
    },
  }, {
    target_readiness_depth: "architecture-ready",
    max_questions: 4,
    locale: "en",
  });

  const defaultQuestion = result.questions.find((question) => question.default === true) || result.questions[0];
  assert.equal(defaultQuestion.challenge, "falsifying_evidence");
  assert.equal(result.questions[0].challenge, "falsifying_evidence");
  assert.ok(
    result.questions.findIndex((question) => question.challenge === "falsifying_evidence")
      < result.questions.findIndex((question) => question.challenge === "necessity"),
    "unanswered challenges should be asked before answered challenges",
  );
});

test("who-is-the-user may be contextual but must not be the default first ask", async () => {
  const generateDeepPlanAskQuestions = requiredApi("generateDeepPlanAskQuestions");
  const result = await generateDeepPlanAskQuestions({
    deep_plan: {
      id: "DP099",
      title: "Role-aware workflow",
      status: "drafting",
      readiness_depth: "directional",
      conversation_summary: "The target operator is unclear, but the proposed solution is also unproven.",
    },
    decisions: [],
    tracks: [],
    architecture: { open_questions: ["用户是谁？"] },
  }, {
    include_context_questions: true,
    max_questions: 5,
    locale: "zh-CN",
  });

  const defaultQuestion = result.questions.find((question) => question.default === true) || result.questions[0];
  assert.doesNotMatch(defaultQuestion.question, /who is the user|用户是谁/i);
  assert.ok(
    result.questions.some((question) => /who is the user|用户是谁/i.test(question.question)),
    "contextual user question can still appear outside the default slot",
  );
});

test("recordDeepPlanAskRound appends one ask round and writes extracted state back to the package", async () => {
  const root = await fixtureRoot();
  const recordDeepPlanAskRound = requiredApi("recordDeepPlanAskRound");
  const created = await api.createDeepPlanPackage(root, {
    title: "Deep Plan ask loop",
    summary: "A package that needs iterative pressure testing.",
    readiness_depth: "directional",
    now: "2026-05-12T10:20:00+08:00",
  });

  const first = await recordDeepPlanAskRound(root, created.id, {
    asked_at: "2026-05-12T10:21:00+08:00",
    question: {
      id: "Q001",
      challenge: "necessity",
      question: "如果不重写 memory，哪个真实工作流会失败？",
    },
    answer: "现有失败是跨 Cycle 恢复时丢失 drilldown decisions；不是所有 memory 都要重写。",
    extracted_decisions: [
      {
        id: "D001",
        status: "accepted",
        statement: "Deep Plan memory work must first preserve drilldown decisions across Cycle resumes.",
      },
    ],
    open_questions: ["最小可验证恢复 loop 是什么？"],
    unresolved_ambiguity: ["是否需要改动全局 Knowledge Ledger 仍未确定。"],
    next_recommended_question: {
      challenge: "minimum_viable_loop",
      question: "能证明恢复决策保真的最小 loop 是什么？",
    },
  });

  assert.equal(first.deep_plan.id, created.id);
  assert.equal(first.ask_rounds.length, 1);
  assert.equal(first.ask_rounds[0].question.challenge, "necessity");
  assert.match(first.ask_rounds[0].answer, /drilldown decisions/);
  assert.equal(first.decisions[0].id, "D001");
  assert.deepEqual(first.architecture.open_questions, ["最小可验证恢复 loop 是什么？"]);
  assert.match(first.readiness_gaps.join("\n"), /Knowledge Ledger|最小可验证/);

  const second = await recordDeepPlanAskRound(root, created.id, {
    asked_at: "2026-05-12T10:22:00+08:00",
    question: {
      id: "Q002",
      challenge: "minimum_viable_loop",
      question: "能证明恢复决策保真的最小 loop 是什么？",
    },
    answer: "只需要 package read -> ask round append -> package read 三步验证，不进入 ordinary plan。",
    extracted_decisions: [
      {
        id: "D002",
        status: "accepted",
        statement: "The first MVP loop is read package, append ask round, and verify the package preserves the decision.",
      },
    ],
    open_questions: ["什么证据会说明 ask loop 仍不足以进入 convert？"],
    unresolved_ambiguity: ["浅层计划拒绝阈值尚未明确。"],
    next_recommended_question: {
      challenge: "falsifying_evidence",
      question: "什么失败证据会推翻进入 milestone decomposition 的判断？",
    },
  });

  assert.equal(second.ask_rounds.length, 2, "ask should be iterative, not a one-shot full plan");
  assert.deepEqual(second.ask_rounds.map((round) => round.question.challenge), [
    "necessity",
    "minimum_viable_loop",
  ]);
  assert.equal(second.next_recommended_question.challenge, "falsifying_evidence");

  const persisted = await api.readDeepPlanPackage(root, created.id);
  assert.equal(persisted.ask_rounds.length, 2);
  assert.deepEqual(persisted.decisions.map((decision) => decision.id), ["D001", "D002"]);
  assert.match(await readFile(join(root, created.path, "deep-plan.yaml"), "utf8"), /ask_rounds:/);
});

test("assessDeepPlanShallowPlanGate rejects pseudo-deep packages before milestone conversion", async () => {
  const assessDeepPlanShallowPlanGate = requiredApi("assessDeepPlanShallowPlanGate");
  const packageData = {
    deep_plan: {
      id: "DP123",
      title: "Pseudo deep plan",
      status: "drafting",
      readiness_depth: "directional",
      conversation_summary: "We should build the full system with better UX, automation, and dashboards.",
    },
    decisions: [
      {
        id: "D001",
        status: "proposed",
        statement: "Build the whole thing.",
      },
    ],
    tracks: [
      {
        id: "T001",
        kind: "topic",
        title: "Implementation plan",
        status: "active",
        questions: [],
      },
    ],
    architecture: {
      components: [],
      edges: [],
      open_questions: [],
    },
    ask_rounds: [
      {
        question: { challenge: "necessity", question: "Why is this needed?" },
        answer: "It would be useful.",
      },
    ],
  };

  const result = await assessDeepPlanShallowPlanGate(packageData, {
    target_readiness_depth: "architecture-ready",
    operation: "convert",
  });

  assert.equal(result.allowed, false);
  assert.equal(result.operation, "convert");
  assert.equal(result.target_readiness_depth, "architecture-ready");
  assert.match(result.reason, /shallow|pseudo|readiness|insufficient|浅层|深度不足/i);
  assert.ok(result.missing_challenges.includes("minimum_viable_loop"));
  assert.ok(result.missing_challenges.includes("falsifying_evidence"));
  assert.ok(result.missing_challenges.includes("essential_vs_habitual"));
  assert.match(result.gaps.join("\n"), /minimum|最小|falsif|证伪|architecture|架构|decision|决策/i);
});

test("assessDeepPlanShallowPlanGate allows decomposition only after target readiness depth is met", async () => {
  const assessDeepPlanShallowPlanGate = requiredApi("assessDeepPlanShallowPlanGate");
  const result = await assessDeepPlanShallowPlanGate({
    deep_plan: {
      id: "DP124",
      title: "Validated deep plan",
      status: "ready_for_plan",
      readiness_depth: "architecture-ready",
      conversation_summary: "Necessity, MVP loop, falsifying evidence, and essential constraints were answered.",
    },
    decisions: [
      {
        id: "D001",
        status: "accepted",
        statement: "The minimum loop is package read, one ask round, and readiness gate verification.",
      },
      {
        id: "D002",
        status: "accepted",
        statement: "Convert is blocked if ask rounds do not preserve unresolved ambiguity.",
      },
    ],
    tracks: [
      {
        id: "T001",
        kind: "module",
        title: "Ask engine",
        status: "ready",
        questions: [],
      },
    ],
    architecture: {
      components: [{ id: "ask-engine", title: "Ask Engine" }],
      edges: [],
      open_questions: [],
    },
    ask_rounds: [
      { question: { challenge: "necessity", question: "Why is this necessary?" }, answer: "It prevents premature plans." },
      { question: { challenge: "minimum_viable_loop", question: "What is the smallest loop?" }, answer: "Generate one ask, record it, reassess gate." },
      { question: { challenge: "falsifying_evidence", question: "What would disprove readiness?" }, answer: "Missing unresolved ambiguity blocks convert." },
      { question: { challenge: "essential_vs_habitual", question: "What is essential?" }, answer: "Durable decisions are essential; dashboard polish is habitual." },
    ],
  }, {
    target_readiness_depth: "architecture-ready",
    operation: "decompose",
  });

  assert.equal(result.allowed, true);
  assert.equal(result.operation, "decompose");
  assert.deepEqual(result.missing_challenges, []);
  assert.deepEqual(result.gaps, []);
});

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "hw-deep-plan-ask-"));
  await api.writeConfig(join(root, ".pipeline", "config.yaml"), {
    pipeline: { name: "Deep Plan Ask Fixture" },
    output: { language: "zh-CN", timezone: "Asia/Shanghai" },
  });
  await writeFile(join(root, ".pipeline", "state.yaml"), "sentinel: state\n", "utf8");
  await writeFile(join(root, ".pipeline", "cycle.yaml"), "sentinel: cycle\n", "utf8");
  await writeFile(join(root, ".pipeline", "rules.yaml"), "sentinel: rules\n", "utf8");
  return root;
}

function requiredApi(name) {
  assert.equal(typeof api[name], "function", `${name} should be exported from ../src/index.js`);
  return api[name];
}
