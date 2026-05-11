import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const CODEX_DOCS = [
  "docs/en/platforms/codex.md",
  "docs/platforms/codex.md",
  "references/platform-codex.md",
  "SKILL.md",
  "skills/sync/SKILL.md",
];

async function readCombinedDocs() {
  const parts = await Promise.all(
    CODEX_DOCS.map(async (file) => `\n\n<!-- ${file} -->\n${await readFile(file, "utf8")}`),
  );
  return parts.join("\n");
}

function expectPattern(content, pattern, label) {
  assert.ok(pattern.test(content), `missing ${label}: ${pattern}`);
}

function rejectPattern(content, pattern, label) {
  assert.ok(!pattern.test(content), `must not contain ${label}: ${pattern}`);
}

test("Codex skill docs prefer snapshots or controlled sync over live source editing", async () => {
  const docs = await readCombinedDocs();

  expectPattern(docs, /snapshot|copy|副本|快照/i, "snapshot/copy wording");
  expectPattern(docs, /controlled sync|受控同步|sync.*snapshot|snapshot.*sync/i, "controlled sync wording");
  expectPattern(docs, /Codex[\s\S]{0,160}(skill|skills|技能)[\s\S]{0,240}(prefer|优先|recommended|建议)[\s\S]{0,240}(snapshot|copy|副本|快照|controlled sync|受控同步)/i, "Codex skills prefer snapshot/copy or controlled sync");
  rejectPattern(docs, /For development,\s*symlink the current checkout instead of copying it/i, "English live symlink recommendation");
  rejectPattern(docs, /开发时建议 symlink 当前 checkout，而不是复制一份/, "Chinese live symlink recommendation");
});

test("Codex docs warn that hot-editing live symlinked skills can self-modify a running read", async () => {
  const docs = await readCombinedDocs();

  expectPattern(docs, /hot[- ]?edit|热编辑|live symlink|实时 symlink|symlink/i, "hot-edit/live symlink wording");
  expectPattern(docs, /self[- ]?modifying|自我变异|自修改/i, "self-modifying skill-source risk");
  expectPattern(docs, /running Codex|运行中的 Codex|Codex[\s\S]{0,120}read/i, "running Codex read risk");
  expectPattern(docs, /half[- ]?updated|partial(?:ly)? updated|半更新|部分更新/i, "half-updated or partially updated source risk");
});

test("Codex docs prescribe isolated source edits followed by generated snapshot or controlled sync", async () => {
  const docs = await readCombinedDocs();

  expectPattern(docs, /edit(?:ing)? (?:the )?source project|编辑源项目|source project/i, "edit source project guidance");
  expectPattern(docs, /generate(?:d)? .*snapshot|生成.*(?:snapshot|快照)|snapshot .*Codex skills directory|Codex skills 目录/i, "generate/sync snapshot to Codex skills directory");
  expectPattern(docs, /isolated worktree|隔离 worktree|isolated copy|隔离副本/i, "isolated worktree/copy testing guidance");
  expectPattern(docs, /controlled sync|受控同步/i, "controlled sync safe path");
});

test("Codex snapshot guidance is framed as supporting guidance, not audit governance", async () => {
  const docs = await readCombinedDocs();

  expectPattern(docs, /supporting guidance|辅助指导|配套指导/i, "supporting guidance framing");
  expectPattern(docs, /not (?:the )?(?:main|primary) audit governance|不是.*(?:audit governance|审查治理).*主功能|does not replace/i, "not main audit governance wording");
  expectPattern(docs, /audit\/rework\/worker[- ]separation gates|audit.*rework.*worker[- ]separation|审查.*返工.*worker[- ]separation/i, "does not replace audit/rework/worker-separation gates");
});
