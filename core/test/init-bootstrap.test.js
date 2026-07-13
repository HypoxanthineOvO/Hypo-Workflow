import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  detectWorkspaceFormat,
  parseYaml,
  readActivePointer,
  readContextCapsule,
  readRecord,
  readRuntimeObject,
  recoverWorkspaceTransaction,
  validateWorkspaceManifest,
} from "../src/index.js";
import {
  copyFixture,
  exists,
  listFiles,
  snapshotTree,
  temporaryDirectory,
  writeText,
} from "./fixtures/c21-m4/helpers.js";

const INIT_MODULE_URL = new URL("../src/init/index.js", import.meta.url).href;
const INIT_PROBE = await import(INIT_MODULE_URL)
  .then((api) => ({ api, error: null }))
  .catch((error) => ({ api: null, error }));
const ROOT_API = await import("../src/index.js");
const HAS_INIT_API = !INIT_PROBE.error && typeof INIT_PROBE.api?.initializeWorkspace === "function";

function initBehavior(name, fn) {
  return test(name, { skip: HAS_INIT_API ? false : "core/src/init/index.js initializeWorkspace API is not implemented" }, fn);
}

test("M4 publishes initializeWorkspace from its focused module and the Core root", () => {
  if (INIT_PROBE.error) {
    assert.fail(`core/src/init/index.js must exist and import cleanly: ${INIT_PROBE.error.code || INIT_PROBE.error.message}`);
  }
  assert.equal(typeof INIT_PROBE.api.initializeWorkspace, "function");
  assert.equal(typeof ROOT_API.initializeWorkspace, "function");
});

initBehavior("empty repo Init transaction creates valid current authority and derived recovery context", async (t) => {
  const root = await temporaryDirectory(t, "hw-m4-init-empty-");
  const intent = "Build a small queue API with a health endpoint and Node tests.";
  const result = await initialize(root, {
    intent,
    project_id: "queue-api",
    workspace_id: "queue-api-local",
  }, { id: "m4-init-empty" });

  assert.equal(result.status, "initialized");
  assert.equal(result.classification, "empty");
  assert.equal(result.initial_snapshot, null, "bootstrap_job has no M2 delivery Snapshot until a Goal or Cycle exists");
  assert.deepEqual(Object.keys(result.bootstrap.object_ref).sort(), ["id", "kind"]);
  assert.equal(result.bootstrap.object_ref.kind, "bootstrap_job");

  const manifest = validateWorkspaceManifest(parseYaml(
    await readFile(join(root, ".pipeline", "manifest.yaml"), "utf8"),
  ));
  assert.equal(manifest.project_id, "queue-api");
  assert.equal(manifest.workspace_id, "queue-api-local");
  assert.deepEqual(result.manifest, manifest);
  assert.equal((await detectWorkspaceFormat(root)).kind, "current");

  const active = await readActivePointer(root);
  assert.deepEqual(active.active, { bootstrap_job: result.bootstrap.object_ref });
  const runtime = await readRuntimeObject(root, result.bootstrap.object_ref);
  assert.deepEqual(runtime.object_ref, result.bootstrap.object_ref);
  assert.equal(typeof runtime.runtime.status, "string");
  assert.equal(typeof runtime.continuation.next_action, "string");

  assert.ok(Array.isArray(result.records) && result.records.length >= 2, "Init must persist intent and Adoption Brief Records");
  const persistedRecords = [];
  for (const ref of result.records) {
    assert.deepEqual(Object.keys(ref).sort(), ["id", "kind", "path"]);
    const record = await readRecord(root, ref.id);
    assert.equal(record.path, ref.path);
    assert.equal(record.attributes.kind, ref.kind);
    persistedRecords.push(record);
  }
  const projectIntent = persistedRecords.find((record) => record.attributes.dedupe_key === "project_intent");
  assert.ok(projectIntent, "Init must persist one Project Intent Record");
  assert.equal(projectIntent.attributes.kind, "requirement");
  assert.ok(projectIntent.body.includes(intent));

  const adoptionRecord = persistedRecords.find((record) => record.attributes.dedupe_key === "adoption_brief");
  assert.ok(adoptionRecord, "Init must persist one Adoption Brief Record");
  assert.equal(adoptionRecord.attributes.kind, "decision");
  assert.equal(result.adoption_brief.record_id, adoptionRecord.attributes.id);
  for (const fact of result.adoption_brief.facts) {
    assert.ok(adoptionRecord.body.includes(fact.statement), `Adoption Record omitted fact: ${fact.statement}`);
  }

  const capsule = await readContextCapsule(root, result.bootstrap.object_ref);
  assert.equal(capsule.authority_role, "derived");
  assert.deepEqual(capsule.object_ref, result.bootstrap.object_ref);
  assert.equal(result.bootstrap.capsule_path, `.pipeline/memory/capsules/bootstrap_job/${result.bootstrap.object_ref.id}.yaml`);

  const files = await listFiles(root);
  for (const legacyAuthority of [
    ".pipeline/config.yaml",
    ".pipeline/state.yaml",
    ".pipeline/cycle.yaml",
    ".pipeline/continuation.yaml",
    ".pipeline/log.yaml",
    ".pipeline/knowledge/index.yaml",
  ]) {
    assert.equal(files.includes(legacyAuthority), false, `Init must not create legacy authority ${legacyAuthority}`);
  }
  assert.equal(files.some((path) => /(?:^|\/)(?:\.opencode|\.claude|\.cursor)(?:\/|$)/.test(path)), false);
});

