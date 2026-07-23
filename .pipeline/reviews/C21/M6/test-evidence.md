# C21-M6 TEST Evidence

- Worker role: `test`
- Ownership: M6 tests, fixtures, and this evidence file only
- Production source changes: forbidden
- Status: RED complete; implementation handoff ready

## Behavior-First Production API Handoff

The production implementation should keep four focused boundaries. Names below are the test contract; a compatibility alias is not sufficient unless it preserves the same behavior and authority.

### `core/src/planning/index.js`

- `compileGoalDesign(input)` returns a canonical Goal draft with `delivery_kind: goal`, one Design, acceptance criteria, revision, and content-derived `plan_hash`. The returned user contract must not contain `milestones`.
- `compileCyclePlan(input)` returns a canonical Cycle draft with `delivery_kind: cycle`, an ordered non-empty Milestone list, one Cycle-level acceptance contract, revision, and content-derived `plan_hash`. Milestones contain verification criteria but no user acceptance state/gate.
- `selectAdaptivePlan(input)` returns `goal_design`, `cycle_standard`, or `cycle_deep` from observable evidence. Goal always uses Design. Cycle standard may use internal `discover`, `technical_stack`, `architecture`, `decompose`, and `generate`; durable research selects Deep Plan.
- `assessPlanReadiness(input)` returns either `ask` with unresolved material questions/challenge questions or `ready` with no questions. It has no round quota and rejects/ignores no ambiguity merely because a round count was reached. `min_rounds` is not accepted or emitted.

The test input contracts are intentionally small and exact:

```yaml
# Goal Design input
id: goal-alpha
title: <text>
outcome: <text>
acceptance_criteria:
  - { id: AC1, statement: <text>, verification: <text> }
constraints: [<text>]
evidence:
  - { type: repository, ref: README.md, summary: <text> }
revision: 0

# Cycle Plan input adds
milestones:
  - id: M1
    title: <text>
    outcome: <text>
    verification_criteria: [<text>]
    depends_on: []
```

`selectAdaptivePlan` takes `{ delivery_kind, model_capability, complexity, durable_research }`. `assessPlanReadiness` takes `{ delivery_kind, evidence, ambiguities }`, where each ambiguity has `{ id, prompt, material, resolved, challenge }`.

### `core/src/execution-topology/index.js`

- `selectExecutionTopology(input)` returns a canonical profile and required separated roles:
  - explicit policy + trivial + reversible -> `solo-verified`;
  - material engineering -> `strict` with distinct `test`, `implement`, `audit`;
  - migration -> `migration` with distinct `extractor`, `curator`, `auditor`, `deterministic-writer`;
  - explicit custom roles -> `custom`.
- `assessExecutionEvidence({ topology, evidence })` returns `ready`, `missing_roles`, `identity_collisions`, and normalized evidence refs. Required roles must be completed by distinct identities where the topology says so. A missing/colliding role blocks verification. Small work is not globally hard-coded to three workers.

Topology selection takes `{ task_kind, change_size, reversible, policy, custom_roles? }`. Worker evidence uses `{ role, worker_id, status, evidence_refs }`; each evidence ref is an existing `{ type: file, path, digest: sha256:<hex> }` binding.

### `core/src/delivery/index.js`

- `createDeliveryStore({ clock })` captures a zero-argument Clock and returns focused methods:
  - `proposeGoal(root, { design, topology }, options)`
  - `proposeCycle(root, { plan, topology }, options)`
  - `read(root, objectRef)`
  - `approve(root, transition, options)`
  - `start(root, transition, options)`
  - `recordRevision(root, { object_ref, actor, feedback, proposal }, options)`
  - `verifyMilestone(root, { object_ref, milestone_id, evidence }, options)`
  - `verify(root, { object_ref, evidence }, options)`
  - `requestAcceptance(root, { object_ref }, options)`
  - `accept(root, transition, options)`
  - `reject(root, { ...transition, feedback }, options)`
  - `resume(root, { object_ref? })`
- `buildDeliveryReceiptContext(deliveryView, { actor, intent })` returns the exact M2 Receipt validation context. It binds actor, intent, object, scope, current `plan_hash`, delivery kind, revision, and expected fresh state. Supported intents are `delivery.approve`, `delivery.start`, `delivery.accept`, and `delivery.reject`.
- Proposal compilation is `draft`; persistence is `proposed`. Approval consumes a scoped Receipt and moves only to `waiting_to_start`. A separately issued start Receipt is required for `executing`.
- `recordRevision` writes one structured Feedback Record and one superseding plan Decision Record, changes the plan hash, and leaves the delivery in `needs_revision`. Approval after revision returns to `waiting_to_start`; the old start Receipt and the old plan hash remain unusable.
- Verification requires the selected topology evidence. Goal `verify` moves `executing -> verified`; Cycle `verifyMilestone` moves Milestones in order to `verified`, and aggregate `verify` moves the Cycle to `verified` only after every required Milestone is verified. `requestAcceptance` is a distinct `verified -> pending_acceptance` transition. Only final Goal/Cycle acceptance is user-facing.
- Reject consumes its own Receipt, writes structured feedback, and moves to `needs_revision` without product writes or auto-start. Accept consumes its own Receipt and moves to `accepted`.
- Runtime/Continuation remain lifecycle authority, Records remain plan/feedback authority, Receipts remain authorization authority, and Recovery Pack remains resumable context. Active pointer stores references only.
- `resume` must combine the active Delivery ref, the same object's Runtime/Continuation, and the latest valid Recovery Pack. An explicit wrong object, cross-object Pack, or stale Pack cannot replace current authority. The result identifies whether Pack context is current or requires bounded replay while preserving Runtime state.

