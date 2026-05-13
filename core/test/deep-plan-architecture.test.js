import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as api from "../src/index.js";

test("deep plan architecture APIs are exported through the public index", () => {
  assert.equal(typeof api.normalizeDeepPlanTracks, "function");
  assert.equal(typeof api.deriveDeepPlanModuleTracks, "function");
  assert.equal(typeof api.updateDeepPlanArchitectureMap, "function");
  assert.equal(typeof api.renderDeepPlanArchitecture, "function");
  assert.equal(typeof api.validateDeepPlanTrackRelationships, "function");
});

test("normalizeDeepPlanTracks preserves required fields and normalizes legacy kind to type", async () => {
  const normalizeDeepPlanTracks = requiredApi("normalizeDeepPlanTracks");
  const result = await normalizeDeepPlanTracks([
    {
      id: "REQ-auth",
      title: "Authenticated operator flow",
      kind: "requirement",
      status: "active",
      questions: ["Which operator roles are in scope?"],
      decisions: [{ id: "D-auth", status: "accepted", statement: "Deep Plan starts from operator intent." }],
      risks: [{ id: "R-auth", statement: "Role ambiguity can make module boundaries shallow." }],
      relationships: {
        blocks: ["MOD-audit"],
        feeds_into_plan: ["P1-role-gate"],
      },
    },
    {
      id: "THEME-evidence",
      title: "Evidence-backed planning",
      type: "theme",
      status: "open",
      questions: [],
      decisions: [],
      risks: [],
      relationships: {
        depends_on: ["REQ-auth"],
        conflicts_with: [],
      },
    },
  ]);

  assert.deepEqual(result.tracks.map((track) => track.id), ["REQ-auth", "THEME-evidence"]);
  assert.equal(result.tracks[0].type, "requirement");
  assert.equal(result.tracks[0].kind, undefined);
  assert.deepEqual(Object.keys(result.tracks[0]).sort(), [
    "decisions",
    "id",
    "questions",
    "relationships",
    "risks",
    "status",
    "title",
    "type",
  ]);
  assert.deepEqual(result.tracks[0].relationships, {
    depends_on: [],
    blocks: ["MOD-audit"],
    conflicts_with: [],
    feeds_into_plan: ["P1-role-gate"],
  });
  assert.deepEqual(result.tracks[1].relationships.depends_on, ["REQ-auth"]);
});

test("validateDeepPlanTrackRelationships detects dangling, self, and conflicting relationships", async () => {
  const validateDeepPlanTrackRelationships = requiredApi("validateDeepPlanTrackRelationships");
  const result = await validateDeepPlanTrackRelationships({
    deep_plan: { id: "DP042", title: "Relationship validation fixture" },
    tracks: [
      {
        id: "REQ-auth",
        title: "Authenticated operator flow",
        type: "requirement",
        status: "active",
        relationships: {
          depends_on: ["REQ-auth", "REQ-missing"],
          blocks: ["MOD-audit"],
          conflicts_with: ["MOD-audit"],
          feeds_into_plan: ["P1-role-gate"],
        },
      },
      {
        id: "MOD-audit",
        title: "Audit trail module",
        type: "module",
        status: "proposed",
        relationships: {
          depends_on: ["REQ-auth"],
          blocks: [],
          conflicts_with: ["REQ-auth"],
          feeds_into_plan: ["P2-audit-module"],
        },
      },
    ],
  });

  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.kind === "self_relationship" && issue.track_id === "REQ-auth"));
  assert.ok(result.issues.some((issue) => issue.kind === "dangling_relationship" && issue.target_id === "REQ-missing"));
  assert.ok(result.issues.some((issue) => issue.kind === "conflicting_relationship" && issue.track_id === "REQ-auth"));
  assert.ok(result.issues.some((issue) => issue.relationship === "depends_on"));
  assert.ok(result.issues.some((issue) => issue.relationship === "blocks"));
  assert.ok(result.issues.some((issue) => issue.relationship === "conflicts_with"));
  assert.ok(result.issues.some((issue) => issue.relationship === "feeds_into_plan"));
});

test("validateDeepPlanTrackRelationships detects invalid architecture edges", async () => {
  const validateDeepPlanTrackRelationships = requiredApi("validateDeepPlanTrackRelationships");
  const result = await validateDeepPlanTrackRelationships({
    deep_plan: { id: "DP045", title: "Architecture edge validation fixture" },
    tracks: [
      {
        id: "REQ-package",
        title: "Durable discussion package",
        type: "requirement",
        status: "active",
        relationships: {
          depends_on: [],
          blocks: [],
          conflicts_with: [],
          feeds_into_plan: [],
        },
      },
    ],
    architecture: {
      components: [
        { id: "package-store", title: "Package Store" },
        { id: "architecture-renderer", title: "Architecture Renderer" },
      ],
      edges: [
        { from: "missing-source", to: "architecture-renderer", relationship: "feeds" },
        { from: "package-store", to: "missing-target", relationship: "feeds" },
        { from: "package-store", to: "package-store", relationship: "loops" },
      ],
    },
  });

  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => (
    issue.kind === "dangling_architecture_edge"
      && issue.edge_index === 0
      && issue.from === "missing-source"
      && issue.to === "architecture-renderer"
  )));
  assert.ok(result.issues.some((issue) => (
    issue.kind === "dangling_architecture_edge"
      && issue.edge_index === 1
      && issue.from === "package-store"
      && issue.to === "missing-target"
  )));
  assert.ok(result.issues.some((issue) => (
    issue.kind === "self_architecture_edge"
      && issue.edge_index === 2
      && issue.from === "package-store"
      && issue.to === "package-store"
  )));
});

