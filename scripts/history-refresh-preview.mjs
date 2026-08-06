#!/usr/bin/env node

import { resolve } from "node:path";
import { writeHistoryRefreshPreview } from "../core/src/history-refresh/index.js";

const root = resolve(process.argv[2] || ".");
const result = await writeHistoryRefreshPreview(root);
process.stdout.write(`${JSON.stringify({
  status: result.status,
  output: result.output,
  inventory: result.inventory,
  proposed_files: result.files.size,
  uncertainties: result.uncertainties.length,
}, null, 2)}\n`);

