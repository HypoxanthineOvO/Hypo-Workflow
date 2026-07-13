import test from "node:test";
import assert from "node:assert/strict";
import { readFile, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseYaml } from "../src/index.js";
import {
  copyFixture,
  exists,
  snapshotTree,
  temporaryDirectory,
  writeText,
} from "./fixtures/c21-m4/helpers.js";

const INSPECTOR_PROBE = await import("../src/migration/legacy-inspector.js")
  .then((api) => ({ api, error: null }))
  .catch((error) => ({ api: null, error }));
const INIT_PROBE = await import("../src/init/index.js")
  .then((api) => ({ api, error: null }))
  .catch((error) => ({ api: null, error }));
const HAS_INSPECTOR = !INSPECTOR_PROBE.error && typeof INSPECTOR_PROBE.api?.inspectLegacyWorkspace === "function";
const HAS_INIT = !INIT_PROBE.error && typeof INIT_PROBE.api?.initializeWorkspace === "function";

function inspectorBehavior(name, fn) {
  return test(name, {
    skip: HAS_INSPECTOR ? false : "core/src/migration/legacy-inspector.js inspectLegacyWorkspace API is not implemented",
  }, fn);
}

function legacyInitBehavior(name, fn) {
  return test(name, {
    skip: HAS_INSPECTOR && HAS_INIT ? false : "legacy inspector and initializeWorkspace APIs are not both implemented",
  }, fn);
}

test("M4 publishes a focused read-only legacy inspector", () => {
  if (INSPECTOR_PROBE.error) {
    assert.fail(`core/src/migration/legacy-inspector.js must exist and import cleanly: ${INSPECTOR_PROBE.error.code || INSPECTOR_PROBE.error.message}`);
  }
  assert.equal(typeof INSPECTOR_PROBE.api.inspectLegacyWorkspace, "function");
});

inspectorBehavior("legacy inspection parses only present raw evidence and preserves every byte and mtime", async (t) => {
  const root = await temporaryDirectory(t, "hw-m4-legacy-inspect-");
  await copyFixture("legacy", root);
  const before = await snapshotTree(root);

  const inspection = await INSPECTOR_PROBE.api.inspectLegacyWorkspace(root);
  assert.equal(inspection.classification, "legacy");
  assert.equal(inspection.read_only, true);
  assert.ok(Array.isArray(inspection.sources));

  const required = [
    ["state", ".pipeline/state.yaml"],
    ["cycle", ".pipeline/cycle.yaml"],
    ["config", ".pipeline/config.yaml"],
    ["continuation", ".pipeline/continuation.yaml"],
    ["log", ".pipeline/log.yaml"],
  ];
  for (const [kind, path] of required) {
    const source = inspection.sources.find((entry) => entry.kind === kind);
    assert.ok(source, `missing ${kind} legacy evidence`);
    assert.equal(source.path, path);
    assert.deepEqual(source.document, parseYaml(await readFile(join(root, path), "utf8")));
    assert.match(source.sha256, /^[a-f0-9]{64}$/);
  }

  const config = inspection.sources.find((entry) => entry.kind === "config").document;
  assert.deepEqual(config, { output: { language: "zh-CN" } });
  assert.equal(Object.hasOwn(config, "execution"), false);
  assert.equal(Object.hasOwn(config, "automation"), false);
  assert.equal(Object.hasOwn(config.output, "timezone"), false);

  assert.equal(inspection.summary.current_phase, "executing");
  assert.equal(inspection.summary.active_cycle, 7);
  assert.equal(inspection.summary.safe_resume_command, "/hw:resume");
  assert.equal(inspection.summary.log_events, 1);
  assert.deepEqual(await snapshotTree(root), before);
});

legacyInitBehavior("Init reports a legacy workspace through the inspector with zero migration writes", async (t) => {
  const root = await temporaryDirectory(t, "hw-m4-legacy-init-");
  await copyFixture("legacy", root);
  const before = await snapshotTree(root);

  const result = await INIT_PROBE.api.initializeWorkspace(root, {
    intent: "Adopt this project without silently migrating its old Workflow history.",
  });
  assert.equal(result.status, "legacy_detected");
  assert.equal(result.classification, "legacy");
  assert.equal(result.inspection.read_only, true);
  assert.ok(result.inspection.sources.some((entry) => entry.path === ".pipeline/state.yaml"));
  assert.deepEqual(await snapshotTree(root), before);
  assert.equal(await exists(join(root, ".pipeline", "manifest.yaml")), false);
  for (const zone of ["runtime", "memory", "snapshots"]) {
    assert.equal(await exists(join(root, ".pipeline", zone)), false, `legacy Init must not create ${zone}`);
  }
});

