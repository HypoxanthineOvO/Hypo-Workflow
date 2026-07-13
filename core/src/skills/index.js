import { existsSync } from "node:fs";
import { lstat, readdir, readFile } from "node:fs/promises";
import { join, normalize, sep } from "node:path";
import { commandMap } from "../commands/index.js";

const ROOT_SKILL_PATH = "SKILL.md";

export async function checkSkillQuality(options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  const commandSkills = [...new Set(commandMap("opencode").map((command) => command.skill))];
  const expectedSkillPaths = [ROOT_SKILL_PATH, ...commandSkills];
  const physicalChildSkills = await discoverSkillPaths(repoRoot);
  const expectedChildSet = new Set(commandSkills);
  const unexpectedSkills = physicalChildSkills.filter((skillPath) => !expectedChildSet.has(skillPath));
  const issues = [];
  const checked = [];

  for (const skillPath of expectedSkillPaths) {
    checked.push(skillPath);
    const absolutePath = join(repoRoot, skillPath);
    if (await hasSymlinkComponent(repoRoot, skillPath)) {
      issues.push(issue("symlink-skill-path", skillPath, "Skill paths must not contain symbolic links."));
      continue;
    }

    let content = "";
    try {
      content = await readFile(absolutePath, "utf8");
    } catch {
      const code = skillPath === ROOT_SKILL_PATH ? "missing-root-skill" : "command-map-missing-skill";
      issues.push(issue(code, skillPath, "Expected Skill file does not exist."));
      continue;
    }

    if (!hasFrontmatter(content)) {
      issues.push(issue("missing-frontmatter", skillPath, "Skill must start with YAML frontmatter."));
    }

    if (skillPath !== ROOT_SKILL_PATH && !/^## (Output Language Rules|输出语言规则)$/m.test(content)) {
      issues.push(issue("missing-output-language-rules", skillPath, "Skill must use the canonical output language rules heading."));
    }

    for (const referencePath of extractReferencePaths(content)) {
      if (isReferencePathCheckable(referencePath) && !existsSync(join(repoRoot, referencePath))) {
        issues.push(issue("missing-reference-file", skillPath, `Referenced file does not exist: ${referencePath}`));
      }
    }

    for (const assetPath of skillPath === ROOT_SKILL_PATH ? [] : extractInlineAssetPaths(content)) {
      const skillDir = skillPath.split("/").slice(0, -1).join("/");
      const localAssetPath = join(repoRoot, skillDir, assetPath);
      const rootAssetPath = join(repoRoot, assetPath);
      if (!existsSync(localAssetPath) && existsSync(rootAssetPath)) {
        issues.push(issue(
          "child-skill-shared-asset-path",
          skillPath,
          `Child Skill references shared root asset as child-local path: ${assetPath}. Use ../../${assetPath} from ${skillDir}/SKILL.md or an explicit shared root path.`,
        ));
      }
    }

  }

  for (const skillPath of unexpectedSkills) {
    issues.push(issue(
      "unexpected-physical-skill",
      skillPath,
      "Physical Child Skill is not one of the nine public command backends and remains host-discoverable.",
    ));
  }

  return {
    ok: issues.length === 0,
    summary: `${issues.length} issue${issues.length === 1 ? "" : "s"} across ${checked.length} Skill files`,
    issues,
    skillPaths: checked,
    expectedSkillPaths,
    expectedChildSkills: commandSkills,
    physicalChildSkills,
    unexpectedSkills,
    extraSkills: unexpectedSkills,
    internalSkills: [],
    stats: {
      localSkills: checked.length,
      userFacingCommands: commandSkills.length,
      userFacingSkillPaths: commandSkills.length,
      expectedChildSkills: commandSkills.length,
      physicalChildSkills: physicalChildSkills.length,
      extraPhysicalSkills: unexpectedSkills.length,
      internalSkills: 0,
    },
  };
}

async function discoverSkillPaths(repoRoot) {
  const skillsRoot = join(repoRoot, "skills");
  let entries;
  try {
    entries = await readdir(skillsRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const paths = [];
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const skillPath = join("skills", entry.name, "SKILL.md").split(sep).join("/");
    if (existsSync(join(repoRoot, skillPath))) paths.push(skillPath);
  }
  return paths.sort();
}

async function hasSymlinkComponent(repoRoot, skillPath) {
  let cursor = repoRoot;
  for (const component of skillPath.split("/")) {
    cursor = join(cursor, component);
    try {
      if ((await lstat(cursor)).isSymbolicLink()) return true;
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "ENOTDIR") return false;
      throw error;
    }
  }
  return false;
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

function extractInlineAssetPaths(content) {
  const paths = [];
  const inlineCodePattern = /`([^`]+)`/g;
  for (const match of content.matchAll(inlineCodePattern)) {
    const value = match[1].trim();
    if (/^assets\/[^*]+/.test(value)) paths.push(value);
  }
  return [...new Set(paths)];
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
