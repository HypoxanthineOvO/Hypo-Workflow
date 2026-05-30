# C17-M2 Test Revision Evidence

## 修改原因

旧测试 `project notification dispatcher wrapper pins Volta Node path for cron` 要求 `scripts/project-notification-dispatcher.sh` 包含本机硬编码路径 `/home/heyx/.volta/bin`。这与 C17-M2 目标冲突：`core/src` 和 `scripts` 中不应再包含 `/home/heyx` 字面量。

Implement worker 已将 dispatcher wrapper 的 cron PATH 改为从运行时 `HOME` 派生，旧测试契约因此过时。本次 revision 只修正测试契约，不修改生产代码、CLI、scripts、docs、state/log/progress/continuation。

## 变更断言

修改文件：

- `core/test/project-notifications.test.js`

新的测试契约：

- dispatcher wrapper 仍必须保留 cron 可用的 local/Volta bin PATH 前缀语义；
- 断言脚本包含 `${HOME}/.local/bin:${HOME}/.volta/bin`；
- 断言脚本保留 `/usr/local/bin:/usr/bin:/bin` fallback；
- 断言脚本不包含 `/home/heyx` 字面量；
- 保留 `project-notifications dispatch` 和 `--confirmed` 行为断言；
- 没有降低为只检查文件存在。

## 验证结果

已运行：

```text
node --test core/test/project-notifications.test.js
```

结果：通过，6/6 tests pass。

已运行：

```text
rg -n '/home/heyx' core/src scripts
```

结果：无匹配。`rg` 退出码为 1，符合 no match 语义。

已运行：

```text
npm test
```

结果：仍失败，645 个测试中 644 pass、1 fail。失败项为既有/无关的 lifecycle log evidence 测试：

```text
not ok 371 - current lifecycle log validates real event families and statuses
location: /home/heyx/Hypo-Workflow/core/test/log-evidence.test.js:16:1
error: entries[797].status unsupported: completed_with_blocker
```

该失败涉及 `.pipeline/log.yaml` 与 `core/test/log-evidence.test.js`，均不在本次允许写入范围内；本次未修改这些文件。

## 未改生产代码声明

本次 test revision 仅修改：

- `core/test/project-notifications.test.js`
- `.pipeline/reviews/C17/M2/test-revision-evidence.md`

未修改生产代码、CLI、scripts、docs、state/log/progress/continuation。
