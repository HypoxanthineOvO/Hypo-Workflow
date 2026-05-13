# M4 - Subagent 规则与检查点注入闭环

## 结论

已补强 Subagent 两层注入契约，并由授权 Subagent 完成模板/spec/测试改造。

## 做了什么

- `references/subagent-spec.md` 明确 Layer 1 host/orchestrator envelope 和 Layer 2 task injection。
- `templates/subagent/full-delegation.md`、`review-code.md`、`review-tests.md` 均加入两层字段、越界停止规则、evidence 和 artifact 输出要求。
- `core/test/subagent-separation-contract.test.js` 增加两层注入断言。

## 验证

- Subagent 运行：`node --test core/test/subagent-separation-contract.test.js core/test/codex-subagent-discipline.test.js core/test/explain-subagent.test.js`
- 主线全量 `npm test --prefix core` 已通过。

## 手动操作

- 查看任一 `templates/subagent/*.md`，应能看到 Layer 1 和 Layer 2 字段。
- 生成 Subagent prompt 时，应能分辨规则授权 envelope 和任务检查点。

## 已知风险

- 不同 host 的 Subagent API 仍可能不同；本次用模板/spec/测试保证生成契约。
