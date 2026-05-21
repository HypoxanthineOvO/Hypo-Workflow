import { detectSecretLeaks, redactSecrets } from "../evidence/index.js";
import {
  CONSOLIDATION_SOURCE_KINDS,
  canonicalSourceKinds,
  discoverConsolidationSources,
  scrubConsolidationSecretMarkers,
} from "./session-sources.js";
import { stringifyYaml } from "../config/index.js";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  appendJsonlLedgerEntry,
  jsonlLedgerPathFor,
} from "../ledger/index.js";

const CANDIDATE_FIELDS = Object.freeze({
  knowledge: "knowledge_candidates",
  rule_habit: "rule_habit_candidates",
  template: "template_candidates",
  project_relation: "project_relation_candidates",
  infrastructure: "infrastructure_candidates",
});

const CANDIDATE_TITLES = Object.freeze({
  knowledge: "知识沉淀候选",
  rule_habit: "规则习惯候选",
  template: "模板沉淀候选",
  project_relation: "项目关系候选",
  infrastructure: "基础设施候选",
});

export function planGlobalConsolidationRun(input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const schedule = parseSchedule(input.schedule || "04:00 Asia/Shanghai");
  const sourceKinds = canonicalSourceKinds(input.source_kinds);
  const runId = input.run_id || `mr-global-consolidation-${compactDate(now)}`;

  const items = [
    item(runId, "discover_consolidation_sources", "local_read", sourceKinds, now),
    item(runId, "plan_historical_backfill_shards", "local_derived_write", sourceKinds, now),
    item(runId, "generate_global_consolidation_outputs", "local_derived_write", sourceKinds, now),
    item(runId, "project_consolidation_notion_dry_run", "local_derived_write", sourceKinds, now),
  ];

  return {
    run: redactSecrets({
      id: runId,
      kind: "maintenance_run",
      title: "Scheduled Global Consolidation",
      run_type: "global_consolidation",
      object_ref: "global:consolidation",
      initiated_by: "system",
      status: "planned",
      review_mode: "batch",
      schedule,
      initial_backfill_start: input.initial_backfill_start || "2026-03-01",
      source_kinds: sourceKinds,
      pipeline_runner: false,
      service_restart_required: false,
      remote_writes_enabled: false,
      created_at: now,
      updated_at: now,
      planned_items: items,
      evidence_refs: [],
    }),
    items,
  };
}

