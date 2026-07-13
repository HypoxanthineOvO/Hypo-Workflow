import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { canonicalHash } from "../src/serialization/index.js";
import { recoverWorkspaceTransaction } from "../src/workspace-store/index.js";
import {
  EXPIRED_NOW,
  FIXED_NOW,
  LATER_NOW,
  allFileText,
  assertRecoveredWorkspaceMatches,
  assertSecretSafeError,
  captureError,
  exists,
  listFiles,
  readText,
  snapshotTree,
  temporaryCurrentWorkspace,
  writeText,
} from "./fixtures/c21-m2/helpers.js";

const REQUIRED_API = [
  "createReceiptStore",
  "issueReceipt",
  "readReceipt",
  "validateReceipt",
  "reserveReceipt",
  "consumeReceipt",
  "invalidateReceipt",
  "revokeReceipt",
];

const RECEIPTS_PROBE = await import("../src/receipts/index.js")
  .then((api) => ({ api, error: null }))
  .catch((error) => ({ api: null, error }));
const receiptStandaloneTest = RECEIPTS_PROBE.error ? test.skip : test;
const receiptTest = RECEIPTS_PROBE.error
  || typeof RECEIPTS_PROBE.api?.createReceiptStore !== "function"
  ? test.skip
  : test;

test("receipts module publishes the scoped single-use lifecycle API", async () => {
  const api = await loadReceiptsApi();
  for (const name of REQUIRED_API) assert.equal(typeof api[name], "function", `${name} must be exported`);
});

receiptTest("issued Receipt persists actor, intent, object, canonical scope hash, plan hash, expiry, and state", async (t) => {
  const api = await loadReceiptsApi();
  const { store } = createTestReceiptStore(api);
  const root = await temporaryCurrentWorkspace(t, "hw-m2-receipt-issued-");
  const input = receiptInput();
  const issued = await store.issueReceipt(root, input, { id: "receipt-issued" });

  assert.match(issued.id, /^[A-Za-z0-9][A-Za-z0-9._-]*$/);
  assert.equal(issued.path, `.pipeline/runtime/receipts/${issued.id}.yaml`);
  const receipt = await store.readReceipt(root, issued.id);
  assert.equal(receipt.receipt_id, issued.id);
  assert.deepEqual(receipt.actor, input.actor);
  assert.equal(receipt.intent, input.intent);
  assert.deepEqual(receipt.object_ref, input.object_ref);
  assert.equal(receipt.scope_hash, canonicalHash(input.scope));
  assert.equal(receipt.plan_hash, input.plan_hash);
  assert.equal(receipt.issued_at, input.issued_at);
  assert.equal(receipt.expires_at, input.expires_at);
  assert.equal(receipt.state, "issued");
  assert.equal("confirmed" in receipt, false);
  assert.equal("plan" in receipt, false, "Receipt stores the approved plan hash, not a mutable raw plan");
  assert.doesNotMatch(await readText(join(root, issued.path)), /confirmed\s*:\s*true/i);
  assert.deepEqual(
    await store.validateReceipt(root, issued.id, receiptContext(input)),
    { ok: true, receipt_id: issued.id, state: "issued" },
  );
});

receiptTest("scope hashing is canonical across mapping order but changes for path or content drift", async (t) => {
  const api = await loadReceiptsApi();
  const { store } = createTestReceiptStore(api);
  const root = await temporaryCurrentWorkspace(t, "hw-m2-receipt-scope-hash-");
  const firstInput = receiptInput({ intent: "workspace.write.first" });
  const reorderedScope = {
    paths: firstInput.scope.paths.map((entry) => ({
      content_hash: entry.content_hash,
      path: entry.path,
    })),
    actions: [...firstInput.scope.actions],
  };
  const secondInput = receiptInput({
    intent: "workspace.write.second",
    scope: reorderedScope,
  });
  const first = await store.issueReceipt(root, firstInput, { id: "receipt-scope-first" });
  const second = await store.issueReceipt(root, secondInput, { id: "receipt-scope-second" });
  assert.equal((await store.readReceipt(root, first.id)).scope_hash, (await store.readReceipt(root, second.id)).scope_hash);

  const changedPath = {
    ...firstInput.scope,
    paths: [{ ...firstInput.scope.paths[0], path: "src/other.js" }],
  };
  const changedContent = {
    ...firstInput.scope,
    paths: [{ ...firstInput.scope.paths[0], content_hash: canonicalHash("changed-content") }],
  };
  assert.notEqual(canonicalHash(changedPath), canonicalHash(firstInput.scope));
  assert.notEqual(canonicalHash(changedContent), canonicalHash(firstInput.scope));
});

