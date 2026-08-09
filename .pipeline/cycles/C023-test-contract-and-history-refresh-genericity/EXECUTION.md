---
kind: execution
cycle: C023-test-contract-and-history-refresh-genericity
updated: 2026-08-09T13:18:36+08:00
---

# 执行记录

## 2026-08-09T11:52:53+08:00 - M1 启动

- **目的：** 将用户确认的全量测试合同审计与 History Refresh 通用性修复固化为可执行 Goal。
- **动作：** 确认无 active Cycle；建立 C023 Plan/Progress/Execution/Discussion Summary；维护 7 个稳定 Milestone。
- **结果：** Proposal 已获“确认并开始”授权；M1 进入执行。
- **证据：** 用户确认消息；首个独立 History Refresh 硬编码审计；测试发现与 regression catalog 对账结果。
- **计划影响：** 审计从功能局部扩大为全部测试文件、case、Scenario 和支撑文件的 primary/reviewer 双覆盖。
- **下一步：** 生成完整 inventory 和稳定审计分片。

## 2026-08-09T12:25:00+08:00 - M1/M2 完成，M3/M4 启动

- **目的：** 形成全部测试的可机械对账审计基线，并在不覆盖并行改动的前提下修复已确认的 History Refresh 通用性缺陷。
- **动作：** 冻结 179 个测试文件与 76 个 Scenario inventory；10 个 primary sub-agent 完成逐 case 审计；启动 10 个独立 reviewer；审查并修订并行提交 `cd82992` 及其后续工作树补丁。
- **结果：** Primary 10/10 完成；Reviewer 8/10 完成。History Refresh 已改为目标身份、root legacy work item、任意 semantic Cycle 与动态历史数量驱动，缺失 manifest 可在批准后创建；移除 generic 输出中的 C22/S2 假设和禁止词测试。
- **证据：** `audits/INVENTORY.md`、`primary-00.md` 至 `primary-09.md`、已完成的 `reviewer-*.md`；`node --test core/test/history-refresh-preview.test.js` 为 12/12。
- **遇到的问题：** Primary-03 曾使用旧 inventory 并产生 10 个漏项/10 个越界项，已由 reviewer 发现并按冻结 inventory 完整返工。测试 case 在并行修改后新增两项，Primary-05 已补审以保持双覆盖。
- **计划影响：** 不接受“所有 literal 都是缺陷”的过度修复；只有 primary/reviewer 共同确认或经主模型裁决的稳定合同问题进入 M4。
- **下一步：** 完成 reviewer-03/06，汇总冲突并按不重叠文件分片实施测试整改。

## 2026-08-09T12:42:44+08:00 - M3/M4/M5 完成，M6 启动

- **目的：** 将双重审计结论转成可执行、可解释且不会保护 retired architecture 的质量门。
- **动作：** 完成 reviewer-03/06 与主裁决；递归发现 179 个 Core test/spec；增加 excluded 分类；让 maintained gate 拒绝 skip 与零测试；增加 Scenario pattern helper；将命令/数量断言改为 authority/input 派生；移除 maintained live history、committed release artifact 和偶然 copy/layout 耦合。
- **结果：** Core 为 67 maintained、0 quarantined、112 excluded；Scenario 为 8 maintained、0 quarantined、68 excluded。maintained Core 707/707、Scenario 8/8 通过，excluded 历史仍完整留在 inventory。
- **证据：** `audits/REMEDIATION.md`、10 个 reviewer 报告、`core/test/c21-m8-regression-contract.test.js` 反事实用例、catalog dry-run 输出。
- **遇到的问题：** Node v22 在 name pattern 零匹配时会输出内层 `1..0`，但文件 wrapper 仍报告 pass；runner 现显式检测空 plan。Quarantine 基线 159 个失败均来自 retired/stale 合同，未通过恢复旧 API 处理。
- **计划影响：** `all` 表示所有可执行 current tests，不执行 excluded；inventory 计数单独公开。release candidate ZIP/checksum freeze 留给显式 release gate，不属于本 Cycle。
- **下一步：** 完成最终组合验证与独立 diff 审计，随后生成验收报告。

## 2026-08-09T12:51:38+08:00 - M6 完成，M7 等待审阅

- **目的：** 证明整改后的 current gate 在正向与反事实条件下均可信，并由独立 reviewer 检查测试 oracle 自身。
- **动作：** 重跑 maintained Core、Scenario、History focused、affected focused、quarantine empty lane、双 runner dry-run、excluded 拒绝、语法与 diff 检查；最终 reviewer 对最新 diff 做静态与动态复核。
- **结果：** Core 708/708、Scenario 8/8、History 12/12、affected 73/73 全通过，0 skipped；最终独立审计无未解决 High/Medium finding。
- **证据：** `audits/final-independent.md`、`audits/REMEDIATION.md`、`FINAL-REPORT.md`。
- **遇到的问题：** reviewer 初审发现 PUBLIC_ROUTES、Bootstrap 7/6 与 Python excluded parity 三处残留；修复后再次全量验证并由同一 reviewer 复核清零。
- **计划影响：** M6 完成；M7 进入最终人工接受/拒绝点。Cycle 在接受前保持未关闭。
- **下一步：** 用户审阅最终报告并接受或拒绝。

## 2026-08-09T13:18:36+08:00 - M7 接受并关闭

- **目的：** 将用户对 C023 最终结果的明确接受绑定到对应验收报告并完成归档。
- **动作：** 核对 `FINAL-REPORT.md`、`audits/REMEDIATION.md` 与 `audits/final-independent.md` 的范围和验证结果；将 M7 标记为 completed，关闭 Cycle，并生成 `SUMMARY.md`。
- **结果：** 用户接受 History Refresh 通用化、test inventory/classification、current release gate 与 excluded 边界；C023 状态为 closed。
- **证据：** 用户原话“接受，我们这个要准备做分发了，叫 15.0 alpha 2 吧”；Core 708/708、Scenario 8/8、History 12/12、affected 73/73；最终无未解决 High/Medium finding。
- **计划影响：** 下一轮工作以规范 SemVer `15.0.0-alpha.2` 准备本地分发，不自动授权 tag、push、远端发布、插件重装或服务重启。
- **下一步：** 建立 `15.0.0-alpha.2` 分发准备 Cycle。
