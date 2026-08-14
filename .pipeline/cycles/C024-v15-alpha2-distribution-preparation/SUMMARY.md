---
kind: cycle-summary
cycle: C024-v15-alpha2-distribution-preparation
status: closed
started: 2026-08-09
finished: 2026-08-09
builds_on:
  - C023-test-contract-and-history-refresh-genericity
successors:
  - C025-alpha2-eden-nod-upgrade-compatibility
---

# v15.0.0-alpha.2 本地分发准备总结

## 目的与边界

将已接受的 C023 实现整理为版本一致、叙事完整、可复现验证的 `15.0.0-alpha.2` 本地分发候选。范围包括版本/文档、source gates、Host descriptors 和两个 ZIP；不包含 tag、push、远端 Release、插件安装或服务重启。

## 最终结果

- 公开 release version 为 `15.0.0-alpha.2`；Codex build 为 `15.0.0-alpha.2+codex.20260809052356`。
- 本地 source-prep commit 为 `6e53401019d8b5af0630c80f2d3f59f7f5b35a72`。
- Codex plugin ZIP SHA-256 为 `a4337674c54833ab3159f03ff5d36e67f4425f8ff1ef4e7c83d96467bd493f04`。
- Portable ZIP SHA-256 为 `78c09e23109d24b821dea7739fb94671160dd12dfe003fcf82b67a95d68119c7`。
- 用户已接受本地分发候选与最终报告。

## 验证结果

- Maintained Core 709/709、Scenario 8/8、History Refresh 12/12 通过，0 skipped。
- Plugin validator、version parity、docs/language/narrative/README freshness 与 diff check 通过。
- Release schema、artifact checksum、installed descriptor、ZIP safety、clean extraction runtime 与 portable 175-file manifest 通过。
- 连续双构建的 release manifest 逐字一致，两个 ZIP SHA-256 无差异。

## 重要决定与经验

- builder 必须绑定 clean source commit；用户授权精确 allowlist 本地 commit，runtime/memory/旧 dist 未混入。
- release schema 必须支持完整 SemVer build metadata 及含 `+codex` 的 artifact path；已增加 maintained 回归。
- source-prep、artifact commit、tag/push/远端 Release 与安装是不同副作用边界，不应合并授权。

## 后续候选

- 在本机 Eden 与 Nod 更新 alpha.2，验证新会话解析、Hook/Skill 加载、cache 隔离与旧版不干扰新版。
- 另行决定 artifact commit、tag、push 与远端 Release。
