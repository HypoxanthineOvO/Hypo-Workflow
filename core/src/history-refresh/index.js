import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { redactSecrets } from "../evidence/index.js";
import {
  createWorkspaceManifest,
  validateWorkspaceManifest,
  WORKSPACE_MANIFEST_PATH,
} from "../manifest/index.js";
import { parseFrontmatter, parseYaml, stringifyYaml } from "../serialization/index.js";

const DEFAULT_OUTPUT = ".pipeline/history-refresh/preview";
const ACTIVATION_MARKER = ".pipeline/history-refresh/activation.md";
const SAFE_PROJECT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const ISO_WITH_TIMEZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export async function buildHistoryRefreshPreview(root = ".") {
  const workspace = resolve(root);
  const pipelineRoot = join(workspace, ".pipeline");
  const sourceFiles = (await walkFiles(pipelineRoot))
    .filter((path) => !isHistoryRefreshDerivedPath(path));
  const counts = countTopLevel(sourceFiles);
  const projectId = await readProjectId(workspace);
  const cycles = await readArchivedCycles(workspace);
  const legacyWorkItems = await readRootLegacyWorkItems(workspace);
  const manifest = await buildManifestPlan(workspace, projectId, cycles);
  const memory = await readMemoryRecords(workspace);
  const deliveries = await readLiveDeliveries(workspace);
  const knowledgeFiles = await walkOptional(join(workspace, ".pipeline", "knowledge"));
  const chatFiles = await walkOptional(join(workspace, ".pipeline", "chats"));
  const patchFiles = await walkOptional(join(workspace, ".pipeline", "patches"));
  const prFiles = await walkOptional(join(workspace, ".pipeline", "pr"));

  const inventory = {
    pipeline_files: sourceFiles.length,
    top_level_counts: counts,
    archived_cycles: cycles.length,
    archive_files: counts.archives || 0,
    memory_records: memory.length,
    knowledge_files: knowledgeFiles.length,
    chat_files: chatFiles.length,
    patch_files: patchFiles.length,
    pr_files: prFiles.length,
    live_deliveries: deliveries.length,
    legacy_work_items: legacyWorkItems.length,
  };
  const uncertainties = buildUncertainties(cycles, deliveries, legacyWorkItems, knowledgeFiles, chatFiles);
  const files = new Map();

  files.set("REPORT.md", renderReport(inventory, cycles, deliveries, legacyWorkItems, uncertainties));
  files.set("mapping.yaml", `${stringifyYaml(renderMapping(projectId, manifest, inventory, cycles, deliveries, legacyWorkItems, uncertainties)).trimEnd()}\n`);
  files.set("proposed/INDEX.md", renderProjectIndex(projectId, cycles, memory, deliveries, legacyWorkItems));
  files.set("proposed/cycles/INDEX.md", renderCycleIndex(cycles));
  files.set("proposed/memory/INDEX.md", renderMemoryIndex(memory, knowledgeFiles));
  files.set("proposed/experiments/INDEX.md", renderExperimentIndex(memory));

  for (const cycle of cycles) {
    const prefix = `proposed/cycles/${cycle.id}`;
    files.set(`${prefix}/PLAN.md`, renderCyclePlan(cycle));
    files.set(`${prefix}/PROGRESS.md`, renderCycleProgress(cycle));
    files.set(`${prefix}/EXECUTION.md`, renderCycleExecution(cycle));
    files.set(`${prefix}/DISCUSSION-SUMMARY.md`, renderCycleDiscussion(cycle));
    files.set(`${prefix}/SUMMARY.md`, renderCycleSummary(cycle));
  }

  return { files, inventory, cycles, memory, deliveries, legacyWorkItems, manifest, projectId, uncertainties };
}

