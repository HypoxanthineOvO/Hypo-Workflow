# C8 M01 Test Review Summary

## Verdict

`critical` on the first review round; resolved before implementation.

## Findings

- 初版测试没有覆盖同一个 rule id 在 builtin/global/project/cycle 中同时存在时的完整 precedence 链。
- 初版 conflict assertions 只验证存在冲突，没有验证 winner 和 overridden source refs。
- 初版测试缺少 legacy `.pipeline/rules.yaml` strict preset 和 severity override 兼容性。
- 初版测试缺少非法 scope/severity/hooks/check_kind 的 deterministic error 覆盖。

## Resolution

- 增加 `cycle > project > global > builtin` 同 id fixture。
- 断言 conflict object 的 `winner` 与 `overridden`。
- 增加 `.pipeline/rules.yaml`、Markdown custom rules 和 severity override fixture。
- 增加非法字段错误断言。

## Reviewed Refs

- `core/test/rules-authority.test.js`
- `.pipeline/prompts/00-rules-habits-authority-schema.md`
