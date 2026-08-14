---
authority_role: record
confidence: confirmed
created_at: 2026-07-12T15:07:05.549Z
dedupe_key: goal.g22-vsp-distribution-contract.plan
id: decision-b00efe9e0c4f436329957788887099e8
kind: decision
level: reference
schema_version: '1'
scope:
  ref: g22-vsp-distribution-contract
  type: goal
semantic_hash: b00efe9e0c4f436329957788887099e8f311a832d4b1bdf98b5d01556dc78476
source_refs:
  - locator: compiled-plan
    ref: goal:g22-vsp-distribution-contract:revision:0
    type: delivery_plan
supersedes: []
updated_at: 2026-07-12T15:07:05.549Z
---
# 发布 C21 并以 Host Contract v1 收敛 VSP 集成

发布一套基于 Host Contract v1 的 Hypo-Workflow C21 发行版，并使 VSP-Codex 与 VSP-Open-Code 在不复制 Workflow 业务语义的前提下消费该发行版；保留有价值的宿主 Ask、Plan、Subagent 与 TUI 体验，消除旧写入器和旧 runner，使后续宿主重构只依赖稳定协议。

```json
{
  "acceptance_criteria": [
    {
      "id": "host-contract-v1",
      "statement": "Hypo-Workflow 提供版本化 Host Contract v1，包括 release manifest、公开命令清单和无秘密的只读 host status projection。",
      "verification": "Schema、fixture、前后向兼容和敏感字段拒绝测试通过；两个 VSP 消费同一组 fixture，不读取私有 Runtime 字段。"
    },
    {
      "id": "release-artifacts",
      "statement": "一个版本号、一个源码 commit 和一组 checksum 生成 Codex native plugin 与 portable bundle，公开表面严格为 Root 加 9 个 Skills，并包含当前 10 类 Codex Hooks。",
      "verification": "插件校验、bundle 内容清单、checksum、版本一致性和已删除 Skill 缺席测试通过；现有 stale redskill zip 被移除或由新产物原子替换。"
    },
    {
      "id": "single-writer-projection",
      "statement": "Workflow Core 是工作区状态唯一写入权威；所有会改变宿主可见状态的权威变更在同一事务中更新或明确失效 Host Contract projection。",
      "verification": "Init、Maintain、Goal、Cycle、Acceptance、Resume 和代表性 Hook/Worker 状态转换的事务与故障注入测试证明不存在旧 YAML 双写或静默 stale projection。"
    },
    {
      "id": "codex-convergence",
      "statement": "VSP-Codex 通过发布版 Codex plugin 和 Host Contract v1 集成，退役硬编码 Workflow 状态写入、旧对话捕获和旧压缩恢复，同时保留并回归其通用 Ask、Plan/SubPlan、Subagent、可选 host goal 和 TUI 体验。",
      "verification": "源码可达性扫描无 legacy Workflow writer；公开命令仅来自 release command manifest；Ask/Plan/Subagent/TUI 与插件安装、更新提示、Hook trust 降级测试通过。"
    },
    {
      "id": "opencode-safety-convergence",
      "statement": "VSP-Open-Code 退役旧 runner、step executor、旧 start/resume/stop 写入器和硬编码旧命令表，Dashboard 与状态条改读 Host Contract v1，并通过校验 checksum 的 versioned bundle resolver 原子切换和回滚。",
      "verification": "旧执行路径不可达且无 legacy state 写入；bundle 安装、版本升级、checksum 拒绝、原子回滚、命令路由和 Dashboard fixture/snapshot 测试通过。"
    },
    {
      "id": "legacy-read-only",
      "statement": "两个宿主只读识别 legacy workspace，并引导使用 /hw:init 采用新格式；本 Goal 不自动改写旧项目，也不允许 legacy writer 回退。",
      "verification": "Legacy fixture 在两个宿主均显示明确诊断，零写入；新格式 fixture 正常显示，损坏或不兼容的 manifest/projection fail closed。"
    },
    {
      "id": "update-compatibility",
      "statement": "宿主代码依赖 Host Contract 兼容范围，实际安装固定到 release、commit 与 checksum；升级需明确确认，保留上一版回滚，Codex Hook hash 变化需重新信任。",
      "verification": "兼容矩阵和升级/回滚测试覆盖兼容、过旧、过新、损坏、离线与 Hook 未信任状态；不会静默浮动到未知版本。"
    },
    {
      "id": "cross-repo-validation",
      "statement": "三仓库在保留现有 dirty worktree 与 C20 target-owned 边界的前提下完成聚焦测试、完整维护回归、契约消费测试和独立审计。",
      "verification": "Hypo-Workflow maintained suite 与 release validation 通过；两个 VSP 的聚焦/相关 broad suites 通过；test、implement、audit 身份分离且报告在会话中完整呈现。"
    }
  ],
  "constraints": [
    "Goal 只有一个 Design 和一次最终人工验收，不创建伪 Milestone。",
    "OpenCode 本轮只做安全收敛；完整 prompt/tool/compaction/worker Hook 自动化明确延期。",
    "VSP UI 可以保留并增强，但不得拥有 Workflow 生命周期、Receipt、Records 或 workspace state 写权限。",
    "VSP-Codex 的 host goal 只能作为可选执行加速能力，不能成为 Hypo Goal 的状态权威或跨平台前置条件。",
    "不修改 Codex-VSP per-model prompts、model selection prompts 或 VSP-Open-Code provider/model reminder wording，除非后续以目标仓库本地方案另行确认。",
    "保留三个仓库全部既有未提交改动；不得 reset、clean 或覆盖用户文件。",
    "远端 push、tag、release、安装和目标环境更新分别需要执行阶段的显式门禁；批准本 Design 不授予远端副作用权限。",
    "不以 Official Codex PreToolUse Hook 作为完整安全边界；删除仍使用精确 Deletion Manifest、Receipt 和受控执行器。",
    "用户可见说明、报告和升级提示优先使用中文，协议键与代码标识保持英文。",
    "未来 Workspace/Delivery schema 发生破坏性升级时必须提供显式 migration 与 predecessor-to-successor 回归，不能再次依赖手工历史补全。"
  ],
  "delivery_kind": "goal",
  "design": {
    "acceptance_criteria": [
      {
        "id": "host-contract-v1",
        "statement": "Hypo-Workflow 提供版本化 Host Contract v1，包括 release manifest、公开命令清单和无秘密的只读 host status projection。",
        "verification": "Schema、fixture、前后向兼容和敏感字段拒绝测试通过；两个 VSP 消费同一组 fixture，不读取私有 Runtime 字段。"
      },
      {
        "id": "release-artifacts",
        "statement": "一个版本号、一个源码 commit 和一组 checksum 生成 Codex native plugin 与 portable bundle，公开表面严格为 Root 加 9 个 Skills，并包含当前 10 类 Codex Hooks。",
        "verification": "插件校验、bundle 内容清单、checksum、版本一致性和已删除 Skill 缺席测试通过；现有 stale redskill zip 被移除或由新产物原子替换。"
      },
      {
        "id": "single-writer-projection",
        "statement": "Workflow Core 是工作区状态唯一写入权威；所有会改变宿主可见状态的权威变更在同一事务中更新或明确失效 Host Contract projection。",
        "verification": "Init、Maintain、Goal、Cycle、Acceptance、Resume 和代表性 Hook/Worker 状态转换的事务与故障注入测试证明不存在旧 YAML 双写或静默 stale projection。"
      },
      {
        "id": "codex-convergence",
        "statement": "VSP-Codex 通过发布版 Codex plugin 和 Host Contract v1 集成，退役硬编码 Workflow 状态写入、旧对话捕获和旧压缩恢复，同时保留并回归其通用 Ask、Plan/SubPlan、Subagent、可选 host goal 和 TUI 体验。",
        "verification": "源码可达性扫描无 legacy Workflow writer；公开命令仅来自 release command manifest；Ask/Plan/Subagent/TUI 与插件安装、更新提示、Hook trust 降级测试通过。"
      },
      {
        "id": "opencode-safety-convergence",
        "statement": "VSP-Open-Code 退役旧 runner、step executor、旧 start/resume/stop 写入器和硬编码旧命令表，Dashboard 与状态条改读 Host Contract v1，并通过校验 checksum 的 versioned bundle resolver 原子切换和回滚。",
        "verification": "旧执行路径不可达且无 legacy state 写入；bundle 安装、版本升级、checksum 拒绝、原子回滚、命令路由和 Dashboard fixture/snapshot 测试通过。"
      },
      {
        "id": "legacy-read-only",
        "statement": "两个宿主只读识别 legacy workspace，并引导使用 /hw:init 采用新格式；本 Goal 不自动改写旧项目，也不允许 legacy writer 回退。",
        "verification": "Legacy fixture 在两个宿主均显示明确诊断，零写入；新格式 fixture 正常显示，损坏或不兼容的 manifest/projection fail closed。"
      },
      {
        "id": "update-compatibility",
        "statement": "宿主代码依赖 Host Contract 兼容范围，实际安装固定到 release、commit 与 checksum；升级需明确确认，保留上一版回滚，Codex Hook hash 变化需重新信任。",
        "verification": "兼容矩阵和升级/回滚测试覆盖兼容、过旧、过新、损坏、离线与 Hook 未信任状态；不会静默浮动到未知版本。"
      },
      {
        "id": "cross-repo-validation",
        "statement": "三仓库在保留现有 dirty worktree 与 C20 target-owned 边界的前提下完成聚焦测试、完整维护回归、契约消费测试和独立审计。",
        "verification": "Hypo-Workflow maintained suite 与 release validation 通过；两个 VSP 的聚焦/相关 broad suites 通过；test、implement、audit 身份分离且报告在会话中完整呈现。"
      }
    ],
    "constraints": [
      "Goal 只有一个 Design 和一次最终人工验收，不创建伪 Milestone。",
      "OpenCode 本轮只做安全收敛；完整 prompt/tool/compaction/worker Hook 自动化明确延期。",
      "VSP UI 可以保留并增强，但不得拥有 Workflow 生命周期、Receipt、Records 或 workspace state 写权限。",
      "VSP-Codex 的 host goal 只能作为可选执行加速能力，不能成为 Hypo Goal 的状态权威或跨平台前置条件。",
      "不修改 Codex-VSP per-model prompts、model selection prompts 或 VSP-Open-Code provider/model reminder wording，除非后续以目标仓库本地方案另行确认。",
      "保留三个仓库全部既有未提交改动；不得 reset、clean 或覆盖用户文件。",
      "远端 push、tag、release、安装和目标环境更新分别需要执行阶段的显式门禁；批准本 Design 不授予远端副作用权限。",
      "不以 Official Codex PreToolUse Hook 作为完整安全边界；删除仍使用精确 Deletion Manifest、Receipt 和受控执行器。",
      "用户可见说明、报告和升级提示优先使用中文，协议键与代码标识保持英文。",
      "未来 Workspace/Delivery schema 发生破坏性升级时必须提供显式 migration 与 predecessor-to-successor 回归，不能再次依赖手工历史补全。"
    ],
    "evidence": [
      {
        "ref": ".pipeline/runtime/objects/delivery/c21/runtime.yaml",
        "summary": "C21 已 accepted，Core 479/479 与场景 8/8 通过；终态已按 consumed delivery.accept Receipt 完成一次性 pre-M6 到 Delivery Store 手工交接。",
        "type": "runtime"
      },
      {
        "ref": ".pipeline/integrations/C20-target-cycle-input.md",
        "summary": "C20 已确认 source-owned direct sync 与 target-owned prompt/runtime tuning 的边界。",
        "type": "boundary"
      },
      {
        "ref": "/home/heyx/Codex-VSP/codex-rs/core/src/workflow_files.rs",
        "summary": "VSP-Codex 仍含 legacy state/log/progress writer，并有 Workflow context、conversation capture、routing 与丰富 Ask/Plan/TUI 扩展。",
        "type": "codex-source"
      },
      {
        "ref": "/home/heyx/VSP-Open-Code/packages/opencode/src/cli/cmd/workflow/state.ts",
        "summary": "VSP-Open-Code 仍含约 4.8K 行旧 runner/state stack；TUI 和 reminder 直接读取旧 YAML，Skill URL cache 不具备可靠版本失效。",
        "type": "opencode-source"
      },
      {
        "ref": "https://developers.openai.com/codex/plugins/build",
        "summary": "当前 Codex plugin 可原生捆绑 Skills 与 Hooks，并通过 marketplace 分发。",
        "type": "official-docs"
      },
      {
        "ref": "https://learn.chatgpt.com/docs/hooks",
        "summary": "当前 Codex 支持十类 lifecycle Hooks、插件 Hook trust 与显式限制，足以替代历史宿主 Hook 模拟但不能替代 Core 权威。",
        "type": "official-docs"
      },
      {
        "ref": "redskill-package/hypo-workflow.zip",
        "summary": "现有 zip 仍包含 start/status/stop/rules/patch 等已删除 Skills，不能作为 C21 发行物。",
        "type": "release-risk"
      }
    ],
    "outcome": "发布一套基于 Host Contract v1 的 Hypo-Workflow C21 发行版，并使 VSP-Codex 与 VSP-Open-Code 在不复制 Workflow 业务语义的前提下消费该发行版；保留有价值的宿主 Ask、Plan、Subagent 与 TUI 体验，消除旧写入器和旧 runner，使后续宿主重构只依赖稳定协议。"
  },
  "evidence": [
    {
      "ref": ".pipeline/runtime/objects/delivery/c21/runtime.yaml",
      "summary": "C21 已 accepted，Core 479/479 与场景 8/8 通过；终态已按 consumed delivery.accept Receipt 完成一次性 pre-M6 到 Delivery Store 手工交接。",
      "type": "runtime"
    },
    {
      "ref": ".pipeline/integrations/C20-target-cycle-input.md",
      "summary": "C20 已确认 source-owned direct sync 与 target-owned prompt/runtime tuning 的边界。",
      "type": "boundary"
    },
    {
      "ref": "/home/heyx/Codex-VSP/codex-rs/core/src/workflow_files.rs",
      "summary": "VSP-Codex 仍含 legacy state/log/progress writer，并有 Workflow context、conversation capture、routing 与丰富 Ask/Plan/TUI 扩展。",
      "type": "codex-source"
    },
    {
      "ref": "/home/heyx/VSP-Open-Code/packages/opencode/src/cli/cmd/workflow/state.ts",
      "summary": "VSP-Open-Code 仍含约 4.8K 行旧 runner/state stack；TUI 和 reminder 直接读取旧 YAML，Skill URL cache 不具备可靠版本失效。",
      "type": "opencode-source"
    },
    {
      "ref": "https://developers.openai.com/codex/plugins/build",
      "summary": "当前 Codex plugin 可原生捆绑 Skills 与 Hooks，并通过 marketplace 分发。",
      "type": "official-docs"
    },
    {
      "ref": "https://learn.chatgpt.com/docs/hooks",
      "summary": "当前 Codex 支持十类 lifecycle Hooks、插件 Hook trust 与显式限制，足以替代历史宿主 Hook 模拟但不能替代 Core 权威。",
      "type": "official-docs"
    },
    {
      "ref": "redskill-package/hypo-workflow.zip",
      "summary": "现有 zip 仍包含 start/status/stop/rules/patch 等已删除 Skills，不能作为 C21 发行物。",
      "type": "release-risk"
    }
  ],
  "id": "g22-vsp-distribution-contract",
  "outcome": "发布一套基于 Host Contract v1 的 Hypo-Workflow C21 发行版，并使 VSP-Codex 与 VSP-Open-Code 在不复制 Workflow 业务语义的前提下消费该发行版；保留有价值的宿主 Ask、Plan、Subagent 与 TUI 体验，消除旧写入器和旧 runner，使后续宿主重构只依赖稳定协议。",
  "revision": 0,
  "schema_version": "1",
  "status": "draft",
  "title": "发布 C21 并以 Host Contract v1 收敛 VSP 集成",
  "plan_hash": "40dc2bc8862244511206bc4b5762e225a444b6e01150bc8e549666ae96c6d90c"
}
```
