import {
  ASK_QUESTIONS_GUIDANCE,
  CONSULTATION_FIRST_ACTION_BOUNDARY_GUIDANCE,
  FOUR_RULE_DISCIPLINE_GUIDANCE,
  HOOKLESS_WORKFLOW_GUIDANCE,
} from "./agent-guidance.js";

// C027：AGENTS.md 生成做实。单一原则源拼装，不复制大提示词、不生成宿主专属机器。
// 生成入口：scripts/generate-agents.mjs。手改 AGENTS.md 后必须同步这里，否则下次生成会冲掉。

const RUNTIME_CONTRACT = `## Runtime contract

- Hypo-Workflow is not a runner; the host Agent performs the actual work.
- Daily authority: \`.pipeline/INDEX.md\` and the active Cycle's \`PLAN.md\` / \`PROGRESS.md\` / \`EXECUTION.md\` / \`DISCUSSION-SUMMARY.md\`. Recovery reads the project index first, then the focused Cycle's files.
- \`.pipeline/manifest.yaml\`、旧 runtime 对象与机器时代文件已随 C027 拆除；历史追溯以 \`.pipeline/cycles\` 与 \`.pipeline/memory\` 的语义文件为准。
- Use \`question\` for required user decisions.
- Use \`todowrite\` for visible plan discipline, especially in \`/hw-plan*\` commands.`;

const COMPLETION_SURFACE = `## Completion and report surface

When a Workflow writes a report, debug artifact, audit artifact, Cycle summary, or Milestone completion, the final chat response must include the core report content: conclusion/change summary, technical approach, modified files/modules, test design, validation results, expected result, problems encountered, and risks/follow-up. A bare path such as "written to \`.pipeline/...\`" is insufficient.

The final response must also explain the substance of the report in the conversation before or alongside artifact paths. Do not only list \`.pipeline/...\` files, worker closures, YAML validity, and test counts. For every important report or review artifact, summarize what it contains, the main conclusion, the user-facing interpretation, and what the user should understand or do next.`;

const PROTECTED_AND_ANALYSIS = `## Protected files

旧机器权威文件已随 C027 拆除；破坏性操作由宿主权限与讨论门兜底。对 \`.pipeline\` 历史目录的批量删除必须在 Plan 的 Stone 清单中逐项确认，并保证 git 可回滚。

## Analysis boundary

When \`execution.steps.preset=analysis\`, read \`.opencode/hypo-workflow.json.analysis\` before acting.

- \`manual\`: deny code changes.
- \`hybrid\`: propose code changes and confirm before editing.
- \`auto\`: code changes are allowed inside the configured boundaries.
- Service restarts require confirmation.
- System-level dependency installation requires an explicit ask.
- Network, remote-resource, destructive, and external side-effect boundaries must be honored exactly as configured.`;

const ACTIVE_RULES = `## Active Rules/Habits

约束级与指导级规则的人读权威在 \`.pipeline/memory/global/\`（\`memory/INDEX.md\` 按约束等级分组）；下面是当前活跃清单：

- claude-hw-command-namespace (constraint/workflow): Claude Code integration must expose Hypo-Workflow commands through the \`hw\` plugin namespace as \`/hw:*\` slash commands while keeping Claude native \`/resume\` separate from Hypo \`/hw:resume\`.
- opencode-bash-auto-policy (constraint/guard): OpenCode execution should use native schema-compatible YOLO permissions: generated \`opencode.json\` and OpenCode agent frontmatter should use \`allow\`, not \`ask\` or unsupported \`bypass\`.
- prefer-chinese-output (guideline/style): 面向用户的说明、README 更新、PROGRESS 摘要和交互提示优先使用中文。命令名、配置键、文件名和专有英文术语保持英文。
- 讨论完成门、澄清先行、反脚手架等约束级规则见 \`.pipeline/memory/INDEX.md\` 的约束级分组。`;

export function buildAgentsDocument() {
  return `# Hypo-Workflow managed OpenCode instructions

This file is Hypo-Workflow managed. Edit \`core/src/artifacts/agents-template.js\` (原则源) when possible, then regenerate with \`node scripts/generate-agents.mjs\`.

${CONSULTATION_FIRST_ACTION_BOUNDARY_GUIDANCE}

${FOUR_RULE_DISCIPLINE_GUIDANCE}

${ASK_QUESTIONS_GUIDANCE}

${RUNTIME_CONTRACT}

${COMPLETION_SURFACE}

${HOOKLESS_WORKFLOW_GUIDANCE}

${PROTECTED_AND_ANALYSIS}

${ACTIVE_RULES}
`;
}
