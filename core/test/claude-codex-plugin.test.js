import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildClaudeCodexPlanningProfiles,
  detectClaudeCodexPluginCapability,
  planClaudeCodexDelegation,
  renderClaudeCodexInstallProposal,
  validateClaudeCodexWorkerOwnership,
} from "../src/claude-codex/index.js";
import { buildClaudeAgentRoutingMetadata } from "../src/artifacts/claude.js";

function runner(responses) {
  return async (command, args) => {
    const key = `${command} ${args.join(" ")}`;
    const response = responses[key];
    if (response instanceof Error) throw response;
    assert.ok(response, `unexpected command: ${key}`);
    return response;
  };
}

test("detectClaudeCodexPluginCapability reports installed with version and path evidence", async () => {
  const result = await detectClaudeCodexPluginCapability({
    runCommand: runner({
      "claude --version": { stdout: "1.2.0\n", path: "/usr/local/bin/claude" },
      "claude plugin list --json": {
        stdout: JSON.stringify([{ name: "codex@openai-codex", version: "0.4.1", path: "/home/u/.claude/plugins/openai-codex" }]),
      },
    }),
    minVersion: "0.4.0",
  });

  assert.equal(result.status, "installed");
  assert.equal(result.capability_present, true);
  assert.equal(result.evidence.command.path, "/usr/local/bin/claude");
  assert.equal(result.evidence.plugin.matched_identity, "codex@openai-codex");
  assert.ok(result.evidence.plugin.matched_identifiers.includes("codex@openai-codex"));
  assert.equal(result.evidence.plugin.version, "0.4.1");
  assert.equal(result.evidence.plugin.path, "/home/u/.claude/plugins/openai-codex");
  assert.deepEqual(result.side_effects, []);
});

test("detectClaudeCodexPluginCapability distinguishes command unavailable, missing, and unsupported versions", async () => {
  const unavailable = new Error("spawn claude ENOENT");
  unavailable.code = "ENOENT";
  assert.equal(
    (await detectClaudeCodexPluginCapability({ runCommand: runner({ "claude --version": unavailable }) })).status,
    "command_unavailable",
  );

  const missing = await detectClaudeCodexPluginCapability({
    runCommand: runner({
      "claude --version": { stdout: "1.2.0\n", path: "/opt/bin/claude" },
      "claude plugin list --json": { stdout: JSON.stringify([{ name: "other-plugin", version: "1.0.0" }]) },
    }),
  });
  assert.equal(missing.status, "missing");
  assert.equal(missing.evidence.command.path, "/opt/bin/claude");

  const genericCodex = await detectClaudeCodexPluginCapability({
    runCommand: runner({
      "claude --version": { stdout: "1.2.0\n", path: "/opt/bin/claude" },
      "claude plugin list --json": { stdout: JSON.stringify([{ name: "codex", version: "9.9.9" }]) },
    }),
  });
  assert.equal(genericCodex.status, "missing");
  assert.equal(genericCodex.capability_present, false);

  const displayNameSpoof = await detectClaudeCodexPluginCapability({
    runCommand: runner({
      "claude --version": { stdout: "1.2.0\n", path: "/opt/bin/claude" },
      "claude plugin list --json": { stdout: JSON.stringify([{ name: "codex", displayName: "codex@openai-codex", version: "9.9.9" }]) },
    }),
  });
  assert.equal(displayNameSpoof.status, "missing");
  assert.equal(displayNameSpoof.capability_present, false);

  const officialPackage = await detectClaudeCodexPluginCapability({
    runCommand: runner({
      "claude --version": { stdout: "1.2.0\n", path: "/opt/bin/claude" },
      "claude plugin list --json": { stdout: JSON.stringify([{ name: "openai-codex", package: "@openai/codex-plugin-cc", version: "0.4.1" }]) },
    }),
    minVersion: "0.4.0",
  });
  assert.equal(officialPackage.status, "installed");
  assert.equal(officialPackage.evidence.plugin.matched_identity, "openai-codex");
  assert.ok(officialPackage.evidence.plugin.matched_identifiers.includes("@openai/codex-plugin-cc"));

  const unsupported = await detectClaudeCodexPluginCapability({
    runCommand: runner({
      "claude --version": { stdout: "1.2.0\n", path: "/opt/bin/claude" },
      "claude plugin list --json": { stdout: JSON.stringify([{ name: "codex@openai-codex", version: "0.3.9" }]) },
    }),
    minVersion: "0.4.0",
  });
  assert.equal(unsupported.status, "unsupported_version");
  assert.equal(unsupported.evidence.required_min_version, "0.4.0");
});

