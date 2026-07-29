# C21-M6 IMPLEMENT Evidence

- Worker role: `implement`
- Scope: M6 production Core, command routing, focused Skills, and this evidence file
- Test ownership: unchanged; no `core/test/**` or TEST evidence files were edited
- Live authority: unchanged; no live `.pipeline` Runtime, Journal, Capsule, Pack, or legacy authority file was edited
- Result: implementation complete and ready for independent TEST/AUDIT

## Conclusion And User-Visible Change

The minimum usable delivery checkpoint is implemented. A newly initialized external repository can now persist a real Goal or ordered Cycle into the manifest-based workspace, require separate approval and explicit start, validate worker evidence, enter final manual acceptance, record rejection and a revised proposal, and resume from a fresh process without treating a transcript or stale Recovery Pack as lifecycle authority.

Runtime discovery exposes exactly the confirmed nine public/contextual routes:

```text
/hw:guide
/hw:init
/hw:goal
/hw:plan
/hw:cycle
/hw:maintain
/hw:resume
/hw:accept
/hw:reject
```

Explicit start remains an internal behavior. Deferred, removed, and other internal compatibility entries remain non-discoverable and zero-write.

## Technical Approach

### Adaptive planning

- Added deterministic `compileGoalDesign` and `compileCyclePlan` compilers.
- Goal has one Design and never exposes a fake Milestone list.
- Cycle has ordered dependency-checked Milestones and one aggregate acceptance contract.
- `plan_hash` is derived from canonical plan content.
- `assessPlanReadiness` uses unresolved material ambiguity instead of `min_rounds`.
- Goal selects Design; Cycle selects standard internal phases or durable Deep Plan from evidence.

### Execution topology

- Added `solo-verified`, `strict`, `migration`, and explicit `custom` profiles.
- Strict material work requires distinct `test`, `implement`, and `audit` identities.
- Migration requires extractor, curator, auditor, and deterministic-writer roles.
- Evidence assessment reports missing roles and identity collisions; Delivery additionally verifies contained ordinary file bytes against SHA-256 bindings.

### Delivery authority

- Added one Delivery store over the existing M1-M3 authority model rather than a second state system.
- Proposal atomically writes its Plan Record, Runtime, Continuation, and reference-only active pointer through the M1 transaction seam.
- M2 Receipts bind actor, intent, object, current state, revision, and plan hash.
- Approval stops at `waiting_to_start`; a distinct Receipt is required to enter `executing`.
- Revision writes structured Feedback and a superseding Plan Decision Record while remaining `needs_revision`.
- Cycle Milestones verify in order; only the final Delivery receives manual acceptance.
- Resume combines active pointer, Runtime/Continuation, and the latest valid M3 Pack. A stale Pack requests bounded replay but cannot replace Runtime state.

### Routing and Skills

- Added one behavior router for natural and slash intents with the existing ordinary-file backend check.
- Restored Goal to generator-facing `commandMap` while keeping discovery limited to the nine current routes.
- Replaced the root manual with a bounded compatibility index.
- Added the Goal Child Skill and focused current-format Plan, Cycle, Maintain, Resume, Accept, Reject, and Guide instructions.
- Maintain is explicit focused Record writing only; no ambient Hook/background automation is claimed in M6.
- Preserved Claude native `/resume` ownership by leaving the Hypo Resume Child Skill without the conflicting bare `name: resume` metadata.

## Modified Production Surfaces

- `core/src/planning/index.js`
- `core/src/execution-topology/index.js`
- `core/src/delivery/index.js`
- `core/src/commands/index.js`
- `core/src/index.js`
- `SKILL.md`
- `skills/goal/SKILL.md`
- `skills/plan/SKILL.md`
- `skills/cycle/SKILL.md`
- `skills/maintain/SKILL.md`
- `skills/resume/SKILL.md`
- `skills/accept/SKILL.md`
- `skills/reject/SKILL.md`
- `skills/guide/SKILL.md`

## Test Design And Validation

### M6 acceptance suites

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

Initial result: `40/40 PASS`, `0 fail`, `0 skip`. After usability Revision 1 added two regression contracts, the same six-suite command is `42/42 PASS`, `0 fail`, `0 skip`.

The suite includes two real temporary Git repositories. Goal and a two-Milestone Cycle cross fresh Node processes through proposal, approval, explicit start, real file evidence, verification, rejection, revised plan, renewed approval/start, final acceptance, Pack sealing, and Resume. Product snapshots prove Core does not edit product files before start or during feedback/rejection.

### M1 transaction and legacy fence

Focused workspace-format, transaction, and legacy-writer command result: `65/65 PASS`.

### M2/M3/M4 related regression

Result: `151/152 PASS`. The only failure is the historical M4 bootstrap snapshot asserting that Goal/Plan/Cycle/Maintain/Resume/Accept/Reject remain unavailable. That assertion is intentionally superseded by M6 and must be revised by TEST ownership.

### Full Core

Latest result after production and Skill fixes: `1003/1023 PASS`, `20 fail`, `0 skip`.

All remaining failures are historical text/phase contracts that expect the pre-M6 long Skill manuals or old command-map availability, including M4's two-command bootstrap state, legacy Knowledge archive wording, legacy workflow-commit-helper wording, old Plan/Subagent prose, and generated adapter inventories that predate Goal availability. Storage, Receipt, Recovery, transaction, M6 lifecycle, Skill-quality, Claude namespace, and technical-route focused behavior passed. IMPLEMENT did not modify these tests; TEST must classify and update current-state assertions without weakening backend or lifecycle verification.

### Additional checks

