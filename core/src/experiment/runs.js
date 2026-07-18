import { basename } from "node:path";
import { canonicalHash } from "../serialization/index.js";
import {
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  normalizeSafeIdentifier,
  normalizeSha256,
} from "../runtime/internal.js";
import { normalizeWorkspacePath } from "../workspace-store/index.js";

const RUN_INPUT_KEYS = Object.freeze([
  "schema_version",
  "id_prefix",
  "project_id",
  "experiment_id",
  "code_snapshot",
  "environment",
  "machine",
  "dataset",
  "command",
  "output",
  "resource_limits",
  "parameters",
]);
const COMPILED_RUN_KEYS = Object.freeze([...RUN_INPUT_KEYS, "run_id", "identity_hash"]);
const SCAN_KEYS = Object.freeze([
  "schema_version",
  "scan_id",
  "purpose",
  "derived_from_scan_id",
  "selection",
  "base_run",
  "fixed_parameters",
  "axes",
  "cases",
]);
const SECRET_ENV_KEY = /(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|PRIVATE[_-]?KEY)/i;

export function compileExperimentRunSpec(input) {
  const run = normalizeRunInput(input, "Experiment run specification");
  const runId = buildReadableRunId(run);
  const identityHash = canonicalHash(run);
  const argv = materializeArgv(run);
  const directory = `${run.output.root}/${runId}`;
  const generatedPaths = [
    directory,
    `${directory}/${run.output.log_file}`,
    `${directory}/${run.output.config_file}`,
    `${directory}/${run.output.metrics_file}`,
  ];
  for (const [index, path] of generatedPaths.entries()) {
    assertPortableRelativePath(path, `Compiled Experiment run output path[${index}]`);
  }
  return {
    schema_version: "1",
    id_prefix: run.id_prefix,
    project_id: run.project_id,
    experiment_id: run.experiment_id,
    code_snapshot: clone(run.code_snapshot),
    environment: clone(run.environment),
    machine: clone(run.machine),
    dataset: clone(run.dataset),
    command: {
      cwd: run.command.cwd,
      argv,
      argument_bindings: clone(run.command.argument_bindings),
      env: clone(run.command.env),
    },
    output: {
      root: run.output.root,
      directory,
      log_path: `${directory}/${run.output.log_file}`,
      config_path: `${directory}/${run.output.config_file}`,
      metrics_path: `${directory}/${run.output.metrics_file}`,
    },
    resource_limits: clone(run.resource_limits),
    parameters: clone(run.parameters),
    run_id: runId,
    identity_hash: identityHash,
  };
}

export function expandExperimentScan(input) {
  const scan = normalizeScan(input);
  const combinations = cartesianAxes(scan.axes);
  const runs = [];
  const runIds = new Set();
  const identities = new Set();
  for (const entry of scan.cases) {
    for (const combination of combinations) {
      const parameters = sortedObject({
        ...scan.base_run.parameters,
        ...scan.fixed_parameters,
        ...entry.parameters,
        ...combination,
      });
      const dataset = { ...scan.base_run.dataset, ...entry.dataset };
      const compiled = compileExperimentRunSpec({
        ...scan.base_run,
        dataset,
        parameters,
      });
      if (runIds.has(compiled.run_id)) {
        throw runError("ERR_EXPERIMENT_SCAN_COLLISION", `Experiment scan run_id collision: ${compiled.run_id}`);
      }
      if (identities.has(compiled.identity_hash)) {
        throw runError("ERR_EXPERIMENT_SCAN_COLLISION", "Experiment scan contains duplicate run identities");
      }
      runIds.add(compiled.run_id);
      identities.add(compiled.identity_hash);
      runs.push(compiled);
    }
  }
  return {
    schema_version: "1",
    scan_id: scan.scan_id,
    purpose: scan.purpose,
    design: {
      fixed_parameters: clone(scan.fixed_parameters),
      axes: clone(scan.axes),
      cases: scan.cases.map(({ id }) => id),
      ...(scan.derived_from_scan_id === undefined ? {} : { derived_from_scan_id: scan.derived_from_scan_id }),
      ...(scan.selection === undefined ? {} : { selection: clone(scan.selection) }),
    },
    run_count: runs.length,
    runs,
  };
}

