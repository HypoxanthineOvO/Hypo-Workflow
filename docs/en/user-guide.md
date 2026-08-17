# User Guide

This guide walks you from installing Hypo-Workflow to delivering your first requirement, and explains the concepts you'll use daily. For "what it is and why", start with the [README](../README.en.md). The Chinese version of this guide is the primary text.

Hypo-Workflow is a working protocol: the actual coding, testing, and command execution are done by your host agent (Codex is the fully supported host today), while the Workflow keeps plans, progress, evidence, and memory in `.pipeline/` as ordinary files — human-readable, recoverable, and auditable.

## Quick start: from install to first delivery

### 1. Install

**Codex (full support, with Hooks)**:

```bash
git clone https://github.com/HypoxanthineOvO/Hypo-Workflow.git
codex plugin marketplace add /absolute/path/to/Hypo-Workflow
```

Install and enable `hypo-workflow` from Codex `/plugins`, then use `/hooks` in a new session to review and trust the plugin Hooks (re-trust after Hook definitions change).

**Kimi Code**: copy `skills/<name>/SKILL.md` to `~/.kimi-code/skills/<name>/SKILL.md` (see [adapters/kimi](../../adapters/kimi/README.md)).

**Other agents (ZCode, etc.)**: support is still maturing. Hand the repository to your agent and let it install by following `AGENTS.md` and the matching guide under `docs/platforms/`; issues are welcome if you hit problems.

### 2. Initialize the workspace

In your project, say:

```text
/hw:init
```

The agent inspects the repository, sets up (or adopts) the `.pipeline/` workspace, and reports the current state. Whenever you're unsure of the next step, `/hw:guide` recommends a path.

### 3. Make a request: discuss first, then act

Describe what you want. The agent does not start coding immediately — it enters **Discussion** first: requirements discovery → technical selection → architecture impact. It asks about your unstated assumptions, and planning only begins after you confirm the discussion is complete.

At the end of Discussion, the agent presents a complete Proposal with three responses:

- **Confirm and start** — execute immediately;
- **Confirm without starting** — save the plan, start it later;
- **Not confirmed / keep discussing** — go back and refine.

Note: only when the full Proposal is visible and the agent is asking whether to start does a short "OK" mean approval to start; elsewhere, a yes answers only the question at hand.

### 4. Three delivery modes

Once discussion and planning are done, delivery follows the plan:

| Your situation | Use | Behavior |
| --- | --- | --- |
| No midway checkpoint planned | `/hw:goal` | agent executes continuously; you accept at the end |
| Midway checkpoints planned | `/hw:plan` | split into Milestones; checkpoints (**Stones**) pause for you |
| Open-ended exploration | `/hw:experiment` | records environment/baselines/parameters; scans, reruns, iteration |

Both Goals and plain Cycles **start with planning** — the only difference is whether the plan contains Stones. Complexity and the number of acceptance criteria are not reasons to require a Stone.

Three real examples:

- **Goal** — GPU simulator tuning: the tuning methodology (discrepancy analysis, discriminators, layered regression) is settled in Discussion, then the agent runs the full RTX 3090 Ti performance/activity loop autonomously, with one final acceptance.
- **Plain Cycle (with a Stone)** — adding an Agents panel to a TUI: a standalone Mock is delivered first for you to check the real-terminal visuals; the real implementation starts only after you approve.
- **Experiment** — HBM memory research: environment and parameters bound to every run, with scans, baselines, and status you can query anytime.

### 5. Acceptance and revision

When delivery completes, the agent explains in chat: conclusion, approach, changes, tests, results, problems, and risks. Then:

- `/hw:accept` — accept; the Cycle is archived;
- `/hw:reject` — reject with structured feedback; the work enters a revision loop.

### 6. Interruption and recovery

Context compaction and session interruptions are fine. When you come back:

```text
/hw:resume
```

The agent restores the plan, progress, and next step from `.pipeline/` — no need to re-explain anything.

## Core concepts

- **Cycle**: the full lifecycle of one iteration, and the archive boundary. Each Cycle holds `PLAN.md`, `PROGRESS.md`, `EXECUTION.md`, and discussion records, all as ordinary files.
- **Milestone vs Stone**: a Milestone is an independently verifiable stage; a Stone is a human checkpoint where you inspect a real artifact or make a decision. Only Stones pause execution.
- **Maintain**: `/hw:maintain` distills one confirmed project fact (requirement, preference, decision, feedback) into long-term memory. Memory is stored separately from discussion transcripts.
- **Memory**: confirmed project facts under `.pipeline/memory/` — the project's memory across sessions and agents.

## Experiment: the lane for exploratory work

For parameter scans, paper reproduction, performance tuning — work that runs, reads results, and adjusts, repeatedly.

**What gets recorded**: project purpose, paper/document references, metric and dataset meanings; each run binds a Git snapshot, `uv` environment, machine/GPU/driver/CUDA facts, data locations, parameters, seeds, the full command, and the output directory. Credentials, raw keys, and paper PDFs are never written into records — only safe references.

**Experiment vs Attempt**: one logical experiment can have many Attempts; reruns keep the identity and failure evidence traceable. A different dataset or scene is a different experiment.

**Baselines are scoped**: a global default baseline and contextual baselines (per dataset, method family, or optimization stage) can coexist; every change records its reason and scope.

**"How are the experiments going?"**: the agent reads `experiment.yaml` and its referenced Attempts and answers in order — baselines, environment, datasets, scan purpose, outcomes, suspicious results, next actions — without rescanning every directory.

**Result review**: a finished run is only operational completion, not scientific validity. The agent reviews results against baselines, paper expectations, and neighboring runs; suspicious results go to pending confirmation for you to judge. Trashed Attempts can be restored; permanent deletion requires separate authorization.

**Long tasks**: supervised via uniquely named tmux sessions with the agent polling and updating records; interruptions preserve evidence, and runs resume from real checkpoints or are explicitly marked restart-from-scratch.

See the [Experiment Record Protocol](reference/experiment-records.md).

## Concurrent work items

A project can hold multiple Goals, Plans, and Experiments at once. One authority root can register multiple independent Git repository targets. Source writes use isolated worktrees; GPUs, ports, and output directories are checked for conflicts through atomic leases before startup. Source changes must merge back into the registered integration target with Git ancestry evidence before final acceptance.

## Worker routing

The Workflow decides whether to use Workers based on coupling, parallel value, independent verification, and coordination cost — tightly coupled work can stay with the main agent end to end. Each Worker gets a semantic capability class (`mechanical` / `standard` / `explore` / `critical` / `escalation`); the concrete model mapping belongs to the host. See the [command reference](reference/commands.md).

## Ten commands at a glance

| Command | Purpose |
| --- | --- |
| `/hw:guide` | unsure of the next step? get a recommended path |
| `/hw:init` | initialize, adopt, or inspect a workspace |
| `/hw:goal` | autonomous delivery with no midway checkpoint, after Discussion |
| `/hw:plan` | deliver a plan containing Stones, after Discussion |
| `/hw:cycle` | compatibility route for existing Cycles |
| `/hw:maintain` | distill one project fact into memory |
| `/hw:experiment` | manage experiment environments, scans, reruns, and status |
| `/hw:resume` | recover the work context after an interruption |
| `/hw:accept` | accept the delivery |
| `/hw:reject` | reject with structured feedback and revise |

Status, reports, explanations, and checks are natural agent behaviors in ordinary conversation — no dedicated commands needed. Per-command details: [Command Reference](reference/commands.md).
