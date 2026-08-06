import {
  appendFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { redactSecrets } from "../evidence/index.js";
import { parseFrontmatter, parseYaml } from "../serialization/index.js";

const PLAN_STATUSES = new Set([
  "pending",
  "in_progress",
  "waiting-review",
  "completed",
  "blocked",
  "cancelled",
]);
const SEMANTIC_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export async function inspectSemanticWorkflow(root = ".", options = {}) {
  const workspace = resolve(root);
  const cycles = await listSemanticCycles(workspace);
  if (!cycles.length) return { present: false, status: "absent", cycles: [] };

  const requested = options.cycle || await readSessionFocus(workspace, options);
  if (requested) {
    const selected = cycles.find((cycle) => cycle.name === requested);
    if (selected) return { present: true, status: "selected", cycle: selected, cycles };
  }

  const active = cycles.filter((cycle) => !["closed", "cancelled"].includes(cycle.status));
  if (active.length === 1) return { present: true, status: "selected", cycle: active[0], cycles };
  if (active.length > 1) return { present: true, status: "selection_required", cycles: active };
  return { present: true, status: "none", cycles };
}

export async function validateSemanticCycle(root = ".", cycleName) {
  assertSemanticName(cycleName, "Cycle name");
  const workspace = resolve(root);
  const cycleRoot = join(workspace, ".pipeline", "cycles", cycleName);
  await assertOrdinaryDirectory(cycleRoot);

  const errors = [];
  const files = {};
  for (const name of ["PLAN.md", "PROGRESS.md", "EXECUTION.md", "DISCUSSION-SUMMARY.md"]) {
    const path = join(cycleRoot, name);
    try {
      await assertOrdinaryFile(path);
      files[name] = parseFrontmatter(await readFile(path, "utf8"));
    } catch (error) {
      errors.push(`${name}: ${error.message}`);
    }
  }
  if (errors.length) return { ok: false, cycle: cycleName, errors, plan_ids: [], progress_ids: [] };

  const plan = files["PLAN.md"];
  const progress = files["PROGRESS.md"];
  const planIds = tableIds(plan.body);
  const progressRows = progressTableRows(progress.body);
  const progressIds = progressRows.map((row) => row.id);

  if (plan.attributes.cycle !== cycleName) errors.push("PLAN.md cycle does not match its directory");
  if (progress.attributes.cycle !== cycleName) errors.push("PROGRESS.md cycle does not match its directory");
  if (plan.attributes.progress !== "PROGRESS.md") errors.push("PLAN.md must point to PROGRESS.md");
  if (progress.attributes.plan !== "PLAN.md") errors.push("PROGRESS.md must point to PLAN.md");
  if (!planIds.length) errors.push("PLAN.md has no stable plan IDs");
  if (JSON.stringify(planIds) !== JSON.stringify(progressIds)) errors.push("Progress IDs do not exactly mirror Plan IDs");
  if (!planIds.includes(progress.attributes.current)) errors.push("Progress current does not exist in Plan");
  for (const row of progressRows) {
    if (!PLAN_STATUSES.has(row.status)) errors.push(`Progress ${row.id} has unsupported status ${row.status}`);
  }

  return {
    ok: errors.length === 0,
    cycle: cycleName,
    errors,
    plan_ids: planIds,
    progress_ids: progressIds,
    current: progress.attributes.current,
    next: progress.attributes.next,
    status: progress.attributes.status,
  };
}

export async function renderSemanticResumeContext(root = ".", options = {}) {
  const inspected = await inspectSemanticWorkflow(root, options);
  if (!inspected.present) return { status: "absent", context: null };
  if (inspected.status === "selection_required") {
    const rows = inspected.cycles.map((cycle) => (
      `- ${cycle.name}: ${cycle.title}; status=${cycle.status}; current=${cycle.current ?? "unknown"}; next=${cycle.next ?? "unknown"}`
    ));
    return {
      status: "selection_required",
      context: [
        "Hypo-Workflow：当前存在多个 active Cycle，本 Session 尚未聚焦。",
        ...rows,
        "选择一个 Cycle 后再修改 Workflow 记录或源码；普通提问和诊断可以继续。",
      ].join("\n"),
    };
  }
  if (inspected.status !== "selected") return { status: inspected.status, context: null };

  const cycle = inspected.cycle;
  const cycleRoot = join(resolve(root), ".pipeline", "cycles", cycle.name);
  const validation = await validateSemanticCycle(root, cycle.name);
  const [progress, execution, discussion] = await Promise.all([
    readFile(join(cycleRoot, "PROGRESS.md"), "utf8"),
    readFile(join(cycleRoot, "EXECUTION.md"), "utf8"),
    readFile(join(cycleRoot, "DISCUSSION-SUMMARY.md"), "utf8"),
  ]);
  const progressBody = parseFrontmatter(progress).body.trim();
  const executionBody = firstCheckpoint(parseFrontmatter(execution).body);
  const discussionBody = bounded(parseFrontmatter(discussion).body.trim(), 2400);

  return {
    status: "selected",
    cycle: cycle.name,
    validation,
    context: bounded([
      `Hypo-Workflow 当前 Cycle：${cycle.name}`,
      `记录：.pipeline/cycles/${cycle.name}/PLAN.md、PROGRESS.md、EXECUTION.md、DISCUSSION-SUMMARY.md`,
      `校验：${validation.ok ? "Plan/Progress 对齐" : validation.errors.join("；")}`,
      "",
      progressBody,
      "",
      "## 最近 Execution checkpoint",
      executionBody || "尚无 checkpoint。",
      "",
      "## Discussion Summary 摘要",
      discussionBody || "尚无讨论摘要。",
      "",
      "以用户最新消息为准，从 Progress 的 next 对应计划项继续，不重放已完成动作。",
    ].join("\n"), 14_000),
  };
}

export async function appendDiscussionMessage(root = ".", input = {}, options = {}) {
  const speaker = input.speaker;
  if (!["user", "assistant"].includes(speaker)) throw new Error("Discussion speaker must be user or assistant");
  if (typeof input.text !== "string" || !input.text.trim()) return { status: "empty" };

  const inspected = await inspectSemanticWorkflow(root, {
    host: input.host,
    sessionId: input.sessionId,
    cycle: input.cycle,
  });
  if (inspected.status !== "selected") return { status: inspected.status };

  const cycle = inspected.cycle.name;
  const session = safeName(input.sessionId || "session", "Session id");
  const turn = safeName(input.turnId || `${speaker}-${Date.now()}`, "Turn id");
  const workspace = resolve(root);
  const localRoot = join(workspace, ".pipeline", "local");
  const discussionRoot = join(localRoot, "discussions", cycle);
  await mkdir(discussionRoot, { recursive: true });
  await ensureIgnoreFile(localRoot);
  await assertOrdinaryDirectory(discussionRoot);

  const path = join(discussionRoot, `${session}.md`);
  const marker = `<!-- turn:${speaker}:${turn} -->`;
  const existing = await readOptional(path);
  if (existing.includes(marker)) {
    return { status: "deduplicated", cycle, path: relative(workspace, path) };
  }

  const now = normalizeNow(options.clock?.() ?? new Date());
  const visible = String(redactSecrets(input.text)).replace(/\r\n?/g, "\n").trimEnd();
  const heading = speaker === "user" ? "用户" : "助手";
  const prefix = existing ? "\n" : discussionHeader(cycle, session, now);
  await appendFile(path, `${prefix}${marker}\n## ${now} - ${heading} - ${turn}\n\n${visible}\n`, "utf8");
  return { status: "appended", cycle, path: relative(workspace, path), redacted: visible !== input.text.trimEnd() };
}

async function listSemanticCycles(root) {
  const cyclesRoot = join(root, ".pipeline", "cycles");
  let entries;
  try {
    await assertOrdinaryDirectory(cyclesRoot);
    entries = await readdir(cyclesRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const cycles = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory() || entry.isSymbolicLink() || !SEMANTIC_NAME.test(entry.name)) continue;
    try {
      const plan = parseFrontmatter(await readFile(join(cyclesRoot, entry.name, "PLAN.md"), "utf8"));
      const progress = parseFrontmatter(await readFile(join(cyclesRoot, entry.name, "PROGRESS.md"), "utf8"));
      cycles.push({
        name: entry.name,
        title: firstTitle(plan.body) || entry.name,
        status: String(progress.attributes.status || plan.attributes.status || "unknown"),
        current: progress.attributes.current,
        next: progress.attributes.next,
      });
    } catch {
      // An incomplete directory is reported by explicit validation, not selected for resume.
    }
  }
  return cycles;
}

async function readSessionFocus(root, options) {
  if (!options.host || !options.sessionId) return null;
  const host = safeName(options.host, "Host");
  const session = safeName(options.sessionId, "Session id");
  const path = join(root, ".pipeline", "local", "sessions", host, `${session}.yaml`);
  try {
    const value = parseYaml(await readFile(path, "utf8"));
    return typeof value.cycle === "string" ? value.cycle : null;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function tableIds(body) {
  return [...body.matchAll(/^\| `(M\d+|S\d+)` \|/gm)].map((match) => match[1]);
}

function progressTableRows(body) {
  const rows = [];
  for (const line of body.split("\n")) {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    const id = /^`(M\d+|S\d+)`$/.exec(cells[0] || "")?.[1];
    if (!id || cells.length < 5) continue;
    rows.push({ id, status: String(cells[2] || "").replaceAll("`", "") });
  }
  return rows;
}

function firstTitle(body) {
  return /^#\s+(.+)$/m.exec(body)?.[1]?.trim() || null;
}

function firstCheckpoint(body) {
  const match = /^##\s+.+$(?:\n(?!##\s)[\s\S]*)?/m.exec(body.trim());
  if (!match) return "";
  return bounded(match[0].split(/\n(?=##\s)/)[0].trim(), 2400);
}

function bounded(value, maximum) {
  return value.length <= maximum ? value : `${value.slice(0, maximum - 3)}...`;
}

function discussionHeader(cycle, session, now) {
  return `---\nkind: discussion-ledger\ncycle: ${cycle}\nsession: ${session}\nstarted: ${now}\nvisibility: local-private\n---\n\n# ${cycle} 讨论原文\n\n`;
}

async function ensureIgnoreFile(localRoot) {
  const path = join(localRoot, ".gitignore");
  try {
    await writeFile(path, "*\n", { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
  }
}

async function assertOrdinaryDirectory(path) {
  const stats = await lstat(path);
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error("expected an ordinary directory");
}

async function assertOrdinaryFile(path) {
  const stats = await lstat(path);
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error("expected an ordinary file");
}

async function readOptional(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
}

function safeName(value, field) {
  const text = String(value || "");
  if (!SEMANTIC_NAME.test(text)) throw new Error(`${field} is not a safe semantic name`);
  return text;
}

function assertSemanticName(value, field) {
  safeName(value, field);
}

function normalizeNow(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Discussion timestamp is invalid");
  return date.toISOString();
}
