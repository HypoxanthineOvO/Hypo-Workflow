# C17-M2 Layered Config And Integration Migration Report

## 结论

C17-M2 已完成并通过审计。运行时代码和脚本中的 `/home/heyx` 硬编码路径已清理，配置读取改为 project > user > defaults 分层 authority，用户级配置迁移只允许显式触发。

## 变更摘要

- 新增并导出 `loadLayeredConfig`、`buildConfigMigrationPlan`、`renderConfigMigrationPrompt`、`writeUserConfigMigration`。
- `sync` 在缺少 user config 时只提示 `config migrate`，不静默写入 `~/.hypo-workflow/config.yaml`。
- CLI 新增 `hypo-workflow config migrate` dry-run 和 `hypo-workflow config migrate --write` 显式写入。
- Hypo-Claw、Hypo-Writer、project registry、project linkage seed、scheduler wrapper 默认路径改为 `~`/`${HOME}`/runtime HOME/config 派生。
- 更新 CLI README 与中英文配置参考文档。
- 修订旧测试中要求 `/home/heyx/.volta/bin` 的过时断言，改为 HOME 派生 PATH 契约。

## Worker Evidence

- Test worker: James (`019e49ec-6f91-7142-9d70-12671bc1e665`)
  - Evidence: `.pipeline/reviews/C17/M2/test-evidence.md`
  - RED: 5/5 failing，覆盖缺失分层配置 API 和 `/home/heyx` 残留。
- Implement worker: Ptolemy (`019e49f1-4e8d-7960-9652-7764a4415eb7`)
  - Evidence: `.pipeline/reviews/C17/M2/implementation-evidence.md`
  - 实现分层配置、显式迁移、sync 提示、路径清理和文档更新。
- Test revision worker: Archimedes (`019e4a04-8368-7d53-b7a4-3277b949b949`)
  - Evidence: `.pipeline/reviews/C17/M2/test-revision-evidence.md`
  - 修正与 M2 目标冲突的旧 cron PATH 断言。
- Audit worker: Hegel (`019e4a08-6e35-7582-a5e5-7867418c261e`)
  - Evidence: `.pipeline/reviews/C17/M2/audit.md`
  - Verdict: PASS。

## Validation

- `node --test core/test/layered-config-integration.test.js core/test/project-notifications.test.js`: 11/11 passing
- `rg -n '/home/heyx' core/src scripts`: no matches
- `npm test`: 645/645 passing
- `git diff --check`: passing

## Warning

- `renderConfigMigrationPrompt(plan, { command })` 当前提示文本不消费 `command` 参数；不影响 M2，因为提示已明确 sync 不静默写 user config，并包含显式迁移命令。

## Next

进入 C17-M3：统一 YAML parser 到 `js-yaml`。