receiptStandaloneTest("distinct own-property mapping scopes never collapse to one Receipt binding", async (t) => {
  const api = await loadReceiptsApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-receipt-own-scope-");
  const prototypeBefore = Object.getOwnPropertyDescriptors(Object.prototype);
  const keys = ["mode", "__proto__", "constructor", "prototype", "toString", "hasOwnProperty"];
  const failures = [];

  for (const [index, key] of keys.entries()) {
    try {
      const firstScope = scopeWithOwnBinding(key, `isolated-a-${index}`);
      const secondScope = scopeWithOwnBinding(key, `isolated-b-${index}`);
      if (canonicalHash(firstScope) === canonicalHash(secondScope)) {
        failures.push({ case: index, failure: "canonical-input-collision" });
        continue;
      }
      const firstInput = receiptInput({
        intent: `workflow.scope-own-${index}-a`,
        scope: firstScope,
        expires_at: "2099-01-01T00:00:00Z",
      });
      const secondInput = receiptInput({
        intent: `workflow.scope-own-${index}-b`,
        scope: secondScope,
        expires_at: "2099-01-01T00:00:00Z",
      });
      const first = await api.issueReceipt(root, firstInput, { id: `receipt-own-${index}-a` });
      const second = await api.issueReceipt(root, secondInput, { id: `receipt-own-${index}-b` });
      if ((await api.readReceipt(root, first.id)).scope_hash === (await api.readReceipt(root, second.id)).scope_hash) {
        failures.push({ case: index, failure: "receipt-binding-collision" });
      }
    } catch (error) {
      failures.push({ case: index, failure: "unexpected-rejection", code: error?.code || "unknown" });
    }
  }

  assert.deepEqual(Object.getOwnPropertyDescriptors(Object.prototype), prototypeBefore);
  assert.deepEqual(failures, [], "all distinct own-property mappings must remain distinct Receipt bindings");
});

receiptStandaloneTest("standalone Receipt decisions reject per-call time overrides", async (t) => {
  const api = await loadReceiptsApi();
  const operations = ["validate", "reserve", "consume"];

  await t.test("host-clock-default", async (subtest) => {
    const root = await temporaryCurrentWorkspace(subtest, "hw-m2-receipt-clock-host-");
    const input = receiptInput({
      intent: "workflow.clock-host-default",
      issued_at: "2000-01-01T00:00:00Z",
      expires_at: "2099-01-01T00:00:00Z",
    });
    const issued = await api.issueReceipt(root, input, { id: "receipt-clock-host-issue" });
    assert.deepEqual(
      await api.validateReceipt(root, issued.id, receiptContext(input)),
      { ok: true, receipt_id: issued.id, state: "issued" },
    );
  });

  for (const operation of operations) {
    await t.test(operation, async (subtest) => {
      const root = await temporaryCurrentWorkspace(subtest, `hw-m2-receipt-clock-${operation}-`);
      const input = receiptInput({
        intent: `workflow.clock-${operation}`,
        issued_at: "2000-01-01T00:00:00Z",
        expires_at: "2099-01-01T00:00:00Z",
      });
      const issued = await api.issueReceipt(root, input, { id: `receipt-clock-${operation}-issue` });
      const context = receiptContext(input);
      if (operation === "consume") {
        await api.reserveReceipt(root, issued.id, context, {
          tool_use_id: "tool-clock-owner",
          id: "receipt-clock-consume-reserve",
        });
      }
      const before = await snapshotTree(root);
      const override = { now: "2001-01-01T00:00:00Z" };
      let error;
      if (operation === "validate") {
        error = await captureError(() => api.validateReceipt(root, issued.id, context, override));
      } else if (operation === "reserve") {
        error = await captureError(() => api.reserveReceipt(root, issued.id, context, {
          ...override,
          tool_use_id: "tool-clock-reserve",
          id: "receipt-clock-reserve-action",
        }));
      } else {
        error = await captureError(() => api.consumeReceipt(root, issued.id, context, {
          ...override,
          tool_use_id: "tool-clock-owner",
          id: "receipt-clock-consume-action",
        }));
      }
      assert.ok(error, `${operation} must reject a per-call clock override`);
      assert.match(String(error.message || error), /now|clock|time|override|option|unsupported/i);
      assert.deepEqual(await snapshotTree(root), before);
    });
  }
});

