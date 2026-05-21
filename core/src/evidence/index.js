import { isPlainObject, stableStringify } from "../utils/index.js";

const DEFAULT_REPLACEMENT = "[REDACTED]";
const SECRET_KEY_PATTERNS = Object.freeze([
  "api_key",
  "apikey",
  "token",
  "secret",
  "password",
  "authorization",
  "cookie",
  "access_token",
  "refresh_token",
  "client_secret",
  "private_key",
]);

const SECRET_TEXT_PATTERNS = Object.freeze([
  /\b(authorization\s*:\s*bearer\s+)[^\s,;]+/gi,
  /\b(api[_-]?key|token|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|secret)\s*[:=]\s*("[^"]+"|'[^']+'|[^\s,;]+)/gi,
  /\b(cookie\s*:\s*)[^\n\r]+/gi,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\bsk-[A-Za-z0-9_-]{8,}\b/g,
]);

export function redactSecrets(value, options = {}) {
  const replacement = options.replacement || DEFAULT_REPLACEMENT;
  return redactValue(value, {
    replacement,
    preservePaths: options.preservePaths || [],
  }, []);
}

export function validateSecretSafeEvidence(input = {}, options = {}) {
  const content = typeof input === "string" ? input : input.content ?? input;
  const serialized = typeof content === "string" ? content : stableStringify(content);
  const redacted = redactSecrets(serialized, options);
  const leaks = detectSecretLeaks(serialized);
  const status = typeof input === "object" ? String(input.status || "").toLowerCase() : "";
  const surface = typeof input === "object" ? input.surface || "evidence" : "evidence";
  const successful = ["success", "successful", "pass", "passed", "completed"].includes(status);
  return {
    ok: leaks.length === 0,
    block: successful && leaks.length > 0,
    surface,
    leak_count: leaks.length,
    leaks,
    redacted,
  };
}

export function assertSecretSafeEvidence(input = {}, options = {}) {
  const result = validateSecretSafeEvidence(input, options);
  if (!result.ok) {
    throw new Error(`secret validation failed for ${result.surface}: ${result.leaks.map((leak) => leak.type).join(", ")}`);
  }
  return result;
}

export function detectSecretLeaks(value) {
  const text = typeof value === "string" ? value : stableStringify(value);
  const leaks = [];
  for (const pattern of SECRET_TEXT_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[0].includes(DEFAULT_REPLACEMENT)) {
        if (match.index === pattern.lastIndex) pattern.lastIndex += 1;
        continue;
      }
      leaks.push({
        type: classifySecretPattern(match[0]),
        index: match.index,
      });
      if (match.index === pattern.lastIndex) pattern.lastIndex += 1;
    }
  }
  return leaks;
}

function redactValue(value, config, path) {
  if (Array.isArray(value)) return value.map((item, index) => redactValue(item, config, [...path, String(index)]));
  if (isPlainObject(value)) {
    const result = {};
    for (const [key, child] of Object.entries(value)) {
      const nextPath = [...path, key];
      if (shouldPreservePath(nextPath, config.preservePaths)) {
        result[key] = redactValue(child, config, nextPath);
      } else if (isSecretKey(key)) {
        result[key] = config.replacement;
      } else {
        result[key] = redactValue(child, config, nextPath);
      }
    }
    return result;
  }
  if (typeof value === "string") return redactText(value, config.replacement);
  return value;
}

function redactText(value, replacement) {
  let result = value;
  result = result.replace(SECRET_TEXT_PATTERNS[3], replacement);
  result = result.replace(SECRET_TEXT_PATTERNS[0], replacement);
  result = result.replace(SECRET_TEXT_PATTERNS[1], `$1=${replacement}`);
  result = result.replace(SECRET_TEXT_PATTERNS[2], replacement);
  result = result.replace(SECRET_TEXT_PATTERNS[4], replacement);
  return result;
}

function isSecretKey(key) {
  const normalized = String(key || "").toLowerCase().replace(/[-\s]+/g, "_");
  return SECRET_KEY_PATTERNS.some((pattern) => normalized === pattern || normalized.includes(pattern));
}

function shouldPreservePath(path, preservePaths) {
  const joined = path.join(".");
  return preservePaths.some((pattern) => {
    if (pattern instanceof RegExp) return pattern.test(joined);
    return joined === String(pattern) || joined.startsWith(`${pattern}.`);
  });
}

function classifySecretPattern(value) {
  const text = String(value).toLowerCase();
  if (text.includes("private key")) return "private_key";
  if (text.includes("authorization")) return "authorization";
  if (text.includes("cookie")) return "cookie";
  if (text.includes("password")) return "password";
  if (text.includes("token")) return "token";
  if (text.includes("secret")) return "secret";
  return "api_key";
}
