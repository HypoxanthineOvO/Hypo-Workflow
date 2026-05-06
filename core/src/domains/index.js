import { access, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const LOCAL_DOMAIN_ID = /^[a-z0-9][a-z0-9-]*$/;
const EXTERNAL_REF_PREFIX = /^(github|git|https?|npm):|^@[^/]+\/[^/]+/i;

export function normalizeDomainPackRef(ref) {
  const value = typeof ref === "string" ? ref.trim() : String(ref?.id || ref?.ref || "").trim();
  if (!value) {
    return {
      kind: "invalid",
      ref: "",
      supported: false,
      reason: "domain reference is required",
    };
  }

  if (LOCAL_DOMAIN_ID.test(value)) {
    return {
      kind: "local",
      id: value,
      ref: value,
      supported: true,
    };
  }

  if (EXTERNAL_REF_PREFIX.test(value)) {
    return {
      kind: "external",
      ref: value,
      supported: false,
      requires_confirmed_install: true,
      reason: "external pack references are metadata-only; remote install and code execution are unsupported until a user confirms installation",
    };
  }

  return {
    kind: "invalid",
    ref: value,
    supported: false,
    reason: "domain reference must be a local id or an external metadata reference",
  };
}

export function validateDomainManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return { valid: false, errors: ["manifest must be an object"] };
  }

  if (!LOCAL_DOMAIN_ID.test(String(manifest.id || ""))) {
    errors.push("id must use lowercase letters, numbers, and dashes");
  }
  if (!hasText(manifest.name)) {
    errors.push("name is required");
  }
  if (!hasText(manifest.version)) {
    errors.push("version is required");
  }
  if (!Array.isArray(manifest.triggers)) {
    errors.push("triggers must be an array");
  }
  if (!Array.isArray(manifest.checklist)) {
    errors.push("checklist must be an array");
  }
  if (Array.isArray(manifest.tool_probes) && manifest.tool_probes.some((probe) => probe?.mode !== "metadata-only")) {
    errors.push("tool probes must be metadata-only");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function loadDomainPack(ref, options = {}) {
  const normalized = normalizeDomainPackRef(ref);
  if (normalized.kind !== "local") {
    return {
      ref: normalized.ref,
      source: normalized.kind,
      supported: false,
      manifest: null,
      content: {},
      reason: normalized.reason,
      requires_confirmed_install: normalized.requires_confirmed_install || false,
    };
  }

  const projectRoot = resolve(options.projectRoot || ".");
  const builtInRoot = resolve(options.builtInRoot || join(projectRoot, "domains"));
  const candidates = [
    { source: "project", dir: join(projectRoot, ".pipeline", "domains", normalized.id) },
    { source: "built-in", dir: join(builtInRoot, normalized.id) },
  ];

  for (const candidate of candidates) {
    const manifestPath = join(candidate.dir, "manifest.json");
    if (!(await exists(manifestPath))) {
      continue;
    }
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const validation = validateDomainManifest(manifest);
    if (!validation.valid) {
      const error = new Error(`invalid domain manifest ${normalized.id}: ${validation.errors.join("; ")}`);
      error.validation = validation;
      throw error;
    }
    return {
      id: normalized.id,
      source: candidate.source,
      dir: candidate.dir,
      manifest,
      content: await loadDomainContent(candidate.dir),
    };
  }

  const error = new Error(`domain pack not found: ${normalized.id}`);
  error.code = "DOMAIN_PACK_NOT_FOUND";
  throw error;
}

export function selectDomainPacksForTask(taskText = "", options = {}) {
  const text = normalizeText(taskText);
  if (!text) return [];

  return (options.manifests || [])
    .map((manifest) => scoreManifest(manifest, text))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .map(({ manifest, matched }) => ({
      id: manifest.id,
      matched,
    }));
}

export async function renderDomainChecklist(domainRefs = [], options = {}) {
  const refs = Array.isArray(domainRefs) ? domainRefs : [domainRefs];
  const snippets = [];
  for (const ref of refs) {
    const pack = await loadDomainPack(ref, options);
    if (pack.supported === false && !pack.manifest) {
      snippets.push(renderUnsupportedDomainPack(pack));
      continue;
    }
    if (pack.content.checklist) {
      snippets.push(pack.content.checklist.trim());
      continue;
    }
    snippets.push(renderManifestChecklist(pack.manifest));
  }
  return snippets.filter(Boolean).join("\n\n");
}

async function loadDomainContent(dir) {
  return {
    checklist: await readOptional(join(dir, "checklist.md")),
    prompts: {
      m07_m09: await readOptional(join(dir, "prompts", "m07-m09.md")),
    },
  };
}

function renderManifestChecklist(manifest) {
  if (!Array.isArray(manifest?.checklist) || manifest.checklist.length === 0) {
    return "";
  }
  return [
    `## ${manifest.name} Domain Checklist`,
    "",
    ...manifest.checklist.map((item) => `- ${item}`),
  ].join("\n");
}

function renderUnsupportedDomainPack(pack) {
  const lines = [
    "## Unsupported Domain Pack Reference",
    "",
    `- ref: ${pack.ref || "(empty)"}`,
    `- source: ${pack.source || "unknown"}`,
    "- status: unsupported",
  ];
  if (pack.requires_confirmed_install) {
    lines.push("- requires confirmed install: yes");
  }
  if (pack.reason) {
    lines.push(`- reason: ${pack.reason}`);
  }
  return lines.join("\n");
}

function scoreManifest(manifest, text) {
  const triggers = [
    ...toList(manifest.triggers),
    ...toList(manifest.languages),
    ...toList(manifest.design_kinds),
  ];
  const matched = [];
  for (const trigger of triggers) {
    const normalized = normalizeText(trigger);
    if (normalized && text.includes(normalized)) {
      matched.push(trigger);
    }
  }
  return {
    id: manifest.id,
    manifest,
    score: new Set(matched.map((item) => normalizeText(item))).size,
    matched,
  };
}

function toList(value) {
  if (Array.isArray(value)) return value.filter(hasText);
  if (hasText(value)) return [value];
  return [];
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9+_-]+/g, " ").trim();
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

async function readOptional(path) {
  if (!(await exists(path))) return "";
  return readFile(path, "utf8");
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