export function normalizeCompiledExperimentRunSpec(input, field = "Compiled Experiment run specification") {
  assertPlainObject(input, field);
  assertExactKeys(input, COMPILED_RUN_KEYS, field);
  assertNoRawSecrets(input, field);
  const output = normalizeCompiledOutput(input.output, `${field}.output`, input.run_id);
  const environment = normalizeEnvironment(input.environment, `${field}.environment`);
  const command = normalizeCompiledCommand(input.command, environment, `${field}.command`);
  const reconstructed = {
    schema_version: input.schema_version,
    id_prefix: input.id_prefix,
    project_id: input.project_id,
    experiment_id: input.experiment_id,
    code_snapshot: input.code_snapshot,
    environment,
    machine: input.machine,
    dataset: input.dataset,
    command,
    output,
    resource_limits: input.resource_limits,
    parameters: input.parameters,
  };
  const expected = compileExperimentRunSpec(reconstructed);
  if (canonicalHash(expected) !== canonicalHash(input)) {
    throw runError("ERR_EXPERIMENT_RUN_IDENTITY_INVALID", "Compiled Experiment run identity or materialized paths were changed");
  }
  return expected;
}

function normalizeRunInput(input, field) {
  assertPlainObject(input, field);
  assertNoRawSecrets(input, field);
  assertExactKeys(input, RUN_INPUT_KEYS, field);
  if (input.schema_version !== "1") {
    throw runError("ERR_EXPERIMENT_RUN_SCHEMA_INVALID", `${field}.schema_version must be 1`);
  }
  const machine = normalizeMachine(input.machine, `${field}.machine`);
  const dataset = normalizeDataset(input.dataset, `${field}.dataset`);
  if (!machine.external_locations.some((entry) => entry.id === dataset.external_location_id)) {
    throw runError(
      "ERR_EXPERIMENT_RUN_DATASET_UNBOUND",
      `${field}.dataset external_location_id is not registered on the selected machine`,
    );
  }
  const resourceLimits = normalizeResourceLimits(input.resource_limits, `${field}.resource_limits`);
  if (resourceLimits.host_memory_bytes > machine.host_memory_bytes) {
    throw runError("ERR_EXPERIMENT_RUN_RESOURCE_INVALID", `${field}.resource_limits exceed machine host memory`);
  }
  if (
    resourceLimits.gpu_memory_bytes !== undefined
    && resourceLimits.gpu_memory_bytes > machine.gpu.memory_bytes * machine.gpu.count
  ) {
    throw runError("ERR_EXPERIMENT_RUN_RESOURCE_INVALID", `${field}.resource_limits exceed machine GPU memory`);
  }
  return {
    schema_version: "1",
    id_prefix: normalizeSafeIdentifier(input.id_prefix, `${field}.id_prefix`),
    project_id: normalizeSafeIdentifier(input.project_id, `${field}.project_id`),
    experiment_id: normalizeSafeIdentifier(input.experiment_id, `${field}.experiment_id`),
    code_snapshot: normalizeCodeSnapshot(input.code_snapshot, `${field}.code_snapshot`),
    environment: normalizeEnvironment(input.environment, `${field}.environment`),
    machine,
    dataset,
    command: normalizeCommand(input.command, `${field}.command`),
    output: normalizeOutput(input.output, `${field}.output`),
    resource_limits: resourceLimits,
    parameters: normalizeScalarMap(input.parameters, `${field}.parameters`),
  };
}

