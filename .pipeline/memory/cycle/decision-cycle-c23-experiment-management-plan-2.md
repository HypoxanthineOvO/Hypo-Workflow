---
authority_role: record
confidence: confirmed
created_at: 2026-07-16T12:22:18.186Z
dedupe_key: cycle.c23-experiment-management.plan
id: decision-eb4cf6e1b6a7f306e53be993cd17e90c
kind: decision
level: reference
schema_version: '1'
scope:
  ref: c23-experiment-management
  type: cycle
semantic_hash: eb4cf6e1b6a7f306e53be993cd17e90cedac43fecd9263cbb7bb3e8580432130
source_refs:
  - locator: compiled-plan
    ref: cycle:c23-experiment-management:revision:0
    type: delivery_plan
supersedes: []
updated_at: 2026-07-16T12:22:18.186Z
---
# Deliver pilot-ready Experiment management

A repository can maintain structured, reproducible, reviewable experiments across non-linear runs, parameter scans, long supervision, multi-server records, and Hook compatibility, ready for a real-project pilot.

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
        "statement": "Independent test, implementation, and audit evidence is complete with Luna/Terra xhigh identity checks.",
        "verification": "Run the worker evidence and model-capability verification checks."
      },
      {
        "id": "AC5",
        "statement": "Codex Hook turn-hook optional fields are accepted without changing current Hook enablement or trust state.",
        "verification": "Run focused Hook tests and the final independent audit."
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
      "statement": "Independent test, implementation, and audit evidence is complete with Luna/Terra xhigh identity checks.",
      "verification": "Run the worker evidence and model-capability verification checks."
    },
    {
      "id": "AC5",
      "statement": "Codex Hook turn-hook optional fields are accepted without changing current Hook enablement or trust state.",
      "verification": "Run focused Hook tests and the final independent audit."
    }
  ],
  "constraints": [
    "Use the manifest/runtime/Records/Receipts authority; never write frozen legacy lifecycle files.",
    "Python projects default to uv; do not introduce Conda unless explicitly required.",
    "Experiment management is a non-linear lane alongside Goal and Cycle, not a scheduler or persistent runner.",
    "Current delivery acceptance is pilot-ready only; real NeRF, AceSim, GPU, and paper projects require a later Pilot Goal.",
    "AI may flag suspicious results, but untrusted results, trash changes, baseline changes, and deletion require confirmation."
  ],
  "delivery_kind": "cycle",
  "evidence": [
    {
      "ref": "core/src/planning/index.js",
      "summary": "Current Core compiles ordered Cycle plans and binds approval to a content-derived plan hash.",
      "type": "repository"
    },
    {
      "ref": ".pipeline/runtime/objects/delivery/g22-vsp-distribution-contract",
      "summary": "G22 is the accepted active Delivery and C23 may be proposed as the next Delivery.",
      "type": "repository"
    },
    {
      "ref": "conversation:c23-experiment-management",
      "summary": "User requirements cover NeRF method screening, AceSim cross scans, reproducibility, knowledge mapping, supervision, status, sync, and Hook repair.",
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
      "outcome": "Repair optional turn-hook schema compatibility and independently audit the complete C23 scope without changing Hook enablement or trust policy.",
      "title": "Codex Hook repair and final independent audit",
      "verification_criteria": [
        "Focused Hook regression, full relevant test suite, and independent Terra audit pass."
      ]
    }
  ],
  "outcome": "A repository can maintain structured, reproducible, reviewable experiments across non-linear runs, parameter scans, long supervision, multi-server records, and Hook compatibility, ready for a real-project pilot.",
  "revision": 0,
  "schema_version": "1",
  "status": "draft",
  "title": "Deliver pilot-ready Experiment management",
  "plan_hash": "77c28b1e7276ed65a1b59eac8bf57198510252df746ae951974ee8ea0a4ed6f6"
}
```