export async function writeHistoryRefreshPreview(root = ".", options = {}) {
  const workspace = resolve(root);
  const outputRelative = options.output || DEFAULT_OUTPUT;
  if (!/^\.pipeline\/history-refresh\/[A-Za-z0-9._-]+$/.test(outputRelative)) {
    throw new Error("History Refresh preview output must be one directory under .pipeline/history-refresh");
  }
  const preview = await buildHistoryRefreshPreview(workspace);
  const outputRoot = join(workspace, outputRelative);
  const existing = await readTreeOptional(outputRoot);
  if (existing) {
    if (sameFiles(existing, preview.files)) return { status: "unchanged", output: outputRelative, ...preview };
    throw new Error("History Refresh preview already exists with different content; inspect it before replacing");
  }

  const parent = dirname(outputRoot);
  const staging = join(parent, `.tmp-${basename(outputRoot)}-${process.pid}`);
  await mkdir(parent, { recursive: true });
  await rm(staging, { recursive: true, force: true });
  try {
    for (const [path, content] of preview.files) {
      const target = join(staging, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content, "utf8");
    }
    await rename(staging, outputRoot);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
  return { status: "written", output: outputRelative, ...preview };
}

export async function activateHistoryRefresh(root = ".", options = {}) {
  if (options.approved !== true) throw new Error("History Refresh activation requires explicit approved:true");
  const workspace = resolve(root);
  const previewRelative = options.preview || DEFAULT_OUTPUT;
  if (!/^\.pipeline\/history-refresh\/[A-Za-z0-9._-]+$/.test(previewRelative)) {
    throw new Error("History Refresh preview path is invalid");
  }
  const previewRoot = join(workspace, previewRelative);
  const reviewedPreview = await readTreeOptional(previewRoot);
  if (!reviewedPreview) throw new Error("History Refresh reviewed preview is missing");
  const mapping = parseYaml(await readFile(join(previewRoot, "mapping.yaml"), "utf8"));
  if (mapping.activation_authorized !== false || mapping.legacy_policy !== "read-only-preserve") {
    throw new Error("History Refresh preview is not an unactivated legacy-preserving review artifact");
  }
  if (!Array.isArray(mapping.cycles) || !mapping.cycles.length) throw new Error("History Refresh preview has no Cycle mapping");
  const manifestPlan = validateManifestPlan(mapping.manifest);
  const manifestPath = join(workspace, WORKSPACE_MANIFEST_PATH);
  const manifestBefore = await readOptional(manifestPath, null);
  if (manifestPlan.action === "create-current" && manifestBefore !== null) {
    const currentManifest = parseYaml(manifestBefore);
    validateWorkspaceManifest(currentManifest);
    if (stringifyYaml(currentManifest) !== stringifyYaml(manifestPlan.content)) {
      throw new Error("History Refresh target manifest conflicts with the reviewed preview");
    }
  }

  const targets = [];
  for (const item of mapping.cycles) {
    const id = basename(String(item.proposed || ""));
    if (!/^C\d+-[A-Za-z0-9._-]+$/.test(id)) throw new Error("History Refresh preview contains an unsafe Cycle id");
    const source = join(previewRoot, "proposed", "cycles", id);
    const sourceFiles = await readTreeOptional(source);
    if (!sourceFiles || sourceFiles.size !== 5) throw new Error(`History Refresh preview Cycle ${id} is incomplete`);
    const target = join(workspace, ".pipeline", "cycles", id);
    const existing = await readTreeOptional(target);
    if (existing && !sameFiles(existing, sourceFiles)) throw new Error(`History Refresh target Cycle conflicts: ${id}`);
    targets.push({ id, sourceFiles, target, existing: Boolean(existing) });
  }

  const marker = join(workspace, ACTIVATION_MARKER);

  const currentPreview = await buildHistoryRefreshPreview(workspace);
  if (!previewMatchesCurrent(reviewedPreview, currentPreview.files, mapping)) {
    throw new Error("History Refresh preview no longer matches the current legacy history");
  }

  const previewCycleIndex = await readFile(join(previewRoot, "proposed", "cycles", "INDEX.md"), "utf8");
  const previewMemoryIndex = await readFile(join(previewRoot, "proposed", "memory", "INDEX.md"), "utf8");
  const previewExperimentIndex = await readFile(join(previewRoot, "proposed", "experiments", "INDEX.md"), "utf8");
  const indexes = new Map([
    [join(workspace, ".pipeline", "INDEX.md"), renderActivatedProjectIndex(mapping)],
    [join(workspace, ".pipeline", "cycles", "INDEX.md"), await renderActivatedCycleIndex(workspace, previewCycleIndex, mapping)],
    [join(workspace, ".pipeline", "memory", "HISTORY-REFRESH-INDEX.md"), previewMemoryIndex.replace("status: preview", "status: active").replace("# Memory 索引预览", "# Memory History 索引")],
    [join(workspace, ".pipeline", "experiments", "INDEX.md"), previewExperimentIndex.replace("status: preview", "status: active").replace("# Experiment 索引预览", "# Experiment 索引")],
    [join(workspace, ".pipeline", "legacy", "INDEX.md"), renderLegacyIndex(mapping)],
    [marker, renderActivationMarker(previewRelative, mapping)],
  ]);
  if (manifestPlan.action === "create-current" && manifestBefore === null) {
    indexes.set(manifestPath, `${stringifyYaml(manifestPlan.content).trimEnd()}\n`);
  }
  if (await fileExists(marker) && targets.every((target) => target.existing)) {
    const indexesUnchanged = (await Promise.all(
      [...indexes].map(async ([path, content]) => await readOptional(path, null) === content),
    )).every(Boolean);
    if (indexesUnchanged) {
      return { status: "unchanged", activated_cycles: targets.length, marker: relativePath(workspace, marker) };
    }
  }
  const oldIndexes = new Map();
  for (const path of indexes.keys()) oldIndexes.set(path, await readOptional(path, null));
  const created = [];

  try {
    await mkdir(join(workspace, ".pipeline", "cycles"), { recursive: true });
    for (const target of targets) {
      if (target.existing) continue;
      await mkdir(target.target, { recursive: false });
      created.push(target.target);
      for (const [path, content] of target.sourceFiles) {
        const destination = join(target.target, path);
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, content, "utf8");
      }
    }
    for (const [path, content] of indexes) await writeAtomicFile(path, content);
  } catch (error) {
    for (const path of created.reverse()) await rm(path, { recursive: true, force: true });
    for (const [path, content] of oldIndexes) {
      if (content === null) await rm(path, { force: true });
      else await writeAtomicFile(path, content);
    }
    throw error;
  }

  return {
    status: "activated",
    activated_cycles: targets.length,
    created_cycles: created.length,
    marker: relativePath(workspace, marker),
    manifest_changed: manifestPlan.action === "create-current" && manifestBefore === null,
    legacy_preserved: true,
  };
}

