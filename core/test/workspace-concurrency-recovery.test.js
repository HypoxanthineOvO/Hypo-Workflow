import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createWorkspaceManifest } from "../src/manifest/index.js";
import {
  commitWorkspaceTransaction,
  recoverWorkspaceTransaction,
} from "../src/workspace-store/index.js";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CORE_MODULE_URL = pathToFileURL(join(REPOSITORY_ROOT, "core/src/index.js")).href;
const FIXED_NOW = "2026-07-24T09:00:00+08:00";
const TARGET = ".pipeline/runtime/concurrency.txt";
const OLD_CONTENT = "old\n";

test("concurrent workspace commits have one atomic writer and never overlap preparation", async (t) => {
  const root = await temporaryRoot(t, "hw-writer-atomic-");
  await writeText(join(root, TARGET), OLD_CONTENT);
  const oldHash = sha256(OLD_CONTENT);
  let prepared = 0;
  let maxPrepared = 0;

  const commit = (id, content) => commitWorkspaceTransaction(root, {
    id,
    writes: [{ path: TARGET, content, expected_hash: oldHash }],
    manifest: manifest(),
    faultInjector: async (event) => {
      if (event.phase !== "after_prepare") return;
      prepared += 1;
      maxPrepared = Math.max(maxPrepared, prepared);
      await delay(150);
      prepared -= 1;
    },
  });

  const outcomes = await Promise.allSettled([
    commit("atomic-writer-a", "writer-a\n"),
    commit("atomic-writer-b", "writer-b\n"),
  ]);
  const fulfilled = outcomes.filter((outcome) => outcome.status === "fulfilled");
  const rejected = outcomes.filter((outcome) => outcome.status === "rejected");

  assert.equal(maxPrepared, 1, "only the atomic writer-lease owner may enter transaction preparation");
  assert.equal(fulfilled.length, 1, "exactly one expected-hash writer must commit");
  assert.equal(rejected.length, 1, "the stale expected-hash writer must fail closed after serialization");
  assert.match(
    String(rejected[0].reason?.code || rejected[0].reason),
    /CONFLICT|PRECONDITION|DRIFT|PENDING|BUSY/,
  );
});

test("the next writer automatically recovers a prepared transaction after an ordinary failure", async (t) => {
  const root = await temporaryRoot(t, "hw-writer-thrown-fault-");
  await writeText(join(root, TARGET), OLD_CONTENT);

  await assert.rejects(commitWorkspaceTransaction(root, {
    id: "ordinary-fault-owner",
    writes: [{ path: TARGET, content: "abandoned\n", expected_hash: sha256(OLD_CONTENT) }],
    manifest: manifest(),
    faultInjector: async (event) => {
      if (event.phase === "after_prepare") throw new Error("ordinary injected failure");
    },
  }), /ordinary injected failure/);

  const successor = await commitWorkspaceTransaction(root, {
    id: "ordinary-fault-successor",
    writes: [{ path: TARGET, content: "successor\n", expected_hash: sha256(OLD_CONTENT) }],
    manifest: manifest(),
  });

  assert.equal(successor.action, "committed");
  assert.equal(await readFile(join(root, TARGET), "utf8"), "successor\n");
  assert.equal((await recoverWorkspaceTransaction(root, { id: "ordinary-fault-owner" })).action, "none");
});

test("forged far-future expiry cannot keep a stale writer lease alive indefinitely", { timeout: 5_000 }, async (t) => {
  const root = await temporaryRoot(t, "hw-writer-forged-expiry-");
  await writeText(join(root, TARGET), OLD_CONTENT);
  const lockDir = join(root, ".pipeline/runtime/coordination/writer.lock");
  const ownerPath = join(lockDir, "owner.json");
  await mkdir(lockDir, { recursive: true });
  await writeFile(ownerPath, `${JSON.stringify({
    schema_version: "1",
    token: "forged-owner-token",
    operation_id: "forged-owner",
    pid: 999_999_999,
    renewed_at: "2000-01-01T00:00:00.000Z",
    expires_at: "2999-01-01T00:00:00.000Z",
  })}\n`, "utf8");
  const stale = new Date("2000-01-01T00:00:00.000Z");
  await utimes(ownerPath, stale, stale);
  await utimes(lockDir, stale, stale);

  const successor = spawnImmediateWriter(t, root, "forged-expiry-successor", "successor\n");
  const result = await withTimeout(
    successor.waitForResult(),
    3_000,
    "forged far-future expiry blocked the writer beyond the bounded stale window",
  );

  assert.equal(result.ok, true, result.message || "stale forged lease must be reclaimed");
  assert.equal(await readFile(join(root, TARGET), "utf8"), "successor\n");
});

