import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { appendKnowledgeRecord, rebuildKnowledgeLedger } from "../knowledge/index.js";
import { parseYaml, projectRegistryId, stringifyYaml, writeConfig } from "../config/index.js";
import { assertLegacyWorkspaceWritable } from "../workspace-format/index.js";

export async function createExploration(projectRoot = ".", options = {}) {
  await assertLegacyWorkspaceWritable(projectRoot, "legacy.explore");
  const root = resolve(projectRoot);
  const dirty = await decideExploreDirtyWorktree(root);
  if (dirty.requires_decision && !options.allowDirty) {
    throw new Error("dirty worktree requires explicit user decision before starting exploration");
  }

  const now = options.now || new Date().toISOString();
  const topic = String(options.topic || "").trim();
  if (!topic) throw new Error("exploration topic is required");
  const id = options.id || await nextExplorationId(root);
  const slug = `${id}-${slugify(topic)}`;
  const metadataDir = join(root, ".pipeline", "explorations", slug);
  const relativeDir = `.pipeline/explorations/${slug}`;
  const baseBranch = options.baseBranch || git(root, ["branch", "--show-current"]) || "HEAD";
  const baseCommit = options.baseCommit || git(root, ["rev-parse", "HEAD"]);
  const exploreBranch = options.branch || `explore/${slug}`;
  const worktreePath = options.worktreePath || buildExploreWorktreePath(root, slug, options);
  const exploration = {
    id,
    slug: slugify(topic),
    topic,
    status: "active",
    source_project: {
      id: projectRegistryId(root),
      path: root,
    },
    base_branch: baseBranch,
    base_commit: baseCommit,
    explore_branch: exploreBranch,
    worktree_path: worktreePath,
    notes_path: `${relativeDir}/notes.md`,
    summary_path: `${relativeDir}/summary.md`,
    created_at: now,
  };

  await mkdir(metadataDir, { recursive: true });
  ensureWorktree(root, exploreBranch, worktreePath, baseCommit);
  await writeConfig(join(metadataDir, "exploration.yaml"), exploration);
  await writeFile(join(metadataDir, "notes.md"), `# ${topic}\n\n`, "utf8");
  await writeFile(join(metadataDir, "summary.md"), `# ${topic}\n\nStatus: active\n`, "utf8");
  await appendLifecycleLog(root, {
    id: `EXPLORE-START-${id}-${compactTimestamp(now)}`,
    type: "exploration_start",
    ref: id,
    status: "active",
    timestamp: now,
    summary: `Started exploration ${id}: ${topic}`,
    report: `${relativeDir}/exploration.yaml`,
    trigger: options.trigger || "manual",
  });
  const knowledge = await appendKnowledgeRecord(root, {
    type: "explore",
    source: { explore_id: id },
    created_at: now,
    summary: `Explore ${id}: ${topic}`,
    details: {
      status: "active",
      worktree_path: worktreePath,
      branch: exploreBranch,
    },
    tags: ["explore", id.toLowerCase()],
    categories: ["references", "decisions"],
    refs: { files: [`${relativeDir}/exploration.yaml`, `${relativeDir}/notes.md`, `${relativeDir}/summary.md`] },
  });
  await rebuildKnowledgeLedger(root);
  return { exploration, metadata_dir: relativeDir, knowledge };
}

export async function decideExploreDirtyWorktree(projectRoot = ".") {
  const root = resolve(projectRoot);
  const output = git(root, ["status", "--short"], { allowFailure: true });
  const dirty = Boolean(output.trim());
  return {
    dirty,
    requires_decision: dirty,
    summary: dirty ? `dirty worktree has pending changes:\n${output.trim()}` : "worktree clean",
    files: output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  };
}

