# C18-M5 Source-Side Closure And Target Plans Report

## 结果

C18-M5 已完成。源仓库侧 Audit/Quality/Optimize 指令、OpenCode/Cursor 适配命名边界、文档与测试合同均已闭合；下一步必须停在 C18-M6 的目标仓库写入确认 Gate。

## 主要变更

- `/hw:audit`：升级为 Intake-first 的 Experience / Engineering / Risk 工程审计。
- `/hw:quality`：新增一等质量评分、baseline、compare、review 和 action queue 指令。
- `/hw:optimize`：新增 Audit+Quality -> Implement/Test -> Audit+Quality 的闭环优化指令。
- integration sync：定义为功能更新后的开发/release gate，不新增用户命令。
- OpenCode adapter：恢复生成 namespace command files，例如 `hw:quality.md`，并清理 legacy dash files。
- Cursor adapter：保持 `.cursor/skills/hw-*.md` / `.cursor/commands/hw-*.md` 平铺命名，避免和 OpenCode namespace 规则耦合。
- lifecycle log：允许 C18 planning/discovery 记录类型进入日志验证。

## 验证

```bash
node --test core/test/c18-instruction-quality-contract.test.js core/test/commands-rules-artifacts.test.js core/test/skill-spec.test.js core/test/deep-plan-integration.test.js core/test/sync-standardization.test.js core/test/claude-plugin-alias.test.js core/test/knowledge-ledger.test.js
```

结果：34/34 passing。

```bash
node --test core/test/docs-governance.test.js core/test/readme-update.test.js core/test/readme-spec.test.js
```

结果：20/20 passing。

```bash
npm test
```

结果：665/665 passing。

```bash
git diff --check
```

结果：通过。

## 目标仓库只读检查

`~/Codex-VSP`：dirty，包含 `.pipeline/*`、docs、`codex-rs/core/*`、`codex-rs/tui/*`、workflow helper/test 文件等未提交改动。

`~/VSP-Open-Code`：dirty，包含 `.pipeline/*`、install/release scripts、`packages/opencode/src/*`、translation/cache/test 文件等未提交改动；其中 `packages/opencode/src/translation/continue-cache.ts` 为 `MM`。

M5 未写入两个目标仓库。

## 目标适配计划

- `.pipeline/integrations/C18-Codex-VSP-adaptation-plan.md`
- `.pipeline/integrations/C18-VSP-Open-Code-adaptation-plan.md`
- `.pipeline/integrations/matrix.yaml`

## M6 Gate

进入 C18-M6 前需要用户确认上述两个目标适配计划和文件清单。确认前不得写入 `~/Codex-VSP` 或 `~/VSP-Open-Code`。
