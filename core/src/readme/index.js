import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { commandMap } from "../commands/index.js";
import { PLATFORM_CAPABILITIES } from "../platform/index.js";

const DEFAULT_README_CONFIG = Object.freeze({
  mode: "loose",
  full_regen: "auto",
});

const USER_COMMANDS = commandMap("opencode");
const ALLOWED_README_TERMS = Object.freeze([
  "Hypo-Workflow",
  "AI",
  "Agent",
  "IDE",
  "Codex",
  "Claude Code",
  "OpenCode",
  "Cursor",
  "GitHub Copilot",
  "Trae",
  "Subagents",
  "Codex/GPT",
  "GPT",
  "watchdog",
  "Feature",
  "Feature Queue",
  "MIT License",
  "License",
  "README",
]);
const DISALLOWED_README_PROSE = Object.freeze([
  /\bAI coding\b/i,
  /\brunner\b/i,
  /\bbackground service\b/i,
  /\brepository instructions\b/i,
  /\bsource of truth\b/i,
  /\blifecycle enforcement\b/i,
  /\bpreflight\b/i,
  /\bruntime\b/i,
  /\bstate\b/i,
  /\brules\b/i,
  /\bprompts\b/i,
  /\breports\b/i,
  /\blogs\b/i,
]);

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

  if (options.write && next !== original) {
    await writeFile(readmeFile, next.endsWith("\n") ? next : `${next}\n`, "utf8");
  }

  return {
    changed: next !== original,
    changedBlocks,
    fullRegenerated: false,
    warnings,
    content: next,
  };
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

  for (const platform of platformDisplayNames()) {
    if (!readme.includes(platform)) {
      failures.push({
        check: "platform-entry",
        expected: platform,
        message: `README platform entry is missing ${platform}`,
      });
    }
  }

  if (!readme.includes("HypoxanthineOvO/Hypo-Workflow")) {
    failures.push({
      check: "repository-import",
      expected: "HypoxanthineOvO/Hypo-Workflow",
      message: "README is missing shared repository install/import wording",
    });
  }

  if (!/快速开始|Quick Start/.test(readme)) {
    failures.push({
      check: "quick-start",
      expected: "快速开始",
      message: "README is missing a Chinese Quick Start entrypoint",
    });
  }

  if (!/\/hw:init[\s\S]*\/hw:plan[\s\S]*\/hw:start/.test(readme)) {
    failures.push({
      check: "start-flow",
      expected: "/hw:init -> /hw:plan -> /hw:start",
      message: "README is missing the primary start flow",
    });
  }

  if (!/\/hw:status[\s\S]*\/hw:resume/.test(readme)) {
    failures.push({
      check: "resume-flow",
      expected: "/hw:status -> /hw:resume",
      message: "README is missing the status/resume flow",
    });
  }

  if (!/Subagents?[\s\S]*(测试|审查|review)|(?:测试|审查|review)[\s\S]*Subagents?/i.test(readme)) {
    failures.push({
      check: "subagent-guidance",
      expected: "Subagents and testing/review separation",
      message: "README is missing high-level Subagent and validation separation guidance",
    });
  }

  if (!/Codex Subagents?[\s\S]*优先[\s\S]*(测试|审查)|(?:测试|审查)[\s\S]*Codex Subagents?[\s\S]*优先/i.test(readme)) {
    failures.push({
      check: "codex-subagent-priority",
      expected: "Codex Subagents 优先 and 测试/审查分离",
      message: "README is missing explicit Codex Subagents priority guidance",
    });
  }

  if (/Codex Subagents?[\s\S]*(DeepSeek|Mimo|Claude model|外部模型|外部 provider|external model)/i.test(readme)) {
    failures.push({
      check: "codex-external-model-routing",
      expected: "no external model routing for Codex Subagents",
      message: "README must not describe external model routing for Codex Subagents",
    });
  }

  const firstScreen = readme.split(/\n## 常用命令\b/)[0] || readme;
  const firstScreenChecks = [
    ["HypoxanthineOvO/Hypo-Workflow", /HypoxanthineOvO\/Hypo-Workflow/],
    ["/hw:init -> /hw:plan -> /hw:start", /\/hw:init[\s\S]*\/hw:plan[\s\S]*\/hw:start/],
    ["/hw:status -> /hw:resume", /\/hw:status[\s\S]*\/hw:resume/],
    ["six platforms", new RegExp(platformDisplayNames().map(escapeRegExp).join("[\\s\\S]*"))],
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

  for (const pattern of DISALLOWED_README_PROSE) {
    if (pattern.test(stripAllowedReadmeTokens(readme))) {
      failures.push({
        check: "chinese-entrypoint",
        expected: "Chinese-first README prose",
        message: `README contains English prose matching ${pattern}`,
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
  try {
    const raw = await readFile(join(projectRoot, "core", "src", "commands", "index.js"), "utf8");
    return (raw.match(/canonical:/g) || []).length;
  } catch {
    return USER_COMMANDS.length;
  }
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

function stripAllowedReadmeTokens(readme) {
  let text = readme
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]+`/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[[^\]]+\]\([^)]+\)/g, "");
  for (const term of ALLOWED_README_TERMS) {
    text = text.replace(new RegExp(escapeRegExp(term), "g"), "");
  }
  return text;
}