async function readArchivedCycles(root) {
  const archivesRoot = join(root, ".pipeline", "archives");
  let entries;
  try {
    entries = await readdir(archivesRoot, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const cycles = [];
  for (const entry of entries.sort((left, right) => cycleOrder(left.name) - cycleOrder(right.name))) {
    if (!entry.isDirectory() || entry.isSymbolicLink() || !/^C\d+-/.test(entry.name)) continue;
    const sourceRoot = join(archivesRoot, entry.name);
    const cycleResult = parseLegacyYaml(await readOptional(join(sourceRoot, "cycle.yaml"), "{}"));
    const stateResult = parseLegacyYaml(await readOptional(join(sourceRoot, "state.yaml"), "{}"));
    const cycleDoc = cycleResult.value;
    const state = stateResult.value;
    const cycle = cycleDoc.cycle || {};
    const sourceFiles = await walkFiles(sourceRoot);
    const summary = await readOptional(join(sourceRoot, "summary.md"), "");
    const progress = await readOptional(join(sourceRoot, "PROGRESS.md"), "");
    const confirmSummary = await readOptional(join(sourceRoot, "confirm-summary.md"), "");
    const knowledgeSummary = await readOptional(join(sourceRoot, "knowledge-summary.md"), "");
    const milestones = normalizeMilestones(state, sourceFiles, progress);
    cycles.push({
      id: entry.name,
      number: Number(cycle.number || cycleOrder(entry.name)),
      name: cycle.name || entry.name.replace(/^C\d+-/, "").replaceAll("-", " "),
      type: cycle.type || cycle.workflow_kind || "unknown",
      status: cycle.status || state.pipeline?.status || "completed",
      started: cycle.started || state.pipeline?.started || null,
      finished: cycle.finished || state.pipeline?.finished || null,
      summaryText: cycle.summary || firstParagraph(summary) || "旧记录没有可确认的摘要。",
      lessons: Array.isArray(cycle.lessons) ? cycle.lessons : [],
      source: `.pipeline/archives/${entry.name}`,
      sourceFiles,
      fileCount: sourceFiles.length,
      summary,
      progress,
      confirmSummary,
      knowledgeSummary,
      milestones,
      missing: [
        ...(cycleResult.error ? ["cycle.yaml invalid YAML"] : []),
        ...(stateResult.error ? ["state.yaml invalid YAML"] : []),
        ...(summary ? [] : ["summary.md"]),
        ...(progress ? [] : ["PROGRESS.md"]),
        ...(knowledgeSummary ? [] : ["knowledge-summary.md"]),
      ],
    });
  }
  return cycles;
}

function normalizeMilestones(state, sourceFiles, progress) {
  const raw = Array.isArray(state.milestones) ? state.milestones : [];
  const history = Array.isArray(state.history?.completed_prompts) ? state.history.completed_prompts : [];
  const reports = sourceFiles.filter((path) => path.startsWith("reports/") && path.endsWith(".md"));
  if (!raw.length) {
    const progressRows = milestonesFromProgress(progress, reports);
    if (progressRows.length) return progressRows;
    return reports.length
      ? reports.map((report, index) => ({ id: `M${index + 1}`, title: basename(report, ".md"), status: "completed", report }))
      : [{ id: "M1", title: "旧 Cycle 结果", status: "completed", report: null }];
  }
  return raw.map((item, index) => {
    const id = /^M\d+$/.test(String(item.id || "")) ? String(item.id) : `M${index + 1}`;
    const completed = history.find((entry) => (
      (item.id !== undefined && entry.id !== undefined && entry.id === item.id)
      || samePrompt(entry, item)
    ));
    return {
      id,
      title: item.name || item.title || item.outcome || `Milestone ${index + 1}`,
      outcome: item.outcome || item.summary || null,
      status: normalizeHistoricalStatus(item.status),
      report: completed?.report || completed?.report_file
        ? archiveRelative(completed.report || completed.report_file)
        : findReport(reports, item, index),
      finished: completed?.finished_at || completed?.completed_at || null,
    };
  });
}

function milestonesFromProgress(markdown, reports) {
  const rows = [];
  for (const line of String(markdown || "").split("\n")) {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    const id = /\b(M\d+)\b/.exec(cells[0] || "")?.[1];
    if (!id || cells.every((cell) => /^-+$/.test(cell))) continue;
    const index = rows.length;
    rows.push({
      id,
      title: stripMarkdown(cells[1] || cells[0].replace(id, "")) || `Milestone ${id}`,
      outcome: stripMarkdown(cells.at(-1) || "") || null,
      status: normalizeHistoricalStatus(cells.find((cell) => /完成|done|pass|deferred|cancel/i.test(cell))),
      report: findReport(reports, { id, name: cells[1] }, index),
      finished: null,
    });
  }
  return rows;
}

async function readMemoryRecords(root) {
  const recordsRoot = join(root, ".pipeline", "memory", "records");
  const paths = (await walkOptional(recordsRoot)).filter((path) => path.endsWith(".md"));
  const records = [];
  for (const path of paths) {
    try {
      const parsed = parseFrontmatter(await readFile(join(recordsRoot, path), "utf8"));
      records.push({
        path: `.pipeline/memory/records/${path}`,
        kind: parsed.attributes.kind || "unknown",
        name: parsed.attributes.name || firstTitle(parsed.body) || basename(path, ".md"),
        scope: formatScope(parsed.attributes.scope),
        status: parsed.attributes.status || "active",
      });
    } catch {
      records.push({ path: `.pipeline/memory/records/${path}`, kind: "unparsed", name: basename(path, ".md"), scope: "unknown", status: "review" });
    }
  }
  return records;
}

async function readLiveDeliveries(root) {
  const deliveryRoot = join(root, ".pipeline", "runtime", "objects", "delivery");
  let entries;
  try {
    entries = await readdir(deliveryRoot, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const deliveries = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    try {
      const value = parseYaml(await readFile(join(deliveryRoot, entry.name, "runtime.yaml"), "utf8"));
      deliveries.push({
        id: value.object_ref?.id || entry.name,
        kind: value.delivery_kind || "unknown",
        status: value.status || "unknown",
        updated: value.updated_at || null,
        source: `.pipeline/runtime/objects/delivery/${entry.name}`,
      });
    } catch {
      deliveries.push({ id: entry.name, kind: "unknown", status: "unparsed", updated: null, source: `.pipeline/runtime/objects/delivery/${entry.name}` });
    }
  }
  return deliveries;
}

async function readProjectId(root) {
  const manifestText = await readOptional(join(root, ".pipeline", "manifest.yaml"), null);
  if (manifestText) {
    try {
      const manifestProjectId = parseYaml(manifestText)?.project_id;
      if (typeof manifestProjectId === "string" && manifestProjectId.trim()) {
        const preservedProjectId = manifestProjectId.trim();
        if (SAFE_PROJECT_ID.test(preservedProjectId)) return preservedProjectId;
      }
    } catch {
      // Invalid manifest metadata is handled by workspace validation; identity falls back here.
    }
  }
  const packageText = await readOptional(join(root, "package.json"), null);
  if (packageText) {
    try {
      const packageName = JSON.parse(packageText)?.name;
      if (typeof packageName === "string" && packageName.trim()) {
        return normalizeProjectId(packageName);
      }
    } catch {
      // Invalid package metadata falls back to the workspace directory name.
    }
  }
  return normalizeProjectId(basename(root));
}

async function buildManifestPlan(root, projectId, cycles) {
  const expected = createWorkspaceManifest({
    workspace_id: `${projectId}-workspace`,
    project_id: projectId,
    created_at: deriveManifestCreatedAt(cycles),
  });
  const manifestText = await readOptional(join(root, WORKSPACE_MANIFEST_PATH), null);
  if (manifestText === null) return { action: "create-current", content: expected };

  let current;
  try {
    current = parseYaml(manifestText);
    validateWorkspaceManifest(current);
  } catch {
    throw new Error("History Refresh cannot adopt a workspace with a damaged current manifest");
  }
  return { action: "preserve-current", content: current };
}

function deriveManifestCreatedAt(cycles) {
  const timestamps = cycles
    .map((cycle) => String(cycle.started || ""))
    .filter((value) => ISO_WITH_TIMEZONE.test(value))
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value));
  if (!timestamps.length) return "1970-01-01T00:00:00.000Z";
  return new Date(Math.min(...timestamps)).toISOString();
}

function validateManifestPlan(value) {
  if (!value || !["create-current", "preserve-current"].includes(value.action)) {
    throw new Error("History Refresh preview has an invalid manifest plan");
  }
  validateWorkspaceManifest(value.content);
  return value;
}

function previewMatchesCurrent(reviewedFiles, currentFiles, reviewedMapping) {
  if (sameFiles(reviewedFiles, currentFiles)) return true;
  const currentMapping = parseYaml(currentFiles.get("mapping.yaml"));
  if (reviewedMapping.manifest?.action !== "create-current"
    || currentMapping.manifest?.action !== "preserve-current"
    || stringifyYaml(reviewedMapping.manifest.content) !== stringifyYaml(currentMapping.manifest.content)) {
    return false;
  }
  const adjusted = new Map(currentFiles);
  currentMapping.manifest = reviewedMapping.manifest;
  adjusted.set("mapping.yaml", `${stringifyYaml(currentMapping).trimEnd()}\n`);
  return sameFiles(reviewedFiles, adjusted);
}

async function readRootLegacyWorkItems(root) {
  const cyclePath = join(root, ".pipeline", "cycle.yaml");
  const cycleText = await readOptional(cyclePath, null);
  const statePath = join(root, ".pipeline", "state.yaml");
  const stateText = await readOptional(statePath, null);
  const progressPath = join(root, ".pipeline", "PROGRESS.md");
  const progressText = await readOptional(progressPath, null);
  if (cycleText === null && stateText === null && progressText === null) return [];

  let cycle = {};
  let cycleInvalid = false;
  if (cycleText?.trim()) {
    try {
      cycle = parseYaml(cycleText)?.cycle || {};
    } catch {
      cycleInvalid = true;
    }
  }

  let state = {};
  let stateInvalid = false;
  if (stateText?.trim()) {
    try {
      state = parseYaml(stateText) || {};
    } catch {
      stateInvalid = true;
    }
  }
  const number = Number(cycle.number);
  const id = Number.isInteger(number) && number >= 0 ? `C${number}` : "legacy-cycle";
  const source = cycleText !== null
    ? ".pipeline/cycle.yaml"
    : stateText !== null
      ? ".pipeline/state.yaml"
      : ".pipeline/PROGRESS.md";
  return [{
    id,
    kind: "legacy-cycle",
    name: String(cycle.name || state.pipeline?.name || (cycleInvalid || stateInvalid ? "Unparsed root legacy Cycle" : id)),
    status: String(state.pipeline?.status || cycle.status || (cycleInvalid || stateInvalid ? "unparsed" : "unknown")),
    source,
    disposition: "preserve-for-explicit-lifecycle-review",
  }];
}

function normalizeProjectId(value) {
  const normalized = String(value || "project")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "");
  return normalized || "project";
}

