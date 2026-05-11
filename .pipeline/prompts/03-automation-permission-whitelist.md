# M3 - 自动化授权白名单

## Objective

实现长期自动化授权白名单，让用户明确授权过的本地测试动作不再反复阻断，同时保持破坏性和外部副作用默认确认。

## 需求

- 配置模型支持动作类型白名单：`safe_local`、`stateful_local`、`external`。
- 支持场景覆盖：例如 `/hw:start`、`/hw:resume`、`test_profiles.webapp`、`auto_chain`。
- `safe_local` 可覆盖启动/重启本地服务、浏览器 E2E、mock service。
- `stateful_local` 可覆盖测试数据库 reset、测试缓存清理、测试产物删除。
- `external` 默认继续确认：远端 PR/MR 写入、发布、真实 API 写入。
- 用户当场授权可以写入 Cycle-local ledger；长期默认写入 project/global config。

## Boundaries

- In scope: config spec、setup/init docs、start/resume boundary、test profile contract、tests。
- Out of scope: 真实远端写入自动化。

## 预期测试

- 白名单内的本地测试动作不反复询问。
- 未列入白名单的 stateful/external 动作仍阻断或确认。
- 配置优先级清晰：cycle override > project config > global config > built-in default。

## Validation Commands

- `npm test --prefix core -- config`
- `npm test --prefix core -- test-profile`
- `npm test --prefix core -- lifecycle`
- `bash scripts/validate-config.sh .pipeline/config.yaml`
- `git diff --check`

## Audit Fields

- `audit_target`: 自动化授权白名单配置、解析和执行边界。
- `risk_hypotheses`: 白名单过宽导致 external 操作被放开；用户授权无法持久化；模型安全约束与项目白名单冲突。
- `test_scenarios`: safe_local allow、stateful_local allow when whitelisted、external confirm、unknown action deny/ask。
- `evidence_required`: config schema diff、测试结果、示例配置。
- `independent_validator`: audit Subagent 检查安全边界没有被放大。
- `manual_checks`: 用户能在文档中看到如何长期允许某个本地测试动作。
- `known_limits`: 系统级依赖安装仍需显式 ask。

## Subworker Assignment Plan

- `test`: 需授权；写 config/lifecycle/test-profile red tests。
- `implement`: 需授权；实现配置解析与边界引用。
- `audit`: 已授权只读；重点检查 external 默认确认是否保持。

## 预期产出

- 长期白名单 contract 和实现。
- 用户手动说明：如何配置允许重启 dev server、如何撤销授权。
