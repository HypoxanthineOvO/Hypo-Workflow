/** @jsxImportSource @opentui/solid */
// Hypo-Workflow managed OpenCode TUI plugin scaffold.
// This plugin renders read-only workflow status into OpenCode TUI slots.
// It does not mutate .pipeline state or trigger workflow execution.

import type { TuiPlugin } from "@opencode-ai/plugin/tui";
import { createSignal, For } from "solid-js";
import { buildOpenCodeStatusModel } from "../runtime/hypo-workflow-status.js";

export const id = "hypo-workflow-status-panels";

function createDebouncedFn(fn: () => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; fn(); }, ms);
  };
}

// ─── Status Color Map ─────────────────────────────────────────────

const STATUS_FG: Record<string, string> = {
  active: "green", executing: "green", running: "green", in_progress: "green",
  done: "#888888", completed: "#888888", closed: "#888888",
  error: "red", failed: "red", blocked: "red", abandoned: "red",
  pending: "yellow", queued: "yellow", waiting: "yellow",
  paused: "blue", deferred: "blue",
  missing: "#666666", unknown: "#666666", idle: "#666666",
};

function getStatusColor(value: string): string {
  return STATUS_FG[value.toLowerCase().replace(/[-\s]+/g, "_")] || "white";
}

// ─── Section Title Colors ─────────────────────────────────────────

const SECTION_TITLE_COLORS: Record<string, string> = {
  Current: "cyan", Recovery: "red", Models: "magenta",
  "Feature Queue": "cyan", "Feature DAG": "cyan", Milestones: "green",
  "Blocked / Deferred": "yellow", "Derived Health": "blue",
  Metrics: "blue", Recent: "yellow", Warnings: "red",
};

// ─── Event Family Colors ──────────────────────────────────────────

const EVENT_FAMILY_COLORS: Record<string, string> = {
  milestone: "green", cycle: "cyan", patch: "yellow", feature: "blue",
  acceptance: "magenta", recovery: "red", audit: "cyan", debug: "yellow",
  release: "green", sync: "#888888",
};

// ─── Smart Collapse ───────────────────────────────────────────────

const SMART_COLLAPSE_THRESHOLD = { items: 4, chars: 200 };
const ALWAYS_EXPANDED = new Set(["Current", "Milestones"]);

// ─── Progress Bar ─────────────────────────────────────────────────

function ProgressBar(props: { completed: number; total: number }) {
  if (props.total === 0) return <span style={{ fg: "#666666" }}>[░░░░░░░░░░] 0% (0/0)</span>;
  const percent = Math.round((props.completed / props.total) * 100);
  const filled = Math.round((props.completed / props.total) * 10);
  const color = percent === 100 ? "green" : percent >= 50 ? "cyan" : "yellow";
  return <span style={{ fg: color }}>[{"█".repeat(filled)}{"░".repeat(10 - filled)}] {percent}% ({props.completed}/{props.total})</span>;
}

// ─── Colorized Item ───────────────────────────────────────────────

function ColorizedItem(props: { text: string }) {
  const parts: any[] = [];
  const regex = /\b(active|done|completed|error|failed|blocked|pending|queued|paused|deferred|missing|unknown|executing|idle|C\d+|M\d+|F\d+|P\d+)\b/gi;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(props.text)) !== null) {
    if (match.index > lastIndex) parts.push(<span>{props.text.slice(lastIndex, match.index)}</span>);
    const word = match[0];
    parts.push(<span style={{ fg: /^[CMFP]\d+/.test(word) ? "cyan" : getStatusColor(word) }}>{word}</span>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < props.text.length) parts.push(<span>{props.text.slice(lastIndex)}</span>);
  return <>{parts}</>;
}

// ─── Metrics Item ─────────────────────────────────────────────────

function MetricsItem(props: { text: string }) {
  const match = props.text.match(/^(\s*[-•]\s*)(.+?):\s*(.+)$/);
  if (!match) return <span>{props.text}</span>;
  const [, prefix, label, value] = match;
  let valueColor = "white";
  if (/token|cost|price|usd|\$/i.test(label)) valueColor = "yellow";
  else if (/duration|time|ms|seconds/i.test(label)) valueColor = "cyan";
  else if (/score|rating|grade/i.test(label)) valueColor = "green";
  return <><span style={{ fg: "#888888" }}>{prefix}</span><span style={{ fg: "white" }}>{label}: </span><span style={{ fg: valueColor }}>{value}</span></>;
}

// ─── Recent Event Item ────────────────────────────────────────────

function RecentEventItem(props: { text: string }) {
  const familyMatch = props.text.match(/\b(milestone|cycle|patch|feature|acceptance|recovery|audit|debug|release|sync)\b/i);
  const color = familyMatch ? EVENT_FAMILY_COLORS[familyMatch[1].toLowerCase()] || "#888888" : "white";
  const timeMatch = props.text.match(/^(\s*[-•]\s*)(\d{2}:\d{2})\s+(.+)$/);
  if (timeMatch) return <><span style={{ fg: "#888888" }}>{timeMatch[1]}{timeMatch[2]} </span><span style={{ fg: color }}>{timeMatch[3]}</span></>;
  return <span style={{ fg: color }}>{props.text}</span>;
}

function SectionItem(props: { text: string; sectionTitle: string }) {
  if (props.sectionTitle === "Metrics") return <MetricsItem text={props.text} />;
  if (props.sectionTitle === "Recent") return <RecentEventItem text={props.text} />;
  return <ColorizedItem text={props.text} />;
}

