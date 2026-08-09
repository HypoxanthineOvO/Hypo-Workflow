import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  access,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const CATALOG_FILE = join(ROOT, "tests", "regression-catalog.json");
const CORE_RUNNER = join(ROOT, "tests", "run_core_tests.mjs");
const SCENARIO_RUNNER = join(ROOT, "tests", "run_regression.py");
const TEST_PATTERN_RUNNER = join(ROOT, "tests", "run-node-test-pattern.mjs");
const RETIRED_CLI_PATH = ["cli", "bin", "hypo-workflow"].join("/");
const CLASSIFICATIONS = new Set(["maintained", "quarantined", "excluded"]);

const REQUIRED_CORE_COVERAGE = Object.freeze([
  "C21-M1", "C21-M2", "C21-M3", "C21-M4", "C21-M5", "C21-M6", "C21-M7", "C21-M8",
]);
const REQUIRED_SCENARIO_COVERAGE = Object.freeze([
  "init", "goal", "cycle", "maintain", "resume", "accept-reject", "deletion-drift", "codex-hook-process",
]);

test("regression catalog exactly partitions every Core test and registered scenario", async () => {
  const catalog = await readCatalog();
  assert.equal(catalog.schema_version, "1");
  assert.deepEqual(Object.keys(catalog.suites).sort(), ["core", "scenarios"]);

  const core = validatePartition(catalog.suites.core, "core");
  const scenarios = validatePartition(catalog.suites.scenarios, "scenarios");
  const physicalCore = await discoverCoreTests();
  const registeredScenarios = await discoverRegisteredScenarios();

  assert.deepEqual(core.inventory, physicalCore, "every recursive Core test/spec must be classified exactly once");
  assert.deepEqual(
    scenarios.inventory,
    registeredScenarios,
    "every non-placeholder registered scenario must be classified exactly once",
  );
  assert.ok(core.maintained.length > 0, "Core needs a maintained gate");
  assert.ok(scenarios.maintained.length > 0, "scenarios need a maintained gate");
  assert.ok(
    core.excluded.includes("core/test/fixtures/c21-m4/brownfield/test/server.test.js"),
    "fixture-owned executable tests remain inventoried without entering the product gate",
  );
});

test("retired installed-software CLI and every direct dependent stay outside the maintained gate", async () => {
  const catalog = await readCatalog();
  const core = validatePartition(catalog.suites.core, "core");
  const scenarios = validatePartition(catalog.suites.scenarios, "scenarios");
  const coreNonMaintained = new Set([...core.quarantined, ...core.excluded]);
  const scenarioNonMaintained = new Set([...scenarios.quarantined, ...scenarios.excluded]);
  const surface = catalog.retired_surfaces?.find((entry) => entry.path === RETIRED_CLI_PATH);

  assert.ok(surface, `${RETIRED_CLI_PATH} needs an explicit retired surface entry`);
  assert.equal(surface.classification, "quarantined");
  assert.equal(typeof surface.reason, "string");
  assert.ok(surface.reason.trim().length > 0);
  assert.ok(Array.isArray(surface.replacement), "retired CLI needs replacement routes");
  assert.deepEqual([...surface.replacement].sort(), ["/hw:guide", "/hw:init"]);

  for (const path of await discoverCoreCliDependents()) {
    assert.ok(coreNonMaintained.has(path), `Core test loads or calls retired CLI but is maintained: ${path}`);
  }
  for (const path of await discoverScenarioCliDependents()) {
    assert.ok(scenarioNonMaintained.has(path), `scenario calls retired CLI but is maintained: ${path}`);
  }
});

