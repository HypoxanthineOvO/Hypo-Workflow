import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { parseFrontmatter } from "../src/serialization/index.js";

const ROOT = new URL("../../", import.meta.url).pathname;
const TEMPLATE_ROOT = join(ROOT, "templates", "semantic");
const EXAMPLE_ROOT = join(ROOT, "examples", "semantic-workflow");

const REQUIRED_TEMPLATES = [
  "cycle.md",
  "plan.md",
  "progress.md",
  "execution.md",
  "discussion-summary.md",
  "discussion-ledger-local.md",
  "cycle-summary.md",
  "memory.md",
  "experiment.md",
  "handoff.md",
];

test("semantic templates are complete, parseable, and human-readable", async () => {
  const names = await readdir(TEMPLATE_ROOT);
  for (const name of REQUIRED_TEMPLATES) {
    assert.ok(names.includes(name), `missing semantic template ${name}`);
    const source = await readFile(join(TEMPLATE_ROOT, name), "utf8");
    const parsed = parseFrontmatter(source);
    assert.equal(typeof parsed.attributes.kind, "string", `${name} requires a semantic kind`);
    assert.ok(parsed.body.trimStart().startsWith("# "), `${name} requires a readable title`);
    assert.match(parsed.body, /\p{Script=Han}/u, `${name} requires Chinese user-facing content`);
    assert.doesNotMatch(source, /plan_hash|semantic_hash|transaction_id|worker_routing|Recovery Pack|Receipt/i);
  }
});

test("Progress and Execution templates make continuous recording explicit", async () => {
  const plan = parseFrontmatter(await readFile(join(TEMPLATE_ROOT, "plan.md"), "utf8"));
  const progress = await readFile(join(TEMPLATE_ROOT, "progress.md"), "utf8");
  const execution = await readFile(join(TEMPLATE_ROOT, "execution.md"), "utf8");

  assert.equal(plan.attributes.progress, "PROGRESS.md");
  assert.match(plan.body, /\| ID \| 阶段 \| 期望结果 \| 验证方式 \|/);

  const parsedProgress = parseFrontmatter(progress);
  assert.equal(parsedProgress.attributes.plan, "PLAN.md");
  for (const heading of ["当前状态", "完整计划状态", "阻塞", "计划变化", "下一步"]) {
    assert.match(progress, new RegExp(`## ${heading}`));
  }
  assert.match(progress, /\| ID \| 阶段 \| 状态 \| 当前结果 \/ 证据 \| 下一步 \|/);
  for (const label of ["计划项", "目的", "动作", "结果", "证据", "计划影响", "遇到的问题", "下一步"]) {
    assert.match(execution, new RegExp(`\\*\\*${label}：\\*\\*`));
  }
});

test("Session focus template names one local Cycle without protocol metadata", async () => {
  const focus = await readFile(join(TEMPLATE_ROOT, "session-focus.yaml"), "utf8");
  assert.match(focus, /^cycle: <cycle-name>$/m);
  assert.match(focus, /^updated: /m);
  assert.doesNotMatch(focus, /hash|receipt|runtime|routing/i);
});

test("example separates closed Demo, active production, and parallel research Cycles", async () => {
  const demo = parseFrontmatter(await readFile(join(EXAMPLE_ROOT, "cycles", "C001-renderer-demo", "SUMMARY.md"), "utf8"));
  const production = parseFrontmatter(await readFile(join(EXAMPLE_ROOT, "cycles", "C002-renderer-production", "PLAN.md"), "utf8"));
  const research = parseFrontmatter(await readFile(join(EXAMPLE_ROOT, "cycles", "C003-editor-research", "PLAN.md"), "utf8"));

  assert.equal(demo.attributes.status, "closed");
  assert.equal(production.attributes.status, "active");
  assert.deepEqual(production.attributes.builds_on, ["C001-renderer-demo"]);
  assert.equal(research.attributes.status, "active");
  assert.match(production.body, /不继承 Demo Milestone/);
  assert.match(research.body, /不修改正式版 renderer Cycle/);
});

test("example Progress mirrors every Plan item in order", async () => {
  for (const cycle of ["C002-renderer-production", "C003-editor-research"]) {
    const plan = parseFrontmatter(await readFile(join(EXAMPLE_ROOT, "cycles", cycle, "PLAN.md"), "utf8"));
    const progress = parseFrontmatter(await readFile(join(EXAMPLE_ROOT, "cycles", cycle, "PROGRESS.md"), "utf8"));

    assert.equal(plan.attributes.progress, "PROGRESS.md");
    assert.equal(progress.attributes.plan, "PLAN.md");
    assert.deepEqual(tableIds(progress.body), tableIds(plan.body), `${cycle} Progress must mirror Plan IDs`);
    assert.ok(tableIds(plan.body).includes(progress.attributes.current), `${cycle} current ID must exist in Plan`);
  }
});

test("example Experiment spans Cycles without owning their task lists", async () => {
  const experiment = parseFrontmatter(await readFile(join(EXAMPLE_ROOT, "experiments", "renderer-performance.md"), "utf8"));
  assert.equal(experiment.attributes.kind, "experiment");
  assert.deepEqual(experiment.attributes.cycles, ["C001-renderer-demo", "C002-renderer-production"]);
  assert.match(experiment.body, /Attempt 1[\s\S]*C001-renderer-demo/);
  assert.match(experiment.body, /Attempt 2[\s\S]*C002-renderer-production/);
});

function tableIds(body) {
  return [...body.matchAll(/^\| `(M\d+|S\d+)` \|/gm)].map((match) => match[1]);
}
