# C21-M7 Revision 2 Cumulative Re-Audit

- Role: fresh independent `RE-AUDIT`
- Verdict: `APPROVED`
- Score: `1/5` (`1` best, `5` worst)
- Open severity counts: `Critical 0 / Warning 0 / Info 1 deferred to M8`
- Production, tests, config, Plugin, Skills, docs, Runtime, and legacy authority edits: `none`
- Re-audit-owned file: `.pipeline/reviews/C21/M7/reaudit.md`

## Findings

No blocking or warning finding remains in the fixed Revision 2 scope. The four prior product findings are closed by current production behavior and independent falsification. One prior informational item remains intentionally deferred: public README/Router/Maintain wording is still pre-M8 and must not be presented as release truth before M8 completes surface cleanup.

### Info - Pre-M8 documentation remains intentionally contradictory

`README.md` still advertises the legacy 53-command, six-platform surface, while `SKILL.md` and `skills/maintain/SKILL.md` still describe ambient Hooks as deferred. Prompt 07 assigns command/documentation cleanup to M8, so this is not an M7 defect and M7 did not edit those surfaces. It does mean the repository is not yet release-ready on M7 alone.

## Prior-Finding Closure Matrix

| Prior finding | Closure | Independent evidence |
| --- | --- | --- |
| Critical: Recovery blobs generic deletion bypass | `CLOSED` | `core/src/deletion/policy.js` protects the generic `.pipeline/runtime/recovery` prefix with bidirectional overlap. Nine ancestor/root/blobs/packs/descendant candidates were rejected through both `buildDeletionManifest()` and independently crafted `buildDeletionReceiptContext()` inputs. Recovery retention remains a separate `planRecoveryRetention` path. |
| Critical: full raw `UserPromptSubmit` persistence | `CLOSED` | The Hook extracts only durable statements and bounds the semantic body to 512 UTF-8 bytes. A durable sentence plus 120 TRACE lines produced one Inbox file and one Journal segment; complete serialized bytes contained neither the raw prompt, `TRACE_`, nor the unique tail marker. Noise-only and secret-bearing prompts were byte-for-byte zero-write. |
| Warning: Official output schema/tool-aware `updatedInput` drift | `CLOSED` | The current Official release matrix passed for legacy `PreToolUse` block, `PostToolUse` feedback/context, `UserPromptSubmit` and `Stop` blocks, and `suppressOutput` on SessionStart, PreCompact, PostCompact, UserPromptSubmit, SubagentStop, and Stop. Unsupported event fields reject. Bash/apply_patch inputs and rewrites require a string `command`; MCP rewrites accept replacement arguments objects. |
| Warning: reminder targeting/nonstandard `changed_paths`/permanent dedupe | `CLOSED` | Standard apply_patch headers, Bash redirection, and `touch` produced path-targeted reminders without `changed_paths`. Read-only `echo` and `git status` did not remind. An unchanged repeat was suppressed, while changed file content produced a new reminder through effect-aware dedupe. |
| Info: pre-M8 documentation contradictions | `DEFERRED / NON-BLOCKING` | Contradictions remain visible and are explicitly owned by M8. M7 is approved as an implementation milestone, not as the final release surface. |

## Official Contract Review

The current release-behavior source was rechecked through the OpenAI Docs MCP against:

- <https://learn.chatgpt.com/docs/hooks#common-output-fields>
- <https://learn.chatgpt.com/docs/hooks#pretooluse>
- <https://learn.chatgpt.com/docs/hooks#posttooluse>
- <https://learn.chatgpt.com/docs/hooks#permissionrequest>
- <https://learn.chatgpt.com/docs/build-plugins#bundled-mcp-servers-and-lifecycle-hooks>

The implementation matches the relevant documented behavior: `PreToolUse` interception is incomplete and remains only a guardrail; `PostToolUse` cannot undo effects; current common-output applicability is event-specific; Bash/apply_patch use `tool_input.command`; Plugin Hooks use default `hooks/hooks.json` discovery when no manifest override is present; non-managed Plugin Hooks still require trust.

Official Codex can represent `PermissionRequest allow`, but this Hypo-Workflow evaluator never emits it: obvious deletion returns `deny`, and unrelated requests return `{}`. Evaluated Hook output cannot mint a Receipt, Workflow transition, acceptance, or controlled-deletion authority. Receipt issuance and deletion execution remain deterministic Core operations outside the Hook adapter.

