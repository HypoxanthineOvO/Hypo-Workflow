import test from "node:test";
import assert from "node:assert/strict";
import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { createWorkspaceManifest } from "../src/manifest/index.js";
import { parseYaml, stringifyYaml } from "../src/serialization/index.js";
import { detectWorkspaceFormat } from "../src/workspace-format/index.js";
import {
  commitWorkspaceTransaction,
  recoverWorkspaceTransaction,
} from "../src/workspace-store/index.js";

const FIXED_NOW = "2026-07-11T22:45:00+08:00";
const OLD = Object.freeze({
  ".pipeline/runtime/active.txt": "old-runtime\n",
  ".pipeline/memory/context.txt": "old-memory\n",
  ".pipeline/snapshots/project/checkpoint.txt": "old-snapshot\n",
});
const NEXT = Object.freeze({
  ".pipeline/runtime/active.txt": "new-runtime\n",
  ".pipeline/memory/context.txt": "new-memory\n",
  ".pipeline/snapshots/project/checkpoint.txt": "new-snapshot\n",
});

test("workspace transaction installs allowed zones and activates manifest last", async (t) => {
  const root = await temporaryRoot(t, "hw-transaction-success-");
  await seedWorkspaceFiles(root, OLD);
  const events = [];
  const faultInjector = async (event) => {
    events.push({ ...event });
  };
  faultInjector.non_serializable_test_token = "FAULT-SEAM-MUST-NOT-PERSIST";

  const result = await commitWorkspaceTransaction(root, {
    id: "tx-success",
    writes: writeSet(NEXT),
    manifest: manifest(),
    faultInjector,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(await readWorkspaceFiles(root, Object.keys(NEXT)), NEXT);
  assert.equal((await detectWorkspaceFormat(root)).kind, "current");

  const installs = events.filter((event) => event.phase === "after_install_file");
  assert.deepEqual(installs.map((event) => event.path).sort(), Object.keys(NEXT).sort());
  const beforeActivation = events.findIndex((event) => event.phase === "before_manifest_activation");
  const afterActivation = events.findIndex((event) => event.phase === "after_manifest_activation");
  const finalInstall = Math.max(...installs.map((event) => events.indexOf(event)));
  assert.ok(beforeActivation > finalInstall, "manifest activation must follow every data-file install");
  assert.ok(afterActivation > beforeActivation, "after_manifest_activation must be the final activation checkpoint");
  assert.doesNotMatch(await allText(root), /FAULT-SEAM-MUST-NOT-PERSIST/);
});

test("recovery rolls back a crash after prepare and before install", async (t) => {
  const root = await temporaryRoot(t, "hw-transaction-after-prepare-");
  await seedWorkspaceFiles(root, OLD);

  await expectInjectedCrash(root, "tx-after-prepare", "after_prepare");
  assert.deepEqual(await readWorkspaceFiles(root, Object.keys(OLD)), OLD);
  assert.equal(await exists(join(root, ".pipeline", "manifest.yaml")), false);

  const recovered = await recoverWorkspaceTransaction(root, { id: "tx-after-prepare" });

  assert.equal(recovered.action, "rolled_back");
  assert.deepEqual(await readWorkspaceFiles(root, Object.keys(OLD)), OLD);
  assert.equal(await exists(join(root, ".pipeline", "manifest.yaml")), false);
  await assertIdempotentRecovery(root, "tx-after-prepare");
});

test("recovery restores every old file after a partial mid-install rename", async (t) => {
  const root = await temporaryRoot(t, "hw-transaction-mid-install-");
  await seedWorkspaceFiles(root, OLD);

  const crashEvent = await expectInjectedCrash(root, "tx-mid-install", "after_install_file", { index: 0 });
  const crashed = await readWorkspaceFiles(root, Object.keys(OLD));
  assert.equal(crashed[crashEvent.path], NEXT[crashEvent.path]);
  for (const path of Object.keys(OLD).filter((path) => path !== crashEvent.path)) {
    assert.equal(crashed[path], OLD[path]);
  }
  assert.equal(await exists(join(root, ".pipeline", "manifest.yaml")), false);

  const recovered = await recoverWorkspaceTransaction(root, { id: "tx-mid-install" });

  assert.equal(recovered.action, "rolled_back");
  assert.deepEqual(await readWorkspaceFiles(root, Object.keys(OLD)), OLD);
  assert.equal(await exists(join(root, ".pipeline", "manifest.yaml")), false);
  await assertIdempotentRecovery(root, "tx-mid-install");
});

test("recovery rolls forward when all data files installed before manifest activation", async (t) => {
  const root = await temporaryRoot(t, "hw-transaction-before-activation-");
  await seedWorkspaceFiles(root, OLD);

  await expectInjectedCrash(root, "tx-before-activation", "before_manifest_activation");
  assert.deepEqual(await readWorkspaceFiles(root, Object.keys(NEXT)), NEXT);
  assert.equal(await exists(join(root, ".pipeline", "manifest.yaml")), false);

  const recovered = await recoverWorkspaceTransaction(root, { id: "tx-before-activation" });

  assert.equal(recovered.action, "rolled_forward");
  assert.deepEqual(await readWorkspaceFiles(root, Object.keys(NEXT)), NEXT);
  assert.equal((await detectWorkspaceFormat(root)).kind, "current");
  await assertIdempotentRecovery(root, "tx-before-activation");
});

test("recovery finalizes an interruption after manifest activation", async (t) => {
  const root = await temporaryRoot(t, "hw-transaction-after-activation-");
  await seedWorkspaceFiles(root, OLD);

  await expectInjectedCrash(root, "tx-after-activation", "after_manifest_activation");
  assert.deepEqual(await readWorkspaceFiles(root, Object.keys(NEXT)), NEXT);
  assert.equal((await detectWorkspaceFormat(root)).kind, "current");

  const recovered = await recoverWorkspaceTransaction(root, { id: "tx-after-activation" });

  assert.equal(recovered.action, "finalized");
  assert.deepEqual(await readWorkspaceFiles(root, Object.keys(NEXT)), NEXT);
  assert.equal((await detectWorkspaceFormat(root)).kind, "current");
  await assertIdempotentRecovery(root, "tx-after-activation");
});

test("recovery fails closed when a prepared target drifts from its recorded hash", async (t) => {
  const root = await temporaryRoot(t, "hw-transaction-hash-drift-");
  await seedWorkspaceFiles(root, OLD);
  const driftedPath = Object.keys(OLD)[0];

  await assert.rejects(
    commitWorkspaceTransaction(root, {
      id: "tx-hash-drift",
      writes: writeSet(NEXT),
      manifest: manifest(),
      faultInjector: async (event) => {
        if (event.phase !== "after_prepare") return;
        await writeText(join(root, driftedPath), "concurrent-external-change\n");
        throw new Error("injected after_prepare failure with target drift");
      },
    }),
    /injected after_prepare failure/,
  );

  await assert.rejects(
    recoverWorkspaceTransaction(root, { id: "tx-hash-drift" }),
    /hash|integrity|drift|conflict/i,
  );
  assert.equal(await readFile(join(root, driftedPath), "utf8"), "concurrent-external-change\n");
  assert.equal(await exists(join(root, ".pipeline", "manifest.yaml")), false);
});

test("a stale prepared transaction cannot be overwritten by reusing its id", async (t) => {
  const root = await temporaryRoot(t, "hw-transaction-stale-prepare-");
  await seedWorkspaceFiles(root, OLD);
  await expectInjectedCrash(root, "tx-stale", "after_prepare");
  const before = await readWorkspaceFiles(root, Object.keys(OLD));

  await assert.rejects(
    commitWorkspaceTransaction(root, {
      id: "tx-stale",
      writes: [{ path: ".pipeline/runtime/active.txt", content: "replacement-payload\n" }],
      manifest: manifest(),
    }),
    /prepared|pending|stale|transaction|already exists|conflict/i,
  );

  assert.deepEqual(await readWorkspaceFiles(root, Object.keys(OLD)), before);
  assert.equal(await exists(join(root, ".pipeline", "manifest.yaml")), false);
  const recovered = await recoverWorkspaceTransaction(root, { id: "tx-stale" });
  assert.equal(recovered.action, "rolled_back");
  assert.deepEqual(await readWorkspaceFiles(root, Object.keys(OLD)), OLD);
});

test("commit rejects staged bytes tampered after prepare without installing or activating them", async (t) => {
  const root = await temporaryRoot(t, "hw-transaction-staged-tamper-");
  await seedWorkspaceFiles(root, OLD);
  const firstPath = Object.keys(NEXT)[0];

  const error = await captureError(() => commitWorkspaceTransaction(root, {
    id: "tx-staged-tamper",
    writes: writeSet(NEXT),
    manifest: manifest(),
    faultInjector: async (event) => {
      if (event.phase !== "after_prepare") return;
      const stagedPath = await findFileWithExactContent(
        join(root, ".pipeline", "runtime"),
        NEXT[firstPath],
      );
      await writeFile(stagedPath, "tampered-staged-bytes\n", "utf8");
    },
  }));

  assert.equal(error?.code, "ERR_WORKSPACE_TRANSACTION_CONFLICT");
  assert.deepEqual(await readWorkspaceFiles(root, Object.keys(OLD)), OLD);
  assert.equal(await exists(join(root, ".pipeline", "manifest.yaml")), false);
  await assertConflictEvidenceRetained(root, "tx-staged-tamper");
});

test("commit rejects target drift before manifest activation and preserves external bytes", async (t) => {
  const root = await temporaryRoot(t, "hw-transaction-target-drift-");
  await seedWorkspaceFiles(root, OLD);
  const driftedPath = Object.keys(NEXT)[0];

  const error = await captureError(() => commitWorkspaceTransaction(root, {
    id: "tx-target-drift-before-activation",
    writes: writeSet(NEXT),
    manifest: manifest(),
    faultInjector: async (event) => {
      if (event.phase !== "before_manifest_activation") return;
      await writeText(join(root, driftedPath), "external-target-drift\n");
    },
  }));

  assert.equal(error?.code, "ERR_WORKSPACE_TRANSACTION_CONFLICT");
  assert.equal(await readFile(join(root, driftedPath), "utf8"), "external-target-drift\n");
  assert.equal(await exists(join(root, ".pipeline", "manifest.yaml")), false);
  await assertConflictEvidenceRetained(root, "tx-target-drift-before-activation");
});

test("recovery rolls forward after an activated manifest is deleted or restored to its old hash", async (t) => {
  for (const manifestDrift of ["missing", "old"]) {
    await t.test(manifestDrift, async (subtest) => {
      const root = await temporaryRoot(subtest, `hw-transaction-manifest-${manifestDrift}-`);
      const oldManifest = manifest({
        workspace_id: `old-${manifestDrift}`,
        project_id: "transaction-project",
        created_at: "2026-07-11T21:00:00+08:00",
      });
      const stagedManifest = manifest({
        workspace_id: `new-${manifestDrift}`,
        project_id: "transaction-project",
        created_at: "2026-07-11T22:45:00+08:00",
      });
      await seedWorkspaceFiles(root, OLD);
      await writeManifestData(root, oldManifest);

      await assert.rejects(
        commitWorkspaceTransaction(root, {
          id: `tx-manifest-${manifestDrift}`,
          writes: writeSet(NEXT),
          manifest: stagedManifest,
          faultInjector: async (event) => {
            if (event.phase === "after_manifest_activation") {
              throw new Error(`injected activated-manifest ${manifestDrift} interruption`);
            }
          },
        }),
        /injected activated-manifest/,
      );

      const manifestPath = join(root, ".pipeline", "manifest.yaml");
      if (manifestDrift === "missing") {
        await rm(manifestPath, { force: true });
      } else {
        await writeManifestData(root, oldManifest);
      }

      const recovered = await recoverWorkspaceTransaction(root, { id: `tx-manifest-${manifestDrift}` });

      assert.equal(recovered.action, "rolled_forward");
      assert.deepEqual(parseYaml(await readFile(manifestPath, "utf8")), stagedManifest);
      assert.deepEqual(await readWorkspaceFiles(root, Object.keys(NEXT)), NEXT);
      assert.equal((await detectWorkspaceFormat(root)).kind, "current");
      assert.equal(
        (await recoverWorkspaceTransaction(root, { id: `tx-manifest-${manifestDrift}` })).action,
        "none",
        "transaction evidence may be cleaned only after staged authority is restored",
      );
    });
  }
});

test("a different transaction id cannot bypass another pending workspace transaction", async (t) => {
  const root = await temporaryRoot(t, "hw-transaction-different-id-");
  await seedWorkspaceFiles(root, OLD);
  await expectInjectedCrash(root, "tx-a", "after_install_file", { index: 0 });
  const beforeSecondCommit = await snapshotTree(root);

  const error = await captureError(() => commitWorkspaceTransaction(root, {
    id: "tx-b",
    writes: [{ path: ".pipeline/runtime/non-overlap-b.txt", content: "tx-b-content\n" }],
    manifest: manifest({ workspace_id: "different-tx-b-workspace" }),
  }));

  assert.deepEqual(
    await snapshotTree(root),
    beforeSecondCommit,
    "a competing transaction must fail before staging or installing any bytes",
  );
  assert.equal(error?.code, "ERR_WORKSPACE_TRANSACTION_PENDING");
  assert.equal(await exists(join(root, ".pipeline", "runtime", "non-overlap-b.txt")), false);
  assert.equal(await exists(join(root, ".pipeline", "manifest.yaml")), false);

  const recovered = await recoverWorkspaceTransaction(root, { id: "tx-a" });
  assert.equal(recovered.action, "rolled_back");
  assert.deepEqual(await readWorkspaceFiles(root, Object.keys(OLD)), OLD);
});

test("transaction rejects ancestor and descendant file paths before any workspace mutation", async (t) => {
  const ancestor = ".pipeline/runtime/node";
  const descendant = ".pipeline/runtime/node/child.txt";
  const orders = [
    { name: "ancestor-first", paths: [ancestor, descendant] },
    { name: "descendant-first", paths: [descendant, ancestor] },
  ];

  for (const order of orders) {
    await t.test(order.name, async (subtest) => {
      const root = await temporaryRoot(subtest, `hw-transaction-prefix-${order.name}-`);
      await writeText(join(root, "sentinel.txt"), "unchanged\n");
      const before = await snapshotTree(root);

      const error = await captureError(() => commitWorkspaceTransaction(root, {
        id: `tx-prefix-${order.name}`,
        writes: order.paths.map((path, index) => ({ path, content: `content-${index}\n` })),
        manifest: manifest(),
      }));

      assert.deepEqual(
        await snapshotTree(root),
        before,
        "a prefix-colliding write set must fail before staging, mkdir, install, or activation",
      );
      assert.equal(error?.code, "ERR_WORKSPACE_PATH_FORBIDDEN");
      assert.match(error?.message || "", /ancestor|descendant|prefix|collision|overlap|write set/i);
      assert.equal(
        await exists(join(root, ".pipeline", "runtime", "transactions")),
        false,
        "invalid write-set preflight must not create transaction evidence",
      );
    });
  }
});

test("transaction rejects traversal, absolute escapes, and paths outside workspace zones before staging", async (t) => {
  const root = await temporaryRoot(t, "hw-transaction-paths-");
  await seedWorkspaceFiles(root, OLD);
  const outside = await temporaryRoot(t, "hw-transaction-outside-");
  const attempts = [
    ".pipeline/state.yaml",
    ".pipeline/unowned/file.txt",
    ".pipeline/runtime/../../../escape.txt",
    "../escape.txt",
    join(outside, "absolute-escape.txt"),
  ];

  for (const [index, path] of attempts.entries()) {
    const before = await snapshotTree(root);
    await assert.rejects(
      commitWorkspaceTransaction(root, {
        id: `tx-invalid-path-${index}`,
        writes: [{ path, content: "must-not-write\n" }],
        manifest: manifest(),
      }),
      /allowed|outside|path|traversal|workspace zone/i,
      `expected ${path} to be rejected`,
    );
    assert.deepEqual(await snapshotTree(root), before, `invalid path ${path} must be a zero-write failure`);
    if (isAbsolute(path)) assert.equal(await exists(path), false);
  }
});

test("transaction rejects an allowed-looking path that escapes through a symlink", async (t) => {
  const root = await temporaryRoot(t, "hw-transaction-symlink-");
  const outside = await temporaryRoot(t, "hw-transaction-symlink-outside-");
  await mkdir(join(root, ".pipeline", "runtime"), { recursive: true });
  await symlink(outside, join(root, ".pipeline", "runtime", "escape"), "dir");
  const before = await snapshotTree(root);

  await assert.rejects(
    commitWorkspaceTransaction(root, {
      id: "tx-symlink-escape",
      writes: [{ path: ".pipeline/runtime/escape/owned.txt", content: "must-not-write\n" }],
      manifest: manifest(),
    }),
    /symlink|outside|escape|path/i,
  );

  assert.deepEqual(await snapshotTree(root), before);
  assert.equal(await exists(join(outside, "owned.txt")), false);
});

test("damaged current manifest blocks the new transaction path without mutation", async (t) => {
  const root = await temporaryRoot(t, "hw-transaction-damaged-");
  await writeText(join(root, ".pipeline", "manifest.yaml"), "schema_version: [\n");
  await writeText(join(root, ".pipeline", "runtime", "sentinel.txt"), "unchanged\n");
  const before = await snapshotTree(root);

  await assert.rejects(
    commitWorkspaceTransaction(root, {
      id: "tx-damaged-manifest",
      writes: [{ path: ".pipeline/runtime/sentinel.txt", content: "changed\n" }],
      manifest: manifest(),
    }),
    /damaged|invalid|manifest|fail.closed/i,
  );

  assert.deepEqual(await snapshotTree(root), before);
});

async function expectInjectedCrash(root, id, phase, selector = {}) {
  let crashEvent = null;
  await assert.rejects(
    commitWorkspaceTransaction(root, {
      id,
      writes: writeSet(NEXT),
      manifest: manifest(),
      faultInjector: async (event) => {
        if (event.phase !== phase) return;
        if (selector.index !== undefined && event.index !== selector.index) return;
        crashEvent = { ...event };
        throw new Error(`injected ${phase} failure`);
      },
    }),
    new RegExp(`injected ${phase} failure`),
  );
  assert.ok(crashEvent, `fault injector did not observe ${phase}`);
  return crashEvent;
}

async function assertIdempotentRecovery(root, id) {
  const before = await snapshotTree(root);
  await recoverWorkspaceTransaction(root, { id });
  assert.deepEqual(await snapshotTree(root), before, "a second recovery must be a no-op");
}

function writeSet(values) {
  return Object.entries(values).map(([path, content]) => ({ path, content }));
}

function manifest(overrides = {}) {
  return createWorkspaceManifest({
    workspace_id: "transaction-fixture",
    project_id: "transaction-project",
    created_at: FIXED_NOW,
    ...overrides,
  });
}

async function writeManifestData(root, value) {
  await writeText(
    join(root, ".pipeline", "manifest.yaml"),
    `${stringifyYaml(value).trimEnd()}\n`,
  );
}

async function seedWorkspaceFiles(root, values) {
  for (const [path, content] of Object.entries(values)) {
    await writeText(join(root, path), content);
  }
}

async function readWorkspaceFiles(root, paths) {
  return Object.fromEntries(await Promise.all(paths.map(async (path) => [
    path,
    await readFile(join(root, path), "utf8"),
  ])));
}

async function temporaryRoot(t, prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function writeText(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function captureError(operation) {
  try {
    await operation();
    return null;
  } catch (error) {
    return error;
  }
}

async function assertConflictEvidenceRetained(root, id) {
  const before = await snapshotTree(root);
  const recoveryError = await captureError(() => recoverWorkspaceTransaction(root, { id }));
  assert.equal(recoveryError?.code, "ERR_WORKSPACE_TRANSACTION_CONFLICT");
  assert.deepEqual(
    await snapshotTree(root),
    before,
    "conflicting transaction evidence must remain available for explicit resolution",
  );
}

async function findFileWithExactContent(root, expected) {
  const entries = await snapshotTree(root);
  const matches = entries.filter((entry) => (
    entry.type === "file"
    && Buffer.from(entry.content, "base64").equals(Buffer.from(expected))
  ));
  assert.equal(matches.length, 1, "expected one staged file matching the selected payload");
  return join(root, matches[0].path);
}

async function allText(root) {
  return (await snapshotTree(root))
    .filter((entry) => entry.type === "file")
    .map((entry) => Buffer.from(entry.content, "base64").toString("utf8"))
    .join("\n");
}

async function snapshotTree(root) {
  const entries = [];
  await visit(root, ".", entries);
  return entries;
}

async function visit(root, relativePath, entries) {
  const path = relativePath === "." ? root : join(root, relativePath);
  const stat = await lstat(path, { bigint: true });
  const common = { path: relativePath, mode: Number(stat.mode), mtime_ns: stat.mtimeNs };
  if (stat.isSymbolicLink()) {
    entries.push({ ...common, type: "symlink", target: await readlink(path) });
    return;
  }
  if (stat.isDirectory()) {
    entries.push({ ...common, type: "directory" });
    for (const child of (await readdir(path)).sort()) {
      await visit(root, relativePath === "." ? child : join(relativePath, child), entries);
    }
    return;
  }
  entries.push({ ...common, type: "file", content: (await readFile(path)).toString("base64") });
}
