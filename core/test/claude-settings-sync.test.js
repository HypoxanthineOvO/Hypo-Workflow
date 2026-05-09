import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  mergeClaudeCodeSettings,
  runProjectSync,
  writeConfig,
} from "../src/index.js";

const NOW = "2026-05-05T07:30:00.000Z";

test("claude-code sync creates settings and root plugin metadata for an empty project", async () => {
  const root = await fixtureRoot();
  const result = await runProjectSync(root, { mode: "standard", platform: "claude-code", now: NOW });

  const settings = await readJson(join(root, ".claude", "settings.local.json"));

  assert.ok(result.operations.includes("claude_code_plugin"));
  assert.ok(result.operations.includes("claude_code_hooks"));
  assert.ok(result.operations.includes("claude_code_settings"));
  assert.equal(result.external_changes.find((change) => change.type === "adapter_missing")?.path, ".claude/settings.local.json");
  assert.equal(result.claude_code_settings.changed, true);
  assert.deepEqual(result.claude_code_settings.conflicts, []);
  assert.equal(result.claude_code_settings.manual_confirmation_required, false);
  assert.equal(settings.hypo_workflow.managed_by, "hypo-workflow");
  assert.equal(settings.model, "deepseek-v4-pro");
  assert.ok(settings.hypo_workflow.managed_keys.includes("model"));
  assert.ok(settings.hooks.Stop.some((group) => group.hypo_workflow_managed === true));
  assert.equal(result.claude_code_plugin.namespace, "hw");
  assert.equal(result.claude_code_plugin.command_namespace, "/hw");
  assert.equal(await exists(join(root, ".claude-plugin", "plugin.json")), true);
  assert.equal(await exists(join(root, "hooks", "claude-hook.mjs")), true);
  assert.match(await readFile(join(root, "hooks", "claude-hook.mjs"), "utf8"), /hypo_workflow_managed_hook: true/);
  assert.deepEqual(result.claude_code_settings.backups, []);
});

test("claude-code settings merge preserves user settings, backs up first mutation, and is idempotent", async () => {
  const root = await fixtureRoot();
  await mkdir(join(root, ".claude"), { recursive: true });
  await writeFile(
    join(root, ".claude", "settings.local.json"),
    JSON.stringify({
      env: { USER_FLAG: "keep" },
      plugins: ["../custom/plugin.json"],
      hooks: {
        PreToolUse: [
          {
            matcher: "Write",
            hooks: [{ type: "command", command: "echo user-hook" }],
          },
        ],
      },
    }, null, 2),
    "utf8",
  );

  const first = await runProjectSync(root, { mode: "standard", platform: "claude-code", now: NOW });
  const settings = await readJson(join(root, ".claude", "settings.local.json"));
  const backupFiles = await listSettingsBackups(root);

  assert.equal(first.claude_code_settings.changed, true);
  assert.equal(first.claude_code_settings.backups.length, 1);
  assert.deepEqual(first.claude_code_settings.backups, backupFiles.map((name) => `.claude/${name}`));
  assert.equal(settings.env.USER_FLAG, "keep");
  assert.equal(settings.model, "deepseek-v4-pro");
  assert.ok(settings.plugins.includes("../custom/plugin.json"));
  assert.equal(settings.hooks.PreToolUse[0].hooks[0].command, "echo user-hook");

  const afterFirst = await readFile(join(root, ".claude", "settings.local.json"), "utf8");
  const second = await runProjectSync(root, {
    mode: "standard",
    platform: "claude-code",
    now: "2026-05-05T07:31:00.000Z",
  });
  const afterSecond = await readFile(join(root, ".claude", "settings.local.json"), "utf8");

  assert.equal(second.claude_code_settings.changed, false);
  assert.deepEqual(second.claude_code_settings.backups, []);
  assert.equal(afterSecond, afterFirst);
  assert.deepEqual(await listSettingsBackups(root), backupFiles);
});