`read` returns the canonical flattened Delivery view shown below. `resume` returns `{ delivery, continuation, recovery }`, where `delivery` is that same current view and `recovery` includes `pack_ref`, `pack_status: current|stale`, and the bounded replay decision. A stale Pack may supply context but never lifecycle state.

All delivery mutations use the M1 transaction seam and write only under `.pipeline/`. Product files are never written by proposal, feedback, approval, rejection, or start transitions.

### `core/src/commands/index.js` and Skill routing

- `resolveWorkflowIntent(input, context)` maps slash syntax and natural user objectives to the same canonical authority intent, while reusing real backend availability checks.
- Runtime discovery exposes exactly: `/hw:guide`, `/hw:init`, `/hw:goal`, `/hw:plan`, `/hw:cycle`, `/hw:maintain`, `/hw:resume`, `/hw:accept`, `/hw:reject`.
- Natural/internal Chat, Explain, Status, Report, Log, Check, Compact, Knowledge, Sync, Debug, explicit start, and Plan phases remain routable behavior but are not discoverable commands.
- Deferred and removed entries are neither discoverable nor writable. Backend availability requires a real ordinary `SKILL.md`; changing registry counts alone does not pass.
- Objective fixtures verify behavior, not Markdown phrase presence: equivalent natural and slash inputs must resolve to one canonical action/object contract, and missing/symlinked Skill backends fail closed.

## Exact Delivery Call Contract

### Common conventions

- `root` is the repository root string.
- Every Delivery `object_ref` is exactly `{ kind: "delivery", id: <safe-id> }`.
- `createDeliveryStore({ clock })` accepts exactly one zero-argument captured Clock. Delivery and Receipt authorization decisions must use that Clock; mutation calls do not accept `now`.
- Every mutating method takes a final `options` object with required safe transaction identifier `{ id: <safe-id> }`. Tests do not pass a per-call Clock or direct writer path. `read` and `resume` do not take transaction options.
- Mutation results return the complete canonical flattened Delivery view, not only `{ status }` or a path. Extra diagnostic fields are allowed only when they do not duplicate another authority.
- Record refs in a Delivery view are exactly `{ id, semantic_hash }`. `plan_record_ref` is always present; `feedback_record_ref` is present on the result of `recordRevision` and `reject`.

### Proposal methods

```js
store.proposeGoal(
  root,
  { design, topology },
  { id },
)

store.proposeCycle(
  root,
  { plan, topology },
  { id },
)
```

- `design` is the untouched canonical result of `compileGoalDesign(...)`.
- `plan` is the untouched canonical result of `compileCyclePlan(...)`.
- `topology` is the canonical result of `selectExecutionTopology(...)`.
- The compiler output must have `status: "draft"`; successful persistence returns `status: "proposed"`.
- Minimum Goal return fields: `schema_version`, `object_ref`, `delivery_kind: "goal"`, `status`, `revision`, `plan_hash`, `plan_record_ref`, `topology`, `updated_at`. A Goal return must not contain `milestones`.
- Minimum Cycle return fields are the same plus ordered `milestones`. Each Milestone minimally has `id`, `order`, `status`, its compiled outcome/verification data, and dependency data. It must not have `acceptance`, `acceptance_state`, or Receipt fields.
- Successful proposal writes the plan Decision Record, Runtime/Continuation, and reference-only active Delivery pointer through one recoverable transaction boundary.

Proposal preflight is object-identity preserving:

- If the same `object_ref.id` already has Delivery Runtime, `proposeGoal` and `proposeCycle` fail with `ERR_DELIVERY_OBJECT_EXISTS` before any write, regardless of whether the existing Delivery is `proposed`, `executing`, or `accepted`.
- The same ID cannot change `delivery_kind`; Goal-to-Cycle or Cycle-to-Goal replacement is the same fail-closed duplicate-object case.
- If `active.delivery` references a different non-terminal Delivery, proposal fails with `ERR_DELIVERY_ACTIVE_EXISTS` or the existing explicit active-object mismatch error before any write.
- If `active.delivery` references a different `accepted` Delivery, a new Goal or Cycle is allowed. One M1 transaction creates the new Plan Record and Runtime/Continuation and switches `active.delivery`; the accepted object's Runtime and Records remain unchanged and readable.
- A fault during that accepted-to-new transaction must recover to the complete old active state with no new Record/Runtime residue.

