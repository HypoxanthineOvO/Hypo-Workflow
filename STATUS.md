# 进度

新版 3.0 从空分支 `next` 重新开始，旧版不迁移。设计见 [docs/设计.md](docs/设计.md)。

## 现在
- 设计已确认。版本定为 3.0；`hw` 用 Python 标准库实现，`uv tool install` 安装。
- 正在实现：通用模板、`hw`、init。
- 讨论用的资料在主工作区 `research/`（不进 git）：用户历史反馈、项目横向扫描、黑词库。

## 下一步
1. 写通用 `AGENTS.md` 模板，以及 `RULES.md`、`STATUS.md`、`BOARD.md` 和三种起步文档地图（研究、开发、写作）。
2. 写 `hw`：`check`、`find`、`map`、`status`、`log`、`handoff`。
3. 写 init。
4. 用 DeepSeek Flash 对一两个项目试跑 init。
5. 在 Hypo-Works 和 Cryo-Computing 试用两周。

## 以后
- 多 Agent 协作（下一个大版本）：大量子 Agent 并行做改进和测试，参照 VSP-GPU-Sim；worktree 到时一起考虑。等这一版试用成功后开始。
- VSPi 热重载：参照 DSH，在 VSPi 仓库单独讨论。
