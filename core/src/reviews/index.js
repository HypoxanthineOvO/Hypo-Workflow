import { posix } from "node:path";
import { detectSecretLeaks, redactSecrets } from "../evidence/index.js";
import { cloneJson, isPlainObject } from "../utils/index.js";

export const REVIEW_VERDICTS = Object.freeze(["pass", "warn", "needs_changes", "critical"]);
export const REVIEW_SURFACES = Object.freeze(["skills", "hooks", "agents", "commands", "generated_adapters"]);

const DEFAULT_MAX_ROUNDS = 3;
const SECRET_KEY_PATTERN = /(?:api[_-]?key|token|secret|password|authorization|cookie|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key)/i;

export function reviewArtifactDir(input = {}) {
  const pipelineDir = normalizePipelineDir(input.pipelineDir || ".pipeline");
  const feature = normalizeReviewSegment(input.feature, "feature");
  const milestone = normalizeReviewSegment(input.milestone, "milestone");
  const stage = normalizeReviewSegment(input.stage, "stage");
  return posix.join(pipelineDir, "reviews", feature, milestone, stage);
}

export function validateReviewArtifact(artifact = {}, options = {}) {
  const errors = [];
  const secretMode = options.secretMode || "redact";
  const original = isPlainObject(artifact) ? artifact : {};
  const leaks = detectSecretLeaks(original);
  const secretFields = findSecretFieldPaths(original);

  if (!isPlainObject(artifact)) {
    errors.push({ field: "artifact", code: "invalid_type", message: "review artifact must be an object" });
  }

  if (!REVIEW_VERDICTS.includes(original.verdict)) {
    errors.push({ field: "verdict", code: "invalid_verdict", message: `verdict must be one of ${REVIEW_VERDICTS.join(", ")}` });
  }

  if (!Array.isArray(original.reviewed_refs) || original.reviewed_refs.length === 0 || original.reviewed_refs.some((ref) => typeof ref !== "string" || !ref.trim())) {
    errors.push({ field: "reviewed_refs", code: "required", message: "reviewed_refs must be a non-empty array of strings" });
  }

  if (original.retry_round !== undefined && (!Number.isInteger(original.retry_round) || original.retry_round < 1)) {
    errors.push({ field: "retry_round", code: "invalid_retry_round", message: "retry_round must be a positive integer" });
  }

  validateOptionalArray(original, "checked_rules", errors);
  validateOptionalArray(original, "unchecked_rules", errors);
  validateOptionalArray(original, "issues", errors);

  if (secretMode === "reject" && (leaks.length > 0 || secretFields.length > 0)) {
    errors.push({
      field: "artifact",
      code: "secret_detected",
      message: "review artifact contains secret-like evidence",
      leaks,
      secret_fields: secretFields,
    });
  }

  const safeArtifact = secretMode === "reject" ? cloneJson(original) : redactSecrets(original);

  return {
    ok: errors.length === 0,
    artifact: safeArtifact,
    errors,
    secret_handling: {
      mode: secretMode,
      leak_count: leaks.length,
      secret_fields: secretFields,
    },
  };
}

export function resolveReviewRetry(review = {}, policy = {}) {
  const verdict = review.verdict;
  const maxRounds = normalizeMaxRounds(policy.max_rounds ?? policy.maxRounds ?? DEFAULT_MAX_ROUNDS);
  const currentRound = normalizeRound(review.retry_round ?? review.round ?? 1);
  const strict = Boolean(policy.strict);
  const strictVerdicts = new Set(policy.blocking_verdicts || policy.blockingVerdicts || ["warn", "needs_changes", "critical"]);

  if (strict && strictVerdicts.has(verdict)) {
    return retryDecision("block", true, false, null, maxRounds, `strict review gate blocked verdict ${verdict}`);
  }

  if (verdict === "pass" || verdict === "warn") {
    return retryDecision("continue", false, false, null, maxRounds, verdict === "pass" ? "review passed" : "review warning recorded");
  }

  if (verdict === "needs_changes") {
    if (currentRound < maxRounds) {
      const nextRound = currentRound + 1;
      return retryDecision("repair_review", false, true, nextRound, maxRounds, `needs_changes retry ${nextRound}/${maxRounds}`);
    }
    return retryDecision("block", true, false, null, maxRounds, "needs_changes reached max review rounds");
  }

  if (verdict === "critical") {
    return retryDecision("block", true, false, null, maxRounds, "critical review verdict blocks continuation");
  }

  return retryDecision("block", true, false, null, maxRounds, "invalid review verdict");
}

export function buildReviewCoverageChecklist(input = {}) {
  const checked = input.checked || {};
  const skipped = input.skipped || {};
  const surfaces = input.surfaces || REVIEW_SURFACES;

  return surfaces.map((surface) => {
    const checkedEvidence = normalizeEvidence(checked[surface]);
    if (skipped[surface]) {
      return {
        surface,
        status: "skipped",
        evidence: checkedEvidence,
        reason: normalizeSkipReason(skipped[surface]),
      };
    }
    if (checkedEvidence.length > 0) {
      return {
        surface,
        status: "checked",
        evidence: checkedEvidence,
        reason: "",
      };
    }
    return {
      surface,
      status: "skipped",
      evidence: [],
      reason: "no evidence provided",
    };
  });
}

function normalizePipelineDir(value) {
  const text = String(value || "").trim().replace(/\\/g, "/").replace(/\/+$/g, "");
  if (!text || text.includes("..") || posix.isAbsolute(text)) {
    throw new Error(`invalid review pipeline directory: ${value}`);
  }
  return text;
}

function normalizeReviewSegment(value, name) {
  const text = String(value || "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(text)) {
    throw new Error(`invalid review path segment for ${name}: ${value}`);
  }
  return text;
}

function validateOptionalArray(artifact, field, errors) {
  if (artifact[field] !== undefined && !Array.isArray(artifact[field])) {
    errors.push({ field, code: "invalid_type", message: `${field} must be an array when present` });
  }
}

function findSecretFieldPaths(value, path = []) {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findSecretFieldPaths(item, [...path, String(index)]));
  }
  if (!isPlainObject(value)) return [];
  const paths = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...path, key];
    if (SECRET_KEY_PATTERN.test(key)) paths.push(nextPath.join("."));
    paths.push(...findSecretFieldPaths(child, nextPath));
  }
  return paths;
}

function normalizeMaxRounds(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) return DEFAULT_MAX_ROUNDS;
  return number;
}

function normalizeRound(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) return 1;
  return number;
}

function retryDecision(action, blocked, shouldRetry, nextRound, maxRounds, reason) {
  return {
    action,
    blocked,
    next_round: nextRound,
    should_retry: shouldRetry,
    max_rounds: maxRounds,
    reason,
  };
}

function normalizeEvidence(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return [String(value).trim()].filter(Boolean);
}

function normalizeSkipReason(value) {
  if (typeof value === "string") return value;
  if (isPlainObject(value) && value.reason) return String(value.reason);
  return "skipped by review coverage policy";
}