receiptTest("Receipt lifecycle is issued -> reserved(tool_use_id) -> consumed and replay fails", async (t) => {
  const api = await loadReceiptsApi();
  const { store, setNow } = createTestReceiptStore(api);
  const root = await temporaryCurrentWorkspace(t, "hw-m2-receipt-lifecycle-");
  const input = receiptInput();
  const context = receiptContext(input);
  const issued = await store.issueReceipt(root, input, { id: "receipt-lifecycle-issue" });

  const reserved = await store.reserveReceipt(
    root,
    issued.id,
    context,
    { tool_use_id: "tool-use-owner", id: "receipt-lifecycle-reserve" },
  );
  assert.equal(reserved.state, "reserved");
  assert.equal(reserved.reservation.tool_use_id, "tool-use-owner");
  await assert.rejects(
    store.reserveReceipt(root, issued.id, context, {
      tool_use_id: "tool-use-replay",
      id: "receipt-lifecycle-rereserve",
    }),
    /reserved|owner|replay|single.use|state/i,
  );
  setNow(LATER_NOW);
  await assert.rejects(
    store.consumeReceipt(root, issued.id, context, {
      tool_use_id: "tool-use-other",
      id: "receipt-lifecycle-wrong-owner",
    }),
    /owner|tool|reservation|mismatch/i,
  );

  const consumed = await store.consumeReceipt(root, issued.id, context, {
    tool_use_id: "tool-use-owner",
    id: "receipt-lifecycle-consume",
  });
  assert.equal(consumed.state, "consumed");
  assert.equal(consumed.consumption.tool_use_id, "tool-use-owner");
  await assert.rejects(
    store.consumeReceipt(root, issued.id, context, {
      tool_use_id: "tool-use-owner",
      id: "receipt-lifecycle-double-consume",
    }),
    /consumed|replay|single.use|state/i,
  );
  await assert.rejects(
    store.validateReceipt(root, issued.id, context),
    /consumed|replay|state/i,
  );
});

receiptTest("concurrent reservation attempts have exactly one winner and one stable owner", async (t) => {
  const api = await loadReceiptsApi();
  const { store } = createTestReceiptStore(api);
  const root = await temporaryCurrentWorkspace(t, "hw-m2-receipt-concurrent-");
  const input = receiptInput({ intent: "workflow.concurrent" });
  const issued = await store.issueReceipt(root, input, { id: "receipt-concurrent-issue" });
  const contenders = ["tool-use-a", "tool-use-b"];
  const results = await Promise.allSettled(contenders.map((toolUseId) => store.reserveReceipt(
    root,
    issued.id,
    receiptContext(input),
    { tool_use_id: toolUseId, id: `receipt-concurrent-${toolUseId}` },
  )));

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  const winner = results.find((result) => result.status === "fulfilled").value.reservation.tool_use_id;
  const onDisk = await store.readReceipt(root, issued.id);
  assert.equal(onDisk.state, "reserved");
  assert.equal(onDisk.reservation.tool_use_id, winner);
  assert.ok(contenders.includes(winner));
});

