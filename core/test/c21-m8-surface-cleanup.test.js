import test from "node:test";
import assert from "node:assert/strict";
import {
  lstat,
  mkdtemp,
  readFile,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as api from "../src/index.js";
import { parseFrontmatter } from "../src/serialization/index.js";
import {
  snapshotTree,
  writeText,
} from "./fixtures/c21-m2/helpers.js";
import {
  ACTOR,
  exists,
  overwrite,
  runGit,
  temporaryGitWorkspace,
} from "./fixtures/c21-m7/helpers.js";

const REPOSITORY_ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const PUBLIC_ROUTES = new Map([
  ["/hw:guide", "skills/guide/SKILL.md"],
  ["/hw:init", "skills/init/SKILL.md"],
  ["/hw:goal", "skills/goal/SKILL.md"],
  ["/hw:plan", "skills/plan/SKILL.md"],
  ["/hw:cycle", "skills/cycle/SKILL.md"],
  ["/hw:maintain", "skills/maintain/SKILL.md"],
  ["/hw:resume", "skills/resume/SKILL.md"],
  ["/hw:accept", "skills/accept/SKILL.md"],
  ["/hw:reject", "skills/reject/SKILL.md"],
]);
const INTERNAL_ROUTES = Object.freeze([
  "/hw:chat",
  "/hw:explain",
  "/hw:status",
  "/hw:report",
  "/hw:log",
  "/hw:check",
  "/hw:compact",
  "/hw:knowledge",
  "/hw:sync",
  "/hw:debug",
  "/hw:start",
  "/hw:plan:deep",
  "/hw:plan:discover",
  "/hw:plan:technical-stack",
  "/hw:plan:architecture",
  "/hw:plan:decompose",
  "/hw:plan:generate",
  "/hw:plan:extend",
  "/hw:plan:review",
]);
const DEFERRED_ROUTES = Object.freeze([
  "/hw:analysis",
  "/hw:audit",
  "/hw:quality",
  "/hw:docs",
  "/hw:pr",
  "/hw:release",
  "/hw:explore",
  "/hw:optimize",
]);
const REMOVED_ROUTES = Object.freeze([
  "/hw:setup",
  "/hw:rules",
  "/hw:stop",
  "/hw:skip",
  "/hw:reset",
  "/hw:showcase",
  "/hw:patch",
  "/hw:help",
  "/hw:watchdog",
  "/hw:plan:confirm",
]);
const PUBLIC_SKILL_FILES = [...PUBLIC_ROUTES.values()].sort();

test("Codex Plugin filesystem discovery and Registry projection expose exactly the same nine routes", async () => {
  const discoveredSkills = await discoverPluginSkills(REPOSITORY_ROOT);
  const physicalPaths = discoveredSkills.map((entry) => entry.path).sort();
  assert.deepEqual(
    physicalPaths,
    PUBLIC_SKILL_FILES,
    "the Plugin skills root must not make internal, deferred, or removed Child Skills discoverable",
  );
  assert.equal(new Set(discoveredSkills.map((entry) => entry.name)).size, discoveredSkills.length);
  for (const skill of discoveredSkills) {
    assert.ok(skill.name, `${skill.path} requires a non-empty Skill name`);
    assert.ok(skill.description, `${skill.path} requires a non-empty Skill description`);
  }

  const projected = await api.discoverableCommandMap("codex", { skillRoot: REPOSITORY_ROOT });
  assert.deepEqual(
    new Map(projected.map((command) => [command.canonical, command.skill])),
    PUBLIC_ROUTES,
    "authoritative Registry discovery must agree with the actual Plugin filesystem",
  );
});

test("internal behavior is not advertised, deferred/removed commands are zero-write, and start stays contextual", async (t) => {
  const root = await temporaryDirectory(t, "hw-c21-m8-route-");
  await writeText(join(root, "sentinel.txt"), "route checks must not mutate the target\n");
  const before = await treeHash(root);
  const discovered = new Set((await api.discoverableCommandMap("codex", {
    repoRoot: root,
    skillRoot: REPOSITORY_ROOT,
  })).map((command) => command.canonical));

  for (const route of INTERNAL_ROUTES) {
    assert.equal(discovered.has(route), false, `${route} must not be advertised`);
    const result = await api.resolveCommandRoute(route, { repoRoot: root, skillRoot: REPOSITORY_ROOT });
    assert.ok(["internal", "unknown"].includes(result.status), `${route} resolved as ${result.status}`);
    assert.notEqual(result.status, "available", `${route} must not be directly executable`);
    assert.deepEqual(result.writes ?? [], [], route);
  }

  for (const route of DEFERRED_ROUTES) {
    assert.equal(discovered.has(route), false, `${route} must be hidden while deferred`);
    const result = await api.resolveCommandRoute(route, { repoRoot: root, skillRoot: REPOSITORY_ROOT });
    assert.ok(["deferred", "unknown"].includes(result.status), `${route} resolved as ${result.status}`);
    assert.notEqual(result.status, "available", `${route} must not execute in C21`);
    assert.deepEqual(result.writes ?? [], [], route);
  }

  for (const route of REMOVED_ROUTES) {
    assert.equal(discovered.has(route), false, `${route} must not be advertised`);
    const result = await api.resolveCommandRoute(route, { repoRoot: root, skillRoot: REPOSITORY_ROOT });
    assert.ok(["removed", "unknown"].includes(result.status), `${route} resolved as ${result.status}`);
    assert.notEqual(result.status, "available", `${route} must not retain an executable backend`);
    assert.deepEqual(result.writes ?? [], [], route);
  }

  const start = await api.resolveWorkflowIntent("开始执行", {
    repoRoot: root,
    skillRoot: REPOSITORY_ROOT,
    active_delivery: { status: "waiting_to_start" },
  });
  assert.equal(start.status, "available");
  assert.equal(start.canonical, "/hw:start");
  assert.equal(start.authority_intent, "delivery.start");
  assert.equal(start.discoverable, false);
  assert.deepEqual(start.writes, []);
  assert.equal(await treeHash(root), before, "routing diagnostics must remain byte-for-byte zero-write");
});

test("maintained sync and legacy generator entry points cannot revive retired surfaces", async (t) => {
  const cases = [
    ["runProjectSync", (root) => api.runProjectSync(root, {
      mode: "standard",
      platform: "opencode",
      homeDir: join(root, ".home"),
      userConfigFile: join(root, ".home", "config.yaml"),
    })],
    ["writeOpenCodeArtifacts", (root) => api.writeOpenCodeArtifacts(root)],
    ["writeClaudeCodePluginArtifacts", (root) => api.writeClaudeCodePluginArtifacts(root)],
    ["writeThirdPartyAdapterArtifacts", (root) => api.writeThirdPartyAdapterArtifacts(root, { platform: "cursor" })],
    ["writeCursorSkillBundle", (root) => api.writeCursorSkillBundle(root)],
  ];

  for (const [name, invoke] of cases) {
    await t.test(name, async (subtest) => {
      if (typeof api[name] !== "function") return;
      const root = await temporaryLegacyWorkspace(subtest, `hw-c21-m8-${name}-`);
      const before = await treeHash(root);
      try {
        await invoke(root);
      } catch (error) {
        assert.match(
          String(error.message || error),
          /retired|removed|unsupported|legacy|current|manifest|writer|deferred/i,
          `${name} rejection should explain why the old writer is unavailable`,
        );
      }
      assert.equal(
        await treeHash(root),
        before,
        `${name} recreated a Skill/command/TUI/Rules/Patch/Watchdog or another legacy artifact`,
      );
    });
  }
});

test("read-only sync checks do not mutate a temporary workspace", async (t) => {
  if (typeof api.runProjectSync !== "function") return;
  const root = await temporaryLegacyWorkspace(t, "hw-c21-m8-sync-check-");
  const before = await treeHash(root);
  const result = await api.runProjectSync(root, {
    mode: "standard",
    checkOnly: true,
    homeDir: join(root, ".home"),
    userConfigFile: join(root, ".home", "config.yaml"),
  });
  assert.equal(result.check_only, true);
  assert.equal(await treeHash(root), before);
});

test("Deletion executor rejects path hash drift, Git drift, extra paths, protected paths, and Receipt reuse", async (t) => {
  await t.test("path-hash-drift", async (subtest) => {
    const root = await temporaryGitWorkspace(subtest, "hw-c21-m8-delete-hash-");
    const manifest = await manifestFor(root, ["docs/obsolete.md"]);
    const receiptId = await issueDeletionReceipt(root, manifest, "m8-delete-hash");
    await overwrite(join(root, "docs/obsolete.md"), "changed after authorization\n");
    await assert.rejects(
      () => execute(root, manifest, receiptId, "m8-delete-hash"),
      /drift|hash|manifest|target/i,
    );
    assert.equal(await exists(join(root, "docs/obsolete.md")), true);
  });

  await t.test("git-baseline-drift", async (subtest) => {
    const root = await temporaryGitWorkspace(subtest, "hw-c21-m8-delete-git-");
    const manifest = await manifestFor(root, ["docs/obsolete.md"]);
    const receiptId = await issueDeletionReceipt(root, manifest, "m8-delete-git");
    await overwrite(join(root, "src", "new-baseline.js"), "export const baseline = 2;\n");
    runGit(root, ["add", "src/new-baseline.js"]);
    runGit(root, ["commit", "-qm", "change Git baseline"]);
    await assert.rejects(
      () => execute(root, manifest, receiptId, "m8-delete-git"),
      /drift|git|manifest|receipt/i,
    );
    assert.equal(await exists(join(root, "docs/obsolete.md")), true);
  });

  await t.test("extra-path-manifest-substitution", async (subtest) => {
    const root = await temporaryGitWorkspace(subtest, "hw-c21-m8-delete-extra-");
    await overwrite(join(root, "docs", "extra.md"), "must remain\n");
    runGit(root, ["add", "docs/extra.md"]);
    runGit(root, ["commit", "-qm", "add second deletion candidate"]);
    const authorized = await manifestFor(root, ["docs/obsolete.md"]);
    const substituted = await manifestFor(root, ["docs/extra.md", "docs/obsolete.md"]);
    const receiptId = await issueDeletionReceipt(root, authorized, "m8-delete-extra");
    await assert.rejects(
      () => execute(root, substituted, receiptId, "m8-delete-extra"),
      /receipt|scope|plan|manifest|binding|mismatch/i,
    );
    assert.equal(await exists(join(root, "docs/obsolete.md")), true);
    assert.equal(await exists(join(root, "docs/extra.md")), true);
  });

  await t.test("protected-path", async (subtest) => {
    const root = await temporaryGitWorkspace(subtest, "hw-c21-m8-delete-protected-");
    const before = await treeHash(root);
    await assert.rejects(
      () => manifestFor(root, [".pipeline/runtime/recovery"]),
      /protected|authority|recovery|evidence/i,
    );
    assert.equal(await treeHash(root), before, "protected path rejection must be zero-write");
  });

  await t.test("single-use-receipt", async (subtest) => {
    const root = await temporaryGitWorkspace(subtest, "hw-c21-m8-delete-reuse-");
    const target = join(root, "docs/obsolete.md");
    const original = await readFile(target, "utf8");
    const manifest = await manifestFor(root, ["docs/obsolete.md"]);
    const receiptId = await issueDeletionReceipt(root, manifest, "m8-delete-reuse");
    const first = await execute(root, manifest, receiptId, "m8-delete-reuse-first");
    assert.deepEqual(first.deleted_paths, ["docs/obsolete.md"]);
    assert.equal(await exists(target), false);

    await overwrite(target, original);
    await assert.rejects(
      () => execute(root, manifest, receiptId, "m8-delete-reuse-second"),
      /receipt|consumed|state|reuse/i,
    );
    assert.equal(await exists(target), true, "a reused Receipt must not delete a recreated exact target");
    assert.equal((await api.readReceipt(root, receiptId)).state, "consumed");
  });
});

test("Root Skill, Plugin metadata, and current Codex docs describe the replacement architecture", async (t) => {
  const currentDocs = [
    "README.md",
    "README.en.md",
    "docs/platforms/codex.md",
    "docs/en/platforms/codex.md",
    "docs/reference/commands.md",
    "docs/en/reference/commands.md",
  ];
  const docs = new Map(await Promise.all(currentDocs.map(async (path) => [
    path,
    await readFile(join(REPOSITORY_ROOT, path), "utf8"),
  ])));

  await t.test("Root Skill links only discoverable Child Skills", async () => {
    const rootSkill = await readFile(join(REPOSITORY_ROOT, "SKILL.md"), "utf8");
    const linkedSkills = [...rootSkill.matchAll(/skills\/([^/\s)]+)\/SKILL\.md/g)]
      .map((match) => `skills/${match[1]}/SKILL.md`);
    assert.deepEqual([...new Set(linkedSkills)].sort(), PUBLIC_SKILL_FILES);
  });

  await t.test("Plugin metadata has no active legacy capability claim", async () => {
    const plugin = JSON.parse(await readFile(join(REPOSITORY_ROOT, ".codex-plugin/plugin.json"), "utf8"));
    const pluginClaims = JSON.stringify(plugin);
    assert.doesNotMatch(pluginClaims, /(?:\/hw:)?(?:setup|dashboard|watchdog|rules)|53\s+commands|six[- ]platform/i);
  });

  for (const [path, source] of docs) {
    await t.test(`${path} has no active legacy claim`, () => assertNoActiveLegacyClaims(path, source));
  }

  for (const path of ["README.md", "README.en.md", "docs/reference/commands.md", "docs/en/reference/commands.md"]) {
    await t.test(`${path} advertises exactly nine routes`, () => {
      assert.deepEqual(
        [...extractAdvertisedRoutes(docs.get(path))].sort(),
        [...PUBLIC_ROUTES.keys()].sort(),
        `${path} must advertise the same nine routes as the Plugin and Registry`,
      );
    });
  }

  for (const path of ["README.md", "README.en.md"]) {
    await t.test(`${path} presents Codex as current and explains C21 authority`, () => {
      assertCurrentPlatformRows(path, docs.get(path));
      assert.match(docs.get(path), /manifest\.yaml/i, `${path} must introduce the manifest authority`);
      assert.match(docs.get(path), /Record/i, `${path} must explain Records as the Rules/Patch replacement`);
      assert.match(docs.get(path), /Receipt/i, `${path} must explain scoped authorization`);
      assert.match(docs.get(path), /Recovery/i, `${path} must explain restart/compact recovery`);
    });
  }

  for (const path of ["docs/platforms/codex.md", "docs/en/platforms/codex.md"]) {
    await t.test(`${path} documents the current Hook and Receipt boundary`, () => {
      const source = docs.get(path);
      assert.match(source, /SessionStart/);
      assert.match(source, /PreCompact/);
      assert.match(source, /SubagentStart/);
      assert.match(source, /Receipt/);
      assert.doesNotMatch(source, /events?\/hooks?:\s*limited/i);
    });
  }
});