function normalizeCodeSnapshot(input, field) {
  assertPlainObject(input, field);
  assertExactKeys(input, ["repository_ref", "commit", "tree", "dirty_patch"], field);
  const snapshot = {
    repository_ref: normalizeText(input.repository_ref, `${field}.repository_ref`),
    commit: normalizeGitObject(input.commit, `${field}.commit`),
    tree: normalizeGitObject(input.tree, `${field}.tree`),
  };
  if (input.dirty_patch !== undefined) {
    assertPlainObject(input.dirty_patch, `${field}.dirty_patch`);
    assertExactKeys(input.dirty_patch, ["artifact_ref", "sha256"], `${field}.dirty_patch`);
    snapshot.dirty_patch = {
      artifact_ref: normalizeRunPath(input.dirty_patch.artifact_ref, `${field}.dirty_patch.artifact_ref`),
      sha256: normalizeSha256(input.dirty_patch.sha256, `${field}.dirty_patch.sha256`),
    };
  }
  return snapshot;
}

function normalizeEnvironment(input, field) {
  assertPlainObject(input, field);
  assertExactKeys(input, ["manager", "python_version", "lockfile", "run_prefix"], field);
  if (input.manager !== "uv") {
    throw runError("ERR_EXPERIMENT_RUN_ENVIRONMENT_INVALID", `${field}.manager must be uv`);
  }
  assertPlainObject(input.lockfile, `${field}.lockfile`);
  assertExactKeys(input.lockfile, ["path", "sha256"], `${field}.lockfile`);
  const runPrefix = normalizeArgv(input.run_prefix, `${field}.run_prefix`);
  if (canonicalHash(runPrefix) !== canonicalHash(["uv", "run", "--frozen"])) {
    throw runError("ERR_EXPERIMENT_RUN_ENVIRONMENT_INVALID", `${field}.run_prefix must be exactly uv run --frozen`);
  }
  return {
    manager: "uv",
    python_version: normalizeText(input.python_version, `${field}.python_version`),
    lockfile: {
      path: normalizeRunPath(input.lockfile.path, `${field}.lockfile.path`),
      sha256: normalizeSha256(input.lockfile.sha256, `${field}.lockfile.sha256`),
    },
    run_prefix: runPrefix,
  };
}

function normalizeMachine(input, field) {
  assertPlainObject(input, field);
  assertExactKeys(input, [
    "id",
    "hostname",
    "gpu",
    "driver_version",
    "cuda_version",
    "host_memory_bytes",
    "external_locations",
  ], field);
  assertPlainObject(input.gpu, `${field}.gpu`);
  assertExactKeys(input.gpu, ["model", "count", "memory_bytes"], `${field}.gpu`);
  if (!Array.isArray(input.external_locations) || input.external_locations.length === 0) {
    throw runError("ERR_EXPERIMENT_RUN_MACHINE_INVALID", `${field}.external_locations must be non-empty`);
  }
  const externalLocations = input.external_locations.map((entry, index) => {
    const nested = `${field}.external_locations[${index}]`;
    assertPlainObject(entry, nested);
    assertExactKeys(entry, ["id", "path", "content_id"], nested);
    return {
      id: normalizeSafeIdentifier(entry.id, `${nested}.id`),
      path: normalizeExternalPath(entry.path, `${nested}.path`),
      content_id: normalizeText(entry.content_id, `${nested}.content_id`),
    };
  });
  assertUnique(externalLocations.map(({ id }) => id), `${field}.external_locations ids`);
  return {
    id: normalizeSafeIdentifier(input.id, `${field}.id`),
    hostname: normalizeText(input.hostname, `${field}.hostname`),
    gpu: {
      model: normalizeText(input.gpu.model, `${field}.gpu.model`),
      count: positiveInteger(input.gpu.count, `${field}.gpu.count`),
      memory_bytes: positiveInteger(input.gpu.memory_bytes, `${field}.gpu.memory_bytes`),
    },
    driver_version: normalizeText(input.driver_version, `${field}.driver_version`),
    cuda_version: normalizeText(input.cuda_version, `${field}.cuda_version`),
    host_memory_bytes: positiveInteger(input.host_memory_bytes, `${field}.host_memory_bytes`),
    external_locations: externalLocations,
  };
}

