# M03 / F001 - Plan Audit Interview And Prompt Architecture

## Objective

- Enforce audit questioning in P1 and generate one canonical prompt per milestone plus incremental `rework` prompt rules.

## Prompt Shape

canonical milestone prompt only

## Audit Memory

- P1 must ask audit questions explicitly.
- P2/P3 must echo audit contracts.

## Subworker Assignment Plan

- `test`: validate planning questions and prompt structure examples
- `implement`: update planning contracts and prompt-generation conventions
- `audit`: confirm planning cannot skip audit capture or collapse prompt roles

## Required Validation

- mandatory audit question group in P1
- P2/P3 audit contract echo
- canonical prompt generation rules
- rework prompt reference and incremental scope

## Forbidden

- no four-role canonical prompt requirement
- no prompt role collapse

## Execution Contract

1. Add mandatory audit question group to P1
2. Require P2/P3 audit contract echo
3. Define one canonical prompt file per milestone
4. Define incremental `rework prompt` contract

## Required Contract Semantics

- P1 must ask a mandatory audit question group. The audit question group captures audit authority, rejection scope, pseudo-test rejection, blocked approval, and audit evidence; if it is missing, P1 cannot complete or enter P2.
- P2 must carry forward audit contract fields into milestone decomposition.
- P3 must echo audit contract fields into generated prompts and architecture artifacts, preserving real test method, pseudo-test rejection, rejection scope, blocked approval, and audit evidence.
- Generated prompt architecture requires one canonical milestone prompt file; subworker detail may be delegated within that prompt, but the canonical milestone count must not balloon into four sibling prompt files.
- A `rework prompt` must reference the original prompt or source prompt and derive incremental rejection-driven scope from the rejection artifact, `required_rework`, and findings.

## Pass Signal

- planning specs explicitly require audit questioning
- prompt architecture is deterministic and role-separated

## Rejection Rules

- Reject if P1 can finish without audit questions
- Reject if generated prompts collapse role boundaries