test("renderClaudeCodexInstallProposal requires explicit confirmation and does not execute by default", () => {
  const proposal = renderClaudeCodexInstallProposal({
    target: "Claude Code official OpenAI Codex plugin",
    scope: "user",
  });

  assert.equal(proposal.requires_confirmation, true);
  assert.equal(proposal.default_action, "do_not_execute");
  assert.equal(proposal.command_kind, "claude_slash_commands");
  assert.equal(proposal.shell_command, false);
  assert.equal(proposal.command, proposal.commands.join("\n"));
  assert.doesNotMatch(proposal.command, /&&/);
  assert.ok(proposal.commands.every((command) => command.startsWith("/")));
  assert.match(proposal.markdown, /Target: Claude Code official OpenAI Codex plugin/);
  assert.match(proposal.markdown, /`\/plugin marketplace add openai\/codex-plugin-cc`/);
  assert.match(proposal.markdown, /`\/plugin install codex@openai-codex`/);
  assert.match(proposal.markdown, /`\/codex:setup`/);
  assert.match(proposal.markdown, /External side effects:/);
  assert.match(proposal.markdown, /Rollback\/fallback:/);
});

test("planning profiles gate Codex implementation delegation on configured capability", () => {
  const profiles = buildClaudeCodexPlanningProfiles();
  assert.deepEqual(Object.keys(profiles), ["premium", "balanced", "cost_saver"]);
  assert.equal(profiles.premium.planning, "claude");
  assert.equal(profiles.premium.review, "claude");
  assert.equal(profiles.premium.test, "claude");
  assert.equal(profiles.premium.implementation, "codex");

  const missingPlan = planClaudeCodexDelegation({ profile: "premium", capability: { status: "missing" }, configured: true });
  assert.equal(missingPlan.implementation.delegate_to, "claude");
  assert.equal(missingPlan.implementation.reason, "codex capability unavailable");

  const presentPlan = planClaudeCodexDelegation({ profile: "cost_saver", capability: { status: "installed" }, configured: true });
  assert.equal(presentPlan.implementation.delegate_to, "codex");
  assert.equal(presentPlan.planning.delegate_to, "claude");
  assert.equal(presentPlan.review.delegate_to, "claude");
  assert.equal(presentPlan.test.delegate_to, "claude");
});