function normalizeDataset(input, field) {
  assertPlainObject(input, field);
  assertExactKeys(input, ["id", "version", "subset", "scene", "trace", "external_location_id"], field);
  return {
    id: normalizeSafeIdentifier(input.id, `${field}.id`),
    version: normalizeText(input.version, `${field}.version`),
    subset: normalizeText(input.subset, `${field}.subset`),
    ...(input.scene === undefined ? {} : { scene: normalizeText(input.scene, `${field}.scene`) }),
    ...(input.trace === undefined ? {} : { trace: normalizeText(input.trace, `${field}.trace`) }),
    external_location_id: normalizeSafeIdentifier(input.external_location_id, `${field}.external_location_id`),
  };
}

function normalizeCommand(input, field) {
  assertPlainObject(input, field);
  assertExactKeys(input, ["cwd", "argv", "argument_bindings", "env"], field);
  const argv = normalizeArgv(input.argv, `${field}.argv`);
  if (!Array.isArray(input.argument_bindings) || input.argument_bindings.length === 0) {
    throw runError("ERR_EXPERIMENT_RUN_COMMAND_INVALID", `${field}.argument_bindings must be non-empty`);
  }
  const bindings = input.argument_bindings.map((entry, index) => {
    const nested = `${field}.argument_bindings[${index}]`;
    assertPlainObject(entry, nested);
    assertExactKeys(entry, ["flag", "source"], nested);
    const flag = normalizeText(entry.flag, `${nested}.flag`);
    if (!/^--[A-Za-z0-9][A-Za-z0-9-]*$/.test(flag)) {
      throw runError("ERR_EXPERIMENT_RUN_COMMAND_INVALID", `${nested}.flag must be one canonical long option`);
    }
    return { flag, source: normalizeBindingSource(entry.source, `${nested}.source`) };
  });
  assertUnique(bindings.map(({ flag }) => flag), `${field}.argument_bindings flags`);
  if (argv.includes("--")) {
    throw runError("ERR_EXPERIMENT_RUN_COMMAND_INVALID", `${field}.argv cannot terminate options before bindings`);
  }
  for (const binding of bindings) {
    if (argv.some((token) => token === binding.flag || token.startsWith(`${binding.flag}=`))) {
      throw runError(
        "ERR_EXPERIMENT_RUN_COMMAND_INVALID",
        `${field}.argv already owns bound flag ${binding.flag}`,
      );
    }
  }
  return {
    cwd: normalizeRunPath(input.cwd, `${field}.cwd`, { allowDot: true }),
    argv,
    argument_bindings: bindings,
    env: normalizeEnvironmentVariables(input.env, `${field}.env`),
  };
}

function normalizeCompiledCommand(input, environment, field) {
  assertPlainObject(input, field);
  assertExactKeys(input, ["cwd", "argv", "argument_bindings", "env"], field);
  const actual = normalizeArgv(input.argv, `${field}.argv`);
  const prefix = environment.run_prefix;
  if (canonicalHash(actual.slice(0, prefix.length)) !== canonicalHash(prefix)) {
    throw runError("ERR_EXPERIMENT_RUN_IDENTITY_INVALID", `${field}.argv lost its uv run prefix`);
  }
  const bindingCount = Array.isArray(input.argument_bindings) ? input.argument_bindings.length : 0;
  const baseEnd = actual.length - (bindingCount * 2);
  if (baseEnd <= prefix.length) {
    throw runError("ERR_EXPERIMENT_RUN_IDENTITY_INVALID", `${field}.argv cannot be reconstructed`);
  }
  return normalizeCommand({
    cwd: input.cwd,
    argv: actual.slice(prefix.length, baseEnd),
    argument_bindings: input.argument_bindings,
    env: input.env,
  }, field);
}

