# C21-M7 Official Codex Real-Host Smoke

- Status: `SKIPPED_UNSUPPORTED_HOST`
- Checked at: `2026-07-12`
- Current contract: <https://learn.chatgpt.com/docs/hooks>

## Conclusion

本机没有能够诚实验证当前十事件 Hook 契约的 Official Codex 宿主，因此本层不计为 PASS。合成 schema、真实 wrapper 子进程和 Core 文件系统行为已经验证，但它们不能替代 Plugin discovery、Hook trust 和交互式事件触发的真实宿主验证。

## Host Inventory

- PATH `codex`: `vsp-codex 0.145.0-vsp.9.2`
- Explicit Official binary: `/usr/local/bin/codex`
- Official version: `codex-cli 0.128.0`
- Official `--help`: 未暴露可验证的当前 Hook/trust surface
- Current ten-event gap: 该旧版本不能证明 `PreCompact`、`PostCompact`、`SubagentStart`、`SubagentStop` 和当前 Plugin Hook trust/discovery 行为

## Validation Performed

```text
node scripts/codex-hook-smoke.mjs
=> PASS: ten documented input shapes plus valid/invalid real wrapper processes

CODEX_HOOK_SMOKE=1 node scripts/codex-real-hook-smoke.mjs
=> SKIP: codex-cli 0.128.0; installed host exposes no verifiable Hook surface
```

没有读取用户凭据、Session transcript 或隐藏配置，也没有修改 VSP-Codex。

## Required Follow-Up

完整 real-host 验收需要明确选择支持当前十事件契约的新版 Official Codex，使用隔离或正确的 `CODEX_HOME`，安装/加载本 Plugin，完成 Hook trust，然后在新 Session 中实际触发 Session、Prompt、Tool、Permission、Compact、Subagent 和 Stop。未完成这些步骤前，任何“Official host PASS”都属于虚假结论。
