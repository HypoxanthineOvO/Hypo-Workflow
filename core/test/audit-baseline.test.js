import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const REQUIRED_AUDIT_CATEGORIES = [
  "hardcoded_paths",
  "duplicate_helpers",
  "workspace_imports",
  "yaml_parsers",
  "ledger_rewrites",
  "barrel_exports",
];

test("repository root exposes npm test as the canonical test entry", async () => {
  const rootPackagePath = "package.json";

  await assert.doesNotReject(
    () => access(rootPackagePath),
    "repository root must contain package.json so `npm test` works from the root",
  );

  const rootPackage = JSON.parse(await readFile(rootPackagePath, "utf8"));
  assert.equal(rootPackage.private, true, "root package should be private and minimal");
  assert.equal(typeof rootPackage.scripts?.test, "string", "root package must define scripts.test");
  assert.match(rootPackage.scripts.test, /\b(core|node --test)\b/);
});

test("C17 audit inventory exposes baseline categories for debt closure tracking", async () => {
  const core = await import("../src/index.js");
  const inventoryBuilder = core.buildAuditInventory || core.auditInventory;

  assert.equal(
    typeof inventoryBuilder,
    "function",
    "core must export buildAuditInventory() or auditInventory() for C17 baseline tracking",
  );

  const inventory = await inventoryBuilder({ cwd: process.cwd() });

  assertInventoryShape(inventory);
  for (const category of REQUIRED_AUDIT_CATEGORIES) {
    assert.ok(
      Object.hasOwn(inventory.categories, category),
      `audit inventory must include ${category}`,
    );
    assertAuditCategory(inventory.categories[category], category);
  }
});

function assertInventoryShape(inventory) {
  assert.equal(typeof inventory, "object");
  assert.equal(inventory.schema_version, 1);
  assert.equal(typeof inventory.generated_at, "string");
  assert.equal(typeof inventory.categories, "object");
}

function assertAuditCategory(value, category) {
  if (Array.isArray(value)) {
    assert.ok(value.every((entry) => typeof entry === "object"), `${category} entries must be objects`);
    return;
  }

  assert.equal(typeof value, "object", `${category} must be an object or entry array`);
  assert.equal(typeof value.count, "number", `${category}.count must be numeric`);
  assert.ok(Array.isArray(value.entries), `${category}.entries must be an array`);
}
