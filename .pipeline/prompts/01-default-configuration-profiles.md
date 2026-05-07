# M02 / F001 - 默认配置组合

## Objective

- 在配置治理文档基础上提供几组面向用户的默认配置组合，让用户能快速选择自动程度和严格程度。

## 需求

- 设计并文档化至少四组稳定 key：
  - `solo-auto`
  - `manual-review`
  - `team-strict`
  - `analysis-hybrid`
- 每组说明适用场景、核心字段、自动推进程度、人工确认点、review strictness、worker separation、analysis boundary 和平台差异。
- 提供最小 YAML 示例或 pseudo-config，并说明 project/global 写入位置。
- 如果现有 setup/profile helper 支持配置 profile，补充映射；如果不支持，先以文档和测试 fixture 固化合同。
- 保持高风险动作不可被默认组合静默放开。

## Boundaries

- In scope:
  - `references/config-spec.md`
  - `docs/user-guide.md`
  - `docs/reference/platforms.md`
  - `core/src/profile/`
  - setup/profile tests when applicable
- 不自动重写用户当前配置。
- 不新增会绕过确认门的全自动危险 profile。

## Implementation Plan

1. 添加或更新 profile fixture tests，验证默认组合字段含义和 hard gate 不被降级。
2. 实现或文档化 profile resolver，必要时只新增 deterministic helper，不牵涉 TUI 大改。
3. 在中文文档中加入 profile 对照表和 YAML 示例。
4. 更新 platform guide 中对团队严格模式、个人自动模式、分析混合模式的说明。
5. 将默认组合纳入 final docs self-check。

## 预期测试

- `team-strict` 要求更强的 worker separation 和 review/audit 证据。
- `solo-auto` 可自动推进普通执行，但不能自动 push/merge/close/publish/install。
- `manual-review` 会保留规划和关键阶段确认。
- `analysis-hybrid` 在代码改动前需要确认，但允许只读分析和证据收集。

## Validation Commands

- `node --test core/test/init-automation-contract.test.js core/test/global-config-registry.test.js core/test/config.test.js`
- `bash scripts/validate-config.sh .pipeline/config.yaml`
- `node --test core/test/*.test.js`
- `git diff --check`

## Evidence

- 报告列出四组 profile 的字段差异。
- 记录 hard gate 测试或人工核查结果。

## Human QA

- 用户能凭文档判断自己该选哪组配置。
- 示例 YAML 不会误导用户直接复制到错误层级。

## 预期产出

- 默认配置组合文档。
- Profile fixture/helper 或明确的文档合同。

