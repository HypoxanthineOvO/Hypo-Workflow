import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import * as core from "../src/index.js";
import {
  loadStructuredRulesAuthority,
  normalizeStructuredRule,
  resolveEffectiveStructuredRules,
} from "../src/index.js";

test("normalizeStructuredRule produces a stable authority record", () => {
  const rule = normalizeStructuredRule({
    id: "Prefer Dense Frontend",
    scope: "project",
    label: "frontend",
    severity: "warn",
    hooks: ["always", "on-evaluate"],
    source: { captured_from: "chat", author: "user" },
    content: {
      instruction: "Prefer dense, scannable operational UI over marketing-style hero sections.",
      rationale: "The project targets repeated workflow operations.",
      examples: {
        good: ["compact table and toolbar"],
        bad: ["large decorative hero"],
      },
    },
    enforcement: {
      check_kind: "agent_judgment",
      evidence_required: true,
    },
  });

  assert.equal(rule.id, "prefer-dense-frontend");
  assert.equal(rule.scope, "project");
  assert.equal(rule.severity, "warn");
  assert.deepEqual(rule.hooks, ["always", "on-evaluate"]);
  assert.equal(rule.content.instruction, "Prefer dense, scannable operational UI over marketing-style hero sections.");
  assert.equal(rule.enforcement.check_kind, "agent_judgment");
  assert.equal(rule.enforcement.evidence_required, true);
  assert.deepEqual(rule.content.examples.good, ["compact table and toolbar"]);
  assert.deepEqual(rule.source, { captured_from: "chat", author: "user" });
});

test("normalizeStructuredRule rejects invalid structured rule fields deterministically", () => {
  assert.throws(
    () => normalizeStructuredRule({ id: "bad", scope: "team", content: { instruction: "x" } }),
    /Unsupported rule scope: team/,
  );
  assert.throws(
    () => normalizeStructuredRule({ id: "bad", severity: "block", content: { instruction: "x" } }),
    /Unsupported rule severity: block/,
  );
  assert.throws(
    () => normalizeStructuredRule({ id: "bad", hooks: ["before-spaceflight"], content: { instruction: "x" } }),
    /Unsupported rule hook: before-spaceflight/,
  );
  assert.throws(
    () => normalizeStructuredRule({
      id: "bad",
      content: { instruction: "x" },
      enforcement: { check_kind: "vibes" },
    }),
    /Unsupported rule enforcement check_kind: vibes/,
  );
});

test("structured rule precedence resolves cycle over project over global over builtin", () => {
  const sharedId = "prefer-output-language";
  const result = resolveEffectiveStructuredRules({
    builtin: [
      normalizeStructuredRule({
        id: sharedId,
        scope: "builtin",
        severity: "warn",
        label: "style",
        hooks: ["always"],
        content: { instruction: "Use configured output language." },
      }),
    ],
    global: [
      normalizeStructuredRule({
        id: sharedId,
        scope: "global",
        severity: "warn",
        label: "style",
        hooks: ["always"],
        content: { instruction: "Prefer Chinese user-facing output." },
      }),
    ],
    project: [
      normalizeStructuredRule({
        id: sharedId,
        scope: "project",
        severity: "error",
        label: "style",
        hooks: ["always"],
        content: { instruction: "Project output must be Chinese unless quoting identifiers." },
      }),
    ],
    cycle: [
      normalizeStructuredRule({
        id: sharedId,
        scope: "cycle",
        severity: "warn",
        label: "style",
        hooks: ["always", "on-evaluate"],
        content: { instruction: "C8 output and reports should be Chinese." },
      }),
    ],
  });

  const language = result.rules.find((rule) => rule.id === "prefer-output-language");
  assert.equal(language.scope, "cycle");
  assert.equal(language.severity, "warn");
  assert.deepEqual(language.overrides.map((item) => item.scope), ["project", "global", "builtin"]);
  assert.deepEqual(result.conflicts, [
    {
      rule_id: "prefer-output-language",
      winner: { id: "prefer-output-language", scope: "cycle", source_path: null },
      overridden: [
        { id: "prefer-output-language", scope: "project", source_path: null },
        { id: "prefer-output-language", scope: "global", source_path: null },
        { id: "prefer-output-language", scope: "builtin", source_path: null },
      ],
    },
  ]);
});

test("loadStructuredRulesAuthority reads legacy config, project structured, and markdown custom rules", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-rules-authority-"));
  await mkdir(join(dir, ".pipeline", "rules", "structured", "project"), { recursive: true });
  await mkdir(join(dir, ".pipeline", "rules", "custom"), { recursive: true });
  await writeFile(join(dir, ".pipeline", "rules.yaml"), [
    "extends: strict",
    "rules:",
    "  git-clean-check: error",
    "",
  ].join("\n"), "utf8");

  await writeFile(join(dir, ".pipeline", "rules", "structured", "project", "frontend-density.yaml"), [
    "id: frontend-density",
    "scope: project",
    "label: frontend",
    "severity: warn",
    "hooks:",
    "  - always",
    "content:",
    "  instruction: Prefer dense operational UI.",
    "enforcement:",
    "  check_kind: agent_judgment",
    "  evidence_required: true",
    "",
  ].join("\n"), "utf8");

  await writeFile(join(dir, ".pipeline", "rules", "custom", "prefer-chinese-output.md"), [
    "# prefer-chinese-output",
    "",
    "- **标签**: style",
    "- **严格度**: warn",
    "- **钩子点**: always",
    "",
    "## 规则内容",
    "",
    "面向用户的说明优先使用中文。",
    "",
  ].join("\n"), "utf8");

  const authority = await loadStructuredRulesAuthority(dir, ".", {
    globalRulesDir: join(dir, "global-rules-does-not-exist"),
  });

  assert.equal(authority.rules.some((rule) => rule.id === "frontend-density" && rule.scope === "project"), true);
  assert.equal(authority.rules.some((rule) => rule.id === "prefer-chinese-output" && rule.source.format === "markdown"), true);
  assert.equal(authority.effective.rules.some((rule) => rule.id === "frontend-density"), true);
  assert.match(authority.legacy_summary, /Rules: strict/);
  assert.match(authority.legacy_summary, /git-clean-check\tguard\terror/);
});

