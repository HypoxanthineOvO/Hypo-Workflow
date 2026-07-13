import { lstat, readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  WORKSPACE_MANIFEST_PATH,
  validateWorkspaceManifest,
} from "../manifest/index.js";
import { parseYaml } from "../serialization/index.js";

export const WORKSPACE_FORMAT_KINDS = Object.freeze([
  "empty",
  "unmanaged_brownfield",
  "current",
  "legacy",
  "damaged_current",
  "mixed_current_with_legacy_residue",
]);

const CURRENT_PIPELINE_ENTRIES = new Set([
  "manifest.yaml",
  "runtime",
  "memory",
  "snapshots",
]);

const TOLERATED_NON_AUTHORITY_PIPELINE_SIDECARS = new Set([
  "chat",
  "chats",
  "inbox",
]);

export const LEGACY_WORKSPACE_WRITER_INVENTORY = Object.freeze([
  inventory("legacy.lifecycle.commit", "core/src/lifecycle/commit.js", ["commitWorkflowUpdate"]),
  inventory("legacy.acceptance", "core/src/acceptance/index.js", ["markCyclePendingAcceptance", "acceptCycle", "rejectCycle"]),
  inventory("legacy.continuation", "core/src/continuation/index.js", ["writeContinuationState"]),
  inventory("legacy.log", "core/src/log/index.js", ["appendLifecycleLogEntry", "scripts/log-append.sh"]),
  inventory("legacy.compact", "core/src/compact/index.js", ["runEndOfRunCompact"]),
  inventory("legacy.sync", "core/src/sync/index.js", ["runProjectSync", "writeClaudeHookArtifacts", "syncClaudeCodeSettings", "repairDerivedArtifacts"]),
  inventory("legacy.config.project", "core/src/config/index.js", ["writeConfig"]),
  inventory("legacy.artifacts.opencode", "core/src/artifacts/opencode.js", ["writeOpenCodeArtifacts"]),
  inventory("legacy.artifacts.claude", "core/src/artifacts/claude.js", ["writeClaudeCodePluginArtifacts", "writeClaudeCodeAgentArtifacts"]),
  inventory("legacy.artifacts.third-party", "core/src/artifacts/third-party.js", ["writeThirdPartyAdapterArtifacts", "writeCursorSkillBundle"]),
  inventory("legacy.docs", "core/src/docs/index.js", ["repairDocs"]),
  inventory("legacy.readme", "core/src/readme/index.js", ["updateReadme"]),
  inventory("legacy.actions.project-sync", "core/src/actions/index.js", ["syncSelectedProjectAction"]),
  inventory("legacy.tui.project-config", "core/src/tui/index.js", ["applyConfigTuiEdit"]),
  inventory("legacy.rules", "core/src/rules/index.js", ["writeConfirmedStructuredRule", "writeStructuredHabitsDocument"]),
  inventory("legacy.knowledge", "core/src/knowledge/index.js", ["appendKnowledgeRecord", "rebuildKnowledgeIndexes", "renderKnowledgeCompact", "rebuildKnowledgeLedger"]),
  inventory("legacy.patches", "core/src/patches/index.js", ["requestPatchAcceptance", "acceptPatch", "rejectPatch"]),
  inventory("legacy.explore", "core/src/explore/index.js", ["createExploration", "endExploration", "archiveExploration", "createExploreAnalysisContext"]),
  inventory("legacy.deep-plan", "core/src/deep-plan/index.js", ["createDeepPlanPackage", "updateDeepPlanPackage", "recordDeepPlanAskRound", "recordDeepPlanResearch", "updateDeepPlanArchitectureMap", "drillDeepPlanTopic", "convertDeepPlanToPlanContext", "archiveDeepPlanPackage"]),
  inventory("legacy.pr", "core/src/pr/index.js", ["writeChangeRequestArchive", "writeChangeRequestCreateProposal", "executeChangeRequestCreatePlan", "inspectChangeRequest", "reviewChangeRequest", "planChangeRequestFix", "prepareChangeRequestMerge", "prepareChangeRequestClose"]),
  inventory("legacy.cli.init-project", "cli/bin/hypo-workflow", ["initProject"]),
  inventory("legacy.hook.codex-notify", "hooks/codex-notify.sh", ["hooks/codex-notify.sh#scripts/log-append.sh"]),
]);

const KNOWN_WRITERS = new Set(LEGACY_WORKSPACE_WRITER_INVENTORY.map((entry) => entry.id));

export async function detectWorkspaceFormat(root = ".") {
  const workspaceRoot = resolve(root);
  if (!await optionalLstat(workspaceRoot)) return { kind: "empty" };
  const manifestFile = join(workspaceRoot, WORKSPACE_MANIFEST_PATH);
  const manifestStat = await optionalLstat(manifestFile);
  const legacyResidue = await hasLegacyResidue(workspaceRoot);

  if (manifestStat) {
    if (!manifestStat.isFile() || manifestStat.isSymbolicLink()) {
      return { kind: "damaged_current" };
    }
    try {
      const parsed = parseYaml(await readFile(manifestFile, "utf8"));
      validateWorkspaceManifest(parsed);
    } catch {
      return { kind: "damaged_current" };
    }
    return { kind: legacyResidue ? "mixed_current_with_legacy_residue" : "current" };
  }

  if (legacyResidue) return { kind: "legacy" };
  const entries = await readdir(workspaceRoot, { withFileTypes: true });
  const meaningful = entries.filter((entry) => entry.name !== ".git");
  return { kind: meaningful.length ? "unmanaged_brownfield" : "empty" };
}

export async function assertLegacyWorkspaceWritable(root = ".", writerId) {
  if (!KNOWN_WRITERS.has(writerId)) {
    const error = new Error(`Unknown legacy workspace writer: ${writerId}`);
    error.code = "ERR_UNKNOWN_LEGACY_WRITER";
    throw error;
  }

  const detected = await detectWorkspaceFormat(root);
  if (detected.kind === "damaged_current") {
    const error = new Error("Workspace manifest is damaged; legacy writes fail closed");
    error.code = "ERR_WORKSPACE_MANIFEST_DAMAGED";
    throw error;
  }
  if (detected.kind === "current" || detected.kind === "mixed_current_with_legacy_residue") {
    const error = new Error(`Legacy workspace writer ${writerId} is blocked for ${detected.kind} workspaces`);
    error.code = "ERR_LEGACY_WORKSPACE_WRITE_BLOCKED";
    throw error;
  }
  return detected;
}

async function hasLegacyResidue(root) {
  const pipeline = join(root, ".pipeline");
  try {
    const entries = await readdir(pipeline, { withFileTypes: true });
    return entries.some((entry) => (
      !CURRENT_PIPELINE_ENTRIES.has(entry.name)
      && !TOLERATED_NON_AUTHORITY_PIPELINE_SIDECARS.has(entry.name)
    ));
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return false;
    throw error;
  }
}

async function optionalLstat(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
    throw error;
  }
}

function inventory(id, module, entrypoints) {
  return Object.freeze({ id, module, entrypoints: Object.freeze([...entrypoints]) });
}
