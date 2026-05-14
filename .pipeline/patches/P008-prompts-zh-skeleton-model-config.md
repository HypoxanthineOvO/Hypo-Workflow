# P008: 修复 Skills Prompt 中文骨架格式与模型配置

- 严重级: normal
- 状态: closed
- 发现于: C12
- 创建时间: 13日 10:30
- 修复时间: 13日 11:30
- 改动: skills/*/SKILL.md (40个文件), ~/.hypo-workflow/config.yaml, opencode.json
- 测试: ✅ 全部 40 个 skills 文件已验证
- 关联: (无)
- resolved_by: C12
- related: []
- supersedes: []
- iteration: 3

## 修复内容

### 1. Skills Prompt 中文骨架格式修复

**全部 40 个 skills 文件已翻译为中文骨架格式**：
- 章节标题保持英文术语（## Semantics, ## Prerequisites, ## Steps 等）
- 正文内容翻译为中文，保留技术术语不翻译（TDD, Subagent, Worker Separation, Cycle, Milestone, Patch 等）
- 保留所有代码块、YAML 示例、文件路径不翻译
- 保留 frontmatter (---) 中的英文不翻译

**翻译示例**：
```markdown
## Semantics

- 读取 `.pipeline/cycle.yaml` 和 `.pipeline/state.yaml`。
- 要求 Cycle 验收状态为 `pending_acceptance` 或 `acceptance.state: pending`。
- 在最终验收前评估 worker separation 准备情况。
```

### 2. 模型配置修复

更新了 `~/.hypo-workflow/config.yaml` 中的 OpenCode agents 配置：

| Agent | 模型 | 用途 |
|-------|------|------|
| `test` | mimo-v2.5-pro | Write Test |
| `code-a` | mimo-v2.5-pro | Execute |
| `plan` | deepseek-v4-pro | Plan |
| `debug` | deepseek-v4-pro | Debug |
| `docs` | deepseek-v4-pro | Docs |
| `code-b` | deepseek-v4-pro | Code B |
| `compact` | deepseek-v4-flash | 轻量级 |
| `report` | deepseek-v4-flash | 轻量级 |

### 3. OpenCode 执行配置修复

更新了 `opencode.json` 与 Hypo-Workflow OpenCode plugin 的 bash 执行策略。OpenCode 原生配置保持 schema 合法，不再使用 `bypass`：

```json
{
  "permission": {
    "*": "ask",
    "edit": "ask",
    "bash": "ask",
    "question": "allow"
  }
}
```

本地 bash 自动执行由 Hypo-Workflow policy 表达：

```yaml
execution:
  bash:
    mode: allow_local
    confirm_external: true
    confirm_destructive: true
    confirm_system_install: true
```

策略效果：
- 本地 test/lint/build/format/sync/docs repair、`git status/diff/log` 和本地检索可自动允许。
- `git push`、PR/MR remote write、`curl/wget`、remote clone、publish、`rm -rf`、`git reset --hard`、系统安装和 release publish 继续 Ask。

## 验证

1. ✅ 全部 40 个 skills 文件已翻译为中文骨架格式
2. ✅ 模型配置已更新，test 和 code-a 使用 mimo-v2.5-pro
3. ✅ OpenCode permission 保持 `ask`/`allow` 合法值，bash 自动批准由 plugin policy 接管
4. ✅ `opencode debug config` 通过，无 `bypass` schema 错误
