# C9 Final Validation Subagent 审计归档

> 时间：2026-05-07 16:55 +08:00  
> 结论：Pass after fixes

## 审计来源

- Newton：`needs_changes`。主要指出 M12 尚未完成时缺少 final report、final validation record 和最新状态更新；这些属于本 Milestone 收尾项。
- Carson：`needs_changes`。指出两个必须修复的敏感信息泄漏风险，以及两个非阻塞一致性提醒。

## 已修复阻塞项

- Explain evidence packet：`core/src/explain/index.js` 在读取本地文件后先执行 `redactSecrets()`，再生成 excerpt；`renderExplainAnswerFromSubagentEvidence()` 也在渲染 findings/risk notes 时兜底脱敏。
- PR review notes：`core/src/pr/index.js` 在 `buildReviewFindings()` 和 `renderReviewFindings()` 两层脱敏，避免 reviewer comments 中的 `Authorization`、`token`、API key 等进入 `.pipeline/pr/**/review-notes.md`。
- PR local archive id：`normalizeChangeRequestSource()` 支持 `PR-YYYYMMDD-NNN`，`buildChangeRequestArchive()` 可用本地归档 ID 复用 archive contract。
- OpenCode command count：`references/opencode-spec.md` 和 v6/v8/v9 regression scenarios 已对齐 38 个用户命令，并覆盖 `/hw:pr`、`/hw:explain`。

## 新增验证覆盖

- `core/test/explain-contract.test.js`：验证 Explain evidence packet 和 answer 不泄漏 secret-like 文件内容。
- `core/test/explain-subagent.test.js`：验证 Subagent packet 渲染不泄漏 secret-like findings/risk notes。
- `core/test/pr-readonly-flow.test.js`：验证 PR review notes 和 returned findings 不泄漏 secret-like reviewer comments。
- `core/test/pr-contract.test.js`：验证本地 archive id 规范化和 archive contract。
- `tests/scenarios/*`：验证 38 command count、README 新鲜度、OpenCode command map 和 `/hw:pr`/`/hw:explain` adapter surface。

## 非阻塞提醒

- 配置解析优先级文档已明确 `project config > global config > built-in default`，并且本轮覆盖了 profile、acceptance、OpenCode/Claude 主要入口；更细粒度地统一所有 runtime entrypoint 的 config merge 可作为后续单独 Cycle 做治理型重构。
- `/hw:pr create` 仍按设计保留为 future command；本轮只处理已有 GitHub PR / GitLab MR 和本地 archive id。

## 最终判定

Subagent 审计发现的阻塞风险已修复并纳入回归。M12 可交付。
