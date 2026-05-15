# Config Spec

Use this reference whenever a command needs Hypo-Workflow configuration defaults.

## Files

| Layer | Path | Owner | Purpose |
|---|---|---|---|
| Global | `~/.hypo-workflow/config.yaml` | `/hypo-workflow:setup` | Agent platform, default execution mode, subagent backend, dashboard defaults, plan defaults, output defaults, watchdog defaults, history import defaults, compact defaults, showcase defaults, rules defaults |
| Project | `.pipeline/config.yaml` | `/hypo-workflow:init` or `/hypo-workflow:plan-generate` | Project name, prompt source/output, reports, preset, evaluation rules, project-specific overrides |

`setup` must never create project config. `init` and `plan-generate` must not overwrite global config.

## Priority

Resolve every configurable value in this order:

1. project config
2. global config
3. built-in default

## Field Mapping

| Effective value | Project key | Global key | Default |
|---|---|---|---|
| agent platform | `platform` | `agent.platform` | `auto` |
| Cycle-scoped workflow kind | `.pipeline/cycle.yaml cycle.workflow_kind` | n/a | project `default_workflow_kind`, then `build` |
| project default workflow kind | `default_workflow_kind` | n/a | `build` |
| execution mode | `execution.mode` | `execution.default_mode` | `self` |
| subagent provider | `execution.subagent_tool` | `subagent.provider` | `auto` |
| worker separation mode | `execution.worker_separation.mode` | `execution.worker_separation.mode` | `recommended` |
| model pool plan role | `model_pool.roles.plan` | `model_pool.roles.plan` | `primary=deepseek-v4-pro`, fallback `deepseek-v4-pro` |
| model pool implement role | `model_pool.roles.implement` | `model_pool.roles.implement` | `primary=mimo-v2.5-pro`, fallback `deepseek-v4-pro`, `mimo-v2.5-pro` |
| model pool review role | `model_pool.roles.review` | `model_pool.roles.review` | `primary=deepseek-v4-pro`, fallback `deepseek-v4-pro` |
| model pool evaluate role | `model_pool.roles.evaluate` | `model_pool.roles.evaluate` | `primary=deepseek-v4-flash`, fallback `deepseek-v4-pro` |
| model pool chat role | `model_pool.roles.chat` | `model_pool.roles.chat` | `primary=deepseek-v4-pro`, fallback `deepseek-v4-pro` |
| acceptance mode | `acceptance.mode` | `acceptance.mode` | `auto` |
| acceptance user confirm | `acceptance.require_user_confirm` | `acceptance.require_user_confirm` | `false` |
| acceptance timeout hours | `acceptance.timeout_hours` | `acceptance.timeout_hours` | `72` |
| rejection escalation threshold | `acceptance.reject_escalation_threshold` | `acceptance.reject_escalation_threshold` | `3` |
| automation level | `automation.level` | `automation.level` | `balanced` |
| automation planning gate | `automation.gates.planning` | `automation.gates.planning` | `confirm` |
| automation execution gate | `automation.gates.execution` | `automation.gates.execution` | `auto` |
| automation destructive/external gate | `automation.gates.destructive_external` | `automation.gates.destructive_external` | `confirm` |
| automation release publish gate | `automation.gates.release_publish` | `automation.gates.release_publish` | `confirm` |
| automation local whitelist | `automation.local_whitelist` | `automation.local_whitelist` | local test actions allowed when whitelisted; external remains `confirm` |
| P0 Configure stage | `cycle.configure.stage` | `cycle.configure.stage` | `P0 Configure` |
| P0 Configure trigger | `cycle.configure.trigger` | `cycle.configure.trigger` | `cycle_new_before_discover` |
| P0 Configure reuse | `cycle.configure.allow_reuse` | `cycle.configure.allow_reuse` | `true` |
| plan mode | `plan.mode` | `plan.default_mode` | `interactive` |
| plan interaction depth | `plan.interaction_depth` | `plan.interaction_depth` | `medium` |
| plan interactive min rounds | `plan.interactive.min_rounds` | `plan.interactive.min_rounds` | `3` |
| plan explicit confirm | `plan.interactive.require_explicit_confirm` | `plan.interactive.require_explicit_confirm` | `true` |
| dashboard enabled | `dashboard.enabled` | `dashboard.enabled` | `false` |
| dashboard port | `dashboard.port` | `dashboard.port` | `7700` |
| output language | `output.language` | `output.language` | `zh-CN` |
| output timezone | `output.timezone` | `output.timezone` | `Asia/Shanghai` |
| watchdog enabled | `watchdog.enabled` | `watchdog.enabled` | `false` |
| watchdog interval | `watchdog.interval` | `watchdog.interval` | `300` |

