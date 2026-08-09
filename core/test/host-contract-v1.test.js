import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CANONICAL_COMMANDS } from "../src/commands/index.js";

const ROOT = resolve(import.meta.dirname, "../..");
const CONTRACT_ROOT = join(ROOT, "contracts", "host", "v1");
const FIXTURES = join(CONTRACT_ROOT, "fixtures");
async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function loadHostContract() {
  return import(pathToFileURL(join(ROOT, "core", "src", "host-contract", "index.js")));
}

test("Host Contract command manifest matches the authoritative public command registry", async () => {
  const commands = await readJson(join(CONTRACT_ROOT, "command-manifest.json"));

  assert.equal(commands.schema_version, "1");
  assert.equal(commands.contract_version, "1");
  assert.deepEqual(
    commands.commands.map((entry) => entry.name).sort(),
    CANONICAL_COMMANDS.map((entry) => entry.canonical.slice(1)).sort(),
  );
  assert.ok(commands.commands.every((entry) => entry.slash === `/${entry.name}`));
  assert.ok(commands.commands.every((entry) => entry.skill === `hypo-workflow:${entry.name.slice(3)}`));
});

test("release manifest schema accepts SemVer build metadata used for Codex cache identity", async () => {
  const schema = await readJson(join(CONTRACT_ROOT, "release-manifest.schema.json"));
  const versionPattern = new RegExp(schema.properties.release.properties.version.pattern);
  const pathPattern = new RegExp(schema.$defs.file.properties.path.pattern);

  assert.match("1.2.3-alpha.4+codex.20260809052356", versionPattern);
  assert.doesNotMatch("1.2-alpha.4+codex.20260809052356", versionPattern);
  assert.match("dist/hypo-workflow-1.2.3-alpha.4+codex.20260809052356-portable.zip", pathPattern);
  assert.doesNotMatch("../dist/plugin.zip", pathPattern);
});

test("Host Contract projection accepts current and explicitly invalidated lifecycle states", async () => {
  const { HOST_STATUS_RELATIVE_PATH, parseHostStatusProjection } = await loadHostContract();
  assert.equal(typeof parseHostStatusProjection, "function");
  assert.equal(HOST_STATUS_RELATIVE_PATH, ".pipeline/runtime/host-status-v1.json");

  const current = parseHostStatusProjection(await readJson(join(FIXTURES, "host-status.current.json")));
  assert.equal(current.projection_status, "current");
  assert.equal(current.generation, 7);
  assert.equal(current.delivery.id, "g22-vsp-distribution-contract");

  const invalidated = parseHostStatusProjection(await readJson(join(FIXTURES, "host-status.invalidated.json")));
  assert.equal(invalidated.projection_status, "invalidated");
  assert.equal(invalidated.generation, 8);
  assert.equal(invalidated.delivery, null);
  assert.equal(invalidated.invalidation.reason, "authority_transaction_failed");
});

test("Host Contract projection rejects secrets and unknown private runtime fields", async () => {
  const { parseHostStatusProjection } = await loadHostContract();
  const polluted = await readJson(join(FIXTURES, "host-status.secret-rejected.json"));

  assert.throws(
    () => parseHostStatusProjection(polluted),
    /secret|sensitive|unknown|additional|api_key/i,
  );
});

test("projection invalidation is monotonic and clears host-visible state", async () => {
  const { invalidateHostStatusProjection } = await loadHostContract();
  assert.equal(typeof invalidateHostStatusProjection, "function");
  const current = await readJson(join(FIXTURES, "host-status.current.json"));

  const invalidated = invalidateHostStatusProjection(current, {
    invalidated_at: "2026-07-12T12:06:00.000Z",
    reason: "authority_transaction_failed",
  });

  assert.equal(invalidated.projection_status, "invalidated");
  assert.equal(invalidated.generation, current.generation + 1);
  assert.equal(invalidated.workspace, null);
  assert.equal(invalidated.delivery, null);
  assert.equal(invalidated.continuation, null);
});

test("portable bundle verification accepts the fixture and rejects tampering", async () => {
  const { verifyPortableBundle } = await loadHostContract();
  assert.equal(typeof verifyPortableBundle, "function");
  const bundleRoot = join(FIXTURES, "bundle");
  const manifest = await readJson(join(bundleRoot, "bundle-manifest.json"));

  const verified = await verifyPortableBundle({ root: bundleRoot, manifest });
  assert.deepEqual(verified.files, ["payload/SKILL.md"]);

  const scratch = await mkdtemp(join(tmpdir(), "hypo-host-contract-"));
  try {
    await writeFile(join(scratch, "SKILL.md"), "tampered\n", "utf8");
    await assert.rejects(
      verifyPortableBundle({
        root: scratch,
        manifest: {
          ...manifest,
          files: [{ ...manifest.files[0], path: "SKILL.md" }],
        },
      }),
      /checksum|sha256|integrity/i,
    );
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
