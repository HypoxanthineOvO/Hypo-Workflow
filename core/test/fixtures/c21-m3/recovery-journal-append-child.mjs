import { createRecoveryStore } from "../../../src/recovery/index.js";

const [root, rawIndex] = process.argv.slice(2);
const index = Number(rawIndex);
const store = createRecoveryStore({ inline_output_bytes: 64 });

if (!process.send || !root || !Number.isSafeInteger(index)) {
  throw new Error("Recovery Journal append child requires IPC, a workspace root, and an integer index");
}

process.send({ type: "ready" });
process.once("message", async (message) => {
  if (message?.type !== "start") return;
  try {
    const write = await store.appendRecoveryEvent(root, {
      object_ref: { kind: "delivery", id: "goal-alpha" },
      session_id: "session-multiprocess",
      writer: { kind: "main", id: "main" },
      turn_id: `turn-multiprocess-${String(index).padStart(3, "0")}`,
      type: "tool.completed",
      summary: `multiprocess append ${index}`,
      payload: {
        evidence_refs: [],
        output: `worker-${index}:`.padEnd(128 * 1024, "x"),
      },
    });
    process.send({
      type: "result",
      result: {
        event_id: write.event.event_id,
        sequence: write.event.sequence,
      },
    });
  } catch (error) {
    process.send({
      type: "error",
      error: {
        code: error?.code || null,
        message: error?.message || String(error),
      },
    });
    process.exitCode = 1;
  } finally {
    process.disconnect();
  }
});