export async function listExplorations(projectRoot = ".") {
  const root = resolve(projectRoot);
  const dir = join(root, ".pipeline", "explorations");
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const explorations = [];
  for (const entry of entries.filter((item) => item.isDirectory())) {
    const file = join(dir, entry.name, "exploration.yaml");
    try {
      explorations.push(withExplorationRuntimeFields(parseYaml(await readFile(file, "utf8")), entry.name));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return explorations.sort((a, b) => explorationNumber(a.id) - explorationNumber(b.id));
}

export async function readExploration(projectRoot = ".", ref) {
  const found = await findExploration(projectRoot, ref);
  return found.exploration;
}

export async function endExploration(projectRoot = ".", ref, options = {}) {
  await assertLegacyWorkspaceWritable(projectRoot, "legacy.explore");
  const root = resolve(projectRoot);
  const found = await findExploration(root, ref);
  const now = options.now || new Date().toISOString();
  const summary = buildExplorationSummary(found.exploration, options);
  const exploration = {
    ...found.exploration,
    status: "ended",
    ended_at: now,
    outcome: summary.outcome,
    findings: summary.findings,
    changed_files: summary.changed_files,
    commits: summary.commits,
  };
  await writeConfig(found.file, stripRuntimeFields(exploration));
  await writeFile(join(found.dir, "summary.md"), renderExplorationSummary(exploration, summary), "utf8");
  await appendLifecycleLog(root, {
    id: `EXPLORE-END-${exploration.id}-${compactTimestamp(now)}`,
    type: "exploration_end",
    ref: exploration.id,
    status: "ended",
    timestamp: now,
    summary: `Ended exploration ${exploration.id}: ${summary.outcome || exploration.topic}`,
    report: exploration.summary_path,
    trigger: options.trigger || "manual",
  });
  await appendExploreKnowledge(root, exploration, {
    now,
    summary: `Ended explore ${exploration.id}: ${exploration.topic}`,
    status: "ended",
    refs: [exploration.summary_path, exploration.notes_path],
  });
  return { exploration, summary };
}

export async function archiveExploration(projectRoot = ".", ref, options = {}) {
  await assertLegacyWorkspaceWritable(projectRoot, "legacy.explore");
  if (options.deleteWorktree && !options.confirmDelete) {
    throw new Error("explicit deletion confirmation is required before deleting an exploration worktree");
  }
  const root = resolve(projectRoot);
  const found = await findExploration(root, ref);
  const now = options.now || new Date().toISOString();
  let worktreeDeleted = false;
  if (options.deleteWorktree) {
    git(root, ["worktree", "remove", "--force", found.exploration.worktree_path]);
    worktreeDeleted = true;
  }
  const exploration = {
    ...found.exploration,
    status: "archived",
    archived_at: now,
    worktree_retained: !worktreeDeleted,
  };
  await writeConfig(found.file, stripRuntimeFields(exploration));
  await appendLifecycleLog(root, {
    id: `EXPLORE-ARCHIVE-${exploration.id}-${compactTimestamp(now)}`,
    type: "exploration_archive",
    ref: exploration.id,
    status: "archived",
    timestamp: now,
    summary: `Archived exploration ${exploration.id}; worktree ${worktreeDeleted ? "deleted" : "retained"}.`,
    report: exploration.summary_path,
    trigger: options.trigger || "manual",
  });
  await appendExploreKnowledge(root, exploration, {
    now,
    summary: `Archived explore ${exploration.id}: ${exploration.topic}`,
    status: "archived",
    refs: [exploration.summary_path, exploration.notes_path],
  });
  return {
    exploration,
    worktree_retained: !worktreeDeleted,
    worktree_deleted: worktreeDeleted,
  };
}

export async function buildExplorePlanContext(projectRoot = ".", source) {
  const ref = normalizeExploreContextSource(source);
  const exploration = await readExploration(projectRoot, ref.id);
  const root = resolve(projectRoot);
  const notes = await readOptional(join(root, exploration.notes_path));
  const summary = await readOptional(join(root, exploration.summary_path));
  return {
    kind: "plan_context",
    source: ref.source,
    exploration,
    evidence_refs: [exploration.summary_path, exploration.notes_path, `.pipeline/explorations/${exploration.directory}/exploration.yaml`],
    discover_context: [
      `Explore ${exploration.id}: ${exploration.topic}`,
      `Status: ${exploration.status}`,
      summary.trim(),
      notes.trim(),
    ].filter(Boolean).join("\n\n"),
  };
}

export async function createExploreAnalysisContext(projectRoot = ".", ref, options = {}) {
  await assertLegacyWorkspaceWritable(projectRoot, "legacy.explore");
  const exploration = await readExploration(projectRoot, ref);
  const root = resolve(projectRoot);
  const notes = await readOptional(join(root, exploration.notes_path));
  const summary = await readOptional(join(root, exploration.summary_path));
  const context = {
    source: `explore:${exploration.id}`,
    created_at: options.now || new Date().toISOString(),
    topic: exploration.topic,
    status: exploration.status,
    summary: summary.trim(),
    hypotheses: extractBullets(notes, "Hypotheses"),
    evidence: extractBullets(notes, "Evidence"),
    evidence_refs: [exploration.summary_path, exploration.notes_path, `.pipeline/explorations/${exploration.directory}/exploration.yaml`],
    worktree_path: exploration.worktree_path,
    explore_branch: exploration.explore_branch,
  };
  const relativePath = `.pipeline/analysis/explore-${exploration.id}-context.yaml`;
  await writeConfig(join(root, relativePath), context);
  await appendLifecycleLog(root, {
    id: `EXPLORE-ANALYSIS-CONTEXT-${exploration.id}-${compactTimestamp(context.created_at)}`,
    type: "exploration_upgrade_analysis",
    ref: exploration.id,
    status: "created",
    timestamp: context.created_at,
    summary: `Created analysis context from exploration ${exploration.id}.`,
    report: relativePath,
    trigger: options.trigger || "manual",
  });
  return { path: relativePath, context };
}

export function buildExploreWorktreePath(projectRoot = ".", slug, options = {}) {
  const homeDir = resolve(options.homeDir || homedir());
  const projectId = options.projectId || projectRegistryId(resolve(projectRoot));
  return join(homeDir, ".hypo-workflow", "worktrees", projectId, slug);
}

async function findExploration(projectRoot, ref) {
  const root = resolve(projectRoot);
  const normalized = String(ref || "").replace(/^explore:/i, "").trim();
  const entries = await listExplorations(root);
  const exploration = entries.find((item) => {
    return item.id === normalized || item.directory === normalized || `${item.id}-${item.slug}` === normalized;
  });
  if (!exploration) throw new Error(`Exploration not found: ${ref}`);
  const dir = join(root, ".pipeline", "explorations", exploration.directory);
  return {
    exploration,
    dir,
    file: join(dir, "exploration.yaml"),
  };
}

async function nextExplorationId(projectRoot) {
  const root = join(projectRoot, ".pipeline", "explorations");
  let entries = [];
  try {
    entries = await import("node:fs/promises").then(({ readdir }) => readdir(root, { withFileTypes: true }));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const max = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => /^E(\d+)/.exec(entry.name)?.[1])
    .filter(Boolean)
    .map(Number)
    .reduce((highest, value) => Math.max(highest, value), 0);
  return `E${String(max + 1).padStart(3, "0")}`;
}

function buildExplorationSummary(exploration, options) {
  const commits = listCommits(exploration.worktree_path, exploration.base_commit);
  const changedFiles = listChangedFiles(exploration.worktree_path, exploration.base_commit);
  return {
    outcome: String(options.outcome || "").trim(),
    findings: normalizeList(options.findings),
    changed_files: changedFiles,
    commits,
  };
}

function listChangedFiles(worktreePath, baseCommit) {
  const committed = git(worktreePath, ["diff", "--name-only", `${baseCommit}..HEAD`], { allowFailure: true });
  const pending = git(worktreePath, ["status", "--short"], { allowFailure: true })
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
  return unique([...committed.split(/\r?\n/).filter(Boolean), ...pending]).sort();
}

function listCommits(worktreePath, baseCommit) {
  const output = git(worktreePath, ["log", "--pretty=format:%H%x09%s", `${baseCommit}..HEAD`], { allowFailure: true });
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [hash, ...subject] = line.split("\t");
      return { hash, subject: subject.join("\t") };
    });
}

