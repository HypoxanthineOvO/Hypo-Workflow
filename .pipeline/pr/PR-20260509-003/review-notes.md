# PR-20260509-003 Review Notes

## Blocking Findings

1. PR `#5` is not mergeable.

   Evidence: GitHub reports `mergeable=CONFLICTING`, `mergeStateStatus=DIRTY`. A local test merge against current `github/main` produced many conflicts, including version metadata, `.pipeline` runtime files, archived prompt rename/delete conflicts, `CHANGELOG.md`, `SKILL.md`, `core/src/config/index.js`, `references/subagent-spec.md`, and start/resume/patch skills.

2. The branch still includes the obsolete PR `#3` version bump commit.

   Evidence: PR `#5` has commits `57877f8 chore: bump workflow version to 13.0.0` and `1cf54f1 feat: harden worker separation acceptance`. PR `#3` was closed because its release metadata conflicted with the current `v12.2.0` line.

3. No remote checks are reported.

   Evidence: `gh pr checks 5` returned `no checks reported on the 'dev/lichf' branch`.

4. The PR includes many `.pipeline/` runtime and prompt/archive changes from an older Cycle context.

   Merge advice: do not merge those artifacts wholesale. Keep only intentional source, test, docs/spec, and generated adapter changes after rebasing.

## Warnings

- The feature direction is important and overlaps with current C10 Subagent governance. Integration should avoid duplicating or contradicting the newer P0 Configure / worker-separation contract.
- The changelog proposes `v13.0.0`, which should be revisited after deciding whether this is a `12.3.0` feature release or a later major release.

## Human Merge Advice

Treat PR `#5` as a valuable but stale feature branch. Recommended path:

- ask lcf to rebase and remove the `v13.0.0` metadata bump, or
- locally create an integration branch from current `main`, cherry-pick the worker-separation feature commit, resolve only the source/test/docs/spec changes, and leave `.pipeline` runtime artifacts out unless they are deliberately part of the evidence archive.

