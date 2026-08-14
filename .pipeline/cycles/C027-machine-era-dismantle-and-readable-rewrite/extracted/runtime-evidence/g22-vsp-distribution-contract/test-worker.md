# G22 独立 Test Worker 最终证据

- Role: `test`
- Timestamp: `2026-07-13T09:56:37+08:00`
- Scope: Hypo-Workflow、Codex-VSP、VSP-Open-Code 修复后独立验证
- Verdict: **GREEN**

## 结论

G22 的最终修复已满足本轮测试矩阵。Host Contract v1、Bootstrap 同事务 fail-closed projection、Codex thin-host 路由、OpenCode 真实发行安装链、legacy writer/runner 退役和 deterministic release 均有独立 GREEN 证据。

本 worker 没有修改生产代码、版本、发行逻辑或 Runtime authority；仅运行验证命令并覆盖本测试证据报告。没有执行 push、tag、远端发布、全局安装或目标环境更新。

## 验证结果

### Hypo-Workflow

```text
npm test
```

- maintained Core: **486/486 passed**
- 覆盖 Host Contract schema/parser、真实发行物、projection invalidation、Bootstrap、Goal/Cycle、Maintain、Recovery、Receipts、deletion gate 和 Codex Hooks。
- Main agent 随后独立重跑同一 maintained gate，亦得到 **486/486**，与 test worker 结果一致。

```text
python3 tests/run_regression.py --set maintained
```

- maintained scenarios: **8/8 passed**
- `s70` 至 `s77` 全部通过：Init、Goal、Cycle、Maintain、Resume、Accept/Reject、Deletion drift、Codex Hook process。

```text
node --test --test-reporter=spec \
  core/test/bootstrap-acceptance.test.js \
  core/test/bootstrap-activation.test.js \
  core/test/bootstrap-migration.test.js
```

- Bootstrap focused: **67/67 passed**
- activation、fault recovery、rollback checkpoint、acceptance evidence、legacy freeze drift、proposal/curation/audit 均通过。
- Bootstrap 激活现在通过 transaction kernel 写入 fail-closed Host projection，不再存在审计指出的无 projection crash window。

### Codex-VSP

```text
cargo check -p codex-core -p codex-tui
```

- **PASS**。仅有仓库既有 dead-code warnings，无编译错误。

```text
cargo test -p codex-core --test all hypo_workflow_host_contract -- --nocapture
```

- Host Contract: **5/5 passed**
- 包括 shared sensitive fixture、nested unknown field fail-closed、read-only reader、9 命令发布面和 legacy writer/capture 不可达。

```text
cargo test -p codex-core --test all workflow_routing -- --nocapture
```

- Core routing: **4/4 passed**
- current、legacy、invalidated、non-workflow 四类工作区行为通过。

```text
cargo test -p codex-tui --test all workflow_slash_routing -- --nocapture
```

- TUI routing: **8/8 passed**
- palette 精确投影 9 项公开命令；status/start/stop/audit/quality/optimize 等 legacy/internal 命令不再展示或被通配接受。

```text
cargo test -p codex-tui command_palette_includes_workflow_entries -- --nocapture
```

- 实际 command palette regression: **1/1 passed**
- 已关闭旧 `/hw:status` 单测残留问题。

### VSP-Open-Code

```text
bun typecheck
```

- **PASS**，`tsgo --noEmit` exit 0。

```text
bun test test/workflow/host-contract-v1.test.ts
```

- Host Contract + emitted ZIP install: **7/7 passed**
- current/invalidated、shared secret/nested unknown 拒绝、legacy 零写入、9 命令、fixture tamper/rollback、legacy runner reachability 全部通过。
- `installPortableRelease` 使用真实 `dist/hypo-workflow-13.1.0-beta.2-portable.zip`，在自动清理的临时目录中激活到 `current` root。
- 安装链验证 release manifest、外层 ZIP SHA-256、installed descriptor、command manifest 和内嵌 `bundle-manifest.json` 的全部逐文件 SHA-256；成功后 descriptor 存在，内部校验 manifest 不作为 active payload 泄漏。