receiptTest("actor, intent, object, scope, and plan drift fail closed and invalidate future use", async (t) => {
  const api = await loadReceiptsApi();
  const { store } = createTestReceiptStore(api);
  const root = await temporaryCurrentWorkspace(t, "hw-m2-receipt-drift-");
  const input = receiptInput();
  const valid = receiptContext(input);
  const drifts = [
    { name: "actor", context: { ...valid, actor: { type: "agent", id: "other" } } },
    { name: "intent", context: { ...valid, intent: "workflow.reject" } },
    {
      name: "object",
      context: { ...valid, object_ref: { kind: "delivery", id: "goal-other" } },
    },
    {
      name: "scope-path",
      context: {
        ...valid,
        scope: { ...valid.scope, paths: [{ ...valid.scope.paths[0], path: "src/other.js" }] },
      },
    },
    {
      name: "scope-content",
      context: {
        ...valid,
        scope: {
          ...valid.scope,
          paths: [{ ...valid.scope.paths[0], content_hash: canonicalHash("drifted-content") }],
        },
      },
    },
    {
      name: "scope-broaden",
      context: { ...valid, scope: { ...valid.scope, actions: [...valid.scope.actions, "delete"] } },
    },
    { name: "plan", context: { ...valid, plan_hash: canonicalHash({ plan: "other" }) } },
  ];

  for (const drift of drifts) {
    await t.test(drift.name, async () => {
      const issued = await store.issueReceipt(root, {
        ...input,
        intent: `${input.intent}.${drift.name}`,
      }, { id: `receipt-drift-issue-${drift.name}` });
      const expected = { ...valid, intent: `${valid.intent}.${drift.name}` };
      const drifted = drift.name === "intent"
        ? { ...drift.context, intent: "workflow.unrelated" }
        : { ...drift.context, intent: expected.intent };
      await assert.rejects(
        store.reserveReceipt(root, issued.id, drifted, {
          tool_use_id: `tool-${drift.name}`,
          id: `receipt-drift-reserve-${drift.name}`,
        }),
        /actor|intent|object|scope|plan|drift|invalid/i,
      );
      assert.equal((await store.readReceipt(root, issued.id)).state, "invalidated");
      await assert.rejects(
        store.reserveReceipt(root, issued.id, expected, {
          tool_use_id: `tool-correct-${drift.name}`,
          id: `receipt-drift-retry-${drift.name}`,
        }),
        /invalidated|state|drift/i,
      );
    });
  }
});

receiptTest("expired, malformed, explicitly invalidated, and revoked Receipts fail closed", async (t) => {
  const api = await loadReceiptsApi();
  const { store, setNow } = createTestReceiptStore(api);
  const root = await temporaryCurrentWorkspace(t, "hw-m2-receipt-fail-closed-");
  const input = receiptInput();

  const expired = await store.issueReceipt(root, input, { id: "receipt-expired-issue" });
  setNow(EXPIRED_NOW);
  await assert.rejects(
    store.reserveReceipt(root, expired.id, receiptContext(input), {
      tool_use_id: "tool-expired",
      id: "receipt-expired-reserve",
    }),
    /expired|expiry|invalid/i,
  );

  setNow(FIXED_NOW);
  const invalidated = await store.issueReceipt(root, {
    ...input,
    intent: "workflow.invalidate",
  }, { id: "receipt-invalidated-issue" });
  setNow(LATER_NOW);
  await store.invalidateReceipt(root, invalidated.id, {
    reason: "approved scope changed",
  }, { id: "receipt-invalidated-action" });
  await assert.rejects(
    store.validateReceipt(root, invalidated.id, {
      ...receiptContext(input),
      intent: "workflow.invalidate",
    }),
    /invalidated|state/i,
  );

  setNow(FIXED_NOW);
  const revoked = await store.issueReceipt(root, {
    ...input,
    intent: "workflow.revoke",
  }, { id: "receipt-revoked-issue" });
  setNow(LATER_NOW);
  await store.revokeReceipt(root, revoked.id, {
    reason: "user withdrew approval",
  }, { id: "receipt-revoked-action" });
  await assert.rejects(
    store.reserveReceipt(root, revoked.id, {
      ...receiptContext(input),
      intent: "workflow.revoke",
    }, {
      tool_use_id: "tool-revoked",
      id: "receipt-revoked-reserve",
    }),
    /revoked|state/i,
  );

  setNow(FIXED_NOW);
  const malformed = await store.issueReceipt(root, {
    ...input,
    intent: "workflow.malformed",
  }, { id: "receipt-malformed-issue" });
  await writeText(join(root, malformed.path), "schema_version: [\n");
  await assert.rejects(
    store.validateReceipt(root, malformed.id, {
      ...receiptContext(input),
      intent: "workflow.malformed",
    }),
    /malformed|parse|schema|receipt|invalid/i,
  );
});