inspectorBehavior("legacy inspection rejects symlinked evidence without reading or changing the external target", async (t) => {
  const root = await temporaryDirectory(t, "hw-m4-legacy-symlink-root-");
  const external = await temporaryDirectory(t, "hw-m4-legacy-symlink-target-");
  await writeText(root, ".pipeline/config.yaml", "output:\n  language: zh-CN\n");
  await writeFile(join(external, "state.yaml"), "current:\n  phase: external-secret\n", "utf8");
  await symlink(join(external, "state.yaml"), join(root, ".pipeline", "state.yaml"));
  const rootBefore = await snapshotTree(root);
  const externalBefore = await snapshotTree(external);

  await assert.rejects(
    INSPECTOR_PROBE.api.inspectLegacyWorkspace(root),
    /symbolic link|symlink|forbidden|regular file|escape|path/i,
  );
  assert.deepEqual(await snapshotTree(root), rootBefore);
  assert.deepEqual(await snapshotTree(external), externalBefore);
});

inspectorBehavior("legacy inspection reports malformed evidence without manufacturing default-filled authority", async (t) => {
  const root = await temporaryDirectory(t, "hw-m4-legacy-malformed-");
  await writeText(root, ".pipeline/state.yaml", "current: [unterminated\n");
  await writeText(root, ".pipeline/cycle.yaml", "cycle:\n  number: 4\n  status: active\n");
  const before = await snapshotTree(root);

  const inspection = await INSPECTOR_PROBE.api.inspectLegacyWorkspace(root);
  assert.equal(inspection.classification, "legacy");
  const state = inspection.sources.find((entry) => entry.kind === "state");
  assert.equal(state.status, "unreadable");
  assert.equal(Object.hasOwn(state, "document"), false);
  assert.match(state.error.code, /^ERR_LEGACY_/);
  assert.doesNotMatch(JSON.stringify(inspection), /built_in_default|DEFAULT_GLOBAL_CONFIG|automation:\s*balanced/i);
  assert.deepEqual(await snapshotTree(root), before);
});

inspectorBehavior("direct legacy inspection rejects a symlinked .pipeline ancestor for empty and populated targets", async (t) => {
  const cases = [
    {
      label: "empty-external-pipeline",
      async populate() {},
    },
    {
      label: "external-pipeline-with-legacy-and-internal-leaves",
      async populate(external) {
        await writeText(external, "state.yaml", "current:\n  phase: executing\n");
        await writeText(external, "config.yaml", "output:\n  language: zh-CN\n");
        await writeText(external, "continuation.yaml", "status: active\nsafe_resume_command: /hw:resume\n");
        await writeText(external, "runtime/internal.yaml", "authority: external\n");
      },
    },
  ];

  for (const entry of cases) {
    await t.test(entry.label, async (subtest) => {
      const root = await temporaryDirectory(subtest, `hw-m4-legacy-ancestor-${entry.label}-`);
      const external = await temporaryDirectory(subtest, `hw-m4-legacy-ancestor-target-${entry.label}-`);
      await entry.populate(external);
      await symlink(external, join(root, ".pipeline"), "dir");
      const rootBefore = await snapshotTree(root);
      const externalBefore = await snapshotTree(external);

      await assert.rejects(
        INSPECTOR_PROBE.api.inspectLegacyWorkspace(root),
        /symbolic link|symlink|pipeline|root|forbidden|outside the workspace/i,
      );
      assert.deepEqual(await snapshotTree(root), rootBefore);
      assert.deepEqual(await snapshotTree(external), externalBefore);
    });
  }
});

inspectorBehavior("legacy inspection tolerates missing optional evidence leaves without creating defaults", async (t) => {
  const root = await temporaryDirectory(t, "hw-m4-legacy-missing-optional-");
  await writeText(root, ".pipeline/state.yaml", "current:\n  phase: planning\n");
  await writeText(root, ".pipeline/cycle.yaml", "cycle:\n  number: 9\n  status: active\n");
  const before = await snapshotTree(root);

  const inspection = await INSPECTOR_PROBE.api.inspectLegacyWorkspace(root);
  assert.equal(inspection.classification, "legacy");
  assert.equal(inspection.read_only, true);
  assert.deepEqual(inspection.sources.map((source) => source.kind).sort(), ["cycle", "state"]);
  assert.equal(inspection.summary.current_phase, "planning");
  assert.equal(inspection.summary.active_cycle, 9);
  assert.equal(Object.hasOwn(inspection.summary, "log_events"), false);
  assert.deepEqual(await snapshotTree(root), before);
});
