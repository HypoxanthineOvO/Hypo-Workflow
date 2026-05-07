import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { redactSecrets } from "../evidence/index.js";
import { stringifyYaml } from "../config/index.js";

export const CHANGE_REQUEST_FILES = Object.freeze([
  "request.yaml",
  "summary.md",
  "review-notes.md",
  "changes.md",
  "decisions.yaml",
  "evidence/",
]);

export const CHANGE_REQUEST_REMOTE_WRITE_GATE = "confirm";

export function normalizeChangeRequestSource(source = {}) {
  if (typeof source === "object" && source.provider && source.url) return normalizeKnownChangeRequest(source);
  const raw = String(source || "").trim();
  if (isChangeRequestArchiveId(raw)) return normalizeLocalArchiveId(raw);
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Unsupported Change Request URL: ${raw}`);
  }
  if (url.hostname === "github.com") return normalizeGitHubPullRequest(url);
  if (url.hostname === "gitlab.com") return normalizeGitLabMergeRequest(url);
  throw new Error(`Unsupported Change Request URL: ${raw}`);
}

export function buildChangeRequestArchive(source, options = {}) {
  const normalized = normalizeChangeRequestSource(source);
  const now = options.now || new Date().toISOString();
  const request = {
    provider: normalized.provider,
    kind: normalized.kind,
    host: normalized.host,
    owner: normalized.owner,
    repository: normalized.repository,
    number: normalized.number,
    ref: normalized.ref,
    url: normalized.url,
    archive_id: normalized.archive_id || null,
    source_branch: options.request?.source_branch || null,
    target_branch: options.request?.target_branch || null,
    author: options.request?.author || null,
    status_snapshot: options.request?.status_snapshot || "unknown",
    created_at: now,
  };
  const decisions = {
    remote_write_gate: CHANGE_REQUEST_REMOTE_WRITE_GATE,
    allowed_without_confirmation: ["inspect", "review", "local_archive_write"],
    requires_confirmation: [
      "push",
      "merge",
      "close",
      "reviewer_write",
      "label_write",
      "target_branch_write",
    ],
    final_status: "pending",
    confirmations: [],
  };
  const id = options.archive_id || normalized.archive_id || "PR-YYYYMMDD-NNN";
  return {
    id,
    request,
    decisions,
    files: [...CHANGE_REQUEST_FILES],
    remote_source_of_truth: false,
    summary_md: renderChangeRequestSummary(id, request),
    review_notes_md: renderReviewNotes(),
    changes_md: renderChanges(),
    evidence_snapshot_md: renderEvidenceSnapshot(options.evidence || {}),
  };
}

export async function writeChangeRequestArchive(projectRoot = ".", source, options = {}) {
  const now = options.now || new Date().toISOString();
  const id = options.archive_id || await nextArchiveId(projectRoot, options.date || compactDate(now));
  const archive = buildChangeRequestArchive(source, {
    ...options,
    archive_id: id,
    now,
  });
  const path = join(projectRoot, ".pipeline", "pr", id);
  await mkdir(join(path, "evidence"), { recursive: true });
  await writeFile(join(path, "request.yaml"), `${stringifyYaml(archive.request).trimEnd()}\n`, "utf8");
  await writeFile(join(path, "decisions.yaml"), `${stringifyYaml(archive.decisions).trimEnd()}\n`, "utf8");
  await writeFile(join(path, "summary.md"), archive.summary_md, "utf8");
  await writeFile(join(path, "review-notes.md"), archive.review_notes_md, "utf8");
  await writeFile(join(path, "changes.md"), archive.changes_md, "utf8");
  await writeFile(join(path, "evidence", "snapshot.md"), archive.evidence_snapshot_md, "utf8");
  return {
    ...archive,
    path,
  };
}

export async function inspectChangeRequest(projectRoot = ".", source, options = {}) {
  const provider = requireReadonlyProvider(options.provider);
  const remote = await provider.readChangeRequest(source);
  const diff = await provider.readDiff(source);
  const comments = await provider.readComments(source);
  const checks = await provider.readChecks(source);
  const archive = await writeChangeRequestArchive(projectRoot, source, {
    ...options,
    request: {
      source_branch: remote.source_branch || null,
      target_branch: remote.target_branch || null,
      author: remote.author || null,
      status_snapshot: remote.status_snapshot || remote.status || "unknown",
    },
    evidence: {
      remote,
      diff,
      comments,
      checks,
    },
  });
  const summary = renderInspectSummary(archive.id, archive.request, { remote, diff, comments, checks });
  await writeFile(join(archive.path, "summary.md"), summary, "utf8");
  return {
    mode: "inspect",
    remote_write_attempted: false,
    archive: {
      ...archive,
      summary_md: summary,
    },
    evidence: {
      remote,
      diff,
      comments,
      checks,
    },
  };
}

export async function reviewChangeRequest(projectRoot = ".", source, options = {}) {
  const inspected = await inspectChangeRequest(projectRoot, source, options);
  const findings = buildReviewFindings(inspected.evidence);
  const mergeRecommendation = findings.some((finding) => finding.severity === "warning") ? "blocked" : "ready_for_human_review";
  const notes = renderReviewFindings(inspected.archive.id, findings, mergeRecommendation);
  await writeFile(join(inspected.archive.path, "review-notes.md"), notes, "utf8");
  return {
    ...inspected,
    mode: "review",
    merge_recommendation: mergeRecommendation,
    findings,
    archive: {
      ...inspected.archive,
      review_notes_md: notes,
    },
  };
}

export async function planChangeRequestFix(projectRoot = ".", source, options = {}) {
  const inspected = await inspectChangeRequest(projectRoot, source, options);
  const changes = renderFixChanges(options.local_changes || [], options.tests || []);
  const decisions = {
    ...inspected.archive.decisions,
    proposed_operation: "fix",
    push_requires_confirmation: true,
    confirmation_required: true,
    confirmation_prompt: "Confirm before push or any remote PR/MR update.",
  };
  await writeFile(join(inspected.archive.path, "changes.md"), changes, "utf8");
  await writeDecisions(inspected.archive.path, decisions);
  return {
    ...inspected,
    mode: "fix",
    remote_write_attempted: false,
    confirmation_prompt: decisions.confirmation_prompt,
    archive: {
      ...inspected.archive,
      changes_md: changes,
      decisions,
    },
  };
}

export async function prepareChangeRequestMerge(projectRoot = ".", source, options = {}) {
  const inspected = await inspectChangeRequest(projectRoot, source, options);
  const blockers = mergeBlockers(inspected.evidence.remote, inspected.evidence.checks);
  const status = blockers.length ? "blocked" : "waiting_confirmation";
  const decisions = {
    ...inspected.archive.decisions,
    proposed_operation: "merge",
    confirmation_required: true,
    readiness: status,
    blockers,
    confirmation_prompt: "Confirm merge before any remote merge operation.",
  };
  await writeDecisions(inspected.archive.path, decisions);
  return {
    ...inspected,
    mode: "merge",
    status,
    blockers,
    remote_write_attempted: false,
    confirmation_prompt: decisions.confirmation_prompt,
    archive: {
      ...inspected.archive,
      decisions,
    },
  };
}

export async function prepareChangeRequestClose(projectRoot = ".", source, options = {}) {
  const reason = String(options.reason || "").trim();
  if (!reason) throw new Error("A close reason is required before preparing a Change Request close proposal.");
  const inspected = await inspectChangeRequest(projectRoot, source, options);
  const decisions = {
    ...inspected.archive.decisions,
    proposed_operation: "close",
    close_reason: reason,
    confirmation_required: true,
    readiness: "waiting_confirmation",
    confirmation_prompt: "Confirm close before any remote close operation.",
  };
  await writeDecisions(inspected.archive.path, decisions);
  return {
    ...inspected,
    mode: "close",
    status: "waiting_confirmation",
    remote_write_attempted: false,
    confirmation_prompt: decisions.confirmation_prompt,
    archive: {
      ...inspected.archive,
      decisions,
    },
  };
}

async function nextArchiveId(projectRoot, date) {
  const root = join(projectRoot, ".pipeline", "pr");
  let entries = [];
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const prefix = `PR-${date}-`;
  const used = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
    .map((entry) => Number(entry.name.slice(prefix.length)))
    .filter(Number.isFinite);
  const next = used.length ? Math.max(...used) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

function normalizeGitHubPullRequest(url) {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 4 || parts[2] !== "pull" || !/^\d+$/.test(parts[3])) {
    throw new Error(`Unsupported Change Request URL: ${url.href}`);
  }
  const [owner, repository] = parts;
  const number = Number(parts[3]);
  return {
    provider: "github",
    kind: "pull_request",
    host: url.hostname,
    owner,
    repository,
    number,
    ref: `github/${owner}/${repository}#${number}`,
    url: canonicalUrl(url),
  };
}

