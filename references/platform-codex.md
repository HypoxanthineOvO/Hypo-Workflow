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
- Codex skills should prefer snapshot/copy installation or controlled sync into the Codex skills directory over direct hot-editing of a live symlink skill source.

## Codex Skill Snapshot Isolation

For Codex skill development, edit the source project first, test it in an isolated worktree or isolated copy, then generate/sync a snapshot into the Codex skills directory with controlled sync.

Avoid hot-editing a live symlink source while a running Codex session may read it. That pattern creates a self-modifying skill-source risk: Codex can observe half-updated or partially updated files while the working checkout is being changed.

This is supporting guidance for Codex skill consumption. It is not the main audit governance mechanism and does not replace audit/rework/worker-separation gates.

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

Codex execution guidance should explicitly encourage Subagents for substantial work. Codex should strongly prefer concrete Subagent delegation when available. When worker separation is enabled, the formal execution roles are exactly `test`, `implement`, and `audit`; `review_tests` remains a TDD step name, not a worker role. Testing/review and implementation should be separated when practical:

- use a `test` Subagent for `write_tests`, `review_tests`, failure fixtures, and test evidence
- use an implementation Subagent for scoped edits
- use an `audit` Subagent for final diff and evidence review when audit is required
- include a role-specific explicit scope declaration in every Codex Subagent prompt: default spawned workers may write only `.pipeline/` files and explicitly scoped root-level non-project documentation such as `README.md`, `CHANGELOG.md`, and `PROJECT-SUMMARY.md`; `test` may write only named test/fixture/snapshot/assertion paths; `implement` may write only named production/runtime/documentation paths; `audit` is read-only
- if a Codex Subagent needs an out-of-scope path, it must stop and report the path and owning role instead of editing
- Codex Subagents must not revert or overwrite another worker's changes unless the prompt explicitly authorizes that exact action
- do not use the same Codex Subagent session to both implement and certify the same non-trivial change
- keep the main agent responsible for integration, state updates, and final judgment
- if no Subagent is used for substantial work, record a concise reason in the report

Use the lightweight proposer/challenger quality pass when changing contracts, runtime gates, adapter instructions, or onboarding language. Do not turn this into a full debate framework inside the Codex platform contract.

## Developer Instruction Authorization Gate

Codex runtime developer instructions may restrict Subagent creation to cases where the user explicitly asks for sub-agents, delegation, or parallel agent work. Hypo-Workflow commands must honor that higher-priority rule.

When a Hypo-Workflow command needs an independent worker role, the command must resolve authorization before role-sensitive work begins:

- `/hw:patch fix`: when code/test changes are needed, Codex must Ask for explicit `test`, `implement`, and `audit` subworker authorization before editing; the `test` worker owns test assets/evidence first, the `implement` worker must not write tests or spawn validation roles, and all worker lifecycles must be closed or recorded before auto-close
- `/hw:plan` and `/hw:plan:*`: independent challenger, domain validator, or reviewer roles need authorization before spawning
- `/hw:debug`: root-cause reproduction, fix implementation, and validation must not all be certified by the same worker when independent validation is required
- `/hw:audit`: an audit used as acceptance evidence must not be performed by the same worker that implemented the audited change
- `/hw:plan`, `/hw:start`, `/hw:resume`, `/hw:debug`, and `/hw:patch fix`: any worker they open must have a lifecycle record (`requested`, `started`, `completed|failed|blocked`, `closed|close_failed`); missing or failed closure cannot count as worker-separated evidence
- `/hw:start` and `/hw:resume`: delegated `test`, `implement`, and `audit` roles must Ask or block before silently falling back when worker separation is required. The `test` worker owns test evidence before implementation, the `implement` worker must not write tests or spawn validation roles, and `review_tests` / `review_code` are execution steps/artifact stages, not worker roles.
- Plan-time execution authorization may satisfy `/hw:start` and `/hw:resume` only when the saved plan explicitly grants subworker/delegation scope for those commands; plan-only challenger/reviewer authorization does not carry into execution. This authorization gate is Codex-specific and must not be imposed on Claude Code or OpenCode.
- Missing Codex execution authorization must not default to `recommended` or silently downgrade to `off`; it must block start/resume or use `off` only with explicit user-confirmed downgrade evidence.

Allowed outcomes:

- authorized: spawn or invoke the distinct worker and record its identity
- not authorized or unavailable: stop before role-sensitive work, or continue only when the plan explicitly selected the fastest single-agent `off` lane with user-confirmed downgrade evidence; this lane cannot satisfy worker-separation gates
- local-only safe lane: continue locally only for read-only, docs/metadata-only, or explicitly single-agent work, and record the rationale

Do not perform the work locally first and explain missing independent review afterward. That is a failed gate, not valid worker-separation evidence.

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