Acceptance modes are:

- `auto`: keep unattended flow; acceptance is automatically satisfied at the end of the relevant workflow.
- `manual`: stop at `pending_acceptance` until `/hw:accept` or `/hw:reject`.
- `timeout`: expose a deterministic status decision after `acceptance.timeout_hours`; no background runner mutates state.
- `confirm`: legacy compatibility alias for manual user confirmation.

`acceptance.reject_escalation_threshold` controls when repeated Patch rejections should recommend escalation to a Cycle.

Automation levels are stable internal keys with Chinese UI labels:

- `manual` / 稳妥模式: ask more often; suitable for high-risk or exploratory work.
- `balanced` / 自动模式: automatically continue ordinary execution while preserving planning and high-risk gates.
- `full` / 全自动模式: continue as much as possible except planning confirmation and dangerous external side effects.

Hard gates are never downgraded by automation level:

- `automation.gates.planning=confirm` is mandatory for P2 milestone split and P4 final plan confirmation.
- `automation.gates.destructive_external=confirm` is mandatory for destructive or external side effects.
- `automation.gates.release_publish=confirm` is the default for tag/push/publish operations unless a command receives explicit user confirmation.

Durable local test-operation whitelist:

- `automation.local_whitelist.safe_local.actions` covers local test helpers such as `start_dev_server`, `restart_dev_server`, `stop_dev_server`, `run_browser_e2e`, and `run_mock_service`.
- `automation.local_whitelist.stateful_local.actions` covers local but stateful test operations such as `reset_test_database`, `clear_test_cache`, and `delete_generated_test_artifacts`.
- `automation.local_whitelist.external.actions` records known external actions such as `remote_pr_write`, `publish_release`, and `write_real_api`, but the effective default remains `confirm`.
- `automation.local_whitelist.scenario_overrides` may allow an action only under a named scenario such as `test_profiles.webapp` or `/hw:start`.
- A user-approved local whitelist should prevent repeated prompts for the same local test action. It must not override destructive/external, release publish, PR/MR remote write, or real API write gates.

```yaml
automation:
  local_whitelist:
    safe_local:
      actions:
        - restart_dev_server
        - run_browser_e2e
    stateful_local:
      actions:
        - reset_test_database
    external:
      actions:
        - remote_pr_write
    scenario_overrides:
      test_profiles.webapp:
        - run_browser_e2e
```

Compatibility fields such as `evaluation.auto_continue`, `batch.auto_chain`, `batch.default_gate`, and `opencode.auto_continue` remain supported. Commands should resolve the explicit `automation.*` policy first, then use legacy fields as compatibility hints for ordinary execution gates only. They must not use legacy fields to skip planning, destructive/external, or release publish gates.

Codex delegation policy under `automation.codex` is instruction-level and runtime-level guidance:

- `prefer_subagents=true`: substantial Codex work should explicitly use Subagents when available.
- `separate_test_and_implementation=true`: testing/review should be separated from implementation where practical.
- `external_model_routing=false`: Codex Subagents are treated as Codex/GPT runtime workers; Hypo-Workflow must not require DeepSeek, Mimo, Claude, or other external model routing for Codex delegation.

`automation.quality_pass.proposer_challenger=true` enables the lightweight C7 proposer/challenger pattern. It is not a full debate framework.

## P0 Configure

