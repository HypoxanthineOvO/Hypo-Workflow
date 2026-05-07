# M11 / F005 - 人读文档中文主体化

## Objective

- 让给人看的 README 引用链、`docs/**` 和主要 `references/**` 保持中文主体，同时保留命令名、配置键、文件名和专有英文术语。

## 需求

- 遍历 README 直接引用文档，确保主体中文。
- 覆盖 `docs/user-guide.md`、`docs/developer.md`、`docs/platforms/*.md`、`docs/reference/*.md`。
- 尽量覆盖主要 `references/*.md`，尤其 command/config/platform/pr/explain/release/review/state 等仍被用户或 Agent 阅读的 spec。
- 历史 showcase/release 文档可低优先级，但如果仍作为入口给人看，应至少有中文说明。
- 增加文档自检策略：链接、命令数量、平台能力边界、中文主体比例、术语保留。

## Boundaries

- In scope:
  - README linked docs
  - docs/reference and platform guides
  - major references specs
  - docs generator source
  - docs governance tests
- 不翻译代码、schema field、命令、路径、测试名。
- 不做无关文风大改。
- 不让 docs repair 覆盖手写中文内容。

## Implementation Plan

1. 添加或更新 docs language self-check helper/test。
2. 从 README 链接出发生成文档清单。
3. 分批中文化主文档和关键 references。
4. 更新 `core/src/docs/` 的 generated source。
5. 运行 docs governance、sync check 和 full tests。

## 预期测试

- README 引用链文档存在且中文主体。
- 命令数量和新增 `/hw:pr`、`/hw:explain` 不过期。
- 平台 guide 不夸大第三方 IDE 能力。
- 保留英文术语不被误判。

## Validation Commands

- `node --test core/test/docs-governance.test.js core/test/readme-spec.test.js core/test/readme-update.test.js`
- `node cli/bin/hypo-workflow sync --check-only --project .`
- `node --test core/test/*.test.js`
- `git diff --check`

## Evidence

- 报告列出中文化文件清单。
- 报告说明仍保留英文的术语类别。
- 报告记录 docs self-check 结果。

## Human QA

- 抽查 README、User Guide、Commands Reference、Config/PR/Explain specs 是否中文可读。
- 确认文档不是机器翻译腔，关键边界清楚。

## 预期产出

- 中文主体文档集。
- Docs self-check 和 sync freshness 证据。

