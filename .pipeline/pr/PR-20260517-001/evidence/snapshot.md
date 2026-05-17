# Evidence Snapshot

Captured at: 2026-05-17 21:03:42 CST

## Remote Metadata

```text
Provider: GitHub
Repository: HypoxanthineOvO/Hypo-Workflow
PR: #8
URL: https://github.com/HypoxanthineOvO/Hypo-Workflow/pull/8
Title: Optimize Cursor adapter sync
Author: Baojch / Jiacheng Bao
Base: main
Head: Baojch:chore/cursor-sync-bundle-20260517
State: OPEN
Draft: false
Mergeable: MERGEABLE
Review decision: none
Checks: no checks reported
Comments: none
Reviews: none
Changed files: 153
Additions: 13984
Deletions: 51
Commits:
- ac074bff932d4996c1ce81af99062ca2ffdf0677 feat: optimize Cursor adapter sync
- 27c53895155a062a330502bdc29859d741fc9191 fix: make Cursor setup references self-contained
```

## Remote Review Action

```text
2026-05-17 21:08:04 CST
Action: gh pr review 8 --request-changes
Body: requested fix for Cursor /hw-setup referencing references/config-spec.md while the Cursor bundle excludes that file.
```

```text
2026-05-17 21:21:32 CST
Action: gh pr review 8 --approve
Body: confirmed fix commit 27c5389 resolved the Cursor /hw-setup reference issue and listed local test evidence.
```

## Rereview Snapshot

```text
2026-05-17 21:18:42 CST
Latest commit: 27c53895155a062a330502bdc29859d741fc9191
Mergeable: MERGEABLE
Review decision: CHANGES_REQUESTED
Checks: no checks reported
Finding status: resolved locally, pending explicit remote approve if desired
```

## Merge Snapshot

```text
2026-05-17T13:23:59Z
Action: gh pr merge 8 --merge --delete-branch
State: MERGED
Merge commit: 930b5620c4d9d0f4ccd862f434a9497e664c285e
Local sync: git pull --ff-only github main -> HEAD 930b562
```

## Docs And Sync Gate

```text
Docs API on merged local main:
- checkDocs('.'): ok, no failures or warnings
- checkDocsLanguage('.'): ok, 17 files checked

Detached PR worktree sync checks:
- node cli/bin/hypo-workflow sync --project . --check-only: exit 0, stale:6/errors:0
- stale entries were .pipeline compact/runtime warnings plus adapter/readme freshness signals.
- Running repair in detached PR worktree changed .pipeline/derived-health.yaml and PROJECT-SUMMARY.md due missing runtime state; this was judged not suitable PR payload.
```

## Changed Surface

```text
.cursor/commands/hw-*.md                     added
.cursor/skills/hw-*.md                       added
.cursor/skills/hypo-workflow.md              added
.cursor/hypo-workflow/**                     added
.cursor/rules/hypo-workflow.mdc              modified
core/src/artifacts/third-party.js            modified
core/src/docs/index.js                       modified
core/src/platform/index.js                   modified
core/test/platform-adapters.test.js          modified
core/test/profile-platform.test.js           modified
README.md / README.en.md                     modified
docs/** Cursor/generated artifact refs       modified
references/platform-capabilities.md          modified
references/skill-spec.md                     modified
rules/builtin/claude-hw-command-namespace.yaml modified
```

## Local Commands

```bash
git fetch github pull/8/head:refs/remotes/github/pr/8
git worktree add /tmp/hw-pr8-review github/pr/8
node --test core/test/platform-adapters.test.js core/test/profile-platform.test.js
node --test core/test/docs-governance.test.js core/test/readme-update.test.js core/test/skill-spec.test.js core/test/sync-standardization.test.js core/test/commands-rules-artifacts.test.js
node --test core/test/*.test.js
git diff --check main...github/pr/8
```

## Local Test Results

```text
PR declared tests: pass, 13 tests
Expanded smoke: pass, 29 tests
Full Node test suite: pass, 516 tests
Rereview PR declared tests: pass, 13 tests
Rereview expanded smoke: pass, 29 tests
Rereview full Node test suite: pass, 516 tests
Rereview diff check: pass
```

## Key Line Evidence

```text
core/src/artifacts/third-party.js:11-55
  CURSOR_RESOURCE_BUNDLE_SOURCES excludes references/config-spec.md.

core/src/artifacts/third-party.js:225-228
  renderCursorSetupAuthority() emits Reference Files with references/config-spec.md.

.cursor/skills/hw-setup.md:47-50
  Generated Cursor setup Skill points to references/config-spec.md.

core/test/platform-adapters.test.js:63-69
  Test asserts references/config-spec.md is not mirrored into .cursor/hypo-workflow.
```

## Rereview Line Evidence

```text
core/src/artifacts/third-party.js:225-229
  renderCursorSetupAuthority() now uses Local References, only points to .cursor/skills/hypo-workflow.md, and declares the generated Skill self-contained with external/non-local fallback behavior.

.cursor/skills/hw-setup.md:22-57
  Generated setup Skill includes Cursor Reference Resolution, removes references/config-spec.md, and states the setup Skill is self-contained.

core/test/platform-adapters.test.js:137-139
  Test asserts setup Skill does not include backticked references/config-spec.md and then validates generated Cursor Skill reference behavior.
```
