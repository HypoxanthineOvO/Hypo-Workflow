import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { commandMap } from "../commands/index.js";
import { PLATFORM_CAPABILITIES } from "../platform/index.js";

const DEFAULT_README_CONFIG = Object.freeze({
  mode: "loose",
  full_regen: "auto",
});

const USER_COMMANDS = commandMap("opencode");

export function defaultReadmeConfig() {
  return { ...DEFAULT_README_CONFIG };
}

export function renderReadmeBlock(block, context = {}) {
  switch (block) {
    case "badges":
      return renderBadges(context);
    case "feature-summary":
      return renderFeatureSummary();
    case "command-count":
      return renderCommandCount();
    case "command-reference":
      return renderCommandReference();
    case "platform-matrix":
      return renderPlatformMatrix();
    case "release-summary":
      return renderReleaseSummary();
    case "version-history":
      return renderVersionHistory(context);
    default:
      throw new Error(`Unknown README block: ${block}`);
  }
}

export function replaceManagedBlock(source, block, replacement, options = {}) {
  const policy = { ...DEFAULT_README_CONFIG, ...(options || {}) };
  const begin = `<!-- HW:README:BEGIN ${block} -->`;
  const end = `<!-- HW:README:END ${block} -->`;
  const pattern = new RegExp(`${escapeRegExp(begin)}[\\s\\S]*?${escapeRegExp(end)}`);

  if (!pattern.test(source)) {
    if (policy.mode === "strict") {
      throw new Error(`missing managed README block: ${block}`);
    }
    return source;
  }

  return source.replace(pattern, `${begin}\n${replacement.trim()}\n${end}`);
}

export async function updateReadme(readmeFile = "README.md", options = {}) {
  if (options.write) throw readmeWriteRetiredError();

  const policy = { ...DEFAULT_README_CONFIG, ...(options.policy || {}) };
  const blocks = options.blocks || [
    "badges",
    "feature-summary",
    "command-count",
    "command-reference",
    "platform-matrix",
    "release-summary",
    "version-history",
  ];
  const original = await readFile(readmeFile, "utf8");
  let next = original;
  const changedBlocks = [];
  const warnings = [];

  for (const block of blocks) {
    const rendered = renderReadmeBlock(block, options.context || {});
    const before = next;
    try {
      next = replaceManagedBlock(next, block, rendered, policy);
    } catch (error) {
      warnings.push({ block, message: error.message });
      throw error;
    }
    if (next !== before) changedBlocks.push(block);
  }

  return {
    changed: next !== original,
    changedBlocks,
    fullRegenerated: false,
    warnings,
    content: next,
  };
}

function readmeWriteRetiredError() {
  const error = new Error("README generation writes are retired; call without write:true for a zero-write preview.");
  error.code = "ERR_HYPO_WORKFLOW_README_WRITE_RETIRED";
  error.status = "removed";
  error.writes = [];
  return error;
}