test("loadStructuredRulesAuthority applies legacy severity overrides to structured rules", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-rules-authority-overrides-"));
  await mkdir(join(dir, ".pipeline", "rules", "structured", "project"), { recursive: true });
  await writeFile(join(dir, ".pipeline", "rules.yaml"), [
    "extends: recommended",
    "rules:",
    "  frontend-density: off",
    "",
  ].join("\n"), "utf8");
  await writeFile(join(dir, ".pipeline", "rules", "structured", "project", "frontend-density.yaml"), [
    "id: frontend-density",
    "scope: project",
    "label: frontend",
    "severity: error",
    "hooks:",
    "  - always",
    "content:",
    "  instruction: Prefer dense operational UI.",
    "",
  ].join("\n"), "utf8");

  const authority = await loadStructuredRulesAuthority(dir, ".");
  const rule = authority.effective.rules.find((item) => item.id === "frontend-density");

  assert.equal(rule.severity, "off");
  assert.deepEqual(rule.severity_override, { source: ".pipeline/rules.yaml", severity: "off" });
});

test("loadStructuredRulesAuthority does not load global habits unless configured", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-rules-no-global-"));
  const globalDir = join(dir, "global-structured");
  await mkdir(globalDir, { recursive: true });
  await writeFile(join(globalDir, "global-only.yaml"), [
    "id: global-only",
    "scope: global",
    "severity: warn",
    "hooks:",
    "  - always",
    "content:",
    "  instruction: Global rule should load only when configured.",
    "",
  ].join("\n"), "utf8");

  const defaultAuthority = await loadStructuredRulesAuthority(dir, ".");
  assert.equal(defaultAuthority.global.length, 0);

  const configuredAuthority = await loadStructuredRulesAuthority(dir, ".", { globalRulesDir: globalDir });
  assert.equal(configuredAuthority.global.some((rule) => rule.id === "global-only"), true);
});

test("effective rules matrix records precedence and override evidence for each source", () => {
  const buildEffectiveRulesMatrix = core.buildEffectiveRulesMatrix;
  assert.equal(typeof buildEffectiveRulesMatrix, "function", "buildEffectiveRulesMatrix must be exported");

  const matrix = buildEffectiveRulesMatrix({
    project_id: "hypo-workflow",
    builtin: [
      normalizeStructuredRule({
        id: "prefer-chinese-output",
        scope: "builtin",
        severity: "warn",
        label: "style",
        source_path: "rules/builtin/prefer-chinese-output.yaml",
        source: { format: "builtin", pack: "recommended" },
        content: { instruction: "Use configured output language." },
      }),
    ],
    global: [
      normalizeStructuredRule({
        id: "prefer-chinese-output",
        scope: "global",
        severity: "error",
        label: "style",
        source_path: "~/.hypo-workflow/rules/structured/prefer-chinese-output.yaml",
        source: { format: "structured", author: "global" },
        content: { instruction: "User-facing documentation should be Chinese." },
      }),
    ],
    project: [
      normalizeStructuredRule({
        id: "prefer-chinese-output",
        scope: "project",
        severity: "warn",
        label: "style",
        source_path: ".pipeline/rules.yaml",
        source: { format: "project-config", project: "hypo-workflow" },
        content: { instruction: "Project output should be Chinese except identifiers." },
      }),
    ],
    cycle: [
      normalizeStructuredRule({
        id: "prefer-chinese-output",
        scope: "cycle",
        severity: "error",
        label: "style",
        source_path: ".pipeline/cycle.yaml",
        source: { format: "cycle", cycle: "C16" },
        content: { instruction: "C16 reports and summaries must be Chinese." },
      }),
    ],
  });

  assert.equal(matrix.precedence, "cycle > project > global > builtin");
  assert.ok(Array.isArray(matrix.rules), "matrix.rules must be an array");

  const rule = matrix.rules.find((item) => item.id === "prefer-chinese-output");
  assert.equal(rule.effective.scope, "cycle");
  assert.equal(rule.effective.source_path, ".pipeline/cycle.yaml");
  assert.deepEqual(rule.overrides.map((item) => item.scope), ["project", "global", "builtin"]);
  for (const override of rule.overrides) {
    assert.ok(override.source_path, `override ${override.scope} must include source_path`);
    assert.ok(override.evidence_refs?.length, `override ${override.scope} must include evidence_refs`);
    assert.ok(override.source, `override ${override.scope} must include source metadata`);
  }
  assert.deepEqual(
    matrix.conflicts.map((conflict) => ({
      rule_id: conflict.rule_id,
      winner_scope: conflict.winner.scope,
      overridden_scopes: conflict.overridden.map((item) => item.scope),
    })),
    [
      {
        rule_id: "prefer-chinese-output",
        winner_scope: "cycle",
        overridden_scopes: ["project", "global", "builtin"],
      },
    ],
  );
});