`P0 Configure` is the Cycle-scoped setup stage that runs after `cycle new` and before `P1 Discover`. `/hw:guide`, `/hw:init`, and `/hw:plan` should route users through this stage before planning when the current Cycle has not yet recorded an explicit configure decision.

The stage asks about automation, Subagent authorization, acceptance mode, PR/MR remote write confirmation, full regression, analysis boundaries, and worker separation. Users may choose to reuse prior decisions, but the reuse must be auditable.

The inheritance order is `cycle_explicit -> previous_cycle_snapshot -> project_config -> global_config -> built_in_default`. Reused values should record source, value, timestamp, and any degraded-mode risk note so status and reports can explain why a Cycle used a setting.

Worker separation policy is project-local execution policy:

- `execution.worker_separation.mode=off`: preserve legacy behavior
- `execution.worker_separation.mode=recommended`: require distinct `test` and `implement` workers for role-sensitive work; objective subworker-unavailable evidence may justify `retry`, `deferred`, `stop`, or explicit downgrade to `off`, but it cannot be accepted as worker-separated completion. `audit` may degrade only with explicit evidence.
- `execution.worker_separation.mode=strict`: require implement/test/audit separation before full acceptance

Plan-time authorization is separate from the mode and is Codex-specific:

- On Codex, `/hw:plan` P1 Discover must ask for execution subworker authorization before P2 whenever persisted authorization scope for `/hw:start` and `/hw:resume` is missing, even if `execution.worker_separation.mode` is already `recommended` or `strict`.
- On Codex, `recommended` and `strict` require explicit execution subworker authorization for `/hw:start` and `/hw:resume`, or a persisted blocking gate that prevents execution before role-sensitive work.
- On Codex, if the user declines execution subworkers and explicitly confirms the fastest path, persist `execution.worker_separation.mode=off`; do not silently keep `recommended` or silently downgrade.
- On Codex, if authorization is missing, `/hw:start` and `/hw:resume` must stop and ask instead of degrading in place; downgrade to fast/off always requires explicit user confirmation.
- On Claude Code and OpenCode, no extra subworker authorization gate is required; Claude Code should record whether execution subworkers use `subcodex` or `subclaude`.
- Plan Generate should still write prompt-level subworker assignments before execution. Missing Codex authorization changes the assignment status to `blocked_until_authorized`; Missing Codex authorization must not remove the `test` / `implement` / `audit` role plan unless the user explicitly chose `execution.worker_separation.mode=off`. `review_tests` is a TDD step name owned by the `test` role, not a worker role.

Recommended project-local fields:

```yaml
execution:
  worker_separation:
    mode: recommended
    ask_on_init_or_first_plan: true
    authorization:
      status: authorized
      scope:
        - /hw:start
        - /hw:resume
      granted_by: user
      fallback_when_declined: block_start
      downgrade_requires_confirmation: true
    roles:
      implement: { required: true }
      test: { required: true }
      audit: { required: true }
    providers: {}
    backend:
      claude_code: subclaude
    degradation:
      allow_with_confirmation: true
      options:
        - continue_degraded
        - backfill_missing_roles
        - switch_provider_and_retry
        - cancel_execution
    acceptance:
      audit_can_block_acceptance: true
      audit_blocks_execution_by_default: false
    evidence:
      log_roles: true
      report_roles: true
```

Execution guidance:

- `implement`, `test`, and `audit` are distinct roles.
- in `recommended`, `implement` and `test` sharing one worker is blocking unless the runtime records objective unavailability such as `tool_unavailable`, `command_unavailable`, `platform_unsupported`, `capability_missing`, `permission_denied`, `spawn_failed`, or `exec_nonzero`
- in `recommended`, `audit` may degrade when unavailable, but the reason must be recorded explicitly
- `audit` may ask for re-test or re-implementation without blocking the whole execution by default.
- acceptance may still be blocked when audit marks coverage as insufficient.
- degraded mode should record missing roles, shared-worker collisions, and the explicit user decision.

## P0 Configure

`P0 Configure` is the Cycle-scoped setup gate that runs after `cycle new` and before `P1 Discover`. It exists so users can confirm the practical operating mode for the Cycle before requirement discovery starts.

