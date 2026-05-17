# Domain Pack Spec

Domain Packs add task-category guidance without hardcoding every domain into core workflow logic. They are opt-in helpers for Discover, implementation checklists, and verification evidence.

## Pack Locations

Built-in packs live under `domains/<id>/`.

Project-local packs live under `.pipeline/domains/<id>/`.

When both exist for the same id, the project-local pack overrides the built-in pack. This lets a project specialize guidance without editing packaged defaults.

## Manifest Contract

Each pack has a `manifest.json` file.

Required fields:

- `id`: lowercase letters, numbers, and dashes
- `name`: human-readable label
- `version`: pack version
- `triggers`: task text terms used for suggestion
- `checklist`: concise items that can be rendered into prompts or reports

Optional fields include `languages`, `design_kinds`, `concepts`, `evidence`, `tool_probes`, and `prompt_coverage`.

All `tool_probes` must be `metadata-only`. A Domain Pack may identify that a local simulator or toolchain appears relevant, but it must not install dependencies, fetch code, or execute external pack logic.

## External References

External pack references are metadata-only and may be represented as metadata, for example `github:org/pack`, `npm:pack`, or `@scope/pack`.

They are unsupported until the user confirms installation. No remote install, remote fetch, dependency install, or external code execution is allowed merely because a reference is present.

## Helper Interface

The core helper supports:

- validating a manifest
- loading a local pack by id
- preferring `.pipeline/domains/<id>/` over `domains/<id>/`
- representing external references as unsupported metadata
- suggesting packs from task text
- rendering checklist snippets only for selected packs

Non-matching tasks should not receive domain-specific noise. For example, a README edit should not include RTL checklist text.

## RTL Reference Pack

The built-in `rtl` pack covers hardware description and verification work.

It mentions:

- Verilog
- SystemVerilog
- SpinalHDL
- combinational design
- sequential design
- clock/reset behavior
- testbench structure
- simulator evidence
- metadata-only tool probes

The RTL pack may suggest simulator-aware evidence such as command output, logs, or waveform notes. It must not install Verilator, Icarus Verilog, VCS, Questa, SBT, SpinalHDL dependencies, or any remote pack.

## M07-M09 Prompt Coverage

M07 should use Domain Pack triggers during Discover to select or suggest relevant packs from task text.

M08 should render the selected pack checklist into implementation guidance.

M09 should carry pack-specific evidence requirements into verification and reporting.

For RTL, this means the prompts should surface HDL language, combinational/sequential classification, clock/reset assumptions, testbench expectations, simulator evidence, and metadata-only tool probe boundaries.