test("every non-maintained inventory entry has a reason and valid declared replacements", async () => {
  const catalog = await readCatalog();
  const core = validatePartition(catalog.suites.core, "core");
  const scenarios = validatePartition(catalog.suites.scenarios, "scenarios");
  const maintained = new Set([...core.maintained, ...scenarios.maintained]);

  for (const [suite, partition] of [["core", core], ["scenarios", scenarios]]) {
    for (const entry of partition.entries) {
      assert.equal(typeof entry.reason, "string", `${suite}:${entry.path} needs a reason`);
      assert.ok(entry.reason.trim().length > 0, `${suite}:${entry.path} needs a non-empty reason`);
      if (entry.classification === "maintained" || entry.replacement === undefined) continue;
      assert.ok(Array.isArray(entry.replacement), `${suite}:${entry.path} replacement must be an array`);
      assert.ok(entry.replacement.length > 0, `${suite}:${entry.path} declared replacement cannot be empty`);
      for (const replacement of entry.replacement) {
        assert.ok(
          maintained.has(replacement),
          `${suite}:${entry.path} replacement ${replacement} must resolve to a maintained test or scenario`,
        );
      }
    }
  }
});

test("the maintained Core set covers every required behavior area without fixed file ownership", async () => {
  const catalog = await readCatalog();
  const core = validatePartition(catalog.suites.core, "core");
  const maintained = core.entries.filter((entry) => entry.classification === "maintained");
  const covered = new Set(maintained.flatMap((entry) => entry.covers || []));
  for (const milestone of REQUIRED_CORE_COVERAGE) {
    assert.ok(covered.has(milestone), `maintained Core tests must cover ${milestone}`);
  }
});

test("the maintained scenario set covers the complete thin behavior lane without fixed directory ownership", async () => {
  const catalog = await readCatalog();
  const scenarios = validatePartition(catalog.suites.scenarios, "scenarios");
  const maintained = scenarios.entries.filter((entry) => entry.classification === "maintained");
  const covered = new Set(maintained.flatMap((entry) => entry.covers || []));
  for (const coverage of REQUIRED_SCENARIO_COVERAGE) {
    assert.ok(covered.has(coverage), `maintained Scenarios must cover ${coverage}`);
  }
});

test("catalog runners fail closed for unclassified, overlap, missing reason, and missing replacement", async (t) => {
  const catalog = await readCatalog();
  await assertExists(CORE_RUNNER, "Core regression runner");
  const sandbox = await mkdtemp(join(tmpdir(), "hw-c21-m8-invalid-catalog-"));
  t.after(() => rm(sandbox, { recursive: true, force: true }));

  const cases = [
    {
      name: "unclassified",
      pattern: /unclassified|missing|coverage/i,
      mutate(candidate) {
        candidate.suites.core.maintained.shift();
      },
    },
    {
      name: "overlap",
      pattern: /overlap|duplicate|classified.*twice/i,
      mutate(candidate) {
        candidate.suites.core.quarantined.push(structuredClone(candidate.suites.core.maintained[0]));
        candidate.suites.core.quarantined.at(-1).classification = "quarantined";
        candidate.suites.core.quarantined.at(-1).replacement = [candidate.suites.core.maintained[1].path];
      },
    },
    {
      name: "missing-reason",
      pattern: /reason/i,
      mutate(candidate) {
        delete candidate.suites.core.maintained[0].reason;
      },
    },
    {
      name: "missing-replacement",
      pattern: /replacement/i,
      mutate(candidate) {
        const [entry] = candidate.suites.core.maintained.splice(0, 1);
        candidate.suites.core.quarantined.push({ ...entry, classification: "quarantined" });
        delete candidate.suites.core.quarantined.at(-1).replacement;
      },
    },
  ];

  for (const current of cases) {
    await t.test(current.name, async () => {
      const candidate = structuredClone(catalog);
      current.mutate(candidate);
      const path = join(sandbox, `${current.name}.json`);
      await writeFile(path, `${JSON.stringify(candidate, null, 2)}\n`, "utf8");
      const result = spawnSync(process.execPath, [
        CORE_RUNNER,
        "--catalog",
        path,
        "--dry-run",
        "--json",
      ], {
        cwd: ROOT,
        encoding: "utf8",
        env: { ...process.env, NO_COLOR: "1" },
        timeout: 10_000,
      });
      const output = `${result.stdout || ""}${result.stderr || ""}`;
      assert.notEqual(result.status, 0, `${current.name} catalog was accepted`);
      assert.match(output, current.pattern);
    });
  }
});