export const tui: TuiPlugin = async (api) => {
  const [model, setModel] = createSignal(await loadStatus(api));
  const [loading, setLoading] = createSignal(false);
  const [collapsed, setCollapsed] = createSignal<Set<string>>(new Set());
  let lastWarningKey = "";
  let lastCycleId = "";

  const applySmartCollapse = (m: any) => {
    const toCollapse = new Set<string>();
    for (const section of m.sidebar?.sections || []) {
      if (ALWAYS_EXPANDED.has(section.title)) continue;
      if (section.items.length > SMART_COLLAPSE_THRESHOLD.items || section.items.join("").length > SMART_COLLAPSE_THRESHOLD.chars)
        toCollapse.add(section.title);
    }
    if (toCollapse.size > 0) setCollapsed(toCollapse);
  };

  const toggleSection = (title: string) => setCollapsed((prev) => { const next = new Set(prev); if (next.has(title)) next.delete(title); else next.add(title); return next; });

  const doRefresh = async () => {
    const next = await loadStatus(api);
    setModel(next);
    applySmartCollapse(next);
    if (lastCycleId && next.cycle?.id !== lastCycleId) { setLoading(true); setTimeout(() => setLoading(false), 800); }
    lastCycleId = next.cycle?.id || "";
    const warningKey = next.warnings.join("\n");
    if (warningKey && warningKey !== lastWarningKey) { lastWarningKey = warningKey; api.ui.toast({ variant: "warning", message: `Hypo-Workflow: ${next.warnings[0]}` }); }
  };

  const refresh = createDebouncedFn(() => void doRefresh(), 150);
  const subscriptions = ["command.executed","tool.execute.after","permission.asked","permission.replied","todo.updated","session.idle","session.compacted","session.status","session.updated"].map((t) => api.event.on(t, () => refresh()));
  api.lifecycle.onDispose(() => { for (const u of subscriptions) u(); });
  applySmartCollapse(model());

  api.slots.register({
    id: "hypo-workflow-status-panels",
    slots: {
      sidebar_content() {
        const m = model(), c = collapsed();
        return (
          <text>
            <span style={{ fg: "cyan" }}>Hypo-Workflow</span>{"\n"}
            <span style={{ fg: "#888888" }}>{m.sidebar.summary}</span>{"\n"}
            <ProgressBar completed={m.progress?.completed || 0} total={m.progress?.total || 0} />{"\n\n"}
            <For each={m.sidebar.sections}>{(section: any) => {
              const isCollapsed = c.has(section.title);
              const titleColor = SECTION_TITLE_COLORS[section.title] || "cyan";
              return (<>
                <span style={{ fg: titleColor, bold: true }} on:mousedown={() => toggleSection(section.title)}>{section.title}</span>
                <span>:</span>
                {isCollapsed && <span style={{ fg: "#888888" }}> (+{section.items.length})</span>}
                {"\n"}
                {!isCollapsed && <For each={section.items}>{(item: string) => item ? <><span>- </span><SectionItem text={item} sectionTitle={section.title} />{"\n"}</> : <></>}</For>}
                {"\n"}
              </>);
            }}</For>
            {m.warnings.length > 0 && (<>
              <span style={{ fg: "red" }}>Warnings:</span>{"\n"}
              <For each={m.warnings.slice(0, 3)}>{(w: string) => <><span style={{ fg: "red" }}>- {w}</span>{"\n"}</>}</For>
            </>)}
          </text>
        );
      },
      sidebar_footer() {
        const m = model();
        return (<text><span style={{ fg: "cyan" }}>{m.cycle?.id || "C?"}</span>{" | "}<span>{m.feature?.id || "F?"}</span>{" | "}<span style={{ fg: "#888888" }}>{m.metrics?.duration_ms || "n/a"}</span>{" | "}<span>{m.recent_events[0]?.summary || "no recent event"}</span></text>);
      },
      home_footer() { return <text>{renderFooterText(model(), true)}</text>; },
      session_prompt_right() { return <text>{renderFooterText(model(), false)}</text>; },
    },
  });
};

export const HypoWorkflowTuiPlugin = tui;
export default { id, tui };

function renderFooterText(model: any, includeEvent: boolean): string {
  const parts: string[] = [model.footer?.text || ""];
  if (model.pipeline?.heartbeat) parts.push(`hb:${(String(model.pipeline.heartbeat).match(/T(\d{2}:\d{2})/) || [])[1] || ""}`);
  if (includeEvent && model.recent_events?.[0]?.summary) parts.push(model.recent_events[0].summary);
  return parts.join(" | ");
}

async function loadStatus(api: any) {
  const root = api.state?.path?.worktree || process.cwd();
  return buildOpenCodeStatusModel(root, { opencode: collectOpenCodeRuntime(api) });
}
function collectOpenCodeRuntime(api: any) {
  const sid = (api.route?.current?.name === "session" ? api.route.current.params?.sessionID || api.route.current.params?.session_id : undefined);
  const msgs = sid ? Array.from(api.state?.session?.messages?.(sid) || []) : [];
  return { current: latestMessageModel(msgs) || { agent: api.state?.config?.default_agent || "build", model: api.state?.config?.model }, active_subagent: latestSubtaskModel(api, msgs) };
}
function latestMessageModel(msgs: any[]) { for (const m of [...msgs].reverse()) { const fmt = formatModel(m.model || { providerID: m.providerID, modelID: m.modelID }); if (fmt || m.agent) return { agent: m.agent, model: fmt }; } return null; }
function latestSubtaskModel(api: any, msgs: any[]) { for (const m of [...msgs].reverse()) for (const p of Array.from(api.state?.part?.(m.id) || []).reverse()) if (p.type === "subtask") return { agent: p.agent, model: formatModel(p.model) }; return null; }
function formatModel(model: any): string | null { if (!model) return null; if (typeof model === "string") return model; return model.providerID && model.modelID ? `${model.providerID}/${model.modelID}` : null; }
