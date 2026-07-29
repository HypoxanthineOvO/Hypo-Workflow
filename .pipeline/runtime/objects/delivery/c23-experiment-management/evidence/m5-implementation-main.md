# C23 M5 Implementation Evidence

- Role: `implement`
- Worker ID: `c23-m5-implementation-main`
- Verdict: `READY_FOR_INDEPENDENT_RETEST_AND_AUDIT`
- Scope: immutable Experiment events, deterministic status projection, public Experiment lane, and current source documentation

## Conclusion And User-Facing Result

M5 now provides a non-linear `/hw:experiment` lane. The host Agent still runs and supervises experiments; Workflow records immutable, content-addressed events and maintains one compact project status projection. A normal "现在实验怎么样" answer can therefore explain the default/contextual baselines, dataset meaning, scans, outcome counts, pending scientific confirmation, exceptions, retention state, and next work without rescanning the repository or result directories.

The source checkout exposes ten focused routes after adding `/hw:experiment`. The installed Host Contract v1 command manifest remains intentionally frozen at nine routes because C23 forbids a cachebuster update, plugin reinstall, or release artifact rebuild before the VSP-Codex contract is aligned.

## Technical Approach

1. `core/src/experiment/status.js` defines immutable `event-<content-hash>` records under `.pipeline/memory/experiment-events/<project_id>/` and a materialized projection under `.pipeline/memory/experiment-status/<project_id>/status.yaml`.
2. `appendEvent` validates the manifest project, supported event taxonomy, secret-safe canonical input, and safe source references; it deduplicates identical events, rejects divergent active events with the same `event_key`, and atomically writes the event plus projection through the current manifest-selected transaction API.
3. `rebuild` explicitly scans only one project's immutable event directory after a Git union. Compilation is independent of arrival order and fails before writes on event-id drift, copied-path drift, non-linear supersession, duplicate Experiment-scoped Attempt sources, or same-key branch conflicts.
4. `readStatus` reads only the fixed projection path. The entire returned view is bounded, including every semantic bucket, Attempt details, source IDs, detail refs, and table rows. It retains total counts, a digest of the complete event-ID set, and stable truncated-field metadata while preserving the newest actionable entries.
5. The projection derives Attempt counts and explicitly reports same-identity output overlap so a rerun cannot hide or overwrite older output without a retention warning. Nested `scientific_review.status=pending_confirmation` remains visible and untrusted.
6. `skills/experiment/SKILL.md` tells the host to use `uv`, capture code/environment/machine/dataset/run evidence, use foreground or isolated tmux supervision, compare results scientifically, trash rather than delete history, rebuild after Git merges, and state the pilot boundary.

## Modified Modules And Surfaces

- Core: `core/src/experiment/status.js`, `core/src/index.js`, `core/src/commands/index.js`
- Skills: `skills/experiment/SKILL.md`, `skills/experiment/agents/openai.yaml`, `skills/guide/SKILL.md`, root `SKILL.md`
- Current docs: `README.md`, `README.en.md`, both command references, and both Official Codex platform guides
- Tests and fixture: `core/test/c23-m5-experiment-status.test.js`, `core/test/fixtures/c23-m5/status-events.json`, the two public-route governance tests, and `tests/regression-catalog.json`

No Hook definition, plugin cachebuster, plugin installation, Host Contract v1 command manifest, release artifact, VSP-Codex repository, or frozen legacy lifecycle authority was changed.

## Test Design And Validation

- Fixture semantics cover a default 300K QV100 baseline, a contextual 77K baseline, a machine profile, dataset/trace meanings, one-axis frequency scanning, L1/L2 cross scanning, completed/failed Attempts, host-memory exhaustion, suspicious scientific review, next action, same-identity rerun output overlap, and trash-to-restore retention.
- Immutable event tests cover stable content IDs, exact replay dedupe, divergent `event_key` rejection, legacy sentinel preservation, and no transaction residue.
- Status tests remove the entire event directory before querying, proving `readStatus` uses one fixed projection and respects a two-row result bound.
- A 250-action adversarial projection proves `limit=5` bounds every returned bucket and keeps the response below 64 KiB while preserving total counts, a full-set digest, truncation metadata, and the newest action.
- Boundary tests reject manifest-project drift, unsupported event types, unsafe references, oversized or internally inconsistent re-signed projections, and duplicate Attempt sources only within the same Experiment.
- Git-like tests combine A/B clone event sets in both arrival orders, rebuild identical projections, perform a real multi-clone Git merge, and fail closed with zero writes on a merged logical conflict.
- Route tests verify `/hw:experiment`, ten source Skills, Root Skill/docs parity, and the deliberately unchanged nine-command Host Contract v1 release snapshot.

Validation results at implementation freeze:

- M5 focused: `13` top-level / `19` total PASS.
- M1-M5 plus Record, Receipt, Runtime, workspace transaction, router, and surface regressions: `205/205` PASS.
- Complete maintained Core inventory: `582/582` PASS across `57` maintained files.
- `quick_validate.py skills/experiment`: PASS.
- Syntax checks for the new/changed Core modules: PASS.
- `git diff --check`: PASS.
- Pending workspace transactions: none.

## Problems Encountered

- The existing current-source governance contract intentionally locked discovery to nine routes. The independent test identity updated only current-source expectations to ten and preserved the historical/frozen Host Contract v1 expectation at nine.
- The first generic projection draft exposed event-shaped buckets. The executable M5 fixture required a status-answer shape instead, so the implementation was narrowed to `headline.default_baseline_id`, flattened baseline/dataset/scan/action facts, `outcomes.counts`, pending confirmations, exceptions, retention, source metadata, and bounded table rows.
- Independent adversarial review found that a rebuild-time display limit could permanently discard projection rows, local Attempt IDs were incorrectly project-global, event-type typos could be silently ignored, and a caller could re-sign an over-limit projection. The final Store materializes up to 200 rows, scopes Attempt identity by Experiment, enumerates event types, and validates internal projection bounds after hash verification.
- The same review then demonstrated that bounding only table rows still produced a 147 KiB response for 250 next actions. The final query view bounds every user-facing collection and supplies totals/digests instead of a giant JSON dump.

## Remaining Risks And Follow-Up

- This is pilot-ready protocol validation only. No real NeRF, AceSim, GPU server, large trace, paper reproduction, SCP transfer, GitLab remote, or multi-week experiment has been validated; that requires a later Pilot Goal in an actual project.
- Scientific reasonableness remains a weak oracle. Workflow may flag suspicious evidence but cannot make the user's confirmation trustworthy by itself.
- The materialized status file is derived and may be stale after an external Git merge until the host explicitly calls `rebuild`.
- Same-identity output overlap is reported, but the host remains responsible for preserving or trashing actual result bytes before rerun.
- The user-facing view is byte- and item-bounded, but the single local materialized projection may still grow with the number of immutable events. Very large projects may need future paginated projections or a second-level aggregate index.
