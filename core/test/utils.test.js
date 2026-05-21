import test from "node:test";
import assert from "node:assert/strict";

const utilsModulePromise = import("../src/utils/index.js");

test("shared utils module exposes the C17-M1 dependency-light contract", async () => {
  const utils = await utilsModulePromise;

  assert.equal(typeof utils.isPlainObject, "function");
  assert.equal(typeof getCloneFunction(utils), "function");
  assert.equal(typeof utils.compactTimestamp, "function");
  assert.equal(typeof utils.stableStringify, "function");
  assert.equal(typeof utils.hasText, "function");
  assert.equal(typeof utils.safeId, "function");
});

test("isPlainObject accepts only plain objects", async () => {
  const { isPlainObject } = await utilsModulePromise;

  assert.equal(isPlainObject({}), true);
  assert.equal(isPlainObject({ nested: true }), true);
  assert.equal(isPlainObject(null), false);
  assert.equal(isPlainObject([]), false);
  assert.equal(isPlainObject(new Date("2026-05-21T17:30:00+08:00")), false);
  assert.equal(isPlainObject("value"), false);
});

test("cloneJson or deepClone returns an isolated deep copy", async () => {
  const utils = await utilsModulePromise;
  const clone = getCloneFunction(utils);
  const original = { nested: { count: 1 }, list: [{ value: "a" }] };

  const copied = clone(original);

  copied.nested.count = 2;
  copied.list[0].value = "b";

  assert.deepEqual(original, { nested: { count: 1 }, list: [{ value: "a" }] });
  assert.deepEqual(copied, { nested: { count: 2 }, list: [{ value: "b" }] });
});

test("compactTimestamp emits a filesystem-safe compact timestamp", async () => {
  const { compactTimestamp } = await utilsModulePromise;

  assert.match(compactTimestamp("2026-05-21T17:30:00+08:00"), /20260521T173000(?:\+0800|Z)?/);
});

test("stableStringify produces deterministic key ordering for nested objects", async () => {
  const { stableStringify } = await utilsModulePromise;
  const left = { b: 2, a: { d: 4, c: 3 } };
  const right = { a: { c: 3, d: 4 }, b: 2 };

  assert.equal(stableStringify(left), stableStringify(right));
  assert.equal(stableStringify(left), '{"a":{"c":3,"d":4},"b":2}');
});

test("hasText accepts non-empty strings only", async () => {
  const { hasText } = await utilsModulePromise;

  assert.equal(hasText("value"), true);
  assert.equal(hasText("  value  "), true);
  assert.equal(hasText(""), false);
  assert.equal(hasText("   \n\t"), false);
  assert.equal(hasText(123), false);
  assert.equal(hasText(null), false);
});

test("safeId normalizes display text into a filename-safe lower-ish id", async () => {
  const { safeId } = await utilsModulePromise;
  const id = safeId("C17 M1: Shared Utils Layer Extraction!");

  assert.match(id, /^[a-z0-9._-]+$/);
  assert.equal(id, "c17-m1-shared-utils-layer-extraction");
});

function getCloneFunction(utils) {
  return utils.cloneJson || utils.deepClone;
}