test("claude-code settings writes project-local API env from config", async () => {
  const root = await fixtureRoot();
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    pipeline: { name: "Claude Sync Fixture" },
    claude_code: {
      model: "deepseek-v4-pro",
      api: {
        base_url_env: "HW_TEST_DEEPSEEK_BASE_URL",
        api_key_env: "HW_TEST_DEEPSEEK_KEY",
      },
      settings: {
        local_file: ".claude/settings.local.json",
        backup: true,
        managed_marker: "hypo-workflow",
      },
    },
  });
  await mkdir(join(root, ".claude"), { recursive: true });
  await writeFile(
    join(root, ".claude", "settings.local.json"),
    JSON.stringify({ env: { USER_FLAG: "keep" } }, null, 2),
    "utf8",
  );

  const result = await runProjectSync(root, {
    mode: "standard",
    platform: "claude-code",
    now: NOW,
    env: {
      HW_TEST_DEEPSEEK_BASE_URL: "https://deepseek-proxy.example",
      HW_TEST_DEEPSEEK_KEY: "sk-test-deepseek",
    },
  });
  const settings = await readJson(join(root, ".claude", "settings.local.json"));

  assert.equal(result.claude_code_settings.changed, true);
  assert.equal(settings.env.USER_FLAG, "keep");
  assert.equal(settings.env.ANTHROPIC_BASE_URL, "https://deepseek-proxy.example");
  assert.equal(settings.env.ANTHROPIC_API_KEY, "sk-test-deepseek");
  assert.ok(settings.hypo_workflow.managed_keys.includes("env.ANTHROPIC_BASE_URL"));
  assert.ok(settings.hypo_workflow.managed_keys.includes("env.ANTHROPIC_API_KEY"));
});

test("claude-code settings blocks user-owned API env conflicts", async () => {
  const root = await fixtureRoot();
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    pipeline: { name: "Claude Sync Fixture" },
    claude_code: {
      api: {
        base_url: "https://deepseek-proxy.example",
        api_key: "sk-managed",
      },
    },
  });
  await mkdir(join(root, ".claude"), { recursive: true });
  const original = {
    env: {
      ANTHROPIC_BASE_URL: "https://user-owned.example",
      ANTHROPIC_API_KEY: "sk-user-owned",
    },
  };
  await writeFile(join(root, ".claude", "settings.local.json"), JSON.stringify(original, null, 2), "utf8");

  const result = await runProjectSync(root, { mode: "standard", platform: "claude-code", now: NOW });
  const after = await readJson(join(root, ".claude", "settings.local.json"));

  assert.equal(result.claude_code_settings.changed, false);
  assert.equal(result.claude_code_settings.manual_confirmation_required, true);
  assert.deepEqual(result.claude_code_settings.conflicts.map((conflict) => conflict.code), ["env-conflict", "env-conflict"]);
  assert.deepEqual(after, original);
});

test("claude-code settings replaces previously managed API env", () => {
  const merged = mergeClaudeCodeSettings({
    env: {
      ANTHROPIC_BASE_URL: "https://old.example",
      ANTHROPIC_API_KEY: "sk-old",
    },
    hypo_workflow: {
      managed_by: "hypo-workflow",
      managed_keys: ["env.ANTHROPIC_BASE_URL", "env.ANTHROPIC_API_KEY"],
    },
  }, {
    config: {
      claude_code: {
        model: "deepseek-v4-pro",
        api: {
          base_url: "https://deepseek-proxy.example",
          api_key: "sk-new",
        },
      },
    },
  });

  assert.equal(merged.changed, true);
  assert.deepEqual(merged.conflicts, []);
  assert.equal(merged.settings.env.ANTHROPIC_BASE_URL, "https://deepseek-proxy.example");
  assert.equal(merged.settings.env.ANTHROPIC_API_KEY, "sk-new");
});

test("claude-code settings merge replaces existing Hypo managed hook blocks", async () => {
  const existing = {
    plugins: ["../.claude-plugin/plugin.json", "../custom/plugin.json"],
    hooks: {
      Stop: [
        {
          hypo_workflow_managed: true,
          matcher: "",
          hooks: [{ type: "command", command: "bash hooks/old-stop.sh", timeout: 1 }],
        },
      ],
    },
    hypo_workflow: {
      managed_by: "hypo-workflow",
      managed_keys: ["plugins", "hooks.Stop"],
    },
  };

  const merged = mergeClaudeCodeSettings(existing, { now: NOW });

  assert.equal(merged.changed, true);
  assert.deepEqual(merged.conflicts, []);
  assert.deepEqual(merged.settings.plugins, ["../custom/plugin.json"]);
  assert.equal(merged.settings.hooks.Stop.length, 1);
  assert.equal(merged.settings.hooks.Stop[0].hooks[0].command, "node hooks/claude-hook.mjs Stop");
});