export async function runMaintenanceScheduler(input = {}, options = {}) {
  const now = options.now || input.now || new Date().toISOString();
  const homeDir = input.home_dir || process.env.HOME || ".";
  const maintenanceRoot = input.maintenance_root || join(homeDir, ".hypo-workflow", "maintenance");
  const schedule = input.schedule || "04:00 Asia/Shanghai";
  const sourceKinds = canonicalSourceKinds(input.source_kinds);
  const planned = planGlobalConsolidationRun({
    schedule,
    source_kinds: sourceKinds,
    initial_backfill_start: input.initial_backfill_start || "2026-03-01",
  }, { now });
  const runId = planned.run.id;
  const evidenceRoot = join(maintenanceRoot, "evidence", "global-consolidation");
  const evidencePaths = {
    run: join(evidenceRoot, `${runId}.yaml`),
    sources: join(evidenceRoot, `${runId}-sources.yaml`),
    backfill: join(evidenceRoot, `${runId}-backfill.yaml`),
    outputs: join(evidenceRoot, `${runId}-outputs.yaml`),
    notion_dry_run: join(evidenceRoot, `${runId}-notion-dry-run.yaml`),
  };

  if (input.mode && input.mode !== "dry-run") {
    return {
      ok: false,
      errors: ["maintenance scheduler only supports dry-run mode in this version"],
      scheduler: schedulerSummary(planned.run, "blocked", now),
      run: planned.run,
      evidence_paths: evidencePaths,
    };
  }

  const sources = input.sources || await discoverConsolidationSources({
    fixture_root: input.fixture_root,
    source_kinds: sourceKinds,
    safe_local_only: true,
  }, { now });
  const backfill = planHistoricalBackfillShards({
    source_kinds: sourceKinds,
    start_date: input.initial_backfill_start || "2026-03-01",
    end_date: input.backfill_end_date || localDate(now),
    granularity: input.backfill_granularity || "daily",
    timezone: planned.run.schedule.timezone,
  });
  const outputs = generateGlobalConsolidationOutputs({
    sources,
    run_id: runId,
    language: input.language || "zh-CN",
  }, { now });
  const notionProjection = projectConsolidationToNotionDryRun({
    outputs,
    notion: {
      target_ref: input.notion_target_ref || { page_id: "global-consolidation-dry-run" },
    },
  }, { now, dryRun: true });

  await writeYaml(evidencePaths.run, planned.run);
  await writeYaml(evidencePaths.sources, sources);
  await writeYaml(evidencePaths.backfill, backfill);
  await writeYaml(evidencePaths.outputs, outputs);
  await writeYaml(evidencePaths.notion_dry_run, notionProjection);
  const ledger = await appendSchedulerLedgerEvent(maintenanceRoot, {
    id: `ml-${compactTimestamp(now)}-${runId}-scheduled`,
    queue_item_id: null,
    object_ref: "global:consolidation",
    event_type: "global_consolidation_scheduled",
    status: "completed",
    timestamp: now,
    actor: "system",
    summary: "Daily 04:00 global consolidation scheduler created safe-local dry-run evidence.",
    evidence_refs: Object.values(evidencePaths),
    metadata: {
      run_id: runId,
      schedule: planned.run.schedule.expression,
      source_kinds: sourceKinds,
      remote_writes_enabled: false,
      apply_required: false,
    },
  });

  return redactSecrets({
    ok: true,
    errors: [],
    scheduler: schedulerSummary(planned.run, "completed", now),
    run: planned.run,
    items: planned.items,
    sources,
    backfill,
    outputs,
    notion_projection: notionProjection,
    evidence_paths: evidencePaths,
    ledger_path: ledger.path,
    ledger_event: ledger.event,
    cron: {
      install_hint: "0 4 * * * /path/to/Hypo-Workflow/scripts/maintenance-scheduler.sh /path/to/Hypo-Workflow",
      command: "hypo-workflow maintain-scheduler --dry-run",
    },
  });
}

export function planHistoricalBackfillShards(input = {}) {
  const sourceKinds = canonicalSourceKinds(input.source_kinds);
  const granularity = input.granularity === "weekly" ? "weekly" : "daily";
  const timezone = input.timezone || "Asia/Shanghai";
  const startDate = input.start_date || "2026-03-01";
  const endDate = input.end_date || todayDate();
  const stepDays = granularity === "weekly" ? 7 : 1;
  const shards = [];

  for (let current = parseUtcDate(startDate); current < parseUtcDate(endDate); current = addDays(current, stepDays)) {
    const shardStart = formatDate(current);
    const shardEnd = formatDate(minDate(addDays(current, stepDays), parseUtcDate(endDate)));
    const cursor = `${granularity}:${shardStart}:${sourceKinds.join(",")}`;
    shards.push({
      id: `global-consolidation-${granularity}-${shardStart}`,
      mode: "historical_backfill",
      status: "pending",
      granularity,
      start_date: shardStart,
      end_date: shardEnd,
      source_kinds: sourceKinds,
      cursor,
      resume_metadata: {
        timezone,
        cursor,
        source_kinds: sourceKinds,
        boundary: "start_inclusive_end_exclusive",
      },
    });
  }

  return {
    mode: "historical_backfill",
    initial_backfill_start: startDate,
    start_date: startDate,
    end_date: endDate,
    granularity,
    timezone,
    source_kinds: sourceKinds,
    boundary: "start_inclusive_end_exclusive",
    shards,
  };
}

