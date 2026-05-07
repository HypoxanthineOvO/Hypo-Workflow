# Explain Spec

## 中文主体说明

本规格定义 `/hw:explain` 的只读、证据优先问答流程。Explain 适合回答项目结构、配置严格度、命令用途和近期改动原因；它必须先读取本地 evidence，再用文件引用回答，证据不足时列出 unknowns。`--subagent` 只让独立 Subagent 产出 evidence packet，最终回答仍由主 Agent 校验后生成。本文保留 evidence packet、unknowns、confidence、read-only 等术语，避免和实现接口脱节。

Use this reference for `/hw:explain` when the user asks why something is designed, what a file/config/command does, how the project is organized, or why the recent code was written that way.

## Goals

- Answer natural-language questions with cited local evidence.
- Stay read-only by default.
- Separate explanation from status, debug, audit, patch, and implementation flows.
- Say `needs_context` or `unknown` when evidence is missing.

## Command Shape

```text
/hw:explain [question]
/hw:explain --file <path> [question]
/hw:explain --diff [question]
/hw:explain --report M<N> [question]
```

`--subagent` means an independent Subagent may collect an evidence packet before the main Agent answers. If the current platform cannot provide a Subagent, Explain records `fallback_reason` and continues in evidence-first self mode.

## Evidence Packet

```yaml
question: "为什么这个配置是 strict?"
mode: read_only
scope:
  - .pipeline/config.yaml
files_read:
  - path: .pipeline/config.yaml
    excerpt: "execution.worker_separation.mode: strict"
pipeline_refs:
  - .pipeline/config.yaml
diff_refs: []
confidence: grounded
unknowns: []
```

## Subagent Evidence Packet

`/hw:explain --subagent` asks the Subagent to return only:

```yaml
reviewed_refs:
  - core/src/explain/index.js
findings:
  - ref: core/src/explain/index.js
    summary: Evidence packet is built before answering.
unknowns:
  - No live user transcript was available.
confidence: grounded
risk_notes:
  - Subagent evidence is read-only and should be verified by the main Agent if surprising.
```

The Subagent must not produce the final answer. The main Agent consumes the packet, may perform light local verification, and cites the packet findings plus unknowns.

## Platform Guidance

- Codex: use Codex Subagents when available; they stay in the Codex/GPT runtime and must be read-only for Explain.
- OpenCode: route `/hw-explain` through `hw-review`; if no native Subagent is available, use self fallback.
- Claude Code: keep `/hw:explain` in the `hw` plugin namespace and do not confuse it with Claude native resume or other built-ins; use read-only agent handoff only when configured.

## Evidence Sources

- User-specified files and paths.
- Relevant source and test files.
- `git diff` and recent local changes when explicitly requested or relevant.
- `.pipeline/config.yaml`, `.pipeline/state.yaml`, `.pipeline/PROGRESS.md`, `.pipeline/log.yaml`.
- Reports, reviews, README, docs, and references.

## Safety Rules

- Do not mutate `.pipeline/state.yaml`, `.pipeline/log.yaml`, Cycle, Patch, reports, source files, or remote state.
- Do not create a Patch or advance the Cycle.
- Do not use live remote resources unless the user explicitly asks and current network boundaries allow it.
- Do not infer facts that are not supported by evidence; list them under `unknowns`.
- Redact secret-like evidence before displaying it.
