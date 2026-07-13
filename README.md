<div align="center">

# Hypo-Workflow

**面向 Codex 的本地项目工作流协议**

规划 -> 执行 -> 独立验证 -> 人工验收 -> 可恢复继续

[![Version](https://img.shields.io/badge/version-13.1.0--beta.2-blue)](.codex-plugin/plugin.json)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Official%20Codex-black)](docs/reference/platforms.md)

**语言 / Language：中文 | [English](README.en.md)**

</div>

Hypo-Workflow 是 Skill 协议，不是 runner 或后台服务。宿主 Agent 负责实现、测试和审查；`.pipeline/` 负责保存可验证、可恢复的项目事实。

当前版本以 **Official Codex** 为唯一当前适配平台。OpenCode、Claude Code、Cursor、GitHub Copilot、Trae 和自定义 Codex fork 的适配器均延后，仓库中残留的旧平台产物不代表当前支持。

## 当前架构

`.pipeline/manifest.yaml` 选择当前格式与写入边界：

```text
Manifest
  -> Runtime + Continuation
  -> Records + Receipts
  -> Recovery Journal + Capsule + sealed Pack
  -> accepted/checkpoint Snapshots
```

- **Runtime** 保存 Goal/Cycle 生命周期；**Continuation** 只保存下一步。
- **Records** 保存 requirement、preference、decision 和 feedback；它们替代通用 Rules 系统。
- **Receipts** 保存一次性、带作用域的用户授权。
- **Recovery Journal / Capsule / Pack** 保存有界恢复证据，不回放完整会话，也不覆盖较新的 Runtime。
- 旧 `state.yaml`、`cycle.yaml`、`log.yaml`、`PROGRESS.md`、`rules.yaml` 和 `knowledge/` 不是当前 authority。

## 安装

完整能力使用 Codex plugin。开发 checkout 可作为本地 marketplace：

```bash
git clone https://github.com/HypoxanthineOvO/Hypo-Workflow.git
codex plugin marketplace add /absolute/path/to/Hypo-Workflow
```

然后在 Codex 的 `/plugins` 中安装或启用 `hypo-workflow`，并在新会话中用 `/hooks` 审查、信任 plugin Hooks。Hook 文件变更后需要重新信任其新 hash。

只把仓库 symlink 到 `$CODEX_HOME/skills` 可以加载 Skills，但不会提供 plugin-bundled Hooks，因此不是完整安装。

## 两种主要工作流

一个明确结果使用 Goal：

```text
/hw:init -> /hw:goal -> 讨论并批准 Design -> 明确“开始执行”
         -> 验证 -> /hw:accept 或 /hw:reject
```

存在真实先后依赖时使用 Cycle：

```text
/hw:init -> /hw:cycle -> /hw:plan（按需要）
         -> 批准有序 Milestones -> 明确“开始执行”
         -> 逐 Milestone 验证 -> 一次最终人工验收
```

批准只进入 `waiting_to_start`，不会自动实现。中断后使用 `/hw:resume`；日常写作、偏好、需求和反馈使用 `/hw:maintain`，不必开启 Delivery。

## 九个公开入口

| 命令 | 用途 |
| --- | --- |
| `/hw:guide` | 不确定下一步时推荐一个流程 |
| `/hw:init` | 初始化、接手或检查工作区 |
| `/hw:goal` | 交付一个有明确验收目标的结果 |
| `/hw:plan` | 根据证据自适应规划深度 |
| `/hw:cycle` | 交付有先后依赖的多个 Milestone |
| `/hw:maintain` | 保存一个日常项目事实 |
| `/hw:resume` | 从 Runtime、Continuation 和 Recovery Pack 恢复 |
| `/hw:accept` | 接受待验收 Delivery |
| `/hw:reject` | 带结构化反馈拒绝并进入修订 |

Chat、Explain、Status、Report、Log、Check、Compact、Knowledge、Sync、Debug、Start 和 Plan 阶段是内部自然行为，不占用命令面。Analysis、Audit、Quality、Docs、PR、Release、Explore、Optimize 延后。Setup、Rules、Stop、Skip、Reset、Showcase、Patch、Help、Watchdog 和 plan-confirm 已移除；旧显式调用只返回零写诊断。

## Codex Hooks

Plugin 默认从 `hooks/hooks.json` 加载十类事件：

`SessionStart`、`UserPromptSubmit`、`PreToolUse`、`PermissionRequest`、`PostToolUse`、`PreCompact`、`PostCompact`、`SubagentStart`、`SubagentStop`、`Stop`。

它们用于 ambient Maintain、相关文档/Record 提醒、压缩前 Pack 封存、压缩后恢复、worker evidence 和额外删除护栏。多个匹配 Hook 会并发运行，`PreToolUse` 也不能拦截所有等价路径，因此 Hook 不能替代 Core authority 或人工批准。

删除必须先展示 exact Deletion Manifest，经用户重新批准后签发绑定 Manifest 与 Git 状态的 `deletion.execute` Receipt，再由 controlled executor 执行。任何 hash 或 Git drift 都会使批准失效。

## 执行纪律

- 讨论、背景、想法、抱怨和方案反馈先回复“我的理解 -> 问题原因 -> 推荐方案”，不直接编辑。
- 小且可逆的修复可用 `solo-verified`；重要实现按风险分离 test、implement、audit 或其他更合适的角色。
- 完成报告必须在会话中讲清结论、方法、改动、测试、结果、问题和风险，不能只给文件路径。
- 保留 dirty worktree 中不相关的用户修改。

## 文档

- [用户指南](docs/user-guide.md)
- [九命令参考](docs/reference/commands.md)
- [Codex 指南](docs/platforms/codex.md)
- [平台状态](docs/reference/platforms.md)
- [当前产物与 authority](docs/reference/generated-artifacts.md)
- [命令规范](references/commands-spec.md)
- [状态契约](references/state-contract.md)

## License

MIT，见 [LICENSE](LICENSE)。
