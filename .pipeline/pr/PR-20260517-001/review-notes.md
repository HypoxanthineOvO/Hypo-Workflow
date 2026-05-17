# Review Notes

## Finding 1 - Cursor `/hw-setup` references a config spec that the Cursor bundle deliberately does not mirror

Severity: Medium

Status: Resolved in `27c53895155a062a330502bdc29859d741fc9191`

Evidence:

- `core/src/artifacts/third-party.js` mirrors a fixed set of Cursor resource bundle sources, but `references/config-spec.md` is not included.
- The same file renders `/hw-setup` with a `Reference Files` entry pointing to `references/config-spec.md` "in the source repository".
- `core/test/platform-adapters.test.js` explicitly asserts `.cursor/hypo-workflow/references/config-spec.md` does not exist.
- Generated `.cursor/skills/hw-setup.md` therefore points at a reference that will not exist in a normal synced target project unless that target is also the Hypo-Workflow source repository.

Impact:

In Cursor, `/hw-setup` is supposed to be the command that safely edits non-model defaults. If the agent follows the generated Skill strictly in an arbitrary target project, it has no local config-spec authority to inspect. That can make setup either under-specified or dependent on an unavailable source checkout. This is especially risky because the PR intentionally avoids model/provider defaults, so the setup route needs a clear local source of truth for the remaining non-model fields.

Suggested fix:

Either mirror a Cursor-safe redacted setup/config reference under `.cursor/hypo-workflow/references/`, or remove that reference from `renderCursorSetupAuthority()` and fully embed the non-model setup contract in the generated setup Skill. Add a regression check that every generated Cursor Skill reference is either present in the generated target tree or is explicitly marked as external/non-local with fallback behavior.

Resolution evidence:

- `core/src/artifacts/third-party.js` now renders `/hw-setup` with `## Local References`, removes the `references/config-spec.md` reference, and states that the generated Skill is self-contained for Cursor setup.
- Generated `.cursor/skills/hw-setup.md` contains `Cursor Reference Resolution` plus fallback behavior and no backticked `references/config-spec.md`.
- `core/test/platform-adapters.test.js` now asserts `/hw-setup` does not contain backticked `references/config-spec.md` and adds `assertCursorSkillReferencesResolvable(root)`.

## Non-blocking Observations

- The PR is mergeable and the generated cleanup guards look conservative: managed Cursor resource bundles are only reset when `.hypo-workflow-managed.json` declares `managed_by: hypo-workflow`; unmarked existing bundles cause a refusal instead of overwrite.
- No `.pipeline/**` payload files are changed by the PR, so the PR does not hit the default Workflow payload blocker.
- The PR body test plan is narrow compared with the 153-file generated/documentation change. Local full Node tests passed during review, but remote CI reports no checks.

## Recommendation

The previous blocking finding is fixed. From this local review, the PR is approvable after the maintainer explicitly chooses to submit an approve review or merge.
