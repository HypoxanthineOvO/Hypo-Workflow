# 命令参考

v14.0.0-alpha.4 的 Official Codex 公共发现面与 Host Contract v1 严格包含十个入口。Root Router 负责 namespace normalization 与 backend availability；每个入口只加载一个普通、非 symlink 的 Child Skill。Codex plugin ZIP 和 portable ZIP 均包含同一组入口。

| 命令 | Child Skill | 何时使用 |
| --- | --- | --- |
| `/hw:guide` | `skills/guide/SKILL.md` | 用户确实不确定下一步；Init 后不默认插入 Guide |
| `/hw:init` | `skills/init/SKILL.md` | 新项目、接手已有项目或检查旧 `.pipeline/` |
| `/hw:goal` | `skills/goal/SKILL.md` | Discussion 后没有人工中途 Stone，可自主连续完成 |
| `/hw:plan` | `skills/plan/SKILL.md` | Discussion 后至少有一个需要人工验收的 Stone |
| `/hw:cycle` | `skills/cycle/SKILL.md` | 兼容读取和继续既有 Cycle |
| `/hw:maintain` | `skills/maintain/SKILL.md` | 保存日常 requirement、preference、decision 或 feedback |
| `/hw:experiment` | `skills/experiment/SKILL.md` | 持续维护实验环境、基线、扫描、重跑、结果审查和即时状态 |
| `/hw:resume` | `skills/resume/SKILL.md` | 会话中断、压缩或重启后继续当前 Delivery |
| `/hw:accept` | `skills/accept/SKILL.md` | 验证后的 Goal、Plan 或兼容 Cycle 已进入 `pending_acceptance` |
| `/hw:reject` | `skills/reject/SKILL.md` | 验收不通过，需要记录反馈并生成修订方案 |

## 内部自然行为

Chat、Explain、Status、Report、Log、Check、Compact、Knowledge、Sync 和 Debug 由 Agent 根据语义自然执行。Discussion 依次完成 Discover、Technical Stack 和 Architecture，再按 Stone 数量选择 Goal 或 Plan。普通确认签发 `delivery.approve_and_start`；“确认但不开始”才进入 `waiting_to_start`。这些行为不创建额外 Codex Skill 或命令。

## 延后与移除

Analysis、Audit、Quality、Docs、PR、Release、Explore、Optimize 延后到后续 Cycle。Setup、Rules、Stop、Skip、Reset、Showcase、Patch、Help、Watchdog、plan-confirm 已移除。

显式调用内部、延后、移除或未知的旧命令时，只返回当前分类、零写原因和最接近的十命令入口。不得写入 `.pipeline/`、生成平台适配器或调用 legacy writer。
