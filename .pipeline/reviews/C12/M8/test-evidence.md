# C12/M8 Test Evidence

Worker: test
Scope: final acceptance/regression tests and test evidence only. No production code or playbook documentation was implemented.

## Changes

- Added `core/test/deep-plan-real-scenario.test.js`.
  - Covers a Hypo-Agent replan lifecycle fixture: `new -> ask -> research -> map -> drill -> readiness -> convert`.
  - Asserts converted output preserves Feature Queue order, acceptance depth, risks, unknowns, and ordinary Plan confirmation requirements.
  - Adds RED playbook existence/keyword checks for:
    - `.pipeline/playbooks/C12-hypo-agent-deep-plan.md`
    - `.pipeline/playbooks/C12-research-code.md`
- Extended `core/test/deep-plan-research.test.js`.
  - Asserts `allowed_actions: ["remote_clone"]` still cannot bypass confirmation.
  - Adds RED coverage that `remote_clone` requires `confirmed_remote_actions`, not only broad `network_confirmed`.
  - Adds RED coverage that confirmed remote clone still requires bounded research cache plus implementation-code `evidence_refs`; README-only evidence is insufficient.

## Commands Run

```bash
uv run -- node --test core/test/deep-plan-real-scenario.test.js core/test/deep-plan-research.test.js core/test/deep-plan-handoff.test.js
```

Result: failed as expected for RED gaps.

- Pass: 14
- Fail: 3
- Failing tests:
  - `research-code playbooks exist and require explicit remote confirmation, bounded cache, implementation inspection, and code evidence refs`
    - `ENOENT: no such file or directory, open '.pipeline/playbooks/C12-hypo-agent-deep-plan.md'`
  - `assessDeepPlanResearchAction requires explicit confirmed_remote_actions for remote_clone`
    - Current behavior allows `remote_clone` when `network_confirmed: true`; expected false until `confirmed_remote_actions: ["remote_clone"]`.
  - `confirmed remote_clone still requires bounded research cache and implementation code evidence refs`
    - Current reason only reports generic confirmation; expected cache/evidence-specific rejection for README-only evidence.

```bash
uv run -- node --test core/test/deep-plan*.test.js
```

Result: failed.

- Pass: 48
- Fail: 4
- New RED failures:
  - missing `.pipeline/playbooks/C12-hypo-agent-deep-plan.md`
  - `network_confirmed` currently authorizes `remote_clone`
  - missing bounded-cache / implementation-code evidence enforcement
- Existing/non-M8-new failure observed:
  - `core/test/deep-plan-package.test.js`
  - test: `packages retain conversation summaries and structured decisions while compact context excludes raw long conversation`
  - reason: `compact plan context should be shorter than raw conversation`

```bash
uv run -- node --test core/test/deep-plan*.test.js core/test/progressive-discover.test.js core/test/batch-plan.test.js core/test/commands-rules-artifacts.test.js
```

Result: failed.

- Pass: 68
- Fail: 5
- New RED failures: same three M8 research/playbook gaps listed above.
- Existing/non-M8-new failures observed:
  - `core/test/deep-plan-package.test.js`: compact plan context length assertion.
  - `core/test/batch-plan.test.js`: `plan docs keep single-feature plan behavior and add --batch semantics`; current `references/commands-spec.md` does not match the expected `/hw:plan` supported flags block.

## Acceptance Notes

- The realistic Hypo-Agent lifecycle fixture passes and demonstrates the desired handoff shape before ordinary Plan.
- Research-code acceptance remains intentionally RED until implementation/docs add:
  - explicit remote/network clone/download confirmation using a concrete remote action scope,
  - bounded research cache location,
  - required implementation source inspection,
  - rejection of README-only evidence,
  - code evidence refs persisted into the discussion package,
  - final manual playbooks under `.pipeline/playbooks/`.