test("deriveDeepPlanModuleTracks creates module tracks from requirement and theme context with evidence refs", async () => {
  const deriveDeepPlanModuleTracks = requiredApi("deriveDeepPlanModuleTracks");
  const result = await deriveDeepPlanModuleTracks({
    deep_plan: {
      id: "DP043",
      title: "Module derivation fixture",
    },
    tracks: [
      {
        id: "REQ-package",
        title: "Durable discussion package",
        type: "requirement",
        status: "active",
        evidence_refs: ["core/test/deep-plan-package.test.js:1"],
        decisions: [{ id: "D-package", statement: "Packages persist structured planning state." }],
      },
      {
        id: "THEME-human-readable",
        title: "Human-readable architecture evidence",
        type: "theme",
        status: "open",
        evidence_refs: ["references/commands-spec.md:deep-plan"],
        questions: ["Which architecture surfaces must render for review?"],
      },
    ],
    architecture: {
      components: [
        {
          id: "package-store",
          title: "Package Store",
          source_track_ids: ["REQ-package"],
          evidence_refs: ["core/src/deep-plan/index.js:1"],
        },
        {
          id: "architecture-renderer",
          title: "Architecture Renderer",
          source_track_ids: ["REQ-package", "THEME-human-readable"],
          evidence_refs: ["core/test/deep-plan-contract.test.js:1"],
        },
      ],
    },
  });

  assert.ok(result.tracks.every((track) => track.type === "module"));
  const renderer = result.tracks.find((track) => track.id === "MOD-architecture-renderer");
  assert.ok(renderer, "architecture component should produce a deterministic module track");
  assert.deepEqual(renderer.source_requirement_ids, ["REQ-package", "THEME-human-readable"]);
  assert.match(renderer.source_context, /Durable discussion package|Human-readable architecture evidence/);
  assert.deepEqual(renderer.evidence_refs, [
    "core/test/deep-plan-package.test.js:1",
    "references/commands-spec.md:deep-plan",
    "core/test/deep-plan-contract.test.js:1",
  ]);
  assert.deepEqual(renderer.relationships.depends_on, ["REQ-package", "THEME-human-readable"]);
});