receiptTest("bare confirmation and raw secret-like values cannot issue a Receipt or leak into errors/disk", async (t) => {
  const api = await loadReceiptsApi();
  const { store } = createTestReceiptStore(api);
  const root = await temporaryCurrentWorkspace(t, "hw-m2-receipt-secret-");
  const before = await snapshotTree(root);
  await assert.rejects(
    store.issueReceipt(root, { ...receiptInput(), confirmed: true }, { id: "receipt-bare-confirmed" }),
    /confirmed|boolean|receipt|authorization|field/i,
  );
  assert.deepEqual(await snapshotTree(root), before);

  const seededSecret = ["ghp", "M2_RECEIPT_SENTINEL_0123456789"].join("_");
  const hiddenSample = ["M2", "RECEIPT", "PRIVATE", "REASONING"].join("_");
  const unsafeScopes = [
    { ...receiptInput().scope, raw_value: seededSecret },
    {
      ...receiptInput().scope,
      bindings: { nested: { credentials: { value: seededSecret } } },
    },
    {
      ...receiptInput().scope,
      bindings: { nested: { analysis: { chain_of_thought: hiddenSample } } },
    },
  ];
  for (const [index, scope] of unsafeScopes.entries()) {
    const sample = index === 2 ? hiddenSample : seededSecret;
    const error = await captureError(() => store.issueReceipt(root, receiptInput({ scope }), {
      id: `receipt-sensitive-reject-${index}`,
    }));
    assertSecretSafeError(error, sample);
    assert.deepEqual(await snapshotTree(root), before);
  }
  if ((await allFileText(root)).includes(seededSecret) || (await allFileText(root)).includes(hiddenSample)) {
    throw new Error("workspace persisted a seeded sensitive sample");
  }
});

receiptTest("Receipt issuance exposes the M1 prepared-transaction recovery seam", async (t) => {
  const api = await loadReceiptsApi();
  const { store } = createTestReceiptStore(api);
  const root = await temporaryCurrentWorkspace(t, "hw-m2-receipt-transaction-");
  const before = await snapshotTree(root);
  const id = "receipt-after-prepare";
  await assert.rejects(
    store.issueReceipt(root, receiptInput(), {
      id,
      faultInjector: async ({ phase }) => {
        if (phase === "after_prepare") throw new Error("injected M2 Receipt interruption");
      },
    }),
    /injected M2 Receipt interruption/,
  );
  assert.equal(await exists(join(root, ".pipeline", "runtime", "transactions", id, "transaction.yaml")), true);
  assert.equal((await listFiles(root)).some((path) => path.includes("/runtime/receipts/")), false);
  assert.equal((await recoverWorkspaceTransaction(root, { id })).action, "rolled_back");
  await assertRecoveredWorkspaceMatches(root, before);
});

function createTestReceiptStore(api, initialNow = FIXED_NOW) {
  let current = initialNow;
  const store = api.createReceiptStore({
    clock: (...args) => {
      assert.equal(args.length, 0, "injected clock is a zero-argument time source");
      return current;
    },
  });
  for (const name of REQUIRED_API.filter((candidate) => candidate !== "createReceiptStore")) {
    assert.equal(typeof store[name], "function", `Receipt store must expose ${name}`);
  }
  return {
    store,
    setNow(value) {
      current = value;
    },
  };
}

function scopeWithOwnBinding(key, value) {
  const bindings = Object.create(null);
  Object.defineProperty(bindings, key, {
    configurable: false,
    enumerable: true,
    value,
    writable: false,
  });
  return {
    ...receiptInput().scope,
    bindings,
  };
}

function receiptInput(overrides = {}) {
  const input = {
    actor: { type: "user", id: "operator" },
    intent: "workflow.accept",
    object_ref: { kind: "delivery", id: "goal-alpha" },
    scope: {
      actions: ["write"],
      paths: [{
        path: "src/app.js",
        content_hash: canonicalHash("approved-content"),
      }],
    },
    plan_hash: canonicalHash({ plan: "goal-alpha-v1" }),
    issued_at: FIXED_NOW,
    expires_at: "2026-07-12T10:00:00+08:00",
  };
  return { ...input, ...overrides };
}

function receiptContext(input) {
  return {
    actor: input.actor,
    intent: input.intent,
    object_ref: input.object_ref,
    scope: input.scope,
    plan_hash: input.plan_hash,
  };
}

async function loadReceiptsApi() {
  if (RECEIPTS_PROBE.error) throw RECEIPTS_PROBE.error;
  return RECEIPTS_PROBE.api;
}