export async function checkReadmeFreshness(readmeFile = "README.md", options = {}) {
  const projectRoot = options.projectRoot || ".";
  const readme = await readFile(readmeFile, "utf8");
  const version = await readVersion(projectRoot);
  const commandCount = await readCommandCount(projectRoot);
  const failures = [];

  if (version && !readme.includes(`version-${version}`) && !readme.includes(`v${version}`)) {
    failures.push({
      check: "version",
      expected: version,
      message: `README version does not match ${version}`,
    });
  }

  const commandPatterns = [
    `${commandCount} 个用户指令`,
    `${commandCount} 个 canonical 命令`,
    `${commandCount} user`,
    `${commandCount} commands`,
    ...(commandCount === 10 ? ["十个公开入口", "Ten Public Routes"] : []),
  ];
  if (!commandPatterns.some((pattern) => readme.includes(pattern))) {
    failures.push({
      check: "command-count",
      expected: commandCount,
      message: `README command count does not match ${commandCount}`,
    });
  }

  for (const match of readme.matchAll(/(\d+)\s*个\s*(?:用户指令|canonical\s*命令)|(\d+)\s+(?:user-facing\s+)?commands?/gi)) {
    const count = Number(match[1] || match[2]);
    if (Number.isFinite(count) && count !== commandCount) {
      failures.push({
        check: "stale-command-count",
        expected: commandCount,
        actual: count,
        message: `README contains stale command count ${count}`,
      });
    }
  }

  if (!readme.includes("Official Codex")) {
    failures.push({
      check: "platform-entry",
      expected: "Official Codex",
      message: "README must identify Official Codex as the current support surface",
    });
  }

  if (!readme.includes("HypoxanthineOvO/Hypo-Workflow")) {
    failures.push({
      check: "repository-import",
      expected: "HypoxanthineOvO/Hypo-Workflow",
      message: "README is missing shared repository install/import wording",
    });
  }

  if (!/## 安装|## Install|快速开始|Quick Start/.test(readme)) {
    failures.push({
      check: "quick-start",
      expected: "安装 / Install",
      message: "README is missing an installation entrypoint",
    });
  }

  if (!/\/hw:init[\s\S]*\/hw:(?:goal|cycle|experiment)/.test(readme)) {
    failures.push({
      check: "workflow-entrypoint",
      expected: "/hw:init with Goal, Cycle, or Experiment",
      message: "README is missing the current workflow entrypoints",
    });
  }

  if (!/\/hw:resume/.test(readme)) {
    failures.push({
      check: "resume-flow",
      expected: "/hw:resume",
      message: "README is missing the public Resume route",
    });
  }

  if (!/(test|测试)[\s\S]*(implement|实现)[\s\S]*(audit|审查)|(?:audit|审查)[\s\S]*(test|测试)[\s\S]*(implement|实现)/i.test(readme)) {
    failures.push({
      check: "worker-separation",
      expected: "test / implement / audit role separation",
      message: "README is missing risk-based Worker separation guidance",
    });
  }

  if (/Codex Subagents?[\s\S]*(DeepSeek|Mimo|Claude model|外部模型|外部 provider|external model)/i.test(readme)) {
    failures.push({
      check: "codex-external-model-routing",
      expected: "no external model routing for Codex Subagents",
      message: "README must not describe external model routing for Codex Subagents",
    });
  }

  const firstScreen = readme.split(/\n## 文档\b|\n## Documentation\b/)[0] || readme;
  const firstScreenChecks = [
    ["HypoxanthineOvO/Hypo-Workflow", /HypoxanthineOvO\/Hypo-Workflow/],
    ["Official Codex", /Official Codex/],
    ["Goal, Cycle, and Experiment", /\/hw:goal[\s\S]*\/hw:cycle[\s\S]*\/hw:experiment/],
    ["/hw:resume", /\/hw:resume/],
  ];
  for (const [expected, pattern] of firstScreenChecks) {
    if (!pattern.test(firstScreen)) {
      failures.push({
        check: "first-screen-entrypoint",
        expected,
        message: `README first screen is missing ${expected}`,
      });
    }
  }

  return {
    fresh: failures.length === 0,
    failures,
  };
}

function renderBadges(context) {
  const version = context.version || "10.0.1";
  return [
    `[![Version](https://img.shields.io/badge/version-${version}-blue)](.claude-plugin/plugin.json)`,
    "[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)",
    "[![Platform](https://img.shields.io/badge/platform-Codex%20%7C%20Claude%20Code%20%7C%20OpenCode%20%7C%20Cursor%20%7C%20Copilot%20%7C%20Trae-purple)](#平台入口)",
  ].join("\n");
}

function renderFeatureSummary() {
  return [
    "| 能力 | 说明 |",
    "|---|---|",
    "| Pipeline 执行 | 按 preset 串行执行 prompts，并持久化状态、日志和报告 |",
    "| Plan Mode | Discover -> Decompose -> Generate -> Confirm 的交互式规划闭环 |",
    "| Lifecycle | init、check、audit、debug、release、cycle、patch、compact、showcase |",
    "| Rules | 使用内置和自定义规则固化 Agent 行为约束 |",
    "| 多平台 | Codex、Claude Code、OpenCode、Cursor、GitHub Copilot、Trae 共享 `.pipeline/` 文件协议 |",
  ].join("\n");
}

function renderCommandCount() {
  return `当前版本提供 **${USER_COMMANDS.length} 个用户指令**，另有 **1 个内部 watchdog** skill。`;
}

function renderCommandReference() {
  const rows = USER_COMMANDS.map((command) => (
    `| \`${command.canonical}\` | \`${command.opencode}\` | \`${command.agent}\` | \`${command.skill}\` |`
  ));
  return ["| Canonical | OpenCode | Agent | Skill |", "|---|---|---|---|", ...rows].join("\n");
}

function renderPlatformMatrix() {
  const rows = Object.entries(PLATFORM_CAPABILITIES).map(([platform, capability]) => (
    `| ${displayPlatform(platform)} | ${capability.commands} | ${capability.ask} | ${capability.plan} | ${capability.events} |`
  ));
  return ["| 平台 | Commands | Ask | Plan | Events |", "|---|---|---|---|---|", ...rows].join("\n");
}

function renderReleaseSummary() {
  return [
    "发布流程：交付前检查 -> 回归 -> 版本更新 -> update_readme -> readme-freshness -> changelog -> commit/tag/push Gate。",
    "",
    "- `update_readme` 在版本文件更新后、release commit 前执行。",
    "- `readme-freshness` 检查版本、命令数量、平台入口、功能摘要和发布摘要。",
    "- tag 和 push 保持显式确认 Gate。",
  ].join("\n");
}

function renderVersionHistory(context) {
  const version = context.version || "10.0.1";
  return `当前版本：v${version}。近期变更见 CHANGELOG。`;
}

export function platformDisplayNames() {
  return Object.keys(PLATFORM_CAPABILITIES).map(displayPlatform);
}

async function readVersion(projectRoot) {
  try {
    const raw = await readFile(join(projectRoot, ".claude-plugin", "plugin.json"), "utf8");
    return JSON.parse(raw).version;
  } catch {
    return null;
  }
}

async function readCommandCount(projectRoot) {
  void projectRoot;
  return USER_COMMANDS.length;
}

function displayPlatform(platform) {
  if (platform === "claude-code") return "Claude Code";
  if (platform === "opencode") return "OpenCode";
  if (platform === "cursor") return "Cursor";
  if (platform === "copilot") return "GitHub Copilot";
  if (platform === "trae") return "Trae";
  return "Codex";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