function isHistoryRefreshDerivedPath(path) {
  return path.startsWith("history-refresh/")
    || path.startsWith("local/")
    || path === "INDEX.md"
    || path === "manifest.yaml"
    || path.startsWith("cycles/")
    || path === "memory/HISTORY-REFRESH-INDEX.md"
    || path === "experiments/INDEX.md"
    || path === "legacy/INDEX.md";
}

function buildUncertainties(cycles, deliveries, legacyWorkItems, knowledgeFiles, chatFiles) {
  const items = [];
  for (const cycle of cycles) {
    if (cycle.missing.length) items.push(`${cycle.id} 缺少 ${cycle.missing.join("、")}，预览只能使用其他来源补足。`);
  }
  const pending = deliveries.filter((item) => !["accepted", "rejected", "superseded"].includes(item.status));
  for (const item of pending) items.push(`Live Delivery ${item.id} 状态为 ${item.status}，激活前必须解决或明确保留。`);
  for (const item of legacyWorkItems) items.push(`根部旧 Cycle ${item.id} 状态为 ${item.status}，仅保留为 legacy work item，等待显式生命周期处理。`);
  if (knowledgeFiles.length) items.push(`${knowledgeFiles.length} 个旧 Knowledge 文件可能与 Memory Records 重叠，需要人工去重。`);
  if (chatFiles.length) items.push(`${chatFiles.length} 个旧 Chat 状态文件没有可靠 Cycle 绑定，不自动归入 Discussion。`);
  return items;
}

