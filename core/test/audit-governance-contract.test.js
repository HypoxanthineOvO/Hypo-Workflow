import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readContractSources() {
  const files = [
    "references/audit-spec.md",
    "references/state-contract.md",
    "references/commands-spec.md",
    "skills/accept/SKILL.md",
    "SKILL.md",
  ];
  const contents = await Promise.all(files.map(async (file) => [file, await readFile(file, "utf8")]));
  return Object.fromEntries(contents);
}

test("audit governance contract allows audit to reject before milestone completion", async () => {
  const sources = await readContractSources();
  const combined = Object.values(sources).join("\n");

  assert.match(
    combined,
    /audit[\s\S]{0,240}(mid-flight|before milestone completion|before completion|intervene before completion)/i,
  );
});

test("audit governance contract defines rejection scopes for milestone, feature, and cycle", async () => {
  const sources = await readContractSources();
  const combined = Object.values(sources).join("\n");

  assert.match(
    combined,
    /audit[\s\S]{0,240}reject[\s\S]{0,160}milestone[\s\S]{0,80}feature[\s\S]{0,80}cycle/i,
  );
});

test("blocked governance requires implement proposal plus audit approval", async () => {
  const sources = await readContractSources();
  const combined = Object.values(sources).join("\n");

  assert.match(
    combined,
    /(only\s+)?implement[\s\S]{0,200}(may|can|must)[\s\S]{0,120}propos[eal]*[\s\S]{0,120}blocked/i,
  );
  assert.match(
    combined,
    /(only\s+)?audit[\s\S]{0,200}(may|can|must)[\s\S]{0,120}(approve|approval)[\s\S]{0,120}blocked/i,
  );
});