### Receipt context and transition envelope

```js
buildDeliveryReceiptContext(deliveryView, {
  actor: { type, id },
  intent,
})
```

The function is pure and returns exactly these top-level bindings:

```js
{
  actor: { type, id },
  intent: "delivery.approve" | "delivery.start" | "delivery.accept" | "delivery.reject",
  object_ref: { kind: "delivery", id },
  scope: {
    action: "approve" | "start" | "accept" | "reject",
    delivery_kind: "goal" | "cycle",
    expected_state: "proposed" | "needs_revision" | "waiting_to_start" | "pending_acceptance",
    revision: 0,
    state_hash: "<64 lowercase hex>",
  },
  plan_hash: "<64 lowercase hex>",
}
```

`state_hash` is a canonical binding to the current transition-relevant Delivery state. Context construction is valid only for these state/intent pairs:

| Intent | Allowed current state |
| --- | --- |
| `delivery.approve` | `proposed`, `needs_revision` |
| `delivery.start` | `waiting_to_start` |
| `delivery.accept` | `pending_acceptance` |
| `delivery.reject` | `pending_acceptance` |

After M2 `issueReceipt(...)`, the exact transition envelope passed to Delivery is:

```js
{
  receipt_id,
  actor,
  intent,
  object_ref,
  scope,
  plan_hash,
  tool_use_id,
}
```

`actor`, `intent`, `object_ref`, `scope`, and `plan_hash` are byte-semantically the same context used to issue the Receipt. `tool_use_id` is the safe reservation/consumption owner. Delivery must reserve and consume the Receipt; successful transition leaves it `consumed`. Actor/context drift uses the M2 invalidation behavior rather than trusting caller fields.

### Approval and explicit start

```js
store.approve(root, transitionEnvelope, { id })
store.start(root, transitionEnvelope, { id })
```

- `approve` accepts only `delivery.approve`, consumes it, and returns the current view with `status: "waiting_to_start"`.
- `start` accepts only `delivery.start`, consumes it, and returns `status: "executing"`.
- Cycle start marks only its first currently runnable Milestone `executing`; later Milestones remain `pending`.
- Neither method writes product files. Approval cannot fall through to start.

### Revision

```js
store.recordRevision(root, {
  object_ref,
  actor: { type, id },
  feedback: {
    problem,
    reproduce_steps: ["..."],
    expected,
    actual,
    context,
  },
  proposal,
}, { id })
```

- All five feedback fields are required. Text is non-empty; `reproduce_steps` is a non-empty string array.
- `proposal` is a canonical Goal Design or Cycle Plan matching the current object kind/id. Its revision must be exactly current revision + 1 and its `plan_hash` must differ from the active plan.
- The method writes one Feedback Record and one superseding plan Decision Record. The new Decision Record has `supersedes: [oldPlanRecordId]`.
- Minimum result changes: `status: "needs_revision"`, incremented `revision`, new `plan_hash`, new `plan_record_ref`, and `feedback_record_ref`.
- A revised Cycle resets the new plan's Milestone runtime statuses to `pending`.
- Missing proposal, partial feedback, kind/id mismatch, or non-incrementing revision is a zero-write failure. Revision never consumes a start Receipt and never changes product files.

### Verification and acceptance request

Worker evidence input is exactly:

```js
{
  role,
  worker_id,
  status: "completed",
  evidence_refs: [{
    type: "file",
    path: ".pipeline/.../<evidence-file>",
    digest: "sha256:<64 lowercase hex>",
  }],
}
```

Delivery verification checks that every referenced path is a contained ordinary file, not a symlink, and that its bytes match `digest`. It also applies the selected topology's required roles, terminal status, and distinct-identity constraints.

```js
store.verifyMilestone(root, {
  object_ref,
  milestone_id,
  evidence: [workerEvidence],
}, { id })

store.verify(root, {
  object_ref,
  evidence: [workerEvidence],
}, { id })

store.requestAcceptance(root, { object_ref }, { id })
```

- `verifyMilestone` is Cycle-only, requires `executing`, and verifies only the next dependency-satisfied Milestone. It returns the full Cycle view; after M1 in a two-step Cycle the statuses are `verified, executing`, and after M2 they are `verified, verified` while the Cycle remains `executing`.
- Goal `verify` moves `executing -> verified`. Cycle `verify` requires every required Milestone already `verified`, then moves aggregate Cycle state to `verified`.
- Minimum verified view adds `verification: { roles, evidence_refs }`; `roles` reflects completed required roles and `evidence_refs` is the flattened verified file-ref set.
- `requestAcceptance` accepts only `verified` and returns `pending_acceptance`. It does not issue or consume a user Receipt. Cycle Milestones remain `verified` and never become `pending_acceptance`.

