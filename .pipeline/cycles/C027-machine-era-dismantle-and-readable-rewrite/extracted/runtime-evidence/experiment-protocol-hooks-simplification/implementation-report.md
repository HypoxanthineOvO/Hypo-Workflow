# Experiment Protocol And Hook Simplification Report

## 结论

Experiment 默认路径已改为 protocol-first、tool-optional。Agent 可以使用普通文件能力维护可读 YAML 记录；`BatchReport`、Experiment Core 写入 API、内容哈希事件和 materialized projection 不再是运行、状态查询或记录更新的前置条件。

未绑定 Work Item 的 Session 不再被 `UserPromptSubmit`、`PreToolUse` 或 `PermissionRequest` 全局阻断。SessionStart 和 UserPromptSubmit 保留候选提醒；明确的直接删除 guardrail 与 Work Placement 资源冲突仍 fail-closed。

## 技术方案

- 新增 `.pipeline/memory/experiment-records/<project_id>/<experiment_id>/experiment.yaml` 与 `attempts/<attempt_id>.yaml` 普通记录协议。
- Experiment skill 默认通过普通文件工具维护计划、Attempt、环境、命令、指标、科学审查和 next action。
- 旧 `.pipeline/memory/experiment-events/`、status projection 和 Core APIs 保留为兼容或可选校验路径，不迁移、不删除。
- Codex Hooks 将 Session selection 从权限门禁降为上下文提醒。
- 非安全 Hook 内部错误返回 bounded warning；wrapper/schema/import 错误输出 `{}` 且退出 0，避免版本错位禁用宿主。
- Work Placement 继续负责真正需要原子性的 repository/GPU/port/cache/output claim。

## 修改模块

- `core/src/codex-hooks/index.js`：移除未绑定 Session 的全局 block/deny，增加 Experiment 提醒和 auxiliary fail-open。
- `hooks/codex-hook.mjs`、`hooks/README.md`：wrapper fail-open 与行为契约。
- `skills/experiment/SKILL.md`：普通文件协议成为默认路径。
- `docs/reference/experiment-records.md`、`docs/en/reference/experiment-records.md`：双语协议和模板。
- `core/src/artifacts/agent-guidance.js`、`AGENTS.md`、OpenCode template 与 command mappings：同步 Session 非阻塞边界。
- README、双语 user guide 和 VSPi integration reference：更新用户可见模型。
- Hook、Experiment status、Host integration tests 与 smoke：覆盖新行为和旧兼容路径。

## 测试设计与结果

- Focused Hook、Experiment status、Work Placement、docs suites：90 tests passed。
- Maintained Core suite：678 tests passed，0 failed。
- Wrapper 末次变更后的 focused suites：35 tests passed，0 failed。
- `node scripts/codex-hook-smoke.mjs`：PASS，覆盖十种 Hook schema 与 fail-open wrapper path。
- Plugin validator：PASS。
- `git diff --check`：PASS。

## 预期结果

Hooks 关闭、未匹配、内部状态损坏、payload 版本错位或可选报告能力缺失时，宿主仍可继续普通工作和实验。Agent 根据公开协议直接写实验记录；Hooks 可用时只补充上下文和提醒。直接删除与真实资源冲突仍保留窄范围阻断。

## 遇到的问题

`node cli/bin/hypo-workflow sync --platform opencode --project . --check-only` 无法启动，因为当前脏工作树中的 CLI 导入了未由 `core/src/index.js` 导出的 `buildGlobalTuiModel`。同时当前 Core 明确将常规 sync writer 标记为 retired。该问题不是本 Goal 引入，也未在本 Goal 中扩 scope 修复。共享 guidance 的派生面改为受控机械同步，并通过搜索和 tests 校验一致性。

首次插件校验命令误用 Node 执行 Python 脚本，随后使用 `python3` 正确执行并通过；未产生文件副作用。

## 风险与后续

- 当前工作树在本 Goal 开始前已有大量未提交修改，多个本次涉及文件也已有用户改动。本实现只做局部补丁，没有清理或覆盖无关变化。
- 新普通 YAML 协议依赖 Agent 语义判断和 Git review，而非严格 Core schema。此取舍是本 Goal 的明确目标；旧严格 API 仍可用于需要机器校验的场景。
- 当前安装中的 plugin cache 未重装或重启。本报告验证的是仓库源与本地 wrapper；把行为带入已安装实例需要后续正常的构建/安装流程和 Hook trust 更新，这些不在本 Goal 授权范围内。
