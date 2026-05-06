# Architecture Baseline - C8 Rules, Review, RTL, and Codex Plugin

## Current Baseline

- Active Cycle: C8, "Hypo-Workflow 体验优化：Rules、自审、RTL 与 Codex Plugin".
- Workflow kind: build.
- Preset: tdd.
- `.pipeline/` remains the source of truth for Cycle, state, feature queue, rules, reviews, progress, logs, prompts, reports, metrics, Knowledge, patches, and archives.
- Hypo-Workflow remains a planning, synchronization, adapter-generation, and governance system. It is not a model-calling runner.
- Codex, OpenCode, and Claude Code behavior must remain host-native. C8 adds guidance, files, checks, and adapters without taking over runtime execution.
- C8 uses Feature Queue planning with four serial Features and thirteen Milestones.

## Architecture Direction

C8 adds four layers above the existing workflow:

1. **Rules/Habits Authority Layer**: structured rules are the canonical source, and Markdown/instruction files are generated views.
2. **Agent Review Layer**: plan, test, and implementation review produce durable `.pipeline/reviews/` evidence and bounded repair proposals.
3. **Domain Pack Layer**: domain-specific planning/review/test behavior is loaded from packs instead of hardcoded into core.
4. **Claude Codex Delegation Layer**: Claude Code may delegate implementation work through OpenAI's official Codex plugin when detected and confirmed.

## Source-Of-Truth Rules

- Built-in rules remain under `rules/builtin/` and `rules/presets/`.
- Project severity overrides remain in `.pipeline/rules.yaml`.
- New structured user/project/cycle rules should live under a dedicated rules authority path designed in F001.
- Generated habits Markdown and platform instruction text are derived artifacts, not authority.
- Scope precedence is `cycle > project > global > builtin`.
- Review reports must show active rules, overridden rules, and rules that could not be automatically checked.

## Review Artifacts

Review artifacts are durable evidence, not chat-only commentary.

Expected layout:

```text
.pipeline/reviews/
  <feature-slug>/
    <milestone-id>/
      plan/
      tests/
      code/
```

Each review should record:

- reviewed files and prompt/report refs;
- active rule/habit ids;
- subagent or local reviewer identity;
- raw notes or transcript when available;
- verdict and issue list;
- repair proposal;
- retry round and final decision;
- fallback reason when a host cannot provide a requested reviewer.

Default review loop:

- `pass`: continue.
- `warn`: continue and record.
- `needs_changes`: main Agent repairs and repeats review, up to 3 total rounds.
- `critical`: follow configured strictness; strict profiles block, default mode attempts repair before escalation.

## Domain Pack Boundary

Domain packs declare reusable domain behavior. Core should consume a manifest and declared assets instead of special-casing one domain.

Candidate load order:

1. project-local packs under `.pipeline/domains/`;
2. built-in packs under `domains/`;
3. external packs resolved from a future trusted local path, git ref, or marketplace id.

Manifest concepts:

- pack id, version, title, description, and trust level;
- supported languages and file globs;
- Discover questions;
- prompt snippets;
- test profile requirements;
- review checklists;
- tool probes;
- docs and examples;
- install source and confirmation requirements.

Remote or user-level pack installation requires explicit confirmation. RTL must be implemented as a reference pack, not a hardcoded core behavior.

## RTL Reference Pack

The C8 RTL pack should cover the first useful slice:

- Verilog/SystemVerilog/SpinalHDL terminology;
- combinational and sequential logic distinctions;
- clock, reset, stimulus, expected behavior, and simulation evidence prompts;
- testbench and simulator-oriented validation strategy;
- common tool probes without vendor-specific lock-in.

Out of scope:

- formal verification;
- CDC;
- timing closure and synthesis constraints;
- vendor-specific FPGA/ASIC flow automation.

## Claude Code Codex Plugin Layer

C8 must support OpenAI's official `codex-plugin-cc` safely:

- detect installation and version/path where possible;
- generate project-local configuration and install guidance;
- require explicit confirmation before user-level or remote installation;
- route implementation tasks to Codex when the plugin path is available;
- keep test and review independent from implementation;
- allow multiple Codex workers only with disjoint ownership;
- record fallback reasons when plugin or multi-worker support is unavailable.

## Expected Code Areas

- `references/rules-spec.md`
- `skills/rules/SKILL.md`
- `core/src/rules/`
- `rules/template/`
- `core/test/*rules*.test.js`
- `references/tdd-spec.md`
- `references/plan-review-spec.md`
- new review contract references and tests
- new `.pipeline/reviews/` examples or templates
- new domain pack reference/spec files
- new `domains/rtl/` reference pack
- `core/src/test-profile/`
- `core/src/progressive-discover/`
- `core/src/artifacts/claude.js`
- `core/src/artifacts/opencode.js`
- Codex/OpenCode/Claude adapter tests and sync output fixtures
- Knowledge Ledger records and indexes

## Milestone Strategy

C8 uses thirteen serial Milestones:

1. Rules and Habits Authority Schema.
2. Rules Remember Capture and Confirmation Flow.
3. Habits Documents and Cross-Platform Injection.
4. Review Artifact Schema and Directory Structure.
5. Plan Test Code Review Gates.
6. Skill and Platform Artifact Review Coverage.
7. Domain Pack Boundary Protocol and Knowledge Decision.
8. RTL Domain Pack Reference Implementation.
9. RTL-Aware Planning Review and Test Integration.
10. Official Codex Plugin Capability Detection.
11. Claude Code Codex Delegation Routing.
12. Confirmed Install and Multi-Worker Support.
13. C8 Agent Review and Full Regression Readiness.

## Cross-Cutting Constraints

- Do not degrade existing Codex, OpenCode, Claude Code, Cursor, Copilot, or Trae adapter output.
- Do not silently mutate user-level Claude or Codex configuration.
- Do not install remote resources, user-level plugins, or external packs without explicit confirmation.
- Keep protected authority writes scoped and lifecycle-aware.
- Keep raw secrets out of logs, reports, Knowledge, review artifacts, and generated instructions.
- Keep generated Markdown concise enough for agent context while preserving structured authority for checks.
- Preserve the rule that Hypo-Workflow is not a runner.
