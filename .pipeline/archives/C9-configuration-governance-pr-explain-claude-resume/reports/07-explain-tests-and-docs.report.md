# M08 / F003 - Explain 测试与文档报告

> 完成时间：2026-05-07 16:25 +08:00  
> 结果：Pass

## 交付内容

- 扩展 Explain evidence target 推断：项目代码框架问题读取 `README.md`、`package.json`、`core/src/index.js` 和 command registry；strict/config 问题读取配置参考；近期改动问题读取 `PROGRESS.md`、`log.yaml` 和 `state.yaml`。
- 新增 Explain fixture tests，覆盖新项目代码框架、strict 配置、近期 diff/改动原因、只读状态和 unknowns。
- 更新 docs generator，使 `docs/user-guide.md` 以中文说明 `/hw:explain`、`/hw:explain --subagent`、fallback、unknowns，以及 Explain 与 status/debug/audit 的边界。
- 更新 OpenCode command artifact 生成逻辑，让 `.opencode/commands/hw-explain.md` 明确 read-only、evidence-first、`--subagent` 和 `fallback_reason`。
- 刷新 docs 和 OpenCode 派生产物，保持 command count 38 和 sync derived=fresh。

## 测试与验证

- `node --test core/test/explain-contract.test.js core/test/explain-subagent.test.js`：10/10 通过。
- `node --test core/test/docs-governance.test.js core/test/commands-rules-artifacts.test.js`：11/11 通过。
- `node --test core/test/*explain*.test.js core/test/docs-governance.test.js core/test/platform-adapters.test.js core/test/commands-rules-artifacts.test.js core/test/claude-plugin-alias.test.js`：27/27 通过。
- `npm test --prefix core`：340/340 通过。
- `bash scripts/validate-config.sh .pipeline/config.yaml`：通过。
- `node cli/bin/hypo-workflow sync --check-only --project .`：derived=fresh。
- `git diff --check`：通过。

## Explain Fixture 摘要

- 代码框架问题：读取 README、package metadata、core export entry 和 command registry。
- strict 配置问题：读取 `.pipeline/config.yaml` 并渲染带证据引用的回答。
- 近期改动问题：在 `diff: true` 下读取 PROGRESS、log 和 state，并填充 `diff_refs`。
- 缺证据问题：返回 `needs_context`，列出 unknowns，不编造不存在模块的设计理由。

## 风险与边界

- Explain 仍是只读命令，不写 `.pipeline/state.yaml`、`.pipeline/log.yaml` 或报告。
- `--subagent` 只做 evidence packet handoff；最终回答仍由主 Agent 校验证据后给出。
- M08 没有扩展 debug/audit 的定位能力，也没有加入任何自动修改 flag。