function normalizeEnvironmentVariables(input, field) {
  assertPlainObject(input, field);
  const result = {};
  for (const key of Object.keys(input).sort()) {
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      throw runError("ERR_EXPERIMENT_RUN_COMMAND_INVALID", `${field} contains an invalid environment name`);
    }
    const value = input[key];
    assertPlainObject(value, `${field}.${key}`);
    assertExactKeys(value, ["literal", "secret_ref"], `${field}.${key}`);
    const hasLiteral = Object.hasOwn(value, "literal");
    const hasSecretRef = Object.hasOwn(value, "secret_ref");
    if (hasLiteral === hasSecretRef) {
      throw runError("ERR_EXPERIMENT_RUN_COMMAND_INVALID", `${field}.${key} must contain exactly one value source`);
    }
    if (hasLiteral) {
      if (SECRET_ENV_KEY.test(key)) {
        throw runError("ERR_RAW_SECRET_FORBIDDEN", `${field}.${key} must use a secret_ref`);
      }
      result[key] = { literal: normalizeScalar(value.literal, `${field}.${key}.literal`) };
    } else {
      result[key] = { secret_ref: normalizeText(value.secret_ref, `${field}.${key}.secret_ref`) };
    }
  }
  return result;
}

function normalizeOutput(input, field) {
  assertPlainObject(input, field);
  assertExactKeys(input, ["root", "log_file", "config_file", "metrics_file"], field);
  const files = [input.log_file, input.config_file, input.metrics_file].map((value, index) => (
    normalizePortableComponent(value, `${field}.${["log_file", "config_file", "metrics_file"][index]}`)
  ));
  assertUnique(files, `${field} file names`);
  return {
    root: normalizeRunPath(input.root, `${field}.root`),
    log_file: files[0],
    config_file: files[1],
    metrics_file: files[2],
  };
}

function normalizeCompiledOutput(input, field, runIdInput) {
  assertPlainObject(input, field);
  assertExactKeys(input, ["root", "directory", "log_path", "config_path", "metrics_path"], field);
  const runId = normalizeSafeIdentifier(runIdInput, "Compiled Experiment run specification.run_id");
  const root = normalizeRunPath(input.root, `${field}.root`);
  const directory = normalizeRunPath(input.directory, `${field}.directory`);
  const expectedDirectory = `${root}/${runId}`;
  if (directory !== expectedDirectory) {
    throw runError("ERR_EXPERIMENT_RUN_IDENTITY_INVALID", `${field}.directory is not bound to run_id`);
  }
  const paths = [input.log_path, input.config_path, input.metrics_path].map((value, index) => (
    normalizeRunPath(value, `${field}.${["log_path", "config_path", "metrics_path"][index]}`)
  ));
  if (paths.some((path) => !path.startsWith(`${directory}/`))) {
    throw runError("ERR_EXPERIMENT_RUN_IDENTITY_INVALID", `${field} paths must be inside the run directory`);
  }
  return {
    root,
    log_file: basename(paths[0]),
    config_file: basename(paths[1]),
    metrics_file: basename(paths[2]),
  };
}

function normalizeResourceLimits(input, field) {
  assertPlainObject(input, field);
  assertExactKeys(input, ["host_memory_bytes", "gpu_memory_bytes", "wall_time_seconds"], field);
  return {
    host_memory_bytes: positiveInteger(input.host_memory_bytes, `${field}.host_memory_bytes`),
    ...(input.gpu_memory_bytes === undefined ? {} : {
      gpu_memory_bytes: positiveInteger(input.gpu_memory_bytes, `${field}.gpu_memory_bytes`),
    }),
    wall_time_seconds: positiveInteger(input.wall_time_seconds, `${field}.wall_time_seconds`),
  };
}

