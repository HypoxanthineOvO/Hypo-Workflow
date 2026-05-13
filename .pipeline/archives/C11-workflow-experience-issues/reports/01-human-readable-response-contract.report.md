# M1 - 用户可见输出契约

## 结论

已新增用户可见响应契约，要求回复至少包含“结论 / 解释 / 下一步”，复杂完成态还要包含手动操作和已知风险。

## 做了什么

- 新增 `core/src/response/index.js`，提供 `human_response_v1`、`completion_response_v1` 和 `intermediate_update_v1`。
- 更新 `/hw:explain` 渲染，让 evidence-first 解释也按“结论 / 解释 / 下一步”输出。
- 在 `references/commands-spec.md` 中记录所有用户可见命令的输出结构要求。

## 验证

- `node --test core/test/response-contract.test.js core/test/explain-contract.test.js`
- 全量 `npm test --prefix core` 已通过。

## 手动操作

- 运行 `/hw:explain "为什么这个配置是 strict?"`，应看到“结论 / 解释 / 下一步”三段。
- Milestone 完成报告应说明做了什么、怎么验证、用户怎么手动试。

## 已知风险

- 宿主模型仍可能压缩回复；本次通过 Skill/spec/template/test 增强约束。