The stage asks about automation, Subagent authorization, acceptance mode, PR/MR remote write policy, full regression, analysis boundaries, and worker separation.

Users may reuse prior settings. Reuse resolution must be auditable and should follow this order:

1. `cycle_explicit`
2. `previous_cycle_snapshot`
3. `project_config`
4. `global_config`
5. `built_in_default`

When reusing settings, record the chosen source, reused fields, timestamp, and any degraded worker-separation risk.

`/hw:init` asks for the project automation level in interactive contexts and writes the stable key to project config:

- 稳妥模式 (`manual`)
- 自动模式 (`balanced`)
- 全自动模式 (`full`)

Non-interactive init uses `balanced` unless `--automation manual|balanced|full` is supplied.

Workflow lifecycle policy is Cycle metadata. Project config may define `default_workflow_kind`, but every active Cycle should write `cycle.workflow_kind` during Plan Generate or Cycle start. Defaults are:

- `workflow_kind=build` -> `execution.steps.preset=tdd`
- `workflow_kind=analysis` -> `execution.steps.preset=analysis`
- `workflow_kind=showcase` -> `execution.steps.preset=implement-only`
- `lifecycle_policy.reject.default_action=needs_revision`
- `lifecycle_policy.accept.next=follow_up_plan` when a `cycle.continuations[]` follow-up plan exists, otherwise `complete`

