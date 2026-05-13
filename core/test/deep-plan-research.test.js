import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as api from "../src/index.js";

test("deep plan research APIs are exported through the public index", () => {
  assert.equal(typeof api.recordDeepPlanResearch, "function");
  assert.equal(typeof api.assessDeepPlanResearchAction, "function");
  assert.equal(typeof api.indexDeepPlanKnowledgeRefs, "function");
});

test("recordDeepPlanResearch persists local read-only evidence flow and keeps package researching", async () => {
  const root = await fixtureRoot();
  const recordDeepPlanResearch = requiredApi("recordDeepPlanResearch");
  const created = await api.createDeepPlanPackage(root, {
    title: "Research evidence package",
    summary: "Research should collect local evidence before conversion.",
    status: "drafting",
    readiness_depth: "directional",
    now: "2026-05-12T11:00:00+08:00",
  });

  const recorded = await recordDeepPlanResearch(root, created.id, {
    researched_at: "2026-05-12T11:01:00+08:00",
    actor: "C12/M3 test worker",
    source_boundaries: {
      mode: "local_read_only",
      remote_network: "requires_explicit_confirmation",
      writes: "forbidden",
    },
    searched_surfaces: [
      { kind: "repository_files", query: "rg Deep Plan core/src core/test" },
      { kind: "local_docs", query: "rg research .pipeline docs core/test" },
      { kind: "archives", path: ".pipeline/reports" },
    ],
    evidence_refs: [
      { ref: "core/src/deep-plan/index.js", kind: "repository_file", lines: "1-220" },
      { ref: "core/test/deep-plan-package.test.js", kind: "test_file", lines: "1-240" },
      { ref: ".pipeline/deep-plans/DP001-research-evidence-package/deep-plan.yaml", kind: "package_artifact" },
    ],
    findings: [
      {
        id: "F001",
        statement: "Deep Plan packages already persist lifecycle metadata and compact plan context.",
        evidence_refs: ["core/src/deep-plan/index.js", "core/test/deep-plan-package.test.js"],
      },
    ],
    unknowns: [
      {
        id: "U001",
        question: "Whether research entries should later feed ordinary /hw:plan conversion scoring.",
        evidence_refs: ["core/test/deep-plan-package.test.js"],
      },
    ],
  }, {
    now: "2026-05-12T11:01:00+08:00",
  });

  assert.equal(recorded.deep_plan.id, created.id);
  assert.equal(recorded.deep_plan.status, "researching");
  assert.equal(recorded.research_entries.length, 1);
  assert.equal(recorded.research_entries[0].source_boundaries.mode, "local_read_only");
  assert.deepEqual(recorded.research_entries[0].searched_surfaces.map((surface) => surface.kind), [
    "repository_files",
    "local_docs",
    "archives",
  ]);
  assert.equal(recorded.research_entries[0].findings[0].id, "F001");
  assert.equal(recorded.research_entries[0].unknowns[0].id, "U001");

  const persisted = await api.readDeepPlanPackage(root, created.id);
  assert.equal(persisted.deep_plan.status, "researching");
  assert.equal(persisted.research_entries.length, 1);
  assert.equal(persisted.research_entries[0].evidence_refs.length, 3);

  const packageYaml = await readFile(join(root, created.path, "deep-plan.yaml"), "utf8");
  const planContext = await readFile(join(root, created.path, "plan-context.md"), "utf8");
  assert.match(packageYaml, /research_entries:/);
  assert.match(packageYaml, /source_boundaries:/);
  assert.match(packageYaml, /searched_surfaces:/);
  assert.match(planContext, /Research|Evidence|F001|U001|local_read_only/i);
});

