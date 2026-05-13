# M6 - Skills 中文化：规划与辅助链

## 结论

剩余规划与辅助链 Skill 已完成中文主体骨架化，根 `SKILL.md` 和 `skills/*/SKILL.md` 共 40 个文件覆盖完成。

## 做了什么

- 覆盖 `plan*`、`init/setup/rules/knowledge/docs/guide/help/showcase/chat/compact/check/release/explore/dashboard/watchdog` 等文件。
- 保留 P0/P1/P2/P3/P4、`--batch`、`--insert`、interactive gates、command map 等协议术语。
- 调整测试以接受中文标题，同时保持语义断言。

## 验证

- 中文骨架扫描 `missing_chinese_heading=0`。
- `npm test --prefix core` 已通过 407/407。

## 手动操作

- 打开 `skills/plan/SKILL.md`，应看到中文的强制交互规则和 P1/P2/P3/P4 结构。

## 已知风险

- 普通 docs 没有整篇翻译，只更新必要入口和 Skill 本体。
