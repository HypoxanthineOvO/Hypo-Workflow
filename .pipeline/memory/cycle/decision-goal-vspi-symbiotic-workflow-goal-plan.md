---
authority_role: record
confidence: confirmed
created_at: 2026-07-23T16:02:49.267Z
dedupe_key: goal.vspi-symbiotic-workflow-goal.plan
id: decision-a2d4390ad9175886f5dbce69a7ce14d9
kind: decision
level: reference
schema_version: '1'
scope:
  ref: vspi-symbiotic-workflow-goal
  type: goal
semantic_hash: a2d4390ad9175886f5dbce69a7ce14d9619dcfc8aeb2fe803f42836c02cc2433
source_refs:
  - locator: compiled-plan
    ref: goal:vspi-symbiotic-workflow-goal:revision:0
    type: delivery_plan
supersedes: []
updated_at: 2026-07-23T16:02:49.267Z
---
# VSPi 共生式 Workflow 并发、恢复与模型组内核

连续完成 Hypo-Workflow 的 crash-safe writer、自动 transaction recovery、多 Delivery/Workstream、并行 DAG claim、VSPi 0.2.0 Plan/ModelGroup Host Contract 与默认关闭的上下文实验接口，不设置中途人工 Stone。

```json
{
  "acceptance_criteria": [
    {
      "id": "AC-CONCURRENCY",
      "statement": "同一项目支持多个非终态 Delivery 和多个独立 Workstream，允许不同 VSPi Session 与模型并发工作且状态、证据、Continuation 和 recovery 不串写。",
      "verification": "多进程/多 Session fixtures 覆盖同一与不同 Delivery，并验证 object refs、Journal、bindings 和恢复隔离。"
    },
    {
      "id": "AC-DAG",
      "statement": "dependency-ready Milestone 可被不同 Workstream 并行 claim；重复 claim、stale revision、重叠 scope 与 Git base 冲突不会静默覆盖。",
      "verification": "DAG scheduler、claim CAS、expected revision、scope conflict 与 Stone/final lifecycle tests 通过。"
    },
    {
      "id": "AC-RECOVERY",
      "statement": "writer 在 prepare、install 或 activation 阶段被强制终止后可自动安全恢复，stale lease 或 pending transaction 不会永久阻止项目读取、进入或继续。",
      "verification": "真实 child-process SIGTERM/SIGKILL、takeover fencing、old-owner resume、roll-forward、rollback 和 drift fixtures 通过。"
    },
    {
      "id": "AC-VSPI",
      "statement": "portable Host Contract 覆盖显式 /hw:init、唯一 Workflow Plan authority、Session-to-Workstream binding、0.1 到 0.2 显式迁移和 legacy foreground 兼容。",
      "verification": "contract fixtures、migration matrix、resume selection 与 target-local handoff 验证通过；本 Goal 对 ~/VSPi zero-write。"
    },
    {
      "id": "AC-MODEL-GROUP",
      "statement": "Core 只输出 routing class 和 capability requirements；VSPi 负责难度层级模型组、Explicit Auto Group、具体模型解析、pinned override 和可审计 fallback。",
      "verification": "schema、Auto/pinned/fallback transition、turn boundary 和 concrete provider/model leakage tests 通过。"
    },
    {
      "id": "AC-QUALITY",
      "statement": "实验性 bounded capsule/on-demand read 默认关闭；maintained/all tests、host build、whitespace、secret scan 与独立审计全部通过。",
      "verification": "npm test、npm run test:all、npm run build:host、focused concurrency/kill tests、git diff --check 和 final audit。"
    }
  ],
  "constraints": [
    "保持 Manifest-selected file authority、Records、Receipts、Recovery 与 Git 可审计性。",
    "不引入 Python runtime、常驻 daemon、数据库或 native flock 依赖。",
    "不把 Workflow 变成项目进程管理器，不为整个 Agent turn 持有全局 writer lock。",
    "Provider、model id、credential 与模型特定 prompt tuning 不进入 Hypo Core。",
    "本 Goal 只修改 /home/heyx/Hypo-Workflow；~/VSPi 由后续 target-local 0.2.0 Goal/Plan 实现。",
    "保留 baseline commit 02c3e5f 之前的用户工作，并允许在实现期间创建本地 checkpoint commits。",
    "不 push、不发布；任何新发现的 destructive、remote 或 system-install 操作仍需单独确认。",
    "不做中途人工汇报；仅在完整 Goal 验证结束后汇报。"
  ],
  "delivery_kind": "goal",
  "design": {
    "acceptance_criteria": [
      {
        "id": "AC-CONCURRENCY",
        "statement": "同一项目支持多个非终态 Delivery 和多个独立 Workstream，允许不同 VSPi Session 与模型并发工作且状态、证据、Continuation 和 recovery 不串写。",
        "verification": "多进程/多 Session fixtures 覆盖同一与不同 Delivery，并验证 object refs、Journal、bindings 和恢复隔离。"
      },
      {
        "id": "AC-DAG",
        "statement": "dependency-ready Milestone 可被不同 Workstream 并行 claim；重复 claim、stale revision、重叠 scope 与 Git base 冲突不会静默覆盖。",
        "verification": "DAG scheduler、claim CAS、expected revision、scope conflict 与 Stone/final lifecycle tests 通过。"
      },
      {
        "id": "AC-RECOVERY",
        "statement": "writer 在 prepare、install 或 activation 阶段被强制终止后可自动安全恢复，stale lease 或 pending transaction 不会永久阻止项目读取、进入或继续。",
        "verification": "真实 child-process SIGTERM/SIGKILL、takeover fencing、old-owner resume、roll-forward、rollback 和 drift fixtures 通过。"
      },
      {
        "id": "AC-VSPI",
        "statement": "portable Host Contract 覆盖显式 /hw:init、唯一 Workflow Plan authority、Session-to-Workstream binding、0.1 到 0.2 显式迁移和 legacy foreground 兼容。",
        "verification": "contract fixtures、migration matrix、resume selection 与 target-local handoff 验证通过；本 Goal 对 ~/VSPi zero-write。"
      },
      {
        "id": "AC-MODEL-GROUP",
        "statement": "Core 只输出 routing class 和 capability requirements；VSPi 负责难度层级模型组、Explicit Auto Group、具体模型解析、pinned override 和可审计 fallback。",
        "verification": "schema、Auto/pinned/fallback transition、turn boundary 和 concrete provider/model leakage tests 通过。"
      },
      {
        "id": "AC-QUALITY",
        "statement": "实验性 bounded capsule/on-demand read 默认关闭；maintained/all tests、host build、whitespace、secret scan 与独立审计全部通过。",
        "verification": "npm test、npm run test:all、npm run build:host、focused concurrency/kill tests、git diff --check 和 final audit。"
      }
    ],
    "constraints": [
      "保持 Manifest-selected file authority、Records、Receipts、Recovery 与 Git 可审计性。",
      "不引入 Python runtime、常驻 daemon、数据库或 native flock 依赖。",
      "不把 Workflow 变成项目进程管理器，不为整个 Agent turn 持有全局 writer lock。",
      "Provider、model id、credential 与模型特定 prompt tuning 不进入 Hypo Core。",
      "本 Goal 只修改 /home/heyx/Hypo-Workflow；~/VSPi 由后续 target-local 0.2.0 Goal/Plan 实现。",
      "保留 baseline commit 02c3e5f 之前的用户工作，并允许在实现期间创建本地 checkpoint commits。",
      "不 push、不发布；任何新发现的 destructive、remote 或 system-install 操作仍需单独确认。",
      "不做中途人工汇报；仅在完整 Goal 验证结束后汇报。"
    ],
    "evidence": [
      {
        "ref": "conversation/vspi-workflow-goal-2026-07-23",
        "summary": "用户确认无中途 Stone、连续自动执行、本地 commit 与最终一次性汇报。",
        "type": "user"
      },
      {
        "ref": "vspi-symbiotic-workflow-core",
        "summary": "先前 proposed Plan 保存完整六阶段需求、架构与验证边界。",
        "type": "delivery"
      },
      {
        "ref": "feedback-2127b84c8d5667c43f93f06baa8c128a",
        "summary": "Plan-to-Goal route replacement feedback.",
        "type": "record"
      },
      {
        "ref": "02c3e5f",
        "summary": "Current repository state is committed as the clean execution baseline.",
        "type": "git"
      }
    ],
    "outcome": "连续完成 Hypo-Workflow 的 crash-safe writer、自动 transaction recovery、多 Delivery/Workstream、并行 DAG claim、VSPi 0.2.0 Plan/ModelGroup Host Contract 与默认关闭的上下文实验接口，不设置中途人工 Stone。"
  },
  "evidence": [
    {
      "ref": "conversation/vspi-workflow-goal-2026-07-23",
      "summary": "用户确认无中途 Stone、连续自动执行、本地 commit 与最终一次性汇报。",
      "type": "user"
    },
    {
      "ref": "vspi-symbiotic-workflow-core",
      "summary": "先前 proposed Plan 保存完整六阶段需求、架构与验证边界。",
      "type": "delivery"
    },
    {
      "ref": "feedback-2127b84c8d5667c43f93f06baa8c128a",
      "summary": "Plan-to-Goal route replacement feedback.",
      "type": "record"
    },
    {
      "ref": "02c3e5f",
      "summary": "Current repository state is committed as the clean execution baseline.",
      "type": "git"
    }
  ],
  "id": "vspi-symbiotic-workflow-goal",
  "outcome": "连续完成 Hypo-Workflow 的 crash-safe writer、自动 transaction recovery、多 Delivery/Workstream、并行 DAG claim、VSPi 0.2.0 Plan/ModelGroup Host Contract 与默认关闭的上下文实验接口，不设置中途人工 Stone。",
  "revision": 0,
  "schema_version": "1",
  "status": "draft",
  "title": "VSPi 共生式 Workflow 并发、恢复与模型组内核",
  "plan_hash": "923764ac3ef31d8d49acce7c8957ac70abe9e31d43d9663007257fe6432b7b1d"
}
```