function renderExplorationSummary(exploration, summary) {
  return [
    `# ${exploration.topic}`,
    "",
    `Status: ${exploration.status}`,
    `Outcome: ${summary.outcome || ""}`,
    "",
    "## Findings",
    ...renderList(summary.findings),
    "",
    "## Changed Files",
    ...renderList(summary.changed_files),
    "",
    "## Commits",
    ...summary.commits.map((commit) => `- ${commit.hash.slice(0, 12)} ${commit.subject}`),
    "",
  ].join("\n");
}

async function appendExploreKnowledge(root, exploration, options) {
  await appendKnowledgeRecord(root, {
    type: "explore",
    source: { explore_id: exploration.id },
    created_at: options.now,
    summary: options.summary,
    details: {
      status: options.status,
      topic: exploration.topic,
      worktree_path: exploration.worktree_path,
    },
    tags: ["explore", exploration.id.toLowerCase(), options.status],
    categories: ["references", "decisions"],
    refs: { files: options.refs },
  });
  await rebuildKnowledgeLedger(root);
}

function normalizeExploreContextSource(source) {
  const raw = String(source || "").trim();
  const match = /^explore:(E\d+)$/i.exec(raw) || /^(E\d+)$/i.exec(raw);
  if (!match) throw new Error(`Unsupported explore context source: ${source}`);
  const id = `E${String(Number(match[1].slice(1))).padStart(3, "0")}`;
  return { id, source: `explore:${id}` };
}

