import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { assertExactKeys, assertPlainObject, authorityError } from "../runtime/internal.js";

// C027：精简 init。只搭人类可读的语义目录骨架，不做机器化引导。
export async function initializeWorkspace(root, request = {}, options = {}) {
  const workspace = resolve(root);
  const req = normalizeRequest(request);
  const clock = typeof options.clock === "function" ? options.clock : undefined;
  const now = clock ? new Date(clock()) : new Date();
  const stamp = now.toISOString().replace(/\.\d+Z$/, "Z").split("T")[0];

  const pipeline = join(workspace, ".pipeline");
  const writes = [];

  const projectIndex = [
    "---",
    "kind: project-index",
    `name: ${req.name}`,
    "status: active",
    "---",
    "",
    `# ${req.name} 项目索引`,
    "",
    "## 当前工作",
    "",
    "- [Cycle 索引](cycles/INDEX.md)：无 active Cycle。",
    "- [Memory 索引](memory/INDEX.md)。",
    "- [Experiment 索引](experiments/INDEX.md)。",
    "",
    "## 读取顺序",
    "",
    "普通恢复先读本索引、当前 Cycle 的 Plan/Progress/Execution/Discussion Summary。",
    "",
  ].join("\n");

  const cycleIndex = [
    "---",
    "kind: cycle-index",
    "status: idle",
    "---",
    "",
    "# Cycle 索引",
    "",
    "## Active Cycles",
    "",
    "无。",
    "",
    "## Closed Cycles",
    "",
    "无。",
    "",
  ].join("\n");

  const memoryIndex = [
    "---",
    "kind: memory-index",
    "status: active",
    "---",
    "",
    "# Memory 索引",
    "",
    "人类可读长期事实。按约束等级分组：`constraint`（必须）、`guideline`（应该）、`reference`（参考方法）。文件按 `kind-语义名.md` 命名，无哈希。",
    "",
    "## 约束级（必须）",
    "",
    "无。",
    "",
    "## 指导级（应该）",
    "",
    "无。",
    "",
    "## 参考级（方法）",
    "",
    "无。",
    "",
  ].join("\n");

  const experimentIndex = [
    "---",
    "kind: experiment-index",
    "status: active",
    "---",
    "",
    "# Experiment 索引",
    "",
    "无。",
    "",
  ].join("\n");

  writes.push({ path: join(pipeline, "INDEX.md"), content: projectIndex });
  writes.push({ path: join(pipeline, "cycles", "INDEX.md"), content: cycleIndex });
  writes.push({ path: join(pipeline, "memory", "INDEX.md"), content: memoryIndex });
  writes.push({ path: join(pipeline, "experiments", "INDEX.md"), content: experimentIndex });
  writes.push({ path: join(pipeline, "local", ".gitignore"), content: "*\n" });
  writes.push({ path: join(pipeline, "memory", "inbox", ".gitkeep"), content: "" });
  for (const dir of ["global/rules", "global/requirements", "global/knowledge"]) {
    writes.push({ path: join(pipeline, "memory", dir, ".gitkeep"), content: "" });
  }

  for (const write of writes) {
    await mkdir(join(write.path, ".."), { recursive: true });
    await writeFile(write.path, write.content, "utf8");
  }

  return {
    status: "initialized",
    workspace,
    manifest: { name: req.name, description: req.description, updated: stamp },
    writes: writes.map((write) => ({ path: write.path })),
  };
}

export async function readProjectIndex(root = ".") {
  const workspace = resolve(root);
  const { parseFrontmatter } = await import("../serialization/index.js");
  const parsed = parseFrontmatter(await readFile(join(workspace, ".pipeline", "INDEX.md"), "utf8"));
  return { ...parsed.attributes, body: parsed.body };
}

export async function readWorkspaceDescription(root = ".") {
  const workspace = resolve(root);
  try {
    const text = await readFile(join(workspace, ".pipeline", "INDEX.md"), "utf8");
    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    return lines.slice(4, 12).join("\n") || null;
  } catch {
    return null;
  }
}

export function renderInitSummary(request = {}) {
  const req = normalizeRequest(request);
  return [
    `# ${req.name} 初始化`,
    "",
    req.description ? `- 目的：${req.description}` : "- 目的：未填写",
    "- 已创建：`.pipeline/INDEX.md`、`cycles/`、`memory/`（global 分层 + inbox）、`experiments/`、`local/`（gitignore）",
    "- 下一步：按 /hw:guide 选择路径；先 Discussion 弄清目的、边界与验证目标。",
    "",
  ].join("\n");
}

function normalizeRequest(request) {
  assertPlainObject(request, "Init request");
  assertExactKeys(request, ["name", "description"], "Init request");
  if (typeof request.name !== "string" || !request.name.trim()) {
    throw authorityError("ERR_INIT_NAME_REQUIRED", "Init request.name is required");
  }
  const name = request.name.trim().replace(/\s+/g, "-").slice(0, 60);
  return { name, description: typeof request.description === "string" ? request.description.trim() : "" };
}
