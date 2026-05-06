# M04 / F002 - Review Artifact Schema and Directory Structure Report

完成 `.pipeline/reviews/<feature>/<milestone>/<stage>/` artifact schema helper。

实现内容：

- stable review path construction
- verdict enum: `pass | warn | needs_changes | critical`
- required `reviewed_refs`
- optional checked/unchecked rules, issues, retry round, fallback reason
- secret redaction or reject mode

验证：`node --test core/test/review-artifacts.test.js` passed。
