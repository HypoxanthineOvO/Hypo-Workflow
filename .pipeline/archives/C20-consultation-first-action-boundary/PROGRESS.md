> 最后更新：22:38 | 状态：released | 版本：v13.1.0-beta.2

## 时间线

- 2026-06-30T22:38:00+08:00 — v13.1.0-beta.2 已发布：提交序列已拆为 runtime hygiene、C18 archive、C19 Plan、C20 consultation boundary、managed sync 和 release commit；GitHub/GitLab `main` 与 tag 已推送，GitHub prerelease 和 GitLab release 已创建；验证为 config/docs/sync/diff/npm test 全部通过。
- 2026-06-30T21:07:50+08:00 — C20 已完成并进入 pending_acceptance：4 个 Milestone 全部完成，source behavior contract、managed artifact projection、source regression closure 和 target handoff package 均通过审计；等待用户 `/hw:accept` 或 `/hw:reject`。
- 2026-06-30T21:07:50+08:00 — C20-M4 已完成：target package 与 matrix 审计 PASS_WITH_WARNINGS，无 blocker；warning 仅为 source/target dirty baseline 与只读审计范围 caveat。
- 2026-06-30T21:03:18+08:00 — C20-M4 GREEN 验证通过并进入审计：target package 存在、matrix YAML 可解析、C20/no-write/target-local anchors 命中、`git diff --check` 通过，两个目标仓只读 status 仍为既有 dirty baseline。
- 2026-06-30T21:02:27+08:00 — C20-M4 `implement` 已完成并进入 GREEN 验证：新增 target-local Cycle 输入包并将 integration matrix 更新为 C20 handoff；目标仓保持 no-write，只读 dirty baseline 已记录。
- 2026-06-30T20:55:37+08:00 — C20-M4 测试基线完成并进入 `implement`：预期 RED 是 `.pipeline/integrations/C20-target-cycle-input.md` 尚不存在且 `matrix.yaml` 仍为 C19；目标仓 dirty baseline 已只读记录，后续只写源仓 integration package/matrix。
- 2026-06-30T20:50:35+08:00 — C20-M3 已完成并进入 C20-M4：source closure 结论为 PASS_WITH_WARNINGS，无 blocker；关键结果是 focused 30/30、`npm test` 687/687、`git diff --check` 通过，warning 仅保留 source/target dirty worktree caveat。
- 2026-06-30T20:46:40+08:00 — C20-M3 GREEN 验证通过并进入审计：focused suite 30/30 通过，`npm test` 687/687 通过，`git diff --check` 通过；审计将复查 generated surfaces、目标仓 no-write 边界和 stale wording 分类。
- 2026-06-30T20:45:42+08:00 — C20-M3 `implement` 已完成并进入主控 GREEN 验证：managed artifacts 已刷新到 OpenCode/Claude/root surfaces，lifecycle log validator 已支持 gate feedback 事件与状态；下一步复跑 focused、full regression 和 whitespace 检查。
- 2026-06-30T20:39:17+08:00 — C20-M3 测试证据已完成并进入 `implement`：focused tests 23/23 与 `git diff --check` 通过；阻塞点是 checked-in managed artifacts 未刷新 C20 guidance，以及 `npm test` 因 lifecycle log validator 未支持 gate feedback 事件/状态而失败。
- 2026-06-30T20:37:55+08:00 — C20-M3 恢复后原测试 worker 等待状态不可用且未落地产物；记录替换测试 worker，继续只产出 `.pipeline/reviews/C20/M3/test-evidence.md` 的只读验证证据。
- 2026-06-30T20:32:56+08:00 — C20-M2 已完成并进入 C20-M3：shared guidance 投影通过 23/23 focused tests，审计 PASS_WITH_WARNINGS；归属 warning 已记录为非阻塞 dirty-worktree caveat。
- 2026-06-30T20:27:27+08:00 — C20-M2 `implement` 和 GREEN 验证已完成：shared guidance 已投影到 OpenCode/Claude/root managed surfaces，focused suite 23/23 通过；进入 `review_code` 审计。
- 2026-06-30T20:22:37+08:00 — C20-M2 RED 已确认并进入 `implement`：新增 projection tests 后 focused command 19/23 通过，缺少 shared guidance、OpenCode/Claude/root 投影和 root 四规则投影。
- 2026-06-30T20:14:14+08:00 — C20-M1 已完成并进入 C20-M2：source contract 与 focused fixtures 已落地，审计 PASS_WITH_WARNINGS 无阻塞；M2 开始编写 managed instruction projection 测试。
- 2026-06-30T20:08:53+08:00 — C20-M1 `implement` 和 GREEN 验证已完成：新增 source contract，focused test 6/6 通过；进入 `review_code` 审计。
- 2026-06-30T20:05:00+08:00 — C20-M1 RED 已确认并进入 `implement`：focused test 0/6 通过，失败原因是合同文件缺失；下一步由 implement worker 新增 source contract。
- 2026-06-30T20:04:21+08:00 — C20-M1 `write_tests` 已完成并进入 `run_tests_red`：test worker 生成 focused contract tests，当前 RED 预期是缺少 `references/consultation-first-action-boundary.md`。
- 2026-06-30T20:00:47+08:00 — C20-M1 `write_tests` 已开始：启动 test worker 为 `references/consultation-first-action-boundary.md` 编写 focused red test，当前执行锁已创建。
- 2026-06-30T19:51:02+08:00 — Generate 已完成并等待执行确认：生成 4 个 C20 TDD prompts，更新 `.pipeline/config.yaml` 与 `.pipeline/cycle.yaml`，保留 `.pipeline/architecture.md` 不变；下一步是用户显式确认 `/hw:start` 或继续修订计划。
- 2026-06-30T19:51:02+08:00 — Decompose 已确认进入 Generate：用户确认 4 个 Milestone 拆分；确认范围仅限生成执行产物，不包含开始实现或目标仓写入。
- 2026-06-30T19:34:01+08:00 — Decompose 摘要已生成并等待确认：建议拆成 4 个 Milestone，分别处理源端行为合同、共享 guidance 投影、源端回归收口、目标侧 Cycle 输入包；目标仓内部 prompt 优化继续留给目标仓本地 Cycle。
- 2026-06-30T19:34:01+08:00 — Architecture 已按恢复的 Ask 答案确认并进入 Decompose：采用 shared default boundary、discussion-signal-only 严格度、source-first 分发策略，以及 direct sync scope / target-owned scope 分离。
- 2026-06-30T19:23:12+08:00 — Architecture 摘要已生成并等待确认：提出 source modification spec、共享 guidance 投影、direct sync scope 与 target-owned scope 分离，以及目标侧 Cycle 输入/验证/回链架构；不更新 `.pipeline/architecture.md`。
- 2026-06-30T19:22:27+08:00 — Technical Stack 已确认并进入 Architecture：补充两条分发边界，源端已改且属于共享投影面的提示词直接同步；目标仓内部模型 prompt 优化、历史修复和本地体验优化由目标仓本地 Cycle 自行处理。
- 2026-06-30T19:03:25+08:00 — Technical Stack 修订：解释 `Codex-VSP` 多模型 prompt 属于目标仓自身 base-instructions 机制；分发策略细化为源端先产出明确修改规范，再由 `Codex-VSP` 和 `VSP-Open-Code` 各自开目标侧 Cycle 适配和验证。
- 2026-06-30T18:53:49+08:00 — Technical Stack 摘要已生成并等待确认：建议源端先在 `core/src/artifacts/agent-guidance.js` 建立共享协商优先边界，再投影到 OpenCode/Claude/根 `AGENTS.md`，最后按 integration sync 规则确认后适配 `Codex-VSP` 和 `VSP-Open-Code`。
- 2026-06-30T18:50:04+08:00 — Discover 收口并进入 Technical Stack：LOOPS 文章作为校验材料，不再作为新增规则来源；C20 聚焦 `Consultation-First Action Boundary` 与 `First-Use Concept Explanation`，开始分析源端生成表面、测试挂点和目标同步机制。
- 2026-06-30T18:44:36+08:00 — Discover 第五轮决策与纠偏已记录：采用“先动作意图分类，再自动化执行”，新概念第一次使用时一句话解释；暂不进入 Technical Stack，先补做 LOOPS 原则逐条充分中文改写与当前 `AGENTS.md`/基础提示词对比，产物为 `.plan-state/c20-loops-agentmd-detailed-comparison.md`。
- 2026-06-30T18:41:56+08:00 — Discover 第四轮决策已记录：源端覆盖 `AGENTS` 与 command/agent guidance，目标同步完成标准为生成目标文件并通过 smoke；`Prefer automation` 冲突策略标为待复核，并新增“本 Cycle 未讨论过的概念需要在当前回复中简要解释”的需求。
- 2026-06-30T18:36:14+08:00 — Discover 第三轮决策已记录：明确命令 + 具体目标可直接执行；推荐方案后的肯定回复算执行授权；后续验证采用正反例场景测试覆盖讨论拦截、明确任务直行和授权后执行。
- 2026-06-30T18:33:10+08:00 — Discover 第二轮决策已记录：采用宽口径讨论拦截，拦截后输出 Mini-contract；输出顺序为“我的理解”→“问题原因”→“推荐方案”，执行授权覆盖中英文直接词、Workflow 命令和方案后的肯定回复。
- 2026-06-30T18:30:00+08:00 — Discover 第一轮决策已记录：规则严格度为 `discussion_signals_only`，分发策略为 `source_first_then_targets`，提示词落点为 `shared_default_boundary`；后续将继续收敛触发词、例外场景和验证方法。
- 2026-06-30T18:18:47+08:00 — Discover 整理完成：已从图片提炼 `LOOPS.md` 的 loop/contract/state/trace/rubric 原则，并对比 Hypo-Workflow、Codex-VSP、VSP-Open-Code 的现有基础提示词；核心缺口是普通对话进入修改前缺少 action-intent boundary。
- 2026-06-30T18:02:35+08:00 — 创建 C20。目标是调整基础交互风格：当用户没有明确要求“直接执行/开始做”时，助手应先输出修改计划或想法并等待确认；只有在用户明确授权执行时，才按推荐方案进入实际修改。