test("renderDeepPlanArchitecture emits Markdown and Mermaid from structured architecture source", async () => {
  const renderDeepPlanArchitecture = requiredApi("renderDeepPlanArchitecture");
  const rendered = await renderDeepPlanArchitecture(architectureFixture(), {
    include_mermaid: true,
    locale: "zh-CN",
  });

  assert.equal(typeof rendered.markdown, "string");
  assert.match(rendered.markdown, /^# Architecture Map/m);
  assert.match(rendered.markdown, /```mermaid/);
  assert.match(rendered.markdown, /REQ-package/);
  assert.match(rendered.markdown, /depends_on/);
  assert.match(rendered.markdown, /blocks/);
  assert.match(rendered.markdown, /conflicts_with/);
  assert.match(rendered.markdown, /feeds_into_plan/);
  assert.match(rendered.markdown, /package-store/);
  assert.match(rendered.markdown, /architecture-renderer/);
  assert.match(rendered.markdown, /package-store --> architecture-renderer/);
  assert.match(rendered.markdown, /Open questions/);
  assert.match(rendered.markdown, /Module cards/);
  assert.match(rendered.markdown, /Evidence refs/);
  assert.match(rendered.markdown, /core\/src\/deep-plan\/index\.js:1/);
});

test("updateDeepPlanArchitectureMap persists architecture.yaml, architecture.md, and tracks.yaml artifacts", async () => {
  const root = await fixtureRoot();
  const updateDeepPlanArchitectureMap = requiredApi("updateDeepPlanArchitectureMap");
  const created = await api.createDeepPlanPackage(root, {
    title: "Architecture persistence fixture",
    summary: "Architecture map updates should rewrite package artifacts.",
    tracks: [
      {
        id: "REQ-package",
        title: "Durable discussion package",
        kind: "requirement",
        status: "active",
      },
    ],
    now: "2026-05-12T12:00:00+08:00",
  });

  const updated = await updateDeepPlanArchitectureMap(root, created.id, {
    architecture: architectureFixture().architecture,
    tracks: architectureFixture().tracks,
  }, {
    now: "2026-05-12T12:01:00+08:00",
  });

  assert.equal(updated.deep_plan.id, created.id);
  assert.equal(updated.deep_plan.status, "architecture_mapping");
  assert.equal(updated.architecture.components[0].id, "package-store");
  assert.ok(updated.tracks.some((track) => track.id === "MOD-architecture-renderer"));

  const architectureYaml = await readFile(join(root, created.path, "architecture.yaml"), "utf8");
  const architectureMarkdown = await readFile(join(root, created.path, "architecture.md"), "utf8");
  const tracksYaml = await readFile(join(root, created.path, "tracks.yaml"), "utf8");

  assert.match(architectureYaml, /components:/);
  assert.match(architectureYaml, /edges:/);
  assert.match(architectureYaml, /open_questions:/);
  assert.match(architectureYaml, /module_cards:/);
  assert.match(architectureYaml, /evidence_refs:/);
  assert.match(architectureMarkdown, /```mermaid/);
  assert.match(architectureMarkdown, /package-store --> architecture-renderer/);
  assert.match(architectureMarkdown, /Module cards/);
  assert.match(tracksYaml, /REQ-package/);
  assert.match(tracksYaml, /MOD-architecture-renderer/);
  assert.match(tracksYaml, /relationships:/);
});

function requiredApi(name) {
  assert.equal(typeof api[name], "function", `missing public export ${name}`);
  return api[name];
}

function architectureFixture() {
  return {
    deep_plan: {
      id: "DP044",
      title: "Architecture render fixture",
      status: "architecture_mapping",
    },
    tracks: [
      {
        id: "REQ-package",
        title: "Durable discussion package",
        type: "requirement",
        status: "active",
        questions: ["Which package artifacts are source of truth?"],
        decisions: [{ id: "D-package", statement: "Packages persist architecture maps." }],
        risks: [{ id: "R-package", statement: "Unrendered state becomes invisible to reviewers." }],
        relationships: {
          depends_on: [],
          blocks: ["MOD-architecture-renderer"],
          conflicts_with: ["REQ-one-shot-plan"],
          feeds_into_plan: ["P1-architecture-map"],
        },
        evidence_refs: ["core/test/deep-plan-package.test.js:1"],
      },
      {
        id: "MOD-architecture-renderer",
        title: "Architecture Renderer",
        type: "module",
        status: "proposed",
        source_requirement_ids: ["REQ-package"],
        source_context: "Durable discussion package must be visible as Markdown and Mermaid.",
        evidence_refs: ["core/src/deep-plan/index.js:1"],
        relationships: {
          depends_on: ["REQ-package"],
          blocks: [],
          conflicts_with: [],
          feeds_into_plan: ["P2-renderer"],
        },
      },
    ],
    architecture: {
      components: [
        {
          id: "package-store",
          title: "Package Store",
          description: "Owns durable Deep Plan package artifacts.",
          evidence_refs: ["core/src/deep-plan/index.js:1"],
        },
        {
          id: "architecture-renderer",
          title: "Architecture Renderer",
          description: "Renders structured source for human review.",
          evidence_refs: ["core/test/deep-plan-architecture.test.js"],
        },
      ],
      edges: [
        {
          from: "package-store",
          to: "architecture-renderer",
          relationship: "feeds",
          reason: "Renderer reads structured package architecture source.",
          evidence_refs: ["core/test/deep-plan-package.test.js:1"],
        },
      ],
      open_questions: [
        {
          id: "AQ-render",
          question: "Which architecture details are required before ordinary plan conversion?",
          evidence_refs: ["references/commands-spec.md:deep-plan"],
        },
      ],
      module_cards: [
        {
          id: "MOD-architecture-renderer",
          title: "Architecture Renderer",
          responsibilities: ["Render Markdown", "Render Mermaid"],
          inputs: ["tracks.yaml", "architecture.yaml"],
          outputs: ["architecture.md"],
          evidence_refs: ["core/src/deep-plan/index.js:1"],
        },
      ],
      evidence_refs: [
        "core/src/deep-plan/index.js:1",
        "core/test/deep-plan-package.test.js:1",
      ],
    },
  };
}

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "hw-deep-plan-architecture-"));
  await api.writeConfig(join(root, ".pipeline", "config.yaml"), {
    pipeline: { name: "Deep Plan Architecture Fixture" },
    output: { language: "zh-CN", timezone: "Asia/Shanghai" },
  });
  await writeFile(join(root, ".pipeline", "state.yaml"), "sentinel: state\n", "utf8");
  await writeFile(join(root, ".pipeline", "cycle.yaml"), "sentinel: cycle\n", "utf8");
  await writeFile(join(root, ".pipeline", "rules.yaml"), "sentinel: rules\n", "utf8");
  return root;
}
