# PR/MR Change Request Spec

## 中文主体说明

本规格定义 `/hw:pr` 如何处理已有 GitHub PR 或 GitLab MR。核心原则是 remote-readonly first：inspect/review 可以读取远端证据，但 push、merge、close、修改 reviewer/label/target branch 等远端写操作必须人工确认。本地 `.pipeline/pr/` 是证据归档区，不把远端状态静默改写成本地 authority。文中保留 PR、MR、provider、archive、decision 等英文术语以便和平台 API 对齐。

Use this reference for `/hw:pr` when handling an existing GitHub Pull Request or GitLab Merge Request.

## Goals

- Normalize GitHub PR and GitLab MR inputs into one Change Request shape.
- Keep remote reads and remote writes separate.
- Record local evidence under `.pipeline/pr/` without treating it as the remote source of truth.
- Require explicit confirmation for every remote write.

## Supported Providers

| Provider | URL shape | Normalized kind |
|---|---|---|
| GitHub | `https://github.com/<owner>/<repo>/pull/<number>` | `pull_request` |
| GitLab | `https://gitlab.com/<group>/<repo>/-/merge_requests/<number>` | `merge_request` |

The first implementation is fixture/mock friendly. It must not require live GitHub or GitLab network access for tests.

## Local Archive

每次处理都会创建或复用一个本地 archive。`<url|id>` 中的 `id` 指 `.pipeline/pr/PR-YYYYMMDD-NNN/` 这种本地归档 ID；它用于继续查看、补充 review notes、记录 fix/merge/close proposal，不代表远端 PR/MR 状态已经由本地文件接管。

Each handling session creates or reuses a local archive:

```text
.pipeline/pr/PR-YYYYMMDD-001/
  request.yaml
  summary.md
  review-notes.md
  changes.md
  decisions.yaml
  evidence/
    snapshot.md
```

`request.yaml` records at least provider, kind, host, owner, repository, number, ref, url, source branch, target branch, author, status snapshot, and creation time.

`decisions.yaml` records:

- `remote_write_gate: confirm`
- operations allowed without confirmation: inspect, review, local archive write
- operations requiring confirmation: push, merge, close, reviewer write, label write, target branch write
- final status and confirmations

## Inspect And Review Flow

`/hw:pr inspect <url|id>` collects remote-readonly evidence and writes a local summary:

- normalized request metadata
- diff file summary
- comments
- CI/checks status
- mergeability or conflict state when the provider can read it

`/hw:pr review <url|id>` builds on inspect evidence and writes `review-notes.md`:

- failed or unknown checks become blocking or warning findings
- reviewer comments are preserved as local evidence
- large or risky diffs are called out by path
- merge recommendation is only advice for the human; it is not a remote merge action

Fixture providers should implement only read methods:

```text
readChangeRequest
readDiff
readComments
readChecks
```

Tests should fail if inspect or review calls push, merge, close, or any remote write method.

## Fix, Merge, And Close Gates

`/hw:pr fix <url|id>` records local work in `changes.md`:

- planned or applied local changes
- validation commands
- suggested manual remote steps
- `push_requires_confirmation: true` in `decisions.yaml`

`/hw:pr merge <url|id>` prepares a merge proposal, never a direct merge:

- failed or unknown checks block the proposal
- missing required approval blocks the proposal
- conflict or non-mergeable state blocks the proposal
- a ready proposal still returns `waiting_confirmation`
- `decisions.yaml` records `proposed_operation: merge` and `confirmation_required: true`

`/hw:pr close <url|id>` requires a close reason before preparing the proposal:

- missing reason is an error
- the reason is written to `decisions.yaml`
- status is `waiting_confirmation`
- no remote close operation is called

## Safety Rules

- `.pipeline/pr/` is an evidence archive, not a platform state authority.
- `/hw:pr inspect` and `/hw:pr review` may write local archive files, but must be remote-readonly.
- `/hw:pr fix` may plan or perform local fixes inside ordinary project boundaries, but push remains a remote write.
- `/hw:pr merge` and `/hw:pr close` must stop for explicit human confirmation before any remote action.
- Archive writers must redact token, Authorization, Cookie, password, API key, private key, and similar secret markers.
- `/hw:pr create` is reserved for future design and is not implemented in this contract.