function isChangeRequestArchiveId(value) {
  return /^PR-\d{8}-\d{3}$/.test(String(value || ""));
}

function normalizeLocalArchiveId(id) {
  const [, date, sequence] = /^PR-(\d{8})-(\d{3})$/.exec(id);
  return {
    provider: "local",
    kind: "archive",
    host: "local",
    owner: "",
    repository: "",
    number: null,
    ref: id,
    url: "",
    archive_id: id,
    archive_date: date,
    archive_sequence: Number(sequence),
  };
}

function requireReadonlyProvider(provider) {
  if (!provider || typeof provider.readChangeRequest !== "function") {
    throw new Error("Change Request provider must implement readChangeRequest");
  }
  for (const method of ["readDiff", "readComments", "readChecks"]) {
    if (typeof provider[method] !== "function") {
      throw new Error(`Change Request provider must implement ${method}`);
    }
  }
  return provider;
}

function normalizeGitLabMergeRequest(url) {
  const parts = url.pathname.split("/").filter(Boolean);
  const marker = parts.indexOf("-");
  if (marker < 2 || parts[marker + 1] !== "merge_requests" || !/^\d+$/.test(parts[marker + 2] || "")) {
    throw new Error(`Unsupported Change Request URL: ${url.href}`);
  }
  const namespaceParts = parts.slice(0, marker);
  const repository = namespaceParts.at(-1);
  const owner = namespaceParts.slice(0, -1).join("/");
  const number = Number(parts[marker + 2]);
  return {
    provider: "gitlab",
    kind: "merge_request",
    host: url.hostname,
    owner,
    repository,
    number,
    ref: `gitlab/${owner}/${repository}#${number}`,
    url: canonicalUrl(url),
  };
}

