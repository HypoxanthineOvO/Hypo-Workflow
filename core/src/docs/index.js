import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CANONICAL_COMMANDS } from "../commands/index.js";
import { PLATFORM_CAPABILITIES } from "../platform/index.js";
import { listConfigurationProfiles } from "../profile/index.js";
import {
  checkReadmeFreshness,
  updateReadme,
} from "../readme/index.js";

export function docsMap() {
  return {
    version: 1,
    documents: [
      {
        path: "README.md",
        role: "concise_user_entrypoint",
        update_class: "managed_blocks_plus_narrative",
        sources: ["core/src/commands/index.js", "core/src/platform/index.js", "LICENSE"],
        managed_blocks: ["badges", "feature-summary", "command-count", "command-reference", "platform-matrix"],
        narrative_update_policy: "explicit_repair",
        must_not_include: ["full_test_matrix", "release_internals", "adapter_runtime_details", "long_changelog"],
      },
      {
        path: "docs/user-guide.md",
        role: "full_user_guide",
        update_class: "narrative_doc",
        sources: ["README.md", "references/commands-spec.md"],
        managed_blocks: [],
        narrative_update_policy: "explicit_repair",
        must_not_include: ["internal_architecture_dump"],
      },
      {
        path: "docs/developer.md",
        role: "developer_guide",
        update_class: "narrative_doc",
        sources: ["references/*.md", "core/src"],
        managed_blocks: [],
        narrative_update_policy: "explicit_repair",
        must_not_include: [],
      },
      ...["codex", "claude-code", "opencode", "cursor", "copilot", "trae"].map((platform) => ({
        path: `docs/platforms/${platform}.md`,
        role: "platform_guide",
        platform,
        update_class: "narrative_doc",
        sources: ["references/platform-capabilities.md", "core/src/platform/index.js"],
        managed_blocks: [],
        narrative_update_policy: "explicit_repair",
        must_not_include: [],
      })),
      {
        path: "docs/reference/commands.md",
        role: "generated_command_reference",
        update_class: "generated_reference",
        sources: ["core/src/commands/index.js"],
        managed_blocks: [],
        narrative_update_policy: "generated",
        must_not_include: [],
      },
      {
        path: "docs/reference/platforms.md",
        role: "generated_platform_reference",
        update_class: "generated_reference",
        sources: ["core/src/platform/index.js"],
        managed_blocks: [],
        narrative_update_policy: "generated",
        must_not_include: [],
      },
      {
        path: "docs/reference/generated-artifacts.md",
        role: "generated_artifacts_reference",
        update_class: "generated_reference",
        sources: ["core/src/artifacts/opencode.js", "core/src/artifacts/third-party.js", "core/src/sync/index.js"],
        managed_blocks: [],
        narrative_update_policy: "generated",
        must_not_include: [],
      },
      {
        path: "docs/reference/configuration.md",
        role: "configuration_governance_reference",
        update_class: "generated_reference",
        sources: ["references/config-spec.md", "core/src/config/index.js", "core/src/analysis/index.js"],
        managed_blocks: [],
        narrative_update_policy: "generated",
        must_not_include: [],
      },
      {
        path: "CHANGELOG.md",
        role: "changelog",
        update_class: "release_generated",
        sources: ["git log"],
        managed_blocks: [],
        narrative_update_policy: "release_flow",
        must_not_include: [],
      },
      {
        path: "LICENSE",
        role: "license",
        update_class: "authority",
        sources: [],
        managed_blocks: [],
        narrative_update_policy: "manual",
        must_not_include: [],
      },
    ],
  };
}

export async function checkDocs(projectRoot = ".", options = {}) {
  const failures = [];
  const warnings = [];
  const readmePath = join(projectRoot, "README.md");
  const readme = await readOptionalText(readmePath);
  if (!readme) {
    failures.push({ check: "readme", message: "README.md is missing" });
  } else {
    failures.push(...checkReadmeNarrative(readme));
    const freshness = await checkReadmeFreshness(readmePath, { projectRoot }).catch((error) => ({
      fresh: false,
      failures: [{ check: "readme-freshness", message: error.message }],
    }));
    failures.push(...freshness.failures);
    if (!/\]\(LICENSE\)|License|许可证/i.test(readme)) {
      failures.push({ check: "license-link", message: "README must link to or clearly mention LICENSE" });
    }
  }
  for (const doc of docsMap().documents.filter((item) => item.update_class === "generated_reference")) {
    const content = await readOptionalText(join(projectRoot, doc.path));
    if (!content) warnings.push({ check: "generated-reference-missing", path: doc.path });
  }
  return {
    ok: failures.length === 0,
    failures,
    warnings,
  };
}

