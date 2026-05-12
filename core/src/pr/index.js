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
export const CHANGE_REQUEST_CREATE_MODES = Object.freeze(["ask", "from_worktree", "plan"]);
export const CHANGE_REQUEST_CREATE_REMOTE_WRITES = Object.freeze([
  "push",
  "create_change_request",
  "reviewer_write",
  "label_write",
  "target_branch_write",
]);
export const CHANGE_REQUEST_PIPELINE_PATH_POLICY = Object.freeze({
  default_action: "block",
  allowed: [".pipeline/pr/**"],
  blocked: [".pipeline/**"],
});

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
  const decisions = baseDecisions([
    "push",
    "merge",
    "close",
    "reviewer_write",
    "label_write",
    "target_branch_write",
  ]);
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
  await writeArchiveFiles(path, archive);
  return {
    ...archive,
    path,
  };
}

export function buildChangeRequestCreateProposal(source = {}, options = {}) {
  const repository = normalizeChangeRequestRepositorySource(source);
  const mode = normalizeCreateMode(options.mode);
  const now = options.now || new Date().toISOString();
  const sourceBranch = options.source_branch || options.request?.source_branch || null;
  const targetBranch = options.target_branch || options.request?.target_branch || "main";
  const title = options.title || options.request?.title || null;
  const body = options.body || options.request?.body || null;
  const reviewers = normalizeStringArray(options.reviewers || options.request?.reviewers);
  const labels = normalizeStringArray(options.labels || options.request?.labels);
  const request = {
    provider: repository.provider,
    kind: repository.provider === "gitlab" ? "merge_request_create" : "pull_request_create",
    host: repository.host,
    owner: repository.owner,
    repository: repository.repository,
    number: null,
    ref: repository.ref,
    url: repository.url,
    archive_id: null,
    source_branch: sourceBranch,
    target_branch: targetBranch,
    author: options.request?.author || null,
    status_snapshot: "create_proposed",
    created_at: now,
  };
  const createProposal = {
    mode,
    provider: request.provider,
    host: request.host,
    repository: request.ref,
    source_branch: sourceBranch,
    target_branch: targetBranch,
    title,
    body,
    reviewers,
    labels,
    proposed_remote_writes: [...CHANGE_REQUEST_CREATE_REMOTE_WRITES],
    confirmation_summary: renderCreateConfirmationSummary({ source_branch: sourceBranch, target_branch: targetBranch, title }),
  };
  const decisions = {
    ...baseDecisions([...CHANGE_REQUEST_CREATE_REMOTE_WRITES]),
    proposed_operation: "create",
    proposed_remote_writes: [...CHANGE_REQUEST_CREATE_REMOTE_WRITES],
    confirmation_required: mode === "from_worktree",
    confirmation_scope: "single_create_flow",
    confirmation_prompt: "Confirm the complete PR/MR create flow before push or any remote create/update operation.",
  };
  const id = options.archive_id || "PR-YYYYMMDD-NNN";
  return {
    id,
    mode,
    request,
    create_proposal: createProposal,
    decisions,
    files: [...CHANGE_REQUEST_FILES, "create-proposal.yaml"],
    remote_source_of_truth: false,
    guidance: createGuidance(mode),
    plan_handoff: mode === "plan"
      ? { command_flow: ["/hw:plan", "/hw:start", "/hw:pr create --from-worktree"] }
      : null,
    summary_md: renderCreateSummary(id, request, createProposal),
    review_notes_md: renderReviewNotes(),
    changes_md: renderCreateChanges(createProposal),
    evidence_snapshot_md: renderEvidenceSnapshot(options.evidence || {}),
  };
}