async function discoverPluginSkills(root) {
  const manifest = JSON.parse(await readFile(join(root, ".codex-plugin/plugin.json"), "utf8"));
  const declared = Array.isArray(manifest.skills) ? manifest.skills : [manifest.skills];
  assert.ok(declared.length > 0 && declared.every((entry) => typeof entry === "string" && entry.trim()));
  const discovered = [];
  for (const entry of declared) {
    const target = resolve(root, entry);
    assert.equal(isInside(root, target), true, `Plugin Skill path escapes repository: ${entry}`);
    const stats = await lstat(target);
    assert.equal(stats.isSymbolicLink(), false, `Plugin Skill path is a symlink: ${entry}`);
    if (stats.isFile()) {
      await collectSkill(root, target, discovered);
    } else {
      assert.equal(stats.isDirectory(), true, `Plugin Skill path is not a file or directory: ${entry}`);
      await walkSkills(root, target, discovered);
    }
  }
  return discovered.sort((left, right) => left.path.localeCompare(right.path));
}

async function walkSkills(root, directory, output) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = join(directory, entry.name);
    assert.equal(entry.isSymbolicLink(), false, `Plugin discovery must not follow symlinks: ${path}`);
    if (entry.isDirectory()) await walkSkills(root, path, output);
    if (entry.isFile() && entry.name === "SKILL.md") await collectSkill(root, path, output);
  }
}

