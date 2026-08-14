// LEGACY (C026, 2026-08-14): C12–C19 批量/阶段制 Plan 机器。
// 日常语义 Cycle 不再调用本模块；仅旧宿主/迁移兼容保留，见 .pipeline/legacy/INDEX.md。
import { normalizeDiscoverFeature } from "../progressive-discover/index.js";
import { normalizeTestProfileSelection } from "../test-profile/index.js";

export function renderBatchPlanArtifacts(input = {}, options = {}) {
  const cycleId = input.cycle_id || input.cycleId || "C1";
  const mode = options.decompose_mode || "upfront";
  const failurePolicy = options.failure_policy || "skip_defer";
  const features = normalizeFeatures(input.features || [], mode);
  const dag = resolveFeatureDagBoard({ features });
  const currentFeature = features.find((feature) => feature.status === "active")?.id || features[0]?.id || null;

  const queue = {
    version: 1,
    cycle_id: cycleId,
    current_feature: currentFeature,
    defaults: {
      decompose_mode: mode,
      failure_policy: failurePolicy,
      auto_chain: options.auto_chain ?? true,
      default_gate: options.default_gate || "auto",
    },
    features,
  };

  return {
    queue,
    markdown: renderFeatureTable(features, mode, dag),
    mermaid: renderFeatureGraph(features, dag),
    dag,
  };
}

export function renderPlanPhaseFlow(phases = []) {
  const ordered = [...phases].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const lines = ["graph TD"];
  for (const phase of ordered) {
    lines.push(`  ${sanitizeNode(phase.id)}["${escapeLabel(phase.label || phase.id)}"]`);
  }
  for (let index = 0; index < ordered.length - 1; index += 1) {
    lines.push(`  ${sanitizeNode(ordered[index].id)} --> ${sanitizeNode(ordered[index + 1].id)}`);
  }
  return `${lines.join("\n")}\n`;
}

export function renderMilestoneTable(milestones = []) {
  const lines = [
    "| Milestone | Phase | Validation |",
    "|---|---|---|",
  ];
  for (const milestone of milestones) {
    lines.push(`| ${formatMilestoneLabel(milestone)} | ${formatCell(milestone.phase || "n/a")} | ${formatCell(milestone.validation || milestone.validation_command || milestone.validation_commands || "TBD")} |`);
  }
  return `${lines.join("\n")}\n`;
}

export function renderDecisionMatrix(decisions = []) {
  const lines = [
    "| Decision | Options | Selected | Rationale | Status |",
    "|---|---|---|---|---|",
  ];
  for (const decision of decisions) {
    lines.push(`| ${formatCell(decision.decision || decision.title || decision.id || "decision")} | ${formatCell(decision.options || [])} | ${formatCell(decision.selected || decision.choice || "TBD")} | ${formatCell(decision.rationale || decision.reason || "")} | ${formatCell(decision.status || "proposed")} |`);
  }
  return `${lines.join("\n")}\n`;
}