function normalizeScan(input) {
  assertPlainObject(input, "Experiment scan");
  assertNoRawSecrets(input, "Experiment scan");
  assertExactKeys(input, SCAN_KEYS, "Experiment scan");
  if (input.schema_version !== "1") throw runError("ERR_EXPERIMENT_SCAN_SCHEMA_INVALID", "Experiment scan schema_version must be 1");
  const baseRun = normalizeRunInput(input.base_run, "Experiment scan.base_run");
  const fixedParameters = normalizeScalarMap(input.fixed_parameters, "Experiment scan.fixed_parameters");
  const baseFixedOverlap = Object.keys(fixedParameters).filter((key) => Object.hasOwn(baseRun.parameters, key));
  if (baseFixedOverlap.length) {
    throw runError("ERR_EXPERIMENT_SCAN_PARAMETER_CONFLICT", "Experiment scan fixed parameters overlap base_run parameters");
  }
  if (!Array.isArray(input.axes)) throw runError("ERR_EXPERIMENT_SCAN_SCHEMA_INVALID", "Experiment scan.axes must be an array");
  const axes = input.axes.map((entry, index) => normalizeAxis(entry, `Experiment scan.axes[${index}]`));
  assertUnique(axes.map(({ name }) => name), "Experiment scan axis names");
  const reserved = new Set([...Object.keys(baseRun.parameters), ...Object.keys(fixedParameters)]);
  for (const axis of axes) {
    if (reserved.has(axis.name)) throw runError("ERR_EXPERIMENT_SCAN_PARAMETER_CONFLICT", `Experiment scan axis ${axis.name} overlaps fixed parameters`);
    reserved.add(axis.name);
  }
  if (!Array.isArray(input.cases) || input.cases.length === 0) {
    throw runError("ERR_EXPERIMENT_SCAN_SCHEMA_INVALID", "Experiment scan.cases must be non-empty");
  }
  const cases = input.cases.map((entry, index) => normalizeCase(entry, `Experiment scan.cases[${index}]`, reserved));
  assertUnique(cases.map(({ id }) => id), "Experiment scan case ids");
  const normalized = {
    schema_version: "1",
    scan_id: normalizeSafeIdentifier(input.scan_id, "Experiment scan.scan_id"),
    purpose: normalizeText(input.purpose, "Experiment scan.purpose"),
    base_run: baseRun,
    fixed_parameters: fixedParameters,
    axes,
    cases,
  };
  if (input.derived_from_scan_id !== undefined) {
    normalized.derived_from_scan_id = normalizeSafeIdentifier(input.derived_from_scan_id, "Experiment scan.derived_from_scan_id");
  }
  if (input.selection !== undefined) {
    assertPlainObject(input.selection, "Experiment scan.selection");
    assertExactKeys(input.selection, ["axis", "value", "reason"], "Experiment scan.selection");
    if (normalized.derived_from_scan_id === undefined) {
      throw runError("ERR_EXPERIMENT_SCAN_SELECTION_INVALID", "Experiment scan selection requires derived_from_scan_id");
    }
    const selection = {
      axis: normalizeSafeIdentifier(input.selection.axis, "Experiment scan.selection.axis"),
      value: normalizeScalar(input.selection.value, "Experiment scan.selection.value"),
      reason: normalizeText(input.selection.reason, "Experiment scan.selection.reason"),
    };
    if (
      !Object.hasOwn(fixedParameters, selection.axis)
      || canonicalHash(fixedParameters[selection.axis]) !== canonicalHash(selection.value)
    ) {
      throw runError("ERR_EXPERIMENT_SCAN_SELECTION_INVALID", "Experiment scan selection must match a fixed parameter");
    }
    normalized.selection = selection;
  }
  return normalized;
}

function normalizeAxis(input, field) {
  assertPlainObject(input, field);
  assertExactKeys(input, ["name", "values"], field);
  if (!Array.isArray(input.values) || input.values.length === 0) {
    throw runError("ERR_EXPERIMENT_SCAN_SCHEMA_INVALID", `${field}.values must be non-empty`);
  }
  const values = input.values.map((value, index) => normalizeScalar(value, `${field}.values[${index}]`));
  assertUnique(values.map(canonicalHash), `${field}.values`);
  return { name: normalizeSafeIdentifier(input.name, `${field}.name`), values };
}