```text
bun test \
  test/workflow/host-contract-v1.test.ts \
  test/workflow/platform-awareness-contract.test.ts \
  test/workflow/question-enhancement-contract.test.ts \
  test/workflow/yolo-governance-contract.test.ts \
  test/cli/tui/workflow-dashboard-contract.test.tsx
```

- related broad: **26/26 passed**
- 包括 Host Contract 7、platform awareness 7、question enhancement 4、YOLO governance 5、Dashboard/status line 3。

## 发行与可重复性

当前源码：

```text
git rev-parse HEAD
225e45dacd8185b8cba5d934d745031210f0203d
```

`contracts/host/v1/release-manifest.json` 的 `release.source_commit` 与该 commit 完全一致。

连续执行两次：

```text
npm run build:host
sha256sum \
  dist/hypo-workflow-13.1.0-beta.2-codex-plugin.zip \
  dist/hypo-workflow-13.1.0-beta.2-portable.zip \
  contracts/host/v1/command-manifest.json \
  contracts/host/v1/installed-release.json \
  contracts/host/v1/release-manifest.json
```

两次构建输出完全一致：

| Artifact | SHA-256 |
| --- | --- |
| Codex plugin ZIP | `2bf3a1c77e6c87561d0800656f8fec7d48ed2013221eebf1e8542ff9459d53dd` |
| Portable ZIP | `9875c4c8438ea8f6a5040fa547a6973c4b59754335ba129267547bb02f47744b` |
| Command manifest | `c9decee7a03672d2aa60928011dd65a06aa5513918d3e6e1bd4f2fd92b3ff17f` |
| Installed descriptor | `afa61568595e78d8c5075e500aefe8bc2d62d41b48c71e3364c66d04e1bb8112` |
| Release manifest | `23cfb828930f79280029d75503fce62637525c1f5fc3509fff0029fa7d174042` |

这证明固定 source commit、固定时间戳、稳定文件排序和 `zip -X` 产生可重复发行摘要。builder 同时检查 packaged inputs 必须与 HEAD 匹配。

## Diff 与 Worktree 保护

三个仓库分别执行：

```text
git diff --check
```

- Hypo-Workflow: **PASS**
- Codex-VSP: **PASS**
- VSP-Open-Code: **PASS**

验证前存在的 dirty worktree 被完整保留：

- Hypo-Workflow 的 C21/G22 `.pipeline`、contracts、dist 和历史清理状态未被 reset/clean。
- Codex-VSP 的 `.pipeline` sidecars、Host Contract 改动及 legacy 文件删除状态仍在。
- VSP-Open-Code 的本地 config/AGENTS、TUI/Workflow 改动、受控删除和 `temp/` 状态仍在。
- 两次 release build 只重建既定生成物，摘要与构建前 release manifest 一致；未引入额外 drift。
- 未读取、打印、复制或提交 OpenCode 本地凭据。

## 已关闭问题

- 发行 `source_commit` 从旧 HEAD 假绑定修复为真实 `225e45…`，builder 对 dirty packaged inputs fail closed。
- Portable ZIP 现在内嵌全文件 checksum manifest，OpenCode 有真实 archive install/update 入口和 previous rollback。
- 两个宿主通过 installed descriptor/release binding 消费命令清单，不依赖 sibling source 作为生产默认路径。
- 两个宿主递归拒绝 sensitive、unknown 和损坏 projection 字段。
- Codex palette 旧 `/hw:status` 断言已更新。
- Bootstrap activation 在同一 transaction 中包含 fail-closed projection。
- ZIP 元数据已标准化并通过双构建摘要稳定性验证。

## 剩余风险

- Cargo 输出保留少量既有 dead-code warning，不影响 G22 correctness，但后续常规维护可清理。
- 本轮只验证本地 release artifacts 和临时安装根；远端 push/tag/release、真实用户目录安装与 Hook trust 更新仍需各自显式授权门禁。
- OpenCode 完整 prompt/tool/compaction/worker Hook 自动化按 Design 延期，不属于本轮缺陷。
- 三仓仍是预期 dirty worktree；最终提交、发布和目标环境更新必须保持精确文件范围，不能混入 `.pipeline` 本地 sidecar 或凭据。

## 最终判定

**GREEN：G22 可进入独立 audit/verification 收口。**

测试侧没有发现阻止验证的剩余 correctness、发行完整性或跨仓库集成问题。
