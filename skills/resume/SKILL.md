---
name: hypo-workflow-resume
description: Resume the active manifest-based Hypo-Workflow Delivery from Runtime, Continuation, and the latest valid Recovery Pack. Use for /hw:resume or when tracked Goal/Plan work must continue after restart or compaction.
---

# Resume

## 输出语言规则

用户可见内容遵循项目输出语言；缺失时跟随当前对话语言。内部 schema key 保持英文。

1. Resolve the current Session through Work Placement first. If it is bound to one Delivery, resume that exact object. If multiple Work Items are available but the Session is unbound, show the candidates and require one explicit selection; never inherit `active.delivery` in that case. If the selected Work Item is an Experiment, route to `/hw:experiment` instead of treating it as a Delivery.
2. Only when no Work Placement registry exists, read the reference-only `.pipeline/runtime/active.yaml` and use `active.delivery` as a legacy fallback. Then load that object's Runtime and Continuation.
3. Validate and select its latest Recovery Pack. The Pack supplies bounded context only; Runtime remains lifecycle authority.
4. If no Pack exists yet, still resume authoritative Runtime/Continuation and report `pack_status: missing`, `pack_ref: null`, and degraded context. Do not block first-use projects merely because no compaction/checkpoint Pack has been sealed.
5. If Pack Continuation matches current Continuation, report `current`; otherwise report `stale` and replay bounded Journal context without replacing lifecycle state.
6. Continue the exact `next_action`. Do not replay completed transitions or accept an arbitrary inactive object.

`await_stone_acceptance` is a real stop: show the Stone's concrete artifact, review scope, and acceptance criteria before asking. All other verified ordinary Milestones continue automatically. `request_explicit_start` occurs only after the user explicitly chose confirm-without-start; ordinary proposal confirmation should already have used `delivery.approve_and_start`.

If Runtime or Continuation contains `worker_routing`, validate and reuse that exact semantic decision, Task Assessment, reason codes, failure count, and policy version. Recovery Capsule Worker projections may restore the same bounded fields, but they never override newer Continuation. Do not reclassify on Resume, and do not let routing metadata change role identity, evidence, acceptance, or user authority.

Use `createDeliveryStore({ clock }).resume(root, {})`. Never shell-execute a saved command and never read legacy state as fallback in a current workspace.

When the resumed Delivery owns source-changing Repository claims, preserve its lease/fencing identity and integration target. It cannot request final acceptance until a digest-verified Host proof binds the claim commits and target to a successful `git merge-base --is-ancestor` check.

Import `createDeliveryStore` from the installed Skill bundle's `core/src/index.js`; pass the target workspace separately as `root` and use a zero-argument timezone-bearing Clock. Resume itself is read-only and takes no transaction `{ id }`.

The target workspace root and installed Skill bundle root are separate. `repoRoot` identifies the project whose `.pipeline/` is resumed; backend routing uses explicit `skillRoot` or the installed bundle default, never the target repository as a Skill directory.

For worker-separated work, preserve requested -> started -> completed|failed|blocked -> closed|close_failed evidence and distinct identities. When `/hw:resume` stops, blocks, aborts, or completes, close/release workers it opened or record `close_failed`; incomplete lifecycle evidence blocks worker-separated completion.

When a resumed Worker needs a different semantic handoff, start it with no-history or bounded-history context. A full-history fork inherits its parent execution context and cannot be silently switched.
