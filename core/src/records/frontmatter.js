import { parseFrontmatter, stringifyYaml } from "../serialization/index.js";
import { authorityError } from "../runtime/internal.js";
import { normalizePersistedRecord } from "./schema.js";

export function renderRecordDocument(attributes, body) {
  const normalized = normalizePersistedRecord(attributes, body);
  return `---\n${stringifyYaml(normalized.attributes).trimEnd()}\n---\n${normalized.body}\n`;
}

export function parseRecordDocument(source) {
  let parsed;
  try {
    parsed = parseFrontmatter(source);
  } catch {
    throw authorityError("ERR_RECORD_SCHEMA_INVALID", "Record Markdown frontmatter is malformed");
  }
  if (!Object.keys(parsed.attributes).length) {
    throw authorityError("ERR_RECORD_SCHEMA_INVALID", "Record Markdown frontmatter is required");
  }
  return normalizePersistedRecord(parsed.attributes, parsed.body);
}