export async function writeChangeRequestCreateProposal(projectRoot = ".", source = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const id = options.archive_id || await nextArchiveId(projectRoot, options.date || compactDate(now));
  const proposal = buildChangeRequestCreateProposal(source, {
    ...options,
    archive_id: id,
    now,
  });
  const request = { ...proposal.request, archive_id: id };
  const path = join(projectRoot, ".pipeline", "pr", id);
  await writeArchiveFiles(path, {
    ...proposal,
    request,
    extra_files: {
      "create-proposal.yaml": proposal.create_proposal,
    },
  });
  return {
    ...proposal,
    request,
    path,
  };
}

export function buildChangeRequestCreateExecution(input = {}) {
  const proposal = buildChangeRequestCreateProposal({
    provider: input.provider,
    host: input.host,
    owner: input.owner || "local",
    repository: input.repository || "repository",
    url: input.url,
  }, {
    mode: "from_worktree",
    source_branch: input.source_branch,
    target_branch: input.target_branch,
    title: input.title,
    body: input.body,
    reviewers: input.reviewers,
    labels: input.labels,
  });
  const createProposal = proposal.create_proposal || proposal;
  const confirmationSummary = createProposal.confirmation_summary
    || `一次性确认后执行: ${(createProposal.proposed_remote_writes || createProposal.remote_writes || []).join(", ")}`;

  return {
    proposal,
    confirmation_summary: confirmationSummary,
    async run(runtime = {}) {
      if (!runtime.confirmed) {
        return {
          status: "waiting_confirmation",
          remote_write_attempted: false,
          confirmation_summary: confirmationSummary,
        };
      }
      const provider = requireCreateProvider(runtime.provider);
      await provider.pushBranch({
        source_branch: createProposal.source_branch,
      });
      const remote = await provider.createChangeRequest({
        source_branch: createProposal.source_branch,
        target_branch: createProposal.target_branch,
        title: createProposal.title,
        body: createProposal.body,
      });
      if (createProposal.reviewers?.length) {
        await provider.setReviewers({ reviewers: createProposal.reviewers, remote });
      }
      if (createProposal.labels?.length) {
        await provider.setLabels({ labels: createProposal.labels, remote });
      }
      return {
        status: "executed",
        remote_write_attempted: true,
        remote,
      };
    },
  };
}

export function summarizeWorktreeForCreate(input = {}) {
  const files = Array.isArray(input.files) ? input.files : [];
  const current = String(input.current_branch || "");
  const defaultBranch = String(input.default_branch || "main");
  const onDefault = current && current === defaultBranch;
  const fileScope = files.map((file) => ({
    path: String(file.path || file),
    status: String(file.status || "modified"),
  }));
  const filePolicy = assessChangeRequestPathPolicy(fileScope);
  return {
    dirty: files.length > 0,
    current_branch: current || null,
    default_branch: defaultBranch,
    on_default_branch: onDefault,
    suggested_branch: onDefault || !current ? "feature/pr-create" : current,
    file_scope: fileScope,
    file_policy: filePolicy,
    guidance: [
      "选择要进入 PR/MR 的文件范围，避免把无关 dirty worktree 一起提交。",
      filePolicy.blocked.length
        ? "默认不要把 `.pipeline/` runtime/generated 文件放进 PR/MR；先拆出实现改动，再从当前仓库重新生成 docs/adapters/runtime 证据。"
        : null,
      onDefault
        ? "当前在默认分支上，建议先创建 feature branch。"
        : "确认当前 feature branch 是否就是本次 PR/MR 的 source branch。",
      "确认 commit message、target branch、title/body，再展示一次性远端写确认摘要。",
    ].filter(Boolean),
  };
}

