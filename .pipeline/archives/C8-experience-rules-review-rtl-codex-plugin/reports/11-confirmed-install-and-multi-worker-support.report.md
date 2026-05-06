# M12 / F004 - Confirmed Install and Multi-Worker Support Report

完成 install proposal 和 multi-worker ownership validation。

安装提案默认不执行，只渲染用户可确认的 slash command flow：

```text
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
/reload-plugins
/codex:setup
```

Multi-worker 规则：

- file/module ownership 必须 disjoint
- overlap is rejected
- capability missing 时降级为 single worker

验证：`node --test core/test/claude-codex-plugin.test.js` passed。