test("validateClaudeCodexWorkerOwnership rejects overlap and falls back to single worker without capability", () => {
  const valid = validateClaudeCodexWorkerOwnership({
    capability: { status: "installed" },
    workers: [
      { id: "worker-a", files: ["core/src/claude-codex/index.js"] },
      { id: "worker-b", files: ["references/claude-codex-plugin-spec.md"] },
    ],
  });
  assert.equal(valid.mode, "multi_worker");
  assert.equal(valid.valid, true);

  const overlap = validateClaudeCodexWorkerOwnership({
    capability: { status: "installed" },
    workers: [
      { id: "worker-a", modules: ["core/src/claude-codex"] },
      { id: "worker-b", files: ["core/src/claude-codex/index.js"] },
    ],
  });
  assert.equal(overlap.valid, false);
  assert.equal(overlap.mode, "rejected");
  assert.match(overlap.errors[0], /overlap/i);

  const windowsOverlap = validateClaudeCodexWorkerOwnership({
    capability: { status: "installed" },
    workers: [
      { id: "worker-a", modules: ["core\\src\\claude-codex"] },
      { id: "worker-b", files: ["core\\src\\claude-codex\\index.js"] },
    ],
  });
  assert.equal(windowsOverlap.valid, false);
  assert.equal(windowsOverlap.mode, "rejected");
  assert.match(windowsOverlap.errors[0], /overlap/i);

  const windowsCaseOverlap = validateClaudeCodexWorkerOwnership({
    capability: { status: "installed" },
    workers: [
      { id: "worker-a", modules: ["Core\\Src\\Claude-Codex"] },
      { id: "worker-b", files: ["core\\src\\claude-codex\\index.js"] },
    ],
  });
  assert.equal(windowsCaseOverlap.valid, false);
  assert.equal(windowsCaseOverlap.mode, "rejected");
  assert.match(windowsCaseOverlap.errors[0], /overlap/i);

  const normalizedOverlap = validateClaudeCodexWorkerOwnership({
    capability: { status: "installed" },
    workers: [
      { id: "worker-a", modules: ["./core//src/claude-codex/"] },
      { id: "worker-b", files: ["core/src/claude-codex///index.js"] },
    ],
  });
  assert.equal(normalizedOverlap.valid, false);
  assert.equal(normalizedOverlap.mode, "rejected");
  assert.match(normalizedOverlap.errors[0], /overlap/i);

  const dotSegmentOverlap = validateClaudeCodexWorkerOwnership({
    capability: { status: "installed" },
    workers: [
      { id: "worker-a", modules: ["././core/src/tmp/../claude-codex"] },
      { id: "worker-b", files: ["core/src/claude-codex/./index.js"] },
    ],
  });
  assert.equal(dotSegmentOverlap.valid, false);
  assert.equal(dotSegmentOverlap.mode, "rejected");
  assert.match(dotSegmentOverlap.errors[0], /overlap/i);

  const fallback = validateClaudeCodexWorkerOwnership({
    capability: { status: "missing" },
    workers: [
      { id: "worker-a", files: ["a.js"] },
      { id: "worker-b", files: ["b.js"] },
    ],
  });
  assert.equal(fallback.mode, "single_worker");
  assert.equal(fallback.valid, true);
});

test("Claude routing metadata does not synthesize Codex capability from configuration alone", () => {
  const metadata = buildClaudeAgentRoutingMetadata({
    claude_code: {
      codex_plugin: {
        enabled: true,
        profile: "balanced",
      },
    },
  });

  assert.equal(metadata.codex_plugin.configured, true);
  assert.equal(metadata.codex_plugin.profile, "balanced");
  assert.equal(metadata.codex_plugin.capability_status, "missing");
  assert.equal(metadata.codex_plugin.capability_source, "not_detected");
  assert.equal(metadata.codex_plugin.delegation.implementation.delegate_to, "claude");
  assert.equal(metadata.codex_plugin.delegation.implementation.reason, "codex capability unavailable");
  assert.equal(metadata.codex_plugin.delegation.planning.delegate_to, "claude");
  assert.equal(metadata.codex_plugin.delegation.review.delegate_to, "claude");
  assert.equal(metadata.codex_plugin.delegation.test.delegate_to, "claude");
});

test("Claude routing metadata delegates to Codex only with installed capability evidence", () => {
  const metadata = buildClaudeAgentRoutingMetadata({
    claude_code: {
      codex_plugin: {
        enabled: true,
        profile: "balanced",
        capability: { status: "installed", source: "test-detection" },
      },
    },
  });

  assert.equal(metadata.codex_plugin.configured, true);
  assert.equal(metadata.codex_plugin.profile, "balanced");
  assert.equal(metadata.codex_plugin.capability_status, "installed");
  assert.equal(metadata.codex_plugin.capability_source, "test-detection");
  assert.equal(metadata.codex_plugin.delegation.implementation.delegate_to, "codex");
  assert.equal(metadata.codex_plugin.delegation.implementation.requires_capability, "installed");
  assert.equal(metadata.codex_plugin.delegation.planning.delegate_to, "claude");
  assert.equal(metadata.codex_plugin.delegation.review.delegate_to, "claude");
  assert.equal(metadata.codex_plugin.delegation.test.delegate_to, "claude");
});

test("Claude Codex plugin reference documents safety contract", async () => {
  const spec = await readFile("references/claude-codex-plugin-spec.md", "utf8");

  assert.match(spec, /installed\/missing\/command_unavailable\/unsupported_version/);
  assert.match(spec, /No install command is executed by default/);
  assert.match(spec, /premium/);
  assert.match(spec, /balanced/);
  assert.match(spec, /cost_saver/);
  assert.match(spec, /disjoint file\/module ownership/);
});
