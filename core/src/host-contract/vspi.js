import {
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  normalizeTimestamp,
} from "../runtime/internal.js";
import { canonicalHash } from "../serialization/index.js";

const CONTRACT_VERSION = "1";
const PLAN = Object.freeze({
  authority: "hypo-workflow",
  uninitialized_behavior: "require_explicit_init",
  local_plan_fallback: false,
  session_binding_fields: ["workspace_id", "delivery_ref", "plan_hash", "revision"],
});
const MODEL_ROUTING = Object.freeze({
  signal_owner: "hypo-workflow",
  resolver_owner: "vspi",
  mode: "explicit_auto_group",
  manual_override: "pinned_until_auto",
  switch_boundary: "turn_or_worker",
  tiers: ["mechanical", "standard", "explore", "critical", "escalation"],
  capability_filters: ["vision", "tool_use", "context_window"],
});
const CONTEXT_RETRIEVAL = Object.freeze({
  status: "experimental",
  enabled_by_default: false,
  source: "bounded_capsule_and_typed_reads",
  fallback: "pi_native_compaction",
  metrics: ["input_tokens", "latency_ms", "miss_rate"],
});

export function compileVspiIntegrationContract(input) {
  assertPlainObject(input, "VSPi integration contract input");
  assertExactKeys(input, ["generated_at"], "VSPi integration contract input");
  return parseVspiIntegrationContract({
    schema_version: CONTRACT_VERSION,
    contract_version: CONTRACT_VERSION,
    generated_at: normalizeTimestamp(input.generated_at, "VSPi integration contract generated_at"),
    plan: PLAN,
    model_routing: MODEL_ROUTING,
    context_retrieval: CONTEXT_RETRIEVAL,
  });
}

export function parseVspiIntegrationContract(input) {
  assertPlainObject(input, "VSPi integration contract");
  assertExactKeys(
    input,
    ["schema_version", "contract_version", "generated_at", "plan", "model_routing", "context_retrieval"],
    "VSPi integration contract",
  );
  assertNoRawSecrets(input, "VSPi integration contract");
  if (input.schema_version !== CONTRACT_VERSION || input.contract_version !== CONTRACT_VERSION) {
    throw contractError("ERR_VSPI_CONTRACT_INVALID", "VSPi integration contract version is unsupported");
  }
  normalizeTimestamp(input.generated_at, "VSPi integration contract generated_at");
  assertExactContractValue(input.plan, PLAN, "plan");
  assertExactContractValue(input.model_routing, MODEL_ROUTING, "model routing");
  assertExactContractValue(input.context_retrieval, CONTEXT_RETRIEVAL, "context experimental default-disabled policy");
  return clone(input);
}

function assertExactContractValue(actual, expected, label) {
  if (canonicalHash(actual) !== canonicalHash(expected)) {
    throw contractError("ERR_VSPI_CONTRACT_INVALID", `VSPi integration contract ${label} is invalid`);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function contractError(code, message) {
  return authorityError(code, message);
}
