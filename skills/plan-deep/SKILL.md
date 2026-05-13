---
name: plan-deep
description: Run a durable Deep Plan discussion package before ordinary Hypo-Workflow planning.
---

# /hypo-workflow:plan:deep

## 输出语言规则

Read `.pipeline/config.yaml` -> `output.language`.

- `zh-CN` / `zh`: user-visible discussion notes, readiness reports, and summaries use Chinese.
- `en`: use English.
- `auto`: follow the user's conversation language.
- Internal YAML keys remain English.

Use this skill when the user invokes `/hw:plan:deep` or `/hw:plan --deep`.

Deep Plan is a durable pre-plan discussion lifecycle. It is for cases where requirements, product shape, architecture, module boundaries, or long-term development order are not ready for ordinary `/hw:plan` decomposition yet.

## Boundary

- Deep Plan is not `/hw:guide`; `/hw:guide` remains the onboarding and routing surface, while Deep Plan is an explicit discussion package lifecycle.
- Deep Plan is not `/hw:explore`; `/hw:explore` remains bounded hypothesis validation and codebase exploration, while Deep Plan captures requirements, architecture reasoning, decisions, and readiness.
- Deep Plan must not directly execute implementation milestones.
- Deep Plan must not bypass the ordinary `/hw:plan` P1-P4 gates. Conversion creates Plan input; ordinary Plan still controls decomposition, generation, and confirmation.

## Durable Discussion Package

Create and maintain a durable discussion package under:

```text
.pipeline/deep-plans/DP001-slug/
```

The package is the source of truth for the discussion cycle. Use the next available `DPxxx` number, slugified from the user's title.

Recommended package files:

- `deep-plan.yaml`: machine-readable source of truth for status, target depth, tracks, decisions, open questions, risks, and conversion state.
- `summary.md`: compact human-readable discussion summary.
- `architecture.yaml`: machine-readable components, edges, relationships, assumptions, and unresolved architecture questions.
- `architecture.md`: Mermaid and Markdown views rendered from the machine-readable source.
- `tracks.yaml`: active requirement and module tracks, including dependencies and conflicts.
- `readiness.md`: readiness report and blockers.
- `plan-context.md`: compact context for ordinary `/hw:plan` after `convert`.

Machine-readable source files are authoritative. Mermaid/Markdown views are derived for humans and should be refreshed from the structured source when possible.

## Operations

Supported operations:

- `new`: create a new durable discussion package and initialize `drafting`.
- `ask`: continue first-principles questioning and update tracks, decisions, risks, and open questions.
- `research`: perform local read-only research and add evidence to the package.
- `map`: generate or refresh architecture components, relationships, and Mermaid/Markdown views.
- `drill`: enter one requirement, theme, component, or module for focused questioning.
- `readiness`: evaluate whether the package is ready for directional, architecture-ready, or implementation-ready conversion.
- `convert`: create compact ordinary Plan input while preserving readiness blockers and unresolved questions.

## Lifecycle States

Allowed lifecycle states:

- `drafting`: initial problem framing, first-principles questioning, and rough tracks.
- `researching`: local read-only evidence collection is active.
- `architecture_mapping`: structured architecture components and relationships are being formed.
- `module_drilldown`: one or more tracks or modules are under focused drilldown.
- `ready_for_plan`: readiness criteria for the selected target depth are satisfied or consciously waived.
- `converted`: compact Plan context has been generated for ordinary `/hw:plan`.
- `archived`: the discussion package is closed for future reference.

## Target Depth

Readiness is target-depth based:

- `directional`: direction, problem map, core assumptions, and unknowns are explicit; details may remain open.
- `architecture-ready`: requirements, core components, relationships, and major risks are clear enough to reason about architecture.
- `implementation-ready`: requirements, architecture, module cards, testing matrix, execution order, and risk handling are ready to feed ordinary Plan.

Missing fields are blockers only when they are required by the selected target depth. A package may intentionally stay directional and later return to `ask`, `research`, `map`, or `drill`.

## First-Principles Questioning

Deep Plan should pressure-test unclear requirements before decomposition:

- what real pain or constraint makes this necessary
- why the proposed shape is necessary now
- what the smallest viable closed loop is
- what evidence would disprove the direction
- which statements are implementation habit rather than essential need
- what acceptance signal proves the discussion is ready for the selected depth

Do not use a fixed "who is the user" checklist unless the user asks for persona analysis.

## Convert Contract

`convert` is an explicit auditable boundary from discussion state into ordinary Plan input.

Before conversion:

1. Run `readiness`.
2. Show blockers, conscious waivers, unresolved questions, and selected target depth.
3. Ask for user confirmation.
4. Write `plan-context.md` and update `deep-plan.yaml` to `converted`.

After conversion, invoke or recommend ordinary `/hw:plan` with the generated context. Ordinary `/hw:plan` must still run P0/P1/P2/P3/P4 gates and must not skip Discover, Decompose, Generate, or Confirm just because the context came from Deep Plan.
