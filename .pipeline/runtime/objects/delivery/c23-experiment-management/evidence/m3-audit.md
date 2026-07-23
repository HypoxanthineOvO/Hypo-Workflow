# C23 Revision 1 M3 最终独立审计

- Worker ID: `c23-m3-audit-luna`
- Role: `audit` only
- Milestone: `M3`
- Task assessment: complexity `material`; uncertainty `medium`; oracle strength `mixed`; blast radius `authority`; reversibility `reversible`; hazards `scientific_reproducibility`, `run_identity_conflict`, `path_escape`, `secret_exposure`, `resource_exhaustion`
- Verdict: `PASS`
- Workflow Runtime/Continuation advancement: none

## Findings By Severity

### P0/P1: none

冻结后的 M3 实现没有剩余阻断项。Run specification 的身份、命令、输出、扫描设计、资源证据和持久化 Attempt 之间形成了可重算的确定性约束；新写入和 persisted read 都会拒绝身份替换、跨 Experiment/Project 错绑、裸状态、输出越界以及错误的 OOM 证据。Core 只编译和记录数据，不启动进程，也不探测服务器外部路径。

### P2: scan expansion 仍是 eager materialization

`expandExperimentScan` 会先构造轴的笛卡尔积，再生成完整 `runs` 数组。当前 NeRF/AceSim fixtures 分别只有 3、8、6、8 个 runs，验证范围内没有问题；但极大的多轴输入可能消耗大量主线程内存。M3 没有 scheduler 或后台进程，因此这不是旧式后台扫描器问题的复发，也不阻断已批准的 fixture outcome。后续若真实 workload 出现超大设计，应增加显式 run-count 上限或分块计划，而不是让 Core 隐式启动 Worker。

### P2: reproducibility metadata 是绑定，不是外部 attest

Git commit/tree、dirty patch digest、`uv.lock` digest、driver/CUDA 和 machine external-location content id 都进入 `identity_hash`，但 Core 不调用 Git、不读取远端文件，也不验证机器当前状态。该边界符合 M3 的 data/authority 设计；真正执行前仍需 Agent 获取这些值并验证环境，M4/M5 再记录运行与状态证据。

### P2: `recordRun` 尚无专用逐阶段 fault matrix

`recordRun` 使用共享 workspace transaction，相关 transaction suite `19/19` 通过，且 M1 recovery suites `21/21` 通过；但 M3 尚未针对 `recordRun` 在 prepare/install/activation 各阶段建立专用故障注入矩阵。该缺口是恢复覆盖广度风险，不是已复现的数据丢失。

## 审计中关闭的问题

独立审计曾复现并推动实现角色关闭以下同范围缺陷；最终版本均已重新验证：

- resource limits 可以超过所选 machine 的 host/GPU capacity；现已 fail closed。
- base/fixed/axis/selection 可互相矛盾；现已验证参数所有权，selection 必须与 fixed parameter 一致。
- 不同 internal identity 可复用同一 readable `run_id`；现在新写入和 persisted read 都拒绝 alias。
- persisted Attempt 只验证 run spec 自身，未绑定 containing Experiment/Project，也可接受裸 `down`、缺失/越界 outputs 或错误 OOM；现在读取端重走完整 outcome 和 container binding 校验。
- 超长 run id、output filename 或 generated path 可超过常见文件系统限制；现在 component/full relative path 分别限制为 240/3800 UTF-8 bytes，并要求更短的 readable alias，不截断或追加 opaque hash。
- `uv run --frozen` 曾只检查 token 存在位置；M3 v1 现在只接受 exact `uv run --frozen` prefix。
- base argv 可提前拥有 bound flag 或 `--`，binding flag 也可使用非 canonical 形式；现在 canonical long-option grammar、重复 flag 和 option terminator 全部 fail closed。
- log/config/metrics 可指向同一文件，completed outcome 也可缺少声明输出；现在三者必须 distinct，completed Attempt 必须引用全部三个路径。
- negative numeric parameter 曾丢失符号并被显示成正数；现在使用 `neg-`，decimal 使用 `p`，`-77` 与 `77` 的 readable ID 明确不同。

这些修复均由 implementation 身份完成；本 audit 身份没有修改 production 或 test。

## 技术结论

### Run identity 和 command

`core/src/experiment/runs.js` 的 `compileExperimentRunSpec` 将以下信息纳入 canonical identity：

- repository ref、40 字符 commit/tree 和可选 dirty-patch artifact/digest；
- exact `uv run --frozen`、Python version 和 lockfile digest；
- machine/GPU/driver/CUDA/host memory 与 machine-specific external locations；
- dataset version/subset/scene 或 trace；
- structured argv bindings、secret refs、output layout、resource limits 和 sorted scalar parameters。

同一输入 byte-stable，caller input 不被修改。Compiled spec 被写入前会重构并重新哈希，修改 `identity_hash`、argv、output 或任何绑定字段都会拒绝。External absolute paths 只作为 metadata；不存在的路径可以正常编译，源码没有 `fs` probe 或 child-process import。

### Scan semantics

NeRF chair screening 按输入顺序产生三个 method runs，选中的 `re-grid-v2` 再扩展到全部 8 个 scenes；相同 chair run 在两个 design 中保持同一 identity。AceSim frequency scan 按 case 外层、axis 内层稳定产生 2 traces x 3 frequencies，L1/L2 cross scan 产生 2 traces x 2 x 2 runs。Duplicate axis/value/case、base/fixed/axis/case overlap、selection drift、duplicate identity 和 readable-ID collision 都拒绝。

