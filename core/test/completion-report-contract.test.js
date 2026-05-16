import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  COMPLETION_RESPONSE_SECTIONS,
  normalizeCompletionResponse,
  renderCompletionResponse,
} from "../src/index.js";

const REQUIRED_COMPLETION_FIELDS = Object.freeze([
  "change_summary",
  "technical_approach",
  "modified_files_or_modules",
  "test_design",
  "validation_results",
  "expected_results",
  "encountered_issues",
  "risks_and_followups",
]);

const FIELD_MATCHERS = Object.freeze({
  change_summary: [
    /\bchange[_ -]?summary\b/i,
    /\bwhat changed\b/i,
    /改动摘要/,
  ],
  technical_approach: [
    /\btechnical[_ -]?approach\b/i,
    /\btechnical strategy\b/i,
    /技术思路|技术方案/,
  ],
  modified_files_or_modules: [
    /\bmodified[_ -]?files[_ -]?or[_ -]?modules\b/i,
    /\bmodified files\b/i,
    /\bchanged modules\b/i,
    /修改文件|修改模块|文件\/模块/,
  ],
  test_design: [
    /\btest[_ -]?design\b/i,
    /\btesting approach\b/i,
    /测试设计/,
  ],
  validation_results: [
    /\bvalidation[_ -]?results\b/i,
    /\bverification results\b/i,
    /验证结果/,
  ],
  expected_results: [
    /\bexpected[_ -]?results\b/i,
    /\bexpected outcome\b/i,
    /预期结果|预期产出/,
  ],
  encountered_issues: [
    /\bencountered[_ -]?issues\b/i,
    /\bproblems encountered\b/i,
    /遇到的问题/,
  ],
  risks_and_followups: [
    /\brisks?[_ -]?(and|\/)?[_ -]?follow[_ -]?ups?\b/i,
    /\bknown risks\b/i,
    /风险\/后续|风险与后续|风险和后续/,
  ],
});

const REPORT_TEMPLATE_PATHS = Object.freeze([
  "assets/report-template.md",
  "templates/report.md",
  "templates/zh/report.md",
  "templates/analysis/report.md",
  "templates/zh/analysis-report.md",
]);

const COMPLETION_SURFACES = Object.freeze({
  report_command: ["skills/report/SKILL.md"],
  milestone: [
    "assets/report-template.md",
    "templates/report.md",
    "templates/zh/report.md",
    "references/progress-spec.md",
    "references/log-spec.md",
  ],
  cycle: ["skills/cycle/SKILL.md"],
  debug: ["skills/debug/SKILL.md", "references/debug-spec.md"],
  audit: ["skills/audit/SKILL.md", "references/audit-spec.md"],
  patch: ["skills/patch/SKILL.md"],
});

test("shared completion response contract requires detailed report fields", () => {
  for (const field of REQUIRED_COMPLETION_FIELDS) {
    assert.ok(
      COMPLETION_RESPONSE_SECTIONS.includes(field),
      `COMPLETION_RESPONSE_SECTIONS must require ${field}`,
    );
  }

  const response = normalizeCompletionResponse({
    language: "en",
    conclusion: "M2 is complete.",
    what_changed: ["Legacy compatibility summary."],
    why: "Legacy compatibility rationale.",
    key_files: ["legacy/file.md"],
    validation: ["legacy validation"],
    manual_operations: ["legacy manual operation"],
    known_risks: ["legacy risk"],
    next_steps: ["legacy next step"],
    change_summary: "Added detailed completion report sections.",
    technical_approach: "Use one shared contract across all completion surfaces.",
    modified_files_or_modules: ["templates/report.md", "skills/cycle/SKILL.md"],
    test_design: "Assert source templates and lifecycle documentation directly.",
    validation_results: "Focused contract test passes.",
    expected_results: "Completion reports are reviewable without extra context.",
    encountered_issues: ["No generated runtime state is required."],
    risks_and_followups: ["Future surfaces must keep the same required fields."],
  });

  for (const field of REQUIRED_COMPLETION_FIELDS) {
    assert.ok(
      Object.hasOwn(response, field),
      `normalizeCompletionResponse must preserve ${field}`,
    );
  }

  const rendered = renderCompletionResponse(response);
  for (const field of REQUIRED_COMPLETION_FIELDS) {
    expectField(rendered, field, "rendered completion response");
  }
});

test("report templates expose every detailed completion field", async () => {
  const docs = await readDocs(REPORT_TEMPLATE_PATHS);

  for (const [path, text] of Object.entries(docs)) {
    for (const field of REQUIRED_COMPLETION_FIELDS) {
      expectField(text, field, path);
    }
  }
});

test("milestone, cycle, debug, audit, and patch completion surfaces share the same detailed fields", async () => {
  for (const [surface, paths] of Object.entries(COMPLETION_SURFACES)) {
    const docs = await readDocs(paths);
    const combined = Object.entries(docs)
      .map(([path, text]) => `\n<!-- ${path} -->\n${text}`)
      .join("\n");

    for (const field of REQUIRED_COMPLETION_FIELDS) {
      expectField(combined, field, `${surface} completion surface`);
    }
  }
});

async function readDocs(paths) {
  const entries = await Promise.all(
    paths.map(async (path) => [path, await readFile(path, "utf8")]),
  );
  return Object.fromEntries(entries);
}

function expectField(text, field, context) {
  const matchers = FIELD_MATCHERS[field];
  assert.ok(matchers, `test is missing matchers for ${field}`);
  assert.ok(
    matchers.some((matcher) => matcher.test(text)),
    `${context} must mention required completion field ${field}`,
  );
}
