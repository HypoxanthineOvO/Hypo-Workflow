import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, normalize, sep } from "node:path";
import { commandMap } from "../commands/index.js";

const DEFAULT_INTERNAL_SKILLS = Object.freeze(["skills/watchdog/SKILL.md"]);

export async function checkSkillQuality(options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  const skillPaths = options.skills || await discoverSkillPaths(repoRoot);
  const commandSkills = options.commandSkills || commandMap("opencode").map((command) => command.skill);
  const internalSkills = options.internalSkills || DEFAULT_INTERNAL_SKILLS;
  const issues = [];
  const checked = [];

  for (const skillPath of skillPaths) {
    checked.push(skillPath);
    const absolutePath = join(repoRoot, skillPath);
    let content = "";
    try {
      content = await readFile(absolutePath, "utf8");
    } catch {
      issues.push(issue("missing-skill-file", skillPath, "Skill file does not exist."));
      continue;
    }

    if (!hasFrontmatter(content)) {
      issues.push(issue("missing-frontmatter", skillPath, "Skill must start with YAML frontmatter."));
    }

    if (!/^## (Output Language Rules|输出语言规则)$/m.test(content)) {
      issues.push(issue("missing-output-language-rules", skillPath, "Skill must use the canonical output language rules heading."));
    }

    for (const referencePath of extractReferencePaths(content)) {
      if (isReferencePathCheckable(referencePath) && !existsSync(join(repoRoot, referencePath))) {
        issues.push(issue("missing-reference-file", skillPath, `Referenced file does not exist: ${referencePath}`));
      }
    }

    if (internalSkills.includes(skillPath) && !/internal/i.test(content)) {
      issues.push(issue("internal-skill-not-marked", skillPath, "Internal Skill must be explicitly marked as internal."));
    }
  }

  for (const skillPath of new Set(commandSkills)) {
    if (!existsSync(join(repoRoot, skillPath))) {
      issues.push(issue("command-map-missing-skill", skillPath, "Command map references a missing Skill file."));
    }
  }

  for (const skillPath of internalSkills) {
    if (commandSkills.includes(skillPath)) {
      issues.push(issue("internal-skill-user-facing", skillPath, "Internal Skill must not appear in the user-facing command map."));
    }
  }

  const uniqueCommandSkills = new Set(commandSkills);
  return {
    ok: issues.length === 0,
    summary: `${issues.length} issue${issues.length === 1 ? "" : "s"} across ${checked.length} Skill files`,
    issues,
    skillPaths: checked,
    internalSkills: internalSkills.filter((skillPath) => existsSync(join(repoRoot, skillPath))),
    stats: {
      localSkills: checked.length,
      userFacingCommands: commandSkills.length,
      userFacingSkillPaths: uniqueCommandSkills.size,
      internalSkills: internalSkills.filter((skillPath) => existsSync(join(repoRoot, skillPath))).length,
    },
  };
}

async function discoverSkillPaths(repoRoot) {
  const skillsRoot = join(repoRoot, "skills");
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = join("skills", entry.name, "SKILL.md").split(sep).join("/");
    if (existsSync(join(repoRoot, skillPath))) paths.push(skillPath);
  }
  return paths.sort();
}

function hasFrontmatter(content) {
  return /^---\n(?:.|\n)*?\n---\n/.test(content);
}

function extractReferencePaths(content) {
  const lines = content.split("\n");
  const start = lines.findIndex((line) => line === "## Reference Files");
  if (start === -1) return [];
  const paths = [];
  const inlineCodePattern = /`([^`]+)`/g;
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6} /.test(line)) break;
    if (!line.trim().startsWith("-")) continue;
    for (const match of line.matchAll(inlineCodePattern)) {
      paths.push(match[1]);
    }
  }
  return paths;
}

function isReferencePathCheckable(referencePath) {
  if (!referencePath || referencePath.includes("*")) return false;
  if (/^[a-z]+:\/\//i.test(referencePath)) return false;
  const normalized = normalize(referencePath);
  if (normalized.startsWith("..")) return false;
  return /^(SKILL\.md|skills\/|references\/|rules\/|scripts\/|hooks\/|plan\/|templates\/|config\.schema\.yaml$)/.test(referencePath);
}

function issue(code, path, message) {
  return { code, path, message };
}