## Deletion And Authority Review

The controlled deletion sequence remains:

```text
reserve Receipt
-> revalidate exact Manifest, path hashes, and Git binding
-> write prepared evidence
-> controlled filesystem deletion
-> consume Receipt
-> write applied evidence
```

Manifest normalization and Receipt-context construction share `normalizeDeletionPath()`. The complete Recovery root and the accepted M5 authority/evidence surfaces remain protected. No repository deletion was performed by this re-audit; all falsification used disposable `/tmp` workspaces and stopped before execution.

## Validation

Independent checks performed by this re-audit:

```text
Revision 2 audit suite:                 30 / 30 pass
Disposable Recovery path matrix:        9 / 9 rejected at both entry points
Serialized prompt-tail inspection:            PASS
Noise and secret zero-write cases:       2 / 2 pass
Official output/rewrite matrix:                PASS
Targeted/effect-aware reminders:               PASS
Hook authority denial/empty behavior:          PASS
Codex synthetic/process smoke:                 PASS
Plugin validator:                              PASS
Config validator:                              PASS
Hook/Plugin/fixture JSON parse:                 PASS
Relevant JavaScript syntax:                    PASS
git diff --check:                              PASS
Official installed-host smoke:                 SKIP
```

The installed-host result remains honest: `codex-cli 0.128.0` exposes no verifiable current Hook surface, so no real-host PASS is claimed. The fresh independent Revision 2 RETEST's `1088/1088` full Core regression was accepted as allowed by the audit assignment and was not rerun.

The four frozen legacy lifecycle hashes still exactly match the sealed M5 acceptance baseline:

```text
.pipeline/state.yaml    8b97e6df7a2b78469008b776e65bebd6227eb660e6cba2953422aa38f5cf4d17
.pipeline/cycle.yaml    d5fdedd7e7d54da5c07687b814492a2d50c06df40fa8e4ff9e908bb4dda472cb
.pipeline/log.yaml      14f108a6994130ec59f60e7a94169df80998ee7319dc4b5dd0f6fa2f8a268222
.pipeline/PROGRESS.md   303e593fae56deb877718a55d7c4acbb080c2506e6da21f9cda2474fb5b7fa4b
```

Revision 2 preserves role separation: TEST established RED contracts before IMPLEMENT, IMPLEMENT did not edit the R2 test contract, RETEST independently reached GREEN, and this re-audit used a distinct identity. Default Codex configuration, wrapper stdout/stderr discipline, Plugin metadata, Resume metadata, and Claude-specific Hook isolation all remain valid. No OpenCode, Claude redesign, telemetry, scheduler, actual cleanup, or VSP-Codex work entered M7.

## Expected Behavior

Ambient Maintain stores only bounded durable facts, not raw prompt tails. Compact and Subagent events leave recoverable bounded evidence. Documentation/Record reminders name relevant write targets, suppress unchanged repeats, and reappear after a material effect. Ordinary deletion cannot cover Recovery or accepted authority/evidence paths, and actual deletion requires an exact single-use Receipt plus drift-free controlled execution.

## Problems Encountered

The Codex manual helper could not use its temporary cache in this environment. The audit therefore used the exact official Hooks pages through OpenAI Docs MCP, as required by the fallback route. No product defect was reproduced.

## Residual Risks

- A compatible current Official Codex host, Plugin discovery, Hook trust, and live ten-event delivery remain unverified; the host tier is `SKIP`, not `PASS`.
- Bash target inference is intentionally bounded and heuristic; uncommon writers may rely on the dirty-worktree fallback.
- Hook interception remains incomplete and matching Hooks may run concurrently, so Hooks cannot replace Core authority.
- Multi-target deletion is not atomic, and process-local locks do not eliminate every cross-process TOCTOU or crash window.
- Journal/Inbox and Record/index persistence remain separate commits with the previously documented reconciliation risks.
- M8 must remove the old public command/platform claims and reconcile Router/Maintain documentation before release readiness.

Within the C21-M7 contract, these are disclosed residual risks rather than blocking defects. M7 may advance to M8.
