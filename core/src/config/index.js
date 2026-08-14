import { readFile } from "node:fs/promises";
import { parseYaml, stringifyYaml } from "../serialization/index.js";

// C027：config 退化为薄 YAML 辅助；机器化配置层已移除。
export { parseYaml, stringifyYaml };

export async function loadYamlFile(path) {
  return parseYaml(await readFile(path, "utf8"));
}

export function normalizeProfile(value) {
  return value === "strict" || value === "minimal" ? value : "recommended";
}