export async function repairDocs(projectRoot = ".", options = {}) {
  const generated = [];
  const managedBlocks = [];
  const write = options.write !== false;
  await writeGenerated(projectRoot, "docs/user-guide.md", renderUserGuide());
  generated.push("docs/user-guide.md");
  await writeGenerated(projectRoot, "docs/developer.md", renderDeveloperGuide());
  generated.push("docs/developer.md");
  for (const platform of ["codex", "claude-code", "opencode", "cursor", "copilot", "trae"]) {
    const path = `docs/platforms/${platform}.md`;
    await writeGenerated(projectRoot, path, renderPlatformGuide(platform));
    generated.push(path);
  }
  await writeGenerated(projectRoot, "docs/reference/commands.md", renderCommandsReference());
  generated.push("docs/reference/commands.md");
  await writeGenerated(projectRoot, "docs/reference/platforms.md", renderPlatformsReference());
  generated.push("docs/reference/platforms.md");
  await writeGenerated(projectRoot, "docs/reference/generated-artifacts.md", renderGeneratedArtifactsReference());
  generated.push("docs/reference/generated-artifacts.md");
  await writeGenerated(projectRoot, "docs/reference/configuration.md", renderConfigurationReference());
  generated.push("docs/reference/configuration.md");

  const readmePath = join(projectRoot, "README.md");
  if (await readOptionalText(readmePath)) {
    const result = await updateReadme(readmePath, {
      blocks: ["command-count", "command-reference", "platform-matrix"],
      write,
    });
    managedBlocks.push(...result.changedBlocks);
  }

  return {
    generated,
    managed_blocks: managedBlocks,
    narrative_rewritten: false,
  };
}

export async function checkNarrativeDocsForRelease(projectRoot = ".") {
  const failures = [];
  for (const file of ["README.md", "docs/user-guide.md", "docs/developer.md"]) {
    const content = await readOptionalText(join(projectRoot, file));
    if (!content) continue;
    const countMatch = /\b(\d+)\s+(?:commands|command)|(\d+)\s*个用户指令/i.exec(content);
    const count = Number(countMatch?.[1] || countMatch?.[2] || NaN);
    if (Number.isFinite(count) && count !== userCommandCount()) {
      failures.push({ check: "stale-command-count", path: file, expected: userCommandCount(), actual: count });
    }
    if (/no\s+OpenCode\s+support|不支持\s*OpenCode/i.test(content)) {
      failures.push({ check: "stale-platform-claim", path: file, expected: "OpenCode supported" });
    }
  }
  return {
    ok: failures.length === 0,
    failures,
  };
}

export async function checkDocsLanguage(projectRoot = ".", options = {}) {
  const files = options.files || [
    "README.md",
    "docs/user-guide.md",
    "docs/developer.md",
    "docs/reference/commands.md",
    "docs/reference/platforms.md",
    "docs/reference/generated-artifacts.md",
    "docs/reference/configuration.md",
    "docs/platforms/codex.md",
    "docs/platforms/claude-code.md",
    "docs/platforms/opencode.md",
    "docs/platforms/cursor.md",
    "docs/platforms/copilot.md",
    "docs/platforms/trae.md",
    "references/commands-spec.md",
    "references/pr-spec.md",
    "references/explain-spec.md",
    "references/platform-claude.md",
  ];
  const failures = [];
  const checked = [];
  for (const file of files) {
    const content = await readOptionalText(join(projectRoot, file));
    if (!content) {
      failures.push({ check: "missing-doc", path: file });
      continue;
    }
    const sample = stripTechnicalText(content);
    const chineseChars = (sample.match(/[\u4e00-\u9fff]/g) || []).length;
    checked.push({ path: file, chinese_chars: chineseChars });
    if (chineseChars < 40) {
      failures.push({ check: "chinese-body", path: file, chinese_chars: chineseChars });
    }
  }
  return {
    ok: failures.length === 0,
    failures,
    checked,
  };
}

