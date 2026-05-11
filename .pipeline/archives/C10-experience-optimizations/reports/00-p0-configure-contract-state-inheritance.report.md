# M0 Report - P0 Configure 契约、状态与继承模型

## Result

pass

## Summary

M0 added the `P0 Configure` contract surface for Cycle-scoped setup before Discover. The implementation added default config metadata, a resolver for reused configuration decisions, Progressive Discover pre-stage metadata, and skill/reference text covering the new stage.

## Changed Areas

- `core/src/config/index.js`
- `core/src/progressive-discover/index.js`
- `core/test/p0-configure-contract.test.js`
- `skills/guide/SKILL.md`
- `skills/init/SKILL.md`
- `skills/plan/SKILL.md`
- `skills/plan-discover/SKILL.md`
- `references/config-spec.md`
- `references/progressive-discover-spec.md`

## Validation

- `node --test core/test/p0-configure-contract.test.js` - pass, 4 tests.
- `node --test core/test/config.test.js core/test/init-automation-contract.test.js core/test/progressive-discover.test.js core/test/guide-router.test.js` - pass, 22 tests.
- `bash scripts/validate-config.sh .pipeline/config.yaml` - pass.
- `git diff --check` - pass.

## Evidence

- `DEFAULT_GLOBAL_CONFIG.cycle.configure` exposes `P0 Configure`, trigger `cycle_new_before_discover`, reuse support, inheritance order, and required questions.
- `resolveP0ConfigurePolicy` records decision value/source and reuse audit metadata.
- `buildProgressiveDiscoverPlan` now returns `pre_discover_stage` and includes `.plan-state/p0-configure.yaml` in required outputs.
- Guide, Init, Plan, Plan Discover, config spec, and Progressive Discover spec now describe P0 coverage and reuse ordering.

## Notes

- Review-code Subagent pass was not run because this turn was scoped to generation, and M0 was completed only after state had already advanced to implement. The next execution can resume at M1.
