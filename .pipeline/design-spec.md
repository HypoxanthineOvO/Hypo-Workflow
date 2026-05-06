# C8 Design Spec - Rules, Agent Review, RTL Domain Packs, and Codex Plugin

## Product Scope

C8 upgrades Hypo-Workflow from a mostly command-and-adapter workflow into a stronger behavior-governance layer. The Cycle focuses on four independent Features:

1. structured Rules/Habits as the durable authority for user preferences and project rules;
2. default Agent Review for plan, test, implementation, Skills, and generated platform artifacts;
3. a general domain-pack boundary, with RTL as the first reference domain pack;
4. Claude Code support for OpenAI's official Codex plugin, including safe delegation and confirmed installation.

Agent Teams debate frameworks are explicitly deferred. C8 should not depend on an experimental multi-agent discussion surface to deliver useful review behavior.

## Confirmed Decisions

- Use Batch Plan Mode with four Feature Queue entries.
- Rules/Habits authority is structured data first; Markdown habits and instruction files are generated views.
- Supported rule scopes are `global`, `project`, and `cycle`.
- Rule precedence is `cycle > project > global > builtin`.
- Natural-language "remember this rule" capture should not interrupt a discussion; ordinary candidates are confirmed at the end of the turn or planning checkpoint.
- Explicit remember commands and force-write forms are supported when the user clearly requests them.
- Review is default behavior, not only an optional strict profile.
- Plan, test, and code review stages write durable `.pipeline/reviews/` artifacts.
- Review default outcome for problems is `needs_changes`; the main Agent may repair and re-review up to 3 rounds.
- Hard stop behavior is configurable. In strict mode, configured failure levels such as `critical` block the workflow.
- Skill Markdown, Codex/OpenCode/Claude hooks, generated agents, commands, and adapter instructions must be part of review coverage.
- RTL is not hardcoded into core. C8 designs a domain-pack interface first and ships RTL as a reference pack.
- Domain packs must be externalizable to future local paths, repositories, or marketplace-style package ids.
- Claude Code Codex support targets the official OpenAI `codex-plugin-cc` plugin.
- Default plugin behavior is detect, configure, and report. Real user-level or remote installation requires explicit confirmation.
- Codex implementation delegation may use multiple workers only when ownership can be split into disjoint files or modules.
- Test and review should stay independent from the implementation worker.

## Feature Queue

| Feature | Title | Dependencies | Validation focus |
|---|---|---|---|
| F001 | Rules/Habits Authority | none | schema, conflict resolution, generated habits/instructions |
| F002 | Default Agent Review | F001 | review artifacts, retry loop, hard-gate behavior |
| F003 | Domain Pack Interface + RTL Pack | F001, F002 | domain manifest, externalization boundary, RTL checklist/profile integration |
| F004 | Claude Code Codex Plugin Support | F001, F002 | plugin detection, safe install confirmation, Codex delegation |

## Review Model

Review artifacts live under `.pipeline/reviews/` and are grouped by Feature, Milestone, and stage:

```text
.pipeline/reviews/
  F002-agent-review/
    M05/
      plan/
      tests/
      code/
```

Each review stage should capture:

- input refs and reviewed files;
- active rule/habit ids and conflict resolution;
- transcript or reviewer notes when available;
- `pass`, `warn`, `needs_changes`, or `critical` verdict;
- issue list and repair proposals;
- retry round and final decision;
- fallback reason when a subagent or plugin path is unavailable.

## Rules And Habits Model

Structured rules should include:

- stable id, scope, label, severity, and hooks;
- source metadata such as capture command or chat reference;
- instruction, rationale, examples, and non-goals;
- enforcement mode such as agent judgment, deterministic check, command, or checklist;
- evidence requirements for reports and review artifacts.

Generated views should include:

- user-maintained habits Markdown;
- SessionStart and always-rule injection snippets;
- AGENTS/Claude/OpenCode/Codex adapter instruction surfaces;
- summaries that show active, overridden, and disabled rules.

## Domain Pack Boundary

Domain packs are reusable project behavior packages. The boundary protocol must support:

- built-in packs such as `domains/rtl/`;
- project-local packs such as `.pipeline/domains/rtl/`;
- future external packs from local paths, git references, or marketplace ids;
- manifest validation;
- declared prompts, checklists, test profiles, tool probes, review rules, and docs refs;
- explicit trust and install boundaries for remote or user-level sources.

The Knowledge Ledger must record the domain-pack externalization decision before implementation proceeds beyond the boundary protocol milestone.

## RTL Reference Pack

The first RTL pack should cover:

- Verilog, SystemVerilog, and SpinalHDL terminology;
- combinational versus sequential logic review checklist;
- testbench and simulation strategy guidance;
- common tool probe interface;
- Plan Discover prompts for RTL tasks;
- Review/Test Profile integration that asks for clocking, reset, stimulus, expected waveforms or assertions, and simulator evidence.

Out of scope for C8:

- formal verification frameworks;
- CDC methodology;
- synthesis constraints and timing closure;
- vendor-specific FPGA or ASIC flows beyond generic tool probes.

## Claude Code Codex Plugin Support

C8 should treat the Codex plugin as a host capability, not a Hypo-Workflow runner.

Implementation should:

- detect the official OpenAI `codex-plugin-cc` plugin and record version/path evidence when available;
- generate project-safe configuration or installation guidance;
- support confirmed user-level installation only after explicit approval;
- route implementation work to Codex where supported;
- keep testing and review independent from the implementation worker;
- detect whether multiple Codex workers are available through the plugin path;
- require disjoint ownership before enabling parallel Codex workers;
- degrade to a single Codex worker or normal host Agent with a clear report.

## Planning Profiles

C8 introduces planning profile guidance:

| Profile | Planning lead | Required review |
|---|---|---|
| `premium` | Claude | Codex/GPT implementation review and DPSK docs/report support |
| `balanced` | DPSK draft | Codex challenger by default; escalate only for critical risk |
| `cost_saver` | DPSK | Codex plan review is mandatory before execution |

These profiles are planning guidance until the implementation milestones define config/schema support.

## Validation Strategy

Every implementation milestone follows TDD:

1. write tests;
2. review tests, preferably with a Codex subagent;
3. run red;
4. implement;
5. run green;
6. review code and rule compliance, preferably with a separate Codex reviewer.

Final validation must include:

- focused Node tests for rules, review, domain packs, and Claude Codex plugin support;
- `node --test core/test/*.test.js`;
- `python3 tests/run_regression.py`;
- `bash scripts/validate-config.sh .pipeline/config.yaml`;
- generated adapter smoke for Codex/OpenCode/Claude;
- `claude plugin validate .` where Claude plugin tooling is available;
- `git diff --check`;
- `.pipeline/reviews/` evidence for C8 plan, test, code, and final regression review.

## Open Risks

- `codex-plugin-cc` behavior may change; C8 must rely on detection and official source references rather than hardcoded assumptions.
- Claude Code plugin install and user-level settings are external side effects and must remain confirmation-gated.
- Review loops can become noisy; reports must separate blocking issues from useful suggestions.
- Domain pack externalization can become too broad; C8 should implement the boundary and RTL reference pack before any separate repository split.