### Manual acceptance and rejection

```js
store.accept(root, transitionEnvelope, { id })

store.reject(root, {
  ...transitionEnvelope,
  feedback: {
    problem,
    reproduce_steps,
    expected,
    actual,
    context,
  },
}, { id })
```

- Both methods require `pending_acceptance` and their own intent-specific Receipt.
- `accept` consumes `delivery.accept` and returns `status: "accepted"`.
- `reject` consumes `delivery.reject`, writes one structured Feedback Record, returns `status: "needs_revision"` plus `feedback_record_ref`, and preserves the current plan until `recordRevision` supplies its replacement.
- Reject never edits product files, never auto-generates an implementation transition, and never auto-starts.

### Read and Resume

```js
store.read(root, { kind: "delivery", id })
store.resume(root, {})
store.resume(root, { object_ref: { kind: "delivery", id } })
```

- `read` returns the canonical flattened view from the object's Runtime plus Record-backed references; it does not return Receipt lifecycle state as copied Runtime data.
- `resume` has exactly one optional input key, `object_ref`. If omitted, it selects `active.delivery`. If provided, it must equal `active.delivery`; it cannot select an arbitrary inactive object.
- Minimum Resume result:

```js
{
  delivery: <canonical current Delivery view>,
  continuation: {
    schema_version,
    object_ref,
    next_action,
    // other Continuation-owned fields are allowed
  },
  recovery: {
    pack_ref,
    pack_status: "current" | "stale" | "missing",
    replay_required: true | false,
    degraded: true | false,
    // bounded restore/replay facts may follow
  },
}
```

- A current Pack matches the same object and current Continuation/plan state, producing `pack_status: "current"` and no authority replacement.
- A valid older Pack produces `pack_status: "stale"` and `replay_required: true`; `delivery.status` still comes from current Runtime.
- If no Delivery Pack exists yet, Resume must not fail. It returns current Runtime/Continuation with `pack_ref: null`, `pack_status: "missing"`, and `degraded: true`; lifecycle authority remains usable while bounded recovery context is unavailable.
- A cross-object Pack or explicit non-active object fails closed.

### Expected error codes

Tests primarily assert behavioral error classes/messages, but implementation should expose these stable code families:

| Condition | Expected code |
| --- | --- |
| Unknown/missing input key, missing proposal/feedback, invalid compiler shape | `ERR_DELIVERY_SCHEMA_INVALID` |
| Delivery object does not exist | `ERR_DELIVERY_NOT_FOUND` |
| Transition is invalid from current state or wrong intent is used | `ERR_DELIVERY_STATE_INVALID` |
| Caller/active/runtime object mismatch | `ERR_DELIVERY_OBJECT_MISMATCH` |
| Same Delivery id already exists, including kind swap | `ERR_DELIVERY_OBJECT_EXISTS` |
| Different active Delivery is non-terminal | `ERR_DELIVERY_ACTIVE_EXISTS` or explicit `ERR_DELIVERY_OBJECT_MISMATCH` |
| Proposal revision/hash is stale, unchanged, or mismatched | `ERR_DELIVERY_PLAN_STALE` |
| Cycle Milestone order/dependency violation | `ERR_DELIVERY_MILESTONE_ORDER` |
| Required role missing, non-completed, or identity collision | `ERR_DELIVERY_EVIDENCE_INCOMPLETE` |
| Evidence path, type, symlink, or digest failure | `ERR_DELIVERY_EVIDENCE_INTEGRITY` |
| Explicit Resume object differs from active Delivery | `ERR_DELIVERY_RESUME_OBJECT_MISMATCH` |
| Receipt actor/intent/object/scope/plan drift | existing `ERR_RECEIPT_CONTEXT_DRIFT` |
| Receipt expired | existing `ERR_RECEIPT_EXPIRED` |
| Receipt consumed/reused or otherwise terminal | existing `ERR_RECEIPT_REPLAY` / `ERR_RECEIPT_UNUSABLE` |
| Corrupt Recovery Pack | existing `ERR_RECOVERY_PACK_CORRUPT` |

Direct M3 Pack selection may still expose `ERR_RECOVERY_PACK_NOT_FOUND`; Delivery `resume` must translate that one absence case into the `missing` degraded result above.

Receipt drift may mutate only the Receipt to `invalidated`; Delivery lifecycle state must remain unchanged. Validation failures that do not involve Receipt invalidation are zero-write failures.

## Exact Workflow Intent Router Contract

```js
resolveWorkflowIntent(input, {
  repoRoot,
  skillRoot,
  workspace: "current" | "unmanaged_brownfield",
  active_delivery: null | {
    status: "waiting_to_start" | "executing" | "pending_acceptance",
  },
})
```