function renderReport(inventory, cycles, deliveries, legacyWorkItems, uncertainties) {
  const missingSummary = cycles.filter((cycle) => cycle.missing.includes("summary.md")).map((cycle) => cycle.id);
  const missingProgress = cycles.filter((cycle) => cycle.missing.includes("PROGRESS.md")).map((cycle) => cycle.id);
  const statusCounts = countValues(deliveries.map((item) => item.status));
  return `# History Refresh 预览报告

## 结论

当前 ${cycles.length} 个旧 Cycle 可以映射为新的只读语义 Cycle。预览为每个 Cycle 生成 Plan、Progress、Execution、Discussion Summary 和 Summary，但不复制 ${inventory.archive_files} 个旧归档文件；详细 prompts、reports 和 reviews 继续引用原路径。旧文件没有被修改，Manifest 也没有切换。

本预览**不具备激活授权**。当前仍有 ${deliveries.filter((item) => !["accepted", "rejected", "superseded"].includes(item.status)).length} 个非终态 live Delivery，必须在 S2 明确处理。

## 源数据

| 类别 | 数量 |
| --- | ---: |
| \`.pipeline\` 源文件（排除 preview/local） | ${inventory.pipeline_files} |
| 旧 Cycle | ${inventory.archived_cycles} |
| 旧 Cycle 文件 | ${inventory.archive_files} |
| Memory Records | ${inventory.memory_records} |
| 旧 Knowledge 文件 | ${inventory.knowledge_files} |
| 旧 Chat 状态文件 | ${inventory.chat_files} |
| Patch 文件 | ${inventory.patch_files} |
| PR 文件 | ${inventory.pr_files} |
| Live Delivery | ${inventory.live_deliveries} |
| Root legacy work item | ${inventory.legacy_work_items} |

## 映射方式

- \`cycle.yaml\` 与 \`state.yaml\` 生成稳定的历史 Plan 和最终 Progress 表。
- milestone history 与 report 路径生成高层 Execution checkpoint。
- \`summary.md\` 进入新的 Summary；缺失时使用 \`cycle.summary\` 并标记不确定。
- \`confirm-summary.md\` 只作为接受证据引用，不伪造逐字 Discussion。
- ${inventory.memory_records} 个 Memory Records 保持原路径，预览重建人类可读索引。
- 旧 Knowledge、Chats、Patches、PR、live deliveries 和 root legacy work items 保留原位，不在没有语义依据时强行归类。
- Current manifest：缺失时在激活末尾创建；已有有效文件保持原字节。

## 覆盖与缺口

- 旧 Cycle 映射：${cycles.length}/${inventory.archived_cycles}。
- 缺少 \`summary.md\`：${missingSummary.length ? missingSummary.join("、") : "无"}。
- 缺少 \`PROGRESS.md\`：${missingProgress.length ? missingProgress.join("、") : "无"}。
- Live Delivery 状态：${Object.entries(statusCounts).map(([status, count]) => `${status}=${count}`).join("，") || "无"}。
- Root legacy work item：${legacyWorkItems.length ? legacyWorkItems.map((item) => `${item.id}=${item.status}`).join("，") : "无"}。

## 不确定项与风险

${uncertainties.length ? uncertainties.map((item) => `- ${item}`).join("\n") : "- 无。"}

## S2 需要判断

1. 是否接受“语义摘要层 + 旧详细历史只读引用”，而不是复制全部旧文件。
2. 非终态 live Delivery 应先完成/拒绝，还是在激活时作为单独 legacy work item 保留。
3. 旧 Knowledge 与 Memory 的重叠是否交给后续 Maintain 人工去重。

接受 S2 之前，不写 \`.pipeline/cycles/\` 中的 ${cycles.length} 个历史 Cycle，不修改 \`.pipeline/manifest.yaml\`，不删除 \`.pipeline/archives/\`。
`;
}

function renderMapping(projectId, manifest, inventory, cycles, deliveries, legacyWorkItems, uncertainties) {
  return {
    kind: "history-refresh-preview",
    project_id: projectId,
    manifest,
    status: "waiting-review",
    activation_authorized: false,
    inventory,
    cycles: cycles.map((cycle) => ({
      source: cycle.source,
      proposed: `.pipeline/cycles/${cycle.id}`,
      confidence: cycle.missing.length ? "review" : "high",
      source_files: cycle.fileCount,
      missing: cycle.missing,
      detail_policy: "reference-legacy",
    })),
    live_deliveries: deliveries,
    legacy_work_items: legacyWorkItems,
    uncertainties,
    legacy_policy: "read-only-preserve",
  };
}

