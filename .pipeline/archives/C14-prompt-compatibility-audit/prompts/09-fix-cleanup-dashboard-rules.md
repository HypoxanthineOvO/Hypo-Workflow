# M9 — P1 清理与规则修复

## 目标
清理退役文件，创建缺失规则。

## F106: 移除 dashboard Skill
1. 删除 `skills/dashboard/SKILL.md`
2. 从 `SKILL.md` 和 `references/skill-spec.md` 中移除 dashboard 引用
3. 在 CHANGELOG 中记录

## F107: 创建 claude-hw-command-namespace 规则
**文件**: `rules/builtin/claude-hw-command-namespace.yaml`

创建规则文件：
```yaml
id: claude-hw-command-namespace
severity: error
category: project/error/guard
description: >
  Claude Code integration must expose Hypo-Workflow commands through the hw
  plugin namespace as /hw:* slash commands while keeping Claude native
  /resume separate from Hypo /hw:resume.
check:
  - type: file_contains
    paths: [".claude-plugin/plugin.json"]
    pattern: '"namespace": "hw"'
  - type: command_namespace_check
    canonical_prefix: "/hw:"
    platform_prefix: "/hw:"
```

## 验收
- `skills/dashboard/SKILL.md` 已删除
- `rules/builtin/claude-hw-command-namespace.yaml` 存在且格式正确
