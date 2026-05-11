import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("references document human response, plan audit, and automation whitelist contracts", async () => {
  const commands = await readFile("references/commands-spec.md", "utf8");
  const progressive = await readFile("references/progressive-discover-spec.md", "utf8");
  const config = await readFile("references/config-spec.md", "utf8");

  assert.match(commands, /conclusion/);
  assert.match(commands, /explanation/);
  assert.match(commands, /next steps/);
  assert.match(commands, /manual/i);

  for (const field of [
    "audit_target",
    "risk_hypotheses",
    "test_scenarios",
    "evidence_required",
    "independent_validator",
    "manual_checks",
    "known_limits",
  ]) {
    assert.match(progressive, new RegExp(field));
  }
  assert.match(progressive, /generalize the underlying requirement/);

  assert.match(config, /automation\.local_whitelist/);
  assert.match(config, /safe_local/);
  assert.match(config, /stateful_local/);
  assert.match(config, /external/);
  assert.match(config, /restart_dev_server/);
  assert.match(config, /remote_pr_write/);
});
