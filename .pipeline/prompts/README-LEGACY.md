# Legacy Prompts（C21 机器时代）

本目录 `00-workspace-format-transaction-kernel-and-legacy-write-fence.md` 至 `07-surface-cleanup-deletion-gate-and-release-ready-regression.md` 是 C21 机器时代（API/hash/Receipt 协议）的执行 prompt，C026（2026-08-14）起标记为 legacy：

- 日常语义 Cycle 不读取这些文件；恢复只读项目索引与当前 Cycle 的 Plan/Progress/Execution/Discussion Summary。
- 保持只读，供旧历史迁移与追溯使用；不要修改、不要新增编号。
- 对应实现（`core/src/planning`、`batch-plan`、`deep-plan`、`progressive-discover`、`delivery`）同样已标 legacy，见 `.pipeline/legacy/INDEX.md`。
