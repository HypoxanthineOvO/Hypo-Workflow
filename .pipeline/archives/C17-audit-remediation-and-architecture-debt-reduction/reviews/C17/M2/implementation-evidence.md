# C17-M2 Implementation Evidence

## 修改文件

- `core/src/config/index.js`
- `core/src/sync/index.js`
- `core/src/workspace/index.js`
- `core/src/project-events/index.js`
- `cli/bin/hypo-workflow`
- `scripts/project-notification-dispatcher.sh`
- `scripts/news-noon-scheduler.sh`
- `scripts/daily-summary-scheduler.sh`
- `scripts/maintenance-scheduler.sh`
- `cli/README.md`
- `docs/reference/configuration.md`
- `docs/en/reference/configuration.md`
- `.pipeline/reviews/C17/M2/implementation-evidence.md`

未修改 `core/test/**`，未修改 `.pipeline/state.yaml`、`.pipeline/log.yaml`、`.pipeline/PROGRESS.md`、`.pipeline/continuation.yaml`、`.pipeline/.lock` 或 `.pipeline/reports/**`。

## 接口行为

- 新增并导出 `loadLayeredConfig`、`buildConfigMigrationPlan`、`renderConfigMigrationPrompt`、`writeUserConfigMigration`。
- `loadLayeredConfig` 按 project `.pipeline/config.yaml` > user `~/.hypo-workflow/config.yaml` > safe defaults 合并，并返回来源列表与字段来源追踪。
- safe defaults 覆盖 `integrations.hypo_claw`、`integrations.hypo_writer`、`projects[]`、`output.timezone`、`project_linkage.seeds`，默认路径使用 `~` 或运行时 HOME 派生。
- `buildConfigMigrationPlan` 默认为 dry-run，只生成目标路径和 YAML/content；`writeUserConfigMigration(plan, { confirm: true })` 才写入用户配置。
- `hypo-workflow config migrate` 输出 dry-run 迁移计划；`hypo-workflow config migrate --write` 显式写入用户配置。
- `hypo-workflow sync` 在缺少 user config 时输出迁移提示，不静默创建 `~/.hypo-workflow/config.yaml`。
- Hypo-Claw、Hypo-Writer、project linkage seed 和 scheduler 默认路径已从本机字面量改为 HOME/config 派生。

## 验证结果

- `node --test core/test/layered-config-integration.test.js`: 5/5 passing。
- `rg -n '/home/heyx' core/src scripts`: 无输出；`rg` exit 1 表示无命中。
- `git diff --check`: passing。
- `npm test`: 未通过，当前 644 pass / 1 fail。

## npm test blocker

失败项为 `project notification dispatcher wrapper pins Volta Node path for cron`，来自 `core/test/project-notifications.test.js`。失败断言要求 `scripts/project-notification-dispatcher.sh` 包含字面量 `/home/heyx/.volta/bin`；但 C17-M2 RED 明确要求实现后 `rg -n '/home/heyx' core/src scripts` 不应再命中，且验证命令包含该路径扫描。

这两个要求在当前测试集合中互相冲突：恢复 `/home/heyx/.volta/bin` 会让 M2 路径扫描失败；保留 `${HOME}/.volta/bin` 会让旧根测试失败。按照本轮 implement worker 指令，我未读取或修改测试源码，且未回滚路径迁移。
