import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { commandByCanonical } from "../commands/index.js";

export async function auditClaudeResumeNamespace(projectRoot = ".") {
  const files = await readAuditFiles(projectRoot);
  const findings = [];

  if (commandByCanonical("/resume")) {
    findings.push(finding("bare-resume-command-registered", "error", "Hypo command registry recognizes bare /resume."));
  }

  if (/^name:\s*resume\s*$/m.test(files.resumeSkill)) {
    findings.push(finding(
      "resume-skill-name-conflict",
      "warn",
      "skills/resume/SKILL.md uses frontmatter name: resume, which can collide with Claude native /resume autocomplete.",
      "skills/resume/SKILL.md",
    ));
  }

  if (/\/resume/.test(files.pluginManifest) || /\/resume/.test(files.marketplaceManifest)) {
    findings.push(finding(
      "plugin-manifest-bare-resume",
      "error",
      "Claude plugin metadata mentions bare /resume.",
      ".claude-plugin/plugin.json",
    ));
  }

  if (/matcher["']?\s*:\s*["']resume["']/.test(files.hooksJson)) {
    findings.push(finding(
      "sessionstart-resume-matcher",
      "info",
      "Claude SessionStart matcher 'resume' is an event matcher, not a slash command.",
      "hooks/hooks.json",
    ));
  }

  return {
    ok: !findings.some((item) => item.severity === "error"),
    command_registry_exact: commandByCanonical("/hw:resume")?.canonical === "/hw:resume" && !commandByCanonical("/resume"),
    native_resume_owner: "claude-code",
    hypo_resume_command: "/hw:resume",
    findings,
  };
}

export function renderClaudeResumeAudit(audit = {}) {
  const findings = Array.isArray(audit.findings) ? audit.findings : [];
  return [
    "# Claude `/resume` 命名冲突审计",
    "",
    `- 结论：${audit.ok === false ? "需要修复" : "未发现 error 级别裸 /resume 注册"}`,
    `- Claude 原生命令所有者：${audit.native_resume_owner || "claude-code"}`,
    `- Hypo 恢复命令：${audit.hypo_resume_command || "/hw:resume"}`,
    `- command registry exact namespace：${audit.command_registry_exact ? "通过" : "失败"}`,
    "",
    "## Findings",
    "",
    ...(findings.length ? findings.map((item) => (
      `- [${item.severity}] ${item.id}: ${item.summary}${item.path ? ` (${item.path})` : ""}`
    )) : ["- 无 findings。"]),
  ].join("\n") + "\n";
}

async function readAuditFiles(projectRoot) {
  const paths = {
    resumeSkill: "skills/resume/SKILL.md",
    pluginManifest: ".claude-plugin/plugin.json",
    marketplaceManifest: ".claude-plugin/marketplace.json",
    hooksJson: "hooks/hooks.json",
  };
  const entries = await Promise.all(Object.entries(paths).map(async ([key, path]) => [key, await readOptional(join(projectRoot, path))]));
  return Object.fromEntries(entries);
}

async function readOptional(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

function finding(id, severity, summary, path = null) {
  return { id, severity, summary, path };
}
