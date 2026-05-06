# M05 / F002 - Plan Test Code Review Gates Report

完成 review retry/gate policy helper 和 TDD/start/resume guidance 更新。

默认行为：

- `needs_changes` 触发 repair/review loop
- 默认最多 3 轮
- strict policy 可阻塞 configured verdict
- full review notes 存在 `.pipeline/reviews/`，state/progress 只保留 compact pointer

验证：`node --test core/test/review-artifacts.test.js` passed。
