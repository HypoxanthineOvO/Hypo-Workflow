import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../src/server.js";

test("exports an Express application", () => {
  assert.equal(typeof createServer().listen, "function");
});
