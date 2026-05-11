import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const EXAMPLE_DIR = "core/test/fixtures/audit-regression-canonical-examples";

const CANONICAL_EXAMPLES = [
  {
    file: `${EXAMPLE_DIR}/audit-mid-flight-rejection.md`,
    title: "audit mid-flight rejection example",
    patterns: [
      /mid[- ]flight rejection/i,
      /structured rejection artifact/i,
      /deterministic rework next step/i,
      /required_rework/i,
      /resolveRejectionNextStep|next step/i,
      /node --test core\/test\/rejection-rework-blocked-runtime-loop\.test\.js/,
      /bash tests\/scenarios\/v11\/s68-rejection-rework-blocked-runtime-loop\/run\.sh/,
    ],
  },
  {
    file: `${EXAMPLE_DIR}/audit-approved-blocked.md`,
    title: "audit-approved blocked example",
    patterns: [
      /audit-approved blocked/i,
      /implement proposal/i,
      /audit approval/i,
      /self[- ]approve/i,
      /must not|den(y|ied)|reject/i,
      /node --test core\/test\/audit-governance-contract\.test\.js/,
      /bash tests\/scenarios\/v11\/s64-audit-governance-contract\/run\.sh/,
    ],
  },
  {
    file: `${EXAMPLE_DIR}/cross-role-test-implement-rejection.md`,
    title: "cross-role test/implement rejection example",
    patterns: [
      /cross-role/i,
      /test[\s\S]{0,80}implement|implement[\s\S]{0,80}test/i,
      /shared worker|ownership\/scope violation|ownership violation|scope violation/i,
      /rejected|blocked|denied/i,
      /node --test core\/test\/worker-separation-spawn-enforcement\.test\.js/,
      /bash tests\/scenarios\/v11\/s67-worker-separation-spawn-enforcement\/run\.sh/,
    ],
  },
  {
    file: `${EXAMPLE_DIR}/missing-audit-planning-question-failure.md`,
    title: "missing audit planning question failure example",
    patterns: [
      /missing audit planning question/i,
      /P1 audit question group/i,
      /missing|absent|omitted/i,
      /cannot enter P2|blocked from entering P2|must not enter P2/i,
      /node --test core\/test\/plan-audit-interview-prompt-architecture\.test\.js/,
      /bash tests\/scenarios\/v11\/s66-plan-audit-interview-prompt-architecture\/run\.sh/,
    ],
  },
];

const REQUIRED_COMMANDS = [
  "node --test core/test/audit-governance-contract.test.js",
  "node --test core/test/plan-audit-interview-prompt-architecture.test.js",
  "node --test core/test/worker-separation-spawn-enforcement.test.js",
  "node --test core/test/rejection-rework-blocked-runtime-loop.test.js",
  "bash tests/scenarios/v11/s64-audit-governance-contract/run.sh",
  "bash tests/scenarios/v11/s65-audit-memory-handoff/run.sh",
  "bash tests/scenarios/v11/s66-plan-audit-interview-prompt-architecture/run.sh",
  "bash tests/scenarios/v11/s67-worker-separation-spawn-enforcement/run.sh",
  "bash tests/scenarios/v11/s68-rejection-rework-blocked-runtime-loop/run.sh",
];

test("canonical audit regression examples exist as durable fixtures", async () => {
  for (const example of CANONICAL_EXAMPLES) {
    await assert.doesNotReject(
      access(example.file),
      `${example.title} must exist at ${example.file}`,
    );
  }
});

for (const example of CANONICAL_EXAMPLES) {
  test(`${example.title} documents the executable contract`, async () => {
    const text = await readFile(example.file, "utf8");

    for (const pattern of example.patterns) {
      assert.match(text, pattern, `${example.file} is missing ${pattern}`);
    }
  });
}

test("canonical audit examples cite the real focused tests and s64-s68 scenarios", async () => {
  const combined = (
    await Promise.all(CANONICAL_EXAMPLES.map((example) => readFile(example.file, "utf8")))
  ).join("\n");

  for (const command of REQUIRED_COMMANDS) {
    assert.ok(
      combined.includes(command),
      `canonical examples must cite executable command: ${command}`,
    );
  }
});
