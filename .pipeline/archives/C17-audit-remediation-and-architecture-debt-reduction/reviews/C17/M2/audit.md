# C17-M2 Audit
verdict: PASS

reviewed_refs:
- `.pipeline/prompts/02-layered-config-and-integration-migration.md`
- `.pipeline/reviews/C17/M2/test-evidence.md`
- `.pipeline/reviews/C17/M2/test-revision-evidence.md`
- `.pipeline/reviews/C17/M2/implementation-evidence.md`
- `core/src/config/index.js`
- `core/src/sync/index.js`
- `cli/bin/hypo-workflow`
- `core/src/project-events/index.js`
- `core/src/workspace/index.js`
- `scripts/project-notification-dispatcher.sh`
- `scripts/news-noon-scheduler.sh`
- `scripts/daily-summary-scheduler.sh`
- `scripts/maintenance-scheduler.sh`
- `cli/README.md`
- `docs/reference/configuration.md`
- `docs/en/reference/configuration.md`
- `core/test/layered-config-integration.test.js`
- `core/test/project-notifications.test.js`
- `.pipeline/state.yaml`
- `.pipeline/log.yaml`
- `.pipeline/PROGRESS.md`
- `.pipeline/continuation.yaml`

checks:
- 分层配置：`loadLayeredConfig` 按 safe defaults < user < project 合并，返回 project > user > defaults 的来源顺序和字段级 trace；safe defaults 覆盖 `integrations.hypo_claw`、`integrations.hypo_writer`、`projects[]`、`output.timezone`、`project_linkage.seeds`，未嵌入 `/home/heyx`。
- 迁移安全：`buildConfigMigrationPlan` 默认 `dry_run: true` 且只生成 plan/YAML；`writeUserConfigMigration` 要求 `{ confirm: true }`；CLI 只有 `hypo-workflow config migrate --write` 触发用户配置写入。
- sync/start 风格路径：`runProjectSync` 在缺少 user config 时返回并打印 migration prompt，不静默写 `~/.hypo-workflow/config.yaml`；仓库未发现独立 CLI `start` 写 user config 路径，`/hw:start` 属 agent workflow 入口。
- 硬编码路径闭环：`core/src` 与 `scripts` 不再包含 `/home/heyx`；Hypo-Claw、Hypo-Writer、project events ledger、scheduler wrapper 改为 `~`、`${HOME}`、`homedir()`、CLI 参数或 config 派生。
- 安全/隐私：迁移计划内容限定为 user-level config 字段，未写入 repo authority；文档只描述 `~`/HOME 和显式写入边界，未发现 raw secret、token、Authorization、cookie 或私钥泄露。
- worker separation：RED 测试证据由 James 产生；实现证据由 Ptolemy 产生且声明未改 `core/test/**` 或 lifecycle；旧测试修订由 Archimedes 产生，修订理由是旧断言要求 `/home/heyx/.volta/bin`，与 M2 路径清理目标冲突，未降级为覆盖实现。
- CLI/docs 一致性：`cli/README.md`、中英文配置文档和 CLI help 均描述 `config migrate` dry-run 与 `config migrate --write` 显式写入行为。

findings:
- none

warnings:
- `renderConfigMigrationPrompt(plan, { command: "sync" })` 当前不消费 `command` 参数，但提示文本已明确 sync 不写 user config，并包含显式 `config migrate --write` 命令；不阻塞 M2。

validation:
- `node --test core/test/layered-config-integration.test.js core/test/project-notifications.test.js`: 11/11 passing。
- `rg -n '/home/heyx' core/src scripts`: no matches，`rg` exit 1 符合无匹配语义。
- `npm test`: 645/645 passing。
- `git diff --check`: passing。

recommendation:
- C17-M2 可以 PASS。建议主线程生成 M2 completion report，并推进 C17-M3。
