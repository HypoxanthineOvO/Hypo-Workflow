# C21-M5 Recovery Pack mixed-offset ordering RED evidence

- Worker: `/root/m5_pack_order_test`
- Role: independent test worker
- Recorded at: `2026-07-12T09:02:46+08:00`
- Verdict: `RED_READY`

## Behavioral contracts

新增 2 个 behavior-first case，均复用 M3 的真实 Recovery store、临时 workspace、Runtime/Continuation、Journal、Capsule、Pack seal 与 `previous_pack_ref` 链；没有新增或修改 fixture。

1. **跨 offset 时按绝对时刻排序**
   - ancestor: `2026-07-12T08:51:58+08:00`，即 `2026-07-12T00:51:58Z`
   - descendant: `2026-07-12T00:57:17.359Z`
   - descendant 的时间字符串按字典序更小，但绝对时刻更晚，并且 `previous_pack_ref` 指向 ancestor。
   - 期望 `selectLatestValidRecoveryPack` 与后续 restore planning 选择 descendant，恢复 descendant 的 `next_action`。
2. **绝对时刻相等时进入 ancestry tie-break**
   - ancestor: `2026-07-12T08:51:58+08:00`
   - descendant: `2026-07-12T00:51:58Z`
   - 两者字符串不同且字典序相反，但 `Date.parse(...)` 相等；descendant 的 `previous_pack_ref` 指向 ancestor。
   - 期望不按 timestamp 文本或 digest 决胜，而按 ancestry 选择 descendant。
3. **损坏 descendant 继续回退**
   - 未改写既有 `newest corrupt Pack falls back to the previous valid Pack and replays Journal delta` 契约。
   - 该既有 case 与原 equal-Clock ancestry 两个 digest 方向的 case 均单独复跑为绿色。

## RED result

命令：

```sh
node --test core/test/recovery-pack.test.js
```

结果：`15 total / 13 pass / 2 fail / 0 skipped`。全部 13 个既有测试保持绿色；失败仅来自本轮新增的两个 mixed-offset selection 断言。

精确失败：

| Contract | Expected descendant Pack ID | Actual selected ancestor Pack ID |
|---|---|---|
| later absolute instant | `d729bb5ca522764402c8331a892f82b3ad596dce437dc0f54312c4096718fe97` | `85d1f704ed0c07c6eba564b85c62ad7c4293e0c5f24b9a5b1f961996b0de9f95` |
| equal absolute instant + ancestry | `51ec4c2fc869deeb760dc816af42cc400e56fbd4d78ab74e68881826f6d20d82` | `ac2dcabaf1969f08203e9eeb1732ee5b3a2ee9ae12bb71e9a90259a9e108843b` |

这证明当前选择逻辑把 ISO-8601 timestamp 文本顺序误当成绝对时间顺序；第一条新增 case 在 selection 断言处即停止，因此其后 restore `next_action` 断言将在实现修复后继续约束端到端结果。

## Existing-contract preservation

命令：

```sh
node --test --test-name-pattern='newest corrupt|equal-Clock' core/test/recovery-pack.test.js
```

结果：`4/4 pass`：

- corrupt newest descendant 回退 ancestor：通过；
- 相同 timestamp 字符串、descendant digest 较低：通过；
- 相同 timestamp 字符串、descendant digest 较高：通过。

## Scope and hygiene

- 修改范围仅为 `core/test/recovery-pack.test.js` 与本证据文件。
- 未查看或修改 production implementation。
- 未修改其他 test、fixture、manifest、Runtime、Memory、Snapshot、Record Store、legacy `state.yaml` / `cycle.yaml` / `log.yaml` / `PROGRESS.md`。
- 未执行 staging、activation、rollback、retention apply 或 delete。
- `git diff --check -- core/test/recovery-pack.test.js .pipeline/reviews/C21/M5/pack-order-test-evidence.md`：通过。
- 因 M3 test 文件在当前工作树中整体仍为 untracked，另以 `git diff --no-index --check /dev/null core/test/recovery-pack.test.js` 检查完整文件；除 `--no-index` 表示存在内容差异的预期 exit `1` 外，无 whitespace error 输出。
- authority zones changed: **none**。

## Implementation handoff

实现应将合法 Pack 的 `sealed_at` 解析为绝对时刻再比较。仅当绝对时刻相等时，才进入既有 `previous_pack_ref` ancestry tie-break；较新的候选损坏时，仍必须保留既有的 valid ancestor fallback 和 `rejected_packs` 证据。