export function buildChangeRequestCreatePlan(input = {}) {
  const mode = normalizeCreateMode(input.mode || (input.plan ? "plan" : input.from_worktree ? "from_worktree" : "ask"));
  const repository = normalizeChangeRequestRepositorySource(input.repository_source || input);
  if (mode === "plan") {
    return {
      mode,
      provider: repository.provider,
      host: repository.host,
      owner: repository.owner,
      repository: repository.repository,
      kind: repository.provider === "gitlab" ? "merge_request" : "pull_request",
      guidance: createGuidance("plan"),
      remote_writes: [],
      confirmation: {
        required: false,
        mode: "none_until_worktree_ready",
        summary: "No remote write is planned before implementation work exists.",
      },
      plan_handoff: {
        command_flow: ["/hw:plan", "/hw:start", "/hw:pr create --from-worktree"],
      },
    };
  }
  const files = normalizeFileEntries(input.files || input.worktree?.files);
  const filePolicy = assessChangeRequestPathPolicy(files);
  const dirty = input.dirty ?? input.worktree?.dirty ?? files.length > 0;
  const sourceBranch = input.source_branch || input.current_branch || input.worktree?.branch || suggestSourceBranch(input.title || input.summary);
  const targetBranch = input.target_branch || "main";
  const title = input.title || titleFromBranch(sourceBranch);
  const reviewers = normalizeStringArray(input.reviewers);
  const labels = normalizeStringArray(input.labels);
  const remoteWrites = [
    { action: "push", target: sourceBranch },
    { action: "create_change_request", target: repository.ref },
    { action: "target_branch_write", target: targetBranch },
  ];
  if (reviewers.length) remoteWrites.push({ action: "reviewer_write", target: reviewers.join(",") });
  if (labels.length) remoteWrites.push({ action: "label_write", target: labels.join(",") });
  return {
    mode,
    provider: repository.provider,
    host: repository.host,
    owner: repository.owner,
    repository: repository.repository,
    ref: repository.ref,
    kind: repository.provider === "gitlab" ? "merge_request" : "pull_request",
    dirty,
    files,
    file_policy: filePolicy,
    blocked: filePolicy.blocked.length > 0,
    source_branch: sourceBranch,
    target_branch: targetBranch,
    commit_message: input.commit_message || title,
    title,
    body: input.body || "",
    reviewers,
    labels,
    guidance: createGuidance("from_worktree"),
    remote_writes: remoteWrites,
    confirmation: {
      required: true,
      mode: "single_create_flow",
      summary: renderCreateConfirmationSummary({ source_branch: sourceBranch, target_branch: targetBranch, title }),
    },
  };
}

export function assessChangeRequestPathPolicy(files = [], options = {}) {
  const allowed = options.allowed || CHANGE_REQUEST_PIPELINE_PATH_POLICY.allowed;
  const blockedPatterns = options.blocked || CHANGE_REQUEST_PIPELINE_PATH_POLICY.blocked;
  const entries = normalizeFileEntries(files);
  const blocked = [];
  const warnings = [];
  const allowedPaths = [];

  for (const entry of entries) {
    const path = normalizePath(entry.path || entry);
    if (!path) continue;
    if (matchesAny(path, allowed)) {
      allowedPaths.push(path);
      continue;
    }
    if (matchesAny(path, blockedPatterns)) {
      blocked.push({
        path,
        reason: "pipeline_runtime_or_generated_path",
        message: "Do not include `.pipeline/` runtime/generated files in PR/MR payloads; keep them local evidence or regenerate them after integration.",
      });
    }
  }

  return {
    ok: blocked.length === 0,
    blocked,
    warnings,
    allowed: allowedPaths,
    policy: CHANGE_REQUEST_PIPELINE_PATH_POLICY,
  };
}

