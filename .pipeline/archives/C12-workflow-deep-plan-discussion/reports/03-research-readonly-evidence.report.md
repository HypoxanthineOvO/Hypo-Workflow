# C12/M3 Report - Research 只读证据流

## 结果

M3 已完成。Deep Plan 现在支持本地只读 research evidence：记录 evidence refs、findings、unknowns、searched surfaces、source boundaries，并生成 compact Knowledge refs。

## 已完成

- 新增 `recordDeepPlanResearch`，追加 research entries 并保持 package `researching`。
- 新增 `assessDeepPlanResearchAction`，默认只允许本地只读 research action。
- 新增 `indexDeepPlanKnowledgeRefs`，生成 secret-safe compact refs。
- 修复审计发现的边界漏洞：allowlist 不能绕过 remote/network confirmation；remote confirmation 不能授权 edit/restart/destructive/external side effects；`evidence_refs` 也会脱敏。

## 验证

- `uv run -- node --test core/test/deep-plan-research.test.js`：8/8 passing。
- `uv run -- node --test core/test/deep-plan-package.test.js core/test/deep-plan-ask.test.js core/test/deep-plan-research.test.js`：20/20 passing。
- `git diff --check`：passing。

## Carry-Forward

- M8 继续验证用户补充的 research-code 场景：remote clone/download 只能在显式 remote/network confirmation 后进入代码调研流程。
