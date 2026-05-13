import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as api from "../src/index.js";

test("Hypo-Agent Deep Plan replan fixture carries new ask research map drill readiness convert into ordinary Plan handoff", async () => {
  const root = await fixtureRoot();
  const created = await api.createDeepPlanPackage(root, {
    title: "Hypo-Agent replan",
    summary: "Unclear request to redesign Hypo-Agent planning from first principles.",
    conversation_summary: "The user wants Hypo-Agent replanned, but execution order and acceptance depth are unclear.",
    readiness_depth: "directional",
    now: "2026-05-13T15:00:00+08:00",
  });

  const asked = await api.recordDeepPlanAskRound(root, created.id, {
    asked_at: "2026-05-13T15:01:00+08:00",
    question: {
      id: "Q001",
      challenge: "necessity",
      question: "如果不重规划 Hypo-Agent，哪个真实工作流会失败？",
    },
    answer: "当前失败点是 unclear request 会过早进入普通 Plan，Feature Queue 顺序、验收深度和未知项没有显式化。",
    extracted_decisions: [
      {
        id: "D001",
        status: "accepted",
        statement: "Deep Plan must expose Feature Queue order, acceptance depth, risks, and unknowns before ordinary Plan.",
      },
    ],
    open_questions: ["Research / external-reference flows need a source-code evidence rule."],
    unresolved_ambiguity: ["How much implementation evidence is enough for research-code acceptance?"],
    next_recommended_question: {
      challenge: "minimum_viable_loop",
      question: "最小 closed loop 是什么？",
    },
  });
  assert.equal(asked.ask_rounds.length, 1);
  assert.match(asked.readiness_gaps.join("\n"), /source-code evidence|implementation evidence/i);

  const researched = await api.recordDeepPlanResearch(root, created.id, {
    researched_at: "2026-05-13T15:02:00+08:00",
    actor: "C12/M8 test worker",
    source_boundaries: {
      mode: "local_read_only",
      remote_network: "requires_explicit_confirmation",
    },
    searched_surfaces: [
      { kind: "local_docs", query: "rg Deep Plan skills references" },
      { kind: "local_tests", query: "rg Feature Queue core/test/deep-plan*" },
    ],
    evidence_refs: [
      { ref: "skills/plan-deep/SKILL.md", kind: "skill", lines: "52-107" },
      { ref: "references/commands-spec.md", kind: "spec", lines: "442-466" },
      { ref: "core/test/deep-plan-handoff.test.js", kind: "test_file", lines: "1-170" },
    ],
    findings: [
      {
        id: "F001",
        statement: "Convert must be an auditable boundary and ordinary /hw:plan still owns confirmation gates.",
        evidence_refs: ["skills/plan-deep/SKILL.md", "references/commands-spec.md"],
      },
    ],
    unknowns: [
      {
        id: "U001",
        question: "Research-code external source inspection still needs an explicit manual playbook.",
        evidence_refs: ["core/test/deep-plan-research.test.js"],
      },
    ],
  }, {
    now: "2026-05-13T15:02:00+08:00",
  });
  assert.equal(researched.deep_plan.status, "researching");
  assert.equal(researched.research_entries[0].findings[0].id, "F001");

  const mapped = await api.updateDeepPlanArchitectureMap(root, created.id, {
    architecture: {
      components: [
        { id: "ask-engine", title: "First-principles ask engine", source_requirement_ids: ["REQ-ask"] },
        { id: "research-code", title: "Research-code evidence gate", source_requirement_ids: ["REQ-research"] },
        { id: "handoff", title: "Ordinary Plan handoff", source_requirement_ids: ["REQ-handoff"] },
      ],
      edges: [
        { from: "ask-engine", to: "research-code", relationship: "surfaces unknowns before evidence collection" },
        { from: "research-code", to: "handoff", relationship: "feeds evidence refs into Plan context" },
      ],
      module_cards: [
        {
          id: "MOD-research-code",
          title: "Research-code evidence gate",
          decisions: [],
          risks: [{ id: "R-readme-only", statement: "README-only evidence can look complete while missing implementation behavior." }],
          open_items: ["Define bounded cache and code evidence refs."],
        },
      ],
    },
    tracks: [
      {
        id: "REQ-ask",
        title: "Ask before plan",
        type: "requirement",
        status: "ready",
        decisions: [{ id: "D001", status: "accepted", statement: "Deep Plan must expose order and depth before ordinary Plan." }],
        risks: [{ id: "R-shallow", statement: "Shallow answers can be converted too early." }],
      },
      {
        id: "REQ-research",
        title: "Research-code evidence",
        type: "requirement",
        status: "ready",
        decisions: [{ id: "D002", status: "accepted", statement: "External work requires source-code inspection after explicit remote confirmation." }],
        risks: [{ id: "R-readme-only", statement: "README-only evidence is insufficient." }],
      },
      {
        id: "REQ-handoff",
        title: "Plan handoff",
        type: "requirement",
        status: "ready",
        decisions: [{ id: "D003", status: "accepted", statement: "Convert creates Plan input, not execution authorization." }],
        risks: [{ id: "R-skip-confirm", statement: "Converted context can accidentally skip ordinary Plan confirmation." }],
      },
    ],
  }, {
    now: "2026-05-13T15:03:00+08:00",
  });
  assert.equal(mapped.deep_plan.status, "architecture_mapping");
  assert.ok(mapped.architecture.components.length >= 3);

  const drilled = await api.drillDeepPlanTopic(root, created.id, "MOD-research-code", {
    questions: ["Which source files prove the external implementation behavior?"],
    decisions: [
      {
        id: "D004",
        status: "accepted",
        statement: "Research-code acceptance must include implementation file refs, not README-only summaries.",
      },
    ],
    risks: [{ id: "R-cache", statement: "Unbounded clones can escape the discussion package boundary." }],
    open_items: ["Manual playbook must show cache path and code evidence refs."],
  }, {
    now: "2026-05-13T15:04:00+08:00",
  });
  assert.equal(drilled.deep_plan.status, "module_drilldown");
  assert.match(JSON.stringify(drilled.architecture.module_cards), /implementation file refs|cache path/);

  await api.updateDeepPlanPackage(root, created.id, {
    status: "ready_for_plan",
    readiness_depth: "implementation-ready",
    conversation_summary: "Hypo-Agent replan is ready to hand to ordinary Plan after queue, acceptance depth, risks, and unknowns are visible.",
    risks: [
      { id: "R-shallow", statement: "Shallow answers can be converted too early." },
      { id: "R-readme-only", statement: "README-only evidence is insufficient for external work." },
      { id: "R-skip-confirm", statement: "Converted context can accidentally skip ordinary Plan confirmation." },
    ],
    test_matrix: [
      { id: "TM-deep", target: "Deep Plan lifecycle", command: "uv run -- node --test core/test/deep-plan-real-scenario.test.js" },
      { id: "TM-research", target: "Research-code evidence", command: "uv run -- node --test core/test/deep-plan-research.test.js" },
    ],
    acceptance_depth: [
      { id: "A-queue", criterion: "Feature Queue order is explicit before ordinary Plan.", depth: "implementation-ready" },
      { id: "A-research-code", criterion: "External work has source implementation evidence refs after confirmation.", depth: "implementation-ready" },
      { id: "A-confirm", criterion: "Ordinary Plan confirmation is still required after convert.", depth: "implementation-ready" },
    ],
    ordered_feature_queue: [
      {
        id: "FQ-ask",
        title: "Deep Plan ask and unknown capture",
        priority: 10,
        readiness_depth: "implementation-ready",
        acceptance_depth: ["A-queue"],
        risks: ["R-shallow"],
        test_matrix: ["TM-deep"],
      },
      {
        id: "FQ-research-code",
        title: "Research-code bounded source inspection",
        priority: 20,
        readiness_depth: "implementation-ready",
        acceptance_depth: ["A-research-code"],
        risks: ["R-readme-only"],
        test_matrix: ["TM-research"],
      },
      {
        id: "FQ-handoff",
        title: "Ordinary Plan confirmation handoff",
        priority: 30,
        readiness_depth: "implementation-ready",
        acceptance_depth: ["A-confirm"],
        risks: ["R-skip-confirm"],
        test_matrix: ["TM-deep"],
      },
    ],
    unresolved_items: [
      { id: "U-playbook", question: "Manual playbook examples still need final operator evidence." },
    ],
    now: "2026-05-13T15:05:00+08:00",
  });

  const ready = await api.assessDeepPlanReadiness(await api.readDeepPlanPackage(root, created.id), {
    target_readiness_depth: "implementation-ready",
  });
  assert.equal(ready.allowed, true);
  assert.deepEqual(ready.gaps, []);

  const converted = await api.convertDeepPlanToPlanContext(root, created.id, {
    target_readiness_depth: "implementation-ready",
    now: "2026-05-13T15:06:00+08:00",
  });

  assert.equal(converted.allowed, true);
  assert.deepEqual(
    converted.feature_queue_draft.features.map((feature) => feature.id),
    ["FQ-ask", "FQ-research-code", "FQ-handoff"],
  );
  assert.match(converted.plan_context, /Feature Queue|Acceptance Depth|Risks|Unresolved Items/i);
  assert.match(converted.plan_context, /FQ-research-code|A-research-code|R-readme-only|U-playbook/);
  assert.equal(converted.plan_handoff.ordinary_plan_required, true);
  assert.equal(converted.plan_handoff.feature_queue_confirmation_required, true);
  assert.match(
    converted.feature_queue_draft.features[0].handoff_hint,
    /ordinary Plan must confirm/i,
  );

  const persistedContext = await readFile(join(root, created.path, "plan-context.md"), "utf8");
  assert.match(persistedContext, /\/hw:plan|ordinary Plan/i);
});

