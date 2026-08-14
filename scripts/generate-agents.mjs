#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAgentsDocument } from "../core/src/artifacts/agents-template.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const content = buildAgentsDocument();
const target = join(root, "AGENTS.md");
await writeFile(target, content, "utf8");
console.log(`Generated ${target} (${content.length} chars)`);
