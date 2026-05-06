# M01 / F001 - Rules and Habits Authority Schema Report

## 结果

M01 已完成。此次交付把 Rules/Habits 从仅有 Markdown/配置摘要扩展为可机器合并的结构化 authority，同时保留现有 `.pipeline/rules.yaml`、builtin rules、presets 和 Markdown custom rules 的兼容行为。

## 改动范围

- `core/src/rules/index.js`
  - 新增 `normalizeStructuredRule`、`resolveEffectiveStructuredRules`、`loadStructuredRulesAuthority`。
  - 校验 `scope`、`severity`、`hooks`、`enforcement.check_kind`。
  - 解析 builtin、显式 global、project structured、cycle structured、Markdown custom rules。
  - 生成 effective rules 和 conflicts，记录 winner 与 overridden source refs。
  - 保留 `.pipeline/rules.yaml rules:` 对结构化 effective rules 的 severity override。
- `core/test/rules-authority.test.js`
  - 覆盖结构化归一化、非法字段、同 id 优先级、冲突详情、Markdown custom 兼容、legacy severity override、显式 global 加载。
- `references/rules-spec.md`
  - 增加 structured authority schema、scope precedence、派生视图边界、global 显式加载说明。
- `skills/rules/SKILL.md`
  - 增加结构化 Rules/Habits authority 工作流、创建路径、非阻塞确认原则和 `pre-release` hook。
- `rules/template/custom-rule-template.md`
  - 增加结构化 YAML 模板。

## Effective Rule 示例

同一个 `prefer-output-language` 规则在 builtin/global/project/cycle 四个 scope 中同时存在时，effective 结果选择 `cycle`：

```yaml
rule_id: prefer-output-language
winner:
  id: prefer-output-language
  scope: cycle
  source_path: null
overridden:
  - id: prefer-output-language
    scope: project
    source_path: null
  - id: prefer-output-language
    scope: global
    source_path: null
  - id: prefer-output-language
    scope: builtin
    source_path: null
```

该行为固定为：

```text
cycle > project > global > builtin
```

## 兼容性

- Markdown custom rules 继续从 `.pipeline/rules/custom/*.md` 读取，并归一化为 `source.format=markdown` 的结构化兼容记录。
- `.pipeline/rules.yaml` 继续作为 preset 和 severity override 文件使用。
- Global habits 不会默认读取 `~/.hypo-workflow`，避免项目行为被操作者 home 目录静默影响；后续 rules 命令或配置显式选择后才加载。

## Agent Review

- 测试 Review：初版测试被 Codex review 判定为 `critical`，原因是缺少同 id precedence、conflict detail 和 legacy `.pipeline/rules.yaml` 兼容覆盖。已补强。
- 代码 Review：实现被 Codex review 判定为 `needs_changes`，指出 severity override、隐式 global loading、`check_kind` 校验、`pre-release` docs 四个问题。已修复。

Review 证据：

- `.pipeline/reviews/F001-rules-habits/M01/tests/summary.md`
- `.pipeline/reviews/F001-rules-habits/M01/code/summary.md`

## 验证

- `node --test core/test/*.test.js`：287/287 passed
- `python3 tests/run_regression.py`：63/63 passed
- `bash scripts/validate-config.sh .pipeline/config.yaml`：passed
- `git diff --check`：passed

## 下一步

M02 将在本 authority 基础上实现“记住这条规则”的 capture/confirmation flow：普通识别不阻塞讨论，只在阶段末尾附加确认；用户明确要求强制写入时允许直接落到所选 scope。
