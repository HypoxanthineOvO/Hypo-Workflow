---
name: pr
description: Manage existing GitHub PRs or GitLab MRs through a local Change Request archive; use when the user invokes /hw:pr inspect, review, fix, merge, or close.
---

# /hypo-workflow:pr

## Output Language Rules

Read `.pipeline/config.yaml` and global config when available. User-facing explanations, archive summaries, and confirmation prompts should follow `output.language`; command names, provider names, config keys, and file names stay literal.

## Preconditions

- A project-local `.pipeline/` workspace should exist.
- Input should be an existing GitHub Pull Request URL, GitLab Merge Request URL, or a local archive id under `.pipeline/pr/`.
- Do not require live GitHub/GitLab access for tests or local archive creation.

## Execution Flow

1. Load `references/pr-spec.md` for the Change Request contract.
2. Parse the subcommand: `inspect`, `review`, `fix`, `merge`, or `close`.
3. Normalize GitHub PR / GitLab MR terminology into a Change Request record.
4. Create or reuse `.pipeline/pr/PR-YYYYMMDD-NNN/`.
5. Write local evidence to `request.yaml`, `summary.md`, `review-notes.md`, `changes.md`, `decisions.yaml`, and `evidence/`.
6. For `inspect`, read metadata, diff, comments, and checks, then write `summary.md` plus redacted evidence.
7. For `review`, use inspect evidence to write `review-notes.md` with findings, failed checks, risky files, comments, unknowns, and human merge advice.
8. For `fix`, keep local changes traceable in `changes.md`, record tests, and mark push as confirmation-required.
9. For `merge`, check CI/checks, approvals, conflicts, mergeability, target branch, and archive evidence; write a proposal and stop for confirmation.
10. For `close`, require a close reason, write it to `decisions.yaml`, and stop for confirmation.

## Interactive Behavior

- Ask for the PR/MR URL or archive id if missing.
- Ask before live network reads unless the current analysis/network boundary already permits them.
- Always ask before push, merge, close, reviewer/label writes, or target branch writes.

## Safety Rules

- `/hw:pr` is not an auto-merge bot.
- `.pipeline/pr/` is local evidence, not the remote source of truth.
- `inspect` and `review` may write local archive files but must not write remote platform state.
- Remote writes are high-risk gates and require explicit user confirmation.
- Redact secrets before writing evidence or lifecycle logs.
- `/hw:pr create` is reserved; mention it only as a future command unless a later Cycle implements it.

## Failure Handling

- Unsupported providers or malformed URLs should stop with a clear error.
- Missing local archive ids should list nearby `.pipeline/pr/` candidates when possible.
- If CI/checks, approvals, or mergeability are unknown, say they are unknown instead of guessing.
- If evidence contains secret markers that cannot be redacted safely, stop and ask for sanitized input.

## Reference Files

- `references/pr-spec.md`
- `references/commands-spec.md`
- `docs/user-guide.md`
- `docs/reference/commands.md`
