# M06 / F002 - Skill and Platform Artifact Review Coverage Report

完成 review coverage checklist helper，覆盖 Skills、hooks、agents、commands、generated adapter surfaces。

检查结果必须区分：

- `checked`：带 evidence path
- `skipped`：带明确 reason

这避免把“不支持的 surface”伪装成 pass。

验证：`node --test core/test/review-artifacts.test.js` passed。
