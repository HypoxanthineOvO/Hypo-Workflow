#!/usr/bin/env node

import { access, readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CATALOG = join(ROOT, "tests", "regression-catalog.json");
const VALID_SETS = new Set(["maintained", "quarantined", "all"]);
const CLASSIFICATIONS = ["maintained", "quarantined", "excluded"];

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const catalog = JSON.parse(await readFile(options.catalog, "utf8"));
  const partitions = await validateCatalog(catalog);
  const partition = partitions.core;
  const selectedPaths = selectPaths(partition, options.set);
  const payload = selectionPayload("core", options.set, partition, selectedPaths);

  if (options.dryRun) {
    if (options.json) {
      process.stdout.write(`${JSON.stringify(payload)}\n`);
    } else {
      printSelection(payload);
    }
    return 0;
  }

  if (options.json) {
    process.stderr.write(`${JSON.stringify({ ...payload, execution: "node:test" })}\n`);
  } else {
    printSelection(payload);
  }
  if (selectedPaths.length === 0) return 0;

  const childEnv = { ...process.env };
  delete childEnv.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, [
    "--test",
    "--test-reporter=tap",
    ...options.nodeArgs,
    ...selectedPaths,
  ], {
    cwd: ROOT,
    env: childEnv,
    encoding: "utf8",
  });
  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");
  if (result.error) throw result.error;
  if (result.signal) {
    process.stderr.write(`Core test runner terminated by signal ${result.signal}\n`);
    return 1;
  }
  if (result.status !== 0) return result.status ?? 1;
  if (options.set === "maintained") {
    const skippedMatch = /(?:^|\n)# skipped (\d+)(?:\n|$)/.exec(result.stdout || "");
    const skippedCount = skippedMatch ? Number.parseInt(skippedMatch[1], 10) : 0;
    const emptyPlanCount = (result.stdout || "").match(/(?:^|\n)1\.\.0(?:\n|$)/g)?.length || 0;
    if (skippedCount > 0 || emptyPlanCount > 0) {
      process.stderr.write(
        `Maintained Core gate rejected skipped=${skippedCount} zero-test-files=${emptyPlanCount}\n`,
      );
      return 1;
    }
  }
  return 0;
}

function parseArgs(argv) {
  const options = {
    catalog: DEFAULT_CATALOG,
    set: "maintained",
    dryRun: false,
    json: false,
    nodeArgs: [],
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--catalog") {
      const value = argv[++index];
      if (!value) throw new Error("--catalog requires a path");
      options.catalog = resolve(value);
    } else if (argument === "--set") {
      const value = argv[++index];
      if (!VALID_SETS.has(value)) throw new Error("--set must be maintained, quarantined, or all");
      options.set = value;
    } else if (argument === "--dry-run") {
      options.dryRun = true;
    } else if (argument === "--json") {
      options.json = true;
    } else if (argument === "--") {
      options.nodeArgs.push(...argv.slice(index + 1));
      break;
    } else {
      throw new Error(`unknown argument: ${argument}; pass Node test options after --`);
    }
  }
  return options;
}

async function validateCatalog(catalog) {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    throw new Error("catalog must be an object");
  }
  if (catalog.schema_version !== "1") throw new Error("catalog schema_version must be 1");
  if (!catalog.suites || typeof catalog.suites !== "object" || Array.isArray(catalog.suites)) {
    throw new Error("catalog.suites is required");
  }
  assertExactKeys(catalog.suites, ["core", "scenarios"], "catalog.suites");

  const partitions = {
    core: validatePartition(catalog.suites.core, "core"),
    scenarios: validatePartition(catalog.suites.scenarios, "scenarios"),
  };
  const expected = {
    core: await discoverCoreTests(),
    scenarios: await discoverRegisteredScenarios(),
  };
  for (const suite of Object.keys(partitions)) {
    assertExactInventory(partitions[suite].inventory, expected[suite], suite);
  }

  const maintained = new Set([
    ...partitions.core.maintained,
    ...partitions.scenarios.maintained,
  ]);
  for (const [suite, partition] of Object.entries(partitions)) {
    for (const entry of partition.entries) {
      if (typeof entry.reason !== "string" || !entry.reason.trim()) {
        throw new Error(`${suite}:${entry.path} requires a non-empty reason`);
      }
      if (entry.classification === "quarantined" && (!Array.isArray(entry.replacement) || entry.replacement.length === 0)) {
        throw new Error(`${suite}:${entry.path} requires at least one replacement`);
      }
      if (entry.replacement === undefined) continue;
      if (!Array.isArray(entry.replacement) || entry.replacement.length === 0) {
        throw new Error(`${suite}:${entry.path} has an invalid replacement`);
      }
      for (const replacement of entry.replacement) {
        if (!maintained.has(replacement)) {
          throw new Error(`${suite}:${entry.path} replacement is not maintained: ${replacement}`);
        }
      }
    }
  }
  validateRetiredSurfaces(catalog.retired_surfaces, maintained);
  return partitions;
}