export async function executeChangeRequestCreatePlan(projectRoot = ".", plan, options = {}) {
  if (!options.confirmed) {
    return {
      mode: "create",
      status: "waiting_confirmation",
      remote_write_attempted: false,
      confirmation_required: true,
      confirmation_summary: plan.confirmation?.summary || "",
    };
  }
  const provider = requireCreateProvider(options.provider);
  const calls = [];
  await provider.push(plan);
  calls.push("push");
  const remote = await provider.createChangeRequest(plan);
  calls.push("createChangeRequest");
  if (plan.reviewers?.length && typeof provider.updateReviewers === "function") {
    await provider.updateReviewers(remote, plan.reviewers);
    calls.push("updateReviewers");
  }
  if (plan.labels?.length && typeof provider.updateLabels === "function") {
    await provider.updateLabels(remote, plan.labels);
    calls.push("updateLabels");
  }
  const archive = await writeChangeRequestCreateProposal(projectRoot, {
    provider: plan.provider,
    host: plan.host,
    owner: plan.owner,
    repository: plan.repository,
    url: remote?.url || "",
  }, {
    mode: "from_worktree",
    source_branch: plan.source_branch,
    target_branch: plan.target_branch,
    title: plan.title,
    body: plan.body,
    reviewers: plan.reviewers,
    labels: plan.labels,
    evidence: { remote, calls },
    ...options.archive,
  });
  return {
    mode: "create",
    status: "created",
    remote_write_attempted: true,
    calls,
    remote,
    archive,
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
    evidence: { remote, diff, comments, checks },
  });
  const summary = renderInspectSummary(archive.id, archive.request, { remote, diff, comments, checks });
  await writeFile(join(archive.path, "summary.md"), summary, "utf8");
  return {
    mode: "inspect",
    remote_write_attempted: false,
    archive: { ...archive, summary_md: summary },
    evidence: { remote, diff, comments, checks },
  };
}

export async function reviewChangeRequest(projectRoot = ".", source, options = {}) {
  const inspected = await inspectChangeRequest(projectRoot, source, options);
  const findings = buildReviewFindings(inspected.evidence);
  const mergeRecommendation = findings.some((finding) => ["blocking", "warning"].includes(finding.severity)) ? "blocked" : "ready_for_human_review";
  const notes = renderReviewFindings(inspected.archive.id, findings, mergeRecommendation);
  await writeFile(join(inspected.archive.path, "review-notes.md"), notes, "utf8");
  return {
    ...inspected,
    mode: "review",
    merge_recommendation: mergeRecommendation,
    findings,
    archive: { ...inspected.archive, review_notes_md: notes },
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
    archive: { ...inspected.archive, changes_md: changes, decisions },
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
    archive: { ...inspected.archive, decisions },
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
    archive: { ...inspected.archive, decisions },
  };
}

