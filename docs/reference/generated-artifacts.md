# 派生产物参考

这些文件由 core helper 或 sync/docs 命令生成。修改时应回到 source helper 或 authority 文件，再运行 repair/sync。不要直接把派生产物当成 source of truth；如果派生产物 stale，优先检查对应 source 和 writer command。

| Artifact | Source | Repair |
|---|---|---|
| `.opencode/commands/hw-*.md` | command registry | `/hw:sync` |
| `.opencode/agents/hw-*.md` | OpenCode artifact helper | `/hw:sync` |
| `.cursor/rules/hypo-workflow.mdc` | third-party adapter helper | `/hw:sync --platform cursor` |
| `.github/copilot-instructions.md` | third-party adapter helper | `/hw:sync --platform copilot` |
| `.trae/rules/project_rules.md` | third-party adapter helper | `/hw:sync --platform trae` |
| `.pipeline/*.compact.*` | `.pipeline/` authority files | `/hw:sync --repair` |
| `.pipeline/plan-state/p0-configure.yaml` | Cycle-level P0 Configure decision | `/hw:plan` / `/hw:plan:discover` |
| `.pipeline/pr/PR-YYYYMMDD-NNN/create-proposal.yaml` | `/hw:pr create` proposal | `/hw:pr create` |
| `docs/reference/*.md` | docs map | `/hw:docs repair` |
| README managed blocks | command/platform helpers | `/hw:docs repair` |