- `checkSkillQuality`: PASS after restoring the canonical output-language heading on all new focused Skills.
- Claude Resume namespace audit: PASS.
- P2 technical-route contract: `6/6 PASS`.
- Nine-route discovery smoke: exact expected list; Goal is present in generator `commandMap`.
- `git diff --check` on all owned files: PASS.
- Production syntax checks: PASS.

## Expected Result

Another initialized project can now use the focused Goal or Cycle Skill and Core API to create durable Records and Delivery Runtime under `.pipeline/`, survive process restart, and continue from the same authoritative lifecycle state. Approval cannot start work, feedback cannot authorize edits, and invalid/stale Receipt bindings cannot move Delivery state.

## Problems Encountered

- Temporary current-workspace fixtures may have a valid manifest without `runtime/active.yaml`; proposal now treats that as an empty reference pointer and creates the first Delivery pointer transactionally.
- Initial Receipt drift handling could leave a successfully reserved Receipt in `reserved` after caller scope/plan drift. The transition now validates supplied bindings through the Receipt store and mechanically invalidates reserved stale-state transitions.
- Adding `name: resume` caused a Claude native namespace conflict; the metadata was removed while retaining the focused `/hw:resume` backend.
- Full-suite historical prose tests substantially lag the new M6 command/Skill contract. They were documented rather than worked around by restoring the removed legacy manual.

## Risks And Follow-Up

- Receipt reservation and the final Runtime/Receipt consumption currently cross multiple individually recoverable M1 transactions. Normal success and all tested drift/replay/expiry paths are correct, but an interruption exactly between reservation, Runtime persistence, and consumption needs independent audit attention and may require a later transaction-level reconciliation hardening.
- Derived Record indexes are rebuildable and are not part of the proposal's authoritative multi-file transaction; downstream maintenance should ensure index refresh policy remains explicit.
- M7 still owns ambient Maintain recording and Codex Hook reminders. This implementation must not be described as Hook-complete.
- M8 still owns physical deletion and compatibility cleanup. No legacy file was removed here.
- TEST must update superseded M4/current-state and long-form Skill assertions, then rerun the full suite before M6 completion.

## Usability Revision 1

Two first-use failures reported by TEST were repaired without expanding M6 scope.

### Pack-less Resume

Resume no longer treats the absence of a Recovery Pack as absence of Delivery authority. When the active Delivery has valid Runtime and Continuation but no Pack has been sealed, fresh-process Resume returns:

```yaml
recovery:
  pack_ref: null
  pack_status: missing
  replay_required: false
  degraded: true
```

The Delivery and Continuation remain authoritative and unchanged. Existing `current` and `stale` Pack behavior is preserved.

Focused Goal result: `6/6 PASS`, including the new external temporary-repository fresh-process no-Pack Resume scenario.

### Skill bundle/workspace root separation

`resolveWorkflowIntent` now treats context roots as separate responsibilities:

- `repoRoot`: target project workspace and routing context only.
- `skillRoot`: explicit trusted Skill bundle root for ordinary-file backend validation.
- omitted `skillRoot`: the installed Hypo-Workflow bundle default.

`resolveCommandRoute(..., { repoRoot })` and `discoverableCommandMap(..., { repoRoot })` retain the legacy bundle-root alias only when the candidate root proves its identity through root `SKILL.md` frontmatter `name: hypo-workflow`. Explicit `skillRoot` always wins. `resolveWorkflowIntent` never treats the target `repoRoot` as a Skill backend. Missing and symlinked backends remain fail-closed.

Focused adaptive-plan result: `11/11 PASS`, including default bundle lookup, explicit valid `skillRoot`, and explicit missing-backend fail-closed cases.

### Revision validation

- Six M6 suites: `42/42 PASS`, `0 fail`, `0 skip`.
- Production syntax checks: PASS.
- Owned-file `git diff --check`: PASS.
- No test, fixture, live authority, legacy authority, or M1-M5 evidence file was modified by IMPLEMENT.

## Usability Revision 2

The remaining compatibility projection and external-workspace paths now share one unambiguous root contract.

### Verified bundle alias

`resolveCommandRoute` and `discoverableCommandMap` resolve their backend root in this order:

1. explicit `skillRoot`;
2. a legacy `repoRoot` only when structured root Skill frontmatter identifies `name: hypo-workflow`;
3. the installed bundle default.

This preserves old projected-bundle checks, including missing Child Skill and symlink fail-closed behavior, without reintroducing the bug where an ordinary target workspace was mistaken for the installed Skill bundle.

### Real external-workspace persistence smoke

Core was imported through the active Codex installation entry, then exercised against a new directory outside this repository:

```text
Init -> propose Goal -> fresh Resume -> route /hw:goal
```

The smoke created a valid manifest, bootstrap Records and Runtime, a Goal Decision Record, Goal Runtime, Goal Continuation, derived indexes, and a Context Capsule: 12 real `.pipeline` files in total. Resume returned the same `external-goal` in `proposed` state with `next_action: request_delivery_approval`. With no Recovery Pack yet, it correctly reported `pack_status: missing` and `degraded: true`; `/hw:goal` routing remained `available` for the external target.

### Revision 2 validation

- Six M6 acceptance suites: `42/42 PASS`.
- Proposal preflight plus external `skillRoot` routing: `10/10 PASS`.
- Legacy bundle routing, missing backend, and symlink security: `12/12 PASS`.
- Init bootstrap, adoption, zero-write, and recovery regression: `17/17 PASS`.
- Skill quality and Claude Resume namespace: `10/10 PASS`.
- Production syntax checks: PASS.
- No test, fixture, live authority, legacy authority, or M1-M5 evidence file was modified by IMPLEMENT.