function validatePartition(input, suite) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`catalog.suites.${suite} is required`);
  }
  assertExactKeys(input, CLASSIFICATIONS, `catalog.suites.${suite}`);
  const entries = [];
  const pathsByClass = {};
  const allSeen = new Set();
  for (const classification of CLASSIFICATIONS) {
    const group = input[classification];
    if (!Array.isArray(group)) throw new Error(`${suite}.${classification} must be an array`);
    const paths = [];
    for (const entry of group) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        throw new Error(`${suite}.${classification} contains an invalid entry`);
      }
      if (entry.classification !== classification) {
        throw new Error(`${suite}:${entry.path || "<unknown>"} classification mismatch`);
      }
      const path = canonicalRepositoryPath(entry.path, `${suite}.${classification}`);
      if (allSeen.has(path)) throw new Error(`${suite} overlap: ${path} is classified twice`);
      allSeen.add(path);
      paths.push(path);
      entries.push(entry);
    }
    pathsByClass[classification] = paths.sort();
  }
  if (pathsByClass.maintained.length === 0) {
    throw new Error(`${suite} must expose a non-empty maintained set`);
  }
  return {
    entries,
    maintained: pathsByClass.maintained,
    quarantined: pathsByClass.quarantined,
    excluded: pathsByClass.excluded,
    all: [...pathsByClass.maintained, ...pathsByClass.quarantined].sort(),
    inventory: CLASSIFICATIONS.flatMap((classification) => pathsByClass[classification]).sort(),
  };
}

function validateRetiredSurfaces(surfaces, maintained) {
  if (!Array.isArray(surfaces)) throw new Error("retired_surfaces must be an array");
  for (const surface of surfaces) {
    canonicalRepositoryPath(surface?.path, "retired surface");
    if (surface.classification !== "quarantined") {
      throw new Error(`retired surface ${surface.path} must be quarantined`);
    }
    if (typeof surface.reason !== "string" || !surface.reason.trim()) {
      throw new Error(`retired surface ${surface.path} requires a reason`);
    }
    if (!Array.isArray(surface.replacement) || surface.replacement.length === 0) {
      throw new Error(`retired surface ${surface.path} requires replacement routes`);
    }
    for (const replacement of surface.replacement) {
      if (typeof replacement !== "string" || !replacement.trim()) {
        throw new Error(`retired surface ${surface.path} has an invalid replacement`);
      }
      if (!replacement.startsWith("/hw:") && !maintained.has(replacement)) {
        throw new Error(`retired surface ${surface.path} replacement is not maintained: ${replacement}`);
      }
    }
  }
}

async function discoverCoreTests() {
  const root = join(ROOT, "core", "test");
  const pending = [root];
  const paths = [];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (entry.isFile() && /\.(?:test|spec)\.[^.]+$/.test(entry.name)) {
        paths.push(relative(ROOT, path).split(sep).join("/"));
      }
    }
  }
  return paths.sort();
}

async function discoverRegisteredScenarios() {
  const scenariosRoot = join(ROOT, "tests", "scenarios");
  const paths = [];
  for (const version of await readdir(scenariosRoot, { withFileTypes: true })) {
    if (!version.isDirectory()) continue;
    const versionRoot = join(scenariosRoot, version.name);
    for (const scenario of await readdir(versionRoot, { withFileTypes: true })) {
      if (!scenario.isDirectory() || !scenario.name.startsWith("s") || scenario.name.includes("placeholder")) continue;
      const checklist = join(versionRoot, scenario.name, "checklist.md");
      if (await exists(checklist)) paths.push(`tests/scenarios/${version.name}/${scenario.name}`);
    }
  }
  return paths.sort();
}

function assertExactInventory(actual, expected, suite) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const unclassified = expected.filter((path) => !actualSet.has(path));
  const missing = actual.filter((path) => !expectedSet.has(path));
  if (unclassified.length || missing.length) {
    throw new Error(
      `${suite} catalog coverage mismatch; unclassified: ${unclassified.join(", ") || "none"}; missing files: ${missing.join(", ") || "none"}`,
    );
  }
}

function canonicalRepositoryPath(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} path must be a string`);
  const normalized = value.split(sep).join("/");
  const segments = normalized.split("/");
  if (
    isAbsolute(value)
    || normalized.includes("\\")
    || segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error(`${label} has an unsafe or non-canonical path: ${value}`);
  }
  if (relative(ROOT, join(ROOT, normalized)).startsWith("..")) {
    throw new Error(`${label} path escapes repository: ${value}`);
  }
  return normalized;
}

function assertExactKeys(input, expected, label) {
  const actual = Object.keys(input).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} keys must be exactly ${wanted.join(", ")}`);
  }
}

function selectPaths(partition, selectedSet) {
  if (selectedSet === "all") return partition.all;
  return partition[selectedSet];
}

function selectionPayload(suite, selectedSet, partition, selectedPaths) {
  return {
    schema_version: "1",
    suite,
    selected_set: selectedSet,
    maintained_count: partition.maintained.length,
    quarantined_count: partition.quarantined.length,
    excluded_count: partition.excluded.length,
    inventoried_count: partition.inventory.length,
    selected_count: selectedPaths.length,
    selected_paths: selectedPaths,
  };
}

function printSelection(payload) {
  process.stdout.write(
    `Core regression inventory: maintained=${payload.maintained_count} quarantined=${payload.quarantined_count} excluded=${payload.excluded_count} inventoried=${payload.inventoried_count} selected=${payload.selected_count} set=${payload.selected_set}\n`,
  );
  for (const path of payload.selected_paths) process.stdout.write(`- ${path}\n`);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

main()
  .then((status) => {
    process.exitCode = status;
  })
  .catch((error) => {
    process.stderr.write(`Regression catalog error: ${error.message}\n`);
    process.exitCode = 2;
  });
