import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const CATEGORY_DETECTORS = {
  hardcoded_paths: [
    { kind: "absolute_home_path", pattern: /\/home\/heyx/g },
  ],
  duplicate_helpers: [
    { kind: "plain_object_helper", pattern: /\bfunction\s+isPlainObject\b|\bconst\s+isPlainObject\s*=/g },
  ],
  workspace_imports: [
    { kind: "workspace_index_import", pattern: /(?:from\s+["'][^"']*workspace\/index\.js["']|workspace\/index\.js)/g },
    { kind: "workspace_relative_import", pattern: /from\s+["']\.\.\/workspace(?:\/index\.js)?["']/g },
  ],
  yaml_parsers: [
    { kind: "yaml_parser_helper", pattern: /\bfunction\s+(?:parseYaml|parseKnowledgeYaml)\b|\b(?:parseYaml|parseKnowledgeYaml)\s*=/g },
  ],
  ledger_rewrites: [
    { kind: "ledger_yaml_write", pattern: /ledger\.yaml|\bwriteFile\s*\(|\bstringifyYaml\b/g },
  ],
  barrel_exports: [
    { kind: "barrel_export", pattern: /^export\s+\*\s+from\s+["'][^"']+["'];?/gm },
  ],
};

const DEFAULT_SCAN_TARGETS = [
  "core/src",
  "scripts",
  "README.md",
  "README.en.md",
  "docs",
  "references",
];

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".pipeline",
  "archives",
  "dist",
  "coverage",
  ".cache",
]);

const TEXT_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".json",
  ".md",
  ".yaml",
  ".yml",
  ".sh",
]);

export async function buildAuditInventory({ cwd = process.cwd() } = {}) {
  const root = path.resolve(cwd);
  const categories = Object.fromEntries(
    Object.keys(CATEGORY_DETECTORS).map((category) => [category, { count: 0, entries: [] }]),
  );

  for await (const filePath of scanAuditFiles(root)) {
    const text = await readFile(filePath, "utf8");
    collectMatches(categories, root, filePath, text);
  }

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    categories,
  };
}

export const auditInventory = buildAuditInventory;

async function* scanAuditFiles(root) {
  for (const target of DEFAULT_SCAN_TARGETS) {
    const fullPath = path.join(root, target);
    yield* scanPath(fullPath);
  }
}

async function* scanPath(fullPath) {
  let info;
  try {
    info = await stat(fullPath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return;
    }
    throw error;
  }

  if (info.isDirectory()) {
    const name = path.basename(fullPath);
    if (SKIP_DIRS.has(name)) {
      return;
    }

    const entries = await readdir(fullPath, { withFileTypes: true });
    for (const entry of entries) {
      yield* scanPath(path.join(fullPath, entry.name));
    }
    return;
  }

  if (info.isFile() && TEXT_EXTENSIONS.has(path.extname(fullPath))) {
    yield fullPath;
  }
}

function collectMatches(categories, root, filePath, text) {
  const relativeFile = path.relative(root, filePath);
  const lineStarts = buildLineStarts(text);

  for (const [category, detectors] of Object.entries(CATEGORY_DETECTORS)) {
    for (const detector of detectors) {
      const pattern = resetPattern(detector.pattern);
      for (const match of text.matchAll(pattern)) {
        if (category === "barrel_exports" && relativeFile !== "core/src/index.js") {
          continue;
        }

        categories[category].entries.push({
          file: relativeFile,
          line: findLineNumber(lineStarts, match.index ?? 0),
          match: match[0],
          kind: detector.kind,
        });
      }
    }
  }

  for (const category of Object.keys(categories)) {
    categories[category].count = categories[category].entries.length;
  }
}

function resetPattern(pattern) {
  return new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
}

function buildLineStarts(text) {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") {
      starts.push(index + 1);
    }
  }
  return starts;
}

function findLineNumber(lineStarts, offset) {
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lineStarts[mid] <= offset) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return high + 1;
}