test("recordDeepPlanResearch appends research entries without leaving researching status", async () => {
  const root = await fixtureRoot();
  const recordDeepPlanResearch = requiredApi("recordDeepPlanResearch");
  const created = await api.createDeepPlanPackage(root, {
    title: "Iterative research package",
    summary: "Research entries should be append-only inside the package.",
    status: "researching",
    now: "2026-05-12T11:10:00+08:00",
  });

  await recordDeepPlanResearch(root, created.id, {
    researched_at: "2026-05-12T11:11:00+08:00",
    evidence_refs: [{ ref: "core/test/deep-plan-package.test.js", kind: "test_file" }],
    findings: [{ id: "F001", statement: "Existing package tests cover artifact persistence." }],
    unknowns: [],
    searched_surfaces: [{ kind: "repository_files", query: "deep-plan-package" }],
    source_boundaries: { mode: "local_read_only" },
  });
  const second = await recordDeepPlanResearch(root, created.id, {
    researched_at: "2026-05-12T11:12:00+08:00",
    evidence_refs: [{ ref: "core/test/deep-plan-ask.test.js", kind: "test_file" }],
    findings: [{ id: "F002", statement: "Ask rounds already model iterative Deep Plan evidence." }],
    unknowns: [{ id: "U002", question: "How much research is enough before architecture mapping?" }],
    searched_surfaces: [{ kind: "local_tests", query: "recordDeepPlanAskRound" }],
    source_boundaries: { mode: "local_read_only" },
  });

  assert.equal(second.deep_plan.status, "researching");
  assert.deepEqual(second.research_entries.map((entry) => entry.findings[0].id), ["F001", "F002"]);

  const persisted = await api.readDeepPlanPackage(root, created.id);
  assert.deepEqual(persisted.research_entries.map((entry) => entry.findings[0].id), ["F001", "F002"]);
});

test("assessDeepPlanResearchAction only allows default local read-only research actions", async () => {
  const assessDeepPlanResearchAction = requiredApi("assessDeepPlanResearchAction");
  const allowedActions = [
    { type: "read_repository_file", path: "core/src/deep-plan/index.js" },
    { type: "inspect_archive", path: ".pipeline/reports/C12.md" },
    { type: "search_local_docs", query: "Deep Plan research", paths: ["docs", "core/test"] },
    { type: "search_local_tests", query: "recordDeepPlanResearch", paths: ["core/test"] },
  ];

  for (const action of allowedActions) {
    const result = await assessDeepPlanResearchAction(action);
    assert.equal(result.action_type, action.type);
    assert.equal(result.allowed, true, `${action.type} should be allowed by default`);
    assert.equal(result.requires_confirmation, false, `${action.type} should not require confirmation`);
    assert.match(result.reason, /local|read.only|repository|archive|docs|tests/i);
  }
});

test("assessDeepPlanResearchAction rejects or requires confirmation for non-local or side-effecting actions", async () => {
  const assessDeepPlanResearchAction = requiredApi("assessDeepPlanResearchAction");
  const gatedActions = [
    { type: "edit_code", path: "core/src/deep-plan/index.js" },
    { type: "restart_service", command: "systemctl restart hypo-workflow" },
    { type: "network_access", url: "https://example.com/research" },
    { type: "remote_clone", url: "https://github.com/example/research-code.git" },
    { type: "remote_download", url: "https://example.com/archive.zip" },
    { type: "destructive_delete", path: ".pipeline/deep-plans" },
    { type: "external_side_effect", command: "gh issue create" },
  ];

  for (const action of gatedActions) {
    const result = await assessDeepPlanResearchAction(action);
    assert.equal(result.action_type, action.type);
    assert.equal(result.allowed, false, `${action.type} must not be auto-allowed by default`);
    assert.equal(result.requires_confirmation, true, `${action.type} should need explicit confirmation`);
    assert.match(result.reason, /confirm|confirmation|remote|network|edit|restart|destructive|external|side effect/i);
  }
});

test("assessDeepPlanResearchAction does not let allowed_actions bypass remote confirmation", async () => {
  const assessDeepPlanResearchAction = requiredApi("assessDeepPlanResearchAction");
  const result = await assessDeepPlanResearchAction(
    { type: "remote_clone", url: "https://github.com/example/research-code.git" },
    { allowed_actions: ["remote_clone"] },
  );

  assert.equal(result.action_type, "remote_clone");
  assert.equal(result.allowed, false, "remote_clone must not be allowed by allowed_actions alone");
  assert.equal(result.requires_confirmation, true);
  assert.match(result.reason, /confirm|confirmation|remote|network/i);
});

