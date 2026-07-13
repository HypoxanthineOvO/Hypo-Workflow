import test from "node:test";
import assert from "node:assert/strict";
import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  parseYaml as parseLegacyYaml,
  stringifyYaml as stringifyLegacyYaml,
} from "../src/index.js";
import { createWorkspaceManifest } from "../src/manifest/index.js";
import {
  canonicalHash,
  parseFrontmatter,
  parseYaml,
  stringifyYaml,
} from "../src/serialization/index.js";
import { detectWorkspaceFormat } from "../src/workspace-format/index.js";

const FIXED_NOW = "2026-07-11T22:30:00+08:00";

test("canonical serialization preserves legacy YAML semantics, frontmatter, and stable hashes", () => {
  const yamlSource = [
    'title: "Value: with colon"',
    "nested:",
    "  enabled: true",
    "  optional: null",
    "items:",
    "  - alpha",
    "  - beta",
    "",
  ].join("\n");
  const canonical = parseYaml(yamlSource);

  assert.deepEqual(canonical, parseLegacyYaml(yamlSource));
  assert.equal(stringifyYaml(canonical), stringifyLegacyYaml(canonical));
  assert.deepEqual(parseYaml(stringifyYaml(canonical)), canonical);

  const frontmatter = parseFrontmatter([
    "---",
    "kind: decision",
    "tags:",
    "  - storage",
    "  - recovery",
    "---",
    "# Transaction boundary",
    "",
    "Manifest activation is last.",
    "",
  ].join("\n"));
  assert.deepEqual(frontmatter.attributes, { kind: "decision", tags: ["storage", "recovery"] });
  assert.equal(frontmatter.body, "# Transaction boundary\n\nManifest activation is last.\n");
  assert.deepEqual(parseFrontmatter("# Plain Markdown\n"), {
    attributes: {},
    body: "# Plain Markdown\n",
  });
  assert.throws(
    () => parseFrontmatter("---\nkind: decision\n# Missing closing delimiter\n"),
    /frontmatter|closing|delimiter|unterminated|malformed/i,
  );

  const firstHash = canonicalHash({ beta: [2, 3], alpha: 1 });
  const reorderedHash = canonicalHash({ alpha: 1, beta: [2, 3] });
  assert.match(firstHash, /^[a-f0-9]{64}$/);
  assert.equal(firstHash, reorderedHash, "object key order must not change canonical hashes");
  assert.notEqual(firstHash, canonicalHash({ alpha: 1, beta: [2, 4] }));
  assert.notEqual(canonicalHash(["first", "second"]), canonicalHash(["second", "first"]));
});

test("detectWorkspaceFormat classifies all six workspace formats without writes", async (t) => {
  const cases = [
    {
      kind: "empty",
      arrange: async () => {},
    },
    {
      kind: "unmanaged_brownfield",
      arrange: async (root) => {
        await writeText(join(root, "package.json"), '{"name":"brownfield"}\n');
        await writeText(join(root, "src", "index.js"), "export const ready = true;\n");
      },
    },
    {
      kind: "current",
      arrange: async (root) => {
        await writeManifest(root);
      },
    },
    {
      kind: "legacy",
      arrange: async (root) => {
        await writeLegacyAuthority(root);
      },
    },
    {
      kind: "damaged_current",
      arrange: async (root) => {
        await writeText(join(root, ".pipeline", "manifest.yaml"), "schema_version: [\n");
        await writeText(join(root, ".pipeline", "state.yaml"), "pipeline:\n  status: running\n");
      },
    },
    {
      kind: "mixed_current_with_legacy_residue",
      arrange: async (root) => {
        await writeManifest(root);
        await writeLegacyAuthority(root);
      },
    },
  ];

  for (const fixture of cases) {
    await t.test(fixture.kind, async (subtest) => {
      const root = await temporaryRoot(subtest, `hw-format-${fixture.kind}-`);
      await fixture.arrange(root);
      const before = await snapshotTree(root);

      const result = await detectWorkspaceFormat(root);

      assert.equal(result.kind, fixture.kind);
      assert.deepEqual(
        await snapshotTree(root),
        before,
        `detecting ${fixture.kind} must not create, remove, or rewrite files`,
      );
    });
  }
});

