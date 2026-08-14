# C23 Revision 1 M5 独立最终复测

- Worker ID: `c23_m5_test`
- Role: `test` only
- Milestone: `M5`
- Completed at: `2026-07-18T19:05:39+08:00`
- Verdict: `GREEN`
- Production/test freeze drift: `none`
- Workflow Runtime/Continuation advancement: `none`

## 结论

M5 的独立最终复测通过。源码现在提供 `/hw:experiment`、content-addressed immutable Experiment events、按项目物化的 status projection，以及只读该 projection 的 bounded status view。它可以直接概括默认与 contextual baseline、machine/GPU/CUDA、dataset/scene 或 trace 含义、单轴与交叉 scan、Attempt outcomes、资源异常、待确认科学结果、trash/restore、same-identity 输出覆盖风险和 next actions，不需要在普通状态查询时扫描 Experiment authority 或结果目录。

本轮真实验证了本地三 clone Git-like event union、logical conflict fail-closed、250-event bounded query、M1-M5 与完整 maintained Core。它没有验证真实 GitLab、SCP、NeRF、AceSim、GPU 或大 trace；Experiment Skill 已明确保留该 Pilot 边界。

## 技术与测试方法

### Immutable events 与 deterministic rebuild

- `appendEvent` 生成 `event-<semantic-hash>`，同内容 dedupe，同 `event_key` 的分叉需要 explicit supersession，否则零写入拒绝。
- A/B 两个本地 clone 从共同 base 各自追加不冲突 event files；Git merge 后 `rebuild` 在不同到达顺序下产生 byte-equivalent status。
- 第三个 clone 追加同 logical key 的不同内容；Git 文件层可以 union，但 status rebuild fail closed，最后一个有效 projection 不被替换。
- manifest project drift、未知 event type、absolute/traversal source ref、重复 Attempt source、event path/content drift均受约束。

### Instant 与 bounded status

- event 目录删除后，`readStatus` 仍只读固定 materialized projection，证明普通状态查询不依赖 tree/result rescan。
- projection 持久化最多 `MAX_ROWS`；`rebuild(limit=1)` 后仍可 `readStatus(limit=20)`，显示限制不会永久丢弃 projection rows。
- bounded view 同时限制 baselines、machines、datasets、scans、attempts、pending confirmations、exceptions、next actions、retention、detail refs、source event IDs 和 table rows，不只截 table。
- 250 个 next actions、query limit `5` 时返回 newest actionable entries，整体 JSON 小于 64 KiB；`view.totals` 与 `truncated_fields` 解释省略内容，`source.event_count` 保留总数，`event_ids_digest` 绑定全量排序 ID 集合。
- re-signed projection 的 `rows > 200`、`rows > row_limit`、`total_rows < rows.length` 均拒绝，不能靠重算 public hash 绕过 bounded contract。

### Experiment semantics 与 public surface

- Fixture 覆盖 QV100 300K default baseline、77K contextual baseline、machine/GPU/driver/CUDA、Rodinia trace meaning、frequency scan、L1/L2 cross scan、completed/failed/pending-confirmation outcomes、host-memory boundary、trash/restore 与 next action。
- Attempt source identity按 `experiment_id + attempt_id` 绑定；不同 Experiment 可安全复用 local Attempt ID。
- source Registry、Root Skill、Codex filesystem discovery 与当前文档公开 10 个 routes，并可发现 `/hw:experiment`。
- Host Contract v1 与 installed release artifact继续保持 frozen 9-command surface；本 Milestone未重建 release artifact、未重装 plugin、未更新 cachebuster。
- Experiment Skill validator通过，并明确 Workflow/Core不是 runner，真实命令、tmux polling、SCP 和重跑仍由 host Agent执行。

## 验证结果

- M5 focused: `13` top-level cases, `19/19` total PASS。
- M1-M5 + Record + Receipt + Runtime + workspace transaction + router/discovery: `155` top-level cases, `205/205` total PASS。
- Full maintained Core: `57` files, `420` top-level cases, `582/582` total PASS。
- Skill validator: `Skill is valid!`。
- Production/test `node --check`: PASS。
- Fixture、regression catalog、plugin/release JSON parse: PASS。
- Full repository `git diff --check`: PASS。
- `.pipeline/runtime/transactions/` descendants: `0`。
- M5 Core static boundary: no `node:child_process`, process spawn, scheduler, tmux runner or background authority。
- Legacy authority、Delivery Runtime/Continuation、plugin metadata/version、Host Contract artifact、cachebuster:未由 test worker修改。

## RED 到 GREEN

最小 RED 最初是 `1 pass / 2 fail / 4 skip`，准确指出 Status Store API 和完整 Experiment Skill尚未落地。第一版 production 使 happy path变绿后，独立 pre-freeze检查又固化并关闭以下问题：

