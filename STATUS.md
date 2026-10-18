# 进度

新版从空分支 `next` 重新开始，旧版（main 上的 v15）不迁移。设计见 [docs/设计.md](docs/设计.md)。

## 现在
- 设计文档已写完，等用户读过确认。
- 讨论用的资料在主工作区 `research/`（不进 git）：用户历史反馈、项目横向扫描、黑词库。

## 下一步
1. 写通用 `AGENTS.md` 模板，以及 `RULES.md`、`STATUS.md`、`BOARD.md` 和三种起步文档地图（研究、开发、写作）。
2. 写 `hw`：先做 `check`（改了代码没改文档、提交格式、黑词）和 `find`，再做 `map`、`status`、`log`、`handoff`。
3. 写 init。
4. 用 DeepSeek Flash 对一两个项目试跑 init。
5. 在 Hypo-Works 和 Cryo-Computing 试用两周。

## 等用户决定
- 新版的版本号。
- `hw` 用 uv+Python 还是 Node。

## 以后
- 多 Agent 协作（下一个大版本）：大量子 Agent 并行做改进和测试，参照 VSP-GPU-Sim；worktree 到时一起考虑。等这一版试用成功后开始。
- VSPi 热重载：参照 DSH，在 VSPi 仓库单独讨论。
