# Notion Source Adapter

Use this adapter when `pipeline.source: notion`.

## Goal

Read prompt definitions from Notion and convert them into the same internal prompt shape used by the local adapter.

## Configuration

```yaml
pipeline:
  source: notion

notion:
  token_file: ./Notion-API.md
  source_database_id: "..."
  # or
  source_page_id: "..."
```

Token resolution order:

1. `NOTION_TOKEN`
2. `notion.token_file`

## Source Modes

### Database Mode

- query a Notion database
- treat each row as one prompt
- sort by explicit database order when available
- otherwise sort by title / configured ordering property

### Page Mode

- read child pages under `source_page_id`
- treat each child page as one prompt
- preserve page order when retrievable

## Prompt Mapping

Each prompt should resolve to:

- prompt id / filename stem
- title
- body content
- sections equivalent to:
  - `需求`
  - `预期测试`
  - `预期产出`

When Notion content is incomplete, stop with an explicit adapter error instead of guessing.

## Failure Handling

- missing token -> fail with a clear auth error
- inaccessible page/database -> fail with a clear permission error
- empty result set -> fail with a clear source-empty error
- malformed prompt content -> fail with a clear parse error
