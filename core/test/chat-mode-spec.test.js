import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("chat spec and commands spec document /hw:chat append mode", async () => {
  const commandsSpec = await readFile("references/commands-spec.md", "utf8");
  const chatSpec = await readFile("references/chat-spec.md", "utf8");

  for (const phrase of [
    "/hw:chat",
    "/hw:chat end",
    "state.yaml + cycle.yaml + PROGRESS.md + recent report",
    "chat.active == true",
    "chat log rather than Milestone report",
    "upgrade to Patch",
  ]) {
    assert.match(chatSpec, new RegExp(escapeRegExp(phrase), "i"));
  }

  assert.match(commandsSpec, /\/hw:chat/);
});

test("state contract defines optional chat session state without replacing cycle or patch state", async () => {
  const stateSpec = await readFile("references/state-contract.md", "utf8");

  for (const phrase of [
    "chat:",
    "active",
    "session_id",
    "started_at",
    "last_activity_at",
    "summary_policy",
    "related_cycle",
    "recent_files",
    "chat mode does not replace",
    "Cycle / Milestone / Patch",
  ]) {
    assert.match(stateSpec, new RegExp(escapeRegExp(phrase), "i"));
  }
});

test("log and progress specs define chat entries and board-style chat timeline rows", async () => {
  const logSpec = await readFile("references/log-spec.md", "utf8");
  const progressSpec = await readFile("references/progress-spec.md", "utf8");

  for (const phrase of [
    "chat_entry",
    "chat_session",
    "chat summary",
    "recent report",
    "Stop Hook",
  ]) {
    assert.match(logSpec, new RegExp(escapeRegExp(phrase), "i"));
  }

  for (const phrase of [
    "Chat 前缀",
    "💬 Chat",
    "board-style",
    "chat session",
    "do not create a separate append-only chat transcript section",
  ]) {
    assert.match(progressSpec, new RegExp(escapeRegExp(phrase), "i"));
  }
});

test("hooks document chat recovery and stop-time summary fallback", async () => {
  const sessionStart = await readFile("hooks/session-start.sh", "utf8");
  const stopHook = await readFile("hooks/stop-check.sh", "utf8");
  const hooksReadme = await readFile("hooks/README.md", "utf8");

  for (const phrase of [
    "chat.active == true",
    "/hw:chat",
    "recent report",
    "Chat Recovery",
  ]) {
    assert.match(sessionStart + hooksReadme, new RegExp(escapeRegExp(phrase), "i"));
  }

  for (const phrase of [
    "chat summary",
    "chat_entry",
    "Patch escalation",
    "auto summary",
  ]) {
    assert.match(stopHook + hooksReadme, new RegExp(escapeRegExp(phrase), "i"));
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("OpenCode command map includes /hw:chat mapping", async () => {
  const map = await readFile("references/opencode-command-map.md", "utf8");
  const spec = await readFile("references/opencode-spec.md", "utf8");

  assert.match(map, /`\/hw:chat`\s*\|\s*`\/hw:chat`\s*\|\s*`hw-build`\s*\|\s*`skills\/chat\/SKILL\.md`/);
  assert.match(spec, /`\/hw:chat`\s*\|\s*`\/hw:chat`\s*\|\s*`hw-build`/);
});
