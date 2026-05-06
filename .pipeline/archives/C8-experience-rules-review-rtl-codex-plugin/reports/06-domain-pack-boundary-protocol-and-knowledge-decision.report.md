# M07 / F003 - Domain Pack Boundary Protocol and Knowledge Decision Report

完成通用 Domain Pack boundary。

实现内容：

- `domains/<id>/` built-in pack
- `.pipeline/domains/<id>/` project-local override
- manifest validation
- external refs metadata-only representation
- remote install / dependency install / external code execution 默认 unsupported

Knowledge 决策记录：`.pipeline/knowledge/records/C8-PLAN-domain-pack-boundary-and-review-rules-20260506.yaml`。

验证：`node --test core/test/domain-pack.test.js` passed。