async function collectSkill(root, path, output) {
  assert.equal(path.endsWith("SKILL.md"), true, `declared Skill file must be SKILL.md: ${path}`);
  const source = await readFile(path, "utf8");
  const parsed = parseFrontmatter(source);
  output.push({
    path: relative(root, path).split("\\").join("/"),
    name: String(parsed.attributes.name || "").trim(),
    description: String(parsed.attributes.description || "").trim(),
  });
}

async function temporaryDirectory(t, prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  t.after(async () => {
    const { rm } = await import("node:fs/promises");
    await rm(root, { recursive: true, force: true });
  });
  return root;
}

async function temporaryLegacyWorkspace(t, prefix) {
  const root = await temporaryDirectory(t, prefix);
  await writeText(join(root, ".pipeline/config.yaml"), [
    "pipeline:",
    "  name: M8 generator fixture",
    "execution:",
    "  mode: self",
    "  steps:",
    "    preset: tdd",
    "",
  ].join("\n"));
  await writeText(join(root, ".pipeline/state.yaml"), [
    "pipeline:",
    "  status: running",
    "current:",
    "  prompt_name: M8 generator guard",
    "",
  ].join("\n"));
  return root;
}

async function manifestFor(root, paths) {
  return api.buildDeletionManifest(root, {
    paths,
    reason: "Exercise the exact M8 cleanup authorization boundary.",
    replacement: "The C21 manifest-based Codex surface.",
  });
}

