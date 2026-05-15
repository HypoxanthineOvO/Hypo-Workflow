# M6 - Skills、Commands、Adapters 与状态面集成

## Objective

Expose Deep Plan through Skills, commands, generated adapters, help/status/report surfaces, and docs/sync.

## Scope

- Add `skills/plan-deep/SKILL.md` and command mapping.
- Generate/update OpenCode, Claude Code, and Codex-facing artifacts as applicable.
- Update help, docs, status/report surfaces to show active Deep Plan packages and boundaries.
- Ensure output remains Chinese-first while command names and config keys stay literal.

## Validation

- Command artifact tests prove `/hw:plan:deep` appears on supported platforms.
- Docs tests prove Deep Plan boundaries, operations, and Explore distinction are documented.
- Sync repair/check-only reports derived artifacts fresh.

## Subworker Assignment Plan

- `test`: owns command/docs/adapter tests and sync freshness checks. Handoff: `.pipeline/reviews/C12/M6/test-evidence.md`.
- `implement`: owns Skills, command map, docs, and generated artifact updates. Must not edit test-owned assets. Handoff: `.pipeline/reviews/C12/M6/implementation-evidence.md`.
- `audit`: reviews command consistency, generated artifact map, and language policy. Handoff: `.pipeline/reviews/C12/M6/audit.md`.

## Audit Fields

- `audit_target`: user-facing Deep Plan integration.
- `risk_hypotheses`: generated adapters stale; docs overpromise automation; command namespace is inconsistent.
- `test_scenarios`: help list, command generation, docs repair, sync check.
- `evidence_required`: tests, sync output, generated file diff.
- `independent_validator`: audit worker.
- `manual_checks`: read `/hw:help` and docs snippets.
- `known_limits`: no execution of Deep Plan packages in this milestone.
