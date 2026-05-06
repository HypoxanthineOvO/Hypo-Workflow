# Platform Guide: Codex CLI

Use this reference when the pipeline runs inside Codex CLI.

## Environment Shape

- There is no full Claude-style plugin system.
- `notify` is the only hook-like primitive and it fires at agent-turn completion.
- Discipline is usually carried by `AGENTS.md` and the skill itself.
- Experimental subagent definitions may live in `.codex/agents/`.
- Codex Subagents are Codex/GPT runtime workers. Hypo-Workflow must not require DeepSeek, Mimo, Claude, or other external model routing for Codex delegation.

## Practical Implications

- Do not rely on SessionStart or SessionStop hooks.
- Keep state transitions explicit inside `SKILL.md`.
- Treat background notifications as optional observability, not control flow.
- Treat `.pipeline/continuation.yaml` as the durable recovery pointer when a turn ends before the pipeline is complete.
- Use `/hw:setup` to create `~/.hypo-workflow/config.yaml`.
- Cross-tool delegation may exist in a user's broader environment, but it is not Codex Subagent behavior and must not be presented as the Codex default path.

## Hook 降级说明

Codex CLI 仅支持 `notify` 配置（agent-turn-complete 事件）。
无 SessionStart / Stop / InstructionsLoaded 等事件。

Pipeline 纪律完全依赖 `SKILL.md` 内部逻辑（与 V1 行为一致）。
`notify` is observability, not a runner: it may show `.pipeline/continuation.yaml` `next_action` and `safe_resume_command`, but it must not call `/hw:resume`, `codex exec`, or any start/resume command by itself.

### notify 配置（可选）

`.codex/config.toml`:

```toml
notify = ["bash", "hooks/codex-notify.sh"]
```

### AGENTS.md 纪律条款（建议）

在项目根目录的 `AGENTS.md` 中加入：

```markdown
## Hypo-Workflow Pipeline 约束
- 每完成一个步骤必须更新 .pipeline/state.yaml
- 每完成一个步骤必须更新 .pipeline/log.yaml 或配置的 lifecycle log
- turn 结束前如 Pipeline 未完成，必须留下 .pipeline/continuation.yaml recovery state
- 最后一步必须生成报告
```

## Continuation And Preflight

- `.pipeline/continuation.yaml` records `status`, `next_action`, `reason`, `updated_at`, `safe_resume_command`, and `context`.
- `safe_resume_command` is a user/agent hint and must be `/hw:resume` or a documented natural-language resume alias.
- Before declaring completion, run preflight checks for protected authority writes, YAML/JSON/Markdown validity, stale derived artifacts, README freshness, output language, secret markers, and report/progress/log evidence.
- Missing `hooks/codex-notify.sh` is a warning. It must not affect correctness because Codex has no Stop Hook enforcement.

## Subagent Paths

Preferred order:

1. `codex exec` for explicit delegation
2. experimental `.codex/agents/` conventions when available
3. self execution fallback

Codex execution guidance should explicitly encourage Subagents for substantial work. Codex should strongly prefer concrete Subagent delegation when available. Testing/review and implementation should be separated when practical:

- use a test/review Subagent to inspect tests, failure fixtures, or final diffs
- use an implementation Subagent for scoped edits
- do not use the same Codex Subagent session to both implement and certify the same non-trivial change
- keep the main agent responsible for integration, state updates, and final judgment
- if no Subagent is used for substantial work, record a concise reason in the report

Use the lightweight proposer/challenger quality pass when changing contracts, runtime gates, adapter instructions, or onboarding language. Do not turn this into a full debate framework inside the Codex platform contract.

## Recommended Project Guardrails

Use `AGENTS.md` to restate:

- required commands
- logging expectations
- state persistence rules
- escalation behavior

This is the Codex equivalent of relying on hook-enforced discipline.

## Degradation Model

Codex should always assume:

- no guaranteed hook lifecycle
- subagent execution may fail or return partial stderr noise
- the pipeline must remain recoverable through `state.yaml` plus `.pipeline/continuation.yaml`
