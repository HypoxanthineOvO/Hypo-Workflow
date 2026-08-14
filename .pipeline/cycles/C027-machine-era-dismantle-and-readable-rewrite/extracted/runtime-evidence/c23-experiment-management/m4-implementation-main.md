# C23 Revision 1 M4 Implementation Evidence

- Worker ID: `c23-m4-implementation-main`
- Role: `implement`
- Milestone: `M4`
- Verdict: `GREEN_FOCUSED`
- Workflow Runtime/Continuation advancement: none

## Task Assessment

- Complexity: `material`
- Uncertainty: `high`
- Oracle strength: `mixed`
- Blast radius: `authority_and_recovery`
- Reversibility: `reversible`
- Hazards: `runner_authority`, `session_collision`, `stale_write`, `scientific_misclassification`, `receipt_misattribution`
- Semantic routing class: `critical`
- Reason codes: `weak_scientific_oracle`, `long_run_recovery`, `receipt_gated_review`, `concurrent_authority_write`

M4 不是进程管理器。Core 编译并验证监督描述、记录宿主已经观察到的运行证据，并在科学结论可疑时保留人工确认门；Agent 或宿主负责真正执行命令、轮询 tmux、读取论文和发起重跑。

## Change Summary

新增 `core/src/experiment/supervision.js`，公开：

- `compileExperimentSupervisionPlan(input)`：为 foreground 或 tmux 运行生成确定性、只读的 host-owned descriptor。descriptor 绑定 run identity、原始 `uv run --frozen` 命令、输出、poll interval、checkpoint 和 interruption policy，并明确 `workflow_is_runner: false`。
- `compileExperimentScientificReview(input)`：把 Attempt metrics、metric checks、论文引用、候选原因和结论绑定为带 hash/id 的 review。`reasonable` 可记录为非人工确认结论；`suspicious` 和 `inconsistent` 必须保持 `pending_confirmation`。

Experiment Store 新增严格入口 `recordSupervisedRun` 和 Receipt-gated `resolveScientificReview`：

- `interrupted` 是 terminal Attempt；恢复必须创建 same-identity child Attempt，显式引用 interrupted parent。
- checkpoint unsupported 时固定 `restart_from_scratch`；supported 时 checkpoint artifact 必须被 output refs 保留，resume argv 必须扩展原始命令并绑定该 artifact。
- completed supervision 必须有 exit code `0`，并验证 log/config/metrics 三个声明输出；所有额外 verified refs 也必须被 Attempt 保留。
- supervision 首末事件与 Attempt start/finish 时间 exact-match；恢复 child 不能早于 parent interruption。
- review observed metrics 必须与 Attempt outcome metrics canonical-equal，review 时间不得早于 operational completion。
- 论文不一致至少保留一个 paper reference 和两个不同类别的候选原因；implementation 只能是 hypothesis，AI 不能用 `implementation_error_confirmed` 静默定罪。
- suspicious/inconsistent review resolution 的 target、decision、rationale、actor 和 review hash 全部由 Receipt context 绑定；resolution time 不得早于 review。

Workspace transaction write 新增可选 `expected_hash` CAS。Experiment create、append 和 Receipt transitions 对 Runtime/Continuation 使用 existing/missing preconditions；Receipt reserve 后还会重新读取 Experiment authority。这样并发 Attempt 无论出现在 initial-read 到 reserve，还是 fresh-read 到 transaction prepare 的窗口，都不能被 stale write 覆盖。

## Frozen Bindings

- `core/src/experiment/supervision.js`: `976f3f368fcbc4362659a137709e71a55708d0e4e5ac4e88837f06aac7c5f53f`
- `core/src/experiment/index.js`: `a2232f20462587a5205964dfc2ddd25532d09712927990e3efee3d45b3c6d6c2`
- `core/src/workspace-store/transaction.js`: `4a432586659c1ba9053d6229987a9590f78935df2f9af35d9c8234ae18c1c75a`
- `core/src/index.js`: `ea6c73e9d05bb45cf263984fdce11f734135d804b9ac0aa67c369325fa26ce45`
- `core/test/c23-m4-experiment-supervision.test.js`: `2f3f5968cc782d058b6071efbc51f7e10e5480246a98b88e812dfbcd0ecae98e`
- `core/test/fixtures/c23-m4/supervision-review.json`: `039f042f6670c71ed829d848c562c57506d0dce0c219656e706ef903466e8d5f`
- `tests/regression-catalog.json`: `951258d90d78d5c0fe5958c269299f8045851a77ca63cc1ba403cc92a35e2f1c`

