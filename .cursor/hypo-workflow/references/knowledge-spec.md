# Knowledge Ledger Spec

The Knowledge Ledger is a project-local memory contract under `.pipeline/knowledge/`. It stores reusable facts from completed work without turning Hypo-Workflow into a runner-owned memory service.

## Directory Layout

Canonical layout:

```text
.pipeline/knowledge/
  records/*.yaml
  index/dependencies.yaml
  index/references.yaml
  index/pitfalls.yaml
  index/decisions.yaml
  index/config-notes.yaml
  index/secret-refs.yaml
  knowledge.compact.md
```

`records/*.yaml` hold raw session records. `index/*.yaml` files are generated category views for fast loading and filtering. `knowledge.compact.md` is the SessionStart summary surface.

## Session Records

Each record uses YAML and must include:

- `schema_version`
- `id`
- `type`: `milestone`, `patch`, `chat`, `explore`, `release`, or `sync`
- `source`: event-specific origin metadata
- `created_at`
- `summary`
- `details`
- `tags`
- `categories`
- `refs`

Type-specific `source` fields:

| Type | Required source fields |
|---|---|
| `milestone` | `cycle`, `feature`, `milestone`, `prompt_file` |
| `patch` | `patch` |
| `chat` | `session_id` |
| `explore` | `explore_id` |
| `release` | `version` |
| `sync` | `sync_id` |

Records may include `secret_refs`, but they must not contain raw secret values. `state.yaml must not store full knowledge records`; state may only point to compact/index paths when a future runtime surface needs that pointer.

## Category Indexes

Supported categories are:

- `dependencies`
- `references`
- `pitfalls`
- `decisions`
- `config-notes`
- `secret-refs`

Generated index files contain concise entries grouped by record id, source, tags, and summary. They are optimized for loading and filtering; they are not the authoritative raw record.

## Design Concept And Glossary Indexing

Deep Discover and Grill-Me may create durable design concept artifacts outside the Knowledge Ledger:

- `.pipeline/design-concepts.yaml`
- `.pipeline/glossary.md`
- `.pipeline/architecture.md`
- generated prompt files

Knowledge Ledger indexes confirmed decisions and references about those artifacts. It must not duplicate full design-concepts or glossary bodies into every compact context.

Recommended record categories:

- `decisions` for accepted terminology, source-of-truth, non-goal, lifecycle, or architecture choices
- `references` for links to `.pipeline/design-concepts.yaml`, `.pipeline/glossary.md`, relevant architecture sections, and generated prompts

Raw discussion is not authoritative until the agent extracts and confirms a decision or concept.

## Compact Summary

`.pipeline/knowledge/knowledge.compact.md` is a human-readable synthesis of high-value current knowledge:

- recent decisions
- durable pitfalls
- important dependencies
- config notes that affect future commands
- redacted secret-reference locations

It should stay short enough for SessionStart context. Full evidence remains in `records/*.yaml`.

## Secret References

Real secret values live only in `~/.hypo-workflow/secrets.yaml` or the user environment. Repository records may store:

- provider name
- environment variable name
- purpose
- redacted value such as `sk-...abcd`

Repository records must not store raw `api_key`, `token`, `secret`, `password`, `authorization`, `access_token`, `refresh_token`, `client_secret`, or similar values.

## Loading Policy

SessionStart loads the compact summary and category indexes only:

- `.pipeline/knowledge/knowledge.compact.md`
- `.pipeline/knowledge/index/dependencies.yaml`
- `.pipeline/knowledge/index/references.yaml`
- `.pipeline/knowledge/index/pitfalls.yaml`
- `.pipeline/knowledge/index/decisions.yaml`
- `.pipeline/knowledge/index/config-notes.yaml`
- `.pipeline/knowledge/index/secret-refs.yaml`

Raw `.pipeline/knowledge/records/*.yaml` files are loaded only for explicit `/hw:knowledge view` or narrow search results.

## Helper API

The deterministic helper API lives in `core/src/knowledge/index.js` and is exported from `core/src/index.js`.

Core helpers support:

- `normalizeKnowledgeRecord` for stable IDs, normalized source refs, canonical category order, normalized tags, and recursive redaction
- `appendKnowledgeRecord` for writing validated records under `.pipeline/knowledge/records/`
- `rebuildKnowledgeIndexes` for regenerating all six category indexes
- `renderKnowledgeCompact` for writing `.pipeline/knowledge/knowledge.compact.md`
- `rebuildKnowledgeLedger` for index plus compact regeneration

These helpers are reusable by CLI commands, hooks, `/hw:knowledge`, and OpenCode plugin code. They must stay deterministic and dependency-light.

## Cycle Archive Summary

When a Cycle is archived, copy the compact knowledge summary or write a short archive summary next to the Cycle archive. Do not duplicate all raw records into the archive unless the archive command explicitly owns that operation.

## Command Surface

`/hw:knowledge` supports:

- `list`: list records or index entries
- `view`: show one record by id
- `compact`: regenerate or display `knowledge.compact.md`
- `index`: regenerate or inspect category indexes
- `search`: filter by category, tag, source, or text

M01 defines this contract. M02 implements deterministic helper APIs and index/compact generation. Hook capture and OpenCode SessionStart integration are implemented in later milestones.
