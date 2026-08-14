# C23 M7 Semantic Worker Routing Implementation Evidence

- Worker ID: `main`
- Role: `implement`
- Delivery: `c23-experiment-management`
- Milestone: `M7`
- Recorded at: `2026-07-18T20:55:10+08:00`
- Verdict: `IMPLEMENTED_READY_FOR_INDEPENDENT_AUDIT`

## Conclusion

M7 implements a provider-independent Worker Routing contract after topology selection. The host AI generates and shows one bounded Task Assessment per Worker; Core validates it and deterministically returns only `mechanical`, `standard`, `explore`, `critical`, or `escalation`. The decision is restart-safe across Runtime, Continuation, Delivery transitions, Worker Journal events, Recovery Capsule updates, Codex Subagent hooks, and fresh-process Resume.

The implementation does not select a concrete model, execution provider, credential, prompt, or reasoning effort. It does not change worker identity, role evidence, acceptance, user authority, Hook enablement, plugin metadata, cachebuster, installed plugins, VSP-Codex, `dist/`, or `redskill-package/`.

## Technical Approach

1. `validateTaskAssessment` accepts an exact v1 object with bounded complexity, uncertainty, oracle strength, blast radius, reversibility, risk flags, and visible summary. Unknown fields, raw secrets, hidden reasoning, prompt carriers, invalid enum values, and oversized content fail closed.
2. `selectWorkerRouting` applies deterministic precedence `escalation > critical > explore > standard > mechanical`. Canonical mechanical operations are `status`, `format`, `read-only-summary`, and `deterministic-test-command` with exact reason codes.
3. Security, migration, irreversible work, or two distinct failed execution routes escalate. Weak oracle, independent audit, architecture, recovery conflict, high blast radius, or risk flags are critical. Unknown root cause, candidate comparison, high uncertainty, or investigation are explore.
4. Same-route retries, cancellation, Worker startup failure, and network failure do not increase the distinct failed-route count. Persisted reason codes are class-bound, and persisted assessment/failure signals cannot be silently downgraded.
5. `resolveWorkerRoutingHandoff` implements `off`, `advisory`, and `required` host-capability behavior without resolving a host implementation. The fixed config threshold is `failure_escalation_threshold: 2`; the renamed key is rejected.
6. Runtime and Continuation validate the decision. Delivery lifecycle writes preserve it. Resume reuses it rather than reclassifying. Recovery Capsule carries the active decision and per-Worker projection.
7. Codex `SubagentStart` displays the visible assessment and journals the decision. `SubagentStop` recovers that exact Worker's open `worker.started` decision, so a later test/audit route cannot relabel an earlier Worker.

## Modified Modules

- `core/src/worker-routing/index.js`: assessment schema, five-class policy, failure accounting, persisted-decision validation, and host handoff mode.
- `core/src/index.js`: public Worker Routing exports.
- `core/src/config/index.js`: advisory default, fixed policy version/threshold, mode validation, and continued `automation.codex.external_model_routing=false` enforcement.
- `core/src/runtime/index.js`: persisted Worker Routing validation.
- `core/src/delivery/index.js`: routing preservation across Delivery lifecycle writes and Resume views.
- `core/src/recovery/capsule.js`: active and per-Worker routing projections.
- `core/src/codex-hooks/index.js`: bounded start guidance, Journal payloads, and frozen per-Worker stop inheritance.
- `SKILL.md`, `skills/goal/SKILL.md`, `skills/cycle/SKILL.md`, `skills/plan/SKILL.md`, `skills/resume/SKILL.md`: host generation/display, topology separation, routing modes, persistence, and Resume guidance.
- `core/src/docs/index.js`, `docs/reference/configuration.md`, `docs/en/reference/configuration.md`, `docs/platforms/codex.md`, `docs/en/platforms/codex.md`: field definitions, route table, config, Codex handoff, and non-goals.
- `core/test/c23-m7-worker-routing.test.js`, `core/test/fixtures/c23-m7/worker-routing-cases.json`, `tests/regression-catalog.json`: maintained independent oracle and fixtures.

## Test Design And Validation

