# C23 M5 独立代码审计

- Worker ID: `c23-m5-audit`
- Role: `audit`
- Milestone: `M5`
- Verdict: `REMEDIATION_REQUIRED`
- Severity summary: `P0=0`, `P1=2`, `P2=3`
- Production/tests/docs/Skills edits: `none`
- Workflow Runtime/Continuation advancement: `none`

## 结论

M5 的主路径设计已经成立：Experiment event 是按项目存放的 content-addressed immutable file；普通 `readStatus` 只读取 manifest 与一个 materialized projection，不扫描 repository、results 或 event tree；显式 `rebuild` 才读取单项目 event directory；两/三 clone union、logical conflict fail-closed、CAS transaction、same-identity retention、trash/restore、pending scientific confirmation、十路由 source surface 与冻结九路由 Host Contract v1 都有可运行证据。

但本轮不能判定 PASS。独立对抗验证确认两个 P1：一是可重签的 derived projection 能绕过内部 schema、secret 与 64 KiB view budget；二是 Attempt identity 校验允许 `source_attempt_id` 取代必需的 `attempt_id`，并允许同一 Experiment 出现两个相同可见 Attempt ID。这两个缺口都能让普通“现在实验怎么样”查询返回被伪造、过大或身份含混的状态，因此 M5 必须 remediation 后再由 fresh audit identity 复审。

## Findings

### P1-1: re-signed projection 可伪造语义、泄露 secret-like 内容并绕过 64 KiB view budget

位置：`core/src/experiment/status.js:377`、`:412`、`:633`、`:649`、`:654`。

`normalizePersistedStatus` 验证 top-level key 集与公开 `projection_hash`，但 nested contract 只覆盖 `table_model` 的部分不变量和 `source.event_ids`。它没有对 `headline`、`outcomes`、各 semantic buckets、`detail_refs`、`source` 的 exact nested keys、cross-field counts 或 raw-secret content 做完整验证。公开 canonical hash 是 checksum，不是独立授权；调用者重算 hash 后，内部不一致仍会被普通查询信任。

`sliceStatusRows` 在 view 超限时会 compact 并逐步把 `effectiveLimit` 降到 0；最后对 aggregate 直接返回，没有再次检查最终 JSON byte size。aggregate 又保留未经约束的 `headline`、`outcomes.counts` 与 `source` extra fields，因此 64 KiB contract 可被绕过。

独立 reproduction：

1. 在临时 current workspace 编译一个合法的单 event projection。
2. 删除 `projection_hash`，注入 70,000-byte `headline` extra field、把 `outcomes.counts.completed` 从真实值改成 `999`，并在 `source` extra field 放入 synthetic secret-like marker。
3. 使用公开 `canonicalHash` 重签并调用 `readStatus(limit=1)`。
4. 实际结果：调用成功；返回 `71,320` bytes；伪造 count、70 KB headline 和 secret-like marker 均原样可见。

用户影响：损坏、手工编辑或 merge 后被重签的 projection 可让 status 问答给出错误 outcome，暴露本不应进入 Experiment status 的敏感内容，或产生超过声明上限的巨大 JSON。由于普通查询按设计不回扫 events，这个 projection 正是用户看到的事实面。

必需 remediation oracle：

- 对所有 persisted projection nested structures 使用 exact schema，拒绝 unknown fields、错误类型、不安全 refs、raw secrets 与 hidden reasoning。
- 校验可从 projection 自身证明的 cross-field invariants，例如 outcome counts 与 attempts、headline counts 与 buckets、source count/index、totals/truncation 的一致性。
- 对加入返回 `projection_hash` 后的最终 view 强制 `< 64 * 1024` bytes；aggregate fallback 也必须检查，无法安全压缩时 fail closed。
- 新增 re-sign adversarial variants，至少覆盖 headline/source unknown field、伪造 outcome count、secret-like field、oversized aggregate 和最终 hash 边界。

### P1-2: Attempt identity alias 绕过必需 ID 与同 Experiment 唯一性

位置：`core/src/experiment/status.js:475`、`:478`、`:485`、`:876`。

`assertUniqueAttemptSources` 的错误契约写明 Attempt event 必须包含 `experiment_id` 和 `payload.attempt_id`，但实际 identity helper 返回 `payload.source_attempt_id ?? payload.attempt_id`。因此：

