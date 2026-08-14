---
authority_role: record
confidence: confirmed
created_at: 2026-07-23T15:41:39.042Z
dedupe_key: cycle.vspi-symbiotic-workflow-core.plan
id: decision-7abb9842e8e446a8968aab7e3bd8f366
kind: decision
level: reference
schema_version: '1'
scope:
  ref: vspi-symbiotic-workflow-core
  type: cycle
semantic_hash: 7abb9842e8e446a8968aab7e3bd8f36605f17898689074aa29c8fd2adfaa946f
source_refs:
  - locator: compiled-plan
    ref: cycle:vspi-symbiotic-workflow-core:revision:0
    type: delivery_plan
supersedes: []
updated_at: 2026-07-23T15:41:39.042Z
---
# VSPi 共生式 Workflow 并发与恢复内核

Hypo-Workflow 提供可被 VSPi 0.2.0 直接加载的多 Delivery、多 Workstream、crash-safe 写入恢复和模型无关路由契约，同时保持旧宿主兼容与文件型 authority。

```json
{
  "acceptance": {
    "criteria": [
      {
        "id": "AC-CONCURRENCY",
        "statement": "同一项目可同时存在至少两个非终态 Delivery，并可在同一或不同 Delivery 下运行多个独立 Workstream；Session、模型选择、Continuation、evidence 与 recovery 不串写。",
        "verification": "并发 fixture 启动多个独立 host/session，验证 Runtime object、Workstream binding、Journal 与恢复结果隔离。"
      },
      {
        "id": "AC-DAG",
        "statement": "Plan 的依赖 DAG 可同时暴露多个 ready Milestone，由不同 Workstream claim；依赖未满足、重复 claim、对象 revision 冲突和重叠 code-scope 不会静默覆盖。",
        "verification": "DAG scheduler、claim CAS、expected revision 与 scope-conflict contract tests 全部通过。"
      },
      {
        "id": "AC-RECOVERY",
        "statement": "writer 在 prepare、install 或 activation 任一阶段被强制终止后，下一次启动或写入可自动、安全地恢复；残留 lease 或 transaction 不会永久阻止读取、进入项目或无冲突工作。",
        "verification": "真实 child-process kill fixture 覆盖各 crash point、stale takeover、fencing old-owner resume、roll-forward、rollback 与 ambiguous drift。"
      },
      {
        "id": "AC-VSPI-PLAN",
        "statement": "VSPi Host Contract 表达显式 /hw:init、唯一 Workflow Plan authority、Session-to-Workstream 引用绑定和 0.1.0 到 0.2.0 的显式迁移，不要求目标仓库双写 Local Plan。",
        "verification": "portable contract fixture 和 target-local handoff matrix 验证未初始化、绑定、/new、--continue、resume 与迁移行为。"
      },
      {
        "id": "AC-MODEL-GROUP",
        "statement": "Core 只输出 routing class 与 capability requirements；VSPi 负责难度层级模型组、Explicit Auto Group、具体模型解析和 pinned override，生成中途不换模。",
        "verification": "模型无关 schema tests、Auto/pinned/fallback transition fixtures 和 concrete provider/model leakage scan 通过。"
      },
      {
        "id": "AC-COMPATIBILITY",
        "statement": "旧单任务宿主仍可使用 foreground active pointer 和唯一候选 resume；实验性 file-backed context retrieval 默认关闭且不替换 Pi native compaction；VSPi 0.1.0 不被本 Delivery 修改。",
        "verification": "legacy compatibility、host bundle、full maintained/all test、build:host、diff/check 与 target no-write 审计通过。"
      }
    ],
    "scope": "plan"
  },
  "acceptance_criteria": [
    {
      "id": "AC-CONCURRENCY",
      "statement": "同一项目可同时存在至少两个非终态 Delivery，并可在同一或不同 Delivery 下运行多个独立 Workstream；Session、模型选择、Continuation、evidence 与 recovery 不串写。",
      "verification": "并发 fixture 启动多个独立 host/session，验证 Runtime object、Workstream binding、Journal 与恢复结果隔离。"
    },
    {
      "id": "AC-DAG",
      "statement": "Plan 的依赖 DAG 可同时暴露多个 ready Milestone，由不同 Workstream claim；依赖未满足、重复 claim、对象 revision 冲突和重叠 code-scope 不会静默覆盖。",
      "verification": "DAG scheduler、claim CAS、expected revision 与 scope-conflict contract tests 全部通过。"
    },
    {
      "id": "AC-RECOVERY",
      "statement": "writer 在 prepare、install 或 activation 任一阶段被强制终止后，下一次启动或写入可自动、安全地恢复；残留 lease 或 transaction 不会永久阻止读取、进入项目或无冲突工作。",
      "verification": "真实 child-process kill fixture 覆盖各 crash point、stale takeover、fencing old-owner resume、roll-forward、rollback 与 ambiguous drift。"
    },
    {
      "id": "AC-VSPI-PLAN",
      "statement": "VSPi Host Contract 表达显式 /hw:init、唯一 Workflow Plan authority、Session-to-Workstream 引用绑定和 0.1.0 到 0.2.0 的显式迁移，不要求目标仓库双写 Local Plan。",
      "verification": "portable contract fixture 和 target-local handoff matrix 验证未初始化、绑定、/new、--continue、resume 与迁移行为。"
    },
    {
      "id": "AC-MODEL-GROUP",
      "statement": "Core 只输出 routing class 与 capability requirements；VSPi 负责难度层级模型组、Explicit Auto Group、具体模型解析和 pinned override，生成中途不换模。",
      "verification": "模型无关 schema tests、Auto/pinned/fallback transition fixtures 和 concrete provider/model leakage scan 通过。"
    },
    {
      "id": "AC-COMPATIBILITY",
      "statement": "旧单任务宿主仍可使用 foreground active pointer 和唯一候选 resume；实验性 file-backed context retrieval 默认关闭且不替换 Pi native compaction；VSPi 0.1.0 不被本 Delivery 修改。",
      "verification": "legacy compatibility、host bundle、full maintained/all test、build:host、diff/check 与 target no-write 审计通过。"
    }
  ],
  "constraints": [
    "Manifest-selected file authority、Records、Receipts、Recovery 与 Git 可审计性保持为真相源。",
    "不引入 Python runtime、常驻 daemon、数据库或 native flock 依赖。",
    "不把 Hypo-Workflow 变成项目进程管理器，也不为整个 Agent turn 持有全局锁。",
    "Provider、model id、credential 和模型特定 prompt tuning 不进入 Hypo Core。",
    "本 Delivery 只修改 /home/heyx/Hypo-Workflow；/home/heyx/VSPi 的实现必须由后续 target-local 0.2.0 Plan 批准。",
    "保留当前 dirty worktree 中与本 Delivery 无关的用户变更。",
    "file-backed context retrieval 仅定义实验接口、指标和退出条件，默认关闭且不实现生产替换路径。"
  ],
  "delivery_kind": "cycle",
  "delivery_mode": "plan",
  "evidence": [
    {
      "ref": "conversation/vspi-workflow-symbiosis-2026-07-23",
      "summary": "用户确认三项原始合作范围，并新增多任务并发与 crash-safe 非阻塞要求。",
      "type": "user"
    },
    {
      "ref": "decision-884fd919aa8a5fb6b64bdb00e7d2405e",
      "summary": "已确认的并发 Workstream 与 crash-safe recovery 架构决策。",
      "type": "record"
    },
    {
      "ref": "core/src/delivery/index.js",
      "summary": "现状是单 non-terminal Delivery 和单 executing Milestone。",
      "type": "repository"
    },
    {
      "ref": "core/src/workspace-store/transaction.js",
      "summary": "现状依靠 pending transaction recovery，但缺少原子 writer acquisition 与自动 recovery。",
      "type": "repository"
    },
    {
      "ref": "/home/heyx/VSPi/src/backend/pi-backend.ts",
      "summary": "VSPi 使用同一 Node.js 生态中的 Pi SDK，适合 typed embedded adapter。",
      "type": "repository"
    }
  ],
  "id": "vspi-symbiotic-workflow-core",
  "milestones": [
    {
      "depends_on": [],
      "id": "M1",
      "order": 1,
      "outcome": "形成权威对象图、Workstream schema、Delivery DAG 状态机、writer lease/fencing 协议、自动 recovery 时序、兼容迁移矩阵和可复现 RED fixtures。",
      "stone": {
        "acceptance_criteria": [
          "两个模型可在同一项目的不同 Workstream 中并行，状态、证据和恢复上下文互不污染。",
          "任何 crash/kill 都不会依靠用户手删 lock 才能重新进入或继续无冲突工作。",
          "全局 active 被降为兼容 foreground，而不是并发 exclusivity authority。",
          "重叠写入会被 expected revision/scope conflict 明确阻止，不会用最后写入覆盖。",
          "设计没有扩张成进程管理器，也没有在本阶段修改 VSPi 0.1.0。"
        ],
        "id": "S-ARCH-CONCURRENCY",
        "review": "用户检查并发对象图、DAG claim 规则、writer lease/fencing 时序、kill-recovery matrix、旧宿主兼容和 VSPi 0.2.0 handoff 边界；接受后才实施 Core 变更。"
      },
      "title": "并发与恢复契约、迁移设计和失败基线",
      "verification_criteria": [
        "设计明确区分 Delivery、Workstream/activity、VSPi Session、Worker、foreground pointer 与 code-scope claim 的所有权。",
        "并发时序覆盖不同 Delivery、同 Delivery 并行 Milestone、同对象冲突、同工作树不重叠与重叠 scope。",
        "crash matrix 覆盖 prepare、部分 install、manifest activation、stale takeover 和旧 owner 恢复。",
        "RED evidence 证明当前单 active gate、并发 writer 竞态和手工 recovery 缺口，且不污染 maintained test 基线。",
        "迁移保持旧宿主单 foreground 行为，并明确 VSPi 0.1.0 target no-write 边界。"
      ]
    },
    {
      "depends_on": [
        "M1"
      ],
      "id": "M2",
      "order": 2,
      "outcome": "为所有 Core writer 建立原子、短时、可接管且带 fencing 的协调层，并在启动/写入前自动完成可证明安全的 pending transaction recovery。",
      "title": "短 writer lease、fencing 与自动 transaction recovery",
      "verification_criteria": [
        "并发 writer acquisition 只有一个提交者进入 activation，其他 writer bounded wait/retry 或在 expected revision drift 时失败。",
        "lease owner token、TTL/heartbeat 与 fencing 能阻止被接管的旧 writer 恢复后继续写入。",
        "真实 SIGTERM/SIGKILL fixture 在每个 transaction phase 后均可自动 roll-forward 或 rollback。",
        "fresh owner 不被误抢占；stale residue 不永久阻止 read-only/UI/无冲突执行；ambiguous drift 产生可操作报告。",
        "现有 transaction integrity、path guard、manifest activation、Receipt 和 recovery tests 不回归。"
      ]
    },
    {
      "depends_on": [
        "M2"
      ],
      "id": "M3",
      "order": 3,
      "outcome": "移除单 non-terminal Delivery exclusivity，复用 activity kind 建立 Workstream 生命周期、parent binding、per-session resume 与兼容 foreground projection。",
      "title": "多 Delivery Workstream authority 与 Session binding",
      "verification_criteria": [
        "多个 Delivery 与多个 Workstream 可并存、独立更新、恢复、接受或结束。",
        "VSPi/host Session binding 只保存 workspace、Workstream/Delivery ref 与 revision/hash，不复制 Plan 正文。",
        "无绑定或多候选 resume 返回选择需求；唯一候选和旧 foreground 宿主保持兼容。",
        "ambient-maintain activity 与开发 Workstream schema/索引互不混淆。",
        "runtime/continuation/records/receipts/recovery ownership 和敏感信息边界保持有效。"
      ]
    },
    {
      "depends_on": [
        "M3"
      ],
      "id": "M4",
      "order": 4,
      "outcome": "让 dependency-ready Milestone 可由多个 Workstream 并行 claim，并用 expected revision、claim identity、code-scope 与 Git base 记录防止重复或重叠覆盖。",
      "title": "并行 Milestone DAG claim 与冲突安全证据",
      "verification_criteria": [
        "同一 Delivery 中多个依赖已满足的 Milestone 可同时 executing，未满足依赖者不能 claim。",
        "重复 claim、stale revision、相互重叠 scope 与不同 Git base 产生明确冲突，不改 authority。",
        "不重叠 scope 可在同工作树并行；重叠任务要求串行或独立 worktree，并保存决定证据。",
        "Stone、Milestone verification、rejection/revision 与 final acceptance 在并行状态下保持确定。",
        "并发 Journal/worker evidence 与 routing metadata 可按 Workstream 重放且不串线。"
      ]
    },
    {
      "depends_on": [
        "M4"
      ],
      "id": "M5",
      "order": 5,
      "outcome": "发布模型无关、可移植的 VSPi 0.2.0 Host Contract，覆盖显式初始化、Plan/Workstream binding、Explicit Auto Group、capability filter、pinned override 和可审计 fallback。",
      "title": "VSPi Plan adapter 与模型组 Host Contract",
      "verification_criteria": [
        "未初始化项目的 /plan 只提示显式 /hw:init，普通聊天和模型选择仍可用且无隐式写入。",
        "Hypo Core 输出 routing class、reason codes 与 capability requirements，不输出 concrete model/provider/credential。",
        "VSPi resolver contract 支持难度层级组、Vision/tool/context filter、Auto 与 pinned 优先级，并只在 turn/Worker 边界切换。",
        "0.1 Local Plan 到 0.2 Workflow Plan 使用显式一次性 import/handoff，不保留长期双写。",
        "portable fixtures 可被独立 target-local Plan 使用，source tests 不依赖 VSPi 私有实现。"
      ]
    },
    {
      "depends_on": [
        "M5"
      ],
      "id": "M6",
      "order": 6,
      "outcome": "定义默认关闭的 bounded capsule/on-demand read 实验协议与指标，完成全量兼容审计，并生成不写目标仓库的 VSPi 0.2.0 target-local Plan 输入。",
      "title": "上下文实验契约、全量回归与 VSPi 0.2.0 handoff",
      "verification_criteria": [
        "实验接口规定 bounded capsule、typed read、source refs、token/latency/miss-rate/staleness 指标和 Pi native compaction fallback。",
        "实验默认关闭，不宣称完全免压缩，不改变生产 Session 或自动 compaction 行为。",
        "npm test、npm run test:all、npm run build:host、focused concurrency/kill tests 与 git diff --check 通过。",
        "独立 test/implement/audit evidence 完整，最终审计无未解决的 High/Medium 并发、恢复或 authority finding。",
        "target handoff 明确 VSPi 0.2.0 文件/模块边界、Stone、验证矩阵和 0.1.0 dirty/active Delivery 保护；本 Delivery 对 ~/VSPi 保持 zero-write。"
      ]
    }
  ],
  "outcome": "Hypo-Workflow 提供可被 VSPi 0.2.0 直接加载的多 Delivery、多 Workstream、crash-safe 写入恢复和模型无关路由契约，同时保持旧宿主兼容与文件型 authority。",
  "revision": 0,
  "schema_version": "1",
  "status": "draft",
  "title": "VSPi 共生式 Workflow 并发与恢复内核",
  "plan_hash": "3a1354c86bb00437f911a1bab017a592ab4b1ef30b500d1bb5903cfa06952ce0"
}
```
