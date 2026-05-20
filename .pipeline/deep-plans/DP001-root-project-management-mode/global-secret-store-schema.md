# Global Secret Store Schema Final

生成时间：2026-05-18T20:10:47+08:00
最终确认：2026-05-18T21:13:55+08:00

范围：DR004 最终记录。根据用户回答，设计 Global Secret Store 的第一版能力边界和 schema。本报告只写 Deep Plan 本地产物，不创建真实 `~/.hypo-workflow/secrets.yaml`，不读取/复制任何 raw secret，不写 Notion。

## 当前结论

1. 第一版 raw secret store 使用 `~/.hypo-workflow/secrets.yaml`。
2. Secret 支持分层：global / workspace / project；global 层用于所有 Hypo 项目都可复用的 LLM API、Base URL、Notion token、微信公众号 token、Hypo-Claw API 信息等。
3. Agent 可以读取 raw secret，并且应该知道哪些 secret 可读、可用于哪些任务；这不是只读 reference store。
4. Agent 读取或迁移 raw secret 时应记录审计事件，但审计事件不得包含 raw value。
5. 允许迁移现有 secret，例如将当前存在于 Hypo-Claw 配置中的 Notion token 迁移到全局 store。
6. 允许 Agent 在迁移时复制 raw key，但迁移动作必须是显式维护操作，并写入审计记录。
7. `secrets.yaml` 本身可以保存 raw value；仓库、Notion、Knowledge、报告、diff、log、dry-run plan 仍不得持久化 raw value。
8. 第一版不加密 `secrets.yaml`；本地保护依赖文件权限，必须要求 `0600`。
9. Agent 在任务与 secret capability 匹配时可以自动读取 raw secret，不需要每次另行询问。
10. health check 默认使用真实 provider 调用，但只记录脱敏摘要和状态。
11. Hypo-Claw API 第一版允许通知、读状态、拉任务、同步报告，不限于任务完成通知。

第 7 点是边界校正：用户说这是个人使用，不需要全部 redaction；这可以理解为 `secrets.yaml` 内部不需要把 value redacted。但只要内容进入项目仓库、Notion、Knowledge、报告或日志，就会违反“raw key 不进入仓库/同步层”的前置硬约束，也会污染后续 Workflow artifact。第一版应把“Agent 可读可用”和“外部/可提交层不可泄漏”同时成立。

## 设计目标

Secret Store 不是密码本截图，也不是纯引用表。它要服务这些工作：

- 为未来任务直接提供 LLM API Key、Base URL、模型能力说明。
- 为 Notion 同步提供 Notion token 和 workspace/page 访问凭据。
- 为微信公众号、发布渠道、外部服务提供 token 和 endpoint。
- 为 Hypo-Claw 提供任务完成后的通知/沟通 API 信息。
- 让 Agent 能在任务中发现“我可以用哪个 secret 做什么”。
- 让 workspace / Notion / Knowledge 只看到可同步的 secret capability 和 reference，不看到 raw value。

## 第一版文件布局

```text
~/.hypo-workflow/
  secrets.yaml              # raw value authority, chmod 600
  secrets.audit.yaml        # read/migrate/health-check audit, no raw value
  workspace.yaml            # secret refs/capabilities projection, no raw value
```

后续可以拆分为：

```text
~/.hypo-workflow/secrets/
  secrets.yaml
  audit.yaml
  providers.yaml
```

但第一版建议先用单文件 `secrets.yaml`，避免过早复杂化。

## `secrets.yaml` Schema 草案

```yaml
schema_version: 1
store:
  id: hypoxanthine-local-secrets
  owner: local-user
  backend: yaml
  path: ~/.hypo-workflow/secrets.yaml
  encryption: none
  permissions: "0600"
  agent_access:
    raw_read: allowed
    raw_read_trigger: capability_match
    use_in_tasks: allowed
    echo_raw_value: denied
    persist_raw_value_outside_store: denied
  health_check:
    default: real_provider_call
    record_raw_request_or_response: denied
  updated_at: "2026-05-18T20:10:47+08:00"

secrets:
  - id: llm-primary
    title: Primary LLM API
    scope: global
    provider: openai-compatible
    kind: llm_api
    capabilities:
      - llm.chat
      - llm.embedding
    endpoint:
      base_url: https://api.example.com/v1
      api_key_header: Authorization
      auth_scheme: bearer
    value:
      api_key: "<raw key>"
    usage:
      default_env:
        OPENAI_BASE_URL: endpoint.base_url
        OPENAI_API_KEY: value.api_key
      allowed_for:
        - coding
        - research
        - sync
      dependent_projects:
        - hypo-workflow
    audit:
      read: true
      migrate: true
      health_check: true
    health:
      status: unknown
      checked_at: null

  - id: notion-main
    title: Main Notion Integration
    scope: workspace
    provider: notion
    kind: notion_token
    capabilities:
      - notion.read
      - notion.write
    value:
      token: "<raw token>"
    usage:
      dependent_projects:
        - hypo-workflow
        - hypo-claw
      sync_targets:
        - notion-hypo-projects
    audit:
      read: true
      migrate: true
      health_check: true
    health:
      status: unknown
      checked_at: null

  - id: hypo-claw-api
    title: Hypo-Claw API
    scope: global
    provider: hypo-claw
    kind: service_api
    capabilities:
      - notify.task_complete
      - notify.report_ready
      - status.read
      - task.pull
      - report.sync
    endpoint:
      base_url: https://claw.example.com
    value:
      api_key: "<raw key>"
    usage:
      allowed_for:
        - completion_notify
        - status_push
        - status_read
        - task_pull
        - report_sync
      dependent_projects:
        - hypo-workflow
        - hypo-claw
    audit:
      read: true
      migrate: true
      health_check: true
```

