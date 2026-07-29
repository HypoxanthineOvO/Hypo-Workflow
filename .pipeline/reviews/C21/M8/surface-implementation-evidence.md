# C21-M8 Surface Implementation Evidence

## Conclusion

The non-destructive current Codex surface is prepared for the later controlled cleanup gate. Root discovery documentation now exposes exactly nine routes; Plan owns its adaptive phases internally; Init has no Setup/global-config prerequisite; Maintain documents the implemented ambient Journal/Inbox/Record flow; the Codex plugin metadata, READMEs, command references, Codex guides, and Hook guide describe the current manifest authority and ten-event Official Codex adapter.

No repository file was deleted, moved, or renamed. No Receipt was issued. No Core production JavaScript, test source, fixture, snapshot assertion metadata, Workflow Runtime/Journal/Capsule authority, or external VSP repository was modified by this worker.

## Immutable Pre-M8 Baseline

Before editing any Skill, the worker copied the then-current assets to:

` .pipeline/reviews/C21/M8/skill-eval/baseline-snapshot/ `

The snapshot contains:

- root `SKILL.md`
- the complete pre-M8 `skills/` tree
- `.codex-plugin/plugin.json`
- `.agents/plugins/marketplace.json`
- `FILES.sha256` and `SNAPSHOT.sha256`

Payload inventory: 49 files; snapshot files including the two checksum files: 51. The tree is read-only (`find ... -perm /222` returned no path).

Canonical snapshot digest, defined as SHA-256 of `FILES.sha256`:

`76f24f12319f6920ddfb58e25d4d315de99c03b08c0c02911fdc54dd9d9d28ad`

`sha256sum -c FILES.sha256` passed for every payload file after implementation.

## Technical Approach

1. Used the M8 dependency scan and machine-readable classification proposal as the product boundary.
2. Verified current Codex Hook and plugin packaging semantics against official OpenAI documentation. The official Hooks page confirms the ten events, trust-by-hash, concurrent matching command Hooks, incomplete `PreToolUse` interception, and default plugin `hooks/hooks.json` discovery. The official Build Plugins page confirms `.codex-plugin/plugin.json`, `skills`, marketplace metadata, and default Hook packaging.
3. Kept plugin discovery rooted at `./skills/`; no manifest path trick attempts to hide extra Skills. Physical removal remains bound to the exact deletion gate.
4. Consolidated internal behavior in Root and Plan instead of linking internal/deferred Child Skills.
5. Documented Records/Receipts/Root guidance/deterministic Hooks and Core gates as the replacement for generic Rules authority.
6. Preserved the current plugin version in the plugin manifest and synchronized marketplace metadata to `13.1.0-beta.2`.

## Modified Files

- `SKILL.md`
- `skills/plan/SKILL.md`
- `skills/init/SKILL.md`
- `skills/maintain/SKILL.md`
- `.codex-plugin/plugin.json`
- `.agents/plugins/marketplace.json`
- `README.md`
- `README.en.md`
- `docs/reference/commands.md`
- `docs/en/reference/commands.md`
- `docs/platforms/codex.md`
- `docs/en/platforms/codex.md`
- `hooks/README.md`

New evidence only:

- `.pipeline/reviews/C21/M8/skill-eval/baseline-snapshot/**`
- `.pipeline/reviews/C21/M8/surface-implementation-evidence.md`

## Behavioral Result

- Root links only `guide`, `init`, `goal`, `plan`, `cycle`, `maintain`, `resume`, `accept`, and `reject`.
- Internal natural behavior includes Chat/Explain/Status/Report/Log/Check/Compact/Knowledge/Sync/Debug, contextual Start, and Plan phases.
- Deferred lanes are Analysis/Audit/Quality/Docs/PR/Release/Explore/Optimize and are documented as zero-write when explicitly invoked now.
- Removed surfaces are Setup/Rules/Stop/Skip/Reset/Showcase/Patch/Help/Watchdog/plan-confirm and are documented as zero-write diagnostics.
- Goal uses one Design; Cycle uses evidence-selected internal planning phases and ordered Milestones; approval and explicit start remain separate Receipt-bound transitions.
- Maintain exposes explicit Record commits and ambient staged proposals, while recorder Subagents cannot commit authority.
- Official Codex Hooks are current; non-Codex adapters and custom forks are explicitly deferred.
- Deletion is described as exact Manifest + fresh `deletion.execute` Receipt + controlled executor, with hash/Git drift returning to the gate.

