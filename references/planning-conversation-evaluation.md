# Planning Conversation Evaluation

This is a semantic review guide for Agents and maintainers. It is intentionally not an automated prompt-string test: planning quality depends on whether the conversation establishes shared understanding, not whether a response contains fixed phrases or a fixed number of turns.

## Required visible artifacts

Before a Goal or Plan Proposal, review the conversation as a whole and verify that the user can see:

1. **Discover**: a complete synthesis of requested outcomes, constraints, acceptance expectations, and unresolved ambiguity. It distinguishes direct user statements, repository evidence, and Agent inference, and explains how multiple comments were consolidated.
2. **Technical**: the existing and proposed technology, dependencies, compatibility constraints, validation tools, and the reasons for important choices. New projects and materially new stages need an explicit technical baseline.
3. **Architecture**: a TUI-equivalent diagram such as Mermaid, ASCII, or a compact component table. Existing projects mark changed components and downstream effects in the current system. New projects show target components, boundaries, ownership, and data/control flow.

These are displays, not three approval gates. They may be presented together when the user asks for uninterrupted planning. Ask a question only when its answer materially changes scope, safety, architecture, release behavior, or acceptance.

## Scenario review

### New request

- Did the Agent reflect the user's actual requirement before treating repository exploration as agreement?
- Are material assumptions labeled and either supported by evidence or discussed with the user?
- Does the Proposal follow the visible artifacts rather than replace them?

### One-pass planning

- When the user asks to plan in one pass, are all three artifacts still visible?
- Did the Agent avoid filler questions and per-artifact confirmation cards?
- Is there one final choice: confirm and start, confirm without starting, or continue Discussion?

### Rejection and revision

- Before proposing a fix, did the Agent explain what is wrong, the current state, why the prior reasoning failed, and what assumptions change?
- Are the affected Discover, Technical, and Architecture deltas visible?
- Did the Agent avoid treating rejection itself as authorization to edit or substituting a Receipt for discussion?

### Context and memory without Hooks

- Did the Agent load the manifest, Session-selected Work Item Runtime/Continuation, and latest valid Recovery Pack when needed?
- Did the Agent notice explicit durable requirements, preferences, decisions, and feedback without depending on keyword matching?
- Did it avoid persisting brainstorming, diagnostics, secrets, or an unreviewed inbox proposal as authority?

## Failure signals

The review fails when the Agent claims planning or Discover has converged solely because it inspected the repository, skips any required visible artifact, asks ceremonial questions with obvious recommended answers, applies a fixed discussion-round quota, or turns a plain acknowledgement into execution authority outside the final Proposal context.
