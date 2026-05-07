import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  auditClaudeResumeNamespace,
  commandByCanonical,
  renderClaudeResumeAudit,
} from "../src/index.js";

test("Hypo slash command registry does not claim Claude native /resume", () => {
  assert.equal(commandByCanonical("/resume"), undefined);
  assert.equal(commandByCanonical("/hw:resume").canonical, "/hw:resume");
});

test("Claude resume namespace audit confirms current plugin metadata is autocomplete-safe", async () => {
  const audit = await auditClaudeResumeNamespace(".");
  const ids = audit.findings.map((item) => item.id);

  assert.equal(audit.command_registry_exact, true);
  assert.equal(audit.native_resume_owner, "claude-code");
  assert.equal(ids.includes("resume-skill-name-conflict"), false);
  assert.ok(ids.includes("sessionstart-resume-matcher"));
  assert.equal(ids.includes("plugin-manifest-bare-resume"), false);
  assert.equal(audit.ok, true);
});

test("Claude resume namespace audit still catches legacy bare resume skill names", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-claude-resume-audit-"));
  await mkdir(join(root, "skills", "resume"), { recursive: true });
  await mkdir(join(root, ".claude-plugin"), { recursive: true });
  await mkdir(join(root, "hooks"), { recursive: true });
  await writeFile(join(root, "skills", "resume", "SKILL.md"), "---\nname: resume\ndescription: legacy\n---\n", "utf8");
  await writeFile(join(root, ".claude-plugin", "plugin.json"), "{\"name\":\"hw\",\"skills\":\"./skills/\"}\n", "utf8");
  await writeFile(join(root, ".claude-plugin", "marketplace.json"), "{\"plugins\":[{\"name\":\"hw\"}]}\n", "utf8");
  await writeFile(join(root, "hooks", "hooks.json"), "{\"hooks\":[]}\n", "utf8");

  const audit = await auditClaudeResumeNamespace(root);

  assert.ok(audit.findings.some((item) => item.id === "resume-skill-name-conflict"));
});

test("Claude resume audit report explains owner boundary in Chinese", async () => {
  const report = renderClaudeResumeAudit(await auditClaudeResumeNamespace("."));

  assert.match(report, /Claude 原生命令所有者：claude-code/);
  assert.match(report, /Hypo 恢复命令：\/hw:resume/);
  assert.doesNotMatch(report, /resume-skill-name-conflict/);
});
