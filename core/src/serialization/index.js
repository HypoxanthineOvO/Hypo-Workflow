import yaml from "js-yaml";

// C027：serialization 只保留 YAML/frontmatter；哈希（canonicalHash）已根除。
export function parseYaml(source) {
  const text = String(source ?? "");
  if (!text.trim()) return {};
  const parsed = yaml.load(text, { schema: yaml.CORE_SCHEMA });
  return parsed === undefined ? {} : parsed;
}

export function stringifyYaml(value) {
  return yaml.dump(value, {
    schema: yaml.CORE_SCHEMA,
    sortKeys: true,
    noRefs: true,
    lineWidth: 120,
  });
}

export function parseFrontmatter(source) {
  const text = String(source ?? "");
  const opening = /^(?:\uFEFF)?---(?:\r?\n|$)/.exec(text);
  if (!opening) return { attributes: {}, body: text };
  if (!opening[0].endsWith("\n")) {
    throw new Error("Malformed frontmatter: opening delimiter is not followed by a newline");
  }

  const contentStart = opening[0].length;
  const closing = /^---[ \t]*(?:\r?\n|$)/m;
  closing.lastIndex = contentStart;
  const rest = text.slice(contentStart);
  const match = closing.exec(rest);
  if (!match) throw new Error("Malformed frontmatter: closing delimiter is missing");

  const attributesSource = rest.slice(0, match.index);
  const attributes = parseYaml(attributesSource);
  if (!isPlainObject(attributes)) {
    throw new Error("Malformed frontmatter: attributes must be a mapping");
  }

  return {
    attributes,
    body: rest.slice(match.index + match[0].length),
  };
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