export function buildConsolidationResumeState(input = {}, options = {}) {
  const completed = new Set(Array.isArray(input.completed_shard_ids) ? input.completed_shard_ids : []);
  const shards = Array.isArray(input.shards) ? input.shards : [];
  const next = shards.find((shard) => !completed.has(shard.id));
  return redactSecrets({
    run_id: input.run_id || null,
    status: next ? "active" : "completed",
    updated_at: options.now || new Date().toISOString(),
    next_shard_id: next?.id || null,
    cursor: next?.cursor || null,
    completed_shard_ids: shards.filter((shard) => completed.has(shard.id)).map((shard) => shard.id),
    last_record_refs: sanitizeRecordRefs(input.last_record_refs),
  });
}

export function generateGlobalConsolidationOutputs(input = {}, options = {}) {
  const language = input.language || "zh-CN";
  const records = flattenRecords(input.sources);
  const rawSecretSeen = detectSecretLeaks(input.sources).length > 0 || records.some((record) => record.sensitivity?.raw_secret_seen);
  const sensitivity = {
    raw_secret_seen: rawSecretSeen,
    raw_secret_recorded: false,
    classification: "redacted_internal",
  };
  const recordRefs = records.map((record) => record.source_ref).filter(Boolean);
  const createdAt = options.now || new Date().toISOString();

  const outputs = {
    run_id: input.run_id || null,
    language,
    generated_at: createdAt,
    summary: "知识、规则习惯、模板、项目关系、基础设施候选已生成，所有内容均已脱敏并等待人工复核。",
    redaction: {
      raw_secret_seen: rawSecretSeen,
      raw_secret_recorded: false,
      classification: "redacted_internal",
    },
    knowledge_candidates: [
      candidate("knowledge", "知识沉淀：维护运行结论", "聊天和页面记录显示，全局沉淀需要先完成脱敏，再生成可复核的知识候选。", recordRefs, sensitivity),
    ],
    rule_habit_candidates: [
      candidate("rule_habit", "规则习惯：先脱敏后沉淀", "全局沉淀输出必须保持 non-authoritative，进入 pending_review 后由人工决定是否采纳。", recordRefs, sensitivity),
    ],
    template_candidates: [
      candidate("template", "模板沉淀：每日 04:00 汇总", "每日 04:00 Asia/Shanghai 的系统维护运行应读取本地来源、生成中文摘要和五类候选。", recordRefs, sensitivity),
    ],
    project_relation_candidates: [
      candidate("project_relation", "项目关系：会话来源关联项目", "Codex、OpenCode、Claude 与 Notion 来源可作为项目关系候选的证据引用，但不直接写入权威关系。", recordRefs, sensitivity),
    ],
    infrastructure_candidates: [
      candidate("infrastructure", "基础设施：dry-run 与 cursor 边界", "调度、历史回填 cursor 和 Notion 投影都保持可恢复、可审阅，不触发服务重启或远程写入。", recordRefs, sensitivity),
    ],
  };

  return scrubConsolidationSecretMarkers(redactSecrets(outputs, {
    preservePaths: [/(\.|^)redaction(\.|$)/, /(\.|^)sensitivity(\.|$)/],
  }));
}

export function projectConsolidationToNotionDryRun(input = {}, options = {}) {
  const outputs = scrubConsolidationSecretMarkers(redactSecrets(input.outputs || {}));
  const targetRef = input.notion?.target_ref || null;
  const blocks = [
    notionBlock("heading_1", "知识沉淀"),
    notionBlock("paragraph", outputs.summary || "全局沉淀候选已生成。"),
    ...candidateBlocks("知识沉淀", outputs.knowledge_candidates),
    ...candidateBlocks("规则习惯", outputs.rule_habit_candidates),
    ...candidateBlocks("模板沉淀", outputs.template_candidates),
    ...candidateBlocks("项目关系", outputs.project_relation_candidates),
    ...candidateBlocks("基础设施", outputs.infrastructure_candidates),
  ];
  const operations = blocks.map((block, index) => ({
    action: "dry-run",
    target_ref: targetRef,
    index,
    block,
    side_effect: "local_derived_write",
  }));

  return scrubConsolidationSecretMarkers(redactSecrets({
    mode: "dry-run",
    dry_run: true,
    remote_writes_enabled: false,
    apply_required: false,
    generated_at: options.now || new Date().toISOString(),
    target_ref: targetRef,
    payload: { blocks },
    operations,
  }));
}

