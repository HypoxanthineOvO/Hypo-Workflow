# C12 Hypo-Agent Deep Plan Playbook

## Goal

Use `/hw:plan:deep` when the Hypo-Agent request is still too unclear for ordinary Plan decomposition.

## Flow

`new -> ask -> research -> map -> drill -> readiness -> convert`

1. `new`: create a durable Deep Plan package for the Hypo-Agent redesign.
2. `ask`: challenge the request from first principles until the real failure mode, smallest closed loop, disconfirming evidence, and acceptance signal are explicit.
3. `research`: collect local evidence and record evidence refs in the package.
4. `map`: produce requirement tracks, module tracks, architecture components, and relationships.
5. `drill`: focus on unclear modules until decisions, risks, and open items are concrete.
6. `readiness`: check target depth. Directional work may stay parked; implementation-ready work needs tests, risks, acceptance depth, and ordered queue.
7. `convert`: generate ordinary Plan context without executing work.

## Required Pre-Plan Evidence

- Feature Queue order is visible before ordinary Plan starts.
- `acceptance_depth` is explicit for each implementation-ready Feature.
- `risks` and `unknowns` remain visible in the handoff.
- Directional items are parked instead of becoming executable Features.
- Ordinary `/hw:plan` confirmation is still required after conversion.

## Manual Acceptance

The operator should be able to read the converted context and answer:

- What Feature runs first, second, and third?
- What acceptance depth proves each Feature is ready?
- Which risks and unknowns must ordinary Plan carry forward?
- Which items are intentionally parked?
- Where does `/hw:plan` confirmation happen before execution artifacts are written?
