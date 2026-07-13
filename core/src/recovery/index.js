import { assertExactKeys, assertPlainObject, normalizeSafeIdentifier } from "../runtime/internal.js";
import {
  rebuildContextCapsuleInternal,
  readContextCapsuleInternal,
  updateContextCapsuleInternal,
} from "./capsule.js";
import {
  RECOVERY_EVENT_TYPES,
  appendRecoveryEventWithPolicy,
  readRecoveryBlobInternal,
  replayRecoveryJournalInternal,
} from "./journal.js";
import {
  applyRecoveryRetentionInternal,
  planRecoveryRestoreWithPolicy,
  planRecoveryRetentionInternal,
  sealRecoveryPackWithPolicy,
  selectLatestValidRecoveryPackInternal,
  validateRecoveryPackInternal,
} from "./pack.js";
import {
  assertNoTimeOverride,
  normalizeRecoveryPolicy,
} from "./shared.js";

export { RECOVERY_EVENT_TYPES };

export function createRecoveryStore(input = {}) {
  const policy = normalizeRecoveryPolicy(input);
  return Object.freeze({
    appendRecoveryEvent(root, event, options = {}) {
      assertEmptyOperationOptions(options, "appendRecoveryEvent options");
      return appendRecoveryEventWithPolicy(root, event, policy);
    },
    replayRecoveryJournal(root, replayInput, options = {}) {
      assertEmptyOperationOptions(options, "replayRecoveryJournal options");
      return replayRecoveryJournalInternal(root, replayInput);
    },
    readRecoveryBlob(root, digest, options = {}) {
      assertEmptyOperationOptions(options, "readRecoveryBlob options");
      return readRecoveryBlobInternal(root, digest);
    },
    updateContextCapsule(root, capsuleInput, options = {}) {
      assertTransactionOptions(options, "updateContextCapsule options");
      return updateContextCapsuleInternal(root, capsuleInput, options);
    },
    rebuildContextCapsule(root, capsuleInput, options = {}) {
      assertTransactionOptions(options, "rebuildContextCapsule options");
      return rebuildContextCapsuleInternal(root, capsuleInput, options);
    },
    readContextCapsule(root, objectRef, options = {}) {
      assertEmptyOperationOptions(options, "readContextCapsule options");
      return readContextCapsuleInternal(root, objectRef);
    },
    sealRecoveryPack(root, packInput, options = {}) {
      assertTransactionOptions(options, "sealRecoveryPack options");
      return sealRecoveryPackWithPolicy(root, packInput, options, policy);
    },
    validateRecoveryPack(root, packRef, options = {}) {
      assertEmptyOperationOptions(options, "validateRecoveryPack options");
      return validateRecoveryPackInternal(root, packRef);
    },
    selectLatestValidRecoveryPack(root, objectRef, options = {}) {
      assertEmptyOperationOptions(options, "selectLatestValidRecoveryPack options");
      return selectLatestValidRecoveryPackInternal(root, objectRef);
    },
    planRecoveryRestore(root, restoreInput, options = {}) {
      assertEmptyOperationOptions(options, "planRecoveryRestore options");
      return planRecoveryRestoreWithPolicy(root, restoreInput, policy);
    },
    planRecoveryRetention(root, retentionInput, options = {}) {
      assertEmptyOperationOptions(options, "planRecoveryRetention options");
      return planRecoveryRetentionInternal(root, retentionInput);
    },
    async applyRecoveryRetention(root, plan, options = {}) {
      const operation = normalizeRetentionApplyOptions(options);
      return applyRecoveryRetentionInternal(root, plan, operation);
    },
  });
}

export async function appendRecoveryEvent(root, input, options = {}) {
  assertEmptyOperationOptions(options, "appendRecoveryEvent options");
  return appendRecoveryEventWithPolicy(root, input, normalizeRecoveryPolicy({}));
}

export async function replayRecoveryJournal(root, input, options = {}) {
  assertEmptyOperationOptions(options, "replayRecoveryJournal options");
  return replayRecoveryJournalInternal(root, input);
}

export async function readRecoveryBlob(root, digest, options = {}) {
  assertEmptyOperationOptions(options, "readRecoveryBlob options");
  return readRecoveryBlobInternal(root, digest);
}

export async function updateContextCapsule(root, input, options = {}) {
  assertTransactionOptions(options, "updateContextCapsule options");
  return updateContextCapsuleInternal(root, input, options);
}

export async function rebuildContextCapsule(root, input, options = {}) {
  assertTransactionOptions(options, "rebuildContextCapsule options");
  return rebuildContextCapsuleInternal(root, input, options);
}

export async function readContextCapsule(root, objectRef, options = {}) {
  assertEmptyOperationOptions(options, "readContextCapsule options");
  return readContextCapsuleInternal(root, objectRef);
}

export async function sealRecoveryPack(root, input, options = {}) {
  assertTransactionOptions(options, "sealRecoveryPack options");
  return sealRecoveryPackWithPolicy(root, input, options, normalizeRecoveryPolicy({}));
}

export async function validateRecoveryPack(root, packRef, options = {}) {
  assertEmptyOperationOptions(options, "validateRecoveryPack options");
  return validateRecoveryPackInternal(root, packRef);
}

export async function selectLatestValidRecoveryPack(root, objectRef, options = {}) {
  assertEmptyOperationOptions(options, "selectLatestValidRecoveryPack options");
  return selectLatestValidRecoveryPackInternal(root, objectRef);
}

export async function planRecoveryRestore(root, input, options = {}) {
  assertEmptyOperationOptions(options, "planRecoveryRestore options");
  return planRecoveryRestoreWithPolicy(root, input, normalizeRecoveryPolicy({}));
}

export async function planRecoveryRetention(root, input, options = {}) {
  assertEmptyOperationOptions(options, "planRecoveryRetention options");
  return planRecoveryRetentionInternal(root, input);
}

export async function applyRecoveryRetention(root, plan, options = {}) {
  const operation = normalizeRetentionApplyOptions(options);
  return applyRecoveryRetentionInternal(root, plan, operation);
}

function assertEmptyOperationOptions(options, field) {
  assertNoTimeOverride(options, field);
  assertExactKeys(options, [], field);
}

function assertTransactionOptions(options, field) {
  assertNoTimeOverride(options, field);
  assertPlainObject(options, field);
  assertExactKeys(options, ["id", "faultInjector"], field);
}

function normalizeRetentionApplyOptions(options) {
  const field = "applyRecoveryRetention options";
  assertNoTimeOverride(options, field);
  assertExactKeys(options, ["id"], field);
  return { id: normalizeSafeIdentifier(options.id, `${field}.id`) };
}
