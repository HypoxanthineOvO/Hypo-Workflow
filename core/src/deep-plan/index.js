// LEGACY (C026, 2026-08-14): C12–C19 Deep Plan/Discussion Package 机器。
// 日常语义 Cycle 不再调用本模块；仅旧宿主/迁移兼容保留，见 .pipeline/legacy/INDEX.md。
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { parseYaml, writeConfig } from "../config/index.js";
import { redactSecrets } from "../evidence/index.js";
import { assertLegacyWorkspaceWritable } from "../workspace-format/index.js";

export const DEEP_PLAN_LIFECYCLE_STATES = Object.freeze([
  "drafting",
  "researching",
  "architecture_mapping",
  "module_drilldown",
  "ready_for_plan",
  "converted",
  "archived",
]);

const DEFAULT_READINESS_DEPTH = "directional";
const FIRST_PRINCIPLES_CHALLENGES = Object.freeze([
  "necessity",
  "minimum_viable_loop",
  "falsifying_evidence",
  "essential_vs_habitual",
]);
const READINESS_DEPTH_ORDER = Object.freeze([
  "directional",
  "architecture-ready",
  "implementation-ready",
]);
const DEFAULT_LOCAL_RESEARCH_ACTIONS = Object.freeze([
  "read_repository_file",
  "inspect_archive",
  "search_local_docs",
  "search_local_tests",
]);
const DEFAULT_GATED_RESEARCH_ACTIONS = Object.freeze([
  "edit_code",
  "restart_service",
  "network_access",
  "remote_clone",
  "remote_download",
  "destructive_delete",
  "external_side_effect",
]);
const REMOTE_RESEARCH_ACTIONS = Object.freeze([
  "network_access",
  "remote_clone",
  "remote_download",
]);
const SIDE_EFFECT_RESEARCH_ACTIONS = Object.freeze([
  "edit_code",
  "restart_service",
  "destructive_delete",
  "external_side_effect",
]);

export async function createDeepPlanPackage(projectRoot = ".", options = {}) {
  await assertLegacyWorkspaceWritable(projectRoot, "legacy.deep-plan");
  const root = resolve(projectRoot);
  const now = options.now || new Date().toISOString();
  const title = requiredTitle(options.title);
  const id = options.id || await nextDeepPlanId(root);
  const slug = slugify(title);
  const directory = `${id}-${slug}`;
  const relativeDir = `.pipeline/deep-plans/${directory}`;
  const packageDir = join(root, relativeDir);

  const data = normalizeDeepPlanData({
    id,
    slug,
    title,
    summary: options.summary || "",
    status: options.status || "drafting",
    conversation_summary: options.conversation_summary || "",
    decisions: options.decisions || [],
    tracks: options.tracks || [],
    architecture: options.architecture || {},
    intentional_blanks: options.intentional_blanks || [],
    risks: options.risks || [],
    test_matrix: options.test_matrix || [],
    acceptance_depth: options.acceptance_depth || [],
    ordered_feature_queue: options.ordered_feature_queue || [],
    unresolved_items: options.unresolved_items || [],
    readiness_depth: options.readiness_depth || DEFAULT_READINESS_DEPTH,
    created_at: now,
    updated_at: now,
    package_path: relativeDir,
  });

  await mkdir(packageDir, { recursive: true });
  await writePackageArtifacts(root, data);
  await writeActivePointer(root, data.deep_plan, now);
  return {
    ...data.deep_plan,
    path: relativeDir,
    active_ref: ".pipeline/deep-plans/active.yaml",
  };
}

export async function readDeepPlanPackage(projectRoot = ".", ref) {
  const found = await findDeepPlanPackage(projectRoot, ref);
  return parseYaml(await readFile(found.file, "utf8"));
}

