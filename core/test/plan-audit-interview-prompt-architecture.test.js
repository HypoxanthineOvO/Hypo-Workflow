import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const CONTRACT_FILES = [
  "skills/plan/SKILL.md",
  "plan/PLAN-SKILL.md",
  "references/progressive-discover-spec.md",
  "skills/plan-generate/SKILL.md",
  "plan/assets/prompt-template.md",
  ".pipeline/prompts/02-orchestrator-plan-audit-interview-and-prompt-architecture.md",
];

const M08_CONTRACT_FILES = [
  ".pipeline/architecture.md",
  ".pipeline/prompts/07-orchestrator-subworker-prompt-path-and-release-contract.md",
];

test("P1 cannot complete without a mandatory audit question group", async () => {
  const combined = await readContractSources(CONTRACT_FILES);

  assertRegex(
    combined,
    /P1[\s\S]{0,240}(mandatory|required|must ask)[\s\S]{0,160}audit question group/i,
    "P1 must name a mandatory audit question group.",
  );
  assertRegex(
    combined,
    /audit question group[\s\S]{0,260}(cannot|must not|block|deny)[\s\S]{0,160}(complete|enter P2|leave Discover)/i,
    "P1 completion must be blocked when the audit question group is missing.",
  );
  assertRegex(
    combined,
    /audit question group[\s\S]{0,360}(audit authority|audit scope|rejection scope|pseudo-test rejection|blocked approval|audit evidence)/i,
    "The mandatory audit group must capture concrete audit-governance fields.",
  );
});

test("P2 and P3 echo the P1 audit contract", async () => {
  const combined = await readContractSources(CONTRACT_FILES);

  assertRegex(
    combined,
    /P2[\s\S]{0,260}(echo|carry forward|preserve|repeat)[\s\S]{0,180}audit contracts?/i,
    "P2 must echo the audit contract gathered in P1.",
  );
  assertRegex(
    combined,
    /P3[\s\S]{0,260}(echo|carry forward|preserve|repeat)[\s\S]{0,180}audit contracts?/i,
    "P3 must echo the audit contract gathered in P1.",
  );
  assertRegex(
    combined,
    /audit contracts?[\s\S]{0,360}(real test method|pseudo-test rejection|rejection scope|blocked approval|audit evidence)/i,
    "The audit contract echo must preserve concrete audit constraints.",
  );
});

test("M08 prompt architecture keeps one canonical prompt, fixes the derived path, and releases derived prompts only when delegated", async () => {
  const combined = await readContractSources(M08_CONTRACT_FILES);

  assertRegex(
    combined,
    /canonical prompt files remain the milestone source of truth[\s\S]{0,260}Subworker prompts are optional derived artifacts/i,
    "M08 must keep one canonical prompt per milestone and treat subworker prompts as optional derived artifacts.",
  );
  assertRegex(
    combined,
    /\.pipeline\/prompts\/derived\/M08\/test\.md[\s\S]{0,160}\.pipeline\/prompts\/derived\/M08\/implement\.md[\s\S]{0,160}\.pipeline\/prompts\/derived\/M08\/audit\.md/i,
    "M08 must pin the derived prompt paths to the fixed derived directory.",
  );
  assertRegex(
    combined,
    /do not generate those derived files unless the work is actually delegated/i,
    "M08 must release derived prompts only when delegation actually exists.",
  );
  assertRegex(
    combined,
    /if worker separation is not enabled, or the milestone does not need independent delegation, keep the canonical prompt only/i,
    "M08 must keep canonical prompts only when delegation is not enabled.",
  );
  assertRegex(
    combined,
    /do not count derived subworker prompts toward milestone count or canonical prompt count/i,
    "M08 must keep the canonical prompt count unchanged.",
  );
  assertRegex(
    combined,
    /canonical prompt count remains 8, not 32/i,
    "M08 must state the unchanged canonical prompt count explicitly.",
  );
});

test("rework prompt references original prompt and contains rejection-driven scope", async () => {
  const combined = await readContractSources([
    ...CONTRACT_FILES,
    ".pipeline/prompts/04-orchestrator-rejection-rework-blocked-runtime-loop.md",
  ]);

  assertRegex(
    combined,
    /rework prompt[\s\S]{0,220}(original prompt|source prompt|original_prompt_ref|prompt_ref)/i,
    "Rework prompts must link back to the original prompt.",
  );
  assertRegex(
    combined,
    /rework prompt[\s\S]{0,300}(rejection-driven|rejection driven|required_rework|rejection artifact|rejection scope)/i,
    "Rework prompts must derive scope from rejection feedback.",
  );
  assertRegex(
    combined,
    /rework prompt[\s\S]{0,360}(incremental|delta|only|scope)[\s\S]{0,200}(required_rework|rejection|findings|feedback)/i,
    "Rework scope must be incremental and constrained by rejection findings.",
  );
});

async function readContractSources(files) {
  const chunks = await Promise.all(files.map((file) => readFile(file, "utf8")));
  return chunks.join("\n");
}

function assertRegex(value, pattern, message) {
  assert.ok(pattern.test(value), message);
}
