# C19-M3 Prompt Rule Projection And Platform Adapters

## Objective

Project AGENTS.md four-rule discipline and phase gate visibility into managed instructions, Skills, OpenCode, Claude Code, and relevant adapter outputs.

## Scope

- Enhance the AGENTS.md four-rule behavior pack wording.
- Recommend the behavior pack while preserving opt-in rule severity defaults.
- Update `ASK_QUESTIONS_GUIDANCE` or add new guidance for phase gate visibility.
- Update OpenCode and Claude Code artifact generation so generated instructions include four-rule and phase-gate discipline.
- Update generated AGENTS.md template behavior.

## Technical Solution

Use rules as source-of-truth and adapter projection as user-visible instruction surface, avoiding duplicated unsourced prompt text.

## Technical Route

1. Clarify the existing four-rule behavior pack text.
2. Add guidance that major gates must show actual artifacts before Question Tool confirmation.
3. Render this guidance into OpenCode agent/command/AGENTS.md and Claude command/agent outputs.
4. Update tests to assert projection and DeepSeek/tool-calling compatibility remain intact.

## Research Required

Status: resolved.

Evidence:
- `rules/packs/karpathy/guidelines/*.yaml` already contains the four rules.
- `core/src/artifacts/agent-guidance.js` already centralizes Ask and DeepSeek tool-calling guidance.
- OpenCode and Claude adapters import the shared guidance.

## Risks And Alternatives

- Risk: over-constraining all users if defaults change; mitigate by recommendation plus projection, not forced severity.
- Risk: repeated guidance noise in adapters; keep shared text concise.
- Alternative rejected: paste the Zhihu AGENTS.md block verbatim; prefer structured local rule source.

## Validation Path

Run:

```bash
uv run -- node --test core/test/commands-rules-artifacts.test.js core/test/c18-instruction-quality-contract.test.js
```

Pass signal: generated artifacts include four-rule discipline and gate visibility guidance without breaking OpenCode/Claude expectations.

## Audit Focus

- No unsupported default behavior flip.
- Question Tool/Ask guidance is concrete, not vague.
- Adapter output remains schema-compatible.

## Subworker Assignment Plan

- `test`: owns adapter artifact and instruction-quality tests for four-rule projection and gate visibility. Output evidence under `.pipeline/reviews/C19/M3/test-evidence.md`.
- `implement`: owns rules, shared guidance, and adapter generation edits. Must preserve schema-compatible OpenCode permissions.
- `audit`: reviews prompt duplication, default severity safety, adapter output, and DeepSeek tool-calling compatibility. Output audit under `.pipeline/reviews/C19/M3/audit.md`.
- Main agent: coordinates workers and state/progress/log updates.