`cycle.continuations[]` owns planned follow-up nodes; project config must not store live continuation state.
| watchdog heartbeat timeout | `watchdog.heartbeat_timeout` | `watchdog.heartbeat_timeout` | `300` |
| history import split method | `history_import.split_method` | `history_import.split_method` | `auto` |
| history import time gap | `history_import.time_gap_threshold` | `history_import.time_gap_threshold` | `24h` |
| history import max milestones | `history_import.max_milestones` | `history_import.max_milestones` | `20` |
| history import keyword patterns | `history_import.keyword_patterns` | `history_import.keyword_patterns` | built-in V8.1 patterns |
| compact auto generation | `compact.auto` | `compact.auto` | `true` |
| compact recent progress lines | `compact.progress_recent` | `compact.progress_recent` | `15` |
| compact full state history | `compact.state_history_full` | `compact.state_history_full` | `1` |
| compact recent log events | `compact.log_recent` | `compact.log_recent` | `20` |
| compact report summary lines | `compact.reports_summary_lines` | `compact.reports_summary_lines` | `3` |
| compact end-of-run refresh | `compact.end_of_run` | `compact.end_of_run` | `true` |
| compact refresh policy | `compact.refresh_policy` | `compact.refresh_policy` | `dirty_only` |
| knowledge enabled | `knowledge.enabled` | `knowledge.enabled` | `true` |
| knowledge SessionStart loading | `knowledge.loading.session_start` | `knowledge.loading.session_start` | `true` |
| knowledge compact loading | `knowledge.loading.compact` | `knowledge.loading.compact` | `true` |
| knowledge index loading | `knowledge.loading.indexes` | `knowledge.loading.indexes` | `dependencies`, `references`, `pitfalls`, `decisions`, `config-notes`, `secret-refs` |
| knowledge raw record loading | `knowledge.loading.records` | `knowledge.loading.records` | `false` |
| knowledge redaction keys | `knowledge.redaction.secret_keys` | `knowledge.redaction.secret_keys` | `api_key`, `token`, `secret`, `password`, `authorization`, `access_token`, `refresh_token`, `client_secret` |
| knowledge invalid record strictness | `knowledge.strictness.invalid_record` | `knowledge.strictness.invalid_record` | `warn` |
| sync project registry | `sync.project_registry` | `sync.project_registry` | `~/.hypo-workflow/projects.yaml` |
| sync register projects | `sync.register_projects` | `sync.register_projects` | `true` |
| sync OpenCode profile | `sync.platforms.opencode.profile` | `sync.platforms.opencode.profile` | `standard` |
| sync OpenCode auto-continue mode | `sync.platforms.opencode.auto_continue_mode` | `sync.platforms.opencode.auto_continue_mode` | `safe` |
| showcase language | `showcase.language` | `showcase.language` | `auto` |
| showcase poster API key env | `showcase.poster.api_key_env` | `showcase.poster.api_key_env` | `OPENAI_API_KEY` |
| showcase poster size | `showcase.poster.size` | `showcase.poster.size` | `1024x1536` |
| showcase poster quality | `showcase.poster.quality` | `showcase.poster.quality` | `high` |
| showcase poster style | `showcase.poster.style` | `showcase.poster.style` | `auto` |
| release README mode | `release.readme.mode` | `release.readme.mode` | `loose` |
| release README full regeneration | `release.readme.full_regen` | `release.readme.full_regen` | `auto` |
| batch decompose mode | `batch.decompose_mode` | `batch.decompose_mode` | `upfront` |
| batch failure policy | `batch.failure_policy` | `batch.failure_policy` | `skip_defer` |
| batch auto-chain | `batch.auto_chain` | `batch.auto_chain` | `true` |
| batch default gate | `batch.default_gate` | `batch.default_gate` | `auto` |
| workflow kind | plan/discover artifact `workflow_kind` | n/a | `build` |
| analysis kind | plan/discover artifact `analysis_kind` | n/a | `root_cause` when workflow is analysis |
| analysis interaction mode | `execution.analysis.interaction_mode` | `execution.analysis.interaction_mode` | `hybrid` |
| analysis code-change boundary | `execution.analysis.boundaries.code_changes` | `execution.analysis.boundaries.code_changes` | `manual=deny`, `hybrid=confirm`, `auto=allow` |
| analysis service restart boundary | `execution.analysis.boundaries.restart_services` | `execution.analysis.boundaries.restart_services` | `confirm` |
| analysis system dependency boundary | `execution.analysis.boundaries.install_system_dependencies` | `execution.analysis.boundaries.install_system_dependencies` | `ask` |
| analysis network/remote boundary | `execution.analysis.boundaries.network_remote_resources` | `execution.analysis.boundaries.network_remote_resources` | `manual=ask`, `hybrid=ask`, `auto=allow` |
| analysis destructive/external boundary | `execution.analysis.boundaries.destructive_or_external_side_effects` | `execution.analysis.boundaries.destructive_or_external_side_effects` | `ask` |
| OpenCode auto-continue | `opencode.auto_continue` | `opencode.auto_continue` | `true` |
| OpenCode profile | `opencode.profile` | `opencode.profile` | `standard` |
| OpenCode providers | `opencode.providers` | `opencode.providers` | placeholders for Opus 4.6, MiMo V2.5 Pro/Flash, DeepSeek V4 Pro/Flash |
| OpenCode compaction target | `opencode.compaction.effective_context_target` | `opencode.compaction.effective_context_target` | `900000` |
| OpenCode plan model | `opencode.agents.plan.model` | `opencode.agents.plan.model` | `deepseek-v4-pro` |
| OpenCode compact model | `opencode.agents.compact.model` | `opencode.agents.compact.model` | `deepseek-v4-flash` |
| OpenCode test model | `opencode.agents.test.model` | `opencode.agents.test.model` | `deepseek-v4-pro` |
| OpenCode code-a model | `opencode.agents.code-a.model` | `opencode.agents.code-a.model` | `mimo-v2.5-pro` |
| OpenCode code-b model | `opencode.agents.code-b.model` | `opencode.agents.code-b.model` | `deepseek-v4-pro` |
| OpenCode debug model | `opencode.agents.debug.model` | `opencode.agents.debug.model` | `deepseek-v4-pro` |
| OpenCode docs model | `opencode.agents.docs.model` | `opencode.agents.docs.model` | `deepseek-v4-pro` |
| OpenCode report model | `opencode.agents.report.model` | `opencode.agents.report.model` | `deepseek-v4-flash` |
| test profile enabled | `execution.test_profiles.enabled` | `execution.test_profiles.enabled` | `true` |
| test profile selection mode | `execution.test_profiles.selection` | `execution.test_profiles.selection` | `auto` |
| test profile compose | `execution.test_profiles.compose` | `execution.test_profiles.compose` | `true` |
| test profile defaults | `execution.test_profiles.profiles` | `execution.test_profiles.profiles` | `[]` |
| rules extends | `rules.extends` or `.pipeline/rules.yaml extends` | `rules.extends` | `recommended` |
| rules overrides | `rules.rules` or `.pipeline/rules.yaml rules` | `rules.rules` | `{}` |

