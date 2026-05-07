import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { redactSecrets } from "../evidence/index.js";

const DEFAULT_TARGETS = Object.freeze([
  ".pipeline/config.yaml",
  ".pipeline/state.yaml",
  ".pipeline/PROGRESS.md",
  ".pipeline/log.yaml",
  "README.md",
  "references/commands-spec.md",
]);

const SUBAGENT_PACKET_SCHEMA = Object.freeze([
  "reviewed_refs",
  "findings",
  "unknowns",
  "confidence",
  "risk_notes",
]);

export async function buildExplainEvidencePacket(projectRoot = ".", question = "", options = {}) {
  const targets = normalizeTargets(options.targets?.length ? options.targets : inferTargets(question, options));
  const filesRead = [];
  const unknowns = [];
  for (const target of targets) {
    const path = safeRelativePath(target);
    try {
      const content = await readFile(join(projectRoot, path), "utf8");
      const safeContent = redactSecrets(content);
      filesRead.push({
        path,
        excerpt: excerptFor(safeContent, options.excerpt_chars || 800),
      });
    } catch (error) {
      if (error.code === "ENOENT") {
        unknowns.push(`missing evidence target: ${path}`);
      } else {
        unknowns.push(`unreadable evidence target: ${path}: ${error.message}`);
      }
    }
  }
  return {
    question: String(question || "").trim(),
    mode: "read_only",
    scope: targets,
    files_read: filesRead,
    pipeline_refs: filesRead.filter((item) => item.path.startsWith(".pipeline/")).map((item) => item.path),
    diff_refs: diffRefs(filesRead, options),
    confidence: filesRead.length ? "grounded" : "needs_context",
    unknowns,
  };
}

export function renderExplainAnswer(packet = {}, options = {}) {
  const language = options.language || "zh-CN";
  const files = Array.isArray(packet.files_read) ? packet.files_read : [];
  const unknowns = Array.isArray(packet.unknowns) ? packet.unknowns : [];
  if (!files.length) {
    return [
      language.startsWith("zh") ? "无法确认。" : "Unable to confirm.",
      `confidence: ${packet.confidence || "needs_context"}`,
      "",
      "Unknowns:",
      ...(unknowns.length ? unknowns.map((item) => `- ${item}`) : ["- no evidence was available"]),
      "",
    ].join("\n");
  }
  return [
    language.startsWith("zh") ? "基于以下证据回答：" : "Answer based on the following evidence:",
    "",
    ...files.map((file) => [
      `- 证据: ${file.path}`,
      indentExcerpt(file.excerpt),
    ].join("\n")),
    "",
    `confidence: ${packet.confidence || "grounded"}`,
    ...(unknowns.length ? ["", "Unknowns:", ...unknowns.map((item) => `- ${item}`)] : []),
    "",
  ].join("\n");
}

export function buildExplainSubagentHandoff(question = "", options = {}) {
  const available = options.available !== false;
  const targets = normalizeTargets(options.targets?.length ? options.targets : inferTargets(question, options));
  const prompt = available
    ? renderSubagentPrompt(question, targets)
    : renderSelfFallbackPrompt(question, targets);
  return {
    mode: available ? "subagent_handoff" : "self_fallback",
    question: String(question || "").trim(),
    targets,
    prompt,
    expected_schema: [...SUBAGENT_PACKET_SCHEMA],
    fallback_reason: available ? null : options.fallback_reason || "subagent unavailable",
  };
}

export function validateExplainSubagentPacket(packet = {}) {
  const errors = [];
  if (!Array.isArray(packet.reviewed_refs) || packet.reviewed_refs.length === 0) errors.push("reviewed_refs must be a non-empty array");
  if (!Array.isArray(packet.findings)) errors.push("findings must be an array");
  if (!Array.isArray(packet.unknowns)) errors.push("unknowns must be an array");
  if (!packet.confidence) errors.push("confidence is required");
  if (!Array.isArray(packet.risk_notes)) errors.push("risk_notes must be an array");
  return {
    ok: errors.length === 0,
    errors,
  };
}