function normalizeCase(input, field, reserved) {
  assertPlainObject(input, field);
  assertExactKeys(input, ["id", "dataset", "parameters"], field);
  let dataset = {};
  if (input.dataset !== undefined) {
    assertPlainObject(input.dataset, `${field}.dataset`);
    assertExactKeys(input.dataset, ["id", "version", "subset", "scene", "trace", "external_location_id"], `${field}.dataset`);
    dataset = Object.fromEntries(Object.entries(input.dataset).map(([key, value]) => [key, normalizeText(value, `${field}.dataset.${key}`)]));
  }
  const parameters = input.parameters === undefined
    ? {}
    : normalizeScalarMap(input.parameters, `${field}.parameters`);
  for (const key of Object.keys(parameters)) {
    if (reserved.has(key)) {
      throw runError("ERR_EXPERIMENT_SCAN_PARAMETER_CONFLICT", `${field}.parameters overlaps an axis or fixed parameter`);
    }
  }
  return {
    id: normalizeSafeIdentifier(input.id, `${field}.id`),
    dataset,
    parameters,
  };
}

function cartesianAxes(axes) {
  let combinations = [{}];
  for (const axis of axes) {
    const next = [];
    for (const prior of combinations) {
      for (const value of axis.values) next.push({ ...prior, [axis.name]: value });
    }
    combinations = next;
  }
  return combinations;
}

function materializeArgv(run) {
  const values = run.command.argument_bindings.flatMap((binding) => {
    const value = resolveBinding(run, binding.source);
    return [binding.flag, String(value)];
  });
  return [...run.environment.run_prefix, ...run.command.argv, ...values];
}

function resolveBinding(run, source) {
  if (source === "dataset.scene") {
    if (run.dataset.scene === undefined) throw runError("ERR_EXPERIMENT_RUN_BINDING_MISSING", `Run binding ${source} is missing`);
    return run.dataset.scene;
  }
  if (source === "dataset.trace") {
    if (run.dataset.trace === undefined) throw runError("ERR_EXPERIMENT_RUN_BINDING_MISSING", `Run binding ${source} is missing`);
    return run.dataset.trace;
  }
  const key = source.slice("parameters.".length);
  if (!Object.hasOwn(run.parameters, key)) throw runError("ERR_EXPERIMENT_RUN_BINDING_MISSING", `Run binding ${source} is missing`);
  return run.parameters[key];
}

function normalizeBindingSource(value, field) {
  const source = normalizeText(value, field);
  if (source === "dataset.scene" || source === "dataset.trace") return source;
  if (/^parameters\.[A-Za-z0-9][A-Za-z0-9._-]*$/.test(source)) return source;
  throw runError("ERR_EXPERIMENT_RUN_BINDING_INVALID", `${field} is not a supported binding`);
}

function buildReadableRunId(run) {
  const caseValue = run.dataset.scene ?? run.dataset.trace ?? run.dataset.id;
  const parts = [slug(run.id_prefix), slug(caseValue)];
  for (const key of Object.keys(run.parameters).sort()) {
    parts.push(slug(key), slug(run.parameters[key]));
  }
  const id = parts.join("-");
  const normalized = normalizeSafeIdentifier(id, "Experiment run run_id");
  if (Buffer.byteLength(normalized, "utf8") > 240) {
    throw runError(
      "ERR_EXPERIMENT_RUN_ID_TOO_LONG",
      "Experiment run_id exceeds the portable output-directory component limit; use shorter readable aliases",
    );
  }
  return normalized;
}

function normalizeScalarMap(input, field) {
  assertPlainObject(input, field);
  const result = {};
  for (const key of Object.keys(input).sort()) {
    const normalizedKey = normalizeSafeIdentifier(key, `${field} key`);
    result[normalizedKey] = normalizeScalar(input[key], `${field}.${key}`);
  }
  return result;
}