Normalize global `agent.platform=claude-code` to the runtime platform value `claude` when applying existing project-platform logic.

## Model Pool And OpenCode Matrix

`model_pool.roles` is the global role-first model contract. OpenCode agent files are derived from it unless `opencode.agents.<role>.model` explicitly overrides a generated role:

| Model pool role | OpenCode agent slots |
|---|---|
| `plan` | `hw-plan` |
| `implement` | `hw-build`, `hw-code-a`, `hw-code-b` |
| `review` | `hw-review`, `hw-debug`, `hw-docs` |
| `evaluate` | `hw-test`, `hw-report`, `hw-compact` |
| `chat` | reserved for Chat Mode defaults |

The helper must keep OpenCode private model matrix data in `.opencode/hypo-workflow.json`, not root `opencode.json`.

## Lazy Global Migration

Existing `~/.hypo-workflow/config.yaml` files are read without mutation. Migration helpers may produce the merged v10 shape in memory, but only an explicit save path may rewrite the file.

On save:

1. create `config.yaml.bak.<timestamp>`
2. preserve existing `profiles`
3. migrate old `opencode.agents` defaults into `model_pool.roles`
4. write the current schema version

## Project Registry

`~/.hypo-workflow/projects.yaml` stores setup-time project summaries for the global TUI and project switcher. `init-project` registers projects automatically when `sync.register_projects=true`.

Registry entries include stable project ID, display name, absolute path, platform, profile, current Cycle, pipeline status, open patch count, acceptance mode/state, and `updated_at`.

## Config TUI Editing Contract

The global TUI may edit configuration, but it is a configuration manager, not a workflow action center.

Targets must be explicit:

| Target | File | Scope |
|---|---|---|
| Global defaults | `~/.hypo-workflow/config.yaml` | User-level defaults for future and current projects |
| Current project | `.pipeline/config.yaml` | Project-local overrides only |

The TUI edit helper must:

- present global and project targets separately before staging changes
- stage edits into an in-memory proposal first
- show a field-level diff before writing
- validate edited fields against the supported schema subset before writing
- require explicit confirmation for every write
- write only the selected target config file
- never write `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, or `.pipeline/rules.yaml`
- report adapter-affecting edits such as platform, model matrix, sync, or OpenCode fields with guidance to run `/hw:sync --light`

Supported editable domains are platform, model/model pool, approval and acceptance defaults, automation level/gates, plan mode, interaction depth, watchdog, compact, sync, docs/release automation, lifecycle defaults, output language/timezone, OpenCode agent matrix, and subagent defaults.

The C5 TUI must not dispatch start/resume/accept/reject/sync/repair actions. Those remain explicit `/hw:*` commands.

For step-specific delegation, resolve in this order:

1. top-level `step_overrides.<step_name>.subagent_tool`
2. top-level `step_overrides.<step_name>.subagent`
3. legacy `execution.step_overrides.<step_name>.subagent_tool`
4. legacy `execution.step_overrides.<step_name>.subagent`
5. project `execution.subagent_tool`
6. global `subagent.provider`
7. `auto`

For step executor selection, accept both `executor` and the older `reviewer` field:

- `executor: self | subagent`
- `reviewer: self | subagent`

When both appear, `executor` wins.

## Global Config Shape

```yaml
agent:
  platform: claude-code
  model: claude-sonnet-4-20250514