function item(runId, operation, sideEffect, sourceKinds, now) {
  return {
    id: `mq-${runId}-${operation}`,
    kind: "maintenance_operation",
    object_ref: "global:consolidation",
    operation,
    target_ref: "global:consolidation",
    scope: {
      run_id: runId,
      source_kinds: sourceKinds,
    },
    status: "planned",
    priority: "normal",
    side_effect: sideEffect,
    confirmation_required: false,
    dependencies: [],
    policy_refs: ["global-consolidation-safe-local-only"],
    evidence_refs: [],
    created_at: now,
    updated_at: now,
  };
}

function candidate(type, title, summary, recordRefs, sensitivity) {
  return {
    id: `gcc-${type}`,
    type,
    title,
    summary,
    language: "zh-CN",
    authority: "non_authoritative",
    authoritative: false,
    status: "pending_review",
    source_record_refs: recordRefs,
    sensitivity,
    review_required_reason: "全局沉淀候选不是权威记录，必须人工复核后才能采纳。",
  };
}

function candidateBlocks(label, candidates = []) {
  const items = Array.isArray(candidates) ? candidates : [];
  return [
    notionBlock("heading_2", label),
    ...items.map((candidate) => notionBlock("paragraph", `${candidate.title || CANDIDATE_TITLES[candidate.type] || label}：${candidate.summary || ""}`)),
  ];
}

function notionBlock(type, text) {
  return {
    type,
    text: String(text || ""),
  };
}

function parseSchedule(value) {
  const match = /^(\d{2}:\d{2})\s+(.+)$/.exec(String(value || "").trim());
  return {
    local_time: match ? match[1] : "04:00",
    timezone: match ? match[2] : "Asia/Shanghai",
    expression: match ? `${match[1]} ${match[2]}` : "04:00 Asia/Shanghai",
  };
}

function schedulerSummary(run, status, now) {
  return {
    kind: "maintenance_scheduler",
    status,
    run_id: run.id,
    run_type: run.run_type,
    schedule: run.schedule,
    timezone: run.schedule?.timezone || "Asia/Shanghai",
    triggered_at: now,
    safe_local_only: true,
    pipeline_runner: false,
    remote_writes_enabled: false,
    apply_required: false,
  };
}

async function writeYaml(file, value) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${stringifyYaml(value).trimEnd()}\n`, "utf8");
}

function localDate(value) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value || ""));
  return match ? match[1] : todayDate();
}

async function appendSchedulerLedgerEvent(root, event) {
  const sanitized = redactSecrets(event);
  const appended = await appendJsonlLedgerEntry(jsonlLedgerPathFor(join(root, "ledger.jsonl")), sanitized);
  return { path: appended.path, event: sanitized, ledger: appended.ledger };
}

function flattenRecords(sources) {
  const sourceList = Array.isArray(sources?.sources) ? sources.sources : Array.isArray(sources) ? sources : [];
  return sourceList.flatMap((source) => Array.isArray(source.records) ? source.records : []);
}

function sanitizeRecordRefs(value = {}) {
  const result = {};
  for (const kind of CONSOLIDATION_SOURCE_KINDS) {
    if (typeof value[kind] === "string") result[kind] = value[kind];
  }
  return result;
}

function compactDate(value) {
  return String(value).slice(0, 10).replace(/-/g, "");
}

function compactTimestamp(value) {
  return String(value || new Date().toISOString()).replace(/[-:]/g, "").replace(/\..*$/, "").replace(/[^\dT]/g, "");
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseUtcDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) throw new Error(`Invalid date: ${value}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function minDate(first, second) {
  return first.getTime() <= second.getTime() ? first : second;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}
