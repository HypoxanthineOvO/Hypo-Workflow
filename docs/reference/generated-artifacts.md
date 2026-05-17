# 派生产物参考

这些文件由 core helper 或 sync/docs 命令生成。修改时应回到 source helper 或 authority 文件，再运行 repair/sync。不要直接把派生产物当成 source of truth；如果派生产物 stale，优先检查对应 source 和 writer command。

`.pipeline/*.compact.*` 可以通过显式 `/hw:compact`、`/hw:sync --repair`，或成功 `/hw:start` / `/hw:resume` 结束后的收口刷新生成。默认 `compact.refresh_policy=dirty_only` 只刷新 source newer 或 target missing 的 compact targets，并且必须从完整 authority 文件生成，不能从旧 `.compact` 文件复制。

| Artifact | Source | Repair |
|---|---|---|
| `.opencode/commands/hw-*.md` | command registry | `/hw:sync` |
| `.opencode/agents/hw-*.md` | OpenCode artifact helper | `/hw:sync` |
| `.cursor/rules/hypo-workflow.mdc` | third-party adapter helper | `/hw:sync --platform cursor` |
| `.cursor/skills/hw-*.md` | Cursor per-command Skill sync | `/hw:sync --platform cursor` |
| `.cursor/commands/hw-*.md` | Cursor slash command sync | `/hw:sync --platform cursor` |
| `.cursor/hypo-workflow/` | Cursor compact shared reference resources | `/hw:sync --platform cursor` |
| `.github/copilot-instructions.md` | third-party adapter helper | `/hw:sync --platform copilot` |
| `.trae/rules/project_rules.md` | third-party adapter helper | `/hw:sync --platform trae` |
| `.pipeline/*.compact.*` | `.pipeline/` authority files | `/hw:sync --repair` |
| `.pipeline/plan-state/p0-configure.yaml` | Cycle-level P0 Configure decision | `/hw:plan` / `/hw:plan:discover` |
| `.pipeline/pr/PR-YYYYMMDD-NNN/create-proposal.yaml` | `/hw:pr create` proposal | `/hw:pr create` |
| `docs/reference/*.md` | docs map | `/hw:docs repair` |
| README managed blocks | command/platform helpers | `/hw:docs repair` |
