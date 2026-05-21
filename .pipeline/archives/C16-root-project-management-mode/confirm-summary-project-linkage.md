# C16 Project Linkage P4 Confirm Summary

状态：项目联动追加计划 P3 Generate completed，等待 P4 确认后才可执行。

## 目标

第一版项目联动要做到：

- 7 个核心项目进入联动 registry。
- 项目跑到终态后，自动准备 QQ 停止通知。
- 停止通知必须包含进度摘要和最后一条 assistant 输出全文。
- 最后输出拿不到时，不发停止通知，记录失败。
- 每天 `00:30 Asia/Shanghai` 发送上一窗口项目总结。
- 第一版只通过 Hypo-Claw 发 QQ，不写 Notion。

## 生成产物

| Milestone | Prompt |
|---|---|
| C16-M10 Project Linkage Registry Seed | `.pipeline/prompts/09-project-linkage-registry-seed.md` |
| C16-M11 Project Stop Event Detection | `.pipeline/prompts/10-project-stop-event-detection.md` |
| C16-M12 Final Assistant Output Capture | `.pipeline/prompts/11-final-assistant-output-capture.md` |
| C16-M13 Hypo-Claw QQ Notification Adapter | `.pipeline/prompts/12-hypo-claw-qq-notification-adapter.md` |
| C16-M14 Daily Project Summary At 00:30 | `.pipeline/prompts/13-daily-project-summary-0030.md` |
| C16-M15 Project Linkage End To End Dry-Run | `.pipeline/prompts/14-project-linkage-e2e-dry-run.md` |

## 执行契约

- Worker Separation：`recommended`
- 执行子工作器授权：用户已授权 Subagent
- 每个 prompt 都包含 `Subworker Assignment Plan`
- 最后一条 assistant 输出是停止通知硬门槛
- 输出原文不脱敏、不截断，只分段
- QQ 发送失败进入重发队列，并在晚间总结顶部提醒
- OpenCode 最后输出只允许探测；无法精确提取时不得声称支持
- P4 后如确认执行，先跑 dry-run/test 路径；真实 QQ notify 仍受执行阶段外部动作门控约束
- 不执行 Notion 写入、不发布、不重启服务