function renderActivatedProjectIndex(mapping) {
  return `---
kind: project-index
name: ${mapping.project_id}
status: active
---

# ${mapping.project_id} 项目索引

## 当前工作

- [Cycle 索引](cycles/INDEX.md)：本次映射 ${mapping.cycles.length} 个历史 Cycle；既有 semantic Cycle 按实际状态一并保留。
- [Experiment 索引](experiments/INDEX.md)。
- [Memory History 索引](memory/HISTORY-REFRESH-INDEX.md)。
- [Legacy 索引](legacy/INDEX.md)：旧 archives、Knowledge、Chats、Patches、PR、live Delivery 和 root legacy work item。

## 读取顺序

普通恢复先读本索引、当前 Cycle 的 Plan/Progress/Execution/Discussion Summary。只有追溯细节或处理旧 live Delivery 时才进入 Legacy。
`;
}

async function renderActivatedCycleIndex(root, previewIndex, mapping) {
  const active = [];
  const existingClosed = [];
  const mappedIds = new Set((mapping.cycles || []).map((item) => basename(String(item.proposed || ""))));
  const cyclesRoot = join(root, ".pipeline", "cycles");
  let entries;
  try {
    entries = await readdir(cyclesRoot, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") entries = [];
    else throw error;
  }
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory() || !/^C\d+-/.test(entry.name)) continue;
    try {
      const plan = parseFrontmatter(await readFile(join(cyclesRoot, entry.name, "PLAN.md"), "utf8"));
      const progress = parseFrontmatter(await readFile(join(cyclesRoot, entry.name, "PROGRESS.md"), "utf8"));
      const status = progress.attributes.status || "active";
      const title = escapeTable(firstTitle(plan.body) || entry.name);
      if (["closed", "completed", "cancelled"].includes(status)) {
        if (!mappedIds.has(entry.name)) {
          existingClosed.push(`| [${entry.name}](${entry.name}/PLAN.md) | ${title} | ${status} | semantic | current |`);
        }
      } else {
        active.push(`| [${entry.name}](${entry.name}/PLAN.md) | ${title} | ${status} | \`${progress.attributes.current || "unknown"}\` | ${escapeTable(progress.attributes.next || "unknown")} |`);
      }
    } catch {
      // Incomplete active Cycles remain visible through explicit validation, not a guessed index row.
    }
  }
  const closedRows = previewIndex.split("\n").filter((line) => /^\| \[C\d+-/.test(line));
  return `---
kind: cycle-index
status: active
---

# Cycle 索引

## Active Cycles

| Cycle | 目的 | 状态 | 当前项 | 下一步 |
| --- | --- | --- | --- | --- |
${active.length ? active.join("\n") : "| 无 | - | - | - | - |"}

## Closed Cycles

| Cycle | 名称 | 状态 | 旧文件 | 映射置信度 |
| --- | --- | --- | ---: | --- |
${[...closedRows, ...existingClosed].join("\n")}
`;
}

function renderLegacyIndex(mapping) {
  const rows = [...(mapping.live_deliveries || []), ...(mapping.legacy_work_items || [])]
    .map((item) => `| ${item.id} | ${escapeTable(item.name || item.id)} | \`${item.kind}\` | \`${item.status}\` | \`${item.source}\` |`);
  return `---
kind: legacy-index
status: read-only
---

# Legacy 索引

这些路径保持原样，不是普通 Session 的默认上下文：

- Archives：\`.pipeline/archives/\`
- Knowledge：\`.pipeline/knowledge/\`
- Chats：\`.pipeline/chats/\`
- Patches：\`.pipeline/patches/\`
- PR：\`.pipeline/pr/\`
- 旧 Manifest 与 live Delivery：\`.pipeline/manifest.yaml\`、\`.pipeline/runtime/objects/delivery/\`
- Root legacy Cycle：\`.pipeline/cycle.yaml\`、\`.pipeline/state.yaml\`、\`.pipeline/PROGRESS.md\`

## Legacy Work Items

| ID | 名称 | 类型 | 状态 | 来源 |
| --- | --- | --- | --- | --- |
${rows.length ? rows.join("\n") : "| 无 | - | - | - | - |"}

非终态项必须通过旧兼容入口单独处理，不自动转成 Cycle，也不自动接受或拒绝。
`;
}

function renderActivationMarker(preview, mapping) {
  return `---
kind: history-refresh-activation
status: active
activation_authorized: true
preview: ${preview}
legacy_policy: read-only-preserve
manifest_changed: ${mapping.manifest?.action === "create-current"}
activated_cycles: ${mapping.cycles.length}
---

# History Refresh 激活记录

Stone S2 已接受语义摘要层。${mapping.cycles.length} 个历史 Cycle 已写入正式目录；旧 archives、Knowledge、Chats、live Delivery 和 root legacy work item 原位保留。${mapping.manifest?.action === "create-current" ? "缺失的 current manifest 已在最后一步创建。" : "已有 current manifest 保持原字节。"}
`;
}

function renderProjectIndex(projectId, cycles, memory, deliveries, legacyWorkItems) {
  return `---
kind: project-index
name: ${projectId}
status: preview
---

# ${projectId} History Refresh 预览

- [Cycle 索引](cycles/INDEX.md)：${cycles.length} 个旧 Cycle。
- [Memory 索引](memory/INDEX.md)：${memory.length} 个现有 Memory Record。
- [Experiment 索引](experiments/INDEX.md)。
- Live Delivery：${deliveries.length} 个，激活前保留在旧入口。
- Root legacy work item：${legacyWorkItems.length} 个，激活后保留在 Legacy 索引等待显式处理。

此目录只是预览，不是当前 Workflow 入口。
`;
}