test("assessDeepPlanResearchAction requires explicit confirmed_remote_actions for remote_clone", async () => {
  const assessDeepPlanResearchAction = requiredApi("assessDeepPlanResearchAction");
  const withoutExplicitRemoteAction = await assessDeepPlanResearchAction(
    { type: "remote_clone", url: "https://github.com/example/research-code.git" },
    {
      allowed_actions: ["remote_clone"],
      network_confirmed: true,
    },
  );

  assert.equal(withoutExplicitRemoteAction.action_type, "remote_clone");
  assert.equal(withoutExplicitRemoteAction.allowed, false, "network confirmation alone must not authorize a concrete clone");
  assert.equal(withoutExplicitRemoteAction.requires_confirmation, true);
  assert.match(withoutExplicitRemoteAction.reason, /confirmed_remote_actions|explicit.*remote_clone|action-scope/i);

  const withExplicitRemoteAction = await assessDeepPlanResearchAction(
    { type: "remote_clone", url: "https://github.com/example/research-code.git" },
    {
      allowed_actions: ["remote_clone"],
      confirmed_remote_actions: ["remote_clone"],
      research_cache_path: ".pipeline/deep-plans/DP001-research-code/research-cache/example",
      evidence_refs: [
        {
          ref: ".pipeline/deep-plans/DP001-research-code/research-cache/example/src/index.js",
          kind: "implementation_code",
          lines: "1-80",
        },
      ],
    },
  );

  assert.equal(withExplicitRemoteAction.action_type, "remote_clone");
  assert.equal(withExplicitRemoteAction.allowed, true);
  assert.equal(withExplicitRemoteAction.requires_confirmation, false);
});

test("assessDeepPlanResearchAction can use local config trusted remote actions without weakening external defaults", async () => {
  const assessDeepPlanResearchAction = requiredApi("assessDeepPlanResearchAction");
  const localTrusted = await assessDeepPlanResearchAction(
    { type: "remote_clone", url: "https://github.com/example/research-code.git" },
    {
      local_config_trusted_remote_actions: ["remote_clone"],
      research_cache_path: ".pipeline/deep-plans/DP001-research-code/research-cache/example",
      evidence_refs: [
        {
          ref: ".pipeline/deep-plans/DP001-research-code/research-cache/example/src/index.js",
          kind: "implementation_code",
          lines: "1-80",
        },
      ],
    },
  );

  assert.equal(localTrusted.action_type, "remote_clone");
  assert.equal(localTrusted.allowed, true);
  assert.equal(localTrusted.requires_confirmation, false);

  const externalDefault = await assessDeepPlanResearchAction(
    { type: "remote_clone", url: "https://github.com/example/research-code.git" },
    {
      research_cache_path: ".pipeline/deep-plans/DP001-research-code/research-cache/example",
      evidence_refs: [
        {
          ref: ".pipeline/deep-plans/DP001-research-code/research-cache/example/src/index.js",
          kind: "implementation_code",
          lines: "1-80",
        },
      ],
    },
  );

  assert.equal(externalDefault.allowed, false);
  assert.equal(externalDefault.requires_confirmation, true);
  assert.match(externalDefault.reason, /confirmed_remote_actions|local_config_trusted_remote_actions/);
});

test("confirmed remote_clone still requires bounded research cache and implementation code evidence refs", async () => {
  const assessDeepPlanResearchAction = requiredApi("assessDeepPlanResearchAction");
  const missingCacheAndCodeRefs = await assessDeepPlanResearchAction(
    { type: "remote_clone", url: "https://github.com/example/research-code.git" },
    {
      confirmed_remote_actions: ["remote_clone"],
      evidence_refs: [
        { ref: "README.md", kind: "readme", lines: "1-120" },
      ],
    },
  );

  assert.equal(missingCacheAndCodeRefs.action_type, "remote_clone");
  assert.equal(missingCacheAndCodeRefs.allowed, false);
  assert.equal(missingCacheAndCodeRefs.requires_confirmation, true);
  assert.match(
    missingCacheAndCodeRefs.reason,
    /bounded.*cache|research cache|implementation.*code|README-only|evidence_refs/i,
  );
});

