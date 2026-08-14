---
kind: final-report
cycle: C024-v15-alpha2-distribution-preparation
status: accepted
updated: 2026-08-09T14:02:34+08:00
---

# v15.0.0-alpha.2 本地分发准备报告

## 结论

`15.0.0-alpha.2` 本地分发候选已准备完成。源版本、双语发布叙事、current release gates、Codex plugin ZIP、portable ZIP、Host descriptors、checksum、干净解压运行时和连续双构建可复现性均已验证。候选只在本地生成；未创建 tag、未 push、未远端发布、未重装插件，也未修改安装侧 marketplace/config 或重启服务。

## 改动摘要

- 公开 release version 同步为 `15.0.0-alpha.2`；Codex manifest 使用 `15.0.0-alpha.2+codex.20260809052356`。
- 更新 Codex/Claude/OpenCode manifest 与生成器默认值、core/CLI package metadata、locks、README、用户指南、Codex 平台/命令参考和 docs governance map。
- 新增中英文 `v15.0.0-alpha.2` release notes，并在 `CHANGELOG.md` 记录 History Refresh 通用化与测试合同治理结果。
- 修复 release manifest schema：允许合法 SemVer build metadata 和包含 `+codex` 的 artifact path，并新增 maintained 回归。
- 生成 Host installed/release descriptors 与两个本地分发 ZIP。

## 技术方案

版本源先统一到规范 release version，Codex plugin 单独保留一个 cachebuster build metadata。`scripts/build-host-artifacts.mjs` 只接受与 `HEAD` 一致的打包输入，并将 source commit、command manifest、installed descriptor 与两个 artifact SHA-256 绑定。portable bundle 另含逐文件 `bundle-manifest.json`；验证从 source gate、artifact gate、clean extraction 和 reproducibility 四层完成。

## 主要文件与产物

- 版本与生成器：`.codex-plugin/plugin.json`、`.agents/plugins/marketplace.json`、`.claude-plugin/*`、`.opencode/*`、`core/package.json`、`cli/package*.json`、`core/src/{config,artifacts,docs}`。
- 发布叙事：`README.md`、`README.en.md`、`CHANGELOG.md`、`docs/release/v15.0.0-alpha.2.md`、`docs/en/release/v15.0.0-alpha.2.md` 及当前用户/平台/命令文档。
- Host 合同：`contracts/host/v1/release-manifest.schema.json`、`installed-release.json`、`release-manifest.json`。
- Codex ZIP：`dist/hypo-workflow-15.0.0-alpha.2+codex.20260809052356-codex-plugin.zip`。
- Portable ZIP：`dist/hypo-workflow-15.0.0-alpha.2+codex.20260809052356-portable.zip`。

## 测试设计与结果

- Maintained Core：709/709 通过，0 skipped。
- Maintained Scenario：8/8 通过。
- History Refresh focused：12/12 通过。
- Release schema focused：6/6 通过；完整 Draft 2020-12 validation 通过。
- Docs map、中文比例、release narrative、README freshness、版本 parity、plugin validator、JSON parse 与 `git diff --check` 通过。
- Codex ZIP：177 entries，SHA-256 `a4337674c54833ab3159f03ff5d36e67f4425f8ff1ef4e7c83d96467bd493f04`。
- Portable ZIP：176 entries，其中 bundle manifest 验证 175 个 payload 文件，SHA-256 `78c09e23109d24b821dea7739fb94671160dd12dfe003fcf82b67a95d68119c7`。
- 两个 ZIP 均通过 `unzip -t`、absolute/traversal/symlink 拒绝检查；干净解压后的两个 Core runtime import 均成功。
- 连续两次最终构建的 `release-manifest.json` 逐字一致，两个 ZIP SHA-256 无差异。

## Source Binding

- Source commit：`6e53401019d8b5af0630c80f2d3f59f7f5b35a72`（`release: prepare v15.0.0-alpha.2 source`）。
- Command manifest SHA-256：`46f7476dd9c99fc3d8127cbac88b5968eded8d8ddafc67379013fff77847dd56`。
- Installed descriptor SHA-256：`f08d0dd701cfdabfb3e93a7b954d9c9e65d475ecd1d3b38a5cf9dfd900d38ebe`。

## 预期用户结果

本地已有可交付给后续发布步骤的 alpha.2 候选。接收方可从 manifest 验证 source commit 与两个 ZIP，portable bundle 可在解压后逐文件验证。History Refresh 在不同项目身份、Cycle 编号与历史数量下保持通用，current gate 会拒绝 skip、零匹配、未分类和显式执行 excluded。

## 遇到的问题

- 初次 builder 正确拒绝 8 个未提交打包输入。用户授权精确本地 source-prep commit 后解除门禁；runtime、memory、旧 dist 与其他并行改动未进入提交。
- 首轮 artifact schema validation 发现 version pattern 不接受合法 `+codex` build metadata，path pattern 也不接受相同文件名字符。两处已修复并加入回归，最终 manifest 通过完整 schema validation。
- Adapter check-only 报告 5 个旧 `.pipeline` compact/`PROJECT-SUMMARY.md` 时间戳 stale warning；adapter metadata 本身 fresh。这些 legacy/runtime 派生视图不属于本轮发布范围，未改写。

## 风险与后续

- 本轮产物使用带 cachebuster 的完整 SemVer 文件名；公开 release 名仍为 `15.0.0-alpha.2`。
- `installed-release.json`、`release-manifest.json` 和两个 alpha.2 ZIP 当前是构建输出，尚未创建单独 artifact commit。
- tag、push、GitHub Release/npm publish、插件重装、marketplace/config 安装修改与 Hook trust 验证均未执行，后续每类动作仍需单独授权。
- 工作树仍包含本轮明确排除的并行 runtime/memory 与旧 dist 改动；不得在后续发布提交中使用无差别 `git add -A`。