initBehavior("brownfield Init preserves source files and emits traceable, confidence-bounded Adoption facts", async (t) => {
  const root = await temporaryDirectory(t, "hw-m4-init-brownfield-");
  await copyFixture("brownfield", root);
  const sourceBefore = await snapshotTree(root, { exclude: [".pipeline"] });

  const result = await initialize(root, {
    intent: "Adopt the existing service and make its current architecture explicit before planning changes.",
  }, { id: "m4-init-brownfield" });

  assert.equal(result.status, "initialized");
  assert.equal(result.classification, "unmanaged_brownfield");
  assert.equal(result.initial_snapshot, null, "brownfield evidence remains in Records until a delivery checkpoint exists");
  assert.equal(result.manifest.project_id, "m4-brownfield-service");
  assert.deepEqual(await snapshotTree(root, { exclude: [".pipeline"] }), sourceBefore);

  const brief = result.adoption_brief;
  assert.ok(Array.isArray(brief.facts) && brief.facts.length >= 2);
  const referenced = new Set();
  for (const fact of brief.facts) {
    assert.equal(typeof fact.statement, "string");
    assert.ok(["observed", "inferred"].includes(fact.basis));
    assert.ok(
      ["low", "medium", "high", "confirmed"].includes(fact.confidence)
        || (typeof fact.confidence === "number" && fact.confidence >= 0 && fact.confidence <= 1),
    );
    if (fact.basis === "inferred") assert.notEqual(fact.confidence, "confirmed");
    assert.ok(Array.isArray(fact.source_refs) && fact.source_refs.length > 0);
    for (const sourceRef of fact.source_refs) {
      assert.deepEqual(Object.keys(sourceRef).sort(), ["locator", "ref", "type"]);
      assert.equal(await exists(join(root, sourceRef.locator)), true, `missing Adoption source ${sourceRef.locator}`);
      assert.equal(sourceRef.locator.startsWith(".pipeline/"), false);
      referenced.add(sourceRef.locator);
    }
  }
  assert.ok(referenced.has("package.json"));
  assert.ok(referenced.has("src/server.js"));

  const adoptionRecord = await readRecord(root, brief.record_id);
  assert.equal(adoptionRecord.attributes.kind, "decision");
  assert.equal(adoptionRecord.attributes.dedupe_key, "adoption_brief");
  const adoptionRef = result.records.find((entry) => entry.id === brief.record_id);
  assert.ok(adoptionRef, "Adoption Brief Record must be present in result.records");
  assert.equal(adoptionRef.kind, adoptionRecord.attributes.kind);
  assert.equal(adoptionRef.path, adoptionRecord.path);
  for (const fact of brief.facts) {
    assert.ok(adoptionRecord.body.includes(fact.statement), `Adoption Record omitted fact: ${fact.statement}`);
  }
  assert.doesNotMatch(
    adoptionRecord.body,
    /\b(?:Next\.js|Python|Django|PostgreSQL|monorepo|Kubernetes)\b/i,
    "Adoption Brief must not promote unsupported guesses to facts",
  );
  assert.doesNotMatch(JSON.stringify(brief), /chain[_ -]?of[_ -]?thought|hidden[_ -]?reasoning|private[_ -]?reasoning/i);
});

