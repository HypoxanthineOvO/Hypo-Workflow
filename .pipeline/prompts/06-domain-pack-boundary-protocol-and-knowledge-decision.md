# M07 / F003 - Domain Pack Boundary Protocol and Knowledge Decision

## Objective

- Design the externalizable domain-pack boundary and record the default constraints in the Knowledge Ledger before implementing RTL behavior.

## 需求

- Define a domain-pack manifest that can describe languages, file globs, Discover questions, prompt snippets, test-profile requirements, review checklists, tool probes, examples, and docs refs.
- Define pack source types:
  - built-in `domains/<id>/`;
  - project-local `.pipeline/domains/<id>/`;
  - future external local path, git ref, or marketplace id.
- Define trust and install boundaries for external packs.
- Record the decision that RTL is a reference pack and must not be hardcoded into Plan/Test/Review core.
- Rebuild Knowledge indexes/compact after writing the record.

## Boundaries

- In scope:
  - new domain-pack reference/spec docs
  - core domain manifest validation helpers
  - Knowledge record and indexes
  - tests for load order and trust boundary
- Do not implement RTL content yet; that belongs to M08.
- Do not perform remote pack installation.

## Non-Goals

- Do not create a separate RTL repository in this milestone.
- Do not build a marketplace.
- Do not support arbitrary code execution from packs.

## Implementation Plan

1. Add failing tests for manifest validation and load order.
2. Design the manifest shape and minimal helper API.
3. Add docs explaining external source trust and confirmation boundaries.
4. Write or verify the Knowledge Ledger record for C8 domain-pack decisions.
5. Rebuild Knowledge indexes/compact and record evidence.

## 预期测试

- Valid built-in and project-local pack manifests load deterministically.
- Project-local pack overrides built-in pack by id.
- External pack refs are represented as planned/unsupported until confirmed install support exists.
- Invalid manifests produce useful errors.
- Knowledge indexes include the C8 domain-pack decision.

## Validation Commands

- `node --test core/test/*domain*.test.js`
- `node --test core/test/knowledge-ledger.test.js`
- `node --test core/test/*.test.js`
- `git diff --check`

## Evidence

- Include a sample domain manifest.
- Include Knowledge record path and rebuilt index/compact paths.

## Human QA

- Confirm the boundary makes a future RTL subrepository possible without forcing it now.
- Confirm external install confirmation language is clear.

## 预期产出

- Domain pack boundary spec and helper tests.
- Knowledge decision record/index/compact updates.
- No hardcoded RTL behavior in core.