function normalizeScalar(value, field) {
  if (typeof value === "string") return normalizeText(value, field);
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return Object.is(value, -0) ? 0 : value;
  throw runError("ERR_EXPERIMENT_RUN_SCHEMA_INVALID", `${field} must be a string, number, or boolean`);
}

function normalizeArgv(input, field) {
  if (!Array.isArray(input) || input.length === 0) {
    throw runError("ERR_EXPERIMENT_RUN_COMMAND_INVALID", `${field} must be a non-empty array`);
  }
  return input.map((value, index) => normalizeText(value, `${field}[${index}]`));
}

function normalizeRunPath(value, field, options = {}) {
  if (options.allowDot && value === ".") return ".";
  let path;
  try {
    path = normalizeWorkspacePath(value);
  } catch {
    throw runError("ERR_EXPERIMENT_RUN_PATH_INVALID", `${field} must be a safe relative path`);
  }
  if (path === ".pipeline" || path.startsWith(".pipeline/") || path === ".git" || path.startsWith(".git/")) {
    throw runError("ERR_EXPERIMENT_RUN_PATH_INVALID", `${field} targets private Workflow or Git storage`);
  }
  assertPortableRelativePath(path, field);
  return path;
}

function normalizeExternalPath(value, field) {
  const path = normalizeText(value, field);
  if (!path.startsWith("/") || path.split("/").some((part) => part === "..")) {
    throw runError("ERR_EXPERIMENT_RUN_MACHINE_INVALID", `${field} must be an absolute metadata path without traversal`);
  }
  return path;
}

function normalizeGitObject(value, field) {
  if (typeof value !== "string" || !/^[a-f0-9]{40}$/.test(value)) {
    throw runError("ERR_EXPERIMENT_RUN_SNAPSHOT_INVALID", `${field} must be a complete 40-character Git object id`);
  }
  return value;
}

function normalizeText(value, field) {
  if (typeof value !== "string" || value !== value.trim() || !value || value.length > 4096 || /[\0\r\n]/.test(value)) {
    throw runError("ERR_EXPERIMENT_RUN_SCHEMA_INVALID", `${field} must be non-empty single-line text`);
  }
  return value;
}

function normalizePortableComponent(value, field) {
  const component = normalizeSafeIdentifier(value, field);
  if (Buffer.byteLength(component, "utf8") > 240) {
    throw runError("ERR_EXPERIMENT_RUN_PATH_INVALID", `${field} exceeds the portable path-component limit`);
  }
  return component;
}

function assertPortableRelativePath(path, field) {
  if (Buffer.byteLength(path, "utf8") > 3800) {
    throw runError("ERR_EXPERIMENT_RUN_PATH_INVALID", `${field} exceeds the portable relative-path limit`);
  }
  if (path.split("/").some((component) => Buffer.byteLength(component, "utf8") > 240)) {
    throw runError("ERR_EXPERIMENT_RUN_PATH_INVALID", `${field} contains an oversized path component`);
  }
}

function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw runError("ERR_EXPERIMENT_RUN_SCHEMA_INVALID", `${field} must be a positive safe integer`);
  }
  return value;
}

function assertUnique(values, field) {
  if (new Set(values).size !== values.length) {
    throw runError("ERR_EXPERIMENT_SCAN_DUPLICATE", `${field} contains duplicates`);
  }
}

function sortedObject(value) {
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, value[key]]));
}

function slug(value) {
  if (typeof value === "number") {
    const normalized = Object.is(value, -0) ? 0 : value;
    const negative = normalized < 0;
    const magnitude = String(Math.abs(normalized))
      .toLocaleLowerCase()
      .replace("+", "plus-")
      .replace(".", "p");
    return `${negative ? "neg-" : ""}${magnitude}`;
  }
  const rendered = String(value)
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!rendered) throw runError("ERR_EXPERIMENT_RUN_ID_COLLISION", "Experiment run value has no readable id representation");
  return rendered;
}

function clone(value) {
  return structuredClone(value);
}

function runError(code, message) {
  return authorityError(code, message);
}