test("research-code playbooks exist and require explicit remote confirmation, bounded cache, implementation inspection, and code evidence refs", async () => {
  const requiredPlaybooks = [
    ".pipeline/playbooks/C12-hypo-agent-deep-plan.md",
    ".pipeline/playbooks/C12-research-code.md",
  ];

  for (const playbook of requiredPlaybooks) {
    const body = await readFile(playbook, "utf8");
    assert.match(body, /Deep Plan|\/hw:plan:deep|Hypo-Agent|research-code/i);
  }

  const researchCode = await readFile(".pipeline/playbooks/C12-research-code.md", "utf8");
  assert.match(researchCode, /explicit.*(remote|network).*confirm|显式.*(remote|network|网络).*确认/i);
  assert.match(researchCode, /download|clone|下载|克隆/i);
  assert.match(researchCode, /bounded.*research.*cache|有界.*research.*cache|bounded cache/i);
  assert.match(researchCode, /inspect.*implementation.*code|implementation source|实现源码|读取实现/i);
  assert.match(researchCode, /README-only.*insufficient|README.*不足|不能只看 README/i);
  assert.match(researchCode, /code evidence refs|evidence_refs|源码证据/i);

  const hypoAgent = await readFile(".pipeline/playbooks/C12-hypo-agent-deep-plan.md", "utf8");
  assert.match(hypoAgent, /new.*ask.*research.*map.*drill.*readiness.*convert|new -> ask -> research -> map -> drill -> readiness -> convert/i);
  assert.match(hypoAgent, /Feature Queue order|acceptance depth|risks|unknowns/i);
  assert.match(hypoAgent, /ordinary.*Plan.*confirm|普通.*Plan.*确认|\/hw:plan.*confirm/i);
});

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "hw-deep-plan-real-scenario-"));
  await api.writeConfig(join(root, ".pipeline", "config.yaml"), {
    pipeline: { name: "Deep Plan Real Scenario Fixture" },
    output: { language: "zh-CN", timezone: "Asia/Shanghai" },
  });
  await writeFile(join(root, ".pipeline", "state.yaml"), "sentinel: state\n", "utf8");
  await writeFile(join(root, ".pipeline", "cycle.yaml"), "sentinel: cycle\n", "utf8");
  await writeFile(join(root, ".pipeline", "rules.yaml"), "sentinel: rules\n", "utf8");
  return root;
}
