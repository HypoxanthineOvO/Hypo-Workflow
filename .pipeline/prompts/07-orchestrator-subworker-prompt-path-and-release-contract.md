# M08 / F001 - Subworker Prompt Path And Release Contract

## Objective

- Define where subworker prompts live when they are actually needed, and make the release rule explicit so the canonical prompt set stays compact by default.

## Prompt Shape

canonical milestone prompt only

## Scope

- Canonical prompt files remain the milestone source of truth.
- Subworker prompts are optional derived artifacts, not mandatory sibling files.

## Subworker Assignment Plan

- `test`
  - Scope: verify the canonical prompt contract and the derived-path rule with focused regression checks.
  - Expected evidence: explicit assertion that canonical prompts stay at 8 and derived prompts are only emitted when delegated.
  - Non-overlap: no implementation edits, no audit verdicts.
- `implement`
  - Scope: update prompt-generation conventions, path helpers, and documentation that define where derived subworker prompts live.
  - Expected evidence: concrete file list showing canonical prompt retention plus a deterministic derived path policy.
  - Non-overlap: no tests, no audit outputs, no role impersonation.
- `audit`
  - Scope: confirm the contract does not reintroduce four-file counting and that the release rule is deterministic and auditable.
  - Expected evidence: pass/fail judgment on path clarity, count clarity, and delegated-only release behavior.
  - Non-overlap: read-only review only.

## Required Contract

- If a milestone truly needs delegated subworker prompts, place them under a fixed derived path:
  - `.pipeline/prompts/derived/M08/test.md`
  - `.pipeline/prompts/derived/M08/implement.md`
  - `.pipeline/prompts/derived/M08/audit.md`
- Do not generate those derived files unless the work is actually delegated.
- Do not count derived subworker prompts toward milestone count or canonical prompt count.
- If worker separation is not enabled, or the milestone does not need independent delegation, keep the canonical prompt only.
- If a worker needs to emit derived prompts, it must state which role owns the derived file and which milestone triggered it.

## Required Validation

- the release path is explicit and deterministic
- canonical prompt count remains 8, not 32
- derived subworker prompts are optional and off by default
- the path contract does not blur canonical vs derived artifacts
- audit can verify the release path from the prompt alone without guessing

## Forbidden

- no hidden second canonical prompt set
- no implicit derived prompt generation
- no reintroduction of per-milestone four-file counting
- no audit ambiguity about where a derived prompt belongs

## Expected Output

- path contract for derived subworker prompts
- release condition for derived subworker prompts
- confirmation that canonical milestone count stays unchanged
