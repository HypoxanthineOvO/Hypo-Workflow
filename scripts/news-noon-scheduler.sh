#!/usr/bin/env bash
set -Eeuo pipefail

export TZ="${TZ:-Asia/Shanghai}"
export PATH="${HOME}/.local/bin:${HOME}/.volta/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

WORKFLOW_ROOT="${1:-${HOME}/Hypo-Workflow}"
if [[ "${WORKFLOW_ROOT}" == "--help" || "${WORKFLOW_ROOT}" == "-h" ]]; then
  cat <<'EOF'
Usage: news-noon-scheduler.sh [workflow-root] [report-date]

Runs the noon AI news pipeline:
1. Hypo-Info-V2 refresh/digest/writer-news export.
2. Emit artifact.ready into the project-events ledger.
3. Route artifact.ready to Hypo-Writer local WeChat audit package generation.
4. Notify through Hypo-Claw QQ by default after the Writer issue is ready.

Environment:
  HYPO_INFO_ROOT       default ${HOME}/Hypo-Info-V2
  HYPO_WRITER_ROOT     default ${HOME}/Hypo-Writer
  HYPO_INFO_BASE_URL   default http://127.0.0.1:18000/api
  TOPIC                default ai-news
  LIMIT                default 30
  NEWS_NOON_NOTIFY     default true; set false/0 to disable QQ notification
  NEWS_NOON_CONFIRMED  default true; set false/0 to force notification gate failure

No WeChat draft is created and nothing is published.
EOF
  exit 0
fi
if [[ "${1:-}" == "--check" ]]; then
  test -x "${HYPO_INFO_ROOT:-${HOME}/Hypo-Info-V2}/scripts/refresh-today.sh"
  test -x "${HYPO_WRITER_ROOT:-${HOME}/Hypo-Writer}/node_modules/.bin/tsx" || test -x "${HYPO_WRITER_ROOT:-${HOME}/Hypo-Writer}/manager/node_modules/.bin/tsx" || true
  echo "news-noon-scheduler check ok"
  exit 0
fi
HYPO_INFO_ROOT="${HYPO_INFO_ROOT:-${HOME}/Hypo-Info-V2}"
HYPO_WRITER_ROOT="${HYPO_WRITER_ROOT:-${HOME}/Hypo-Writer}"
REPORT_DATE="${2:-$(date +%F)}"
TOPIC="${TOPIC:-ai-news}"
LIMIT="${LIMIT:-30}"
HYPO_INFO_BASE_URL="${HYPO_INFO_BASE_URL:-http://127.0.0.1:18000/api}"
NEWS_NOON_NOTIFY="${NEWS_NOON_NOTIFY:-true}"
NEWS_NOON_CONFIRMED="${NEWS_NOON_CONFIRMED:-true}"

RUN_ROOT="${HOME}/.hypo-workflow/maintenance/evidence/noon-news"
RUN_ID="noon-news-${REPORT_DATE}"
OUT_DIR="${RUN_ROOT}/${RUN_ID}"
LOG_FILE="${OUT_DIR}/scheduler.log"
LEDGER_FILE="${HOME}/.hypo-workflow/maintenance/ledger.yaml"
PROJECT_EVENTS_HOME="${PROJECT_EVENTS_HOME:-$HOME}"

mkdir -p "$OUT_DIR" "$(dirname "$LEDGER_FILE")"

exec > >(tee -a "$LOG_FILE") 2>&1

echo "[$(date -Is)] noon news scheduler start report_date=${REPORT_DATE}"
echo "workflow_root=${WORKFLOW_ROOT}"
echo "hypo_info_root=${HYPO_INFO_ROOT}"
echo "hypo_writer_root=${HYPO_WRITER_ROOT}"

cd "$HYPO_INFO_ROOT"
./scripts/refresh-today.sh "$REPORT_DATE"