- `input` is either canonical/compatibility slash syntax or natural user text.
- `repoRoot` is the target project/workspace root. It must never be used as the Skill backend root.
- `skillRoot` is an optional trusted ordinary Skill bundle root used only for backend verification and tests. If omitted, use the installed package/source Skill root derived from the commands module.
- `workspace` and `active_delivery.status` are routing context only; they do not become Workflow authority.
- Minimum available output fields are:

```js
{
  status: "available",
  canonical: "/hw:<route>",
  authority_intent: "<stable intent>",
  discoverable: true | false,
  delivery_kind: "goal" | "cycle", // only for Goal/Cycle proposal intents
  writes: [],
}
```

The objective fixture categories and required mappings are:

| Category | Natural/command route | `canonical` | `authority_intent` | Extra |
| --- | --- | --- | --- | --- |
| Single outcome without Milestones | Goal natural text or `/hw:goal ...` | `/hw:goal` | `delivery.propose_goal` | `delivery_kind: goal` |
| Ordered stages with final acceptance | Cycle natural text or `/hw:cycle ...` | `/hw:cycle` | `delivery.propose_cycle` | `delivery_kind: cycle` |
| Explicit start after approval | Start natural text or `/hw:start` | `/hw:start` | `delivery.start` | `discoverable: false` |
| Continue active Delivery | Resume natural text | `/hw:resume` | `delivery.resume` | public |
| Accept pending result | Acceptance natural text | `/hw:accept` | `delivery.accept` | contextual |
| Reject pending result | Rejection natural text | `/hw:reject` | `delivery.reject` | contextual |
| Ambient maintenance record | Maintenance natural text | `/hw:maintain` | `maintain.record` | public |
| Adopt unmanaged project | Init natural text | `/hw:init` | `workspace.initialize` | public |
| User does not know where to start | Guide natural text | `/hw:guide` | `workflow.guide` | public |

Natural and slash variants in the same category must return the same `canonical` and `authority_intent`. Internal explicit start is available as behavior but remains non-discoverable. Public/contextual routes require a real contained ordinary Child `SKILL.md` under `skillRoot` or the installed default; missing or symlinked backends return `status: "unavailable"`, include `writes: []`, and cannot be advertised. A target workspace without a local `skills/` tree remains routable. Unknown, deferred, and removed inputs also return a zero-write non-available result rather than invoking legacy writers.

## Canonical Delivery Shape Used By Tests

```yaml
schema_version: '1'
object_ref: { kind: delivery, id: <safe-id> }
delivery_kind: goal|cycle
status: proposed|needs_revision|waiting_to_start|executing|verified|pending_acceptance|accepted
revision: <non-negative integer>
plan_hash: <sha256>
plan_record_ref: { id: <record-id>, semantic_hash: <sha256> }
topology: <canonical topology>
milestones: # Cycle only
  - { id: M1, order: 1, status: pending|executing|verified|blocked|needs_revision|superseded|skipped }
updated_at: <captured Clock timestamp>
```

The Goal view must not expose a `milestones` key. Receipt lifecycle fields must not be copied into Runtime.

## Planned RED Suites

- `core/test/goal-lifecycle.test.js`
- `core/test/cycle-lifecycle-vnext.test.js`
- `core/test/adaptive-plan.test.js`
- `core/test/revision-start-boundary.test.js`
- `core/test/delivery-receipts.test.js`
- `core/test/execution-topology.test.js`
- `core/test/delivery-proposal-preflight.test.js`
- `core/test/fixtures/c21-m6/**`

The exact RED and baseline results follow.

## RED Result

Command:

```bash
node --test \
  core/test/goal-lifecycle.test.js \
  core/test/cycle-lifecycle-vnext.test.js \
  core/test/adaptive-plan.test.js \
  core/test/revision-start-boundary.test.js \
  core/test/delivery-receipts.test.js \
  core/test/execution-topology.test.js
```

Result:

```text
tests 37
pass 0
fail 9
skip 28
cancelled 0
todo 0
```

The skipped tests are genuine cascades behind missing production modules. Every root capability gap has a non-skipped failing assertion.

Failure classification:

| Class | Failures | RED evidence |
| --- | ---: | --- |
| Planning API absent | 2 | missing `core/src/planning/index.js`; Goal/Cycle compiler contract cannot load |
| Delivery API absent | 3 | missing `core/src/delivery/index.js`; Goal, Receipt, and revision/start contracts cannot load |
| Execution topology API absent | 1 | missing `core/src/execution-topology/index.js` |
| Behavior router absent | 1 | `resolveWorkflowIntent` is not exported |
| Nine-command exposure/backend absent | 2 | discovery still returns only Guide/Init; `skills/goal/SKILL.md` is missing |

There were no fixture, parser, syntax, process-runner, or test-harness failures in RED.

## Baseline Validation

Syntax command:

