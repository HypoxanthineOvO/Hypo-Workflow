# M0 - Deep Plan 合同、命令入口与生命周期

## 结论

M0 已完成。Deep Plan 的 canonical 入口、`--deep` alias、operation vocabulary、lifecycle states、普通 Plan gate 边界，以及与 `/hw:guide`、`/hw:explore` 的区别已经形成可测试合同。

## 做了什么

- 新增 `/hw:plan:deep` command contract，可通过 `commandByCanonical` 查询，并由 OpenCode artifact writer 生成 `/hw-plan-deep` command 文件。
- 新增 `skills/plan-deep/SKILL.md`，定义 durable discussion package、operations、lifecycle states、readiness depth、convert contract 和边界。
- 更新普通 `/hw:plan` skill/command/spec，说明 `/hw:plan --deep` 是 alias，且普通 Plan 仍必须保留 P0/P1/P2/P3/P4 gates。
- 更新 Skill inventory 规格，把 local Skill 数量从 39 调整为 40，并记录 Deep Plan full docs/metadata integration 留到 M6。

## 验证

- `uv run -- node --test core/test/deep-plan-contract.test.js core/test/commands-rules-artifacts.test.js core/test/global-config-registry.test.js`：15/15 通过。
- `uv run -- node --test core/test/skill-quality.test.js core/test/skill-spec.test.js`：6/6 通过。
- `git diff --check`：通过。

## Worker Evidence

- test evidence: `.pipeline/reviews/C12/M0/test-evidence.md`
- implementation evidence: `.pipeline/reviews/C12/M0/implementation-evidence.md`
- audit: `.pipeline/reviews/C12/M0/audit.md`

## 已知限制

- `/hw:plan:deep` 尚未完全进入 legacy `commandMap()` 和所有 generated metadata；这是 M6 的显式后续工作。
- M0 不实现 durable package runtime；M1 起覆盖实际 package model。