function renderCycleIndex(cycles) {
  const rows = cycles.map((cycle) => (
    `| [${cycle.id}](${cycle.id}/SUMMARY.md) | ${escapeTable(cycle.name)} | closed | ${cycle.fileCount} | ${cycle.missing.length ? `需审阅：${cycle.missing.join("、")}` : "高置信"} |`
  ));
  return `---
kind: cycle-index
status: preview
---

# 旧 Cycle 语义索引预览

| Cycle | 名称 | 状态 | 旧文件 | 映射置信度 |
| --- | --- | --- | ---: | --- |
${rows.join("\n")}
`;
}

function renderMemoryIndex(records, knowledgeFiles) {
  const rows = records.map((record) => `| ${escapeTable(record.name)} | \`${record.kind}\` | ${escapeTable(record.scope)} | \`${record.status}\` | \`${record.path}\` |`);
  return `---
kind: memory-index
status: preview
---

# Memory 索引预览

现有 Memory Records 已经是可读 Markdown，建议原地保留并只重建索引。旧 Knowledge 的 ${knowledgeFiles.length} 个文件暂不自动合并，避免重复或错误覆盖。

| 名称 | 类型 | Scope | 状态 | 来源 |
| --- | --- | --- | --- | --- |
${rows.length ? rows.join("\n") : "| 无 | - | - | - | - |"}
`;
}

function renderExperimentIndex(records) {
  const experiments = records.filter((record) => record.kind === "experiment");
  return `---
kind: experiment-index
status: preview
---

# Experiment 索引预览

${experiments.length ? experiments.map((item) => `- ${item.name}：\`${item.path}\``).join("\n") : "当前 Memory Records 中没有可高置信识别为 Experiment 的文件。旧实验相关 Delivery 不会被自动当作实验结果。"}
`;
}

function renderCyclePlan(cycle) {
  const rows = cycle.milestones.map((item) => `| \`${item.id}\` | ${escapeTable(item.title)} | ${escapeTable(item.outcome || item.title)} | ${item.report ? `旧 report：\`${cycle.source}/${item.report}\`` : "旧 Cycle 完成状态"} |`);
  return frontmatter({
    kind: "plan",
    cycle: cycle.id,
    status: "completed",
    progress: "PROGRESS.md",
    execution: "EXECUTION.md",
    archived_source: cycle.source,
  }, `# ${cycle.name} 历史 Plan

## 执行目的

${safeText(cycle.summaryText)}

## 执行边界

本文件从旧 Cycle 元数据与 milestone history 生成，仅用于历史导航，不重新授权或重放旧任务。

## 验证目标

保留旧完成状态和 report 引用；详细验证仍以只读旧归档为准。

## 完整计划

| ID | 阶段 | 期望结果 | 验证方式 |
| --- | --- | --- | --- |
${rows.join("\n")}
`);
}

function renderCycleProgress(cycle) {
  const current = cycle.milestones.at(-1)?.id || "M1";
  const rows = cycle.milestones.map((item) => `| \`${item.id}\` | ${escapeTable(item.title)} | \`${item.status}\` | ${item.report ? `旧 report：\`${cycle.source}/${item.report}\`` : "旧 Cycle 记录为完成"} | 无 |`);
  return frontmatter({
    kind: "progress",
    cycle: cycle.id,
    plan: "PLAN.md",
    status: "closed",
    current,
    next: "none",
    archived_source: cycle.source,
  }, `# ${cycle.name} 历史进度

## 当前状态

该 Cycle 已关闭。本表是 History Refresh 根据旧 state/Progress 生成的最终状态投影。

## 完整计划状态

| ID | 阶段 | 状态 | 当前结果 / 证据 | 下一步 |
| --- | --- | --- | --- | --- |
${rows.join("\n")}

## 阻塞

- 无当前执行阻塞；历史缺口见 \`SUMMARY.md\`。

## 计划变化

- 未重建旧计划修订过程，只保留最终 milestone 列表。

## 下一步

无。后续工作必须创建新的 Cycle，并通过 \`builds_on\` 选择性继承。
`);
}