function extractBullets(source, heading) {
  const lines = source.split(/\r?\n/);
  const result = [];
  let inSection = false;
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      inSection = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "i").test(line.trim());
      continue;
    }
    if (inSection && /^-\s+/.test(line.trim())) result.push(line.trim().replace(/^-\s+/, ""));
  }
  return result;
}

async function readOptional(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

function withExplorationRuntimeFields(exploration, directory) {
  return {
    ...exploration,
    directory,
    metadata_path: `.pipeline/explorations/${directory}/exploration.yaml`,
  };
}

function stripRuntimeFields(exploration) {
  const { directory, metadata_path, ...rest } = exploration;
  return rest;
}

function ensureWorktree(root, branch, path, baseCommit) {
  const existing = git(root, ["worktree", "list", "--porcelain"], { allowFailure: true });
  if (existing.includes(path)) return;
  git(root, ["worktree", "add", "-b", branch, path, baseCommit]);
}

async function appendLifecycleLog(projectRoot, entry) {
  const file = join(projectRoot, ".pipeline", "log.yaml");
  let log = {};
  try {
    log = parseYaml(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const entries = Array.isArray(log.entries) ? log.entries : [];
  await writeFile(file, `${stringifyYaml({ ...log, entries: [entry, ...entries] })}\n`, "utf8");
}

function git(cwd, args, options = {}) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(result.stderr || result.stdout || `git ${args.join(" ")} failed`);
  }
  return result.stdout.trim();
}

function explorationNumber(id) {
  return Number(/^E(\d+)$/i.exec(String(id || ""))?.[1] || 0);
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  const text = String(value || "").trim();
  return text ? [text] : [];
}

function renderList(values) {
  return values.length ? values.map((value) => `- ${value}`) : ["- none"];
}

function unique(values) {
  return [...new Set(values)];
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "explore";
}

function compactTimestamp(value) {
  return String(value)
    .replace(/[-:]/g, "")
    .replace(/\.\d+/, "")
    .replace(/\+/, "+")
    .replace(/Z$/, "Z");
}
