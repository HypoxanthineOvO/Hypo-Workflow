import test from "node:test";
import assert from "node:assert/strict";
import { commandByCanonical, commandMap } from "../src/index.js";

const MAINTAIN_SUBCOMMANDS = Object.freeze([
  "status",
  "scan",
  "plan",
  "queue",
  "run",
  "apply",
  "verify",
  "log",
]);

test("/hw:maintain command family is exposed as first-class canonical commands", () => {
  const commands = commandMap("opencode");
  const canonical = new Set(commands.map((command) => command.canonical));

  assert.ok(canonical.has("/hw:maintain"), "expected /hw:maintain root command");
  for (const subcommand of MAINTAIN_SUBCOMMANDS) {
    assert.ok(
      canonical.has(`/hw:maintain ${subcommand}`),
      `expected /hw:maintain ${subcommand} command`,
    );
  }

  const maintain = commandByCanonical("/hw:maintain");
  assert.equal(maintain.opencode, "/hw-maintain");
  assert.equal(maintain.agent, "hw-build");
  assert.equal(maintain.route, "maintenance");
  assert.equal(maintain.skill, "skills/maintain/SKILL.md");
});

test("/hw:maintain family remains separated from /hw:sync", () => {
  const sync = commandByCanonical("/hw:sync");
  const maintain = commandByCanonical("/hw:maintain");

  assert.ok(sync, "expected existing /hw:sync command");
  assert.ok(maintain, "expected /hw:maintain command");
  assert.notEqual(maintain.canonical, sync.canonical);
  assert.notEqual(maintain.opencode, sync.opencode);
  assert.notEqual(maintain.skill, sync.skill);
  assert.equal(sync.route, "tool");
  assert.equal(maintain.route, "maintenance");

  for (const subcommand of MAINTAIN_SUBCOMMANDS) {
    const command = commandByCanonical(`/hw:maintain ${subcommand}`);
    assert.equal(command.route, "maintenance");
    assert.equal(command.skill, "skills/maintain/SKILL.md");
    assert.match(command.opencode, new RegExp(`^/hw-maintain-${subcommand}$`));
  }
});