function renderCycleExecution(cycle) {
  const entries = [...cycle.milestones].reverse().map((item) => `## ${item.finished || cycle.finished || "时间未知"} - ${item.title}

- **计划项：** \`${item.id}\`
- **目的：** ${safeText(item.outcome || item.title)}
- **结果：** 旧 Cycle 记录状态为 \`${item.status}\`。
- **证据：** ${item.report ? `\`${cycle.source}/${item.report}\`` : `\`${cycle.source}/state.yaml\``}
- **计划影响：** 历史记录，不触发新执行。
- **遇到的问题：** 详细信息请查看旧 report。
- **下一步：** ${item === cycle.milestones[0] ? "Cycle 已关闭。" : "查看前一 checkpoint。"}`);
  return frontmatter({ kind: "execution-log", cycle: cycle.id, archived_source: cycle.source }, `# ${cycle.name} 历史执行记录

本文件只提炼旧 milestone checkpoint，不复制工具日志或完整 reports。

${entries.join("\n\n")}
`);
}

function renderCycleDiscussion(cycle) {
  return frontmatter({
    kind: "discussion-summary",
    cycle: cycle.id,
    raw_discussion: "unavailable",
    archived_source: cycle.source,
  }, `# ${cycle.name} 历史讨论摘要

## 已确认需求

- ${safeText(cycle.summaryText)}

## 已作决定

- History Refresh 不从 state 或 reports 推断用户原话；重要决定继续引用旧 Summary/Knowledge。

## 接受与拒绝

${cycle.confirmSummary ? `- 发现旧确认摘要：\`${cycle.source}/confirm-summary.md\`。` : "- 未发现可高置信识别的独立确认摘要。"}

## 纠正与分歧

- 无法从归档可靠重建逐字过程；不伪造责任证据。

## 未决问题

${cycle.missing.length ? cycle.missing.map((item) => `- 缺少 \`${item}\`。`).join("\n") : "- 无结构性缺失。"}
`);
}

function renderCycleSummary(cycle) {
  const original = cycle.summary ? safeText(cycle.summary.trim()) : "旧归档没有 `summary.md`；以下结论来自 `cycle.yaml`。";
  return frontmatter({
    kind: "cycle-summary",
    cycle: cycle.id,
    status: "closed",
    started: cycle.started,
    finished: cycle.finished,
    archived_source: cycle.source,
  }, `# ${cycle.name} 总结

## 目的与边界

${safeText(cycle.summaryText)}

## 最终结果

旧 Cycle 状态：\`${cycle.status}\`。本预览不重新判断旧结果，只建立可读导航。

## 验证结果

- ${cycle.milestones.length} 个历史 milestone 已映射。
- ${cycle.fileCount} 个旧文件继续保存在 \`${cycle.source}\`。

## 重要决定与经验

${cycle.lessons.length ? cycle.lessons.map((item) => `- ${safeText(item)}`).join("\n") : "- 旧 `cycle.yaml` 没有结构化 lessons；请查看原始 Summary。"}

## 后续候选

- 不自动继承旧任务；新 Cycle 应通过 \`builds_on\` 选择需要的结果或经验。

## 映射缺口

${cycle.missing.length ? cycle.missing.map((item) => `- 缺少 \`${item}\`。`).join("\n") : "- 无结构性缺失。"}

## 旧总结原文

${original}
`);
}

function frontmatter(attributes, body) {
  const clean = Object.fromEntries(Object.entries(attributes).filter(([, value]) => value !== null && value !== undefined));
  return `---\n${stringifyYaml(clean).trimEnd()}\n---\n\n${body.trim()}\n`;
}

async function walkFiles(root) {
  const files = [];
  async function visit(directory, prefix = "") {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
      if (entry.isSymbolicLink()) continue;
      const absolute = join(directory, entry.name);
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await visit(absolute, path);
      else if (entry.isFile()) files.push(path);
    }
  }
  await visit(root);
  return files;
}

async function walkOptional(root) {
  try {
    return await walkFiles(root);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function readTreeOptional(root) {
  try {
    const stats = await lstat(root);
    if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error("History Refresh output is not an ordinary directory");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  const result = new Map();
  for (const path of await walkFiles(root)) result.set(path, await readFile(join(root, path), "utf8"));
  return result;
}

function sameFiles(left, right) {
  if (left.size !== right.size) return false;
  for (const [path, content] of right) if (left.get(path) !== content) return false;
  return true;
}

function countTopLevel(paths) {
  const counts = {};
  for (const path of paths) {
    const key = path.split("/")[0];
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function countValues(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] || 0) + 1;
  return counts;
}

function cycleOrder(name) {
  return Number(/^C(\d+)/.exec(name)?.[1] || Number.MAX_SAFE_INTEGER);
}

function normalizeHistoricalStatus(value) {
  const status = String(value || "").toLowerCase();
  if (["deferred", "cancelled", "skipped"].includes(status)) return "cancelled";
  return "completed";
}

function findReport(reports, item, index) {
  const token = basename(String(item.prompt_file || item.name || item.title || ""), ".md").toLowerCase();
  return reports.find((path) => path.toLowerCase().includes(token)) || reports[index] || null;
}

function samePrompt(entry, item) {
  if (entry.prompt_name && item.name && entry.prompt_name === item.name) return true;
  if (!entry.prompt_file || !item.prompt_file) return false;
  return basename(String(entry.prompt_file)) === basename(String(item.prompt_file));
}

function archiveRelative(path) {
  return String(path).replace(/^\.pipeline\/reports\//, "reports/").replace(/^reports\//, "reports/");
}

function firstParagraph(markdown) {
  return markdown.split(/\n\s*\n/).map((part) => part.trim()).find((part) => part && !part.startsWith("#")) || "";
}

function firstTitle(body) {
  return /^#\s+(.+)$/m.exec(body)?.[1]?.trim() || null;
}

function formatScope(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return value.ref || value.type || JSON.stringify(value);
  return "unknown";
}

function escapeTable(value) {
  return safeText(value).replaceAll("|", "\\|").replace(/\s+/g, " ");
}

function safeText(value) {
  return String(redactSecrets(String(value ?? ""))).trim();
}

function stripMarkdown(value) {
  return String(value || "")
    .replace(/[`*_✅🔄⏳❌]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function readOptional(path, fallback) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

async function fileExists(path) {
  try {
    const stats = await lstat(path);
    return stats.isFile() && !stats.isSymbolicLink();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function writeAtomicFile(path, content) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = join(dirname(path), `.${basename(path)}.tmp-${process.pid}`);
  await writeFile(temporary, content, "utf8");
  try {
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

function relativePath(root, path) {
  return path.slice(root.length + 1).replaceAll("\\", "/");
}

function parseLegacyYaml(source) {
  try {
    return { value: parseYaml(source), error: null };
  } catch (error) {
    return { value: {}, error: error?.message || "invalid YAML" };
  }
}

export async function treeDigest(root) {
  const hash = createHash("sha256");
  for (const path of await walkFiles(resolve(root))) {
    hash.update(path);
    hash.update(await readFile(join(resolve(root), path)));
  }
  return hash.digest("hex");
}
