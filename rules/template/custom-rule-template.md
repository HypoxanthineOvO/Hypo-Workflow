# my-rule-name

- **标签**: workflow
- **严格度**: warn
- **钩子点**: pre-commit

## 规则内容

用自然语言描述 Agent 应该遵守的规则。

示例：

每次修改 `.py` 文件后，在 commit 前运行 `ruff check .`。如果有 lint 错误，先修复再提交。

## 结构化规则模板

新规则优先使用结构化 YAML authority，再从 authority 生成 Markdown/adapter 注入文本：

```yaml
id: my-rule-name
scope: project
label: workflow
severity: warn
hooks:
  - always
source:
  captured_from: manual
  author: user
content:
  instruction: "用一句清晰的话描述 Agent 应该遵守的行为。"
  rationale: "说明为什么这条规则长期有用。"
  examples:
    good:
      - "推荐做法"
    bad:
      - "需要避免的做法"
enforcement:
  check_kind: agent_judgment
  evidence_required: true
```