INPUT_URL="${HYPO_INFO_BASE_URL}/exports/writer/news?topic=${TOPIC}&date=${REPORT_DATE}&limit=${LIMIT}"
ISSUE_OUT="${HYPO_WRITER_ROOT}/workspace/series/news-pipeline/issues/${TOPIC}/${REPORT_DATE}"
EMIT_OUTPUT="$(
  node "$WORKFLOW_ROOT/cli/bin/hypo-workflow" project-events emit \
    --home "$PROJECT_EVENTS_HOME" \
    --event-type artifact.ready \
    --source-project hypo-info-v2 \
    --target-project hypo-writer \
    --object-ref "$INPUT_URL" \
    --summary "Hypo-Info-V2 writer news artifact is ready for ${TOPIC} ${REPORT_DATE}." \
    --evidence-ref "$LOG_FILE" \
    --metadata topic="$TOPIC" \
    --metadata report_date="$REPORT_DATE" \
    --metadata input_url="$INPUT_URL" \
    --metadata hypo_info_base_url="$HYPO_INFO_BASE_URL"
)"
echo "$EMIT_OUTPUT"
ARTIFACT_EVENT_ID="$(printf '%s\n' "$EMIT_OUTPUT" | sed -n 's/.* id=\([^ ]*\) .*/\1/p' | tail -1)"
if [[ -z "$ARTIFACT_EVENT_ID" ]]; then
  echo "failed to parse artifact event id from project-events emit output" >&2
  exit 1
fi

ROUTE_FLAGS=()
if [[ "$NEWS_NOON_NOTIFY" != "0" && "$NEWS_NOON_NOTIFY" != "false" ]]; then
  ROUTE_FLAGS+=(--notify)
  if [[ "$NEWS_NOON_CONFIRMED" != "0" && "$NEWS_NOON_CONFIRMED" != "false" ]]; then
    ROUTE_FLAGS+=(--confirmed)
  fi
fi

node "$WORKFLOW_ROOT/cli/bin/hypo-workflow" project-events route \
  --home "$PROJECT_EVENTS_HOME" \
  --event-id "$ARTIFACT_EVENT_ID" \
  --route writer.news.issue \
  --topic "$TOPIC" \
  --input-url "$INPUT_URL" \
  --report-date "$REPORT_DATE" \
  --writer-root "$HYPO_WRITER_ROOT" \
  --issue-out "$ISSUE_OUT" \
  "${ROUTE_FLAGS[@]}"

SUMMARY_FILE="${OUT_DIR}/summary.md"
cat > "$SUMMARY_FILE" <<EOF
# Noon News Scheduler

- status: completed
- report_date: ${REPORT_DATE}
- topic: ${TOPIC}
- hypo_info_base_url: ${HYPO_INFO_BASE_URL}
- artifact_event: ${ARTIFACT_EVENT_ID}
- writer_issue: ${ISSUE_OUT}
- log: ${LOG_FILE}
- project_events_ledger: ${PROJECT_EVENTS_HOME}/.hypo-workflow/project-events/ledger.yaml
- remote_publish: false
- wechat_draft_created: false
- qq_notify_requested: ${NEWS_NOON_NOTIFY}
EOF

cat >> "$LEDGER_FILE" <<EOF
- id: ml-$(date +%Y%m%dT%H%M%S%z)-${RUN_ID}
  event_type: noon_news_generated
  status: completed
  timestamp: "$(date -Is)"
  actor: system
  object_ref: global:noon-news
  summary: "Noon AI news generated local Writer issue package for ${REPORT_DATE}."
  evidence_refs:
    - ${SUMMARY_FILE}
    - ${LOG_FILE}
    - ${ISSUE_OUT}
  metadata:
    topic: ${TOPIC}
    report_date: ${REPORT_DATE}
    remote_publish: false
    wechat_draft_created: false
    qq_notify_requested: ${NEWS_NOON_NOTIFY}
    artifact_event_id: ${ARTIFACT_EVENT_ID}
EOF

echo "[$(date -Is)] noon news scheduler complete out=${ISSUE_OUT}"