## Secret 类型 Taxonomy

| kind | 用途 | 典型字段 |
|---|---|---|
| `llm_api` | LLM / OpenAI-compatible API | `base_url`、`api_key`、model/capability hint |
| `notion_token` | Notion workspace/page/database 访问 | `token`、workspace/page refs、capabilities |
| `wechat_official_account` | 微信公众号发布/管理 | `app_id`、`app_secret`、token、endpoint |
| `service_api` | Hypo-Claw / 自建服务 / webhook | `base_url`、`api_key`、headers、capabilities |
| `oauth_app` | OAuth client | `client_id`、`client_secret`、redirect info |
| `webhook` | 通知/发布 webhook | `url`、secret、method、headers |
| `database` | 数据库连接 | `dsn`、user、password、host、database |

## Scope 分层

| scope | 含义 | 示例 |
|---|---|---|
| `global` | 所有 Hypo 项目默认可发现/可用 | LLM API、Hypo-Claw notify API |
| `workspace` | 当前 Global Workspace 可用 | Notion integration、Hypo Projects sync target |
| `project` | 只给某些项目用 | 某项目发布 token、测试环境 API |
| `domain` | 某类任务可用 | writing、research、sync、release |

第一版允许一个 secret 同时通过 `usage.dependent_projects` 和 `usage.allowed_for` 限定范围。

## Agent 读取规则

| 动作 | 第一版策略 |
|---|---|
| 发现 secret 列表和 capabilities | 允许；可进入 workspace projection，但无 raw value。 |
| 读取 raw value 执行任务 | 允许；当任务匹配 `capabilities` / `usage.allowed_for` 时可自动读取。 |
| 在命令环境中注入 env | 允许；仅用于当前进程。 |
| 输出 raw value 给用户可见文本 | 禁止，除非用户明确要求显示某个 secret。 |
| 写入 repo / Notion / Knowledge / report / diff / log | 禁止 raw value。 |
| 迁移 raw value | 允许；写 audit，不写 raw 到 audit。 |
| health check 调用 provider | 允许；写结果摘要，不写请求/响应中的敏感值。 |

## 审计事件 Schema

`secrets.audit.yaml` 不保存 raw value，只保存操作证据。

```yaml
schema_version: 1
events:
  - id: sec-audit-20260518T201047-001
    timestamp: "2026-05-18T20:10:47+08:00"
    actor: agent
    action: read
    secret_id: notion-main
    purpose: notion_sync_discovery
    project: hypo-workflow
    raw_value_disclosed: false
    result: success
```

支持的 `action`：

- `read`
- `inject_env`
- `migrate`
- `health_check`
- `rotate`
- `update_metadata`
- `delete`

## Workspace Projection

`workspace.yaml` 或 Notion/Knowledge 中只保存 projection：

```yaml
secret_refs:
  - id: notion-main
    provider: notion
    kind: notion_token
    scope: workspace
    capabilities:
      - notion.read
      - notion.write
    store_ref: local_secret:notion-main
    dependent_projects:
      - hypo-workflow
      - hypo-claw
    health:
      status: unknown
      checked_at: null
    value_policy:
      raw_store: ~/.hypo-workflow/secrets.yaml
      raw_projected: false
```

这让其他任务知道“可以使用这个 secret”，但不会让 sync/report 层携带 raw value。

## 迁移策略

用户确认允许迁移，第一版迁移流程建议：

1. scan：发现已有 secret 来源，例如 Hypo-Claw 配置中的 Notion token。
2. classify：识别 provider、kind、capabilities、dependent projects。
3. dry-run：生成迁移计划，显示 source path、target secret id、会写哪些 metadata；不显示 raw value。
4. apply：读取 source raw value，写入 `~/.hypo-workflow/secrets.yaml`。
5. verify：确认新 secret 可读；必要时运行 provider health check。
6. record：写 `secrets.audit.yaml` 和 workspace projection。
7. cleanup：是否移除旧位置 raw value 另行确认，不自动删除。

## Health Check

用户确认 health check 默认使用真实 provider 调用。第一版按 provider adapter 执行最小可用性检查，只记录摘要和状态，不记录 raw request、raw response 或敏感 payload：

```yaml
health:
  status: ok | failed | unknown
  checked_at: "2026-05-18T20:10:47+08:00"
  checker: notion.ping
  message: "read access ok"
```

禁止记录：

- raw token
- full Authorization header
- provider 返回的敏感 payload
- request body 中的 secret 字段

## DR004 Final Decisions

1. `secrets.yaml` 第一版不加密；需要 `0600` 文件权限和仓库忽略规则。
2. Agent 可在任务匹配 secret capability 时自动读取 raw value。
3. 非 raw secret 的 endpoint、capability、provider、依赖项目、健康状态等 metadata 可以投影到 workspace / Notion / Knowledge，除非某项被显式标记为 sensitive。
4. health check 默认真实调用 provider，并写脱敏审计摘要。
5. Hypo-Claw API 允许通知、读状态、拉任务和同步报告。

这些决策关闭 DR004；后续普通实现阶段需要把 schema 转为真实 `~/.hypo-workflow/secrets.yaml` / `secrets.audit.yaml` 创建、权限校验、git ignore 防护和 provider health check adapter。