export function renderDependencyMap(items = []) {
  const features = normalizeDagFeatures(items);
  const dag = resolveFeatureDagBoard({ features });
  const lines = ["graph TD"];
  for (const feature of dag.features) {
    lines.push(`  ${sanitizeNode(feature.id)}["${feature.id}: ${escapeLabel(feature.title)}"]`);
  }
  for (const feature of dag.features) {
    for (const dependency of feature.depends_on) {
      lines.push(`  ${sanitizeNode(dependency)} --> ${sanitizeNode(feature.id)}`);
    }
  }
  if (!dag.visible && dag.features.length > 1) {
    for (let index = 0; index < dag.features.length - 1; index += 1) {
      lines.push(`  ${sanitizeNode(dag.features[index].id)} -. next .-> ${sanitizeNode(dag.features[index + 1].id)}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

export function assessRunnableVerticalSlice(milestone = {}) {
  const text = collectMilestoneText(milestone);
  const layers = detectSliceLayers(text);
  const hasValidation = hasRunnableValidation(milestone, text);
  const hasClosedLoop = hasClosedLoopValidation(milestone, text);
  const runnableBehavior = hasRunnableBehavior(text, hasValidation);
  const flags = [];

  if (isHorizontalOnly(text, layers, runnableBehavior)) {
    flags.push("horizontal_only");
  }
  if (!runnableBehavior) {
    flags.push("missing_runnable_behavior");
  }
  if (!hasValidation) {
    flags.push("missing_real_validation");
  }
  if (hasValidation && !hasClosedLoop) {
    flags.push("missing_closed_loop_validation");
  }
  if (runnableBehavior && layers.length < 2) {
    flags.push("single_layer_slice");
  }

  const status = flags.includes("horizontal_only") || flags.includes("missing_runnable_behavior")
    ? "weak"
    : flags.length
      ? "needs_evidence"
      : "acceptable";

  return {
    status,
    flags,
    layers,
    runnable_behavior: runnableBehavior,
    validation_evidence: hasValidation,
    closed_loop_validation: hasClosedLoop,
    summary: status === "acceptable"
      ? "Acceptable runnable vertical slice with observable behavior and closed-loop validation."
      : "Weak decomposition: define a runnable vertical slice with observable behavior and closed-loop validation.",
  };
}

export function resolveFeatureDagBoard(queue = {}) {
  const features = normalizeDagFeatures(queue.features || []);
  const ids = new Set(features.map((feature) => feature.id));
  const errors = [];

  for (const feature of features) {
    for (const dependency of feature.depends_on) {
      if (!ids.has(dependency)) {
        errors.push({
          code: "missing_dependency",
          feature_id: feature.id,
          dependency,
          message: `Feature ${feature.id} depends on missing Feature ${dependency}.`,
        });
      }
    }
  }

  const cycle = detectDependencyCycle(features);
  if (cycle.length) {
    errors.push({
      code: "dependency_cycle",
      cycle,
      message: `Feature dependency cycle detected: ${cycle.join(" -> ")}`,
    });
  }

  const doneIds = new Set(features.filter((feature) => isDoneFeature(feature)).map((feature) => feature.id));
  const featureMap = new Map(features.map((feature) => [feature.id, feature]));
  const enriched = features.map((feature) => {
    const blockedBy = feature.depends_on.filter((dependency) => !doneIds.has(dependency));
    const active = isActiveFeature(feature);
    const done = isDoneFeature(feature);
    const ready = !done && !active && blockedBy.length === 0 && isRunnableQueueStatus(feature.status);
    const computedStatus = done
      ? "done"
      : active
        ? "active"
        : blockedBy.length
          ? "blocked"
          : feature.status;
    return {
      ...feature,
      status: computedStatus,
      ready,
      blocked_by: blockedBy,
      unlocks: features
        .filter((candidate) => candidate.depends_on.includes(feature.id))
        .map((candidate) => candidate.id),
      ready_reason: done
        ? "done"
        : active
          ? "active"
          : blockedBy.length
            ? "waiting_on_dependencies"
            : ready
              ? "dependencies_satisfied"
              : "not_runnable_status",
      depends_on_titles: feature.depends_on.map((dependency) => featureMap.get(dependency)?.title || dependency),
    };
  });

  const readyFeatures = enriched.filter((feature) => feature.ready);
  return {
    ok: errors.length === 0,
    visible: shouldShowDag(enriched),
    errors,
    features: enriched,
    ready_features: readyFeatures,
    blocked_features: enriched.filter((feature) => feature.blocked_by.length > 0),
    parallel_candidates: readyFeatures.length > 1 ? readyFeatures : [],
  };
}

export function applyFeatureQueueOperation(queue, operation, options = {}) {
  const before = clone(queue);
  const nextQueue = clone(queue);
  const validation = validateQueueOperation(nextQueue, operation, options);
  if (validation) {
    return {
      status: "blocked",
      reason: validation,
      requires_confirmation: false,
      queue: before,
      operation,
    };
  }

  mutateQueue(nextQueue, operation);
  nextQueue.updated_at = options.now || nextQueue.updated_at || new Date().toISOString();
  const summary = summarizeOperation(operation);
  const diff = {
    before: summarizeQueue(before),
    after: summarizeQueue(nextQueue),
  };

  if (!options.confirmed) {
    return {
      status: "confirmation_required",
      requires_confirmation: true,
      queue: before,
      operation,
      summary,
      diff,
    };
  }

  return {
    status: "applied",
    requires_confirmation: false,
    queue: nextQueue,
    operation,
    summary,
    diff,
    event: {
      type: "feature_queue_update",
      summary,
      timestamp: nextQueue.updated_at,
    },
  };
}

export function resolveFeatureAutoChain(queue, transition = {}) {
  const nextQueue = clone(queue);
  const now = transition.now || new Date().toISOString();
  const feature = nextQueue.features.find((item) => item.id === transition.feature_id);
  if (!feature) {
    return {
      action: "blocked",
      reason: `feature not found: ${transition.feature_id}`,
      queue: nextQueue,
    };
  }

  const failurePolicy = transition.failure_policy || nextQueue.defaults?.failure_policy || "skip_defer";
  const autoChain = transition.auto_chain ?? nextQueue.defaults?.auto_chain ?? true;
  if (transition.result === "fail") {
    if (failurePolicy === "retry") {
      feature.status = "active";
      nextQueue.current_feature = feature.id;
      nextQueue.updated_at = now;
      return { action: "retry", queue: nextQueue, feature_id: feature.id };
    }
    if (failurePolicy === "stop") {
      feature.status = "blocked";
      nextQueue.current_feature = feature.id;
      nextQueue.updated_at = now;
      return { action: "stop", queue: nextQueue, feature_id: feature.id };
    }
    feature.status = "deferred";
    feature.deferred_reason = transition.reason || "failure_policy_skip_defer";
  } else {
    feature.status = "done";
  }

  nextQueue.updated_at = now;
  if (!autoChain) {
    nextQueue.current_feature = null;
    return { action: "pause_auto_chain_disabled", queue: nextQueue };
  }

  const nextFeature = nextQueue.features.find((item) => item.status === "queued" || item.status === "decomposed");
  if (!nextFeature) {
    nextQueue.current_feature = null;
    return { action: "complete", queue: nextQueue };
  }

  if (nextFeature.gate === "confirm") {
    nextQueue.current_feature = null;
    return {
      action: "pause_for_confirmation",
      next_feature_id: nextFeature.id,
      queue: nextQueue,
    };
  }

  nextFeature.status = "active";
  nextQueue.current_feature = nextFeature.id;
  const decomposed = decomposeFeatureJustInTime(nextQueue, nextFeature.id, { now });
  return {
    action: "advance",
    next_feature_id: nextFeature.id,
    queue: decomposed.queue,
  };
}

export function decomposeFeatureJustInTime(queue, featureId, options = {}) {
  const nextQueue = clone(queue);
  const feature = nextQueue.features.find((item) => item.id === featureId);
  if (!feature) {
    return {
      generated: false,
      reason: `feature not found: ${featureId}`,
      queue: nextQueue,
    };
  }

  if (feature.decompose_mode !== "just_in_time" || feature.milestones?.length) {
    return {
      generated: false,
      queue: nextQueue,
    };
  }

  feature.milestones = renderDefaultMilestones(feature.id, feature.title || feature.id);
  nextQueue.updated_at = options.now || nextQueue.updated_at || new Date().toISOString();
  return {
    generated: true,
    queue: nextQueue,
  };
}

export function syncFeatureMetricSummary(queue, metrics = {}) {
  const nextQueue = clone(queue);
  for (const feature of nextQueue.features || []) {
    const record = (metrics.features || []).find((item) => item.id === feature.id) || {};
    feature.metric_summary = {
      duration_ms: fallbackMetric(record.duration_ms),
      token_count: fallbackMetric(record.token_count),
      cost: fallbackMetric(record.cost),
    };
  }
  return nextQueue;
}

function normalizeFeatures(features, mode) {
  return features.map((feature, index) => {
    const discover = normalizeDiscoverFeature(feature);
    const id = discover.id || `F${String(index + 1).padStart(3, "0")}`;
    const featureMode = discover.decompose_mode || mode;
    const explicitMilestones = Array.isArray(discover.milestones) && discover.milestones.length;
    return {
      id,
      title: discover.title || id,
      priority: discover.priority ?? (index + 1) * 10,
      status: discover.status ? normalizeFeatureStatus(discover.status) : index === 0 ? "active" : "queued",
      gate: discover.gate || "auto",
      decompose_mode: featureMode,
      source: discover.source || "batch-discover",
      summary: discover.summary || discover.desired_effect || "",
      category: discover.category,
      workflow_kind: discover.workflow_kind,
      analysis_kind: discover.analysis_kind,
      desired_effect: discover.desired_effect,
      verification: discover.verification,
      test_profiles: normalizeTestProfileSelection(discover).profiles,
      depends_on: normalizeIdList(discover.depends_on || discover.dependsOn || discover.dependencies),
      unlocks: normalizeIdList(discover.unlocks),
      blocked_by: normalizeIdList(discover.blocked_by || discover.blockedBy),
      execution_hint: normalizeExecutionHint(discover.execution_hint || discover.executionHint),
      handoff_hint: discover.handoff_hint || discover.handoffHint || "",
      ready_reason: discover.ready_reason || discover.readyReason || "",
      milestones: explicitMilestones
        ? normalizeMilestones(discover.milestones, id)
        : featureMode === "upfront"
          ? renderDefaultMilestones(id, discover.title || id)
          : [],
      metric_summary: {
        duration_ms: "n/a",
        token_count: "n/a",
        cost: "n/a",
      },
    };
  });
}

function renderDefaultMilestones(featureId, title) {
  return [
    {
      id: `${featureId}-M01`,
      status: "planned",
      title: `${title} design and tests`,
    },
    {
      id: `${featureId}-M02`,
      status: "planned",
      title: `${title} implementation and validation`,
    },
  ];
}

function normalizeMilestones(milestones = [], featureId) {
  return milestones.map((milestone, index) => {
    const id = milestone.id || `${featureId}-M${String(index + 1).padStart(2, "0")}`;
    const normalized = {
      status: "planned",
      ...milestone,
      id,
      title: milestone.title || id,
    };
    return {
      ...normalized,
      slice_quality: milestone.slice_quality || assessRunnableVerticalSlice(normalized),
    };
  });
}

function validateQueueOperation(queue, operation = {}, options = {}) {
  if (!operation.type) {
    return "operation type is required";
  }

  if (["append", "insert"].includes(operation.type)) {
    const featureId = operation.feature?.id;
    if (!featureId) {
      return "feature id is required";
    }
    if (queue.features.some((feature) => feature.id === featureId)) {
      return `duplicate feature id: ${featureId}`;
    }
    if (operation.type === "insert") {
      const target = queue.features.find((feature) => feature.id === operation.target_id);
      if (!target) {
        return `target feature not found: ${operation.target_id}`;
      }
      if (!options.allow_protected && !isQueued(target)) {
        return `target feature is protected: ${operation.target_id}`;
      }
    }
    return null;
  }

  if (["move", "reprioritize", "pause", "update", "replace"].includes(operation.type)) {
    const featureId = operation.feature_id;
    const feature = queue.features.find((item) => item.id === featureId);
    if (!feature) {
      return `feature not found: ${featureId}`;
    }
    if (!options.allow_protected && ["move", "reprioritize"].includes(operation.type) && !isQueued(feature)) {
      return `cannot ${operation.type} protected ${feature.status} feature: ${featureId}`;
    }
    if (!options.allow_protected && operation.decompose_mode && !isQueued(feature)) {
      return `cannot change decompose_mode for protected ${feature.status} feature: ${featureId}`;
    }
    if (operation.type === "move") {
      const target = queue.features.find((item) => item.id === operation.target_id);
      if (!target) {
        return `target feature not found: ${operation.target_id}`;
      }
      if (!options.allow_protected && !isQueued(target)) {
        return `target feature is protected: ${operation.target_id}`;
      }
    }
    return null;
  }

  return `unsupported operation type: ${operation.type}`;
}

function mutateQueue(queue, operation) {
  if (operation.type === "append") {
    queue.features.push(normalizeInsertedFeature(queue, operation.feature));
    return;
  }

  if (operation.type === "insert") {
    const index = queue.features.findIndex((feature) => feature.id === operation.target_id);
    const offset = operation.position === "after" ? 1 : 0;
    queue.features.splice(index + offset, 0, normalizeInsertedFeature(queue, operation.feature));
    return;
  }

  if (operation.type === "move") {
    const index = queue.features.findIndex((feature) => feature.id === operation.feature_id);
    const [feature] = queue.features.splice(index, 1);
    const targetIndex = queue.features.findIndex((item) => item.id === operation.target_id);
    const offset = operation.position === "after" ? 1 : 0;
    queue.features.splice(targetIndex + offset, 0, feature);
    return;
  }

  const feature = queue.features.find((item) => item.id === operation.feature_id);
  if (operation.type === "reprioritize") {
    feature.priority = operation.priority;
    return;
  }
  if (operation.type === "pause") {
    feature.gate = "confirm";
    return;
  }
  if (operation.type === "update" || operation.type === "replace") {
    for (const key of ["title", "summary", "priority", "gate", "decompose_mode", "source"]) {
      if (Object.hasOwn(operation, key)) {
        feature[key] = operation[key];
      }
    }
  }
}

function normalizeInsertedFeature(queue, feature = {}) {
  const discover = normalizeDiscoverFeature(feature);
  const id = discover.id;
  return {
    id,
    title: discover.title || id,
    priority: discover.priority ?? nextPriority(queue.features),
    status: "queued",
    gate: discover.gate || queue.defaults?.default_gate || "auto",
    decompose_mode: discover.decompose_mode || queue.defaults?.decompose_mode || "upfront",
    source: discover.source || "insert",
    summary: discover.summary || discover.desired_effect || "",
    category: discover.category,
    workflow_kind: discover.workflow_kind,
    analysis_kind: discover.analysis_kind,
    desired_effect: discover.desired_effect,
    verification: discover.verification,
    test_profiles: normalizeTestProfileSelection(discover).profiles,
    depends_on: normalizeIdList(discover.depends_on || discover.dependsOn || discover.dependencies),
    unlocks: normalizeIdList(discover.unlocks),
    blocked_by: normalizeIdList(discover.blocked_by || discover.blockedBy),
    execution_hint: normalizeExecutionHint(discover.execution_hint || discover.executionHint),
    handoff_hint: discover.handoff_hint || discover.handoffHint || "",
    ready_reason: discover.ready_reason || discover.readyReason || "",
    milestones: Array.isArray(discover.milestones) ? normalizeMilestones(discover.milestones, id) : [],
    metric_summary: {
      duration_ms: fallbackMetric(discover.metric_summary?.duration_ms),
      token_count: fallbackMetric(discover.metric_summary?.token_count),
      cost: fallbackMetric(discover.metric_summary?.cost),
    },
  };
}

function nextPriority(features = []) {
  if (!features.length) {
    return 10;
  }
  return Math.max(...features.map((feature) => Number(feature.priority) || 0)) + 10;
}

function summarizeOperation(operation) {
  if (operation.type === "append") {
    return `append feature ${operation.feature.id}`;
  }
  if (operation.type === "insert") {
    return `insert feature ${operation.feature.id} ${operation.position || "before"} ${operation.target_id}`;
  }
  if (operation.type === "move") {
    return `move feature ${operation.feature_id} ${operation.position || "before"} ${operation.target_id}`;
  }
  if (operation.type === "reprioritize") {
    return `reprioritize feature ${operation.feature_id} to ${operation.priority}`;
  }
  if (operation.type === "pause") {
    return `pause feature ${operation.feature_id} with gate confirm`;
  }
  return `update feature ${operation.feature_id}`;
}

function summarizeQueue(queue) {
  return {
    current_feature: queue.current_feature || null,
    features: (queue.features || []).map((feature) => ({
      id: feature.id,
      priority: feature.priority,
      status: feature.status,
      gate: feature.gate,
      decompose_mode: feature.decompose_mode,
      milestone_count: feature.milestones?.length || 0,
    })),
  };
}

function isQueued(feature) {
  return feature.status === "queued" || feature.status === "decomposed";
}

function fallbackMetric(value) {
  return value === undefined || value === null ? "n/a" : value;
}

function clone(value) {
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function renderFeatureTable(features, mode, dag = resolveFeatureDagBoard({ features })) {
  const header = dag.visible
    ? "| Feature | Priority | Gate | Decompose | Status | Depends On | Ready | Hint | Milestones | Workflow | Analysis Kind | Category | Verification | Profiles |"
    : "| Feature | Priority | Gate | Decompose | Status | Milestones | Workflow | Analysis Kind | Category | Verification | Profiles |";
  const separator = dag.visible
    ? "|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|"
    : "|---|---:|---|---|---|---|---|---|---|---|---|";
  const lines = [
    `Batch decompose mode: ${mode}`,
    "",
    header,
    separator,
  ];
  const dagById = new Map(dag.features.map((feature) => [feature.id, feature]));
  for (const feature of features) {
    const dagFeature = dagById.get(feature.id) || feature;
    const milestones = feature.milestones.length
      ? feature.milestones.map((milestone) => {
          const quality = milestone.slice_quality?.status;
          return quality ? `${milestone.id} (${quality})` : milestone.id;
        }).join(", ")
      : "JIT decomposition pending";
    const verification = formatVerification(feature.verification);
    const profiles = feature.test_profiles?.length ? feature.test_profiles.join("+") : "preset-only";
    if (dag.visible) {
      lines.push(`| ${feature.id} ${feature.title} | ${feature.priority} | ${feature.gate} | ${feature.decompose_mode} | ${dagFeature.status} | ${formatList(dagFeature.depends_on)} | ${dagFeature.ready ? "yes" : "no"} | ${dagFeature.execution_hint || dagFeature.handoff_hint || "n/a"} | ${milestones} | ${feature.workflow_kind || "build"} | ${feature.analysis_kind || "n/a"} | ${feature.category || "other"} | ${verification} | ${profiles} |`);
    } else {
      lines.push(`| ${feature.id} ${feature.title} | ${feature.priority} | ${feature.gate} | ${feature.decompose_mode} | ${feature.status} | ${milestones} | ${feature.workflow_kind || "build"} | ${feature.analysis_kind || "n/a"} | ${feature.category || "other"} | ${verification} | ${profiles} |`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function formatMilestoneLabel(milestone = {}) {
  const id = milestone.id || milestone.name || "M";
  const title = milestone.title || milestone.summary || "";
  return formatCell(title ? `${id} ${title}` : id);
}

function formatCell(value) {
  if (Array.isArray(value)) return value.map((item) => String(item)).join("<br>");
  if (value && typeof value === "object") return Object.values(value).map((item) => String(item)).join("<br>");
  return String(value ?? "").replace(/\|/g, "\\|").trim();
}

function formatVerification(verification = {}) {
  const method = verification.method || "TBD";
  const parts = [method];
  if (verification.scenario) parts.push(`scenario: ${verification.scenario}`);
  if (verification.pass_signal) parts.push(`pass: ${verification.pass_signal}`);
  if (verification.independent_validator) parts.push(`validator: ${verification.independent_validator}`);
  if (verification.audit_policy?.reject_pseudo_tests) parts.push("audit: reject pseudo tests");
  return parts.join("<br>");
}

function collectMilestoneText(milestone) {
  const values = [
    milestone.id,
    milestone.title,
    milestone.summary,
    milestone.objective,
    milestone.implementation_scope,
    milestone.scope,
    milestone.test_spec,
    milestone.validation_commands,
    milestone.evidence,
    milestone.expected_artifacts,
  ];
  return flattenText(values).join(" ").toLowerCase();
}

function flattenText(values) {
  const output = [];
  for (const value of values) {
    if (!value) {
      continue;
    }
    if (Array.isArray(value)) {
      output.push(...flattenText(value));
      continue;
    }
    if (typeof value === "object") {
      output.push(...flattenText(Object.values(value)));
      continue;
    }
    output.push(String(value));
  }
  return output;
}

function detectSliceLayers(text) {
  const layerPatterns = [
    ["interface", /\b(cli|command|browser|page|ui|tui|dashboard|status output|user)\b/],
    ["core", /\b(core|helper|service|api|adapter|router|hook)\b/],
    ["state", /\b(state|persist|persistence|storage|database|db|ledger|yaml|schema)\b/],
    ["validation", /\b(test|validation|e2e|node --test|playwright|screenshot|before\/after|evidence)\b/],
  ];
  return layerPatterns
    .filter(([, pattern]) => pattern.test(text))
    .map(([layer]) => layer);
}

function hasRunnableValidation(milestone, text) {
  const commands = Array.isArray(milestone.validation_commands) ? milestone.validation_commands : [];
  const evidence = Array.isArray(milestone.evidence) ? milestone.evidence : [];
  return commands.some((command) => String(command).trim())
    || evidence.some((item) => String(item).trim())
    || /\b(node --test|npm test|playwright|e2e|real cli|before\/after|screenshot)\b/.test(text);
}

function hasClosedLoopValidation(milestone, text) {
  const commands = Array.isArray(milestone.validation_commands) ? milestone.validation_commands : [];
  const evidence = Array.isArray(milestone.evidence) ? milestone.evidence : [];
  const hasCommand = commands.some((command) => String(command).trim())
    || /\b(node --test|npm test|pnpm test|yarn test|pytest|go test|cargo test|playwright|cypress|real cli|validation script)\b/.test(text);
  const hasObservableEvidence = evidence.some((item) => String(item).trim())
    || /\b(before\/after|screenshot|dom assertion|status output|metric delta|stdout|stderr|exit code|report|observable)\b/.test(text);
  const hasChallengeSignal = /\b(failing|red|non-zero|assert|regression|error|failure|block|mismatch|delta|diff)\b/.test(text);
  return hasCommand && hasObservableEvidence && (hasChallengeSignal || (commands.length > 0 && evidence.length > 0));
}

function hasRunnableBehavior(text, hasValidation) {
  return /\b(user can|can run|run a|runs?|click|submit|see|writes?|reads?|updates?|creates?|end-to-end|runnable|command|workflow)\b/.test(text)
    && hasValidation;
}

function isHorizontalOnly(text, layers, runnableBehavior) {
  if (runnableBehavior) {
    return false;
  }
  const horizontalSignals = [
    /\bonly\b/,
    /\bseparately\b/,
    /\bschema\b/,
    /\bapi contracts?\b/,
    /\binterface only\b/,
    /\bui shell\b/,
    /\bskeleton\b/,
    /\bdocs-only\b/,
    /\bcore-only\b/,
  ];
  return horizontalSignals.some((pattern) => pattern.test(text)) || layers.length < 2;
}

function renderFeatureGraph(features, dag = resolveFeatureDagBoard({ features })) {
  const lines = ["graph TD"];
  for (const feature of features) {
    lines.push(`  ${sanitizeNode(feature.id)}["${feature.id}: ${escapeLabel(feature.title)}"]`);
    for (const milestone of feature.milestones) {
      lines.push(`  ${sanitizeNode(feature.id)} --> ${sanitizeNode(milestone.id)}["${milestone.id}: ${escapeLabel(milestone.title)}"]`);
    }
  }
  if (dag.visible) {
    for (const feature of dag.features) {
      for (const dependency of feature.depends_on) {
        lines.push(`  ${sanitizeNode(dependency)} --> ${sanitizeNode(feature.id)}`);
      }
    }
  } else {
    for (let index = 0; index < features.length - 1; index += 1) {
      lines.push(`  ${sanitizeNode(features[index].id)} -. next .-> ${sanitizeNode(features[index + 1].id)}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function normalizeDagFeatures(features = []) {
  return features.map((feature, index) => ({
    ...feature,
    id: String(feature.id || `F${String(index + 1).padStart(3, "0")}`),
    title: feature.title || feature.id || `F${String(index + 1).padStart(3, "0")}`,
    status: normalizeFeatureStatus(feature.status),
    gate: feature.gate || "auto",
    depends_on: normalizeIdList(feature.depends_on || feature.dependsOn || feature.dependencies),
    unlocks: normalizeIdList(feature.unlocks),
    blocked_by: normalizeIdList(feature.blocked_by || feature.blockedBy),
    execution_hint: normalizeExecutionHint(feature.execution_hint || feature.executionHint),
    handoff_hint: feature.handoff_hint || feature.handoffHint || "",
    ready_reason: feature.ready_reason || feature.readyReason || "",
  }));
}

function detectDependencyCycle(features = []) {
  const graph = new Map(features.map((feature) => [feature.id, feature.depends_on]));
  const visited = new Set();
  const visiting = new Set();
  const stack = [];

  function visit(id) {
    if (visiting.has(id)) {
      const index = stack.indexOf(id);
      return [...stack.slice(index), id];
    }
    if (visited.has(id) || !graph.has(id)) {
      return [];
    }
    visiting.add(id);
    stack.push(id);
    for (const dependency of graph.get(id)) {
      const cycle = visit(dependency);
      if (cycle.length) return cycle;
    }
    stack.pop();
    visiting.delete(id);
    visited.add(id);
    return [];
  }

  for (const feature of features) {
    const cycle = visit(feature.id);
    if (cycle.length) return cycle;
  }
  return [];
}

function shouldShowDag(features = []) {
  return features.length > 1 && features.some((feature) => feature.depends_on.length || feature.unlocks.length || feature.blocked_by.length || feature.execution_hint || feature.handoff_hint);
}

function isDoneFeature(feature) {
  return ["done", "completed"].includes(feature.status);
}

function isActiveFeature(feature) {
  return ["active", "running", "in_progress"].includes(feature.status);
}

function isRunnableQueueStatus(status) {
  return ["queued", "decomposed", "pending"].includes(status);
}

function normalizeFeatureStatus(value) {
  const normalized = String(value || "queued").trim().toLowerCase();
  if (normalized === "completed") return "done";
  if (normalized === "running" || normalized === "in-progress") return "active";
  if (["queued", "active", "decomposed", "done", "deferred", "blocked", "pending"].includes(normalized)) {
    return normalized;
  }
  return "queued";
}

function normalizeIdList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/[, ]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeExecutionHint(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["afk", "hitl", "parallel", "serial"].includes(normalized)) return normalized;
  return normalized;
}

function formatList(values = []) {
  return values.length ? values.join(", ") : "none";
}

function sanitizeNode(value) {
  return String(value).replace(/[^A-Za-z0-9_]/g, "_");
}

function escapeLabel(value) {
  return String(value).replace(/"/g, "'");
}