function normalizeKnownChangeRequest(source) {
  return {
    provider: String(source.provider),
    kind: String(source.kind || (source.provider === "gitlab" ? "merge_request" : "pull_request")),
    host: String(source.host || new URL(source.url).hostname),
    owner: String(source.owner || ""),
    repository: String(source.repository || ""),
    number: Number(source.number),
    ref: String(source.ref || `${source.provider}/${source.owner}/${source.repository}#${source.number}`),
    url: String(source.url),
  };
}

function canonicalUrl(url) {
  return `${url.protocol}//${url.hostname}${url.pathname}`.replace(/\/+$/g, "");
}

function renderChangeRequestSummary(id, request) {
  return [
    `# ${id} Change Request`,
    "",
    `- Source: ${request.ref}`,
    `- Provider: ${request.provider}`,
    `- URL: ${request.url}`,
    `- Status snapshot: ${request.status_snapshot}`,
    `- Local archive is evidence, not the remote source of truth.`,
    `- PR/MR remote write、push、merge、close、reviewer/label/target branch 修改等远端写操作必须人工确认。`,
    "",
  ].join("\n");
}

function renderReviewNotes() {
  return [
    "# Review Notes",
    "",
    "- 待 `/hw:pr inspect` 或 `/hw:pr review` 写入只读审查证据。",
    "",
  ].join("\n");
}

