# Debug Report: Regression Release Readiness

- 时间：2026-05-16T13:00:24+08:00
- 范围：发布前完整回归修复
- 触发原因：`uv run python tests/run_regression.py` 初始结果为 55/68，通过前需判断是产品回归还是测试契约过期。

## 结论

本次失败主要是测试跟不上 C15 后的契约和文案演进，不是核心 Workflow 行为倒退。具体包括中文化输出、OpenCode YOLO `allow` 权限策略、DeepSeek model matrix、OpenCode TUI 插件结构、Completion/Analysis/Guide/PROGRESS 等文档契约更新后，旧测试仍匹配英文或旧结构。

发现并修复 1 个真实实现侧缺口：`core/src/log/index.js` 的 lifecycle log 状态白名单没有包含运行时日志里已经出现的 `completed_with_transport_error`，导致真实 `.pipeline/log.yaml` 校验失败。

## 修复内容

- 更新 v8/v9 scenario smoke 脚本，使断言支持当前中文/双语技能文案、当前 guide/showcase/progress 契约，以及 `history/v{N}` 的固定字符串匹配。
- 更新 core Node 契约测试，使它们匹配当前双语输出、OpenCode `allow` 策略、DeepSeek 默认模型、rich TUI plugin surface、Subagent separation 中文契约和 workflow commit 中文文案。
- 在 OpenCode panel 测试的 fake `solid-js` module 中补齐 `For` export，以匹配当前 TUI 插件实现。
- 将 `completed_with_transport_error` 纳入 `LIFECYCLE_LOG_STATUSES`，让 lifecycle log validator 承认真实 worker transport-error 完成状态。

## 验证

- Focused Node contract suite：56/56 passed。
- Focused scenario smoke：s32/s33/s34/s35/s37/s42/s44/s45/s46/s47/s56/s60 全部 passed。
- Full regression：`uv run python tests/run_regression.py`，68/68 passed。
- Diff hygiene：`git diff --check` passed。

## 预期结果

当前代码和测试已回到发布前可继续准备状态。后续 release 检查可以从完整回归已绿的状态继续，不需要把这些失败作为产品行为 blocker 处理。

## 遇到的问题

- 初始失败输出里部分 scenario detail 为空，原因是 `run.sh` 中 `grep/rg` 断言直接失败，必须逐个运行脚本才能定位具体断点。
- 旧测试大量依赖英文精确文案，C15 的中文化和 completion/report 契约强化后，这类测试更容易误报。后续建议继续把测试写成“契约语义匹配”，避免绑定单一语言表述。
