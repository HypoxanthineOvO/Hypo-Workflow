---
authority_role: record
confidence: confirmed
created_at: 2026-07-18T07:34:45.334Z
dedupe_key: cycle.c23-experiment-management.plan
id: decision-861cb23500113ed79b04c1b99f29ee2e
kind: decision
level: reference
schema_version: '1'
scope:
  ref: c23-experiment-management
  type: cycle
semantic_hash: 861cb23500113ed79b04c1b99f29ee2eb3bbcded9d9f39ba617bbea100bc5217
source_refs:
  - locator: compiled-plan
    ref: cycle:c23-experiment-management:revision:1
    type: delivery_plan
supersedes:
  - decision-eb4cf6e1b6a7f306e53be993cd17e90c
updated_at: 2026-07-18T07:34:45.334Z
---
# Deliver pilot-ready Experiment management and semantic Worker Routing

A repository can maintain structured, reproducible, reviewable experiments, while Hypo-Workflow emits deterministic semantic Worker Routing intents that a host may resolve without coupling model choice to topology or acceptance.

```json
{
  "acceptance": {
    "criteria": [
      {
        "id": "AC1",
        "statement": "Reference NeRF-like and AceSim-like sandboxes can create, rerun, supersede, trash, restore, and baseline experiments without losing historical attempts.",
        "verification": "Run the reference sandbox fixture suite."
      },
      {
        "id": "AC2",
        "statement": "Status answers use materialized records and summaries rather than rescanning repositories or result trees.",
        "verification": "Run status/index fixture tests and verify bounded record reads."
      },
      {
        "id": "AC3",
        "statement": "Runs retain code snapshot, environment, machine, dataset, command, output, interruption, and scientific-review evidence.",
        "verification": "Run reproducibility, multi-server, interruption, and suspicious-result fixture tests."
      },
      {
        "id": "AC4",
        "statement": "Worker topology, identity separation, evidence, and acceptance remain role-based and do not depend on any concrete model or provider.",
        "verification": "Run topology and evidence acceptance checks with routing metadata present and absent."
      },
      {
        "id": "AC5",
        "statement": "Codex Hook turn-hook optional fields are accepted without changing current Hook enablement or trust state.",
        "verification": "Run focused Hook tests and the independent Experiment audit."
      },
      {
        "id": "AC6",
        "statement": "Hypo-Workflow deterministically emits restart-safe semantic Worker Routing intent without selecting a provider, model, credential, prompt, or reasoning effort.",
        "verification": "Run Worker Routing classification, escalation, host-capability, persistence, Resume, Capsule, adapter, forbidden-token, and regression tests."
      }
    ],
    "scope": "cycle"
  },
  "acceptance_criteria": [
    {
      "id": "AC1",
      "statement": "Reference NeRF-like and AceSim-like sandboxes can create, rerun, supersede, trash, restore, and baseline experiments without losing historical attempts.",
      "verification": "Run the reference sandbox fixture suite."
    },
    {
      "id": "AC2",
      "statement": "Status answers use materialized records and summaries rather than rescanning repositories or result trees.",
      "verification": "Run status/index fixture tests and verify bounded record reads."
    },
    {
      "id": "AC3",
      "statement": "Runs retain code snapshot, environment, machine, dataset, command, output, interruption, and scientific-review evidence.",
      "verification": "Run reproducibility, multi-server, interruption, and suspicious-result fixture tests."
    },
    {
      "id": "AC4",
      "statement": "Worker topology, identity separation, evidence, and acceptance remain role-based and do not depend on any concrete model or provider.",
      "verification": "Run topology and evidence acceptance checks with routing metadata present and absent."
    },
    {
      "id": "AC5",
      "statement": "Codex Hook turn-hook optional fields are accepted without changing current Hook enablement or trust state.",
      "verification": "Run focused Hook tests and the independent Experiment audit."
    },
    {
      "id": "AC6",
      "statement": "Hypo-Workflow deterministically emits restart-safe semantic Worker Routing intent without selecting a provider, model, credential, prompt, or reasoning effort.",
      "verification": "Run Worker Routing classification, escalation, host-capability, persistence, Resume, Capsule, adapter, forbidden-token, and regression tests."
    }
  ],
  "constraints": [
    "Use the manifest/runtime/Records/Receipts authority; never write frozen legacy lifecycle files.",
    "Python projects default to uv; do not introduce Conda unless explicitly required.",
    "Experiment management is a non-linear lane alongside Goal and Cycle, not a scheduler or persistent runner.",
    "Current delivery acceptance is pilot-ready only; real NeRF, AceSim, GPU, and paper projects require a later Pilot Goal.",
    "AI may flag suspicious results, but untrusted results, trash changes, baseline changes, and deletion require confirmation.",
    "Worker topology and Worker Routing are independent; routing metadata must never relax identity separation, evidence, or acceptance.",
    "Workflow emits only semantic routing class, reason codes, policy version, source, and bounded failure state; host model/provider resolution remains external.",
    "Keep automation.codex.external_model_routing=false and do not change existing OpenCode model_pool semantics.",
    "Do not update the plugin cachebuster, reinstall the plugin, or perform cross-repository VSP-Codex changes before the two contracts are reviewed together."
  ],
  "delivery_kind": "cycle",
  "evidence": [
    {
      "ref": "core/src/planning/index.js",
      "summary": "Current Core compiles ordered Cycle plans and binds revision approval to a content-derived plan hash.",
      "type": "repository"
    },
    {
      "ref": "core/src/execution-topology/index.js",
      "summary": "Topology already decides worker role separation independently from any concrete model selection.",
      "type": "repository"
    },
    {
      "ref": ".pipeline/runtime/objects/delivery/c23-experiment-management",
      "summary": "C23 revision zero is executing M1 and already has independent recovery audit and test evidence.",
      "type": "repository"
    },
    {
      "ref": "conversation:c23-experiment-management",
      "summary": "User requirements cover Experiment authority, knowledge mapping, reproducibility, scans, supervision, status, sync, and Hook repair.",
      "type": "user-requirements"
    },
    {
      "ref": "conversation:c23-worker-routing-v1",
      "summary": "User supplied the five-class semantic routing contract, precedence, config modes, persistence, adapter behavior, non-goals, tests, and delayed cachebuster boundary.",
      "type": "user-requirements"
    }
  ],
  "id": "c23-experiment-management",
  "milestones": [
    {
      "depends_on": [],
      "id": "M1",
      "order": 1,
      "outcome": "Define the Experiment lane, logical experiment versus attempt identity, historical trash/restore semantics, baseline changes, and pilot fixtures.",
      "title": "Reference sandboxes, Experiment authority, and acceptance contracts",
      "verification_criteria": [
        "Reference NeRF-like and AceSim-like sandboxes exercise the core experiment record contract."
      ]
    },
    {
      "depends_on": [
        "M1"
      ],
      "id": "M2",
      "order": 2,
      "outcome": "Record project principles, metric meanings, module roles, optimization locations, source/version references, and stale knowledge detection.",
      "title": "Project knowledge, metrics, and concept-to-code mapping",
      "verification_criteria": [
        "Knowledge fixtures resolve metric and semantic code questions and detect stale references."
      ]
    },
    {
      "depends_on": [
        "M2"
      ],
      "id": "M3",
      "order": 3,
      "outcome": "Bind runs to code snapshots, uv environments, machines, datasets, commands, outputs, and explicit scan designs including cross scans and resource limits.",
      "title": "Reproducible context, experiment design, and parameter scans",
      "verification_criteria": [
        "NeRF screening/full expansion and AceSim frequency/cache/trace scan fixtures pass, including deterministic OOM evidence."
      ]
    },
    {
      "depends_on": [
        "M3"
      ],
      "id": "M4",
      "order": 4,
      "outcome": "Support isolated tmux supervision, interruption evidence, restart-from-scratch fallback, operational completion, and confirmation-gated scientific reasonableness review.",
      "title": "Long-run supervision, recovery, and scientific review",
      "verification_criteria": [
        "Short-process and tmux smoke tests pass; suspicious and inconsistent results produce review requests instead of silent conclusions."
      ]
    },
    {
      "depends_on": [
        "M4"
      ],
      "id": "M5",
      "order": 5,
      "outcome": "Maintain append-friendly Git records and materialized summaries that explain baseline, datasets, scans, outcomes, exceptions, and next actions without tree rescans.",
      "title": "Instant status, record synchronization, and pilot-ready demo",
      "verification_criteria": [
        "Two-clone GitLab-like sync and bounded status queries pass; the pilot-ready report states unvalidated real-world behavior."
      ]
    },
    {
      "depends_on": [
        "M5"
      ],
      "id": "M6",
      "order": 6,
      "outcome": "Repair optional turn-hook schema compatibility and independently audit the original C23 Experiment scope without changing Hook enablement or trust policy.",
      "title": "Codex Hook repair and independent Experiment audit",
      "verification_criteria": [
        "Focused Hook regression, full relevant Experiment test suite, and an independent role-separated audit pass."
      ]
    },
    {
      "depends_on": [
        "M6"
      ],
      "id": "M7",
      "order": 7,
      "outcome": "Add deterministic semantic Worker Routing, configuration modes, restart-safe routing state, and Codex adapter guidance while keeping topology, provider resolution, and acceptance authority separate.",
      "title": "Semantic Worker Routing and restart-safe host handoff",
      "verification_criteria": [
        "Mechanical, standard, explore, critical, and escalation classifications follow deterministic precedence and reason codes.",
        "Distinct failed routes escalate at threshold two while same-route retries, cancellations, startup failures, and network failures do not.",
        "Advisory mode records an explicit host-capability fallback and required mode blocks unsupported Worker starts.",
        "Runtime, Continuation, worker Journal events, and Recovery Capsule preserve routing class, reasons, failure counts, and policy version across Resume and compaction.",
        "Worker evidence and acceptance remain role-based and unchanged by routing fields.",
        "Core, managed guidance, documentation, and tests expose no concrete model, provider, credential, prompt, or reasoning-effort selection; no plugin cachebuster is updated."
      ]
    }
  ],
  "outcome": "A repository can maintain structured, reproducible, reviewable experiments, while Hypo-Workflow emits deterministic semantic Worker Routing intents that a host may resolve without coupling model choice to topology or acceptance.",
  "revision": 1,
  "schema_version": "1",
  "status": "draft",
  "title": "Deliver pilot-ready Experiment management and semantic Worker Routing",
  "plan_hash": "dc63837d450c3006b9ba106027f1fafdf218e9a13e1c185ae03dd1f952821c0e"
}
```