- Focused M7, fresh main-thread run: `17/17 PASS`.
- Relevant maintained integration, independent test identity: `139/139 PASS`.
- Full maintained Core, independent test identity: `634/634 PASS`.
- Full maintained Core, fresh main-thread run: `59` files, `634/634 PASS`.
- Syntax checks for routing, Runtime, Delivery, config, Capsule, Codex Hooks, and docs source: PASS.
- Fixture/catalog JSON parsing and inventory: PASS.
- `git diff --check`: PASS.
- Transaction descendants and temporary test workspace residue: `0`.
- Concrete host-routing identifier scan: no concrete model or execution-provider mapping introduced.
- Plugin metadata hashes remain frozen:
  - `.codex-plugin/plugin.json`: `a5874b84d5338e3ee6de4a0ec87874bb0789346ad461017f1dc8e323179080dd`
  - `.claude-plugin/plugin.json`: `fe3689d85d7b50fb603b6d5e5e2077dc2a7e28f5a6e490d541214801da505ae8`
  - `.claude-plugin/marketplace.json`: `f6074d2a87b5bc6d0df668fc41f6b5745cb735ed7b5300b9d56599014743362f`

## Problems Encountered And Resolved

1. The initial mechanical fallback recognized only `change_size=trivial`; the four contract operations now have canonical names, exact reasons, and higher-priority precedence tests.
2. `SubagentStop` initially read the current Continuation route and could relabel a Worker after the next role was staged. It now reuses the same Worker's open start event.
3. Delivery transitions initially rebuilt Continuation without `worker_routing`. Delivery serialization now validates and preserves the decision through real verification and fresh Resume.
4. Persisted decisions initially validated only shape. Reason codes are now bound to their route class, and mandatory assessment/failure signals impose a fail-closed minimum class.
5. Extra legacy/quarantined checks exposed expected pre-C21 missing Root exports and retired CLI failures. They are cataloged as non-maintained and were not treated as acceptance evidence; maintained-only reruns are green.

## Expected Result

Before a Worker starts, the user can see a concise assessment of task difficulty and risk. Workflow hands the host one semantic class and explicit reasons. A host without semantic routing support either records advisory fallback or blocks under required mode. Resume and compaction retain the same decision and failed-route count, while topology, worker evidence, and final acceptance remain unchanged.

## Remaining Risks And Follow-Up

- The actual VSP-Codex mapping from semantic class to concrete runtime choice is intentionally out of scope and still requires the separate host-side implementation and contract alignment.
- This source pass intentionally does not update cachebuster, rebuild release artifacts, reinstall the plugin, or run a new real-host session.
- Recovery Pack for the active C23 Delivery is still missing/degraded; Runtime and Continuation remain authoritative and tests cover missing-Pack Resume.
- The deterministic policy is v1. New semantic triggers should be added as explicit operation/task/risk contracts with tests rather than inferred from prompts inside Core.
- Final independent audit and Delivery API verification are still required before Cycle-level acceptance can be requested.

## Frozen Implementation Hashes

- `core/src/worker-routing/index.js`: `7d0010fa29eef50d4c3435c3f9695ec167c17e0ea7629e8584a0b922bf96f0e3`
- `core/src/runtime/index.js`: `e143251c463a4f7dc77eb63d2007e7cc9d99d6834ef94691f60ec61f3f0766a5`
- `core/src/delivery/index.js`: `5c6096cb5cc7a7fe4efba40cc367b708f1366854550b8bd43abf897da280836f`
- `core/src/config/index.js`: `be4cbce7f8c8fefbac7cb5cd2351ff0630e43313fd903d171570ded544ed92bf`
- `core/src/recovery/capsule.js`: `d48832c6161225c085584540d5c4bd8e2466e9fe724ad4d77210072b45f1e48d`
- `core/src/codex-hooks/index.js`: `b135e38b4fb1c832adb0c95ceee5d3c74c8db6182c8d6d15b1ebc337b767c146`
- `core/src/docs/index.js`: `4b7edf4ab0c8239cda4f4bcbf1258290d831656f9411a1318d06275b00312523`
- `core/src/index.js`: `830cd0333ff159960cd378ba31d32749a1bdebf6b707b6401619c0b513290c35`
- Focused test: `302277939e09260d70d36bf0522b816073899ac97852067126b69e2a11ce679b`
- Fixture: `bcb1b0e5fc5f61fa4c37baceed66f3e10f11610430f3e10b2e4cf29c1461f1e5`
- Catalog: `37a9c114a8c5bcc54dcdd389d276e75fadf8e84ab3064127e656de7df2515891`
