const PLAIN_OBJECT_TAG = "[object Object]";

export function isPlainObject(value) {
  return Object.prototype.toString.call(value) === PLAIN_OBJECT_TAG;
}

export function cloneJson(value) {
  if (value === undefined) return undefined;
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

export const deepClone = cloneJson;

export function compactTimestamp(value) {
  return String(value || "")
    .replace(/\.\d{3}(?=Z|[+-]\d{2}:?\d{2}$)/, "")
    .replace(/[-:]/g, "");
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function safeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
