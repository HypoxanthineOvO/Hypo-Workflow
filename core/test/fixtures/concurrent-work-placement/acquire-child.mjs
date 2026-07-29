import * as CORE from "../../../src/index.js";

const [root, encodedInput, transactionId] = process.argv.slice(2);

try {
  const input = JSON.parse(Buffer.from(encodedInput, "base64url").toString("utf8"));
  const store = CORE.createWorkPlacementStore({
    clock: () => "2026-07-29T05:00:00+08:00",
    lease_ttl_ms: 300_000,
  });
  const result = await store.assessAndAcquire(root, input, { id: transactionId });
  process.stdout.write(`${JSON.stringify({ ok: true, result })}\n`);
} catch (error) {
  process.stdout.write(`${JSON.stringify({
    ok: false,
    error: { code: error?.code ?? null, message: String(error?.message ?? error) },
  })}\n`);
}