function checkReadmeNarrative(readme) {
  const failures = [];
  const checks = [
    ["full_test_matrix", /full test matrix|完整测试矩阵/i],
    ["release_internals", /git tag|git push|release commit|发布内部/i],
    ["adapter_runtime_details", /adapter runtime details|runtime hook implementation|适配器运行时细节/i],
    ["long_changelog", /## v\d+\.\d+\.\d+[\s\S]*## v\d+\.\d+\.\d+/i],
  ];
  for (const [name, pattern] of checks) {
    if (pattern.test(readme)) {
      failures.push({ check: "readme-must-not-include", item: name, message: `README includes ${name}` });
    }
  }
  return failures;
}

function renderUserGuide() {
  return [
    "# 用户指南",
    "",
    "Hypo-Workflow 围绕 `.pipeline/` 的状态、提示、报告、日志和恢复文件组织长周期 AI 编程工作。它不是 runner，真正的编码、测试和审查仍由当前宿主 Agent 完成。",
    "",
    "## 安装形态",
    "",
    "从当前宿主 Agent 对应的平台 Guide 开始。README 保持通用入口，具体安装或同步命令放在平台页面。",
    "",
    "| 平台 | 安装 / 同步入口 | Guide |",
    "|---|---|---|",
    "| Codex | 将仓库安装或 symlink 为 Codex Skill source。 | `docs/platforms/codex.md` |",
    "| Claude Code | 安装 `hw` plugin 或用 `--plugin-dir` 调试；项目内用 `hypo-workflow sync --platform claude-code --project .` 同步 hooks/agents。 | `docs/platforms/claude-code.md` |",
    "| OpenCode | 用 `hypo-workflow init-project --platform opencode --project .` 生成 native commands、agents、plugins 和 status artifacts。 | `docs/platforms/opencode.md` |",
    "| Cursor | 生成 `.cursor/rules/hypo-workflow.mdc`。 | `docs/platforms/cursor.md` |",
    "| GitHub Copilot | 生成 `.github/copilot-instructions.md`。 | `docs/platforms/copilot.md` |",
    "| Trae | 生成 `.trae/rules/project_rules.md`。 | `docs/platforms/trae.md` |",
    "",
    "## 常用流程",
    "",
    "- 用 `/hw:plan` 规划工作，再用 `/hw:start` 或 `/hw:resume` 执行。",
    "- 用 `/hw:status` 查看进度，用 `/hw:report` 查看报告。",
    "- 用 `/hw:explain [question]` 提问代码、配置、命令或近期改动原因；回答必须引用本地文件证据，证据不足时要明确 unknowns。",
    "- 用 `/hw:explain --subagent [question]` 让独立 Subagent 先做只读取证，主 Agent 校验 evidence packet 后再回答；平台不支持 Subagent 时记录 `fallback_reason` 并降级为 self evidence-first。",
    "- 用 `/hw:pr inspect|review|fix|merge|close <url|id>` 处理已有 GitHub PR 或 GitLab MR，并把本地证据归档到 `.pipeline/pr/`。",
    "- 用 `/hw:sync --repair` 修复派生上下文，用 `/hw:docs repair` 修复文档。",
    "- 生命周期 gate 处用 `/hw:accept` 或 `/hw:reject` 明确验收。",
    "",
    "## Explain 与 Status/Debug/Audit 的区别",
    "",
    "`/hw:explain` 是只读问答命令，适合解释新项目代码框架、某个配置为什么 strict、刚才为什么这样写，或者某个命令/文档的用途。它不修改文件，不替代 `/hw:status` 的进度摘要，也不替代 `/hw:debug` / `/hw:audit` 的问题定位和风险扫描。",
    "",
    "## Feature Queue",
    "",
    "Feature Queue 支持长周期规划，但不会把 Hypo-Workflow 变成 runner。",
    "",
    "- Use `/hw:plan --batch` to discover multiple Features and create a queue.",
    "- Use `/hw:plan --insert` to stage a natural-language queue edit before confirmation.",
    "- `.pipeline/feature-queue.yaml` stores Features, dependencies, gates, and scheduling metadata.",
    "- `.pipeline/metrics.yaml` stores duration, token, cost, and telemetry fallback summaries.",
    "- `upfront` decomposition writes milestones for the whole queue early.",
    "- `just_in_time` decomposition materializes milestones when a Feature becomes current.",
    "- `gate: confirm` pauses before work that requires explicit human review.",
    "- `auto_chain` can advance ready Features when gates and failure policy allow it.",
    "- `failure_policy: skip_defer` defers failed Features instead of blocking the whole queue.",
    "",
    "## 恢复",
    "",
    "结构化 execution lease 和生命周期日志会保存足够上下文，便于在支持的平台上安全 resume 或 handoff。",
  ].join("\n") + "\n";
}

function renderDeveloperGuide() {
  return [
    "# 开发者指南",
    "",
    "核心 helper 位于 `core/src/`，由 CLI、skills、OpenCode artifacts 和测试共用。开发时优先修改这些源头，再通过 docs/sync 刷新派生文档和平台适配器。",
    "",
    "## 合同",
    "",
    "- `.pipeline/` 是状态、Cycle、Rules、PROGRESS、logs、prompts 和 reports 的 source of truth。",
    "- Generated adapters 是派生产物，不能反向作为 authority。",
    "- 修改 `.pipeline/state.yaml`、`.pipeline/cycle.yaml`、`.pipeline/rules.yaml` 这类 protected authority 文件时，必须走生命周期命令或 workflow commit helper。",
    "- 命令、配置键、文件名和平台专有词保留英文；面向人的说明保持中文主体。",
  ].join("\n") + "\n";
}

function renderPlatformGuide(platform) {
  const title = platformTitle(platform);
  const capability = PLATFORM_CAPABILITIES[platform] || {};
  const base = [
    `# ${title} 指南`,
    "",
    "Hypo-Workflow 不直接运行项目工作；宿主 Agent 读取 `.pipeline/` 文件并完成实际实现、测试和审查。",
    "",
    "## 能力摘要",
    "",
    `- Commands: ${capability.commands || "supported"}.`,
    `- Ask gates: ${capability.ask || "supported"}.`,
    `- Plan support: ${capability.plan || "supported"}.`,
    `- Subagents: ${capability.subagents || "host-dependent"}.`,
    `- Events/hooks: ${capability.events || "host-dependent"}.`,
    `- Rules/instructions: ${capability.rules || "host-dependent"}.`,
    `- Recovery: ${capability.recovery || "pipeline-files"}.`,
  ];

  base.push("", "## 安装 / 同步", "", ...platformInstallLines(platform));
  base.push("", "## 支持能力", "", ...platformFeatureLines(platform));
  base.push("", "## 边界", "", ...platformBoundaryLines(platform));

  if (["cursor", "copilot", "trae"].includes(platform)) {
    base.push(
      "",
      "## 仓库指令文件",
      "",
      `Adapter target: \`${capability.adapter_target || capability.rules}\`.`,
      "",
      "这些 adapters 是仓库级 instruction files。它们告诉宿主 IDE Agent 阅读 `HypoxanthineOvO/Hypo-Workflow` 并遵循 README 快速入口；它们不提供 native Hook 或 lifecycle enforcement。",
      "",
      "继续保护 protected files，在完成前执行 preflight checks；当宿主支持 delegated work 时，尽量把 implementation 与 testing/review 分离。",
    );
  }

  if (platform === "claude-code") {
    base.push(
      "",
      "## Plugin Namespace",
      "",
      "Claude Code plugin name 有意设为 `hw`，因此现有 workflow skills 以 `/hw:*` 命令暴露。",
      "",
      "- The adapter uses the root `skills/` directory and existing workflow skills.",
      "- It does not generate `skills/hw-*` alias skills.",
      "- Claude native `/resume` belongs to Claude Code; Hypo workflow resume is `/hw:resume`.",
      "- `skills/resume/SKILL.md` intentionally omits a bare `name: resume` frontmatter field so metadata does not suggest a `/resume` alias.",
      "- Hook `matcher: resume` means Claude SessionStart resume event, not a user slash command.",
      "- Settings are merged through project-local `settings.local_file` policy.",
      "- DeepSeek and Mimo may be used through Claude Code agent routing when configured; this is separate from Codex Subagents.",
      "",
      "## Claude Code 内的可选 OpenAI Codex Plugin",
      "",
      "这和 Hypo-Workflow 的 `hw` plugin 是两件事。只有 capability detection 报告 `installed` 后，Claude Code 才能把实现工作委托给官方 OpenAI Codex plugin。",
      "",
      "```text",
      "/plugin marketplace add openai/codex-plugin-cc",
      "/plugin install codex@openai-codex",
      "/reload-plugins",
      "/codex:setup",
      "```",
      "",
      "Hypo-Workflow 可以把这些命令渲染成确认提案，但不得自动执行这些 slash commands。",
    );
  }

  if (platform === "opencode") {
    base.push(
      "",
      "## Model Matrix",
      "",
      "OpenCode 负责实际模型调用；Hypo-Workflow 只写入 role-aware agent metadata 和 config defaults。",
      "",
      "```yaml",
      "opencode:",
      "  compaction:",
      "    effective_context_target: 900000",
      "  agents:",
      "    plan:",
      "      model: gpt-5.5",
      "    compact:",
      "      model: deepseek-v4-flash",
      "    test:",
      "      model: deepseek-v4-pro",
      "    code-a:",
      "      model: mimo-v2.5-pro",
      "    code-b:",
      "      model: deepseek-v4-pro",
      "    debug:",
      "      model: gpt-5.5",
      "    docs:",
      "      model: deepseek-v4-pro",
      "    report:",
      "      model: deepseek-v4-flash",
      "```",
      "",
      "| Agent | Role | 发布默认 |",
      "|---|---|---|",
      "| `hw-compact` | context compaction | `deepseek-v4-flash` |",
      "| `hw-test` | test design and validation | `deepseek-v4-pro` |",
      "| `hw-code-a` | primary implementation | `mimo-v2.5-pro` |",
      "| `hw-code-b` | secondary implementation | `deepseek-v4-pro` |",
      "| `hw-docs` | documentation and release notes | `deepseek-v4-pro` |",
      "| `hw-report` | report synthesis | `deepseek-v4-flash` |",
    );
  }

  return base.join("\n") + "\n";
}

function platformInstallLines(platform) {
  if (platform === "codex") {
    return [
      "本地 checkout 安装：",
      "",
      "```bash",
      "git clone https://github.com/HypoxanthineOvO/Hypo-Workflow.git ~/.codex/skills/hypo-workflow",
      "```",
      "",
      "开发时建议 symlink 当前 checkout，而不是复制一份：",
      "",
      "```bash",
      "mkdir -p ~/.codex/skills",
      "ln -sfn /absolute/path/to/Hypo-Workflow ~/.codex/skills/hypo-workflow",
      "```",
      "",
      "随后在 Codex 中调用 Hypo-Workflow skills。若项目已经暴露 `/hw:*`，使用 canonical `/hw:init`、`/hw:plan` 和 `/hw:start` 流程。",
    ];
  }
  if (platform === "claude-code") {
    return [
      "校验本地 checkout：",
      "",
      "```bash",
      "claude plugin validate /absolute/path/to/Hypo-Workflow",
      "```",
      "",
      "作为开发插件运行当前 checkout：",
      "",
      "```bash",
      "claude --plugin-dir /absolute/path/to/Hypo-Workflow",
      "```",
      "",
      "如需持久安装，在 Claude Code 内添加 marketplace source 并安装 `hw` plugin：",
      "",
      "```text",
      "/plugin marketplace add HypoxanthineOvO/Hypo-Workflow",
      "/plugin install hw@hypoxanthine-hypo-workflow",
      "/reload-plugins",
      "```",
      "",
      "在项目内生成 project-local settings、hooks、agents、monitors 和 metadata：",
      "",
      "```bash",
      "hypo-workflow sync --platform claude-code --project .",
      "```",
    ];
  }
  if (platform === "opencode") {
    return [
      "用 native OpenCode artifacts 初始化项目：",
      "",
      "```bash",
      "hypo-workflow init-project --platform opencode --project . --automation balanced",
      "```",
      "",
      "刷新已有项目：",
      "",
      "```bash",
      "hypo-workflow sync --platform opencode --project . --repair",
      "```",
    ];
  }
  if (platform === "cursor") {
    return [
      "生成 Cursor rule file：",
      "",
      "```bash",
      "hypo-workflow sync --platform cursor --project .",
      "```",
      "",
      "Target: `.cursor/rules/hypo-workflow.mdc`.",
    ];
  }
  if (platform === "copilot") {
    return [
      "生成 GitHub Copilot repository instructions：",
      "",
      "```bash",
      "hypo-workflow sync --platform copilot --project .",
      "```",
      "",
      "Target: `.github/copilot-instructions.md`.",
    ];
  }
  return [
    "生成 Trae project rule：",
    "",
    "```bash",
    "hypo-workflow sync --platform trae --project .",
    "```",
    "",
    "Target: `.trae/rules/project_rules.md`.",
  ];
}

function platformFeatureLines(platform) {
  const common = [
    "- 读取 `.pipeline/` state、config、Cycle、Rules/Habits、prompts、reports、logs 和 review artifacts。",
    "- 使用 canonical `/hw:*` workflow vocabulary：init、plan、start/resume、status/report、sync/docs、rules、patch、release。",
    "- 支持 `/hw:explain` 作为只读 evidence-first 问答命令，用于解释代码、配置、命令、报告和近期改动。",
    "- 除非生命周期命令明确拥有写入权，否则保护 protected authority files。",
  ];
  if (platform === "codex") {
    return [
      ...common,
      "- 使用 Codex skills，并在可用时使用 Codex plan tool。",
      "- 对非平凡实现或审查工作优先使用 Codex Subagents，同时保持 implementation 与 testing/review 分离。",
      "- 不要求外部模型路由；Codex Subagents 留在 Codex/GPT runtime。",
    ];
  }
  if (platform === "claude-code") {
    return [
      ...common,
      "- 通过 `hw` Claude Code plugin namespace 暴露 `/hw:*`。",
      "- 生成 project-local hooks，用于 SessionStart、Stop、PermissionRequest、compact resume 和 progress/status refresh。",
      "- 为 plan、code、test、review、debug、docs、report、compact 角色生成 Claude agents 和 routing metadata。",
      "- 检测到官方 OpenAI Codex plugin 已安装后，可选择性用于 implementation delegation。",
    ];
  }
  if (platform === "opencode") {
    return [
      ...common,
      "- 生成 native `/hw-*` slash command files。",
      "- 生成 OpenCode role agents、plugin runtime files、status sidecars 和 TUI/status config。",
      "- 用 native `question` 处理必要决策，用 `todowrite` 保持可见计划纪律。",
      "- 支持 OpenCode provider/model matrix metadata，但不把 Hypo-Workflow 变成 runner。",
    ];
  }
  return [
    ...common,
    "- 提供 repository-level instructions，让宿主 IDE Agent 可以遵循 Hypo-Workflow contract。",
    "- 携带 protected-file、preflight、rules 和 implementation/test separation 指导。",
  ];
}

function platformBoundaryLines(platform) {
  const common = [
    "- Hypo-Workflow 不是 runner；implementation、tests 和 review 由宿主 Agent 执行。",
    "- `.pipeline/state.yaml`、`.pipeline/cycle.yaml` 和 `.pipeline/rules.yaml` 是 protected authority files。",
    "- External installs、user-level config writes、destructive commands 和 network side effects 必须显式确认。",
  ];
  if (["cursor", "copilot", "trae"].includes(platform)) {
    return [
      ...common,
      "- 这个 adapter 只是 instruction surface，不声明 native hooks、lifecycle enforcement、background execution 或 automatic recovery。",
    ];
  }
  if (platform === "claude-code") {
    return [
      ...common,
      "- Project settings 采用保守 merge；user-owned settings conflicts 不得静默覆盖。",
      "- Claude Code 内的 Codex plugin installation 是独立的 explicit-confirmation flow。",
    ];
  }
  if (platform === "opencode") {
    return [
      ...common,
      "- OpenCode-specific events 和 plugins 是增量能力；Codex 和 Claude Code 行为不得依赖它们。",
    ];
  }
  return common;
}

function platformTitle(platform) {
  if (platform === "claude-code") return "Claude Code";
  if (platform === "opencode") return "OpenCode";
  if (platform === "cursor") return "Cursor";
  if (platform === "copilot") return "GitHub Copilot";
  if (platform === "trae") return "Trae";
  return "Codex";
}

function renderCommandsReference() {
  const rows = CANONICAL_COMMANDS.map((command) => (
    `| \`${command.canonical}\` | \`${command.opencode}\` | \`${command.agent}\` | \`${command.skill}\` |`
  ));
  return [
    "# 命令参考",
    "",
    `本页由 \`core/src/commands/index.js\` 生成。当前用户命令数量：${userCommandCount()}。命令名、平台映射和 Skill 路径保留英文/代码格式。阅读时以 Canonical 列为用户入口，以 OpenCode 列为平台映射；新增或删除命令必须先修改 command registry，再刷新本页。`,
    "",
    "| Canonical | OpenCode | Agent | Skill |",
    "|---|---|---|---|",
    ...rows,
  ].join("\n") + "\n";
}

function renderPlatformsReference() {
  const rows = Object.entries(PLATFORM_CAPABILITIES).map(([platform, capability]) => (
    `| ${platform} | ${capability.commands} | ${capability.ask} | ${capability.plan} | ${capability.events} |`
  ));
  return [
    "# 平台参考",
    "",
    "本页汇总各平台的 command、Ask、Plan 和事件能力。第三方 IDE adapter 只提供仓库指令，不代表 native hook 或自动执行能力。平台能力表用于避免夸大自动化边界，也方便用户判断当前宿主 Agent 能支持哪些 Hypo-Workflow 行为。",
    "",
    "| Platform | Commands | Ask | Plan | Events |",
    "|---|---|---|---|---|",
    ...rows,
  ].join("\n") + "\n";
}

function renderGeneratedArtifactsReference() {
  return [
    "# 派生产物参考",
    "",
    "这些文件由 core helper 或 sync/docs 命令生成。修改时应回到 source helper 或 authority 文件，再运行 repair/sync。不要直接把派生产物当成 source of truth；如果派生产物 stale，优先检查对应 source 和 writer command。",
    "",
    "| Artifact | Source | Repair |",
    "|---|---|---|",
    "| `.opencode/commands/hw-*.md` | command registry | `/hw:sync` |",
    "| `.opencode/agents/hw-*.md` | OpenCode artifact helper | `/hw:sync` |",
    "| `.cursor/rules/hypo-workflow.mdc` | third-party adapter helper | `/hw:sync --platform cursor` |",
    "| `.github/copilot-instructions.md` | third-party adapter helper | `/hw:sync --platform copilot` |",
    "| `.trae/rules/project_rules.md` | third-party adapter helper | `/hw:sync --platform trae` |",
    "| `.pipeline/*.compact.*` | `.pipeline/` authority files | `/hw:sync --repair` |",
    "| `docs/reference/*.md` | docs map | `/hw:docs repair` |",
    "| README managed blocks | command/platform helpers | `/hw:docs repair` |",
  ].join("\n") + "\n";
}

function stripTechnicalText(content) {
  return String(content || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/^\|.*\|$/gm, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[A-Z0-9_.:/-]+/g, " ");
}

function renderConfigurationReference() {
  const profileSections = renderDefaultConfigurationProfiles();
  return [
    "# 配置治理参考",
    "",
    "本页是面向用户和 Agent 的配置治理矩阵。配置的解析顺序是 project config > global config > built-in default；project config 通常是 `.pipeline/config.yaml`，global config 通常是 `~/.hypo-workflow/config.yaml`。Hypo-Workflow 不是后台 runner，配置只决定 Agent 如何规划、执行、审查和确认。",
    "",
    "## 配置层级",
    "",
    "| 层级 | 文件 | 用途 | 写入边界 |",
    "|---|---|---|---|",
    "| Project | `.pipeline/config.yaml` | 当前项目的 workflow、执行、文档和平台覆盖项 | `/hw:init`、`/hw:plan:generate` 或明确配置编辑 |",
    "| Global | `~/.hypo-workflow/config.yaml` | 用户级默认平台、profile、model pool、automation、output | `/hw:setup` 或全局 TUI 确认写入 |",
    "| Cycle | `.pipeline/cycle.yaml` | 当前 Cycle 的 workflow_kind、preset、lifecycle_policy 和 gates | `/hw:cycle`、`/hw:plan:generate`、accept/reject 生命周期命令 |",
    "| Rules | `.pipeline/rules.yaml` | 项目级 rule severity 和 guard 覆盖 | `/hw:rules` 或明确用户确认 |",
    "",
    "## 自动程度与 hard gates",
    "",
    "| 字段 | 默认/常见值 | 自动化影响 | 严格度影响 | 人工确认边界 |",
    "|---|---|---|---|---|",
    "| `automation.level` | `manual` / `balanced` / `full` | 决定普通执行是否尽量自动推进 | 不得降低 hard gates | 不能跳过 destructive/external、release publish、PR/MR remote write |",
    "| `automation.gates.planning` | `confirm` | P2/P4 规划确认 | 规划 gate 是 hard gate | P2 milestone split 和 P4 final plan confirmation 需要确认 |",
    "| `automation.gates.execution` | `auto` | 普通 Milestone 可自动推进 | strict review 仍可阻塞 | 仅适用于普通本地执行 |",
    "| `automation.gates.destructive_external` | `confirm` | 破坏性或外部副作用不可自动执行 | 所有 profile 都保持确认 | destructive commands、external side effects |",
    "| `automation.gates.release_publish` | `confirm` | release publish 不自动执行 | release/tag/push 前确认 | tag、push、publish |",
    "| `cycle.lifecycle_policy.gates.high_risk` | `confirm` | 当前 Cycle 的高风险动作 gate | 高风险动作不得因 auto_continue 放开 | PR/MR remote write、plugin install、user-level config write |",
    "| `cycle.lifecycle_policy.gates.pr_remote_write` | `confirm` | PR/MR 写远端需要确认 | 比普通 execution 更严格 | push、merge、close、reviewer/label/target branch 写入 |",
    "| `cycle.lifecycle_policy.gates.plugin_install` | `confirm` | 插件安装需要确认 | user-level 或 remote install 不自动 | Claude/Codex/OpenCode plugin install |",
    "| `cycle.lifecycle_policy.gates.user_level_config` | `confirm` | 写用户级配置需要确认 | 不可由项目流程静默写入 | `~/.claude`、`~/.codex`、`~/.hypo-workflow` |",
    "",
    "## 规划与执行严格度",
    "",
    "| 字段 | 作用 | 常见策略 |",
    "|---|---|---|",
    "| `plan.mode` | `interactive` 会进行 P1-P4 gate；`auto` 只在配置允许时自动总结通过 | 用户参与规划时用 `interactive` |",
    "| `plan.interaction_depth` | `low`/`medium`/`high` 控制 P1 最少追问轮数 | 复杂 Cycle 用 `high` |",
    "| `plan.interactive.require_explicit_confirm` | 是否要求明确 P4 确认 | 团队或高风险项目设为 `true` |",
    "| `execution.mode` | `self`、subagent 或 host-specific execution mode | Codex 默认主 Agent 编排，必要时使用 Subagents |",
    "| `execution.worker_separation.mode` | `off` / `recommended` / `strict` | `recommended` 尽量分离 implement/test/audit；`strict` 不接受降级为 fully accepted |",
    "| `execution.step_overrides.review_tests.strict` | 测试审查是否严格阻塞 | release/team 模式可设更严格 |",
    "| `execution.step_overrides.review_code.strict` | 代码审查是否严格阻塞 | 关键功能建议更严格 |",
    "| `acceptance.mode` | `auto`、`manual`、`timeout` 或 legacy `confirm` 控制交付接受方式 | 手动验收或团队流程用 `manual`/`confirm` |",
    "| `evaluation.max_diff_score` | diff score 超阈值可触发警告或修复 | 越低越保守 |",
    "",
    "## Analysis preset 边界",
    "",
    "| 字段 | manual | hybrid | auto |",
    "|---|---|---|---|",
    "| `execution.analysis.interaction_mode` | 只读分析优先 | 改代码前确认 | 可在边界内自动改代码 |",
    "| `execution.analysis.boundaries.code_changes` | `deny` | `confirm` | `allow` |",
    "| `execution.analysis.boundaries.restart_services` | `confirm` | `confirm` | `confirm` |",
    "| `execution.analysis.boundaries.install_system_dependencies` | `ask` | `ask` | `ask` |",
    "| `execution.analysis.boundaries.network_remote_resources` | `ask` | `ask` | `allow` |",
    "| `execution.analysis.boundaries.destructive_or_external_side_effects` | `ask` | `ask` | `ask` |",
    "",
    "## Legacy auto 字段",
    "",
    "| 字段 | 兼容含义 | 不允许做的事 |",
    "|---|---|---|",
    "| `evaluation.auto_continue` | 普通评估通过后可继续 | 不能跳过 planning、destructive/external、release publish、PR/MR remote write |",
    "| `batch.auto_chain` | Feature/Milestone 队列通过后可自动推进 | 不能跳过 `gate: confirm` |",
    "| `batch.default_gate` | 新 Feature 默认 gate | 不能覆盖 Cycle high-risk gates |",
    "| `opencode.auto_continue` | OpenCode 平台普通执行可继续 | 不能代表远端写或插件安装确认 |",
    "",
    "## 默认配置组合",
    "",
    "默认配置组合是给 `/hw:setup`、项目初始化和人工选型使用的保守模板。它们可以减少配置字段选择成本，但不能覆盖 high-risk hard gates；PR/MR remote write、插件安装、用户级配置写入、destructive/external side effects 和 release publish 始终需要确认。",
    "",
    "| Profile | 适用场景 | 自动程度 | 严格程度 | 固定确认边界 |",
    "|---|---|---|---|---|",
    ...listConfigurationProfiles().map((profile) => (
      `| \`${profile.key}\` | ${profile.description} | \`${profile.config.automation?.level || "manual"}\` | \`${profile.config.execution?.worker_separation?.mode || "recommended"}\` | PR/MR remote write、plugin install、user-level config、destructive_external、release_publish |`
    )),
    "",
    "### 可复制片段",
    "",
    ...profileSections,
    "",
    "## 平台配置差异",
    "",
    "| 平台 | 配置重点 | 边界 |",
    "|---|---|---|",
    "| Codex | Codex Skills、Subagents、preflight、continuation | Codex Subagents 留在 Codex/GPT runtime；不要求外部模型路由 |",
    "| Claude Code | `hw` plugin、hooks、agents、settings merge、可选 Codex plugin detection | Claude 原生命令和 Hypo `/hw:*` 必须分离；plugin install/user-level settings 需要确认 |",
    "| OpenCode | native commands、agents、plugins、TUI/status、model matrix | OpenCode 执行模型调用；Hypo-Workflow 只生成 metadata 和指令 |",
    "| Cursor / Copilot / Trae | repository instruction files | 仅提供规则/说明，不声明 hook、runner 或 lifecycle enforcement |",
    "",
    "## 用户选择提示",
    "",
    "- 想少打断普通开发：选择 `balanced` 或后续 `solo-auto` profile，但保留 high-risk confirm。",
    "- 想每一步都稳：选择 `manual-review`，让规划、review、PR/MR、release 更频繁停顿。",
    "- 团队协作或 release 前：选择 `team-strict`，要求更强 review 和 worker separation evidence。",
    "- 调查问题但不想先改代码：选择 `analysis-hybrid`，允许证据收集，代码变更前确认。",
  ].join("\n") + "\n";
}

function renderDefaultConfigurationProfiles() {
  return listConfigurationProfiles().flatMap((profile) => [
    `#### ${profile.key}`,
    "",
    profile.description,
    "",
    "```yaml",
    profile.yaml.trimEnd(),
    "```",
    "",
  ]);
}

function userCommandCount() {
  return CANONICAL_COMMANDS.length;
}

async function writeGenerated(projectRoot, relativePath, content) {
  const path = join(projectRoot, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

async function readOptionalText(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}
