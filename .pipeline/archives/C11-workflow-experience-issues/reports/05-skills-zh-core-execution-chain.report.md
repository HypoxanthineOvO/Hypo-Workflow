# M5 - Skills 中文化：核心执行链

## 结论

核心执行链 Skill 已改为中文主体骨架，保留命令、路径、配置键和状态字段英文 literal。

## 做了什么

- 覆盖 `start/resume/status/report/cycle/accept/reject/patch/pr/sync/explain/debug/audit` 等核心 Skill。
- 将主要标题改为中文，例如 `输出语言规则`、`前置条件`、`执行流程`、`交互行为`、`安全边界`、`参考文件`。
- 更新 `checkSkillQuality`，接受中文 `## 输出语言规则` 标题。

## 验证

- Skill 覆盖扫描：40 个 Skill 文件中文骨架无遗漏。
- `node --test core/test/skill-quality.test.js`
- 全量 `npm test --prefix core` 已通过。

## 手动操作

- 打开 `skills/start/SKILL.md` 或 `skills/report/SKILL.md`，应看到中文主体结构，但 `/hw:*` 和 `.pipeline/*` 仍保持英文。

## 已知风险

- 批量中文化可能影响测试中的英文标题断言；已修复发现的相关断言。