execution:
  default_mode: self
  analysis:
    interaction_mode: hybrid
    boundaries:
      code_changes:
        manual: deny
        hybrid: confirm
        auto: allow
      restart_services: confirm
      install_system_dependencies: ask
      network_remote_resources:
        manual: ask
        hybrid: ask
        auto: allow
      destructive_or_external_side_effects: ask
  test_profiles:
    enabled: true
    selection: auto
    compose: true
    profiles: []
subagent:
  provider: codex
  codex:
    model: gpt-5.4
    base_url: https://api.vsplab.cn
  claude:
    model: claude-sonnet-4-20250514
model_pool:
  roles:
    plan:
      primary: deepseek-v4-pro
      fallback: [deepseek-v4-pro]
    implement:
      primary: mimo-v2.5-pro
      fallback: [deepseek-v4-pro, mimo-v2.5-pro]
    review:
      primary: deepseek-v4-pro
      fallback: [deepseek-v4-pro]
    evaluate:
      primary: deepseek-v4-flash
      fallback: [deepseek-v4-pro]
    chat:
      primary: deepseek-v4-pro
      fallback: [deepseek-v4-pro]
acceptance:
  mode: auto
  require_user_confirm: false
  default_state: pending
  timeout_hours: 72
  reject_escalation_threshold: 3
dashboard:
  enabled: true
  port: 7700
plan:
  default_mode: interactive
  interaction_depth: medium
  interactive:
    min_rounds: 3
    require_explicit_confirm: true
output:
  language: zh-CN
  timezone: Asia/Shanghai
watchdog:
  enabled: false
  interval: 300
  heartbeat_timeout: 300
  max_retries: 5
  max_consecutive_milestones: 10
  notify: true
history_import:
  split_method: auto
  time_gap_threshold: 24h
  max_milestones: 20
  keyword_patterns:
    - 'feat\(M(\d+)\):'
    - 'M(\d+)-'
    - 'milestone-(\d+)'
compact:
  auto: true
  progress_recent: 15
  state_history_full: 1
  log_recent: 20
  reports_summary_lines: 3
knowledge:
  enabled: true
  root: .pipeline/knowledge
  loading:
    session_start: true
    compact: true
    indexes:
      - dependencies
      - references
      - pitfalls
      - decisions
      - config-notes
      - secret-refs
    records: false
  compaction:
    auto: true
    max_records_per_category: 50
    compact_file: .pipeline/knowledge/knowledge.compact.md
  redaction:
    enabled: true
    replacement: "[REDACTED]"
    secret_keys:
      - api_key
      - token
      - secret
      - password
      - authorization
      - access_token
      - refresh_token
      - client_secret
  strictness:
    invalid_record: warn
    missing_index: warn
    secret_leak: error
sync:
  project_registry: ~/.hypo-workflow/projects.yaml
  register_projects: true
  platforms:
    opencode:
      profile: standard
      auto_continue: true
      auto_continue_mode: safe
showcase:
  language: auto
  poster:
    api_key_env: OPENAI_API_KEY
    size: "1024x1536"
    quality: high
    style: auto
release:
  readme:
    mode: loose
    full_regen: auto
batch:
  decompose_mode: upfront
  failure_policy: skip_defer
  auto_chain: true
  default_gate: auto
opencode:
  auto_continue: true
  profile: standard
  providers:
    anthropic:
      models:
        claude-opus-4.6:
          name: Claude Opus 4.6
    mimo:
      models:
        mimo-v2.5-pro:
          name: MiMo V2.5 Pro
        mimo-v2.5-flash:
          name: MiMo V2.5 Flash
    deepseek:
      models:
        deepseek-v4-pro:
          name: DeepSeek V4 Pro
        deepseek-v4-flash:
          name: DeepSeek V4 Flash
  compaction:
    effective_context_target: 900000
  agents:
    plan:
      model: deepseek-v4-pro
    compact:
      model: deepseek-v4-flash
    test:
      model: deepseek-v4-pro
    code-a:
      model: mimo-v2.5-pro
    code-b:
      model: deepseek-v4-pro
    debug:
      model: deepseek-v4-pro
    docs:
      model: deepseek-v4-pro
    report:
      model: deepseek-v4-flash
