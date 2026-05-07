---
name: explain
description: Answer project, code, config, command, or recent-change questions with cited local evidence; use when the user invokes /hw:explain or asks for evidence-first explanation.
---

# /hypo-workflow:explain

## Output Language Rules

Read `.pipeline/config.yaml` and global config when available. User-visible explanations should follow `output.language`; file paths, command names, config keys, and code identifiers stay literal.

## Preconditions

- A question, file path, diff target, report id, or other explanation target should be available.
- If no target is provided, collect a small local evidence packet from likely project and `.pipeline/` sources.
- Explain must remain read-only.

## Execution Flow

1. Load `references/explain-spec.md`.
2. Parse the question and any explicit target such as `--file`, `--diff`, or `--report`.
3. Build an evidence packet before answering.
4. Read explicit targets first, then nearby source/test/docs/pipeline context if needed.
5. Answer with cited evidence and confidence.
6. If `--subagent` is present and a suitable Subagent is available, send a read-only handoff that asks only for `reviewed_refs`, `findings`, `unknowns`, `confidence`, and `risk_notes`.
7. If `--subagent` is unavailable, record `fallback_reason` and continue in evidence-first self mode.
8. Answer with cited evidence and confidence.
9. If evidence is missing, say `needs_context` or `unknown` and list what could not be verified.

## Interactive Behavior

- Ask for a narrower target when the question is too broad to answer with local evidence.
- Do not ask when a reasonable local evidence packet can be collected safely.
- `--subagent` requests independent read-only evidence collection; the Subagent does not produce the final answer.

## Safety Rules

- Do not mutate state, log, reports, source files, Patch files, Cycle files, or remote resources.
- Do not advance the pipeline.
- Do not replace `/hw:status`, `/hw:debug`, `/hw:audit`, or `/hw:patch`.
- Do not invent unsupported causes; mark unknowns explicitly.
- Redact secret-like evidence before displaying it.

## Failure Handling

- Missing files become `unknowns`, not hallucinated explanations.
- Unsupported flags should stop with a clear message.
- If requested evidence appears secret-bearing, ask for sanitized evidence or redact before answering.

## Reference Files

- `references/explain-spec.md`
- `references/commands-spec.md`
- `docs/reference/commands.md`
