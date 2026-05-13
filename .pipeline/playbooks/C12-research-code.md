# C12 Research-Code Playbook

## Goal

When the user asks Deep Plan to research or reference an external work, do not accept README-only evidence. If implementation behavior matters, inspect implementation code after explicit remote/network confirmation.

## Required Boundary

- Ask for explicit remote/network confirmation before any download or clone.
- The confirmation must name the concrete remote action, such as `confirmed_remote_actions: ["remote_clone"]` or `confirmed_remote_actions: ["remote_download"]`.
- In a trusted local environment, local config may pre-authorize concrete actions with `local_config_trusted_remote_actions: ["remote_clone"]`; this is a local default, not a portable project default.
- Broad `network_confirmed: true` is not enough for source download or clone.
- Store downloaded or cloned source in a bounded research cache under `.pipeline/deep-plans/<DPxxx-slug>/research-cache/<source>/`.
- Do not write outside the Deep Plan package cache.

## Required Evidence

- Inspect implementation code, implementation source, or source-code files that prove behavior.
- Record code evidence refs in `research_entries[].evidence_refs`.
- Evidence refs should point to implementation files, for example:
  - `.pipeline/deep-plans/DP001-example/research-cache/example/src/index.js`
  - `.pipeline/deep-plans/DP001-example/research-cache/example/lib/runtime.ts`
- README-only evidence is insufficient when the claim is about implementation behavior.

## Manual Procedure

1. State the external work and why source behavior matters.
2. Request explicit remote confirmation for the concrete action.
3. Download or clone only into the bounded research cache.
4. Inspect implementation code, not only README or marketing docs.
5. Record findings with code evidence refs.
6. Add unknowns for behavior that remains unverified.
7. Carry findings, risks, and unknowns into `readiness` and `convert`.

## Reject Conditions

- No explicit concrete remote action confirmation.
- Source stored outside `.pipeline/deep-plans/.../research-cache/`.
- Evidence cites only README, docs, examples, or release notes for an implementation-behavior claim.
- Research summary has no `implementation_code`, `source_code`, or source-file evidence refs.
