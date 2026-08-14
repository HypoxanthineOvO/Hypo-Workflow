---
kind: record
name: machine-era-history
level: reference
scope: project
status: active
updated: 2026-08-14
supersedes:
  - C21-M1~M8 里程碑记录
  - 并发/恢复/VSPi 共生各 Delivery 计划记录
  - Stash、journal/capsule/pack、事务与派生一致性等机器记录
sources: [C21–C27 各 Cycle 摘要与 memory 历史记录]
---

# 机器时代交付史（C21–C27 拆除前）

C21 起 Hypo-Workflow 曾以机器实现交付内核：M1 内核基线、M2 权威层、M3 恢复层（journal/capsule/pack）、M4 Init/Router、M5 引导激活、M6 Goal/Cycle 自适应计划、M7 Maintain 与 Codex Hook、M8 清理与删除门。之后又扩展了多 Workstream 并发与崩溃恢复（VSPi 共生核心与 Goal）、G22 发布合同与 Host Contract v1、并发 Work Placement、Stash 实现模型等。

C23 交付了 pilot 级实验管理（创建/重跑/取代/trash/恢复/baseline，运行证据齐全）；其日常面在 C022/C027 后收敛为 `skills/experiment/SKILL.md` 的语义文件协议。Hooks 曾非阻塞化（未绑定 Session 不拦截），现役形态是四类提醒事件，见 `hooks/README.md`。

上述机器已随 C027 全部拆除：并发由 worktree 隔离、恢复由 git 兜底、记忆由人类可读文件承载。本条是完整历史脉络的沉淀，细节证据见 `.pipeline/cycles/C1` 至 `C027` 各 Cycle 摘要与 `C027/extracted/`。
