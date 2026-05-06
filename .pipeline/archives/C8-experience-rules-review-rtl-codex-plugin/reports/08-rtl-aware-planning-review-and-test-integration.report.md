# M09 / F003 - RTL-Aware Planning Review and Test Integration Report

完成 RTL-aware task selection and checklist rendering。

行为：

- RTL-like task text can suggest/select the `rtl` domain pack.
- Non-RTL tasks do not receive RTL checklist noise.
- Checklist rendering uses generic domain-pack helpers, not hardcoded RTL branches.
- Missing simulator tools remain evidence/fallback notes, not silent success.

验证：`node --test core/test/domain-pack.test.js` passed。