1. `rebuild` 的小 display limit 曾永久截断 projection，导致后续查询无法扩宽。
2. Attempt uniqueness 曾只使用 bare `attempt_id`，错误冲突不同 Experiment 的同名 Attempt。
3. 未知 event type、manifest project drift 与 unsafe source refs 曾可进入错误路径。
4. re-signed projection 曾可绕过 row-count 与 row-limit invariants。
5. status 曾只限制 table，250-event view 仍返回 147,648-byte 巨大 JSON，并优先保留最旧 action；修复后所有 buckets bounded且保留最新项。
6. 三个 current-source discovery tests曾把公开面锁为 9；它们已校准为 10，Host Contract v1 frozen test保持 9。

测试没有通过删除、skip 或放宽上述边界获得 GREEN。

## 测试资产

- `core/test/c23-m5-experiment-status.test.js`
- `core/test/fixtures/c23-m5/status-events.json`
- `core/test/adaptive-plan.test.js`
- `core/test/c21-m8-surface-cleanup.test.js`
- `core/test/command-skill-root-routing.test.js`
- `tests/regression-catalog.json` 的 maintained `C23-M5` entry

## Freeze SHA-256

- `core/src/experiment/status.js`: `1bf010f5be7a66540d024c6a427fe1e32a87006f51a17c2c0f734dc163ff03a4`
- `core/src/index.js`: `1fb3617aea7896555e3ae7533a6192d99aa073b93c1826b887238280ceb0e1b0`
- `core/src/commands/index.js`: `03a30a0f9ce7f545396090cb44fd4924e38d73d9a6ae3e42098bb381025fb9a6`
- `SKILL.md`: `62777c795edcc3bdb40127ca7d458c83d697660e3183889cec7f2a0ccdbffdd4`
- `skills/experiment/SKILL.md`: `81b5143860532a697d9156fc6491ccdd2a76728f43fb039ae50f9854c412987a`
- `skills/experiment/agents/openai.yaml`: `c0d92b3ff6a2486cbcab09f938a967d75f502cc6e4a00b1062154d1c5d65a71c`
- `README.md`: `067c5bccdb053b32a1cbe232ef2235868a8246293979a9f099b06017231117eb`
- `README.en.md`: `b18fb66f88ff947cf930a24c344f61926306499ed61659a8bcf2c5f5c20c7cc1`
- `docs/reference/commands.md`: `11a8e18ff0aad305826657f63bd57fad7622a4ddf605a52ca3aaf72b8b229db3`
- `docs/en/reference/commands.md`: `6749ab7a7b324dda5aa996a5c54e00e47415872bdc7125c4e47e9dd3e554d398`
- M5 test: `3ec7a2204c7e77f346f451c32566777ff89c8638d7d5fac1a0cb99f28a8a721d`
- M5 fixture: `2125254ea5f5e835fcbd3b10446a29fdeaf56203b8f3806b0fca25a78a69021a`
- adaptive-plan test: `48e13747bd80b5a21d2fa76d6035e764a26129c04cbda6a97ccaad53d4b29b9c`
- C21 M8 surface test: `a711a26c93f574bdad7e40434992fc55d602d54bcd1153d5fa45553673c8ec09`
- command skill-root test: `44059f56273f0703e69e11288ecb8d52f5f20c2d7be0d9cb552a147cb7469802`
- regression catalog: `2eea95a1d4e2e1a82e5da81da2160892121f50c1f54909f07bea3975ab89a0bc`

## 预期用户效果

用户问“现在实验怎么样”时，Agent先给 baseline、hardware、dataset meaning、scan purpose、outcome counts、exceptions/pending review与next actions的紧凑答案和表格；只有用户要求 drill-down时才跟随 detail refs。两台机器各自 clone后可合并 immutable events并显式 rebuild projection；冲突先整理差异交给用户或获得 delegated choice，不静默覆盖。

## 问题、风险与后续

- 真实 NeRF、AceSim、GPU、论文指标、GitLab remote、SSH/SCP和大 trace未运行；需要后续真实项目 Pilot Goal验收。
- 本地 Git test只提交 immutable event files再 rebuild derived projection。若用户把两个 clone各自生成的 projection一起提交，Git可能先报告 derived-file conflict；Skill必须以 immutable events为合并依据并重建 projection。
- Event type、identity、path、secret与projection invariants有强 oracle；event payload中科学说明是否正确仍是 weak oracle，依赖M2 knowledge、M4 pending confirmation与用户判断。
- Rebuild按项目 event store线性读取；250-event bounded view已验证，但数万/数十万 events的耗时和磁盘规模未做性能测试。
- Status只反映已记录的事实。Host Agent若完成运行却未 append event/rebuild，projection会陈旧；Skill已要求 local write和Git union后显式 rebuild，但Core不是后台 watcher。
