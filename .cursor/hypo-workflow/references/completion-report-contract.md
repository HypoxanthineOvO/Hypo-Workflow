# Completion Report Contract

Use this reference for detailed, reviewable completion narratives emitted by Milestone, Cycle, Debug, Audit, and Patch workflows.

## Goal

Completion output must be useful for later review, acceptance, and debugging. A completion response or persisted completion report must not collapse into "done" plus a file path.

## Applies To

This contract applies to:

- Milestone execution reports under `.pipeline/reports/`
- Cycle archive summaries under `.pipeline/archives/C{N}-{slug}/summary.md`
- Debug reports under `.pipeline/debug/`
- Audit reports under `.pipeline/audits/`
- Patch close or pending-acceptance completion narratives
- Final user-visible completion responses for the workflows above

Read-only summary commands such as `/hw:report` may summarize an existing report, but when they synthesize a completion narrative they should preserve these fields.

## Required Fields

Each completion narrative must include these semantic fields. Localized headings are allowed, but the meaning must remain explicit and reviewable:

| Field | Required Content |
|---|---|
| Change Summary | What changed, what was completed, or what finding/result is now true. |
| Technical Approach | The implementation, investigation, audit, or closure strategy and key design choices. |
| Modified Files / Modules | Concrete files, modules, reports, specs, or workflow artifacts touched or reviewed. Use `None` / `无` only when no files changed. |
| Test Design | What validation was planned, including test ownership, scope, commands, fixtures, or why no new test was appropriate. |
| Validation Results | Commands, checks, review evidence, counts, or objective results. Include failures and skipped checks. |
| Expected Result | The expected user-visible or workflow-visible behavior after completion. |
| Problems Encountered | Blockers, constraints, failed attempts, degraded worker separation, unavailable tools, or `None` / `无`. |
| Risks / Follow-Up | Residual risks, missing independent verification, deferred work, acceptance needs, or `None` / `无`. |

## Surface Rules

- Persist the detailed payload in reports, audit/debug files, Patch records, log-linked artifacts, or the final response.
- Keep `.pipeline/PROGRESS.md` compact. It should contain board rows and short summaries only; full evidence belongs in durable reports and `.pipeline/log.yaml`.
- `log.yaml` entries should keep `summary` one line and point `report` to the detailed artifact when available.
- If a workflow produces both a persisted report and a final response, the final response may be shorter but must still mention every required field or point to the report section containing it.
- Completion narratives must follow `output.language`; when `output.language=auto`, use the active conversation language.
- All timestamps in completion narratives must be rendered in `output.timezone`.
- Before writing or displaying evidence from logs, command output, config, environment variables, or external services, apply the shared secret-safe evidence redaction contract from `references/log-spec.md`.
- A completion cannot be marked successful when required validation or secret-safety checks detect unredacted raw secret evidence.

## Workflow Notes

Milestone reports should focus on delivered behavior, changed files, test phases, validation, evaluation, and next action.

Cycle summaries should aggregate Milestone outcomes and still include Cycle-level technical approach, validation, expected result, problems, and risks.

Debug reports should map the required fields to diagnosis language: symptom/root cause as the change summary, hypothesis validation as the technical approach and validation result, and fix recommendation or applied fix as expected result.

Audit reports should map findings to the required fields: scope and finding counts as the change summary, scan method as the technical approach, reviewed files/modules, validation/check basis, expected remediation result, and residual audit risks.

Patch completion narratives should include the Patch id, status transition, changed files, validation command, worker separation evidence when required, and whether the Patch is closed or pending acceptance.
