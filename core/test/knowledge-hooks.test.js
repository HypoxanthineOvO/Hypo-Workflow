import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

test("session-start hook injects knowledge compact and indexes without raw records", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-knowledge-session-"));
  try {
    await mkdir(join(dir, ".pipeline", "knowledge", "index"), { recursive: true });
    await mkdir(join(dir, ".pipeline", "knowledge", "records"), { recursive: true });
    await writeState(dir, { status: "running", prompt: "02-knowledge-hook-integration.md", step: "write_tests", stepIndex: 0 });
    await writeFile(join(dir, ".pipeline", "knowledge", "knowledge.compact.md"), "# Knowledge Compact\n\n- compact decision\n", "utf8");
    await writeFile(join(dir, ".pipeline", "knowledge", "index", "dependencies.yaml"), "category: dependencies\nentries:\n  - summary: compact dependency\n", "utf8");
    await writeFile(join(dir, ".pipeline", "knowledge", "index", "secret-refs.yaml"), "category: secret-refs\nentries:\n  - summary: redacted env\n", "utf8");
    await writeFile(join(dir, ".pipeline", "knowledge", "records", "raw.yaml"), "details:\n  api_key: RAW_TOKEN_SHOULD_NOT_LOAD\n", "utf8");

    const { stdout } = await runHook(join(repoRoot, "hooks", "session-start.sh"), ["resume"], dir);
    const parsed = JSON.parse(stdout);

    assert.match(parsed.additionalContext, /Knowledge compact/);
    assert.match(parsed.additionalContext, /knowledge\.compact\.md/);
    assert.match(parsed.additionalContext, /index\/dependencies\.yaml/);
    assert.match(parsed.additionalContext, /index\/secret-refs\.yaml/);
    assert.doesNotMatch(parsed.additionalContext, /RAW_TOKEN_SHOULD_NOT_LOAD/);
    assert.doesNotMatch(parsed.additionalContext, /knowledge\/records\/raw\.yaml/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("stop hook blocks strict knowledge ledger self-check when no record exists", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-knowledge-stop-"));
  try {
    await mkdir(join(dir, ".pipeline", "reports"), { recursive: true });
    await mkdir(join(dir, ".pipeline", "knowledge", "records"), { recursive: true });
    await writeState(dir, { status: "running", prompt: "02-knowledge-hook-integration.md", step: "review_code", stepIndex: 5 });
    await writeFile(join(dir, ".pipeline", "cycle.yaml"), "cycle:\n  number: 4\n  name: C4\n", "utf8");
    await writeFile(join(dir, ".pipeline", "reports", "02-knowledge-hook-integration.report.md"), "report\n", "utf8");
    await writeFile(join(dir, ".pipeline", "log.md"), "recent step\n", "utf8");
    await writeFile(
      join(dir, ".pipeline", "rules.yaml"),
      "extends: recommended\nrules:\n  knowledge-ledger-self-check: error\n",
      "utf8",
    );

    const { stdout } = await runHook(join(repoRoot, "hooks", "stop-check.sh"), [], dir);
    const parsed = JSON.parse(stdout);

    assert.equal(parsed.decision, "block");
    assert.match(parsed.reason, /Knowledge Ledger/);
    assert.match(parsed.reason, /C4\/M03/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("knowledge hook docs define archive summary, compact generation, and rules", async () => {
  const cycleSkill = await readFile("skills/cycle/SKILL.md", "utf8");
  const compactSkill = await readFile("skills/compact/SKILL.md", "utf8");
  const hooksReadme = await readFile("hooks/README.md", "utf8");
  const rulesSpec = await readFile("references/rules-spec.md", "utf8");
  const sessionRule = await readFile("rules/builtin/session-start-context-load.yaml", "utf8");
  const knowledgeRule = await readFile("rules/builtin/knowledge-ledger-self-check.yaml", "utf8");

  assert.match(cycleSkill, /knowledge-summary\.md/);
  assert.match(cycleSkill, /Do not archive, move, or delete `.pipeline\/knowledge\/`|不要归档、移动或删除 `.pipeline\/knowledge\/`/);
  assert.match(compactSkill, /\.pipeline\/knowledge\/knowledge\.compact\.md/);
  assert.match(compactSkill, /raw knowledge records are not loaded by default|默认不加载完整的原始知识记录/i);
  assert.match(hooksReadme, /Knowledge Ledger/);
  assert.match(rulesSpec, /knowledge-ledger-self-check/);
  assert.match(sessionRule, /knowledge compact and category indexes/i);
  assert.match(knowledgeRule, /materially changes reusable project knowledge/i);
});

async function writeState(dir, { status, prompt, step, stepIndex }) {
  await mkdir(join(dir, ".pipeline"), { recursive: true });
  await writeFile(
    join(dir, ".pipeline", "state.yaml"),
    [
      "pipeline:",
      "  name: knowledge-hook",
      `  status: ${status}`,
      "current:",
      "  phase: executing",
      `  prompt_file: ${prompt}`,
      `  step: ${step}`,
      `  step_index: ${stepIndex}`,
      "milestones:",
      "  - id: M03",
      "    feature_id: F001",
      "    name: Knowledge hook integration",
      `    prompt_file: .pipeline/prompts/${prompt}`,
      "    status: running",
      "prompt_state:",
      "  steps:",
      "    - name: write_tests",
      "      status: done",
      "    - name: review_tests",
      "      status: done",
      "    - name: run_tests_red",
      "      status: done",
      "    - name: implement",
      "      status: done",
      "    - name: run_tests_green",
      "      status: done",
      "    - name: review_code",
      "      status: done",
      "",
    ].join("\n"),
    "utf8",
  );
}

function runHook(script, args, cwd) {
  const command = `printf '{"cwd":"${cwd}"}' | bash ${shellQuote(script)} ${args.map(shellQuote).join(" ")}`;
  return execFileAsync("bash", ["-lc", command], { cwd });
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}