test("valid manifest evidence takes precedence over unrelated brownfield files", async (t) => {
  const root = await temporaryRoot(t, "hw-format-current-brownfield-");
  await writeManifest(root);
  await writeText(join(root, "package.json"), '{"name":"already-adopted"}\n');
  await writeText(join(root, "README.md"), "# Existing project\n");

  const result = await detectWorkspaceFormat(root);

  assert.equal(result.kind, "current");
});

test("chat, chats, and inbox sidecars are tolerated without becoming current-format authority", async (t) => {
  const root = await temporaryRoot(t, "hw-format-tolerated-sidecars-");
  await writeManifest(root);
  await writeText(join(root, ".pipeline", "chat", "journal.yaml"), "entries: []\n");
  await writeText(
    join(root, ".pipeline", "chats", "mini-cycle-fixture", "state.yaml"),
    "kind: mini_cycle\nsource: ordinary_conversation_capture\n",
  );
  await writeText(join(root, ".pipeline", "inbox", "items.yaml"), "items: []\n");
  const before = await snapshotTree(root);

  const result = await detectWorkspaceFormat(root);

  assert.equal(result.kind, "current");
  assert.deepEqual(await snapshotTree(root), before);
});

test("unknown top-level pipeline entries remain legacy residue", async (t) => {
  const root = await temporaryRoot(t, "hw-format-unknown-pipeline-entry-");
  await writeManifest(root);
  await writeText(join(root, ".pipeline", "unknown-sidecar", "state.yaml"), "authority: false\n");
  const before = await snapshotTree(root);

  const result = await detectWorkspaceFormat(root);

  assert.equal(result.kind, "mixed_current_with_legacy_residue");
  assert.deepEqual(await snapshotTree(root), before);
});

test("a parseable but schema-invalid manifest is damaged_current, never legacy", async (t) => {
  const root = await temporaryRoot(t, "hw-format-invalid-manifest-");
  await writeText(join(root, ".pipeline", "manifest.yaml"), "schema_version: '999'\nworkspace_id: invalid\n");
  await writeLegacyAuthority(root);
  const before = await snapshotTree(root);

  const result = await detectWorkspaceFormat(root);

  assert.equal(result.kind, "damaged_current");
  assert.deepEqual(await snapshotTree(root), before);
});

test("a missing project root is classified as empty without creating it", async (t) => {
  const parent = await temporaryRoot(t, "hw-format-missing-root-");
  const missingRoot = join(parent, "new-project");
  const before = await snapshotTree(parent);

  const result = await detectWorkspaceFormat(missingRoot);

  assert.equal(result.kind, "empty");
  assert.equal(await exists(missingRoot), false);
  assert.deepEqual(await snapshotTree(parent), before);
});

async function writeManifest(root, overrides = {}) {
  const manifest = createWorkspaceManifest({
    workspace_id: "fixture-workspace",
    project_id: "fixture-project",
    created_at: FIXED_NOW,
    ...overrides,
  });
  await writeText(
    join(root, ".pipeline", "manifest.yaml"),
    `${stringifyYaml(manifest).trimEnd()}\n`,
  );
  return manifest;
}

async function writeLegacyAuthority(root) {
  await writeText(join(root, ".pipeline", "config.yaml"), "pipeline:\n  name: Legacy fixture\n");
  await writeText(join(root, ".pipeline", "state.yaml"), "pipeline:\n  status: running\n");
  await writeText(join(root, ".pipeline", "cycle.yaml"), "cycle:\n  number: 20\n  status: active\n");
}

async function temporaryRoot(t, prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function writeText(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function snapshotTree(root) {
  const entries = [];
  await visit(root, ".", entries);
  return entries;
}

async function visit(root, relativePath, entries) {
  const path = relativePath === "." ? root : join(root, relativePath);
  const stat = await lstat(path, { bigint: true });
  const common = {
    path: relativePath,
    mode: Number(stat.mode),
    mtime_ns: stat.mtimeNs,
  };
  if (stat.isSymbolicLink()) {
    entries.push({ ...common, type: "symlink", target: await readlink(path) });
    return;
  }
  if (stat.isDirectory()) {
    entries.push({ ...common, type: "directory" });
    const children = await readdir(path);
    for (const child of children.sort()) {
      await visit(root, relativePath === "." ? child : join(relativePath, child), entries);
    }
    return;
  }
  entries.push({
    ...common,
    type: "file",
    content: (await readFile(path)).toString("base64"),
  });
}