initBehavior("brownfield metadata rejects sensitive basenames and hidden-reasoning keys before any write", async (t) => {
  const cases = [
    {
      label: "secret-like-basename",
      async setup(root) {
        const basename = `${sensitiveFixtureValue("password")}.md`;
        await writeText(root, join("src", basename), "Synthetic fixture metadata only.\n");
        return [basename];
      },
    },
    {
      label: "hidden-reasoning-basename",
      async setup(root) {
        const basename = `${["chain", "of", "thought"].join("_")}.md`;
        await writeText(root, join("src", basename), "Public project note with an unsafe metadata name.\n");
        return [basename];
      },
    },
    {
      label: "hidden-reasoning-package-key",
      async setup(root) {
        const key = ["hidden", "reasoning"].join("_");
        const value = sensitiveFixtureValue("metadata");
        const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
        packageJson[key] = value;
        await writeText(root, "package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
        return [key, value];
      },
    },
  ];

  for (const entry of cases) {
    await t.test(entry.label, async (subtest) => {
      const root = await temporaryDirectory(subtest, `hw-m4-brownfield-sensitive-${entry.label}-`);
      await copyFixture("brownfield", root);
      const sensitiveValues = await entry.setup(root);
      await expectSanitizedZeroWriteRejection(
        root,
        () => initialize(root, {
          intent: "Adopt this project only if its repository metadata is safe to persist.",
        }, { id: `m4-brownfield-sensitive-${entry.label}` }),
        sensitiveValues,
        /metadata|sensitive|secret|reasoning|unsafe|input/i,
      );
    });
  }
});

initBehavior("unknown Init request keys reject without echoing sensitive or ordinary untrusted metadata", async (t) => {
  const cases = [
    {
      label: "sensitive-key",
      key: ["hidden", "reasoning"].join("_"),
      value: sensitiveFixtureValue("request"),
      pattern: /reasoning|sensitive|metadata|input|schema|unsupported/i,
    },
    {
      label: "ordinary-unknown-key",
      key: ["future", "adapter", "hint"].join("_"),
      value: ["ordinary", "untrusted", "value"].join("-"),
      pattern: /input|request|schema|unsupported|field/i,
    },
  ];

  for (const entry of cases) {
    await t.test(entry.label, async (subtest) => {
      const root = await temporaryDirectory(subtest, `hw-m4-init-unknown-${entry.label}-`);
      await expectSanitizedZeroWriteRejection(
        root,
        () => initialize(root, {
          intent: "Create a project from a schema-checked request.",
          [entry.key]: entry.value,
        }, { id: `m4-init-unknown-${entry.label}` }),
        [entry.key, entry.value],
        entry.pattern,
      );
    });
  }
});

initBehavior("brownfield scan accepts ordinary security and reasoning documentation filenames", async (t) => {
  const root = await temporaryDirectory(t, "hw-m4-brownfield-legal-metadata-");
  await copyFixture("brownfield", root);
  await writeText(root, "src/password-policy.md", "# Password Policy\n\nNo credential values are stored in this document.\n");
  await writeText(root, "src/reasoning-summary.md", "# Decision Summary\n\nThis is a public architecture summary.\n");
  const unscannedBasenames = [
    `${sensitiveFixtureValue("password")}.md`,
    `${["hidden", "reasoning"].join("_")}.md`,
  ];
  for (const basename of unscannedBasenames) {
    await writeText(root, join("notes", basename), "Metadata outside the bounded adoption scan.\n");
  }
  const sourceBefore = await snapshotTree(root, { exclude: [".pipeline"] });

  const result = await initialize(root, {
    intent: "Adopt the existing service and retain its public security documentation.",
  }, { id: "m4-brownfield-legal-metadata" });

  assert.equal(result.status, "initialized");
  assert.equal(result.classification, "unmanaged_brownfield");
  assert.ok(result.adoption_brief.facts.length >= 2);
  assert.deepEqual(await snapshotTree(root, { exclude: [".pipeline"] }), sourceBefore);

  const persistedSurfaces = [JSON.stringify(result)];
  for (const ref of result.records) persistedSurfaces.push(JSON.stringify(await readRecord(root, ref.id)));
  persistedSurfaces.push(JSON.stringify(await readContextCapsule(root, result.bootstrap.object_ref)));
  if (await exists(join(root, ".pipeline", "memory", "index.yaml"))) {
    persistedSurfaces.push(await readFile(join(root, ".pipeline", "memory", "index.yaml"), "utf8"));
  }
  for (const basename of unscannedBasenames) {
    assert.equal(
      persistedSurfaces.some((surface) => surface.includes(basename)),
      false,
      "metadata outside the bounded scan must not enter return, Record, index, or Capsule projections",
    );
  }
});

initBehavior("no-input Init returns one explicit outcome Ask contract and performs zero writes", async (t) => {
  const root = await temporaryDirectory(t, "hw-m4-init-ask-");
  const before = await snapshotTree(root);
  const result = await initialize(root, {});

  assert.equal(result.status, "needs_input");
  assert.equal(result.classification, "empty");
  for (const key of ["id", "kind", "prompt", "required"]) assert.ok(Object.hasOwn(result.ask, key));
  assert.equal(result.ask.kind, "question");
  assert.equal(result.ask.id, "init_outcome");
  assert.equal(result.ask.required, true);
  assert.match(result.ask.prompt, /outcome|intent|目标|想做|结果/i);
  assert.doesNotMatch(JSON.stringify(result), /min_rounds|initialized successfully|初始化完成/i);
  assert.deepEqual(await snapshotTree(root), before);
});

initBehavior("repeated, damaged, and mixed current workspaces have distinct fail-closed behavior", async (t) => {
  const current = await temporaryDirectory(t, "hw-m4-init-repeat-");
  const first = await initialize(current, {
    intent: "Create a deterministic command-line formatter.",
    project_id: "formatter",
    workspace_id: "formatter-local",
  }, { id: "m4-init-repeat-first" });
  const currentBefore = await snapshotTree(current);
  const repeated = await initialize(current, { intent: "Do not replace existing authority." });
  assert.equal(repeated.status, "already_initialized");
  assert.equal(repeated.classification, "current");
  assert.deepEqual(repeated.manifest, first.manifest);
  assert.deepEqual(await snapshotTree(current), currentBefore);

  const mixed = await temporaryDirectory(t, "hw-m4-init-mixed-");
  await initialize(mixed, {
    intent: "Create a current workspace before residue is introduced.",
    project_id: "mixed-fixture",
    workspace_id: "mixed-fixture-local",
  }, { id: "m4-init-mixed-first" });
  await writeText(mixed, ".pipeline/config.yaml", "output:\n  language: zh-CN\n");
  const mixedBefore = await snapshotTree(mixed);
  const mixedResult = await initialize(mixed, { intent: "Never fall back to a legacy writer." });
  assert.equal(mixedResult.status, "already_initialized_with_legacy_residue");
  assert.equal(mixedResult.classification, "mixed_current_with_legacy_residue");
  assert.deepEqual(await snapshotTree(mixed), mixedBefore);

  const damaged = await temporaryDirectory(t, "hw-m4-init-damaged-");
  await writeText(damaged, ".pipeline/manifest.yaml", "format: hypo-workflow\nschema_version: broken\n");
  const damagedBefore = await snapshotTree(damaged);
  await assert.rejects(
    initialize(damaged, { intent: "Do not use legacy fallback." }),
    (error) => error?.code === "ERR_INIT_WORKSPACE_DAMAGED" && /repair|manifest|修复/i.test(error.message),
  );
  assert.deepEqual(await snapshotTree(damaged), damagedBefore);
});

initBehavior("Init validates traversal, secret-like input, and hidden reasoning before creating authority", async (t) => {
  const cases = [
    {
      request: { intent: "Build a safe app.", project_id: "../escape", workspace_id: "safe-local" },
      pattern: /project|identifier|path|safe|traversal/i,
    },
    {
      request: { intent: `Build a safe app with ${"M4-password-" + "seed-9zQ4vN2xL7kP"}.` },
      pattern: /secret|sensitive|credential|intent/i,
      sensitive: "M4-password-seed-9zQ4vN2xL7kP",
    },
    {
      request: { intent: "Build a safe app.", chain_of_thought: "private deliberation must not persist" },
      pattern: /reasoning|field|schema|input/i,
    },
  ];

  for (const [index, entry] of cases.entries()) {
    const root = await temporaryDirectory(t, `hw-m4-init-invalid-${index}-`);
    const before = await snapshotTree(root);
    let caught;
    try {
      await initialize(root, entry.request, { id: `m4-init-invalid-${index}` });
    } catch (error) {
      caught = error;
    }
    assert.ok(caught, `invalid case ${index} must reject`);
    assert.match(String(caught.message), entry.pattern);
    if (entry.sensitive) assert.equal(String(caught.message).includes(entry.sensitive), false, "errors must not echo sensitive input");
    assert.deepEqual(await snapshotTree(root), before);
  }
});

initBehavior("Init rejects a symlinked .pipeline escape without touching the external target", async (t) => {
  const root = await temporaryDirectory(t, "hw-m4-init-symlink-root-");
  const external = await temporaryDirectory(t, "hw-m4-init-symlink-target-");
  await writeFile(join(external, "sentinel.txt"), "outside stays unchanged\n", "utf8");
  await symlink(external, join(root, ".pipeline"));
  const rootBefore = await snapshotTree(root);
  const externalBefore = await snapshotTree(external);

  await assert.rejects(
    initialize(root, {
      intent: "Build a project without following workspace symlinks.",
      project_id: "symlink-project",
      workspace_id: "symlink-project-local",
    }, { id: "m4-init-symlink" }),
    /symlink|forbidden|escape|path/i,
  );
  assert.deepEqual(await snapshotTree(root), rootBefore);
  assert.deepEqual(await snapshotTree(external), externalBefore);
});

initBehavior("interrupted Init uses the M1 prepared transaction and recovers to zero authority", async (t) => {
  const root = await temporaryDirectory(t, "hw-m4-init-fault-");
  const before = await snapshotTree(root);
  const transactionId = "m4-init-after-prepare";

  await assert.rejects(
    initialize(root, {
      intent: "Build a recoverable project bootstrap.",
      project_id: "recoverable-bootstrap",
      workspace_id: "recoverable-bootstrap-local",
    }, {
      id: transactionId,
      faultInjector: async ({ phase }) => {
        if (phase === "after_prepare") throw new Error("injected M4 Init interruption");
      },
    }),
    /injected M4 Init interruption/,
  );

  assert.equal(await exists(join(root, ".pipeline", "manifest.yaml")), false);
  assert.equal(
    await exists(join(root, ".pipeline", "runtime", "transactions", transactionId, "transaction.yaml")),
    true,
  );
  assert.equal((await recoverWorkspaceTransaction(root, { id: transactionId })).action, "rolled_back");
  assert.deepEqual(await snapshotTree(root), before);
});

initBehavior("isolated Init does not write Setup, global registry, adapter, or legacy authority surfaces", async (t) => {
  const root = await temporaryDirectory(t, "hw-m4-init-isolated-root-");
  const home = await temporaryDirectory(t, "hw-m4-init-isolated-home-");
  const script = [
    `const { initializeWorkspace } = await import(${JSON.stringify(INIT_MODULE_URL)});`,
    "const result = await initializeWorkspace(process.env.HW_M4_ROOT, {",
    "  intent: 'Build an isolated bootstrap fixture.',",
    "  project_id: 'isolated-bootstrap',",
    "  workspace_id: 'isolated-bootstrap-local',",
    "}, { id: 'm4-init-isolated' });",
    "process.stdout.write(JSON.stringify(result));",
  ].join("\n");
  const child = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, HOME: home, HW_M4_ROOT: root },
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(JSON.parse(child.stdout).status, "initialized");
  assert.deepEqual(await listFiles(home), []);

  const files = await listFiles(root);
  assert.equal(files.some((path) => path === "AGENTS.md" || path === "opencode.json"), false);
  assert.equal(files.some((path) => /^(?:\.claude|\.opencode|\.cursor|\.codex)(?:\/|$)/.test(path)), false);
  assert.equal(files.some((path) => /^\.pipeline\/(?:config|state|cycle|log|rules)\.yaml$/.test(path)), false);
});

async function initialize(root, request, options) {
  if (!HAS_INIT_API) throw INIT_PROBE.error || new Error("initializeWorkspace is unavailable");
  return INIT_PROBE.api.initializeWorkspace(root, request, options);
}

function sensitiveFixtureValue(label) {
  return ["m4", label, "seed", ["9zQ4", "vN2x", "L7kP"].join("")].join("-");
}

async function expectSanitizedZeroWriteRejection(root, operation, sensitiveValues, pattern) {
  const before = await snapshotTree(root);
  let result;
  let caught;
  try {
    result = await operation();
  } catch (error) {
    caught = error;
  }
  if (result !== undefined) assert.fail("unsafe metadata must reject before producing an Init result");
  assert.ok(caught, "unsafe metadata must reject");
  const message = String(caught.message || caught);
  assert.match(message, pattern);
  for (const value of sensitiveValues) {
    assert.equal(message.includes(value), false, "unsafe metadata must not be echoed in errors");
  }
  assert.deepEqual(await snapshotTree(root), before, "unsafe metadata must fail before transaction or derived writes");
}