```bash
node --check \
  core/test/fixtures/c21-m6/helpers.js \
  core/test/goal-lifecycle.test.js \
  core/test/cycle-lifecycle-vnext.test.js \
  core/test/adaptive-plan.test.js \
  core/test/revision-start-boundary.test.js \
  core/test/delivery-receipts.test.js \
  core/test/execution-topology.test.js
```

Result: PASS.

Related M2/M3/M4/command baseline command:

```bash
node --test \
  core/test/runtime-store.test.js \
  core/test/record-store.test.js \
  core/test/receipt-store.test.js \
  core/test/snapshot-store.test.js \
  core/test/recovery-journal.test.js \
  core/test/context-capsule.test.js \
  core/test/recovery-pack.test.js \
  core/test/recovery-faults.test.js \
  core/test/init-bootstrap.test.js \
  core/test/legacy-workspace-inspection.test.js \
  core/test/command-exposure.test.js \
  core/test/root-skill-router.test.js
```

Result: `152/152 PASS`, `0 fail / 0 skip`.

## Scenario Coverage

- Goal: a real temporary Git repository crosses fresh Node processes for proposal, approval, explicit start, verification, pending acceptance, rejection, revised Design, renewed approval, renewed explicit start, final verification, manual acceptance, Recovery Pack sealing, and Resume.
- Cycle: a second real temporary Git repository performs the same lifecycle with two ordered Milestones. It proves M2 cannot verify before M1 and that Milestones never receive user acceptance gates.
- Both scenarios compare product-file snapshots before explicit start, require on-disk separated worker evidence, and assert the final fresh-process Resume selects the same accepted object.
- Separate stale-Pack coverage proves a valid older Pack cannot overwrite newer Runtime state.

These scenarios are currently skipped only because their production entry modules do not yet exist. They are not reducer-only pseudo-tests.

## Files Added

- `core/test/goal-lifecycle.test.js`
- `core/test/cycle-lifecycle-vnext.test.js`
- `core/test/adaptive-plan.test.js`
- `core/test/revision-start-boundary.test.js`
- `core/test/delivery-receipts.test.js`
- `core/test/execution-topology.test.js`
- `core/test/fixtures/c21-m6/helpers.js`
- `core/test/fixtures/c21-m6/workflow-intents.json`
- `.pipeline/reviews/C21/M6/test-evidence.md`

No production source, live Workflow authority, M1-M5 evidence, or existing test file was modified.

## Risks And GREEN Follow-up

- `core/test/command-exposure.test.js` and `core/test/root-skill-router.test.js` currently preserve the M4 bootstrap snapshot where only Guide/Init are available. The M6 nine-command implementation will intentionally invalidate those phase-specific current-state assertions. This TEST worker did not modify M4-owned files; the main/test owner must reconcile those assertions at GREEN without weakening backend verification or the historical M4 evidence.
- The two E2E scenarios exercise current M1-M4 transaction/authority APIs and the certified M3 Recovery Pack format. If implementation chooses a different return shape than this documented handoff, change production or explicitly revise the handoff before touching tests.
- GREEN must run these six suites without skips, then rerun the related baseline and full Core suite. Passing only API-export assertions is not completion.

## Post-Implementation Usability RED

Independent TEST first reproduced the implementation checkpoint at `40/40 PASS`, `0 fail / 0 skip`, including both real Git/fresh-process scenarios. AUDIT then identified that those scenarios manually sealed a Delivery Pack through the test helper before Resume, which is not part of the normal Child Skill path.

Two minimal external-workspace acceptance tests were added:

```bash
node --test \
  --test-name-pattern='fresh-process Resume degrades|target workspace repoRoot' \
  core/test/goal-lifecycle.test.js \
  core/test/adaptive-plan.test.js
```

Result:

```text
tests 2
pass 0
fail 2
skip 0
```

Stable blockers:

1. `Init -> proposeGoal -> fresh-process resume` without test-only Pack sealing throws `ERR_RECOVERY_PACK_NOT_FOUND`. Required behavior is a Runtime/Continuation-backed degraded Resume with `pack_status: missing`; product files must remain unchanged.
2. `resolveWorkflowIntent('/hw:goal', { repoRoot: <target-project> })` treats the target project as the Skill bundle and reports a missing focused backend. Required behavior separates target `repoRoot` from optional backend `skillRoot`, defaulting backend discovery to the installed Skill package.

These failures block the usable external-project checkpoint. They are production behavior failures, not legacy prose or command-count assertions, and must not be suppressed by manually sealing a Pack in the test or copying Skills into every target project.

## Proposal Preflight RED

Command:

```bash
node --test core/test/delivery-proposal-preflight.test.js
```

Result:

```text
tests 9
pass 3
fail 6
skip 0
```

Observed behavior:

