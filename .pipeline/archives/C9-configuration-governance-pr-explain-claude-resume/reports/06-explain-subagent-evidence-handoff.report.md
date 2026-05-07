# M07 / F003 - `--subagent` 取证流程报告

> 完成时间：2026-05-07 16:20 +08:00  
> 结果：Pass

## 交付内容

- 为 `/hw:explain --subagent` 增加独立只读取证 handoff 合同，明确 Subagent 只产出 evidence packet，不直接生成最终回答。
- 新增 evidence packet schema 校验，要求 `reviewed_refs`、`findings`、`unknowns`、`confidence` 和 `risk_notes`。
- 增加 Subagent 不可用时的 self fallback prompt，并要求记录 `fallback_reason`，继续保持 evidence-first 和只读边界。
- 增加基于 Subagent evidence packet 的回答渲染，确保回答引用文件证据、显式列出 unknowns，并避免无证据断言。
- 更新 `references/explain-spec.md`、`references/commands-spec.md` 和 `skills/explain/SKILL.md`，补齐 Codex Subagents、OpenCode fallback、Claude hw plugin namespace 的平台说明。

## 测试与验证

- `node --test core/test/explain-subagent.test.js core/test/explain-contract.test.js`：8/8 通过。
- `node --test core/test/explain-subagent.test.js core/test/explain-contract.test.js core/test/codex-subagent-discipline.test.js core/test/platform-adapters.test.js`：16/16 通过。
- `node --test core/test/skill-quality.test.js core/test/commands-rules-artifacts.test.js`：8/8 通过。
- `npm test --prefix core`：338/338 通过。
- `bash scripts/validate-config.sh .pipeline/config.yaml`：通过。
- `node cli/bin/hypo-workflow sync --check-only --project .`：derived=fresh。
- `git diff --check`：通过。

## Evidence Packet 合同摘要

- Subagent 输入：问题、只读边界、候选证据目标、输出 JSON schema、禁止修改文件的约束。
- Subagent 输出：结构化 evidence packet，由主 Agent 校验后再写最终回答。
- 不可用降级：主 Agent 记录 `fallback_reason`，使用同一 evidence-first 约束自行取证。

## 风险与边界

- `--subagent` 不改变 `/hw:explain` 的只读属性。
- Subagent 不负责最终结论，避免独立上下文直接替主 Agent 下最终判断。
- 没有加入自动修改 flag，也没有把 Explain 扩展成 debug/audit 的问题定位流程。