## Modified Production Modules

- `core/src/experiment/supervision.js`
- `core/src/experiment/index.js`
- `core/src/workspace-store/transaction.js`
- `core/src/index.js`

No scheduler, daemon, PID authority, plugin cachebuster, provider/model mapping, install state, legacy lifecycle authority, or VSP-Codex file was added or changed for M4.

## Test Design And Validation

The maintained M4 contract exercises:

- pure foreground/tmux plan compilation and deterministic session isolation;
- a real short foreground process and a real tmux smoke executed only by the test harness, with session cleanup and existing-session preservation;
- checkpoint resume and restart-from-scratch interruption paths;
- interrupted parent to restarted child lineage, event sequence, time, descriptor, and output evidence;
- operational completion and retained output checks;
- metric/review/output/time binding and persisted rehash attacks;
- Receipt target substitution, replay, early-time preflight, authority-activated recovery, forged actor recovery, and concurrent state drift;
- strict-entry `undefined` bypass rejection;
- no-runner, legacy isolation, syntax, catalog, diff, transaction residue, and M1-M3 regressions.

Pre-freeze independent results:

- M4 maintained: `25/25` PASS after completing the Finding 11 concurrency-test helpers.
- M1-M4 plus Record/Receipt/Runtime/workspace transaction: `119` top-level / `137` total PASS in the audit run.
- Catalog dry-run: `56` maintained / `172` all.
- Syntax, fixture/catalog JSON, `git diff --check`, no-runner static scan, and transaction residue: PASS.

Final independent retest and audit evidence are intentionally separate and are produced only after the frozen bindings above remain unchanged.

## Problems Encountered

Independent test and audit found and the implementation role repaired eleven blocking boundaries:

1. tmux session collisions across Experiments and persisted session substitution after rehash;
2. checkpoint artifact not retained in output refs;
3. review observed metrics not bound to Attempt metrics;
4. supervision/review/resolution timestamps outside the Attempt timeline;
5. restarted child not fully bound to its interrupted parent;
6. unretained operational verified refs;
7. forged resolution actor accepted by Receipt recovery;
8. checkpoint resume argv drift across parent/child;
9. explicit `undefined` bypass of the strict Store entry;
10. Receipt early-time failure after reservation;
11. stale concurrent Experiment writes overwriting newly recorded Attempts.

The implementation kept the verified M3 `recordRun` path compatible and introduced `recordSupervisedRun` as the strict M4 entry instead of retroactively invalidating historical M3 outcome fixtures.

## Expected Result

An Agent can describe and monitor one long run without Workflow becoming a scheduler, record an interruption without losing the run identity, resume from a retained checkpoint or explicitly restart from scratch, and distinguish operational completion from scientific confidence. When results differ from a paper or look suspicious, the durable state says what metric differed, which references and candidate causes were considered, and that an operator decision is still pending; it does not silently claim the implementation is wrong.

## Residual Risks / Follow-up

- Core validates declared evidence and bindings; it does not execute the descriptor, attest that artifacts exist on a server, or prove that a paper threshold or AI scientific interpretation is correct.
- Same-identity reruns still share the M3 logical output directory and artifact refs do not yet carry content digests. The host must preserve/trash old outputs before rerun; M5 status must expose this risk.
- Session identity binds machine-recorded project/Experiment/Attempt semantics, but two same-identifier clones on one host remain a possible collision. The normal deployment uses one clone per server; a later host adapter may add a workspace alias.
- M4 structured terminal failure remains limited to the M3 host-memory taxonomy. Generic nonzero exits, Python exceptions, GPU OOM, and other failure classes require a later taxonomy extension; retry policy remains Agent-owned as requested.