export async function listDeepPlanPackages(projectRoot = ".") {
  const root = resolve(projectRoot);
  const dir = join(root, ".pipeline", "deep-plans");
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const packages = [];
  for (const entry of entries.filter((item) => item.isDirectory())) {
    try {
      const file = join(dir, entry.name, "deep-plan.yaml");
      const data = parseYaml(await readFile(file, "utf8"));
      packages.push({
        ...data.deep_plan,
        directory: entry.name,
        path: `.pipeline/deep-plans/${entry.name}`,
      });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return packages.sort((a, b) => deepPlanNumber(a.id) - deepPlanNumber(b.id));
}

export async function updateDeepPlanPackage(projectRoot = ".", ref, updates = {}) {
  await assertLegacyWorkspaceWritable(projectRoot, "legacy.deep-plan");
  const root = resolve(projectRoot);
  const found = await findDeepPlanPackage(root, ref);
  const current = parseYaml(await readFile(found.file, "utf8"));
  const now = updates.now || new Date().toISOString();
  const deepPlan = {
    ...current.deep_plan,
    status: updates.status || current.deep_plan.status,
    conversation_summary: updates.conversation_summary ?? current.deep_plan.conversation_summary ?? "",
    readiness_depth: updates.readiness_depth || current.deep_plan.readiness_depth || DEFAULT_READINESS_DEPTH,
    updated_at: now,
  };

  const data = normalizeDeepPlanData({
    ...current,
    deep_plan: deepPlan,
    decisions: updates.decisions ?? current.decisions ?? [],
    tracks: updates.tracks ?? current.tracks ?? [],
    architecture: updates.architecture ?? current.architecture ?? {},
    ask_rounds: updates.ask_rounds ?? current.ask_rounds ?? [],
    research_entries: updates.research_entries ?? current.research_entries ?? [],
    readiness_gaps: updates.readiness_gaps ?? current.readiness_gaps ?? [],
    intentional_blanks: updates.intentional_blanks ?? current.intentional_blanks ?? [],
    risks: updates.risks ?? current.risks ?? [],
    test_matrix: updates.test_matrix ?? current.test_matrix ?? [],
    acceptance_depth: updates.acceptance_depth ?? current.acceptance_depth ?? [],
    ordered_feature_queue: updates.ordered_feature_queue ?? current.ordered_feature_queue ?? [],
    unresolved_items: updates.unresolved_items ?? current.unresolved_items ?? [],
    next_recommended_question: updates.next_recommended_question ?? current.next_recommended_question,
  });

  await writePackageArtifacts(root, data);
  return data;
}

export async function generateDeepPlanAskQuestions(packageDataOrInput, options = {}) {
  const data = normalizeDeepPlanData(packageDataOrInput || {});
  const locale = options.locale || "en";
  const maxQuestions = positiveInteger(options.max_questions, 4);
  const answeredChallenges = answeredFirstPrinciplesChallenges(data.ask_rounds);
  const recommendedChallenge = data.next_recommended_question?.challenge;
  const orderedChallenges = orderedAskChallenges(answeredChallenges, recommendedChallenge);
  const defaultChallenge = orderedChallenges.find((challenge) => !answeredChallenges.has(challenge));
  const questions = orderedChallenges.map((challenge, index) => {
    const recommended = data.next_recommended_question?.challenge === challenge
      ? data.next_recommended_question
      : null;
    return {
      id: `Q${String(index + 1).padStart(3, "0")}`,
      challenge,
      question: recommended?.question || challengeQuestion(challenge, locale),
      default: challenge === defaultChallenge,
    };
  });

  if (options.include_context_questions && needsContextUserQuestion(data)) {
    questions.push({
      id: `Q${String(questions.length + 1).padStart(3, "0")}`,
      challenge: "context_user",
      question: locale.startsWith("zh") ? "用户是谁？这个身份会改变哪些必要决策？" : "Who is the user, and which necessary decisions change because of that?",
      default: false,
    });
  }

  return {
    ref: data.deep_plan.id,
    target_readiness_depth: options.target_readiness_depth || data.deep_plan.readiness_depth || DEFAULT_READINESS_DEPTH,
    questions: questions.slice(0, maxQuestions),
  };
}

export async function recordDeepPlanAskRound(projectRoot = ".", ref, round = {}) {
  await assertLegacyWorkspaceWritable(projectRoot, "legacy.deep-plan");
  const root = resolve(projectRoot);
  const found = await findDeepPlanPackage(root, ref);
  const current = parseYaml(await readFile(found.file, "utf8"));
  const now = round.asked_at || new Date().toISOString();
  const existing = normalizeDeepPlanData(current);
  const recordedRound = {
    asked_at: now,
    question: round.question || {},
    answer: round.answer || "",
  };
  if (Array.isArray(round.unresolved_ambiguity)) {
    recordedRound.unresolved_ambiguity = [...round.unresolved_ambiguity];
  }

  const data = normalizeDeepPlanData({
    ...current,
    deep_plan: {
      ...existing.deep_plan,
      updated_at: now,
    },
    ask_rounds: [...existing.ask_rounds, recordedRound],
    decisions: mergeById(existing.decisions, round.extracted_decisions || []),
    architecture: {
      ...existing.architecture,
      open_questions: mergeStrings(existing.architecture.open_questions, round.open_questions || []),
    },
    readiness_gaps: mergeStrings(existing.readiness_gaps, [
      ...(round.open_questions || []),
      ...(round.unresolved_ambiguity || []),
    ]),
    next_recommended_question: round.next_recommended_question || existing.next_recommended_question,
  });

  await writePackageArtifacts(root, data);
  return data;
}

export async function recordDeepPlanResearch(projectRoot = ".", ref, researchEntry = {}, options = {}) {
  await assertLegacyWorkspaceWritable(projectRoot, "legacy.deep-plan");
  const root = resolve(projectRoot);
  const found = await findDeepPlanPackage(root, ref);
  const current = parseYaml(await readFile(found.file, "utf8"));
  const existing = normalizeDeepPlanData(current);
  const now = options.now || researchEntry.researched_at || new Date().toISOString();
  const recordedEntry = normalizeResearchEntry({
    researched_at: now,
    ...researchEntry,
  });

  const data = normalizeDeepPlanData({
    ...current,
    deep_plan: {
      ...existing.deep_plan,
      status: "researching",
      updated_at: now,
    },
    research_entries: [...existing.research_entries, recordedEntry],
  });

  await writePackageArtifacts(root, data);
  return data;
}

export async function assessDeepPlanResearchAction(action = {}, policyOrOptions = {}) {
  const actionType = String(action?.type || action?.action_type || "").trim();
  const allowedActions = new Set(policyOrOptions.allowed_actions || DEFAULT_LOCAL_RESEARCH_ACTIONS);
  const gatedActions = new Set(policyOrOptions.gated_actions || DEFAULT_GATED_RESEARCH_ACTIONS);

  if (gatedActions.has(actionType) || isNonLocalResearchAction(actionType)) {
    const remoteValidation = isRemoteResearchAction(actionType)
      ? validateRemoteResearchConfirmation(actionType, action, policyOrOptions)
      : null;
    const confirmed = remoteValidation
      ? remoteValidation.allowed
      : isSideEffectingResearchAction(actionType)
      ? hasActionScopedConfirmation(actionType, action, policyOrOptions)
      : hasActionScopedConfirmation(actionType, action, policyOrOptions);
    return {
      action_type: actionType || "unknown",
      allowed: confirmed,
      requires_confirmation: !confirmed,
      reason: confirmed
        ? `${actionType || "research action"} has explicit action-scope confirmation for non-local or side-effecting research`
        : remoteValidation?.reason || `${actionType || "research action"} requires explicit confirmation for remote, network, edit, restart, destructive, external, or side effect boundaries`,
    };
  }

  if (allowedActions.has(actionType)) {
    return {
      action_type: actionType,
      allowed: true,
      requires_confirmation: false,
      reason: localResearchActionReason(actionType),
    };
  }

  return {
    action_type: actionType || "unknown",
    allowed: false,
    requires_confirmation: true,
    reason: "unknown research action requires confirmation before execution",
  };
}

export async function indexDeepPlanKnowledgeRefs(packageDataOrInput, options = {}) {
  const data = normalizeDeepPlanData(packageDataOrInput || {});
  const maxChars = positiveInteger(options.max_ref_body_chars, 500);
  const shouldRedact = options.redact_secrets !== false;
  const refs = [];

  const overview = compactKnowledgeSummary([
    data.deep_plan.conversation_summary,
    `status: ${data.deep_plan.status}`,
    `readiness: ${data.deep_plan.readiness_depth}`,
  ], maxChars, shouldRedact);
  if (overview) {
    refs.push({
      id: `${data.deep_plan.id || "DP"}-overview`,
      package_id: data.deep_plan.id,
      kind: "deep_plan_overview",
      title: data.deep_plan.title,
      package_path: data.deep_plan.package_path,
      summary: overview,
    });
  }

  data.research_entries.forEach((entry, index) => {
    const evidence = entry.evidence_refs
      .map((item) => [item.kind, item.ref, item.lines].filter(Boolean).join(":"))
      .join(", ");
    const findings = entry.findings.map((finding) => `${finding.id || "finding"}: ${finding.statement || ""}`.trim());
    const unknowns = entry.unknowns.map((unknown) => `${unknown.id || "unknown"}: ${unknown.question || ""}`.trim());
    const boundaries = Object.keys(entry.source_boundaries).length
      ? `source boundaries: ${Object.entries(entry.source_boundaries).map(([key, value]) => `${key}=${value}`).join(", ")}`
      : "";
    const summary = compactKnowledgeSummary([
      entry.researched_at ? `researched_at: ${entry.researched_at}` : "",
      boundaries,
      evidence ? `evidence: ${evidence}` : "",
      ...findings,
      ...unknowns,
    ], maxChars, shouldRedact);
    if (!summary) return;
    refs.push({
      id: `${data.deep_plan.id || "DP"}-research-${String(index + 1).padStart(3, "0")}`,
      package_id: data.deep_plan.id,
      kind: "deep_plan_research",
      title: `${data.deep_plan.title || data.deep_plan.id || "Deep Plan"} research ${index + 1}`,
      package_path: data.deep_plan.package_path,
      researched_at: entry.researched_at,
      summary,
      evidence_refs: shouldRedact ? redactEvidenceRefs(entry.evidence_refs) : entry.evidence_refs,
    });
  });

  return { package_id: data.deep_plan.id, refs };
}

export async function assessDeepPlanShallowPlanGate(packageDataOrInput, options = {}) {
  const data = normalizeDeepPlanData(packageDataOrInput || {});
  const target = options.target_readiness_depth || "architecture-ready";
  const operation = options.operation || "convert";
  const answeredChallenges = new Set(data.ask_rounds
    .map((round) => round?.question?.challenge)
    .filter(Boolean));
  const missingChallenges = FIRST_PRINCIPLES_CHALLENGES
    .filter((challenge) => !answeredChallenges.has(challenge));
  const gaps = [];

  for (const challenge of missingChallenges) {
    gaps.push(challengeGap(challenge));
  }
  if (!readinessDepthAtLeast(data.deep_plan.readiness_depth, target)) {
    gaps.push(`readiness depth is ${data.deep_plan.readiness_depth || DEFAULT_READINESS_DEPTH}; target ${target} is required`);
  }
  if (target === "architecture-ready" && !data.architecture.components.length) {
    gaps.push("architecture components are missing");
  }
  if (!data.decisions.some((decision) => decision.status === "accepted")) {
    gaps.push("accepted decisions are missing");
  }

  const allowed = gaps.length === 0;
  return {
    allowed,
    operation,
    target_readiness_depth: target,
    reason: allowed ? "readiness target satisfied" : "shallow or pseudo-deep readiness is insufficient for conversion",
    missing_challenges: missingChallenges,
    gaps,
  };
}

export async function normalizeDeepPlanTracks(inputTracks = [], options = {}) {
  const normalized = Array.isArray(inputTracks)
    ? inputTracks.map((track) => normalizeDeepPlanTrack(track, options))
    : [];
  return {
    tracks: normalized,
    validation: validateNormalizedTrackRelationships(normalized, options),
  };
}

export async function deriveDeepPlanModuleTracks(packageDataOrInput, options = {}) {
  const data = normalizeDeepPlanData(packageDataOrInput || {});
  const sourceTracks = normalizeTrackList(data.tracks);
  const sourceById = new Map(sourceTracks.map((track) => [track.id, track]));
  const architecture = normalizeArchitecture(data.architecture);
  const moduleTracks = [];

  for (const component of architecture.components) {
    const componentId = String(component?.id || component?.name || "").trim();
    if (!componentId) continue;
    const sourceIds = normalizeStringArray(component.source_requirement_ids || component.source_track_ids)
      .filter((id) => {
        const source = sourceById.get(id);
        return source && ["requirement", "theme"].includes(source.type);
      });
    if (!sourceIds.length && options.require_source !== false) continue;

    const sources = sourceIds.map((id) => sourceById.get(id)).filter(Boolean);
    moduleTracks.push(normalizeDeepPlanTrack({
      id: moduleTrackId(componentId),
      title: component.title || component.name || titleFromId(componentId),
      type: "module",
      status: component.status || "proposed",
      questions: sources.flatMap((track) => track.questions || []),
      decisions: sources.flatMap((track) => track.decisions || []),
      risks: sources.flatMap((track) => track.risks || []),
      source_requirement_ids: sourceIds,
      source_context: sources
        .map((track) => [track.title, ...(track.questions || [])].filter(Boolean).join(" - "))
        .filter(Boolean)
        .join("\n"),
      evidence_refs: uniqueStrings([
        ...sources.flatMap((track) => track.evidence_refs || []),
        ...normalizeStringArray(component.evidence_refs),
      ]),
      relationships: {
        depends_on: sourceIds,
        blocks: component.blocks || [],
        conflicts_with: component.conflicts_with || [],
        feeds_into_plan: component.feeds_into_plan || [],
      },
    }, options));
  }

  return {
    tracks: moduleTracks,
    validation: validateNormalizedTrackRelationships([...sourceTracks, ...moduleTracks], options),
  };
}

export async function updateDeepPlanArchitectureMap(projectRoot = ".", ref, architectureUpdate = {}, options = {}) {
  await assertLegacyWorkspaceWritable(projectRoot, "legacy.deep-plan");
  const root = resolve(projectRoot);
  const found = await findDeepPlanPackage(root, ref);
  const current = parseYaml(await readFile(found.file, "utf8"));
  const existing = normalizeDeepPlanData(current);
  const now = options.now || new Date().toISOString();
  const architecture = normalizeArchitecture(architectureUpdate.architecture || architectureUpdate || existing.architecture);
  const incomingTracks = Array.isArray(architectureUpdate.tracks) ? architectureUpdate.tracks : existing.tracks;
  const normalizedTracks = normalizeTrackList(incomingTracks);
  const derived = await deriveDeepPlanModuleTracks({
    ...existing,
    tracks: normalizedTracks,
    architecture,
  }, options);
  const tracks = mergeTracksById(normalizedTracks, derived.tracks);
  const data = normalizeDeepPlanData({
    ...current,
    deep_plan: {
      ...existing.deep_plan,
      status: "architecture_mapping",
      updated_at: now,
    },
    architecture,
    tracks,
  });

  await writePackageArtifacts(root, data);
  return data;
}

export async function renderDeepPlanArchitecture(packageDataOrInput, options = {}) {
  const data = normalizeDeepPlanData(packageDataOrInput || {});
  const architecture = normalizeArchitecture(data.architecture);
  const tracks = normalizeTrackList(data.tracks);
  const mermaid = renderArchitectureMermaid(architecture);
  const markdown = renderArchitectureMarkdown({
    ...data,
    architecture,
    tracks,
  }, mermaid, options);
  return { markdown, mermaid, architecture, tracks };
}

export async function validateDeepPlanTrackRelationships(packageDataOrInput, options = {}) {
  const data = normalizeDeepPlanData(packageDataOrInput || {});
  const trackResult = validateNormalizedTrackRelationships(normalizeTrackList(data.tracks), options);
  const architectureIssues = validateNormalizedArchitectureEdges(normalizeArchitecture(data.architecture));
  return {
    valid: trackResult.valid && architectureIssues.length === 0,
    issues: [...trackResult.issues, ...architectureIssues],
  };
}

export async function drillDeepPlanTopic(projectRoot = ".", ref, targetIdOrTopic, drillInput = {}, options = {}) {
  await assertLegacyWorkspaceWritable(projectRoot, "legacy.deep-plan");
  const root = resolve(projectRoot);
  const found = await findDeepPlanPackage(root, ref);
  const current = parseYaml(await readFile(found.file, "utf8"));
  const existing = normalizeDeepPlanData(current);
  const target = String(targetIdOrTopic || "").trim();
  const now = options.now || new Date().toISOString();
  const architecture = normalizeArchitecture(current.architecture || {});
  const resolvedTarget = resolveDeepPlanDrillTarget(current.tracks || [], architecture, target);
  const mergeDrillFields = (item) => ({
    ...item,
    questions: mergeStrings(item.questions || [], drillInput.questions || []),
    decisions: mergeById(item.decisions || [], drillInput.decisions || []),
    risks: mergeById(item.risks || [], drillInput.risks || []),
    open_items: mergeStrings(item.open_items || [], drillInput.open_items || []),
  });

  const tracks = (current.tracks || []).map((track) => {
    const isTarget = resolvedTarget.trackIndexes.has(track);
    return isTarget ? mergeDrillFields(track) : track;
  });
  architecture.module_cards = architecture.module_cards.map((card) => {
    const isTarget = resolvedTarget.cardIndexes.has(card);
    return isTarget ? mergeDrillFields(card) : card;
  });

  const data = normalizeDeepPlanData({
    ...current,
    deep_plan: {
      ...existing.deep_plan,
      status: "module_drilldown",
      updated_at: now,
    },
    tracks,
    architecture,
  });

  await writePackageArtifacts(root, data);
  return data;
}

function resolveDeepPlanDrillTarget(tracks = [], architecture = {}, target = "") {
  if (!target) {
    throw new Error("Deep Plan drill target is required");
  }

  const cards = architecture.module_cards || [];
  const idTrackMatches = tracks.filter((track) => String(track.id || "").trim() === target);
  const idCardMatches = cards.filter((card) => String(card.id || "").trim() === target);
  if (idTrackMatches.length || idCardMatches.length) {
    if (idTrackMatches.length > 1 || idCardMatches.length > 1) {
      throw new Error(`ambiguous Deep Plan drill target id "${target}" matched multiple tracks or module cards`);
    }
    return {
      trackIndexes: new Set(idTrackMatches),
      cardIndexes: new Set(idCardMatches),
    };
  }

  const trackMatches = tracks.filter((track) => {
    return [track.title, track.topic].some((value) => String(value || "").trim() === target);
  });
  const cardMatches = cards.filter((card) => {
    return [card.title, card.topic].some((value) => String(value || "").trim() === target);
  });
  const componentMatches = (architecture.components || []).filter((component) => {
    return [component.title, component.topic, component.name].some((value) => String(value || "").trim() === target);
  });

  const matchCount = trackMatches.length + cardMatches.length + componentMatches.length;
  if (matchCount > 1) {
    throw new Error(`ambiguous Deep Plan drill target "${target}" matched multiple tracks, module cards, or scopes`);
  }
  if (matchCount === 0) {
    throw new Error(`Deep Plan drill target not found: ${target}`);
  }
  if (componentMatches.length) {
    throw new Error(`Deep Plan drill target "${target}" matched an architecture scope but no writable track or module card`);
  }

  return {
    trackIndexes: new Set(trackMatches),
    cardIndexes: new Set(cardMatches),
  };
}

export async function assessDeepPlanReadiness(packageDataOrInput, options = {}) {
  const data = normalizeDeepPlanData(packageDataOrInput || {});
  const target = options.target_readiness_depth || data.deep_plan.readiness_depth || DEFAULT_READINESS_DEPTH;
  const gaps = [];

  if (!readinessDepthAtLeast(data.deep_plan.readiness_depth, target)) {
    gaps.push(`readiness depth is ${data.deep_plan.readiness_depth || DEFAULT_READINESS_DEPTH}; target ${target} is required`);
  }

  if (readinessDepthAtLeast(target, "architecture-ready")) {
    if (!data.architecture.components.length) gaps.push("architecture components are missing");
    if (!data.architecture.edges.length) gaps.push("architecture edges are missing");
    if (!data.tracks.length) gaps.push("tracks are missing");
    if (!hasAcceptedDecision(data)) gaps.push("accepted decision is missing");
  }

  if (readinessDepthAtLeast(target, "implementation-ready")) {
    if (!data.test_matrix.length) gaps.push("test matrix is missing");
    if (!data.acceptance_depth.length) gaps.push("acceptance depth is missing");
    if (!collectRisks(data).length) gaps.push("risks are missing");
    if (!data.ordered_feature_queue.length) gaps.push("ordered feature queue is missing");
  }

  return {
    allowed: gaps.length === 0,
    target_readiness_depth: target,
    package_readiness_depth: data.deep_plan.readiness_depth || DEFAULT_READINESS_DEPTH,
    reason: gaps.length ? "Deep Plan readiness gate failed" : "Deep Plan readiness gate passed",
    gaps,
    intentional_blanks: data.intentional_blanks,
  };
}

export async function convertDeepPlanToPlanContext(projectRoot = ".", ref, options = {}) {
  await assertLegacyWorkspaceWritable(projectRoot, "legacy.deep-plan");
  const root = resolve(projectRoot);
  const resolved = await resolveDeepPlanPackageForConversion(root, ref);
  if (resolved.blocked) return resolved;

  const current = parseYaml(await readFile(resolved.file, "utf8"));
  const existing = normalizeDeepPlanData(current);
  if (existing.deep_plan.status === "archived" || existing.deep_plan.archived_at) {
    return blockedDeepPlanConversion("archived Deep Plan packages cannot be converted", existing);
  }

  const boundary = await validateDeepPlanPackageBoundary(root, existing, {
    ...options,
    operation: "convert",
    expected_package_path: resolved.package.path,
  });
  if (!boundary.allowed) {
    return {
      allowed: false,
      blocked: true,
      reason: boundary.reason,
      boundary,
      deep_plan: existing.deep_plan,
    };
  }

  const readiness = await assessDeepPlanReadiness(existing, {
    ...options,
    target_readiness_depth: options.target_readiness_depth || "implementation-ready",
  });
  if (!readiness.allowed) {
    return {
      allowed: false,
      blocked: true,
      reason: readiness.reason,
      readiness,
      deep_plan: existing.deep_plan,
    };
  }

  const now = options.now || new Date().toISOString();
  const data = normalizeDeepPlanData({
    ...current,
    deep_plan: {
      ...existing.deep_plan,
      status: "converted",
      updated_at: now,
    },
  });
  const planContext = renderPlanContext(data);
  const featureQueueDraft = buildDeepPlanFeatureQueueDraft(data, {
    now,
    cycle_id: options.cycle_id || options.cycleId,
  });
  const planHandoff = buildDeepPlanPlanHandoff(data, featureQueueDraft);
  await writePackageArtifacts(root, data);
  await writeActivePointer(root, data.deep_plan, now);

  return {
    allowed: true,
    blocked: false,
    reason: "Deep Plan converted to compact ordinary Plan context",
    readiness,
    boundary,
    deep_plan: data.deep_plan,
    plan_context: planContext,
    feature_queue_draft: featureQueueDraft,
    plan_handoff: planHandoff,
  };
}

export async function validateDeepPlanPackageBoundary(projectRoot = ".", packageDataOrInput, options = {}) {
  const root = resolve(projectRoot);
  const data = normalizeDeepPlanData(packageDataOrInput || {});
  const packagePath = String(data.deep_plan.package_path || "").trim();
  const issues = [];
  const deepPlansRoot = resolve(root, ".pipeline", "deep-plans");
  const packageDir = resolve(root, packagePath);
  const packageName = basename(packagePath);

  if (!packagePath) {
    issues.push({ kind: "missing_package_path", message: "deep_plan.package_path is required" });
  }
  if (!/^\.pipeline\/deep-plans\/DP\d+-[A-Za-z0-9][A-Za-z0-9-]*$/.test(packagePath)) {
    issues.push({
      kind: "invalid_package_path",
      message: "package_path must be .pipeline/deep-plans/DPxxx-slug",
      package_path: packagePath,
    });
  }
  if (!isInsidePath(deepPlansRoot, packageDir)) {
    issues.push({
      kind: "package_path_escape",
      message: "package_path resolves outside the Deep Plan package boundary",
      package_path: packagePath,
    });
  }
  if (options.expected_package_path && packagePath !== options.expected_package_path) {
    issues.push({
      kind: "package_path_mismatch",
      message: "package_path does not match the resolved Deep Plan package",
      package_path: packagePath,
      expected_package_path: options.expected_package_path,
    });
  }

  for (const [field, defaultName] of [
    ["summary_path", "summary.md"],
    ["plan_context_path", "plan-context.md"],
  ]) {
    const artifactPath = String(data.deep_plan[field] || `${packagePath}/${defaultName}`).trim();
    if (!isInsidePath(packageDir, resolve(root, artifactPath))) {
      issues.push({
        kind: `${field}_escape`,
        message: `${field} resolves outside the Deep Plan package boundary`,
        [field]: artifactPath,
      });
    }
  }

  const allowed = issues.length === 0;
  return {
    allowed,
    valid: allowed,
    operation: options.operation || "validate",
    package_path: packagePath,
    package_name: packageName,
    reason: allowed ? "Deep Plan package path is inside the allowed boundary" : "Deep Plan package_path boundary validation failed or escapes outside the package",
    issues,
  };
}

export async function archiveDeepPlanPackage(projectRoot = ".", ref, options = {}) {
  await assertLegacyWorkspaceWritable(projectRoot, "legacy.deep-plan");
  const root = resolve(projectRoot);
  const found = await findDeepPlanPackage(root, ref);
  const current = parseYaml(await readFile(found.file, "utf8"));
  const now = options.now || new Date().toISOString();
  const data = normalizeDeepPlanData({
    ...current,
    deep_plan: {
      ...current.deep_plan,
      status: "archived",
      archived_at: now,
      archive_reason: options.reason || "",
      updated_at: now,
    },
  });

  await writePackageArtifacts(root, data);
  const active = await readActivePointer(root);
  if (active?.active?.id === data.deep_plan.id) {
    await writeActivePointer(root, data.deep_plan, now);
  }
  return data;
}

async function nextDeepPlanId(root) {
  const packages = await listDeepPlanPackages(root);
  const max = packages.reduce((highest, item) => {
    return Math.max(highest, deepPlanNumber(item.id), deepPlanNumber(item.directory));
  }, 0);
  return `DP${String(max + 1).padStart(3, "0")}`;
}

async function findDeepPlanPackage(projectRoot, ref) {
  const root = resolve(projectRoot);
  const normalized = String(ref || "").trim();
  const packages = await listDeepPlanPackages(root);
  const found = packages.find((item) => {
    return item.id === normalized || item.directory === normalized || `${item.id}-${item.slug}` === normalized;
  });
  if (!found) throw new Error(`Deep Plan package not found: ${ref}`);
  const dir = join(root, ".pipeline", "deep-plans", found.directory);
  return {
    package: found,
    dir,
    file: join(dir, "deep-plan.yaml"),
  };
}

async function resolveDeepPlanPackageForConversion(root, ref) {
  if (String(ref || "").trim() !== "active") {
    return findDeepPlanPackage(root, ref);
  }

  const active = await readActivePointer(root);
  if (!active?.active?.id) {
    return {
      allowed: false,
      blocked: true,
      reason: "active Deep Plan pointer is missing",
    };
  }
  if (active.active.status === "archived") {
    return {
      allowed: false,
      blocked: true,
      reason: "active Deep Plan pointer references an archived package",
      active: active.active,
    };
  }

  const found = await findDeepPlanPackage(root, active.active.id);
  if (found.package.status === "archived") {
    return {
      allowed: false,
      blocked: true,
      reason: "active Deep Plan pointer resolves to an archived package",
      active: active.active,
    };
  }
  return found;
}

async function writePackageArtifacts(root, data) {
  const packageDir = join(root, data.deep_plan.package_path);
  await mkdir(packageDir, { recursive: true });
  await writeConfig(join(packageDir, "deep-plan.yaml"), data);
  await writeConfig(join(packageDir, "architecture.yaml"), normalizeArchitecture(data.architecture));
  await writeConfig(join(packageDir, "tracks.yaml"), { tracks: data.tracks || [] });
  await writeFile(join(packageDir, "summary.md"), renderSummary(data), "utf8");
  await writeFile(join(packageDir, "architecture.md"), renderArchitecture(data), "utf8");
  await writeFile(join(packageDir, "readiness.md"), renderReadiness(data), "utf8");
  await writeFile(join(packageDir, "plan-context.md"), renderPlanContext(data), "utf8");
}

async function writeActivePointer(root, deepPlan, now) {
  await writeConfig(join(root, ".pipeline", "deep-plans", "active.yaml"), {
    active: {
      id: deepPlan.id,
      title: deepPlan.title,
      status: deepPlan.status,
      package_path: deepPlan.package_path,
      updated_at: now,
    },
  });
}

async function readActivePointer(root) {
  try {
    return parseYaml(await readFile(join(root, ".pipeline", "deep-plans", "active.yaml"), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function normalizeDeepPlanData(input) {
  const deepPlanInput = input.deep_plan || input;
  const packagePath = deepPlanInput.package_path;
  const summaryPath = `${packagePath}/summary.md`;
  const planContextPath = `${packagePath}/plan-context.md`;
  const deepPlan = {
    id: deepPlanInput.id,
    slug: deepPlanInput.slug || slugFromPackagePath(packagePath),
    title: deepPlanInput.title,
    status: deepPlanInput.status || "drafting",
    readiness_depth: deepPlanInput.readiness_depth || DEFAULT_READINESS_DEPTH,
    conversation_summary: deepPlanInput.conversation_summary || "",
    package_path: packagePath,
    summary_path: deepPlanInput.summary_path || summaryPath,
    plan_context_path: deepPlanInput.plan_context_path || planContextPath,
    lifecycle_states: deepPlanInput.lifecycle_states || [...DEEP_PLAN_LIFECYCLE_STATES],
    created_at: deepPlanInput.created_at,
    updated_at: deepPlanInput.updated_at || deepPlanInput.created_at,
  };
  if (deepPlanInput.archived_at) deepPlan.archived_at = deepPlanInput.archived_at;
  if (deepPlanInput.archive_reason) deepPlan.archive_reason = deepPlanInput.archive_reason;

  return {
    deep_plan: deepPlan,
    summary: input.summary || "",
    decisions: Array.isArray(input.decisions) ? input.decisions : [],
    tracks: Array.isArray(input.tracks) ? input.tracks : [],
    architecture: normalizeArchitecture(input.architecture || {}),
    ask_rounds: Array.isArray(input.ask_rounds) ? input.ask_rounds : [],
    research_entries: Array.isArray(input.research_entries) ? input.research_entries.map(normalizeResearchEntry) : [],
    readiness_gaps: Array.isArray(input.readiness_gaps) ? input.readiness_gaps : [],
    intentional_blanks: Array.isArray(input.intentional_blanks) ? input.intentional_blanks : [],
    risks: Array.isArray(input.risks) ? input.risks : [],
    test_matrix: Array.isArray(input.test_matrix) ? input.test_matrix : [],
    acceptance_depth: Array.isArray(input.acceptance_depth) ? input.acceptance_depth : [],
    ordered_feature_queue: Array.isArray(input.ordered_feature_queue) ? input.ordered_feature_queue : [],
    unresolved_items: Array.isArray(input.unresolved_items) ? input.unresolved_items : [],
    next_recommended_question: input.next_recommended_question || null,
  };
}

function normalizeResearchEntry(entry = {}) {
  return {
    researched_at: entry.researched_at || "",
    actor: entry.actor || "",
    source_boundaries: entry.source_boundaries && typeof entry.source_boundaries === "object" ? entry.source_boundaries : {},
    searched_surfaces: Array.isArray(entry.searched_surfaces) ? entry.searched_surfaces : [],
    evidence_refs: Array.isArray(entry.evidence_refs) ? entry.evidence_refs : [],
    findings: Array.isArray(entry.findings) ? entry.findings : [],
    unknowns: Array.isArray(entry.unknowns) ? entry.unknowns : [],
  };
}

function normalizeArchitecture(architecture = {}) {
  return {
    components: Array.isArray(architecture.components) ? architecture.components : [],
    edges: Array.isArray(architecture.edges) ? architecture.edges : [],
    open_questions: Array.isArray(architecture.open_questions) ? architecture.open_questions : [],
    module_cards: Array.isArray(architecture.module_cards) ? architecture.module_cards : [],
    evidence_refs: Array.isArray(architecture.evidence_refs) ? architecture.evidence_refs : [],
  };
}

function normalizeDeepPlanTrack(track = {}, options = {}) {
  const relationships = normalizeTrackRelationships({
    depends_on: track.relationships?.depends_on || track.depends_on,
    blocks: track.relationships?.blocks || track.blocks,
    conflicts_with: track.relationships?.conflicts_with || track.conflicts_with,
    feeds_into_plan: track.relationships?.feeds_into_plan || track.feeds_into_plan,
  });
  const normalized = {
    id: String(track.id || "").trim(),
    title: track.title || "",
    type: track.type || track.kind || "topic",
    status: track.status || "open",
    questions: Array.isArray(track.questions) ? track.questions : [],
    decisions: Array.isArray(track.decisions) ? track.decisions : [],
    risks: Array.isArray(track.risks) ? track.risks : [],
    relationships,
  };
  if (options.include_extra_fields !== false) {
    for (const key of ["source_requirement_ids", "source_context", "evidence_refs"]) {
      if (track[key] !== undefined) normalized[key] = Array.isArray(track[key]) ? [...track[key]] : track[key];
    }
  }
  return normalized;
}

function normalizeTrackList(tracks = []) {
  return Array.isArray(tracks) ? tracks.map((track) => normalizeDeepPlanTrack(track)) : [];
}

function normalizeTrackRelationships(relationships = {}) {
  return {
    depends_on: normalizeStringArray(relationships.depends_on),
    blocks: normalizeStringArray(relationships.blocks),
    conflicts_with: normalizeStringArray(relationships.conflicts_with),
    feeds_into_plan: normalizeStringArray(relationships.feeds_into_plan),
  };
}

function validateNormalizedTrackRelationships(tracks = [], options = {}) {
  const trackIds = new Set(tracks.map((track) => track.id).filter(Boolean));
  const issues = [];
  const relationshipKeys = ["depends_on", "blocks", "conflicts_with", "feeds_into_plan"];

  for (const track of tracks) {
    const relationships = normalizeTrackRelationships(track.relationships);
    for (const key of relationshipKeys) {
      for (const targetId of relationships[key]) {
        if (targetId === track.id) {
          issues.push({
            kind: "self_relationship",
            track_id: track.id,
            relationship: key,
            target_id: targetId,
          });
        }
        if (key === "feeds_into_plan") {
          issues.push({
            kind: "plan_feed_reference",
            track_id: track.id,
            relationship: key,
            target_id: targetId,
          });
          continue;
        }
        if (!trackIds.has(targetId)) {
          issues.push({
            kind: "dangling_relationship",
            track_id: track.id,
            relationship: key,
            target_id: targetId,
          });
        }
      }
    }

    const blocks = new Set(relationships.blocks);
    for (const targetId of relationships.conflicts_with) {
      if (blocks.has(targetId)) {
        issues.push({
          kind: "conflicting_relationship",
          track_id: track.id,
          relationship: "conflicts_with",
          target_id: targetId,
        });
      }
    }
  }

  for (const track of tracks) {
    const relationships = normalizeTrackRelationships(track.relationships);
    for (const targetId of relationships.conflicts_with) {
      const target = tracks.find((item) => item.id === targetId);
      if (!target) continue;
      const targetRelationships = normalizeTrackRelationships(target.relationships);
      if (targetRelationships.depends_on.includes(track.id) || relationships.depends_on.includes(target.id)) {
        issues.push({
          kind: "conflicting_relationship",
          track_id: track.id,
          relationship: "depends_on",
          target_id: targetId,
        });
      }
    }
    for (const targetId of relationships.blocks) {
      const target = tracks.find((item) => item.id === targetId);
      if (!target) continue;
      const targetRelationships = normalizeTrackRelationships(target.relationships);
      if (targetRelationships.conflicts_with.includes(track.id)) {
        issues.push({
          kind: "conflicting_relationship",
          track_id: track.id,
          relationship: "blocks",
          target_id: targetId,
        });
      }
    }
  }

  const blockingIssues = options.plan_feed_issues_are_blocking === true
    ? issues
    : issues.filter((issue) => issue.kind !== "plan_feed_reference");
  return { valid: blockingIssues.length === 0, issues };
}

function validateNormalizedArchitectureEdges(architecture = {}) {
  const componentIds = new Set(
    architecture.components
      .map((component) => String(component.id || "").trim())
      .filter(Boolean),
  );
  const issues = [];

  architecture.edges.forEach((edge, edgeIndex) => {
    const from = String(edge.from || "").trim();
    const to = String(edge.to || "").trim();
    if (from === to) {
      issues.push({
        kind: "self_architecture_edge",
        edge_index: edgeIndex,
        from,
        to,
      });
    }

    const missingEndpoints = [];
    if (!componentIds.has(from)) missingEndpoints.push("from");
    if (!componentIds.has(to)) missingEndpoints.push("to");
    if (missingEndpoints.length) {
      issues.push({
        kind: "dangling_architecture_edge",
        edge_index: edgeIndex,
        from,
        to,
        missing_endpoints: missingEndpoints,
        missing_from: missingEndpoints.includes("from"),
        missing_to: missingEndpoints.includes("to"),
      });
    }
  });

  return issues;
}

function renderSummary(data) {
  const lines = [
    `# ${data.deep_plan.title}`,
    "",
    "This is a durable discussion package for Deep Plan work before ordinary plan conversion.",
    "",
    `Status: ${data.deep_plan.status}`,
    `Readiness depth: ${data.deep_plan.readiness_depth}`,
  ];
  if (data.summary) lines.push("", data.summary);
  if (data.deep_plan.conversation_summary) {
    lines.push("", "## Conversation Summary", "", data.deep_plan.conversation_summary);
  }
  if (data.decisions.length) {
    lines.push("", "## Decisions", "");
    for (const decision of data.decisions) {
      lines.push(`- ${decision.id || "decision"}: ${decision.statement || ""}`.trim());
    }
  }
  if (data.research_entries.length) {
    lines.push("", "## Research", "");
    for (const entry of data.research_entries) {
      const findingIds = entry.findings.map((finding) => finding.id).filter(Boolean).join(", ");
      lines.push(`- ${entry.researched_at || "research"}${findingIds ? `: ${findingIds}` : ""}`);
    }
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function renderArchitecture(data) {
  return renderArchitectureMarkdown({
    ...data,
    architecture: normalizeArchitecture(data.architecture),
    tracks: normalizeTrackList(data.tracks),
  }, renderArchitectureMermaid(data.architecture || {}));
}

function renderArchitectureMermaid(architectureInput = {}) {
  const architecture = normalizeArchitecture(architectureInput);
  const lines = ["flowchart TD"];
  if (!architecture.components.length) {
    lines.push("  deep_plan[Deep Plan Discussion Package]");
  } else {
    for (const component of architecture.components) {
      const id = component.id || component.name || "component";
      lines.push(`  ${id}[${mermaidLabel(component.title || id)}]`);
    }
  }
  for (const edge of architecture.edges) {
    if (!edge.from || !edge.to) continue;
    lines.push(`  ${edge.from} --> ${edge.to}`);
  }
  return lines.join("\n");
}

function renderArchitectureMarkdown(data, mermaid, options = {}) {
  const architecture = normalizeArchitecture(data.architecture);
  const tracks = normalizeTrackList(data.tracks);
  const lines = ["# Architecture Map", "", `Deep Plan: ${data.deep_plan.title || data.deep_plan.id || "Untitled"}`, ""];
  if (options.include_mermaid !== false) {
    lines.push("```mermaid", mermaid, "```", "");
  }

  if (tracks.length) {
    lines.push("## Tracks", "");
    for (const track of tracks) {
      lines.push(`- ${track.id}: ${track.title} (${track.type}, ${track.status})`);
      for (const [key, values] of Object.entries(track.relationships)) {
        lines.push(`  - ${key}: ${values.length ? values.join(", ") : "[]"}`);
      }
      if (track.evidence_refs?.length) lines.push(`  - evidence_refs: ${track.evidence_refs.join(", ")}`);
      if (track.source_requirement_ids?.length) lines.push(`  - source_requirement_ids: ${track.source_requirement_ids.join(", ")}`);
      if (track.source_context) lines.push(`  - source_context: ${sanitizeCompactText(track.source_context)}`);
    }
    lines.push("");
  }

  if (architecture.components.length) {
    lines.push("## Components", "");
    for (const component of architecture.components) {
      lines.push(`- ${component.id || component.name}: ${component.title || component.name || component.id || ""}`.trim());
      if (component.description) lines.push(`  - ${component.description}`);
      if (component.evidence_refs?.length) lines.push(`  - Evidence refs: ${component.evidence_refs.join(", ")}`);
    }
    lines.push("");
  }

  if (architecture.edges.length) {
    lines.push("## Edges", "");
    for (const edge of architecture.edges) {
      lines.push(`- ${edge.from} --> ${edge.to}${edge.relationship ? ` (${edge.relationship})` : ""}`);
      if (edge.reason) lines.push(`  - ${edge.reason}`);
      if (edge.evidence_refs?.length) lines.push(`  - Evidence refs: ${edge.evidence_refs.join(", ")}`);
    }
    lines.push("");
  }

  if (architecture.open_questions.length) {
    lines.push("## Open questions", "");
    for (const question of architecture.open_questions) {
      if (typeof question === "string") lines.push(`- ${question}`);
      else {
        lines.push(`- ${question.id || "question"}: ${question.question || ""}`.trim());
        if (question.evidence_refs?.length) lines.push(`  - Evidence refs: ${question.evidence_refs.join(", ")}`);
      }
    }
    lines.push("");
  }

  if (architecture.module_cards.length) {
    lines.push("## Module cards", "");
    for (const card of architecture.module_cards) {
      lines.push(`- ${card.id || "module"}: ${card.title || ""}`.trim());
      for (const key of ["responsibilities", "inputs", "outputs"]) {
        if (Array.isArray(card[key]) && card[key].length) lines.push(`  - ${key}: ${card[key].join(", ")}`);
      }
      if (card.evidence_refs?.length) lines.push(`  - Evidence refs: ${card.evidence_refs.join(", ")}`);
    }
    lines.push("");
  }

  if (architecture.evidence_refs.length) {
    lines.push("## Evidence refs", "");
    for (const ref of architecture.evidence_refs) lines.push(`- ${typeof ref === "string" ? ref : ref.ref || JSON.stringify(ref)}`);
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function renderReadiness(data) {
  const lines = [
    `# Readiness: ${data.deep_plan.title}`,
    "",
    `Depth: ${data.deep_plan.readiness_depth}`,
    `Status: ${data.deep_plan.status}`,
    "",
    "Deep Plan readiness checks whether requirements, architecture, tracks, tests, and risks are sufficient for conversion.",
  ];
  if (data.readiness_gaps?.length) {
    lines.push("", "## Gaps", "");
    for (const gap of data.readiness_gaps) lines.push(`- ${gap}`);
  }
  if (data.next_recommended_question) {
    lines.push("", "## Next Recommended Question", "");
    lines.push(data.next_recommended_question.question || "");
  }
  if (data.research_entries.length) {
    lines.push("", "## Research Unknowns", "");
    for (const entry of data.research_entries) {
      for (const unknown of entry.unknowns) lines.push(`- ${unknown.id || "unknown"}: ${unknown.question || ""}`.trim());
    }
  }
  return lines.join("\n") + "\n";
}

function renderPlanContext(data) {
  const decisions = data.decisions
    .map((decision) => `${decision.id || "decision"}: ${decision.statement || ""}`.trim())
    .join("\n");
  const tracks = data.tracks
    .map((track) => `${track.id || "track"}: ${track.title || ""}`.trim())
    .join("\n");
  const research = renderResearchPlanContext(data.research_entries);
  const featureQueue = renderCompactItems(data.ordered_feature_queue, (item) => {
    const priority = item.priority !== undefined ? `P${item.priority} ` : "";
    return `${item.id || "feature"}: ${priority}${item.title || item.item || item.statement || ""}`.trim();
  });
  const testMatrix = renderCompactItems(data.test_matrix, (item) => {
    const command = item.command ? ` - ${item.command}` : "";
    return `${item.id || "test"}: ${item.target || item.title || item.item || ""}${command}`.trim();
  });
  const acceptanceDepth = renderCompactItems(data.acceptance_depth, (item) => {
    const depth = item.depth ? ` (${item.depth})` : "";
    return `${item.id || "acceptance"}: ${item.criterion || item.item || item.statement || ""}${depth}`.trim();
  });
  const risks = renderCompactItems(collectRisks(data), (item) => {
    return `${item.id || "risk"}: ${item.statement || item.item || item.title || ""}`.trim();
  });
  const unresolved = renderCompactItems(collectUnresolvedItems(data), (item) => {
    if (typeof item === "string") return item;
    return `${item.id || "item"}: ${item.item || item.question || item.statement || ""}`.trim();
  });
  const pseudoTestPolicy = readinessDepthAtLeast(data.deep_plan.readiness_depth, "implementation-ready") || data.ordered_feature_queue.length || data.test_matrix.length
    ? `pseudo-test rejection policy: reject pseudo tests; ordinary Plan must require real, runnable validation evidence before Feature Queue execution.`
    : "";
  return [
    `# Compact: ${data.deep_plan.title}`,
    `Use for Feature Queue and ordinary /hw:plan handoff.`,
    `readiness: ${data.deep_plan.readiness_depth}`,
    pseudoTestPolicy,
    data.deep_plan.conversation_summary ? `summary: ${sanitizeCompactText(data.deep_plan.conversation_summary)}` : "",
    decisions ? `decisions:\n${decisions}` : "",
    tracks ? `tracks:\n${tracks}` : "",
    featureQueue ? `## Feature Queue\n${featureQueue}` : "",
    testMatrix ? `## Test Matrix\n${testMatrix}` : "",
    acceptanceDepth ? `## Acceptance Depth\n${acceptanceDepth}` : "",
    risks ? `## Risks\n${risks}` : "",
    unresolved ? `## Unresolved Items\n${unresolved}` : "",
    research,
    data.next_recommended_question?.question ? `next_question: ${data.next_recommended_question.question}` : "",
  ].filter(Boolean).join("\n") + "\n";
}

function buildDeepPlanFeatureQueueDraft(data, options = {}) {
  const features = [];
  const parkedItems = [];
  const risks = collectRisks(data);
  const unknowns = (data.unresolved_items || []).filter(Boolean);
  const now = options.now || new Date().toISOString();

  for (const [index, item] of data.ordered_feature_queue.entries()) {
    const readinessDepth = item.readiness_depth || item.readinessDepth || data.deep_plan.readiness_depth || DEFAULT_READINESS_DEPTH;
    const normalized = {
      id: item.id || `FQ${String(index + 1).padStart(3, "0")}`,
      title: item.title || item.item || item.statement || `Feature ${index + 1}`,
      priority: item.priority ?? (index + 1) * 10,
      readiness_depth: readinessDepth,
      source: "deep-plan-convert",
      summary: item.summary || item.item || item.statement || "",
      risks: resolveReferencedItems(item.risks, risks, { inheritAllWhenMissing: true }),
      test_matrix: resolveReferencedItems(item.test_matrix || item.tests, data.test_matrix, { inheritAllWhenMissing: true }),
      acceptance_depth: resolveReferencedItems(item.acceptance_depth || item.acceptance, data.acceptance_depth, { inheritAllWhenMissing: true }),
      depends_on: normalizeIdList(item.depends_on || item.dependsOn || item.dependencies),
      gate: item.gate || "auto",
      decompose_mode: item.decompose_mode || item.decomposeMode || "just_in_time",
      handoff_hint: item.handoff_hint || "Generated from Deep Plan convert; ordinary Plan must confirm before writing .pipeline/feature-queue.yaml.",
    };

    if (!readinessDepthAtLeast(readinessDepth, "implementation-ready")) {
      parkedItems.push({
        ...normalized,
        status: "parked",
        reason: `readiness depth ${readinessDepth} is not implementation-ready; keep directional work parked until a later Deep Plan drill/readiness pass`,
      });
      continue;
    }

    features.push({
      ...normalized,
      status: item.status ? normalizeFeatureQueueStatus(item.status) : "queued",
      milestones: Array.isArray(item.milestones) ? item.milestones : [],
    });
  }

  return {
    version: 1,
    cycle_id: options.cycle_id || data.deep_plan.cycle_id || null,
    source: "deep-plan-convert",
    deep_plan_id: data.deep_plan.id,
    generated_at: now,
    current_feature: null,
    defaults: {
      decompose_mode: "just_in_time",
      failure_policy: "skip_defer",
      auto_chain: false,
      default_gate: "confirm",
    },
    features,
    parked_items: parkedItems,
    risks,
    unknowns,
    test_matrix: data.test_matrix,
    acceptance_depth: data.acceptance_depth,
    pseudo_test_rejection_policy: "reject pseudo tests; require real runnable validation before execution",
  };
}

function buildDeepPlanPlanHandoff(data, featureQueueDraft) {
  return {
    source: "deep-plan-convert",
    deep_plan_id: data.deep_plan.id,
    readiness_depth: data.deep_plan.readiness_depth,
    ordinary_plan_required: true,
    feature_queue_confirmation_required: true,
    pseudo_test_rejection_policy: featureQueueDraft.pseudo_test_rejection_policy,
    blocked_from_execution: featureQueueDraft.parked_items.map((item) => ({
      id: item.id,
      reason: item.reason,
    })),
    carry_forward: {
      risks: featureQueueDraft.risks.map((item) => item.id || item.statement || item.item).filter(Boolean),
      unknowns: featureQueueDraft.unknowns.map((item) => item.id || item.question || item.item || item.statement).filter(Boolean),
      test_matrix: featureQueueDraft.test_matrix.map((item) => item.id || item.target || item.title).filter(Boolean),
      acceptance_depth: featureQueueDraft.acceptance_depth.map((item) => item.id || item.criterion || item.title).filter(Boolean),
    },
  };
}

function resolveReferencedItems(refs, items = [], options = {}) {
  if (!Array.isArray(refs) || refs.length === 0) {
    return options.inheritAllWhenMissing ? items : [];
  }
  return refs.map((ref) => {
    if (typeof ref === "object" && ref !== null) return ref;
    const id = String(ref);
    return items.find((item) => item?.id === id) || { id };
  });
}

function normalizeFeatureQueueStatus(status) {
  const normalized = String(status || "").trim().toLowerCase().replace(/\s+/g, "_");
  return ["queued", "active", "blocked", "done", "deferred", "decomposed"].includes(normalized)
    ? normalized
    : "queued";
}

function normalizeIdList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/[, ]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderResearchPlanContext(researchEntries = []) {
  if (!researchEntries.length) return "";
  const lines = ["research_evidence:"];
  for (const entry of researchEntries) {
    const boundaries = Object.entries(entry.source_boundaries || {})
      .map(([key, value]) => `${key}=${value}`)
      .join(", ");
    lines.push(`- researched_at: ${entry.researched_at || "unknown"}`);
    if (boundaries) lines.push(`  source_boundaries: ${sanitizeCompactText(boundaries)}`);
    if (entry.searched_surfaces.length) {
      lines.push(`  searched_surfaces: ${entry.searched_surfaces.map((surface) => surface.kind || surface.path || surface.query).filter(Boolean).join(", ")}`);
    }
    if (entry.evidence_refs.length) {
      lines.push(`  evidence_refs: ${entry.evidence_refs.map((item) => item.ref || item).filter(Boolean).join(", ")}`);
    }
    for (const finding of entry.findings) {
      lines.push(`  finding: ${finding.id || "finding"} ${sanitizeCompactText(finding.statement || "")}`.trimEnd());
    }
    for (const unknown of entry.unknowns) {
      lines.push(`  unknown: ${unknown.id || "unknown"} ${sanitizeCompactText(unknown.question || "")}`.trimEnd());
    }
  }
  return lines.join("\n");
}

function challengeQuestion(challenge, locale = "en") {
  const zh = locale.startsWith("zh");
  const questions = {
    necessity: zh
      ? "为什么必须做这件事？如果不做，哪个真实工作流会失败或不可接受？"
      : "Why is this necessary, and which real workflow fails or becomes unacceptable if we do not do it?",
    minimum_viable_loop: zh
      ? "能验证方向成立的最小可行 loop 是什么？哪些部分可以先不做？"
      : "What is the smallest viable loop that proves the direction, and what can be left out first?",
    falsifying_evidence: zh
      ? "什么证伪证据或反证会说明这个方向不该进入计划分解？"
      : "What falsifying evidence would disconfirm this direction before milestone decomposition?",
    essential_vs_habitual: zh
      ? "哪些约束是本质必需的，哪些只是既有习惯或偏好的延续？"
      : "Which constraints are essential, and which are only habitual preferences from the current workflow?",
  };
  return questions[challenge] || questions.necessity;
}

function challengeGap(challenge) {
  const gaps = {
    necessity: "necessity challenge has not produced an accepted decision",
    minimum_viable_loop: "minimum viable loop / 最小验证闭环 is missing",
    falsifying_evidence: "falsifying evidence / 证伪标准 is missing",
    essential_vs_habitual: "essential vs habitual decision pressure test is missing",
  };
  return gaps[challenge] || `${challenge} challenge is missing`;
}

function answeredFirstPrinciplesChallenges(askRounds = []) {
  const firstPrinciples = new Set(FIRST_PRINCIPLES_CHALLENGES);
  return new Set(askRounds
    .map((round) => round?.question?.challenge)
    .filter((challenge) => firstPrinciples.has(challenge)));
}

function orderedAskChallenges(answeredChallenges, recommendedChallenge) {
  const unanswered = FIRST_PRINCIPLES_CHALLENGES
    .filter((challenge) => !answeredChallenges.has(challenge));
  const answered = FIRST_PRINCIPLES_CHALLENGES
    .filter((challenge) => answeredChallenges.has(challenge));
  const orderedUnanswered = unanswered.includes(recommendedChallenge)
    ? [
        recommendedChallenge,
        ...unanswered.filter((challenge) => challenge !== recommendedChallenge),
      ]
    : unanswered;

  return [...orderedUnanswered, ...answered];
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function needsContextUserQuestion(data) {
  const text = [
    data.deep_plan.title,
    data.deep_plan.conversation_summary,
    ...(data.architecture.open_questions || []),
  ].join("\n");
  return /user|operator|用户|使用者|操作者|身份|role/i.test(text);
}

function readinessDepthAtLeast(actual, target) {
  const actualIndex = READINESS_DEPTH_ORDER.indexOf(actual || DEFAULT_READINESS_DEPTH);
  const targetIndex = READINESS_DEPTH_ORDER.indexOf(target || DEFAULT_READINESS_DEPTH);
  if (targetIndex === -1) return actual === target;
  return actualIndex >= targetIndex;
}

function mergeById(existing = [], incoming = []) {
  const result = [...arrayValue(existing)];
  for (const item of arrayValue(incoming)) {
    if (!item) continue;
    const id = item.id || "";
    const index = id ? result.findIndex((current) => current.id === id) : -1;
    if (index >= 0) result[index] = { ...result[index], ...item };
    else result.push(item);
  }
  return result;
}

function mergeStrings(existing = [], incoming = []) {
  const seen = new Set();
  const result = [];
  for (const value of [...arrayValue(existing), ...arrayValue(incoming)]) {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function arrayValue(value = []) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function normalizeStringArray(value = []) {
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function uniqueStrings(values = []) {
  const seen = new Set();
  const result = [];
  for (const value of normalizeStringArray(values)) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function mergeTracksById(existing = [], incoming = []) {
  const result = [...existing];
  for (const track of incoming) {
    const id = track?.id;
    if (!id) continue;
    const index = result.findIndex((item) => item.id === id);
    if (index >= 0) result[index] = { ...result[index], ...track };
    else result.push(track);
  }
  return result;
}

function hasAcceptedDecision(data) {
  const decisions = [
    ...(data.decisions || []),
    ...(data.tracks || []).flatMap((track) => track.decisions || []),
    ...(data.architecture.module_cards || []).flatMap((card) => card.decisions || []),
  ];
  return decisions.some((decision) => decision?.status === "accepted");
}

function collectRisks(data) {
  return [
    ...(data.risks || []),
    ...(data.tracks || []).flatMap((track) => track.risks || []),
    ...(data.architecture?.module_cards || []).flatMap((card) => card.risks || []),
  ].filter(Boolean);
}

function collectUnresolvedItems(data) {
  return [
    ...(data.unresolved_items || []),
    ...(data.readiness_gaps || []),
    ...(data.tracks || []).flatMap((track) => track.open_items || []),
    ...(data.architecture?.module_cards || []).flatMap((card) => card.open_items || []),
    ...(data.architecture?.open_questions || []),
  ].filter(Boolean);
}

function renderCompactItems(items = [], renderItem) {
  return items
    .map((item) => sanitizeCompactText(renderItem(item)))
    .filter(Boolean)
    .map((line) => `- ${line}`)
    .join("\n");
}

function blockedDeepPlanConversion(reason, data) {
  return {
    allowed: false,
    blocked: true,
    reason,
    deep_plan: data.deep_plan,
  };
}

function isInsidePath(parent, child) {
  const normalizedParent = resolve(parent);
  const normalizedChild = resolve(child);
  return normalizedChild === normalizedParent || normalizedChild.startsWith(`${normalizedParent}/`);
}

function moduleTrackId(componentId = "") {
  const normalized = String(componentId || "").trim();
  return normalized.startsWith("MOD-") ? normalized : `MOD-${normalized}`;
}

function titleFromId(value = "") {
  return String(value || "module")
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function localResearchActionReason(actionType) {
  const reasons = {
    read_repository_file: "local read-only repository file inspection is allowed",
    inspect_archive: "local read-only archive inspection is allowed",
    search_local_docs: "local read-only docs search is allowed",
    search_local_tests: "local read-only tests search is allowed",
  };
  return reasons[actionType] || "local read-only research action is allowed";
}

function isNonLocalResearchAction(actionType = "") {
  return /remote|network|edit|restart|destructive|delete|external|side[_-]?effect/i.test(actionType);
}

function isRemoteResearchAction(actionType = "") {
  const normalized = String(actionType || "");
  return REMOTE_RESEARCH_ACTIONS.includes(normalized) || /remote|network|download|clone/i.test(normalized);
}

function isSideEffectingResearchAction(actionType = "") {
  const normalized = String(actionType || "");
  return SIDE_EFFECT_RESEARCH_ACTIONS.includes(normalized) || /edit|restart|destructive|delete|external|side[_-]?effect/i.test(normalized);
}

function validateRemoteResearchConfirmation(actionType, action = {}, policyOrOptions = {}) {
  const hasScopedRemoteConfirmation = hasRemoteActionScopedConfirmation(actionType, action, policyOrOptions);
  if (!hasScopedRemoteConfirmation) {
    return {
      allowed: false,
      reason: `${actionType || "remote research action"} requires confirmed_remote_actions or local_config_trusted_remote_actions with explicit ${actionType || "remote action"} action-scope authorization`,
    };
  }

  const cachePath = String(policyOrOptions.research_cache_path || action.research_cache_path || "").trim();
  if (!isBoundedResearchCachePath(cachePath)) {
    return {
      allowed: false,
      reason: `${actionType || "remote research action"} requires a bounded research cache under .pipeline/deep-plans/<DP>/research-cache before download or clone`,
    };
  }

  const evidenceRefs = [
    ...(policyOrOptions.evidence_refs || []),
    ...(action.evidence_refs || []),
  ];
  if (!hasImplementationCodeEvidenceRef(evidenceRefs)) {
    return {
      allowed: false,
      reason: `${actionType || "remote research action"} requires implementation code evidence_refs from inspected source; README-only evidence is insufficient`,
    };
  }

  return { allowed: true, reason: `${actionType || "remote research action"} has confirmed remote action, bounded cache, and implementation code evidence refs` };
}

function hasRemoteActionScopedConfirmation(actionType, action = {}, policyOrOptions = {}) {
  const confirmedRemoteActions = new Set([
    ...(policyOrOptions.confirmed_remote_actions || []),
    ...(action.confirmed_remote_actions || []),
    ...(policyOrOptions.local_config_trusted_remote_actions || []),
    ...(action.local_config_trusted_remote_actions || []),
  ]);
  return confirmedRemoteActions.has(actionType);
}

function hasActionScopedConfirmation(actionType, action = {}, policyOrOptions = {}) {
  const confirmedActions = new Set(policyOrOptions.confirmed_actions || []);
  const confirmedScopes = new Set([
    ...(policyOrOptions.confirmed_scopes || []),
    ...(policyOrOptions.confirmation_scopes || []),
  ]);
  return confirmedActions.has(actionType)
    || confirmedScopes.has(actionType)
    || policyOrOptions.confirmed_action === actionType
    || policyOrOptions.confirmation_scope === actionType
    || action.confirmed_action === actionType
    || action.confirmation_scope === actionType;
}

function isBoundedResearchCachePath(cachePath = "") {
  return /^\.pipeline\/deep-plans\/DP\d+[A-Za-z0-9-]*\/research-cache\/[A-Za-z0-9._/-]+$/.test(cachePath)
    && !cachePath.split("/").includes("..");
}

function hasImplementationCodeEvidenceRef(evidenceRefs = []) {
  return evidenceRefs.some((item) => {
    const kind = String(item?.kind || "").toLowerCase();
    const ref = String(item?.ref || "").toLowerCase();
    if (/readme(\.md)?$/.test(ref) || kind === "readme") return false;
    return /implementation[_-]?code|source[_-]?code|code_file|repository_file/.test(kind)
      || /\.(js|ts|tsx|jsx|py|go|rs|java|kt|c|cc|cpp|h|hpp|rb|php|cs|swift|mjs|cjs)$/.test(ref);
  });
}

function compactKnowledgeSummary(parts = [], maxChars = 500, shouldRedact = true) {
  const text = parts
    .filter(Boolean)
    .map((part) => sanitizeCompactText(part))
    .filter(Boolean)
    .join("\n");
  const redacted = shouldRedact ? cleanRedactedSecretText(redactSecrets(text)) : text;
  return truncateText(redacted, maxChars);
}

function redactEvidenceRefs(evidenceRefs = []) {
  return evidenceRefs.map((item) => redactEvidenceRefValue(item));
}

function redactEvidenceRefValue(value) {
  if (Array.isArray(value)) return value.map((item) => redactEvidenceRefValue(item));
  if (value && typeof value === "object") {
    const result = {};
    for (const [key, child] of Object.entries(value)) {
      if (isSecretEvidenceKey(key)) continue;
      result[key] = redactEvidenceRefValue(child);
    }
    return result;
  }
  if (typeof value === "string") return cleanRedactedSecretText(redactSecrets(value));
  return value;
}

function isSecretEvidenceKey(key = "") {
  return /api[_-]?key|token|secret|password|authorization|cookie|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key/i
    .test(String(key));
}

function cleanRedactedSecretText(value = "") {
  return String(value)
    .replace(/([?&])(?:api[_-]?key|token|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|secret|authorization|cookie|private[_-]?key)=\[[^\]]+\]/gi, "$1redacted=[REDACTED]")
    .replace(/\b(?:api[_-]?key|token|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|secret|authorization|cookie|private[_-]?key)\s*[:=]\s*\[[^\]]+\]/gi, "[REDACTED]")
    .replace(/\/(?:api[_-]?key|token|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|secret|authorization|cookie|private[_-]?key)=\[[^\]]+\]/gi, "/[REDACTED]");
}

function truncateText(value = "", maxChars = 500) {
  const text = String(value || "").trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
}

function requiredTitle(title) {
  const normalized = String(title || "").trim();
  if (!normalized) throw new Error("Deep Plan package title is required");
  return normalized;
}

function slugify(value) {
  return String(value || "deep-plan")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "deep-plan";
}

function slugFromPackagePath(packagePath) {
  const name = basename(packagePath || "");
  return name.replace(/^DP\d+-/, "") || "deep-plan";
}

function deepPlanNumber(value = "") {
  return Number(/^DP(\d+)/.exec(String(value))?.[1] || 0);
}

function mermaidId(value = "") {
  return String(value || "component").replace(/[^A-Za-z0-9_]/g, "_");
}

function mermaidLabel(value = "") {
  return String(value).replace(/[[\]"]/g, "");
}

function sanitizeCompactText(value = "") {
  return String(value)
    .split(/\r?\n/)
    .filter((line) => !/^\s*(USER|ASSISTANT):/i.test(line))
    .join(" ")
    .replace(/RAW_LONG_CONVERSATION_MARKER/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