- 只有 `source_attempt_id`、没有 `attempt_id` 的 `attempt_recorded` event 会被接受，status entry 没有可见 Attempt ID。
- 同一 Experiment 的两个 event 可都显示 `attempt_id="same-visible-id"`，只要分别给不同 `source_attempt_id`，uniqueness map 就认为它们不同并接受。

独立 reproduction 实际结果：`missing_attempt_id_accepted=true`；第二组 projection 返回两个相同的可见 `attempt_id`，outcome counts 仍把二者分别计数。

用户影响：Attempt 维度不再可唯一解释；outcome、retention relationship、scientific review 与 detail provenance 可能指向不同 identity。Git union 仍 deterministic，但会 deterministic 地物化错误状态，而不是 conflict fail closed。

必需 remediation oracle：

- `attempt_recorded` 必须有 non-empty canonical `payload.attempt_id` 和 `experiment_id`。
- 同一 Experiment 按 `attempt_id` 唯一；不同 Experiment 继续允许复用 local Attempt ID。
- 如果兼容 `source_attempt_id`，它存在时必须与 `attempt_id` 相等，或使用明确且不可混淆的独立字段语义，不能替代 status identity。
- 测试覆盖 missing `attempt_id`、divergent alias、same-Experiment duplicate、cross-Experiment same local ID。

### P2-1: 超过 200 rows 时 `table_model` 保留最旧而不是最新状态

位置：`core/src/experiment/status.js:154`、`:180`。

rows 按时间升序排序后使用 `rows.slice(0, limit)` 持久化。250 个顺序 next-action events、materialization limit 200 的独立构造得到 `Action 0 ... Action 199`；最新的 `Action 200 ... Action 249` 不在 `table_model`。semantic `next_actions` bucket 仍保留最新 action，所以现有测试只检查 bucket 而没有发现 table stale。Experiment Skill 明确要求把 `table_model` 渲染给用户，这会让 compact table 与同一个 status 的 next actions 相互矛盾。

建议 remediation：为当前状态表保留 newest/actionable rows，并断言 250-event projection 的 bounded table 包含 `Action 249`；如需保留 default baseline，可用明确优先级而不是无条件 oldest-first。

### P2-2: README 链接的 User Guide 仍公开旧平台与 removed/deferred 命令

位置：`docs/user-guide.md:9`、`:20`、`:25`，`docs/en/user-guide.md:11`、`:22`、`:27`。

当前 README 把这两份文件作为 User Guide，但它们仍宣称 Claude/OpenCode/Cursor/Copilot/Trae 是安装面，并指导 `/hw:cycle new`、`/hw:start`、`/hw:status`、`/hw:pr`、`/hw:docs repair` 等旧 public-command 用法；它们没有 `/hw:experiment`。这与 Root Skill、current command reference 和 current Codex guide 的十路由 source / 九路由 frozen release boundary 冲突。现有 route/docs tests 只覆盖被选中的 README、command reference 和 Codex guide，未覆盖 README 实际链接的 User Guide。

建议 remediation：更新或明确标记 User Guide 为 historical；current 用户入口只能广告十个 source routes，并把 internal/deferred/removed route 作为不可直接执行的行为说明。

### P2-3: public Experiment Skill 的 pilot 声明遗漏 real GitLab/SCP

位置：`skills/experiment/SKILL.md:44`。

Skill 已明确 real NeRF、AceSim、GPU 和 paper-project behavior 未验证，这是正确边界；implementation/retest evidence 也明确 real GitLab、SSH/SCP 未验证。但 public Skill 没有包含 GitLab/SCP，旧 User Guide 反而宣称 GitLab MR 能力。approved M5 outcome 要求 real GitLab behavior 必须声明未验证。

建议 remediation：在 public Experiment Skill 的 pilot boundary 中显式加入 real GitLab remote、SSH/SCP 和 large-trace/long-run 未验证，不把 local multi-clone Git test 表述成 remote validation。

## 技术审计范围

