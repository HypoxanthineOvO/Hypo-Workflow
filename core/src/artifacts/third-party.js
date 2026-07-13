import { access, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { commandMap, legacyOpenCodeCommandName } from "../commands/index.js";

export const CURSOR_SKILLS_DIR = ".cursor/skills";
export const CURSOR_COMMANDS_DIR = ".cursor/commands";
export const CURSOR_RESOURCE_BUNDLE_PATH = ".cursor/hypo-workflow";
export const LEGACY_CURSOR_SKILL_BUNDLE_PATH = ".cursor/skills/hypo-workflow";

export const CURSOR_RESOURCE_BUNDLE_SOURCES = Object.freeze([
  "references/audit-spec.md",
  "references/analysis-ledger-spec.md",
  "references/analysis-spec.md",
  "references/chat-spec.md",
  "references/check-spec.md",
  "references/claude-codex-plugin-spec.md",
  "references/commands-spec.md",
  "references/completion-report-contract.md",
  "references/debug-spec.md",
  "references/domain-pack-spec.md",
  "references/evaluation-spec.md",
  "references/explain-spec.md",
  "references/feature-queue-spec.md",
  "references/init-spec.md",
  "references/knowledge-spec.md",
  "references/log-spec.md",
  "references/metrics-spec.md",
  "references/opencode-command-map.md",
  "references/opencode-parity.md",
  "references/platform-capabilities.md",
  "references/platform-codex.md",
  "references/plan-review-spec.md",
  "references/pr-spec.md",
  "references/progress-spec.md",
  "references/progressive-discover-spec.md",
  "references/release-spec.md",
  "references/review-artifacts-spec.md",
  "references/rules-spec.md",
  "references/skill-spec.md",
  "references/state-contract.md",
  "references/subagent-spec.md",
  "references/tdd-spec.md",
  "references/test-profile-spec.md",
  "references/v9-architecture.md",
  "adapters",
  "assets",
  "scripts/diff-stats.sh",
  "scripts/log-append.sh",
  "scripts/notion_api.py",
  "scripts/rules-summary.sh",
  "scripts/state-summary.sh",
  "scripts/validate-config.sh",
  "scripts/watchdog.sh",
]);

export const CURSOR_SKILL_BUNDLE_SOURCES = CURSOR_RESOURCE_BUNDLE_SOURCES;

export const THIRD_PARTY_ADAPTERS = Object.freeze({
  cursor: {
    platform: "cursor",
    title: "Cursor",
    path: ".cursor/rules/hypo-workflow.mdc",
    frontmatter: [
      "---",
      "description: Hypo-Workflow repository workflow guidance",
      "globs:",
      '  - "**/*"',
      "alwaysApply: true",
      "---",
      "",
    ].join("\n"),
  },
  copilot: {
    platform: "copilot",
    title: "GitHub Copilot",
    path: ".github/copilot-instructions.md",
    frontmatter: "",
  },
  trae: {
    platform: "trae",
    title: "Trae",
    path: ".trae/rules/project_rules.md",
    frontmatter: "",
  },
});

export const THIRD_PARTY_MANAGED_BEGIN = "<!-- HYPO-WORKFLOW:MANAGED:BEGIN -->";
export const THIRD_PARTY_MANAGED_END = "<!-- HYPO-WORKFLOW:MANAGED:END -->";

export async function writeThirdPartyAdapterArtifacts(projectRoot = ".", options = {}) {
  void projectRoot;
  void options;
  throw deferredAdapterError("Third-party");
}

export async function writeCursorSkillBundle(projectRoot = ".", options = {}) {
  void projectRoot;
  void options;
  throw deferredAdapterError("Cursor");
}

async function writeCursorSkillFiles(projectRoot, repoRoot) {
  const skillsDir = join(projectRoot, CURSOR_SKILLS_DIR);
  const written = [];
  await mkdir(skillsDir, { recursive: true });
  await removeGeneratedCursorSkillFiles(skillsDir);

  const rootSkillFile = join(skillsDir, "hypo-workflow.md");
  await writeFile(rootSkillFile, renderCursorRootSkill(), "utf8");
  written.push(`${CURSOR_SKILLS_DIR}/hypo-workflow.md`);

  for (const command of commandMap("opencode")) {
    const fileName = cursorCommandFileName(command);
    const sourceSkillContent = await readFile(join(repoRoot, command.skill), "utf8");
    const skillContent = adaptSkillContentForCursor(command, sourceSkillContent);
    await writeFile(
      join(skillsDir, fileName),
      renderCursorCommandSkill(command, skillContent),
      "utf8",
    );
    written.push(`${CURSOR_SKILLS_DIR}/${fileName}`);
  }
  return written;
}

function adaptSkillContentForCursor(command, skillContent) {
  if (command.canonical !== "/hw:setup") return skillContent;
  return renderCursorSetupAuthority();
}

function renderCursorSetupAuthority() {
  return [
    "---",
    "name: setup",
    "description: Configure Cursor-safe Hypo-Workflow defaults without taking over model selection.",
    "---",
    "",
    "# /hypo-workflow:setup",
    "## Cursor Setup Boundary",
    "",
    "Use this Cursor-specific setup authority when `/hw-setup` or `/hw:setup` runs inside Cursor.",
    "",
    "- Cursor chooses the active model in the UI/session.",
    "- Do not ask for, recommend, or write concrete model/provider defaults.",
    "- Do not write model routing fields unless the user explicitly asks to configure an external non-Cursor backend.",
    "- Keep project-local `.pipeline/config.yaml` writes owned by `/hw:init` or `/hw:plan-generate`, not setup.",
    "",
    "## Allowed Setup Scope",
    "",
    "1. Read `~/.hypo-workflow/config.yaml` when present.",
    "2. Summarize non-model defaults such as execution mode, plan mode, output language, output timezone, watchdog, compact, showcase, and rules.",
    "3. Ask whether the user wants to edit those non-model defaults.",
    "4. If writing global config, preserve any existing model/provider fields exactly as-is unless the user explicitly requested an external backend change.",
    "5. Remind the user that project config can override global defaults.",
    "",
    "## Local References",
    "",
    "- `.cursor/skills/hypo-workflow.md` for Cursor routing and runtime boundaries.",
    "",
    "This generated Skill is self-contained for Cursor setup. If broader source-repository configuration semantics are needed, treat them as external/non-local and use the allowed setup scope above as the fallback.",
    "",
  ].join("\n");
}

async function writeCursorCommandFiles(projectRoot) {
  const commandsDir = join(projectRoot, CURSOR_COMMANDS_DIR);
  const written = [];
  await mkdir(commandsDir, { recursive: true });
  await removeGeneratedCursorCommandFiles(commandsDir);
  for (const command of commandMap("opencode")) {
    const fileName = cursorCommandFileName(command);
    await writeFile(join(commandsDir, fileName), renderCursorCommandFile(command), "utf8");
    written.push(`${CURSOR_COMMANDS_DIR}/${fileName}`);
  }
  return written;
}

function renderCursorRootSkill() {
  const rows = commandMap("opencode").map((command) => (
    `| \`${legacyOpenCodeCommandName(command.canonical)}\` | \`${command.canonical}\` | \`${CURSOR_SKILLS_DIR}/${cursorCommandFileName(command)}\` |`
  ));
  return [
    "---",
    "name: hypo-workflow",
    'description: "Hypo-Workflow Cursor router. Use when the user invokes any /hw-* or /hw:* workflow command."',
    "---",
    "",
    "# Hypo-Workflow Cursor Router",
    "",
    "This file is generated by `hypo-workflow sync --platform cursor --project .`.",
    "",
    "## Runtime Contract",
    "",
    "- Hypo-Workflow is not a runner. Cursor Agent performs implementation, tests, and review.",
    "- `.pipeline/` remains the source of truth for state, Cycle, Patch, rules, PROGRESS, prompts, reports, and logs.",
    "- Protected files `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, and `.pipeline/rules.yaml` require lifecycle command ownership before writes.",
    "- Command authority is embedded in flat files under `.cursor/skills/hw-*.md`; compact shared references are mirrored under `.cursor/hypo-workflow/`.",
    "- Model selection belongs to the active Cursor UI/session. Do not prescribe, request, or write model/provider defaults unless the user explicitly asks to configure an external backend.",
    "",
    "## Command Skills",
    "",
    "| Cursor command | Canonical command | Skill file |",
    "|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}

function renderCursorCommandSkill(command, skillContent) {
  const cursorCommand = legacyOpenCodeCommandName(command.canonical);
  const name = cursorCommand.slice(1);
  return [
    "---",
    `name: ${name}`,
    `description: "Hypo-Workflow Cursor skill for ${cursorCommand}; use when the user invokes ${cursorCommand}, ${command.opencode}, or canonical ${command.canonical}."`,
    "---",
    "",
    `# ${cursorCommand}`,
    "",
    `Canonical command: \`${command.canonical}\``,
    `Cursor command: \`${cursorCommand}\``,
    `Namespace alias: \`${command.opencode}\``,
    `Route: \`${command.route}\``,
    `Embedded authority source: \`${command.skill}\``,
    "",
    "## Cursor Execution",
    "",
    "1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.",
    "2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.",
    `3. Execute the canonical \`${command.canonical}\` semantics using the embedded command authority below and any user-provided arguments.`,
    "4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.",
    "5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.",
    "6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.",
    "",
    "## Cursor Reference Resolution",
    "",
    "- Local Cursor references live under `.cursor/skills/` and `.cursor/hypo-workflow/`.",
    "- Source-repository paths mentioned by the embedded authority but absent from `.cursor/hypo-workflow/` are external/non-local for Cursor targets.",
    "- Fallback: use the embedded command authority in this file first, then mirrored `.cursor/hypo-workflow/` resources; ask the user for source-repository context only if the missing external reference is required.",
    "",
    "## Command Skill Authority",
    "",
    skillContent.trimEnd(),
    "",
  ].join("\n");
}

function renderCursorCommandFile(command) {
  const cursorCommand = legacyOpenCodeCommandName(command.canonical);
  return [
    `# ${cursorCommand}`,
    "",
    `Load Cursor Skill \`${CURSOR_SKILLS_DIR}/${cursorCommandFileName(command)}\`, then execute canonical command \`${command.canonical}\` with any user-provided arguments.`,
    "",
    "Arguments: `$ARGUMENTS`",
    "",
  ].join("\n");
}

function cursorCommandFileName(command) {
  return `${legacyOpenCodeCommandName(command.canonical).slice(1)}.md`;
}

async function removeLegacyCursorSkillBundle(projectRoot) {
  const legacyRoot = join(projectRoot, LEGACY_CURSOR_SKILL_BUNDLE_PATH);
  const marker = await readOptionalText(join(legacyRoot, ".hypo-workflow-managed.json"));
  if (!marker || !/"managed_by"\s*:\s*"hypo-workflow"/.test(marker)) return;
  await rm(legacyRoot, { recursive: true, force: true });
}

async function resetManagedCursorResourceBundle(projectRoot) {
  const bundleRoot = join(projectRoot, CURSOR_RESOURCE_BUNDLE_PATH);
  const marker = await readOptionalText(join(bundleRoot, ".hypo-workflow-managed.json"));
  if (marker && /"managed_by"\s*:\s*"hypo-workflow"/.test(marker)) {
    await rm(bundleRoot, { recursive: true, force: true });
    return;
  }
  if (!marker && await existsPath(bundleRoot)) {
    throw new Error(`Refusing to replace user-owned Cursor resource bundle at ${CURSOR_RESOURCE_BUNDLE_PATH}`);
  }
}

async function removeGeneratedCursorSkillFiles(skillsDir) {
  await removeGeneratedMarkdownFiles(skillsDir, (name, content) => (
    name === "hypo-workflow.md"
      ? /Hypo-Workflow Cursor Router/.test(content)
      : /^hw-.*\.md$/.test(name) && /Hypo-Workflow Cursor skill for/.test(content)
  ));
}

async function removeGeneratedCursorCommandFiles(commandsDir) {
  await removeGeneratedMarkdownFiles(commandsDir, (name, content) => (
    /^hw-.*\.md$/.test(name)
    && /Load Cursor Skill `\.cursor\/skills\/hw-.*\.md`, then execute canonical command/.test(content)
  ));
}

async function removeGeneratedMarkdownFiles(directory, shouldRemove) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const file = join(directory, entry.name);
    const content = await readOptionalText(file);
    if (shouldRemove(entry.name, content)) {
      await rm(file, { force: true });
    }
  }
}

export function renderThirdPartyAdapter(adapterOrPlatform, options = {}) {
  const adapter = typeof adapterOrPlatform === "string" ? THIRD_PARTY_ADAPTERS[adapterOrPlatform] : adapterOrPlatform;
  if (!adapter) throw new Error(`Unsupported third-party adapter: ${adapterOrPlatform}`);
  const body = [
    THIRD_PARTY_MANAGED_BEGIN,
    `# Hypo-Workflow for ${adapter.title}`,
    "",
    "## 安装与导入",
    "",
    "- 当用户要求安装、导入或学习 Hypo-Workflow 时，读取仓库 `HypoxanthineOvO/Hypo-Workflow` 的 `README.md` 和对应平台 Quick Start。",
    "- 这个规则文件只是仓库级指引，不声明平台会自动执行安装。需要写文件或运行命令时，遵守当前 IDE 的权限和确认机制。",
    "",
    "## Runtime Contract",
    "",
    "- Hypo-Workflow is not a runner. 当前 IDE Agent 执行实际工作。",
    "- `.pipeline/` 是 state、Cycle、Patch、rules、PROGRESS、prompts、reports、logs 的 source of truth。",
    "- 常用入口：`/hw:init` 初始化或重扫，`/hw:plan` 规划，`/hw:start` 开始执行，`/hw:resume` 继续，`/hw:status` 查看状态。",
    "- 如果平台不支持原生 slash commands，把用户的 `/hw:*` 意图映射到同名 Hypo-Workflow skill / README 语义。",
    adapter.platform === "cursor" ? "" : null,
    adapter.platform === "cursor" ? "## Cursor Skills And Commands" : null,
    adapter.platform === "cursor" ? "" : null,
    adapter.platform === "cursor" ? "- `hypo-workflow sync --platform cursor --project .` 同步本规则文件，并为每个 `/hw-*` 入口写入一个平铺 Skill 文件：`.cursor/skills/hw-*.md`。" : null,
    adapter.platform === "cursor" ? "- 同步 `.cursor/commands/hw-*.md` 作为 Cursor 对话里的 slash command 入口；精简共享参考资源镜像在 `.cursor/hypo-workflow/`，命令 authority 直接嵌入平铺 Skill。" : null,
    adapter.platform === "cursor" ? "- 当用户输入 `/hw-start`、`/hw-plan`、`/hw-resume` 等命令时，加载同名 `.cursor/skills/hw-*.md`，并映射到 canonical `/hw:*` 语义。" : null,
    adapter.platform === "cursor" ? "- Cursor 的模型选择由当前 Cursor UI/session 决定；adapter 不写入或推荐具体模型/provider 默认值，除非用户明确要求配置外部后端。" : null,
    adapter.platform === "cursor" ? "- 如果这些平铺 Skill 或 command 文件缺失或 stale，提示用户运行 `hypo-workflow sync --platform cursor --project .` 后再继续。" : null,
    "",
    "## Protected Files And Preflight",
    "",
    "- Treat protected files `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, and `.pipeline/rules.yaml` as lifecycle authority files.",
    "- 写入 protected files 前必须确认当前命令确实拥有生命周期写入语义；意外写入需要停下来说明原因。",
    "- 完成任务前做 preflight：格式检查、派生产物新鲜度、README/文档同步、secret marker、测试证据和报告证据。",
    "- 第三方平台的规则文件不能替代 Hook；如果平台没有对应 Hook，只能作为执行前后的检查清单。",
    "",
    "## Codex Subagents",
    "",
    "- Codex Subagents stay inside the Codex/GPT runtime. Do not route them to external model providers.",
    "- 复杂任务中尽量拆分 Subagent 工作；implementation and testing/review should be separated whenever practical.",
    "- 当无法调用 Subagent 时，在最终报告里写明原因，并补充本地测试或审查证据。",
    "",
    "## Automation Boundary",
    "",
    "- 自动化等级来自 `.pipeline/config.yaml` 的 `automation.level`，不能靠平台猜测升级。",
    "- `manual` 保守确认，`balanced` 常规自动化，`full` 尽量连续推进；破坏性、外部副作用、发布动作仍按配置 Gate 执行。",
    options.rulesBlock ? "" : null,
    options.rulesBlock ? options.rulesBlock.trimEnd() : null,
    THIRD_PARTY_MANAGED_END,
    "",
  ].filter((line) => line !== null).join("\n");
  return `${adapter.frontmatter || ""}${body}`;
}

export function selectThirdPartyAdapters(platform = "all") {
  const key = String(platform).toLowerCase();
  if (key === "all" || key === "third-party" || key === "third_party") {
    return Object.values(THIRD_PARTY_ADAPTERS);
  }
  const adapter = THIRD_PARTY_ADAPTERS[key];
  if (!adapter) throw new Error(`Unsupported third-party adapter platform: ${platform}`);
  return [adapter];
}

function mergeManagedContent(existing, rendered) {
  if (!existing) return rendered;
  const nextBlock = managedBlock(rendered);
  const start = existing.indexOf(THIRD_PARTY_MANAGED_BEGIN);
  const end = existing.indexOf(THIRD_PARTY_MANAGED_END);
  if (start >= 0 && end > start) {
    const afterEnd = end + THIRD_PARTY_MANAGED_END.length;
    return `${existing.slice(0, start)}${nextBlock}${existing.slice(afterEnd)}`;
  }
  const separator = existing.endsWith("\n") ? "\n" : "\n\n";
  return `${existing}${separator}${rendered}`;
}

function managedBlock(content) {
  const start = content.indexOf(THIRD_PARTY_MANAGED_BEGIN);
  const end = content.indexOf(THIRD_PARTY_MANAGED_END);
  if (start < 0 || end < 0 || end <= start) return content;
  return content.slice(start, end + THIRD_PARTY_MANAGED_END.length);
}

async function readOptionalText(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

async function existsPath(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function deferredAdapterError(platform) {
  const error = new Error(`${platform} adapter generation is deferred; this writer is retired and performed no writes.`);
  error.code = "ERR_HYPO_WORKFLOW_ADAPTER_DEFERRED";
  error.status = "deferred";
  error.writes = [];
  return error;
}