test("assessDeepPlanResearchAction requires action-scope confirmation for side-effecting actions", async () => {
  const assessDeepPlanResearchAction = requiredApi("assessDeepPlanResearchAction");
  const actions = [
    { type: "edit_code", path: "core/src/deep-plan/index.js" },
    { type: "destructive_delete", path: ".pipeline/deep-plans" },
    { type: "restart_service", command: "systemctl restart hypo-workflow" },
    { type: "external_side_effect", command: "gh issue create" },
  ];

  for (const action of actions) {
    const result = await assessDeepPlanResearchAction(action, { network_confirmed: true });
    assert.equal(result.action_type, action.type);
    assert.equal(result.allowed, false, `${action.type} must not be allowed by network confirmation`);
    assert.equal(result.requires_confirmation, true, `${action.type} should still need action-scope confirmation`);
    assert.match(result.reason, /confirm|confirmation|edit|restart|destructive|external|side effect/i);
  }
});

test("indexDeepPlanKnowledgeRefs emits compact refs without full discussions, raw transcript, or secrets", async () => {
  const indexDeepPlanKnowledgeRefs = requiredApi("indexDeepPlanKnowledgeRefs");
  const rawDiscussion = [
    "USER: Please preserve this huge planning transcript.",
    "ASSISTANT: It contains implementation guesses and should not become a Knowledge ref body.",
    "SECRET_TOKEN=sk-should-not-appear-in-knowledge-ref",
  ].join("\n".repeat(80));
  const result = await indexDeepPlanKnowledgeRefs({
    deep_plan: {
      id: "DP777",
      title: "Knowledge ref package",
      status: "researching",
      package_path: ".pipeline/deep-plans/DP777-knowledge-ref-package",
      conversation_summary: "Research found local package APIs, but remote code fetch still requires confirmation.",
    },
    discussion_body: rawDiscussion,
    raw_transcript: rawDiscussion,
    research_entries: [
      {
        researched_at: "2026-05-12T11:30:00+08:00",
        source_boundaries: {
          mode: "local_read_only",
          remote_network: "requires_explicit_confirmation",
        },
        evidence_refs: [
          { ref: "core/src/deep-plan/index.js", kind: "repository_file", lines: "1-220" },
          { ref: "core/test/deep-plan-package.test.js", kind: "test_file", lines: "1-240" },
          {
            ref: "https://example.com/archive.zip?token=sk-evidence-ref-token",
            kind: "remote_archive",
            api_key: "secret-evidence-api-key",
          },
          {
            ref: "notes/password=correct-horse-battery-staple.md",
            kind: "local_note",
          },
        ],
        findings: [
          {
            id: "F001",
            statement: "Research evidence is local and read-only by default.",
            evidence_refs: ["core/src/deep-plan/index.js"],
          },
        ],
        unknowns: [
          {
            id: "U001",
            question: "How will research-code packages be imported after explicit network confirmation?",
          },
        ],
      },
    ],
  }, {
    max_ref_body_chars: 320,
    redact_secrets: true,
  });

  assert.ok(Array.isArray(result.refs), "result.refs should be an ordered compact Knowledge ref list");
  assert.ok(result.refs.length >= 1, "at least one Knowledge ref should be generated");
  assert.ok(result.refs.every((ref) => ref.package_id === "DP777"));
  assert.ok(result.refs.every((ref) => typeof ref.summary === "string" && ref.summary.length <= 320));
  assert.match(result.refs.map((ref) => ref.summary).join("\n"), /local.*read.only|remote.*confirmation|F001|U001/i);

  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /USER:|ASSISTANT:|implementation guesses/);
  assert.doesNotMatch(serialized, /discussion_body|raw_transcript/);
  assert.doesNotMatch(serialized, /SECRET_TOKEN|sk-should-not-appear|sk-evidence-ref-token|api[_-]?key|secret-evidence-api-key|password|correct-horse/i);
});

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "hw-deep-plan-research-"));
  await api.writeConfig(join(root, ".pipeline", "config.yaml"), {
    pipeline: { name: "Deep Plan Research Fixture" },
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
