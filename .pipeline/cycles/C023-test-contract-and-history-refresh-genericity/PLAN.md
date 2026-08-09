---
kind: plan
cycle: C023-test-contract-and-history-refresh-genericity
mode: goal
status: active
updated: 2026-08-09
progress: PROGRESS.md
execution: EXECUTION.md
---

# 测试合同治理与 History Refresh 通用性修复

## 执行目的

修复 History Refresh 激活器中的参考仓库专属硬编码，并逐项审计完整测试体系，确保测试保护稳定行为合同，而不是冻结项目样例、内部实现或偶然输出。

## 执行边界

本 Cycle 覆盖 History Refresh 生产代码、全部 Core 测试、Scenario、fixture、runner、regression catalog、直接相关文档与质量门。发布、远端推送、安装包重装和其他项目激活不在本轮授权范围内。

## 验证目标

所有可执行测试和 Scenario 均有 primary 与 independent reviewer 双重审计；每项明确硬编码风险、有效功能演进敏感性和失败合理性。History Refresh 对任意项目身份、Cycle ID 与历史数量保持正确，并保留现有工作区幂等兼容。

## 完整计划

| ID | 阶段 | 期望结果 | 验证方式 |
| --- | --- | --- | --- |
| `M1` | 建立完整测试 inventory | 测试文件、case、Scenario 与支撑文件分类完整且可机械检查 | catalog 对账、文件发现与覆盖校验 |
| `M2` | Primary 分片审计 | 每个测试逐项回答硬编码、修改敏感性和失败合理性 | 10 个分片审计报告与零遗漏检查 |
| `M3` | Independent 交叉复审 | 每个 primary 结论均由另一身份复核，争议可追踪 | 10 个复审报告、差异表和主模型裁决 |
| `M4` | 修复生产实现与测试合同 | History Refresh 数据驱动；脆弱测试被参数化、拆分、重写或删除 | focused tests 与反事实验证 |
| `M5` | 修订 catalog、runner 与质量门 | 完整 inventory 纳入可解释 gate，不再固化参考仓库事实 | inventory dry-run、catalog validator 与 gate 测试 |
| `M6` | 完整验证与最终独立审计 | maintained、quarantined、Scenario 和完整测试结果可解释，无残留高/中 finding | full suites、diff check、最终 sub-agent audit |
| `M7` | 交付验收报告 | 用户能理解改动、测试治理结果、问题和剩余风险 | 完整报告与最终人工接受/拒绝 |

## 测试审计判定边界

明确的协议字段、schema version、安全规则和外部兼容合同可以作为稳定常量测试。参考仓库身份、Cycle 编号、固定数量、内部文件布局和偶然文案不得被当成通用产品合同。