rules:
  extends: recommended
  rules: {}
version: "8.4.0"
created: "2026-04-26T14:00:00+08:00"
updated: "2026-04-26T14:00:00+08:00"
```

## Claude Code Adapter

`claude_code` is the first-class adapter contract for Claude Code. It complements the existing plugin Skill package; it does not replace the `/hw:*` skill namespace and does not turn Hypo-Workflow into a runner.

Contract keys include `settings.local_file` for the project-local settings merge target and `compact.inject_resume_context` for compact recovery.

Key defaults:

```yaml
claude_code:
  profile: standard
  settings:
    local_file: .claude/settings.local.json
    backup: true
    managed_marker: hypo-workflow
  hooks:
    stop:
      block_on_missing_state: true
      block_on_missing_log: true
      block_on_missing_progress: true
      block_on_missing_report: true
      warn_on_metrics_gap: true
      warn_on_derived_gap: true
    compact:
      inject_resume_context: true
    permission:
      follow_effective_config: true
  status:
    surface: auto
    fallback_order:
      - monitor
      - hw-status
      - session-summary
      - dashboard
  agents:
    docs:
      model: deepseek-v4-pro
    code:
      model: mimo-v2.5-pro
    test:
      model: mimo-v2.5-pro
    report:
      model: deepseek-v4-flash
    compact:
      model: deepseek-v4-flash
```

Safety profiles:

- `developer`: local developer profile; permissive, can allow destructive actions when the user explicitly chooses it.
- `standard`: published default; workflow automation can continue, but destructive or external side effects require confirmation.
- `strict`: team/CI profile; conservative permission and auto-continue behavior.

Model routing is declaration-first. Claude Code agents are derived from `model_pool.roles`, then refined by `claude_code.agents.*` overrides. The defaults keep docs on DeepSeek V4 Pro and code/test on Mimo V2.5 Pro for the C6 smoke path.

Generated Claude agent files live under `.claude/agents/hw-*.md`; `.claude/hypo-workflow-agents.json` records the resolved role-to-model map, dynamic selection hints, and any user-owned file conflicts.

Status surface configuration is read-only. `surface=auto` attempts monitor packaging when available, then falls back to `/hw:status`, hook-injected summaries, and dashboard guidance. The compact output should include milestone rows, current phase/next action, automation/profile basics, and recent events without raw secrets.

Watchdog recovery uses structured execution leases at `.pipeline/.lock`. A fresh lease blocks resume; an expired lease may be taken over with `lease_takeover` evidence. Platform-reported failures use `reported_failure`; heartbeat-only timeout uses `inferred_stall`.

`subagent.codex.base_url` is optional.

## Validation Notes

- Project config remains validated by the project schema at the root of `config.schema.yaml`.
- Global config is defined under `$defs.global_config` in the same schema file.
- A missing global config is valid; use built-in defaults.
- A malformed global config should be reported by `/hypo-workflow:check` but should not prevent reading project config.
- New V8 fields are optional and must not break older project configs.

## Rules Config

Rules may be declared in either `.pipeline/rules.yaml` or the optional `rules:` block of project/global config. `.pipeline/rules.yaml` is the primary project-local rules file and takes precedence for rule behavior.

```yaml
extends: recommended

rules:
  git-clean-check: error
  commit-format: off
  prefer-chinese-comments: warn
```

Supported built-in presets are `recommended`, `strict`, and `minimal`. External rule packs use string references such as `github:owner/repo`.

Supported execution step presets are `tdd`, `implement-only`, `custom`, and `analysis`.

Test Profiles live under `execution.test_profiles` so they stay close to `execution.steps.preset`. Preset controls step order; Test Profile controls validation policy. `analysis` is a preset, not a Test Profile.

Preset-aware evaluation may use build checks (`tests_pass`, `no_regressions`, `matches_plan`, `code_quality`) or analysis checks (`question_addressed`, `evidence_complete`, `conclusion_traceable`, `experiment_executed`, `change_validated`, `followup_recorded`). `change_validated` is not applicable unless code changed during analysis.
