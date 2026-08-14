# Kimi Code 最小适配（C027 M6）

- **共享指令面**：Kimi Code 读取项目根 `AGENTS.md`（与本仓库其他宿主共用同一份人读原则），不需要单独大提示词。
- **Skills**：仓库 `skills/*/SKILL.md` 与 Kimi 的 SKILL.md 格式兼容。安装到全局：将 `skills/<name>/SKILL.md` 复制为 `~/.kimi-code/skills/<name>/SKILL.md`（必要时连同 `references/`）。本适配不写宿主专属机器。
- **不做**：不生成插件、不注册 hooks、不复制整库提示词。Kimi 侧的 hooks/agents 等能力待真实使用需求出现时再评估（反脚手架原则）。
- 本地安装事实：`/home/heyx/.kimi-code`（bin、config.toml、全局 skills 目录）。
