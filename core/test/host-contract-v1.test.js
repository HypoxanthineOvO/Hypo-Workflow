import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "../..");
const CONTRACT_ROOT = join(ROOT, "contracts", "host", "v1");
const FIXTURES = join(CONTRACT_ROOT, "fixtures");
const EXPECTED_COMMANDS = [
  "hw:accept",
  "hw:cycle",
  "hw:goal",
  "hw:guide",
  "hw:init",
  "hw:maintain",
  "hw:plan",
  "hw:reject",
  "hw:resume",
];

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function loadHostContract() {
  return import(pathToFileURL(join(ROOT, "core", "src", "host-contract", "index.js")));
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

test("Host Contract v1 publishes one release manifest and exactly nine public commands", async () => {
  const release = await readJson(join(CONTRACT_ROOT, "release-manifest.json"));
  const commands = await readJson(join(CONTRACT_ROOT, "command-manifest.json"));

  assert.equal(release.schema_version, "1");
  assert.equal(release.contract_version, "1");
  assert.match(release.release.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  assert.match(release.release.source_commit, /^[0-9a-f]{40}$/);
  assert.equal(release.command_manifest.path, "command-manifest.json");
  assert.match(release.command_manifest.sha256, /^[0-9a-f]{64}$/);
  assert.equal(
    await sha256(join(CONTRACT_ROOT, release.command_manifest.path)),
    release.command_manifest.sha256,
  );
  assert.equal(release.installed_descriptor.path, "contracts/host/v1/installed-release.json");
  assert.equal(
    await sha256(join(ROOT, release.installed_descriptor.path)),
    release.installed_descriptor.sha256,
  );
  const installed = await readJson(join(ROOT, release.installed_descriptor.path));
  assert.deepEqual(installed.release, release.release);
  assert.equal(installed.command_manifest.sha256, release.command_manifest.sha256);

  assert.equal(commands.schema_version, "1");
  assert.equal(commands.contract_version, "1");
  assert.deepEqual(commands.commands.map((entry) => entry.name).sort(), EXPECTED_COMMANDS);
  assert.ok(commands.commands.every((entry) => entry.slash === `/${entry.name}`));
  assert.ok(commands.commands.every((entry) => entry.skill === `hypo-workflow:${entry.name.slice(3)}`));
});

test("release artifacts are materialized, checksummed, and portable content matches the public surface", async () => {
  const release = await readJson(join(CONTRACT_ROOT, "release-manifest.json"));
  for (const name of ["codex_plugin", "portable_bundle"]) {
    const artifact = release.artifacts[name];
    assert.ok(artifact && typeof artifact === "object", `${name} must not be a null release placeholder`);
    assert.equal(typeof artifact.path, "string");
    assert.match(artifact.sha256, /^[0-9a-f]{64}$/);
    assert.equal(await sha256(join(ROOT, artifact.path)), artifact.sha256);
  }

  const bundle = release.artifacts.portable_bundle;
  assert.match(bundle.path, /\.zip$/);
  const listing = spawnSync("unzip", ["-Z1", join(ROOT, bundle.path)], { encoding: "utf8" });
  assert.equal(listing.status, 0, listing.stderr || "portable bundle must be a readable zip");
  const entries = listing.stdout.split("\n").filter(Boolean);
  const has = (suffix) => entries.some((entry) => entry === suffix || entry.endsWith(`/${suffix}`));

  assert.ok(has("SKILL.md"));
  assert.ok(has("bundle-manifest.json"));
  assert.ok(has("contracts/host/v1/installed-release.json"));
  assert.ok(has("hooks/hooks.json"));
  for (const command of EXPECTED_COMMANDS) {
    assert.ok(has(`skills/${command.slice(3)}/SKILL.md`), `portable bundle missing ${command}`);
  }
  for (const retired of ["start", "status", "stop", "rules", "patch", "sync", "setup"]) {
    assert.ok(!has(`skills/${retired}/SKILL.md`), `portable bundle contains retired Skill ${retired}`);
  }

  const hooksEntry = entries.find((entry) => entry === "hooks/hooks.json" || entry.endsWith("/hooks/hooks.json"));
  const hooksPayload = spawnSync("unzip", ["-p", join(ROOT, bundle.path), hooksEntry], { encoding: "utf8" });
  assert.equal(hooksPayload.status, 0, hooksPayload.stderr || "portable bundle hooks manifest must be readable");
  assert.deepEqual(Object.keys(JSON.parse(hooksPayload.stdout).hooks).sort(), [
    "PermissionRequest",
    "PostCompact",
    "PostToolUse",
    "PreCompact",
    "PreToolUse",
    "SessionStart",
    "Stop",
    "SubagentStart",
    "SubagentStop",
    "UserPromptSubmit",
  ]);

  const bundleManifestEntry = entries.find((entry) => entry === "bundle-manifest.json" || entry.endsWith("/bundle-manifest.json"));
  const bundleManifestPayload = spawnSync("unzip", ["-p", join(ROOT, bundle.path), bundleManifestEntry], { encoding: "utf8" });
  assert.equal(bundleManifestPayload.status, 0, bundleManifestPayload.stderr || "bundle manifest must be readable");
  const bundleManifest = JSON.parse(bundleManifestPayload.stdout);
  assert.equal(bundleManifest.schema_version, "1");
  assert.ok(bundleManifest.files.length > 0);
  assert.equal(new Set(bundleManifest.files.map((entry) => entry.path)).size, bundleManifest.files.length);
  assert.ok(bundleManifest.files.every((entry) => /^[a-f0-9]{64}$/.test(entry.sha256) && entry.bytes >= 0));
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