for (const signal of ["SIGTERM", "SIGKILL"]) {
  test(`a writer killed with ${signal} is recovered automatically before the next write`, async (t) => {
    const root = await temporaryRoot(t, `hw-writer-${signal.toLowerCase()}-`);
    await writeText(join(root, TARGET), OLD_CONTENT);
    const child = spawnPausedWriter(t, root, `killed-${signal.toLowerCase()}`);
    await child.waitForLine("READY:after_prepare");

    assert.equal(
      await readFile(join(root, TARGET), "utf8"),
      OLD_CONTENT,
      "readers must remain available while a writer owns a short commit lease",
    );
    child.process.kill(signal);
    const exit = await child.waitForExit();
    assert.ok(exit.signal === signal || exit.code !== 0, `child must terminate under ${signal}`);

    const committed = await commitWorkspaceTransaction(root, {
      id: `successor-${signal.toLowerCase()}`,
      writes: [{ path: TARGET, content: `successor-${signal}\n`, expected_hash: sha256(OLD_CONTENT) }],
      manifest: manifest(),
    });

    assert.equal(committed.action, "committed");
    assert.equal(await readFile(join(root, TARGET), "utf8"), `successor-${signal}\n`);
    assert.equal((await recoverWorkspaceTransaction(root)).action, "none");
  });
}

test("a stale stopped writer is fenced after takeover and cannot activate when resumed", { timeout: 15_000 }, async (t) => {
  const root = await temporaryRoot(t, "hw-writer-fenced-");
  await writeText(join(root, TARGET), OLD_CONTENT);
  const stale = spawnPausedWriter(t, root, "stale-owner");
  await stale.waitForLine("READY:after_prepare");
  stale.process.kill("SIGSTOP");

  let successor;
  try {
    successor = await withTimeout(commitWorkspaceTransaction(root, {
      id: "takeover-owner",
      writes: [{ path: TARGET, content: "takeover\n", expected_hash: sha256(OLD_CONTENT) }],
      manifest: manifest(),
    }), 10_000, "stale writer takeover did not complete");
  } finally {
    stale.process.kill("SIGCONT");
  }
  assert.equal(successor.action, "committed");
  assert.equal(await readFile(join(root, TARGET), "utf8"), "takeover\n");

  stale.process.kill("SIGUSR1");
  const staleResult = await stale.waitForResult();
  assert.equal(staleResult.ok, false, "the old writer must not activate after its lease was taken over");
  assert.match(
    String(staleResult.code || staleResult.message),
    /FENCED|OWNERSHIP|STALE|CONFLICT/,
    "old-owner failure must identify a fencing or ownership conflict",
  );
  assert.equal(await readFile(join(root, TARGET), "utf8"), "takeover\n");
});

test("fencing is revalidated after temp install and immediately before target rename", { timeout: 15_000 }, async (t) => {
  const root = await temporaryRoot(t, "hw-writer-rename-fence-");
  await writeText(join(root, TARGET), OLD_CONTENT);
  const stale = spawnPausedWriter(t, root, "rename-window-owner", {
    phase: "before_target_rename",
    content: "must-not-activate\n",
  });
  await stale.waitForLine("READY:before_target_rename");
  stale.process.kill("SIGSTOP");

  let successor;
  try {
    successor = await withTimeout(commitWorkspaceTransaction(root, {
      id: "rename-window-takeover",
      writes: [{ path: TARGET, content: "takeover-after-temp-install\n", expected_hash: sha256(OLD_CONTENT) }],
      manifest: manifest(),
    }), 10_000, "rename-window stale writer takeover did not complete");
  } finally {
    stale.process.kill("SIGCONT");
  }
  assert.equal(successor.action, "committed");
  stale.process.kill("SIGUSR1");
  const staleResult = await stale.waitForResult();
  assert.equal(staleResult.ok, false, "the old writer must be fenced at the final rename boundary");
  assert.match(String(staleResult.code || staleResult.message), /FENCED|OWNERSHIP|STALE|CONFLICT/);
  assert.equal(await readFile(join(root, TARGET), "utf8"), "takeover-after-temp-install\n");
});

