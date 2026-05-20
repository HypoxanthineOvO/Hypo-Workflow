import test from "node:test";
import assert from "node:assert/strict";
import * as core from "../src/index.js";

test("secret capability projection emits metadata-only refs with health and redaction policy", () => {
  const buildSecretCapabilityProjection = requireFunction(core, "buildSecretCapabilityProjection");

  const projection = buildSecretCapabilityProjection({
    generated_at: "2026-05-19T15:40:00+08:00",
    secrets: [
      {
        id: "llm-primary",
        title: "Primary LLM API",
        provider: "openai-compatible",
        kind: "llm_api",
        scope: "global",
        capabilities: ["llm.chat", "llm.embedding"],
        endpoint: {
          base_url: "https://api.example.invalid/v1",
          api_key_header: "Authorization",
          auth_scheme: "bearer",
        },
        value: {
          api_key: "sk-live-secret-must-not-project",
          token: "raw-token-must-not-project",
          password: "raw-password-must-not-project",
        },
        usage: {
          allowed_for: ["coding", "research", "sync"],
          dependent_projects: ["hypo-workflow"],
        },
        health: {
          status: "healthy",
          checked_at: "2026-05-19T15:39:00+08:00",
          response_excerpt: "Authorization: Bearer provider-secret",
        },
        audit: {
          read: true,
          health_check: true,
        },
      },
      {
        id: "notion-main",
        provider: "notion",
        kind: "notion_token",
        scope: "workspace",
        capabilities: ["notion.read", "notion.write"],
        value: {
          token: "secret_notion_token_must_not_project",
        },
        usage: {
          allowed_for: ["sync", "maintenance"],
          dependent_projects: ["hypo-workflow", "hypo-claw"],
        },
        health: {
          status: "unknown",
          checked_at: null,
        },
      },
    ],
  });

  assert.equal(projection.projection, "secret_capabilities");
  assert.equal(projection.raw_values_projected, false);
  assert.ok(Array.isArray(projection.secret_refs), "projection.secret_refs must be an array");
  assert.equal(projection.secret_refs.length, 2);

  const llm = projection.secret_refs.find((ref) => ref.id === "llm-primary");
  assert.equal(llm.provider, "openai-compatible");
  assert.deepEqual(llm.allowed_for, ["coding", "research", "sync"]);
  assert.deepEqual(llm.health, {
    status: "healthy",
    checked_at: "2026-05-19T15:39:00+08:00",
  });
  assert.equal(llm.redaction_policy.raw_projected, false);
  assert.equal(llm.redaction_policy.mode, "metadata_only");
  assert.deepEqual(llm.secret_ref, {
    store_ref: "local_secret:llm-primary",
    metadata_only: true,
  });

  const notion = projection.secret_refs.find((ref) => ref.id === "notion-main");
  assert.equal(notion.provider, "notion");
  assert.deepEqual(notion.allowed_for, ["sync", "maintenance"]);
  assert.equal(notion.secret_ref.store_ref, "local_secret:notion-main");
  assert.equal(notion.secret_ref.metadata_only, true);

  assertNoForbiddenKeys(projection, ["raw_value", "value", "token", "api_key", "password", "authorization"]);
  assertNoRawMarkers(projection, [
    "sk-live-secret-must-not-project",
    "raw-token-must-not-project",
    "raw-password-must-not-project",
    "secret_notion_token_must_not_project",
    "provider-secret",
  ]);
});

test("secret projection rejects raw secret fields in supplied secret refs", () => {
  const buildSecretCapabilityProjection = requireFunction(core, "buildSecretCapabilityProjection");

  const projection = buildSecretCapabilityProjection({
    secret_refs: [
      {
        id: "hypo-claw-api",
        provider: "hypo-claw",
        kind: "service_api",
        capabilities: ["notify.task_complete", "status.read"],
        allowed_for: ["completion_notify", "status_read"],
        health: { status: "degraded", checked_at: "2026-05-19T15:41:00+08:00" },
        secret_ref: {
          store_ref: "local_secret:hypo-claw-api",
          value: "raw-ref-value-must-not-project",
          authorization: "Bearer raw-ref-token",
        },
      },
    ],
  });

  const ref = projection.secret_refs.find((item) => item.id === "hypo-claw-api");
  assert.equal(ref.provider, "hypo-claw");
  assert.deepEqual(ref.allowed_for, ["completion_notify", "status_read"]);
  assert.equal(ref.secret_ref.store_ref, "local_secret:hypo-claw-api");
  assert.equal(ref.secret_ref.metadata_only, true);
  assertNoForbiddenKeys(projection, ["raw_value", "value", "token", "api_key", "password", "authorization"]);
  assertNoRawMarkers(projection, ["raw-ref-value-must-not-project", "raw-ref-token"]);
});

function requireFunction(moduleNamespace, name) {
  assert.equal(typeof moduleNamespace[name], "function", `${name} must be exported`);
  return moduleNamespace[name];
}

function assertNoForbiddenKeys(value, keys) {
  const forbidden = new Set(keys.map((key) => key.toLowerCase()));
  const found = [];
  visit(value, (key) => {
    if (forbidden.has(String(key).toLowerCase())) found.push(key);
  });
  assert.deepEqual(found, []);
}

function assertNoRawMarkers(value, markers) {
  const serialized = JSON.stringify(value);
  for (const marker of markers) {
    assert.doesNotMatch(serialized, new RegExp(escapeRegExp(marker), "i"));
  }
}

function visit(value, onKey) {
  if (Array.isArray(value)) {
    for (const item of value) visit(item, onKey);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    onKey(key);
    visit(child, onKey);
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