- 完整审阅：`core/src/experiment/status.js`、M5 fixture/test、M5 implementation/retest evidence。
- 边界审阅：Experiment M1-M4 Store、knowledge、runs、supervision exports 与 identity/lifecycle/Receipt/CAS/path/secret 相关实现和测试。
- Public surface：Root Skill、Experiment Skill、Guide Skill、agent metadata、command registry/Core exports、README 中英双语、current command reference、current Codex guide、README 链接的 User Guide。
- Release boundary：`contracts/host/v1/command-manifest.json` 仍为 9 commands且没有 `hw:experiment`；M5 source discovery 为 10 routes。未修改 hooks、cachebuster、plugin metadata、Host Contract、dist/redskill package 或 release artifacts。
- Security/adversarial：manifest project isolation、event path/content drift、symlink/path traversal、secret input、projection re-sign、byte budget、Attempt identity、transaction residue。

## 独立验证结果

- M5 focused：`13` top-level，`19/19 PASS`。
- M1-M5 + Record/Receipt/Runtime/workspace transaction/router/discovery combined：`155` top-level，`205/205 PASS`。
- `node --check`：M1-M5 Experiment production modules与 M5 test全部 PASS。
- `git diff --check`：PASS。
- `.pipeline/runtime/transactions/` descendants：`0`。
- Static runner boundary：Experiment production没有 `node:child_process`、process spawn、scheduler 或后台 runner；tmux 仅作为 validated supervision protocol data。
- Existing freeze hashes：`status.js`、M5 test/fixture、Root/Experiment Skills与 current docs均和 `m5-retest.md` 列出的 freeze SHA-256 一致。
- Adversarial re-signed projection：FAIL EXPECTATION，实际被接受并返回 `71,320` bytes。
- Adversarial Attempt identity：FAIL EXPECTATION，missing ID和duplicate visible ID均被接受。
- Adversarial 250-row table recency：FAIL EXPECTATION，持久化最旧 `0..199` 而非最新 `50..249`。

现有 suite 全绿不推翻 findings；它证明目前 oracle 只覆盖了 row-count re-sign variants、正常 Attempt dimension和 semantic bucket recency，没有覆盖上述具体反例。

## 已确认通过的用户效果

- 正常 status query 不扫描 repo/results/events，只读取项目 projection；删除 event tree 后查询仍可工作。
- rebuild-time display limit 不会永久把 semantic buckets 截到请求 limit，后续 query 可扩宽到 materialized ceiling。
- Fixture 能显示 default/contextual baseline、machine/GPU/CUDA、dataset/trace meaning、单轴/交叉 scan、completed/failed outcome、host-memory exception、pending scientific confirmation、next action、same-identity output overlap、trash/restore lineage。
- 两 clone union 的不同到达顺序产生相同 projection；第三 clone 同 logical key 分叉在 rebuild 前零写 fail closed，最后有效 projection保留。
- `/hw:experiment` 是 source public nonlinear lane；Workflow/Core 不是 runner。
- Host Contract v1 保持冻结九路由，没有把 source-only `/hw:experiment` 写入 installed release contract。

## 问题与残余风险

- 真实 NeRF、AceSim、GPU server、large trace、论文复现、GitLab remote、SSH/SCP 和多周运行均未验证；本审计不把 fixture、本地 tmux protocol或 local Git clones当作真实 pilot。
- 本轮未独立跑完整 `582/582` maintained inventory；复测 evidence 已记录该结果，本 audit 独立运行的是高信号 `205/205` combined set。
- projection 作为 derived local checksum 无法防止有完整 workspace 写权限的恶意主体伪造一套完全自洽的数据；本轮 P1 要求至少让 malformed/internal-inconsistent re-sign fail closed。若威胁模型需要真实性，还需单独可信 binding，不能把公开 hash称为签名。
- projection 本体仍随 event 数量增长，普通 query 虽不扫描 event tree，仍需读取/parse 整个 projection；250 events 已验证，数万/数十万 event 的性能与磁盘规模未测。
- external Git union 后 projection 在显式 rebuild 前可能 stale；Skill已有 rebuild要求，但没有 watcher。
- 同 workspace 多进程并发 append 的 crash/recovery interleaving未做独立 stress test；当前 transaction CAS与 pending recovery tests通过。
- 工作区本身是大范围 dirty/untracked状态；本 audit 保留全部既有变更，只新增本报告。

## 复审门槛

修复两个 P1并固化相应 RED->GREEN tests后，使用 fresh audit identity 重跑 focused/combined/adversarial verification。P2 table recency应与 P1 remediation一并关闭；User Guide与GitLab/SCP pilot wording至少需要在 M5 最终对外声称前校准。
