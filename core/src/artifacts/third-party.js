import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { loadStructuredRulesAuthority, renderStructuredRulesInstructionBlock } from "../rules/index.js";

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
  const adapters = selectThirdPartyAdapters(options.platform || "all");
  const files = [];
  const rulesBlock = await renderAdapterRulesBlock(projectRoot, options);
  for (const adapter of adapters) {
    const file = join(projectRoot, adapter.path);
    const existing = await readOptionalText(file);
    const rendered = renderThirdPartyAdapter(adapter, { rulesBlock });
    const next = mergeManagedContent(existing, rendered);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, next, "utf8");
    files.push({
      platform: adapter.platform,
      path: adapter.path,
      changed: existing !== next,
    });
  }
  return { files };
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

async function renderAdapterRulesBlock(projectRoot, options = {}) {
  try {
    const repoRoot = options.repoRoot || resolve(new URL("../../..", import.meta.url).pathname);
    const authority = options.rulesAuthority || await loadStructuredRulesAuthority(projectRoot, repoRoot, options);
    return renderStructuredRulesInstructionBlock(authority);
  } catch {
    return "";
  }
}
