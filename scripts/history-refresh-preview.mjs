#!/usr/bin/env node

import { resolve } from "node:path";
import { writeHistoryRefreshPreview } from "../core/src/history-refresh/index.js";

const args = process.argv.slice(2);
const rootArgument = args[0] && !args[0].startsWith("--") ? args.shift() : ".";
const outputIndex = args.indexOf("--output");
if (outputIndex >= 0 && !args[outputIndex + 1]) {
  throw new Error("--output requires a path under .pipeline/history-refresh");
}
const output = outputIndex >= 0 ? args[outputIndex + 1] : undefined;
const root = resolve(rootArgument);
const result = await writeHistoryRefreshPreview(root, output ? { output } : {});
process.stdout.write(`${JSON.stringify({
  status: result.status,
  output: result.output,
  inventory: result.inventory,
  proposed_files: result.files.size,
  uncertainties: result.uncertainties.length,
}, null, 2)}\n`);