async function writeArchiveFiles(path, archive) {
  await mkdir(join(path, "evidence"), { recursive: true });
  await writeFile(join(path, "request.yaml"), `${stringifyYaml(archive.request).trimEnd()}\n`, "utf8");
  await writeFile(join(path, "decisions.yaml"), `${stringifyYaml(archive.decisions).trimEnd()}\n`, "utf8");
  await writeFile(join(path, "summary.md"), archive.summary_md, "utf8");
  await writeFile(join(path, "review-notes.md"), archive.review_notes_md, "utf8");
  await writeFile(join(path, "changes.md"), archive.changes_md, "utf8");
  await writeFile(join(path, "evidence", "snapshot.md"), archive.evidence_snapshot_md, "utf8");
  for (const [file, value] of Object.entries(archive.extra_files || {})) {
    await writeFile(join(path, file), `${stringifyYaml(value).trimEnd()}\n`, "utf8");
  }
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

function normalizeChangeRequestRepositorySource(source = {}) {
  if (typeof source === "object" && source.provider) {
    const provider = normalizeCreateProvider(source.provider);
    const host = String(source.host || safeUrlHost(source.url) || (provider === "github" ? "github.com" : "gitlab.com"));
    const owner = String(source.owner || source.namespace || "").replace(/^\/+|\/+$/g, "");
    const repository = String(source.repository || source.repo || "").replace(/^\/+|\/+$/g, "");
    if (!owner || !repository) throw new Error("Change Request create source requires owner and repository");
    return {
      provider,
      kind: provider === "gitlab" ? "merge_request_create" : "pull_request_create",
      host,
      owner,
      repository,
      ref: `${provider}/${owner}/${repository}`,
      url: String(source.url || `https://${host}/${owner}/${repository}`),
    };
  }
  let url;
  try {
    url = new URL(String(source || ""));
  } catch {
    throw new Error(`Unsupported Change Request repository URL: ${source}`);
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (url.hostname === "github.com" && parts.length >= 2) {
    const [owner, repository] = parts;
    return {
      provider: "github",
      kind: "pull_request_create",
      host: url.hostname,
      owner,
      repository,
      ref: `github/${owner}/${repository}`,
      url: canonicalUrl(url),
    };
  }
  if (parts.length >= 2) {
    const repository = parts.at(-1);
    const owner = parts.slice(0, -1).join("/");
    return {
      provider: "gitlab",
      kind: "merge_request_create",
      host: url.hostname,
      owner,
      repository,
      ref: `gitlab/${owner}/${repository}`,
      url: canonicalUrl(url),
    };
  }
  throw new Error(`Unsupported Change Request repository URL: ${url.href}`);
}

function normalizeCreateMode(value) {
  const normalized = String(value || "ask").replace(/-/g, "_");
  if (CHANGE_REQUEST_CREATE_MODES.includes(normalized)) return normalized;
  throw new Error(`Unsupported Change Request create mode: ${value}`);
}

function normalizeCreateProvider(provider) {
  const normalized = String(provider || "github").trim().toLowerCase();
  if (["github", "gitlab"].includes(normalized)) return normalized;
  throw new Error(`Unsupported Change Request create provider: ${provider}`);
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

function requireCreateProvider(provider) {
  if (!provider || typeof provider !== "object") {
    throw new Error("Change Request create provider is required");
  }
  if (typeof provider.createChangeRequest !== "function") {
    throw new Error("Change Request create provider must implement createChangeRequest");
  }
  if (typeof provider.push !== "function" && typeof provider.pushBranch !== "function") {
    throw new Error("Change Request create provider must implement push or pushBranch");
  }
  if (typeof provider.updateReviewers !== "function" && typeof provider.setReviewers !== "function") {
    throw new Error("Change Request create provider must implement updateReviewers or setReviewers");
  }
  if (typeof provider.updateLabels !== "function" && typeof provider.setLabels !== "function") {
    throw new Error("Change Request create provider must implement updateLabels or setLabels");
  }
  return provider;
}

function baseDecisions(requiresConfirmation) {
  return {
    remote_write_gate: CHANGE_REQUEST_REMOTE_WRITE_GATE,
    allowed_without_confirmation: ["inspect", "review", "local_archive_write"],
    requires_confirmation: requiresConfirmation,
    final_status: "pending",
    confirmations: [],
  };
}

function createGuidance(mode) {
  if (mode === "from_worktree") {
    return {
      summary: "Guide the user through dirty worktree review, file scope, branch, commit, push, title/body, target branch, reviewers, and labels.",
      next_question: "当前本地改动要全部纳入这个 PR/MR 吗？",
    };
  }
  if (mode === "plan") {
    return {
      summary: "Start with Plan, execute the work, then return to PR/MR create from the resulting worktree.",
      next_question: "这组 PR/MR 工作的目标和验收方式是什么？",
    };
  }
  return {
    summary: "Ask whether the user already has local changes or wants to plan a new PR/MR-sized work item first.",
    next_question: "你已经有本地改动要提 PR/MR 吗？",
  };
}

function renderCreateConfirmationSummary(proposal) {
  return [
    "一次性确认后将执行或准备以下远端写动作：",
    "- push",
    "- create_change_request",
    "- reviewer_write",
    "- label_write",
    "- target_branch_write",
    `source_branch: ${proposal.source_branch || "pending"}`,
    `target_branch: ${proposal.target_branch || "main"}`,
    `title: ${proposal.title || "pending"}`,
  ].join("\n");
}

function renderCreateSummary(id, request, proposal) {
  return [
    `# ${id} Create Proposal`,
    "",
    `- Source: ${request.ref}`,
    `- Provider: ${request.provider}`,
    `- URL: ${request.url}`,
    `- Mode: ${proposal.mode}`,
    `- Branch: ${proposal.source_branch || "pending"} -> ${proposal.target_branch || "main"}`,
    "- Local archive is evidence, not the remote source of truth.",
    "- PR/MR create 使用一次性确认；确认摘要必须列出 push、create_change_request、reviewer_write、label_write、target_branch_write。",
    "",
    "## Confirmation Summary",
    "",
    proposal.confirmation_summary,
    "",
  ].join("\n");
}

function renderCreateChanges(proposal) {
  return [
    "# Local Changes",
    "",
    "- 待 `/hw:pr create --from-worktree` 记录文件范围、分支、commit 和验证命令。",
    `- Source branch: ${proposal.source_branch || "pending"}`,
    `- Target branch: ${proposal.target_branch || "main"}`,
    `- Title: ${proposal.title || "pending"}`,
    "",
  ].join("\n");
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
  const filePolicy = assessChangeRequestPathPolicy(files);
  for (const item of filePolicy.blocked) {
    findings.push({
      severity: "blocking",
      source: "file-policy",
      summary: redactSecrets(`${item.path}: ${item.message}`),
    });
  }
  for (const check of checks.filter((item) => String(item.status || "").toLowerCase() !== "passed")) {
    findings.push({ severity: "warning", source: "checks", summary: redactSecrets(`${check.name || "check"} is ${check.status || "unknown"}`) });
  }
  for (const comment of comments) {
    findings.push({ severity: "info", source: "comments", summary: redactSecrets(comment.body || String(comment)) });
  }
  for (const file of files) {
    findings.push({
      severity: Number(file.additions || 0) + Number(file.deletions || 0) > 100 ? "warning" : "info",
      source: "diff",
      summary: redactSecrets(`${file.path || "unknown"} +${file.additions || 0}/-${file.deletions || 0}`),
    });
  }
  if (findings.length === 0) findings.push({ severity: "info", source: "review", summary: "No review findings from available fixture evidence." });
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

function normalizeFileEntries(files = []) {
  return (Array.isArray(files) ? files : []).map((file) => typeof file === "string" ? { path: file } : file).filter((file) => file?.path);
}

function normalizePath(value) {
  return String(value || "").trim().replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/\/+/g, "/");
}

function matchesAny(path, patterns) {
  return patterns.some((pattern) => pathMatchesPattern(path, pattern));
}

function pathMatchesPattern(path, pattern) {
  const normalized = normalizePath(pattern);
  if (normalized.endsWith("/**")) {
    const prefix = normalized.slice(0, -3);
    return path === prefix || path.startsWith(`${prefix}/`);
  }
  if (normalized.endsWith("/")) {
    return path.startsWith(normalized);
  }
  if (normalized.includes("*")) {
    return globToRegExp(normalized).test(path);
  }
  return path === normalized;
}

function globToRegExp(glob) {
  let source = "^";
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    const next = glob[index + 1];
    if (char === "*" && next === "*") {
      source += ".*";
      index += 1;
    } else if (char === "*") {
      source += "[^/]*";
    } else {
      source += escapeRegExp(char);
    }
  }
  return new RegExp(`${source}$`);
}

function escapeRegExp(value) {
  return String(value).replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
}

function suggestSourceBranch(value) {
  const slug = slugify(value || "change-request");
  return `feature/${slug}`;
}

function titleFromBranch(branch) {
  return String(branch || "feature/change-request").split("/").at(-1).replace(/-/g, " ");
}

function slugify(value) {
  return String(value || "change-request").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "change-request";
}

function normalizeStringArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [String(value)].filter(Boolean);
}

function safeUrlHost(value) {
  try {
    return value ? new URL(value).hostname : "";
  } catch {
    return "";
  }
}

function canonicalUrl(url) {
  return `${url.protocol}//${url.hostname}${url.pathname}`.replace(/\/+$/g, "");
}

function compactDate(value) {
  const text = String(value || "");
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (match) return `${match[1]}${match[2]}${match[3]}`;
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}