async function issueDeletionReceipt(root, manifest, id) {
  const context = api.buildDeletionReceiptContext(manifest, { actor: ACTOR });
  const issued = await api.issueReceipt(root, {
    ...context,
    issued_at: new Date(Date.now() - 1_000).toISOString(),
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  }, { id: `${id}-receipt` });
  return issued.id;
}

async function execute(root, manifest, receiptId, id) {
  return api.executeDeletionManifest(root, {
    manifest,
    receipt_id: receiptId,
    actor: ACTOR,
    tool_use_id: `${id}-tool`,
  }, { id: `${id}-execute` });
}

function extractAdvertisedRoutes(source) {
  const routes = new Set();
  for (const line of source.split("\n")) {
    if (!line.trim().startsWith("|") || !line.includes("/hw:")) continue;
    for (const match of line.matchAll(/\/hw:[a-z]+(?::[a-z-]+)*/gi)) routes.add(match[0].toLowerCase());
  }
  return routes;
}

function assertNoActiveLegacyClaims(path, source) {
  const forbidden = [
    /\/hw:(?:setup|rules|watchdog|showcase|patch|stop|skip|reset|help)\b/i,
    /skills\/(?:setup|rules|watchdog|showcase|patch|stop|skip|reset|help)\/SKILL\.md/i,
    /\b53\s+(?:user(?:-facing)?\s+)?(?:commands|指令|命令)\b/i,
    /\bsix[- ]platform\b|六个平台/i,
    /\bdashboard\b/i,
    /\bRules\s*\/\s*Habits\b|Rules\/instructions:\s*skill-files/i,
    /\.pipeline\/rules\.yaml/i,
  ];
  const nonCurrent = /removed|retired|deferred|historical|legacy-only|not supported|later cycle|已移除|已退役|延后|后续\s*Cycle|历史|不支持/i;
  const violations = [];
  for (const [index, line] of source.split("\n").entries()) {
    if (forbidden.some((pattern) => pattern.test(line)) && !nonCurrent.test(line)) {
      violations.push(`${index + 1}: ${line.trim()}`);
    }
  }
  assert.equal(
    violations.length,
    0,
    `${path} contains ${violations.length} active legacy claim(s):\n${violations.slice(0, 8).join("\n")}`,
  );
}

function assertCurrentPlatformRows(path, source) {
  const nonCodex = /\|\s*(?:Claude Code|OpenCode|Cursor|GitHub Copilot|Trae)\s*\|/i;
  const deferred = /deferred|planned|future|later|not current|暂不支持|后续|延后|计划中/i;
  const violations = source.split("\n").filter((line) => nonCodex.test(line) && !deferred.test(line));
  assert.deepEqual(violations, [], `${path} presents deferred adapters as current platform support`);
}

function isInside(root, candidate) {
  const nested = relative(resolve(root), resolve(candidate));
  return nested === "" || (nested !== ".." && !nested.startsWith("../") && !nested.startsWith("..\\"));
}

async function treeHash(root) {
  return api.canonicalHash(await snapshotTree(root));
}
