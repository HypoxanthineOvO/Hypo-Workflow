# M02 / F001 - Rules Remember Capture and Confirmation Flow Report

完成 `/hw:rules remember` 解析、普通候选确认和明确 force-write 路径。普通候选不阻塞当前讨论，只返回结尾确认 prompt；明确 `--force` 或强制写入意图可直接写入选定 scope 的 structured authority。

主要证据：

- `buildRememberRuleProposal`
- `detectRememberRuleCandidates`
- `writeConfirmedStructuredRule`
- `core/test/rules-capture-habits.test.js`

验证：`node --test core/test/rules-capture-habits.test.js core/test/rules-authority.test.js` passed。