- Same-ID Goal replacement in `proposed` and `accepted` states: both failed because no rejection occurred and existing authority was overwritten.
- Same-ID Goal-to-Cycle kind swap: failed because no rejection occurred.
- Different-ID proposal while old active Delivery is non-terminal: Goal-proposed-to-Cycle and Cycle-executing-to-Goal both passed the fail-closed whole-tree zero-write contract.
- Accepted Goal-to-new-Cycle: failed before the injected M1 fault because production rejected every different active object.
- Accepted Cycle-to-new-Goal: failed with `ERR_DELIVERY_OBJECT_MISMATCH` for the same reason.

The successful rollover contract verifies transaction rollback after `after_prepare`, atomic active-pointer switching, preservation and readability of the old accepted Runtime/Plan Record, and unchanged product files.

## Revision 2: Proposal, Rejection, And External Routing Preflight

Revision 2 adds focused behavior coverage in:

- `core/test/delivery-proposal-preflight.test.js`
- `core/test/command-skill-root-routing.test.js`

The proposal tests compare the complete temporary workspace byte tree for every fail-closed path. This binds the zero-write requirement across Runtime, Continuation, active pointer, Records, Receipts, manifest, transaction residue, and product files rather than checking only the flattened Delivery view.

The current focused command is:

```bash
node --test \
  core/test/delivery-proposal-preflight.test.js \
  core/test/command-skill-root-routing.test.js
```

Current result after the concurrent proposal-preflight implementation landed:

```text
tests 10
pass 6
fail 4
skip 0
```

Now GREEN:

- A same-ID Goal proposal cannot overwrite an accepted Goal.
- A same-ID Goal-to-Cycle kind swap cannot overwrite accepted authority.
- A different ID remains blocked with whole-tree zero-write while the active Delivery is non-terminal.
- Once the old active Goal is accepted, a new Goal or Cycle ID can be proposed and the active pointer switches while the old Runtime and Plan Record remain readable and byte-stable.
- `resolveWorkflowIntent` honors an explicit installed-bundle `skillRoot` while `repoRoot` remains the external target workspace.

Remaining stable RED blockers:

1. `resolveCommandRoute('/hw:goal', { repoRoot: <target>, skillRoot: <installed-bundle> })` returns `unavailable` because it still inspects `repoRoot` as the backend root.
2. `discoverableCommandMap('codex', { repoRoot: <target>, skillRoot: <installed-bundle> })` returns an empty list instead of the nine installed entries for the same reason.
3. After manual rejection, `buildDeliveryReceiptContext(..., { intent: 'delivery.approve' })` still succeeds before `recordRevision` has persisted a replacement plan. The feedback-pending state must reject context construction and Receipt issue with no writes; approval becomes valid only after a changed, incremented proposal is recorded.
4. A pre-rejection approval Receipt used after rejection is rejected only after production reserves and invalidates it. The required preflight must reject before any Receipt or other authority write, preserving the old `plan_hash` and `plan_record_ref` exactly.

The Root Skill external-project contract is intentionally explicit: `repoRoot` identifies the target workspace and `skillRoot` identifies the trusted installed Skill bundle. Legacy bundle-projection calls may continue treating a lone `repoRoot` as a compatibility bundle alias when no target/workspace semantics are supplied, but normal external routing must not require Child Skills inside the target project.

## Revision 2 Independent GREEN Attempt

The post-fix R2 command is GREEN:

```bash
node --test \
  core/test/delivery-proposal-preflight.test.js \
  core/test/command-skill-root-routing.test.js
```

Result: `10/10 PASS`, `0 fail / 0 skip`.

The files also pass independently:

- Delivery proposal/rejection preflight: `7/7 PASS`, `0 fail / 0 skip`.
- Explicit `skillRoot` routing across `resolveCommandRoute`, `resolveWorkflowIntent`, and `discoverableCommandMap`: `3/3 PASS`, `0 fail / 0 skip`.

The M6 six-suite command was then rerun independently:

```bash
node --test \
  core/test/goal-lifecycle.test.js \
  core/test/cycle-lifecycle-vnext.test.js \
  core/test/adaptive-plan.test.js \
  core/test/revision-start-boundary.test.js \
  core/test/delivery-receipts.test.js \
  core/test/execution-topology.test.js
```

Result: `42 tests`, `41 pass / 1 fail / 0 skip`.

The one compatibility regression is `backend discovery fails closed when one of the nine Skill entries is missing or symlinked`. A legacy bundle-projection call supplies only `{ repoRoot: bundle }`, with no workspace/target semantics. After the fixture removes `bundle/skills/goal/SKILL.md`, discovery still advertises `/hw:goal` because the new root selection falls back to the default installed Skill root. This violates the bounded compatibility rule documented above: an explicit `skillRoot` must win for target-project calls, while a lone legacy `repoRoot` must remain the bundle root.

The M1 transaction and legacy-fence three-file command remains GREEN:

```bash
node --test \
  core/test/workspace-format.test.js \
  core/test/workspace-transaction.test.js \
  core/test/legacy-write-fence.test.js
```

Result: `65/65 PASS`, `0 fail / 0 skip`.

Static validation:

