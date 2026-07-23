# C21-M6 Goal And Cycle Delivery Core With Adaptive Plan

## Objective

Deliver the primary product loop: Design/Plan, explicit start, separated execution, verification, manual acceptance, rejection, and Resume for both Goal and Cycle.

## Requirements

- Goal and Cycle are peer Main Delivery kinds.
- Goal uses one Design contract and does not expose a fake Milestone sequence.
- Cycle contains ordered Milestones and uses one final Cycle-level manual acceptance gate.
- Plan selects depth from evidence: Goal Design, standard named phases for weaker models, or internal Deep Plan when durable research is needed.
- Remove fixed `min_rounds`; questions stop when material ambiguity is resolved.
- Approval creates `waiting_to_start`; implementation begins only after explicit start intent.
- Directional feedback creates `needs_revision` and a revised proposal, not editing authorization.
- Resume selects the exact continuation; Accept/Reject require scoped Receipts.
- Material work enforces separated roles; small reversible fixes may use `solo-verified` only when explicitly selected by policy.
- Expose exactly the confirmed nine public/contextual commands; keep supporting capabilities natural/internal.

## Boundaries

In scope: delivery and planning modules, Goal/Cycle/Milestone state machines, acceptance rewrite, Guide/Resume/status views, execution topology, public core Skills and exposure registry.

Out of scope: Maintain recording, Codex Hooks, Stash/experiments, deferred Analysis/Audit/Quality/Explore/Docs/PR/Release/Optimize, and non-Codex adapters.

## Technical Solution

Implement shared Delivery transitions over object runtime while preserving distinct Goal and Cycle contracts. Compile approved plans into Records plus a plan hash. A scoped approval Receipt moves work to `waiting_to_start`; explicit start moves it to `executing`. Execution topology is selected from risk and validation needs rather than one universal worker count.

## Technical Route

1. Write RED end-to-end tests for Goal, multi-Milestone Cycle, adaptive Plan, revision/start boundary, Receipt gates, Resume, and worker separation.
2. Implement shared Delivery states and smaller Milestone states.
3. Implement Goal Design compiler and Cycle Plan compiler using evidence-driven questions.
4. Preserve named Discover/Technical Stack/Architecture/Decompose/Generate phases as internal options for weaker-model or complex Cycle planning.
5. Implement plan hash, approval Receipt, `waiting_to_start`, explicit start, executing, verified, pending acceptance, and accepted transitions.
6. Implement feedback Record, `needs_revision`, revised plan hash, and renewed start boundary.
7. Implement Resume selection and user-visible Guide/status/report/explain projections from the same authority graph.
8. Implement topology selection for `solo-verified`, strict test/implement/audit, migration, and custom separated roles.
9. Rewrite core Child Skills and exposure registry to produce the exact nine-command public/contextual surface.
10. Run real temporary-repository Goal and Cycle scenarios across process restarts.

## Research Required

Status: resolved.

Evidence: the user confirmed Goal/Cycle peer semantics, Goal manual acceptance, richer Plan support for weaker models, Grill Me absorption, explicit start after revision feedback, and separated worker roles for material work.

## Risks And Alternatives

- Risk: adaptive planning behaves inconsistently across hosts/models.
- Risk: explicit start creates friction for trivial direct tasks.
- Rejected: one fixed planning sequence; it over-plans Goal and under-supports weaker models.
- Rejected: auto-start after feedback; it caused unwanted edits.
- Mitigation: observable phase-entry criteria, concise Guide routing, explicit proposal/start distinction, and task-size scenarios.

## Test Specification

- Goal has no Milestone array in its user contract.
- Cycle enforces order and cannot accept before every required Milestone is verified.
- Goal and Cycle both survive fresh-process Resume.
- Plan asks on unresolved material ambiguity and stops without round quotas.
- Feedback leaves repository product files unchanged until explicit start.
- Stale plan hash or wrong actor/scope blocks Accept/Reject/start.
- Missing required worker evidence blocks completion.
- Public/contextual discovery equals the nine confirmed commands.

## Validation Commands And Scenarios

```bash
node --test \
  core/test/goal-lifecycle.test.js \
  core/test/cycle-lifecycle-vnext.test.js \
  core/test/adaptive-plan.test.js \
  core/test/revision-start-boundary.test.js \
  core/test/delivery-receipts.test.js \
  core/test/execution-topology.test.js
```

Scenarios: complete one Goal and one two-Milestone Cycle through reject -> revised proposal -> explicit start -> manual accept in temporary Git repositories with a fresh-process Resume.

Pass signal: no implementation occurs before start; required role evidence exists; lifecycle resumes correctly; final acceptance uses valid Receipts.

Pseudo-test rejection: lifecycle reducer unit tests alone are insufficient; at least two full repository scenarios must exercise persistence and restart.

## Evidence Paths

- `.pipeline/reviews/C21/M6/test-evidence.md`
- `.pipeline/reviews/C21/M6/implementation-evidence.md`
- `.pipeline/reviews/C21/M6/audit.md`
- `.pipeline/reports/05-goal-cycle-delivery-core-and-adaptive-plan.report.md`

## Audit Focus

- Goal is not implemented as a one-Milestone Cycle.
- Milestones do not create duplicate user acceptance gates.
- Feedback cannot authorize product edits.
- Resume and Guide read the same authority graph.
- Public command discovery and internal capability boundaries match the confirmed design.

## Subworker Assignment Plan

Status: authorized, strict separation.

- `test`: owns lifecycle/scenario fixtures, RED/GREEN evidence, and pseudo-test rejection.
- `implement`: owns delivery/planning/acceptance/Guide/Skill implementation and cannot edit tests.
- `audit`: independently reviews lifecycle semantics, command exposure, worker evidence, and user authorization boundaries.
- Main agent: orchestration, protected runtime commits, and final integration only.

## Expected Artifacts

- delivery/planning/topology modules
- rewritten public core Skills and views
- end-to-end lifecycle tests
- evidence and completion reports