test("npm defaults to maintained Core tests and exposes all/quarantine diagnostics", async () => {
  const catalog = await readCatalog();
  const partition = validatePartition(catalog.suites.core, "core");
  await assertExists(CORE_RUNNER, "Core regression runner");
  const packageJson = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
  assert.match(packageJson.scripts?.test || "", /run_core_tests\.mjs/);
  assert.match(packageJson.scripts?.["test:all"] || "", /run_core_tests\.mjs/);
  assert.match(packageJson.scripts?.["test:quarantine"] || "", /run_core_tests\.mjs/);

  const corpusBefore = await legacyCorpusDigest();
  const cases = [
    {
      set: "maintained",
      args: ["--silent", "test", "--", "--dry-run", "--json"],
      expected: partition.maintained,
    },
    {
      set: "all",
      args: ["--silent", "run", "test:all", "--", "--dry-run", "--json"],
      expected: partition.all,
    },
    {
      set: "quarantined",
      args: ["--silent", "run", "test:quarantine", "--", "--dry-run", "--json"],
      expected: partition.quarantined,
    },
  ];

  for (const current of cases) {
    const payload = runJson("npm", current.args, `npm ${current.set}`);
    assertDryRunPayload(payload, {
      suite: "core",
      selectedSet: current.set,
      expected: current.expected,
      partition,
    });
  }

  const visible = runProcess("npm", ["--silent", "test", "--", "--dry-run"], "npm visibility");
  assert.match(visible.stdout, new RegExp(`maintained\\s*[:=]\\s*${partition.maintained.length}`, "i"));
  assert.match(visible.stdout, new RegExp(`quarantined\\s*[:=]\\s*${partition.quarantined.length}`, "i"));
  assert.equal(await legacyCorpusDigest(), corpusBefore, "Core dry-runs must not rewrite the legacy test corpus");
});

test("scenario runner defaults to maintained and exposes all/quarantine diagnostics", async () => {
  const catalog = await readCatalog();
  const partition = validatePartition(catalog.suites.scenarios, "scenarios");
  const corpusBefore = await legacyCorpusDigest();
  const cases = [
    { set: "maintained", args: [SCENARIO_RUNNER, "--dry-run", "--json"], expected: partition.maintained },
    {
      set: "all",
      args: [SCENARIO_RUNNER, "--set", "all", "--dry-run", "--json"],
      expected: partition.all,
    },
    {
      set: "quarantined",
      args: [SCENARIO_RUNNER, "--set", "quarantined", "--dry-run", "--json"],
      expected: partition.quarantined,
    },
  ];

  for (const current of cases) {
    const payload = runJson("python3", current.args, `scenarios ${current.set}`);
    assertDryRunPayload(payload, {
      suite: "scenarios",
      selectedSet: current.set,
      expected: current.expected,
      partition,
    });
  }

  const visible = runProcess("python3", [SCENARIO_RUNNER, "--dry-run"], "scenario visibility");
  assert.match(visible.stdout, new RegExp(`maintained\\s*[:=]\\s*${partition.maintained.length}`, "i"));
  assert.match(visible.stdout, new RegExp(`quarantined\\s*[:=]\\s*${partition.quarantined.length}`, "i"));
  assert.equal(await legacyCorpusDigest(), corpusBefore, "scenario dry-runs must not rewrite old scenario files");
});

test("excluded inventory cannot be selected for execution by either runner", () => {
  for (const [command, args, label] of [
    [process.execPath, [CORE_RUNNER, "--set", "excluded", "--dry-run"], "Core"],
    ["python3", [SCENARIO_RUNNER, "--set", "excluded", "--dry-run"], "Scenario"],
  ]) {
    const result = spawnSync(command, args, { cwd: ROOT, encoding: "utf8" });
    assert.notEqual(result.status, 0, `${label} runner executed excluded inventory`);
    assert.match(`${result.stdout}${result.stderr}`, /invalid choice|maintained|quarantined|all/i);
  }
});

