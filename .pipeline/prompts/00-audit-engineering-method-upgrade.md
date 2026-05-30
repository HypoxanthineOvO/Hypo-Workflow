# C18-M1 Audit Engineering Method Upgrade

## Goal

把 `/hw:audit` 从旧的六维扫描升级为 Intake-first 的工程审计流程，并让 Critical findings 默认阻断。

## Technical Solution

- 保留 `/hw:audit` 命令本身，重写行为契约。
- `skills/audit/SKILL.md` 保持简洁，详细方法论、profile、report template、finding schema 和 handoff 放入 `references/audit-spec.md`。
- 方法论采用 GQM、ISO/IEC 25010、ATAM-lite 和 SWEBOK。
- 顶层报告模型改为 Experience / Engineering / Risk，非阻断质量优化可 handoff 到 `/hw:quality`。

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns contract tests for enhanced Audit terms, Critical thresholds, report fields, Action Queue, and old six-dimensional model not being top-level.
  - Evidence path: `.pipeline/reviews/C18/M1/test-evidence.md`.
- `implement`
  - Owns `skills/audit/SKILL.md`, `references/audit-spec.md`, `references/commands-spec.md`, OpenCode audit guidance, and focused docs edits.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C18/M1/implementation-evidence.md`.
- `audit`
  - Reviews governance gate semantics, Critical blocking behavior, Quality handoff boundary, tests, and worker separation.
  - Evidence path: `.pipeline/reviews/C18/M1/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Patch `skills/audit/SKILL.md` to state the new Intake-first flow and report output.
2. Rewrite or extend `references/audit-spec.md` with methodology, profile, dimension, severity, report template, finding schema, and Action Queue sections.
3. Update `references/commands-spec.md` `/hw:audit` section.
4. Update `/hw:audit`-specific OpenCode guidance in `core/src/artifacts/opencode.js` if the generated agent prompt exposes audit behavior.
5. Add or update audit contract tests under `core/test/`.

## Research Required

Status: resolved.

Evidence:

- `.plan-state/c18-audit-enhancement-decisions.md`
- Article-derived quality notes from `tmp.md`
- P2 technical route in `.plan-state/c18-decompose.yaml`

## Risks And Alternatives

Risks:

- Report template can become too long for ordinary audits.
- Hard gate language can conflict with acceptance policy if not scoped to Critical findings.

Rejected alternative: keep old six-dimensional output and add a method appendix. Rejected because the desired change is a redesigned engineering audit flow.

Mitigation: keep skill text concise, move details to reference spec, and keep full evidence in `.pipeline/audits/`.

## Validation

Run:

```bash
node --test core/test/audit-governance-contract.test.js core/test/completion-report-contract.test.js
node --test core/test/commands-rules-artifacts.test.js
git diff --check
```

Pass signal: commands exit 0 and tests assert enhanced audit terms, report fields, Critical blocking, and OpenCode mapping.

## Audit Focus

- `/hw:audit` remains a governance gate.
- Critical findings block by default.
- Nonblocking quality optimization can hand off to `/hw:quality`.
- Old six-dimensional framing is not the top-level report model.

## Completion Report Requirements

Include changed files, contract changes, validation output, old/new Audit boundary summary, Quality handoff behavior, and residual risks.