function spawnPausedWriter(t, root, id, options = {}) {
  const phase = options.phase || "after_prepare";
  const content = options.content || "abandoned\n";
  const source = `
    const { commitWorkspaceTransaction } = await import(${JSON.stringify(CORE_MODULE_URL)});
    let resume;
    const resumed = new Promise((resolveResume) => { resume = resolveResume; });
    process.on("SIGUSR1", () => resume());
    const manifest = ${JSON.stringify(manifest())};
    try {
      await commitWorkspaceTransaction(process.argv[1], {
        id: process.argv[2],
        writes: [{
          path: ${JSON.stringify(TARGET)},
          content: ${JSON.stringify(content)},
          expected_hash: ${JSON.stringify(sha256(OLD_CONTENT))},
        }],
        manifest,
        faultInjector: async (event) => {
          if (event.phase !== ${JSON.stringify(phase)}) return;
          process.stdout.write("READY:${phase}\\n");
          await resumed;
        },
      });
      process.stdout.write("RESULT:" + JSON.stringify({ ok: true }) + "\\n");
    } catch (error) {
      process.stdout.write("RESULT:" + JSON.stringify({
        ok: false,
        code: error?.code || null,
        message: error?.message || String(error),
      }) + "\\n");
    }
  `;
  const child = spawn(process.execPath, ["--input-type=module", "-e", source, root, id], {
    cwd: REPOSITORY_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const lines = lineReader(child);
  t.after(() => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGCONT");
      child.kill("SIGKILL");
    }
  });
  return {
    process: child,
    waitForLine: (line) => lines.waitFor((candidate) => candidate === line),
    waitForResult: async () => {
      const line = await lines.waitFor((candidate) => candidate.startsWith("RESULT:"));
      return JSON.parse(line.slice("RESULT:".length));
    },
    waitForExit: () => waitForExit(child),
  };
}

function spawnImmediateWriter(t, root, id, content) {
  const source = `
    const { commitWorkspaceTransaction } = await import(${JSON.stringify(CORE_MODULE_URL)});
    const manifest = ${JSON.stringify(manifest())};
    try {
      await commitWorkspaceTransaction(process.argv[1], {
        id: process.argv[2],
        writes: [{
          path: ${JSON.stringify(TARGET)},
          content: ${JSON.stringify(content)},
          expected_hash: ${JSON.stringify(sha256(OLD_CONTENT))},
        }],
        manifest,
      });
      process.stdout.write("RESULT:" + JSON.stringify({ ok: true }) + "\\n");
    } catch (error) {
      process.stdout.write("RESULT:" + JSON.stringify({
        ok: false,
        code: error?.code || null,
        message: error?.message || String(error),
      }) + "\\n");
    }
  `;
  const child = spawn(process.execPath, ["--input-type=module", "-e", source, root, id], {
    cwd: REPOSITORY_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const lines = lineReader(child);
  t.after(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  });
  return {
    process: child,
    waitForResult: async () => {
      const line = await lines.waitFor((candidate) => candidate.startsWith("RESULT:"));
      return JSON.parse(line.slice("RESULT:".length));
    },
  };
}

function lineReader(child) {
  const seen = [];
  const waiters = [];
  let buffered = "";
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buffered += chunk;
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() || "";
    for (const line of lines) {
      seen.push(line);
      for (const waiter of [...waiters]) {
        if (!waiter.predicate(line)) continue;
        waiter.resolve(line);
        waiters.splice(waiters.indexOf(waiter), 1);
      }
    }
  });
  return {
    waitFor(predicate) {
      const existing = seen.find(predicate);
      if (existing !== undefined) return Promise.resolve(existing);
      return withTimeout(new Promise((resolveLine, rejectLine) => {
        waiters.push({ predicate, resolve: resolveLine });
        child.once("exit", (code, signal) => {
          rejectLine(new Error(`writer exited before expected output (code=${code}, signal=${signal}): ${stderr}`));
        });
      }), 10_000, "timed out waiting for writer output");
    },
  };
}

function waitForExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({ code: child.exitCode, signal: child.signalCode });
  }
  return new Promise((resolveExit) => {
    child.once("exit", (code, signal) => resolveExit({ code, signal }));
  });
}

function withTimeout(promise, milliseconds, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), milliseconds);
    }),
  ]).finally(() => clearTimeout(timer));
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function manifest() {
  return createWorkspaceManifest({
    workspace_id: "workspace-concurrency-fixture",
    project_id: "workspace-concurrency-project",
    created_at: FIXED_NOW,
  });
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
