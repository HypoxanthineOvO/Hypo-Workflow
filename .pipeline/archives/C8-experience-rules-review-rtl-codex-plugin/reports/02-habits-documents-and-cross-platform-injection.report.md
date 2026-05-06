# M03 / F001 - Habits Documents and Cross-Platform Injection Report

完成从 structured Rules/Habits authority 生成可读 habits 文档和 adapter instruction block。OpenCode `AGENTS.md`、第三方 adapter managed block、以及 `.pipeline/HABITS.md` 都使用 structured authority 作为来源。

关键边界：Markdown habits 和 platform instructions 是 derived views，不是 authority。

验证：

- `node --test core/test/rules-capture-habits.test.js`
- `node --test core/test/platform-adapters.test.js`
- `node --test core/test/commands-rules-artifacts.test.js`

当前项目 habits 视图：`.pipeline/HABITS.md`。