function renderInspectSummary(id, request, evidence) {
  const files = Array.isArray(evidence.diff?.files) ? evidence.diff.files : [];
  const checks = Array.isArray(evidence.checks) ? evidence.checks : [];
  const comments = Array.isArray(evidence.comments) ? evidence.comments : [];
  return [
    `# ${id} Inspect Summary`,
    "",
    `- Source: ${request.ref}`,
    `- Provider: ${request.provider}`,
    `- Status snapshot: ${request.status_snapshot}`,
    `- Branch: ${request.source_branch || "unknown"} -> ${request.target_branch || "unknown"}`,
    `- Mode: remote-readonly; local archive write only.`,
    `- files: ${files.length}`,
    `- checks: ${checks.length}`,
    `- comments: ${comments.length}`,
    `- PR/MR remote write remains gated by explicit confirmation.`,
    "",
  ].join("\n");
}

function buildReviewFindings(evidence) {
  const findings = [];
  const files = Array.isArray(evidence.diff?.files) ? evidence.diff.files : [];
  const checks = Array.isArray(evidence.checks) ? evidence.checks : [];
  const comments = Array.isArray(evidence.comments) ? evidence.comments : [];
  for (const check of checks.filter((item) => String(item.status || "").toLowerCase() !== "passed")) {
    findings.push({
      severity: "warning",
      source: "checks",
      summary: redactSecrets(`${check.name || "check"} is ${check.status || "unknown"}`),
    });
  }
  for (const comment of comments) {
    findings.push({
      severity: "info",
      source: "comments",
      summary: redactSecrets(comment.body || String(comment)),
    });
  }
  for (const file of files) {
    findings.push({
      severity: Number(file.additions || 0) + Number(file.deletions || 0) > 100 ? "warning" : "info",
      source: "diff",
      summary: redactSecrets(`${file.path || "unknown"} +${file.additions || 0}/-${file.deletions || 0}`),
    });
  }
  if (findings.length === 0) {
    findings.push({
      severity: "info",
      source: "review",
      summary: "No review findings from available fixture evidence.",
    });
  }
  return findings;
}

function renderReviewFindings(id, findings, mergeRecommendation) {
  return [
    `# ${id} Review Notes`,
    "",
    `- Merge recommendation: ${mergeRecommendation}`,
    "- 远端写操作未执行；push、merge、close 仍需人工确认。",
    "",
    "## Findings",
    "",
    ...findings.map((finding) => `- [${finding.severity}] ${finding.source}: ${redactSecrets(finding.summary)}`),
    "",
  ].join("\n");
}

function renderChanges() {
  return [
    "# Local Changes",
    "",
    "- 待 `/hw:pr fix` 记录本地修改、测试和建议的人工操作。",
    "",
  ].join("\n");
}

function renderFixChanges(localChanges, tests) {
  return [
    "# Local Changes",
    "",
    "## Planned / Applied Local Changes",
    "",
    ...(localChanges.length ? localChanges.map((item) => `- ${item}`) : ["- No local changes recorded yet."]),
    "",
    "## Tests",
    "",
    ...(tests.length ? tests.map((item) => `- ${item}`) : ["- No tests recorded yet."]),
    "",
    "## Remote Steps",
    "",
    "- Push, merge, close, reviewer/label writes, and target branch writes require explicit confirmation.",
    "",
  ].join("\n");
}

function renderEvidenceSnapshot(evidence) {
  const redacted = redactSecrets(evidence);
  return [
    "# Evidence Snapshot",
    "",
    "```yaml",
    stringifyYaml(redacted).trimEnd() || "{}",
    "```",
    "",
  ].join("\n");
}

function mergeBlockers(remote, checks) {
  const blockers = [];
  for (const check of Array.isArray(checks) ? checks : []) {
    if (String(check.status || "").toLowerCase() !== "passed") {
      blockers.push(`check ${check.name || "unknown"} is ${check.status || "unknown"}`);
    }
  }
  const approvals = Number(remote?.approvals || 0);
  const required = Number(remote?.approvals_required || 0);
  if (required > approvals) blockers.push(`approval missing: ${approvals}/${required}`);
  if (remote?.conflicts === true || remote?.mergeable === false) blockers.push("conflict or non-mergeable state reported");
  return blockers;
}

async function writeDecisions(archivePath, decisions) {
  await writeFile(join(archivePath, "decisions.yaml"), `${stringifyYaml(decisions).trimEnd()}\n`, "utf8");
}

function compactDate(value) {
  const text = String(value || "");
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (match) return `${match[1]}${match[2]}${match[3]}`;
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}