test("claude-code settings conflicts block silent overwrite of user-owned managed targets", async () => {
  const root = await fixtureRoot();
  await mkdir(join(root, ".claude"), { recursive: true });
  const original = {
    hooks: {
      Stop: [
        {
          matcher: "",
          hooks: [{ type: "command", command: "node hooks/claude-hook.mjs Stop", timeout: 5000 }],
        },
      ],
    },
  };
  await writeFile(join(root, ".claude", "settings.local.json"), JSON.stringify(original, null, 2), "utf8");

  const result = await runProjectSync(root, { mode: "standard", platform: "claude-code", now: NOW });
  const after = await readJson(join(root, ".claude", "settings.local.json"));

  assert.equal(result.claude_code_settings.changed, false);
  assert.equal(result.claude_code_settings.manual_confirmation_required, true);
  assert.equal(result.claude_code_settings.conflicts[0].code, "hook-command-conflict");
  assert.deepEqual(after, original);
  assert.deepEqual(await listSettingsBackups(root), []);
});

test("claude-code settings conflict on user-owned main model", async () => {
  const root = await fixtureRoot();
  await mkdir(join(root, ".claude"), { recursive: true });
  const original = { model: "opus" };
  await writeFile(join(root, ".claude", "settings.local.json"), JSON.stringify(original, null, 2), "utf8");

  const result = await runProjectSync(root, { mode: "standard", platform: "claude-code", now: NOW });
  const after = await readJson(join(root, ".claude", "settings.local.json"));

  assert.equal(result.claude_code_settings.changed, false);
  assert.equal(result.claude_code_settings.manual_confirmation_required, true);
  assert.equal(result.claude_code_settings.conflicts[0].code, "model-conflict");
  assert.deepEqual(after, original);
});

test("claude-code settings replaces previously managed main model", () => {
  const merged = mergeClaudeCodeSettings({
    model: "old-main-model",
    hypo_workflow: {
      managed_by: "hypo-workflow",
      managed_keys: ["model"],
    },
  }, { config: { claude_code: { model: "deepseek-v4-pro" } } });

  assert.equal(merged.changed, true);
  assert.deepEqual(merged.conflicts, []);
  assert.equal(merged.settings.model, "deepseek-v4-pro");
});

test("hypo-workflow sync CLI supports --platform claude-code", async () => {
  const root = await fixtureRoot();
  const home = await mkdtemp(join(tmpdir(), "hw-claude-cli-home-"));
  const output = execFileSync(process.execPath, ["cli/bin/hypo-workflow", "sync", "--platform", "claude-code", "--project", root], {
    cwd: ".",
    env: { ...process.env, HOME: home },
    encoding: "utf8",
  });

  assert.match(output, /mode=standard/);
  assert.match(output, /claude_code_settings/);
  assert.equal(await exists(join(root, "hooks", "claude-hook.mjs")), true);
  assert.equal(await exists(join(root, ".claude", "settings.local.json")), true);
});

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "hw-claude-sync-"));
  await mkdir(join(root, ".pipeline"), { recursive: true });
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    pipeline: { name: "Claude Sync Fixture" },
    execution: { mode: "self", steps: { preset: "tdd" } },
    claude_code: {
      settings: {
        local_file: ".claude/settings.local.json",
        backup: true,
        managed_marker: "hypo-workflow",
      },
    },
  });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { status: "running" },
    current: { prompt_name: "M03 / Claude Sync" },
  });
  return root;
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function exists(file) {
  try {
    await readFile(file, "utf8");
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function listSettingsBackups(root) {
  let entries = [];
  try {
    entries = await readdir(join(root, ".claude"));
  } catch {
    return [];
  }
  return entries.filter((name) => name.startsWith("settings.local.json.bak.")).sort();
}
