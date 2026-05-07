import test from "node:test";
import assert from "node:assert/strict";
import {
  buildExplainSubagentHandoff,
  renderExplainAnswerFromSubagentEvidence,
  validateExplainSubagentPacket,
} from "../src/index.js";

test("subagent handoff prompt is read-only and evidence-scoped", () => {
  const handoff = buildExplainSubagentHandoff("为什么刚才这样写?", {
    targets: ["core/src/explain/index.js", "core/test/explain-contract.test.js"],
    available: true,
  });

  assert.equal(handoff.mode, "subagent_handoff");
  assert.equal(handoff.fallback_reason, null);
  assert.match(handoff.prompt, /read-only/i);
  assert.match(handoff.prompt, /reviewed_refs/);
  assert.match(handoff.prompt, /unknowns/);
  assert.match(handoff.prompt, /Do not modify files/);
  assert.deepEqual(handoff.expected_schema, [
    "reviewed_refs",
    "findings",
    "unknowns",
    "confidence",
    "risk_notes",
  ]);
});

test("subagent unavailable falls back to evidence-first self mode", () => {
  const handoff = buildExplainSubagentHandoff("解释这个项目结构", {
    available: false,
    fallback_reason: "subagent tool unavailable",
  });

  assert.equal(handoff.mode, "self_fallback");
  assert.equal(handoff.fallback_reason, "subagent tool unavailable");
  assert.match(handoff.prompt, /self evidence/i);
});

test("subagent packet validation requires refs, unknowns, findings, confidence, and risk notes", () => {
  assert.equal(validateExplainSubagentPacket({
    reviewed_refs: ["core/src/explain/index.js"],
    findings: [{ ref: "core/src/explain/index.js", summary: "Explain is read-only." }],
    unknowns: [],
    confidence: "grounded",
    risk_notes: ["No mutation evidence found."],
  }).ok, true);

  const invalid = validateExplainSubagentPacket({
    findings: [],
    confidence: "grounded",
  });
  assert.equal(invalid.ok, false);
  assert.match(invalid.errors.join("\n"), /reviewed_refs/);
  assert.match(invalid.errors.join("\n"), /unknowns/);
  assert.match(invalid.errors.join("\n"), /risk_notes/);
});

test("final answer cites subagent evidence without hiding unknowns", () => {
  const answer = renderExplainAnswerFromSubagentEvidence("为什么刚才这样写?", {
    reviewed_refs: ["core/src/explain/index.js", "core/test/explain-contract.test.js"],
    findings: [
      { ref: "core/src/explain/index.js", summary: "Evidence packet is built before answering." },
      { ref: "core/test/explain-contract.test.js", summary: "Tests assert state/log stay unchanged." },
    ],
    unknowns: ["No live user transcript was available."],
    confidence: "grounded",
    risk_notes: ["Subagent evidence is read-only and should be verified by main Agent if surprising."],
  });

  assert.match(answer, /core\/src\/explain\/index\.js/);
  assert.match(answer, /core\/test\/explain-contract\.test\.js/);
  assert.match(answer, /No live user transcript was available/);
  assert.match(answer, /confidence: grounded/);
});

test("subagent-rendered explain answers redact secret-like packet text", () => {
  const answer = renderExplainAnswerFromSubagentEvidence("为什么刚才这样写?", {
    reviewed_refs: ["core/src/explain/index.js"],
    findings: [
      { ref: "core/src/explain/index.js", summary: "Authorization: Bearer should-not-show" },
    ],
    unknowns: [],
    confidence: "grounded",
    risk_notes: ["token=abc123"],
  });

  assert.doesNotMatch(answer, /should-not-show|abc123/);
  assert.match(answer, /\[REDACTED\]/);
});
