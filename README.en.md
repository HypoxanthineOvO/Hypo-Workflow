<div align="center">

# Hypo-Workflow

**Give any coding agent project memory and working discipline — decouple "project" from "agent"**

[![Version](https://img.shields.io/badge/version-15.0.0--alpha.2-blue)](.codex-plugin/plugin.json)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**Language:** [中文](README.md) | English

> The Chinese README is the primary version; this page mirrors it.

</div>

---

## Why Hypo-Workflow?

### 🧠 Permanent project memory, across agents

Project facts, plans, and decisions live in `.pipeline/` as ordinary Markdown/YAML files — not locked inside one agent's context. You can have **Codex plan and generate the Workflow files, hand execution to ZCode, then ask Kimi Code to review a Cycle**. Every agent reads the same project facts; context compaction, session loss, machine changes, and tool switches don't erase your project's memory.

> Support for some agents is still maturing — issues are welcome.

### 💬 Discussion first: requirements clarified before code

Drawing on the ideas behind Grill-Me / SuperPowers-style tools, Hypo-Workflow builds in a full project discussion phase. The agent doesn't start coding from a one-liner; it does requirements discovery, technical selection, and architecture discussion first, surfacing the unstated assumptions and asking you. Only when the requirements are truly clear does planning and execution begin.

### 📜 Full audit trail of every decision

Every discussion, decision, and execution leaves a record: what was decided when, why something changed, and what the verification results were. Confirmed project facts are distilled into project memory via Maintain, becoming context for all future sessions.

## Install

The easiest way is to **hand the repository to your agent** — tell it:

> Read `AGENTS.md` and the matching guide under `docs/platforms/`, install Hypo-Workflow into the current environment as described there, and tell me how to verify the installation.

Support for the various agents is still maturing — if you hit problems, issues are welcome!

## How to use it

All work goes through Discussion and planning first:

- **Discussion** clarifies the requirement — surfacing unstated assumptions so the agent's understanding of the project fully matches yours;
- While planning, answer one question: **do I need to review anything midway?**

```text
No midway checkpoint planned ──→ Goal          autonomous delivery, final acceptance
Midway checkpoints planned   ──→ plain Cycle   Milestones; checkpoints (Stones) pause for you
Open-ended exploration       ──→ Experiment    parameter scans, reruns, continuous iteration...
```

**Real examples**:

- **Goal** — GPU simulator tuning: the Discussion phase works out *how* to tune the simulator (discrepancy analysis, discriminators, layered regression) and writes it into the plan; once confirmed, the agent runs the full RTX 3090 Ti performance/activity loop on its own (analyze diff → change source → regress → back to the real workload), and you only show up for final acceptance.
- **Plain Cycle (with a Stone)** — adding an Agents panel to a TUI: the agent first builds a standalone Mock showing layout, density, and colors in a real terminal, **pauses at the Stone**, and only proceeds to the real implementation after you approve the visuals; otherwise it iterates on the Mock until the review passes.
- **Experiment** — HBM memory research: binds Git snapshots, GPU model, parameters, and output directories; run experiments, scan parameters, compare against baselines, and ask "how are the experiments going?" anytime for the current conclusion and next step — baselines, run counts, and results stay reviewable at any moment.

### Core concepts in one minute

- **Cycle**: the full lifecycle of one iteration, and the archive boundary. Each Cycle holds plans, progress, execution evidence, and discussion records.
- **Goal Cycle vs plain Cycle**: both start with planning. If the plan **has** human midway checkpoints (Stones), it's a plain Cycle; if it has **none**, it can run as a Goal with continuous autonomous delivery. Task complexity plays no role in the choice.
- **Maintain**: distill one confirmed project fact (requirement, preference, decision, feedback) into long-term memory for all future sessions.
- **Experiment**: built for open-ended exploratory work — binds Git snapshots, GPU/CUDA environments, parameters, and results; ask "how are the experiments going?" and get a direct answer.

### Ten commands

| Command | Purpose |
| --- | --- |
| `/hw:guide` | unsure of the next step? get a recommended path |
| `/hw:init` | initialize, adopt, or inspect a workspace |
| `/hw:goal` | autonomous delivery with no midway checkpoint, after Discussion |
| `/hw:plan` | deliver a plan containing human checkpoints (Stones), after Discussion |
| `/hw:cycle` | compatibility route for existing Cycles |
| `/hw:maintain` | distill one project fact into memory |
| `/hw:experiment` | manage experiment environments, scans, reruns, and status |
| `/hw:resume` | recover the work context after an interruption |
| `/hw:accept` | accept the delivery |
| `/hw:reject` | reject with structured feedback and revise |

## Learn more

- [User Guide](docs/en/user-guide.md) — the full path from install to your first delivery
- [Command Reference](docs/en/reference/commands.md)
- [Codex Platform Guide](docs/en/platforms/codex.md)
- [Platform Support Status](docs/en/reference/platforms.md)
- [Release Notes](docs/en/release/v15.0.0-alpha.2.md)

## License

MIT. See [LICENSE](LICENSE).