- Related M6 production and test JavaScript syntax: PASS.
- `git diff --check`: PASS.
- No trailing whitespace in the two R2 tests or this evidence file.

Verdict: the four R2 blockers are closed, but M6 is not yet fully GREEN because the lone-`repoRoot` bundle compatibility regression must be corrected and the 42-test suite rerun.

## Revision 2 Final Independent Closure

After the narrow legacy-alias fix, independent TEST reran every affected boundary.

Final results:

| Validation | Result |
|---|---:|
| M6 six-suite lifecycle/planning/router regression | `42/42 PASS`, `0 fail / 0 skip` |
| R2 proposal/rejection plus explicit `skillRoot` routing | `10/10 PASS`, `0 fail / 0 skip` |
| Root Skill compatibility router | `12/12 PASS`, `0 fail / 0 skip` |
| M1 transaction and legacy fence baseline | `65/65 PASS`, `0 fail / 0 skip` |
| Related JavaScript syntax | PASS |
| `git diff --check` | PASS |
| Trailing whitespace in scoped source/test/evidence | none |

The route precedence is now independently demonstrated:

1. A normal external target project with `repoRoot` and workspace semantics does not need local Child Skills; when `skillRoot` is absent it uses the installed default Skill bundle.
2. A legacy bundle-projection call can use a lone `repoRoot` only when that root is an ordinary Hypo-Workflow bundle identified by structured Root Skill frontmatter. Missing or symlinked focused backends then fail closed against that bundle instead of silently falling back to the installed default.
3. An explicit `skillRoot` always selects the trusted backend bundle independently of the target `repoRoot`.

The proposal and rejection preflight contracts also remain GREEN: existing IDs cannot be overwritten, non-terminal active deliveries block replacement with whole-tree zero writes, accepted deliveries can hand off atomically to a new ID while preserving old authority, and feedback-pending rejection cannot construct or consume approval before `recordRevision` persists a changed plan.

Final TEST verdict: **PASS**. The R2 blockers and the legacy `repoRoot` compatibility regression are closed with no focused M6, Root router, M1 transaction/fence, syntax, or whitespace regression found.

## Current Objective Contract Migration

The remaining Full Core failures were four historical text contracts, not production behavior failures. They required every focused Skill to repeat the old worker-separation chapter or the literal `workflow commit helper` phrase. That would have re-expanded the intentionally short current Skills and incorrectly imposed exactly three workers on every task.

Initial reproduction:

```bash
node --test \
  core/test/codex-subagent-discipline.test.js \
  core/test/workflow-commit.test.js
```

Result: `16 tests`, `12 pass / 4 fail / 0 skip`. The failures were the three old worker-prose assertions and the focused-Skill commit-helper phrase assertion.

Only those two test files were changed. No production module, Skill, Runtime authority, legacy authority, or other test was edited.

The replacement contracts use current behavior:

- `selectExecutionTopology` proves material engineering selects strict, separated `test` / `implement` / `audit` roles; explicitly trivial reversible work selects `solo-verified`; migration selects extractor/curator/auditor/deterministic-writer; custom policy preserves caller-selected roles.
- `assessExecutionEvidence` proves strict work requires complete role coverage and distinct worker identities, while the selected solo topology accepts one verified implementation worker.
- Plan and Resume are checked only for policy selection, distinct identities when required, lifecycle evidence, close handling, and explicit degradation. They do not have to duplicate the full worker manual or claim a universal exactly-three topology.
- The legacy `commitWorkflowUpdate` contract remains documented and its existing behavioral tests remain intact.
- Current Goal proposal and explicit start are exercised through `createDeliveryStore`. Missing transaction IDs reject with whole-workspace zero writes; successful mutations emit M1 prepare/manifest-last transaction phases and use unique IDs.
- Approval and start retain separate Receipt boundaries. Resume reconstructs the executing Delivery read-only, including the valid no-Pack degraded result, without changing any workspace byte.
- Current Goal/Cycle/Accept/Reject/Resume Skills are checked for their focused Delivery-store call and mutation-ID/read-only contracts, not a legacy helper phrase.

Focused replacement command:

```bash
node --test \
  --test-name-pattern='execution topology selects|execution evidence enforces|Plan and Resume reference|legacy commit helper remains' \
  core/test/codex-subagent-discipline.test.js \
  core/test/workflow-commit.test.js
```

Result: `4/4 PASS`, `0 fail / 0 skip`.

Complete changed-file regression result: `16/16 PASS`, `0 fail / 0 skip`.

Supporting objective baseline:

```bash
node --test \
  core/test/execution-topology.test.js \
  core/test/delivery-proposal-preflight.test.js \
  core/test/workspace-transaction.test.js
```

Result: `34/34 PASS`, `0 fail / 0 skip`.

TEST verdict for this migration: **PASS**. The assertions now follow current authority and policy APIs without weakening strict material-work separation or restoring retired long-form Skill prose.
