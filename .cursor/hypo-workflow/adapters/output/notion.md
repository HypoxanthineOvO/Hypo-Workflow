# Notion Output Adapter

Use this adapter when `pipeline.output: notion`.

## Goal

Write execution reports back to Notion as pages or database entries while keeping local state/log behavior intact.

## Configuration

```yaml
pipeline:
  output: notion

notion:
  token_file: ./Notion-API.md
  output_parent_page_id: "..."
  # or
  output_database_id: "..."
  report_title_prefix: "Hypo-Workflow Report"
```

Token resolution order:

1. `NOTION_TOKEN`
2. `notion.token_file`

## Output Modes

### Parent Page Mode

- create or update child pages under `output_parent_page_id`
- use a stable title convention for idempotent upserts

### Database Mode

- create or update a database row/page under `output_database_id`
- use prompt id + pipeline name as the idempotency key when possible

## Report Mapping

- convert markdown report sections into Notion blocks
- preserve:
  - summary
  - scores
  - decision
  - warnings
  - architecture drift detail

## Failure Handling

- missing token -> fail with a clear auth error
- inaccessible parent/database -> fail with a clear permission error
- write failure -> report the error and keep local report generation intact
- output adapter failure must not erase local artifacts