### Attempt authority

`core/src/experiment/index.js` 的 `recordRun` 只为 active Experiment 记录已经观察到的 terminal outcome。相同 identity 再运行必须显式引用同 Experiment 的 earlier parent；换 scene/trace 得到不同 identity。Failed AceSim run 保留完整 run spec、`resource_exhausted/host_memory`、limit、observed peak 和 evidence ref，而不是裸 `down`。Persisted reads 会重新校验完整 spec、container binding、run-id alias、rerun lineage、declared output containment、status 和 failure evidence。

### No-runner 与 legacy boundary

Production 模块未导入或调用 `child_process`、`spawn`、`exec`、tmux、scheduler、PID 或 process authority。临时 workspace 的有效 `recordRun` 只创建 Experiment Runtime/Continuation；未创建 runner 文件，并保持 `.pipeline/state.yaml`、`cycle.yaml` 和 `log.yaml` sentinels byte-identical。当前仓库 `.pipeline/runtime/transactions/` 无 descendants。

## 验证结果

### Maintained/shared regression

冻结后的独立 direct runs：

- C23 M3: `13/13` PASS。
- C23 M1 Experiment/reference: `6/6` PASS。
- C23 M1 authority/recovery boundaries: `10/10` PASS。
- C23 M1 recovery remediation: `5/5` PASS。
- C23 M2 knowledge/concept-to-code: `14/14` PASS。
- Record Store: `13/13` PASS。
- Runtime Store: `13/13` PASS。
- Workspace transaction: `19/19` PASS。
- Combined: `93/93` PASS。

### Fresh adversarial matrices

- Identity binding: 修改 code/environment/machine/dataset/command/output/resources/parameters 后 `8/8` identity 均变化。
- Compiler boundaries: malformed uv、machine overcommit、argv/flag ambiguity、private/long paths、raw secret、duplicate output 等 `17/17` 拒绝。
- Scan semantics: stable NeRF/AceSim expansion `2/2`；ownership/selection/duplicate conflicts `5/5` 拒绝。
- Persisted/authority: cross-Experiment、cross-project、bare down、missing/outside/duplicate outputs、missing/bad OOM、write/read alias、legacy/no-runner 共 `11/11` PASS。
- Nonexistent external machine path: `1/1` 作为 metadata 接受，未被 Core probe。

### Static/catalog

- `node --check` for run compiler, Experiment Store, Core export, and M3 test: PASS。
- `git diff --check`: PASS。
- maintained catalog dry-run: `55` selected，包含 C23 M1/M2/M3。
- all catalog dry-run: `171` selected。
- Final independent retest evidence SHA-256: `09a90b38362270a1fc957be723da8816a9a933281a5d64c60eb960f65515be72`。
- Final maintained M3 test SHA-256: `120abfe4722a83629d0dc6e6172f2a93d2d169bd9df0f4bc1db3989a15330447`。

## Modified Modules

Implementation scope:

- `core/src/experiment/runs.js`
- `core/src/experiment/index.js`
- `core/src/index.js`

Test/fixture scope:

- `core/test/c23-m3-experiment-runs.test.js`
- `core/test/fixtures/c23-m3/nerf.json`
- `core/test/fixtures/c23-m3/acesim.json`
- `tests/regression-catalog.json`

This audit worker modified only:

- `.pipeline/runtime/objects/delivery/c23-experiment-management/evidence/m3-audit.md`

## Expected Result

AI 可以在运行前生成可审查的 NeRF/AceSim run matrix，从 readable directory 看出 scene/trace/parameters，从 run spec 读取 exact code/uv/machine/data/command/output/resources；运行后可以把 completed 或 structured host-memory failure 绑定到同一 logical Experiment，并明确区分 rerun 与不同 dataset/scene。Core 不会因为生成 spec 就宣称程序已运行，也不会自行创建后台进程。

## Problems Encountered

首次临时 persisted-binding wrapper 错把 Experiment `runtime.yaml` 当成带 `runtime` 字段的 envelope，因读取 `undefined` 在篡改前退出。修正为 direct Runtime mapping 后，最终持久化矩阵 `11/11` PASS。该脚本只使用 temporary workspace，未修改 repository 文件或 Workflow authority。

## Residual Risks / Follow-up

- 为真实大规模 scan 增加显式 size estimate、上限或 chunk contract，避免 eager Cartesian product 占满主线程内存。
- 用真实项目 pilot 验证 Git/tree/dirty patch、`uv.lock`、driver/CUDA 和 external content ids 的采集准确性；Core 当前只验证结构和内部一致性。
- 在扩大 M3 recovery contract 前，为 `recordRun` 增加专用 prepare/install/activation fault injection。
- Same-identity rerun 继续使用同一 logical output directory；具体保留、trash 和恢复策略由 Agent 按 M4/M5 authority 执行。
- Long-run supervision、checkpoint/interruption、tmux isolation 和 scientific reasonableness confirmation 属于 M4，未被本 PASS 提前声明完成。

M3 在 active Runtime 中仍保持 `executing`；本 audit 不推进 Milestone、Runtime、Continuation、Receipt、manifest、catalog、version、cachebuster 或 legacy authority。
