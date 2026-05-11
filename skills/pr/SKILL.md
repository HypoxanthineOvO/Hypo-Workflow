---
name: pr
description: Manage GitHub PRs or GitLab MRs through a local Change Request archive; use when the user invokes /hw:pr inspect, review, fix, merge, close, or create.
---

# /hypo-workflow:pr

## 输出语言规则

Read `.pipeline/config.yaml` and global config when available. User-facing explanations, archive summaries, and confirmation prompts should follow `output.language`; command names, provider names, config keys, and file names stay literal.

## 前置条件

- A project-local `.pipeline/` workspace should exist.
- Input should be an existing GitHub Pull Request URL, GitLab Merge Request URL, a local archive id under `.pipeline/pr/`, or `/hw:pr create` with guided creation details.
- Do not require live GitHub/GitLab access for tests or local archive creation.

## 执行流程

1. Load `references/pr-spec.md` for the Change Request contract.
2. Parse the subcommand: `inspect`, `review`, `fix`, `merge`, `close`, or `create`.
3. Normalize GitHub PR / GitLab MR terminology into a Change Request record.
4. Create or reuse `.pipeline/pr/PR-YYYYMMDD-NNN/`.
5. Write local evidence to `request.yaml`, `summary.md`, `review-notes.md`, `changes.md`, `decisions.yaml`, and `evidence/`.
6. For `inspect`, read metadata, diff, comments, and checks, then write `summary.md` plus redacted evidence.
7. For `review`, use inspect evidence to write `review-notes.md` with findings, failed checks, risky files, comments, unknowns, and human merge advice.
8. For `fix`, keep local changes traceable in `changes.md`, record tests, and mark push as confirmation-required.
9. For `merge`, check CI/checks, approvals, conflicts, mergeability, target branch, and archive evidence; write a proposal and stop for confirmation.
10. For `close`, require a close reason, write it to `decisions.yaml`, and stop for confirmation.
11. For `create`, guide the user through one of three modes:
   - `/hw:pr create`: ask whether local worktree changes already exist.
   - `/hw:pr create --from-worktree`: inspect local changes, file scope, branch, commit, target branch, title/body, reviewer, and labels.
   - `/hw:pr create --plan`: hand off to `/hw:plan`, then return to `/hw:pr create --from-worktree` after implementation and validation.
12. Before any create remote write, show a single confirmation summary that lists push branch, create pull request / merge request, reviewer writes, label writes, and target branch writes.

## 交互行为

- Ask for the PR/MR URL or archive id if missing.
- Ask before live network reads unless the current analysis/network boundary already permits them.
- Always ask before push, create, merge, close, reviewer/label writes, or target branch writes.

## 安全规则

- `/hw:pr` is not an auto-merge bot.
- `.pipeline/pr/` is local evidence, not the remote source of truth.
- `inspect` and `review` may write local archive files but must not write remote platform state.
- Remote writes are high-risk gates and require explicit user confirmation.
- Redact secrets before writing evidence or lifecycle logs.
- `/hw:pr create` may create a local proposal archive before confirmation, but provider write methods must not run until the user confirms the full remote write summary.

## 失败处理

- Unsupported providers or malformed URLs should stop with a clear error.
- Missing local archive ids should list nearby `.pipeline/pr/` candidates when possible.
- If CI/checks, approvals, or mergeability are unknown, say they are unknown instead of guessing.
- If evidence contains secret markers that cannot be redacted safely, stop and ask for sanitized input.

## 参考文件

- `references/pr-spec.md`
- `references/commands-spec.md`
- `docs/user-guide.md`
- `docs/reference/commands.md`