## Validation

This worker was explicitly forbidden from reading or running tests. Validation was limited to non-test structure and package checks:

- JSON parse: `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json`, and `hooks/hooks.json` PASS.
- Official plugin validator: PASS.
- Skill Creator `quick_validate.py` for Root, Plan, Init, and Maintain: PASS.
- Root unique Child Skill references: exactly 9.
- Chinese and English public command table rows: exactly 9 each.
- Root links to internal/deferred/removed Child Skills: 0.
- Stale primary-surface claims (`53`, `54-entry`, six-platform badge, limited/notify-only Codex Hooks): 0.
- Public backend files exist and are ordinary non-symlink files: 9/9.
- Local Markdown link scan over Root/READMEs/commands/Codex/Hook guides: PASS.
- Targeted `git diff --check`: PASS.
- Baseline snapshot checksum and read-only checks: PASS.

## Problems Encountered

- The first Skill validation rejected the legacy root frontmatter `version` key. Version authority already lives in `.codex-plugin/plugin.json`, so the duplicate unsupported field was removed and validation passed.
- The first link scan found an inherited wrong Chinese-link path in `docs/en/reference/commands.md`; it was corrected from `../../../reference/commands.md` to `../../reference/commands.md`.
- The Codex manual helper could not establish its verified cache because the proxied response lacked `x-content-sha256`. The documented fallback was followed: official OpenAI Docs MCP search/fetch supplied the Hooks and Build Plugins pages.

## Risks And Follow-Up

- The 37 non-public Child Skill files remain physically present and therefore remain discoverable until the user approves the fresh post-change exact Deletion Manifest. This worker did not weaken that gate.
- Core registry/generator writer reachability is owned by the separate production implementation worker; this Surface evidence does not certify non-revival.
- Skill behavior comparison against the immutable baseline is owned by independent TEST/evaluation work and was not run here.
- A compatible live Official Codex host with the plugin enabled and Hooks trusted was not available in this worker scope. Real-host status remains `SKIP`, not PASS.
- By parent instruction, secondary current docs were not edited in this pass. `PROJECT-SUMMARY.md`, `docs/user-guide.md`, `docs/en/user-guide.md`, generated-artifact/platform references, `references/commands-spec.md`, `references/skill-spec.md`, `references/platform-codex.md`, `references/platform-capabilities.md`, `references/state-contract.md`, and `AGENTS.md` still require a bounded follow-up before final documentation closure. Historical release/showcase docs must remain untouched.

## Expected Next Boundary

After the production writer changes are green, rebuild a fresh file-by-file Deletion Manifest from the then-current tree, show its complete paths/hashes/Git binding/replacements/risks in chat, and obtain fresh exact user approval. Only then may the controlled executor remove the classified files. Run behavior evaluation, maintained regression, plugin/Skill validation, non-revival checks, and independent audit after deletion.

## Revision 2: Canonical Output Language Headings

The production `checkSkillQuality` contract requires every public Child Skill to use the canonical `## 输出语言规则` or `## Output Language Rules` heading. Revision 2 added the Chinese canonical heading to:

- `skills/init/SKILL.md`
- `skills/plan/SKILL.md`
- `skills/maintain/SKILL.md`

Each heading keeps the same concise rule: user-visible content follows project `output.language`, falls back to the current conversation, and preserves schema keys, configuration keys, commands, and paths in English. No workflow behavior changed.

Revision 2 validation:

- Skill Creator `quick_validate.py` for Init, Plan, and Maintain: PASS.
- Production `checkSkillQuality({ repoRoot })`: 10 expected Skill paths (Root + nine public Child Skills), 46 physical Child Skills, exactly 37 `unexpected-physical-skill` issues, and 0 other issues.
- Targeted `git diff --check` for the three Skills: PASS.

The 37 expected issues are the unchanged physical cleanup candidates. They remain intentionally unresolved until the exact Deletion Manifest gate.