export function renderExplainAnswerFromSubagentEvidence(question = "", packet = {}, options = {}) {
  const validation = validateExplainSubagentPacket(packet);
  if (!validation.ok) {
    return [
      "无法确认。",
      "confidence: needs_context",
      "",
      "Invalid Subagent evidence packet:",
      ...validation.errors.map((error) => `- ${error}`),
      "",
    ].join("\n");
  }
  return [
    `问题：${String(question || "").trim()}`,
    "",
    "基于 Subagent evidence packet 的解释：",
    "",
    ...packet.findings.map((finding) => `- ${redactSecrets(finding.summary)} [${finding.ref || "unreferenced"}]`),
    "",
    "Unknowns:",
    ...(packet.unknowns.length ? packet.unknowns.map((item) => `- ${item}`) : ["- none"]),
    "",
    "Risk notes:",
    ...(packet.risk_notes.length ? packet.risk_notes.map((item) => `- ${redactSecrets(item)}`) : ["- none"]),
    "",
    `confidence: ${packet.confidence}`,
    "",
  ].join("\n");
}

function inferTargets(question, options = {}) {
  const text = String(question || "");
  const explicit = [...text.matchAll(/(?:^|\s)([.\w/-]+?\.(?:ya?ml|md|js|ts|json|txt))(?:\s|$)/g)]
    .map((match) => match[1]);
  if (explicit.length) return explicit;
  if (options.diff === true || /刚才|近期|最近|diff|改动|为什么这样写|why.*change/i.test(text)) {
    return [".pipeline/PROGRESS.md", ".pipeline/log.yaml", ".pipeline/state.yaml", "README.md"];
  }
  if (/项目结构|代码框架|架构|framework|architecture|codebase/i.test(text)) {
    return ["README.md", "package.json", "core/src/index.js", "core/src/commands/index.js"];
  }
  if (/strict|严格|配置|config/i.test(text)) {
    return [".pipeline/config.yaml", "docs/reference/configuration.md", "references/config-spec.md"];
  }
  if (options.report) {
    return [String(options.report)];
  }
  return [...DEFAULT_TARGETS];
}

function diffRefs(filesRead, options = {}) {
  if (options.diff !== true) return [];
  return filesRead
    .filter((item) => [".pipeline/PROGRESS.md", ".pipeline/log.yaml", ".pipeline/state.yaml"].includes(item.path))
    .map((item) => item.path);
}

function normalizeTargets(targets) {
  return [...new Set(targets.map((target) => safeRelativePath(target)))];
}

function safeRelativePath(target) {
  const normalized = normalize(String(target || "").trim()).replace(/^(\.\.\/)+/g, "");
  return normalized.replace(/^\/+/, "");
}

function excerptFor(content, limit) {
  const text = String(content || "").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trimEnd()}\n...`;
}

function indentExcerpt(excerpt) {
  return String(excerpt || "")
    .split("\n")
    .slice(0, 12)
    .map((line) => `  ${line}`)
    .join("\n");
}

function renderSubagentPrompt(question, targets) {
  return [
    "You are collecting evidence for /hw:explain --subagent.",
    "Work read-only. Do not modify files, do not update .pipeline state, do not create patches, and do not write remote resources.",
    "",
    `Question: ${String(question || "").trim()}`,
    "",
    "Review these targets first:",
    ...targets.map((target) => `- ${target}`),
    "",
    "Return only an evidence packet with these keys:",
    "- reviewed_refs",
    "- findings",
    "- unknowns",
    "- confidence",
    "- risk_notes",
    "",
    "Findings must cite reviewed_refs. Unknowns must list anything you could not verify.",
  ].join("\n");
}

function renderSelfFallbackPrompt(question, targets) {
  return [
    "Subagent unavailable; continue in self evidence mode.",
    `Question: ${String(question || "").trim()}`,
    "Use read-only local evidence and cite files.",
    ...targets.map((target) => `- ${target}`),
  ].join("\n");
}
