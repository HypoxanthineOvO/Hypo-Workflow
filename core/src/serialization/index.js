import { createHash } from "node:crypto";
import yaml from "js-yaml";

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

export function canonicalHash(value) {
  return createHash("sha256").update(canonicalize(value)).digest("hex");
}

function canonicalize(value, seen = new Set()) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `string:${JSON.stringify(value)}`;
  if (typeof value === "boolean") return `boolean:${value}`;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("canonicalHash only supports finite numbers");
    return `number:${Object.is(value, -0) ? 0 : value}`;
  }
  if (typeof value === "bigint") return `bigint:${value}`;
  if (value instanceof Date) return `date:${value.toISOString()}`;
  if (Buffer.isBuffer(value)) return `buffer:${value.toString("base64")}`;
  if (typeof value !== "object") {
    throw new TypeError(`canonicalHash does not support ${typeof value} values`);
  }
  if (seen.has(value)) throw new TypeError("canonicalHash does not support cyclic values");

  seen.add(value);
  let result;
  if (Array.isArray(value)) {
    result = `array:[${value.map((item) => canonicalize(item, seen)).join(",")}]`;
  } else {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key], seen)}`);
    result = `object:{${entries.join(",")}}`;
  }
  seen.delete(value);
  return result;
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
