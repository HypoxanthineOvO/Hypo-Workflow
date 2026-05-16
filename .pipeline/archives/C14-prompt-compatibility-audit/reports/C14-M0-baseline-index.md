# C14-M0 — 审查基线与证据索引

## Source-of-Truth Map

| 层级 | 文件 | 角色 |
|---|---|---|
| 状态 | `.pipeline/state.yaml` | Pipeline 运行时状态 |
| Cycle | `.pipeline/cycle.yaml` | Cycle 生命周期元数据 |
| 规则 | `.pipeline/rules.yaml` | 项目规则覆盖 |
| 配置 | `.pipeline/config.yaml` | 项目级配置 |
| 命令 | `.opencode/plugins/hypo-workflow.ts` (commandMap) | OpenCode 插件命令注册源 |
| 命令语义 | `references/commands-spec.md` | 全部 40 个命令语义规范 |
| 状态契约 | `references/state-contract.md` | 状态字段、生命周期枚举 |
| 配置规范 | `references/config-spec.md` | 配置层次、字段映射 |
| Skills | `skills/*/SKILL.md` (40 个) | 每个命令的行为实现 |
| 根 Skill | `SKILL.md` | 命令路由与全局规则 |
| 平台规范 | `references/opencode-spec.md` 等 | 平台适配器规范 |
| 全局配置 | `~/.hypo-workflow/config.yaml` | 跨项目用户配置 |
| 生成引擎 | `core/src/artifacts/opencode.js` | OpenCode 工件生成器 |

## Platform Adapter Map

| 平台 | 适配器位置 | 生成器 | 状态 |
|---|---|---|---|
| OpenCode | `.opencode/` (plugins, tui, runtime, agents 12, commands 40) | `core/src/artifacts/opencode.js` | **生成版本 12.5.2，落后于仓库版本 12.7.0** |
| Claude Code | `.claude-plugin/`, `.claude/agents/` (8 agents) | `core/src/artifacts/claude.js` | 生成版本 12.5.2 |
| Codex | `.codex-plugin/plugin.json` | `core/src/artifacts/third-party.js` | 最小适配 (仅 plugin.json) |
| Cursor | `.cursor/rules/hypo-workflow.mdc` | third-party.js | 生成 |
| Trae | `.trae/rules/project_rules.md` | third-party.js | 生成 |
| Copilot | `.github/copilot-instructions.md` | third-party.js | 生成 |

## Test Command Inventory

| 命令 | 范围 | 可运行 |
|---|---|---|
| `npm test` (root) | 91 node:test 文件 | ✅ |
| `npm run test:scenario-smoke` | v9 回归冒烟 | ✅ |
| `npm run test:smoke` | 单元 + 冒烟 | ✅ |
| `pytest tests/` | 4 Python notion 测试 | ✅ (需 Python) |
| `python3 tests/run_regression.py` | 69 场景回归 | ✅ |
| `bash tests/scenarios/v11/*/run.sh` | 各场景单跑 | ✅ |

## Documentation Entry Inventory

| 类别 | 数量 |
|---|---|
| README (zh/en) | 2 |
| AGENTS.md | 1 |
| CHANGELOG | 1 (430 行) |
| developer.md (zh/en) | 2 |
| user-guide.md (zh/en) | 2 |
| platforms/ (zh/en) | 13 |
| reference/ (zh/en) | 8 |
| release/ (zh/en) | 13 |
| Skills (guide/help/root SKILL) | 3 |
| Examples | 3 |

## Derived/Generated Artifact Map

| 生成物 | 源 |
|---|---|
| `.opencode/plugins/hypo-workflow.ts` | `plugins/opencode/templates/plugin.ts` |
| `.opencode/tui/hypo-workflow-tui.tsx` | `plugins/opencode/templates/plugin-tui.tsx` |
| `.opencode/hypo-workflow.json` | `.opencode/plugins/hypo-workflow.ts` |
| `.opencode/agents/hw-*.md` (12) | `core/src/artifacts/opencode.js` |
| `.opencode/commands/hw-*.md` (40) | `core/src/artifacts/opencode.js` |
| `opencode.json` | 模板 + 元数据 |
| `AGENTS.md` | `plugins/opencode/templates/AGENTS.md` |
| `.claude-plugin/plugin.json` | `core/src/artifacts/claude.js` |
| `.claude/agents/hw-*.md` (8) | `core/src/artifacts/claude.js` |
| 第三方适配器 | `core/src/artifacts/third-party.js` |

## Initial Risk Hypotheses

1. **版本漂移**: OpenCode/Claude Code 生成物版本 12.5.2，仓库已 12.7.0 — 需 sync 重新生成
2. **缺失 analysis sidecar**: `.opencode/hypo-workflow.json.analysis` 不存在，AGENTS.md 和全部 12 个 agent 文件均引用之（C5 审计已标记 Medium）
3. **commandMap 双源**: `.ts` 和 `.json` 各有一份，容易不同步
4. **opencode.json 双份**: 根目录和 `.opencode/` 各一份，差异为 plugin 字段
5. **dashboard skill 已退役**: 仍在技能目录中但命令映射已移除
6. **`/hw:review` 是兼容性别名**: 仅打印迁移警告，不执行审查