test("focused Scenario runner rejects a pattern that executes no passing tests", async (t) => {
  await assertExists(TEST_PATTERN_RUNNER, "focused Node test runner");
  const sandbox = await mkdtemp(join(tmpdir(), "hw-c21-m8-pattern-"));
  t.after(() => rm(sandbox, { recursive: true, force: true }));
  const testFile = join(sandbox, "sample.test.mjs");
  await writeFile(testFile, 'import test from "node:test"; test("stable-contract-id", () => {});\n', "utf8");

  const unmatched = spawnSync(process.execPath, [TEST_PATTERN_RUNNER, "missing-contract-id", testFile], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.notEqual(unmatched.status, 0);
  assert.match(`${unmatched.stdout}${unmatched.stderr}`, /matched no passing tests/i);

  const matched = spawnSync(process.execPath, [TEST_PATTERN_RUNNER, "stable-contract-id", testFile], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(matched.status, 0, matched.stderr);
});

test("maintained Core runner rejects skipped contract tests", () => {
  const result = spawnSync(process.execPath, [
    CORE_RUNNER,
    "--set",
    "maintained",
    "--",
    "--test-name-pattern=__no_maintained_contract_matches__",
  ], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 30_000,
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /rejected skipped=\d+ zero-test-files=\d+/i);
});

async function readCatalog() {
  await assertExists(CATALOG_FILE, "shared regression catalog");
  const catalog = JSON.parse(await readFile(CATALOG_FILE, "utf8"));
  assert.ok(catalog && typeof catalog === "object", "catalog must be an object");
  assert.ok(catalog.suites && typeof catalog.suites === "object", "catalog.suites is required");
  return catalog;
}

function validatePartition(input, suite) {
  assert.ok(input && typeof input === "object", `catalog.suites.${suite} is required`);
  assert.deepEqual(Object.keys(input).sort(), [...CLASSIFICATIONS].sort());
  const entries = [];
  const pathsByClass = {};
  for (const classification of CLASSIFICATIONS) {
    const group = input[classification];
    assert.ok(Array.isArray(group), `${suite}.${classification} must be an array`);
    const paths = [];
    for (const entry of group) {
      assert.ok(entry && typeof entry === "object", `${suite}.${classification} entry must be an object`);
      assert.equal(entry.classification, classification, `${suite}:${entry.path} classification mismatch`);
      assert.equal(typeof entry.path, "string", `${suite}.${classification} path must be a string`);
      assert.equal(entry.path, normalizeRepositoryPath(entry.path), `${suite}:${entry.path} must be canonical`);
      paths.push(entry.path);
      entries.push(entry);
    }
    assert.equal(new Set(paths).size, paths.length, `${suite}.${classification} contains duplicates`);
    pathsByClass[classification] = paths.sort();
  }
  const overlap = pathsByClass.maintained.filter((path) => pathsByClass.quarantined.includes(path));
  assert.deepEqual(overlap, [], `${suite} maintained/quarantined sets overlap`);
  return {
    entries,
    maintained: pathsByClass.maintained,
    quarantined: pathsByClass.quarantined,
    excluded: pathsByClass.excluded,
    all: [...pathsByClass.maintained, ...pathsByClass.quarantined].sort(),
    inventory: [...CLASSIFICATIONS].flatMap((classification) => pathsByClass[classification]).sort(),
  };
}

async function discoverCoreTests() {
  return (await walkFiles(join(ROOT, "core", "test")))
    .filter((path) => /\.(?:test|spec)\.[^.]+$/.test(path))
    .map((path) => normalizeRepositoryPath(relative(ROOT, path)))
    .sort();
}

async function discoverRegisteredScenarios() {
  const root = join(ROOT, "tests", "scenarios");
  const paths = [];
  for (const version of await readdir(root, { withFileTypes: true })) {
    if (!version.isDirectory()) continue;
    const versionRoot = join(root, version.name);
    for (const scene of await readdir(versionRoot, { withFileTypes: true })) {
      if (!scene.isDirectory() || !scene.name.startsWith("s") || scene.name.includes("placeholder")) continue;
      const checklist = join(versionRoot, scene.name, "checklist.md");
      if (await exists(checklist)) paths.push(`tests/scenarios/${version.name}/${scene.name}`);
    }
  }
  return paths.sort();
}

async function discoverCoreCliDependents() {
  const dependents = [];
  const exactPath = /cli\/bin\/hypo-workflow/;
  const joinedPath = /["']cli["']\s*,\s*["']bin["']\s*,\s*["']hypo-workflow["']/s;
  for (const path of await discoverCoreTests()) {
    if (path === "core/test/c21-m8-regression-contract.test.js") continue;
    const source = await readFile(join(ROOT, path), "utf8");
    if (exactPath.test(source) || joinedPath.test(source)) dependents.push(path);
  }
  return dependents.sort();
}

async function discoverScenarioCliDependents() {
  const dependents = [];
  for (const path of await discoverRegisteredScenarios()) {
    const runFile = join(ROOT, path, "run.sh");
    if (!(await exists(runFile))) continue;
    if (/cli\/bin\/hypo-workflow/.test(await readFile(runFile, "utf8"))) dependents.push(path);
  }
  return dependents.sort();
}

function assertDryRunPayload(payload, { suite, selectedSet, expected, partition }) {
  assert.equal(payload.schema_version, "1");
  assert.equal(payload.suite, suite);
  assert.equal(payload.selected_set, selectedSet);
  assert.equal(payload.maintained_count, partition.maintained.length);
  assert.equal(payload.quarantined_count, partition.quarantined.length);
  assert.equal(payload.excluded_count, partition.excluded.length);
  assert.equal(payload.inventoried_count, partition.inventory.length);
  assert.equal(payload.selected_count, expected.length);
  assert.deepEqual([...payload.selected_paths].sort(), expected);
}

function runJson(command, args, label) {
  const result = runProcess(command, args, label);
  try {
    return JSON.parse(result.stdout.trim());
  } catch (error) {
    assert.fail(`${label} did not emit one JSON object: ${error.message}\n${result.stdout}\n${result.stderr}`);
  }
}

function runProcess(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    timeout: 30_000,
  });
  assert.equal(result.signal, null, `${label} signal: ${result.signal}\n${result.stderr || ""}`);
  assert.equal(result.status, 0, `${label} exited ${result.status}\n${result.stdout || ""}\n${result.stderr || ""}`);
  return result;
}

async function legacyCorpusDigest() {
  const hash = createHash("sha256");
  for (const base of [join(ROOT, "core", "test"), join(ROOT, "tests", "scenarios")]) {
    for (const path of await walkFiles(base)) {
      const repositoryPath = normalizeRepositoryPath(relative(ROOT, path));
      const content = await readFile(path);
      hash.update(repositoryPath);
      hash.update("\0");
      hash.update(content);
      hash.update("\0");
    }
  }
  return hash.digest("hex");
}

async function walkFiles(root) {
  if (!(await exists(root))) return [];
  const pending = [root];
  const files = [];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  return files.sort();
}

async function assertExists(path, label) {
  assert.equal(await exists(path), true, `${label} is required at ${normalizeRepositoryPath(relative(ROOT, path))}`);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function normalizeRepositoryPath(path) {
  const normalized = path.split(sep).join("/");
  assert.equal(normalized.startsWith("/") || normalized.startsWith("../"), false, `unsafe path: ${path}`);
  assert.equal(normalized.includes("/../"), false, `unsafe path: ${path}`);
  return normalized.replace(/^\.\//, "").replace(/\/$/, "");
}
