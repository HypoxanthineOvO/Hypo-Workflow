import test from "node:test";
import assert from "node:assert/strict";
import { parseFrontmatter, parseYaml, stringifyYaml } from "../src/serialization/index.js";

const COMPLEX_YAML = `title: "YAML: parser unification"
literal: |
  first line: with colon
  second line
list:
  - one
  - two: nested
`;

test("parseYaml 支持 js-yaml 标准复杂构造", () => {
  const parsed = parseYaml(COMPLEX_YAML);
  assert.equal(parsed.title, "YAML: parser unification");
  assert.match(parsed.literal, /first line: with colon/);
  assert.equal(parsed.list[1].two, "nested");
});

test("stringifyYaml 与 parseYaml 往返且输出确定", () => {
  const value = { title: "往返", list: [1, "two", { three: true }] };
  const first = stringifyYaml(value);
  const second = stringifyYaml(value);
  assert.equal(first, second);
  assert.deepEqual(parseYaml(first), value);
});

test("parseFrontmatter 分离属性与正文，容忍无 frontmatter", () => {
  const withFm = "---\nkind: plan\nstatus: active\n---\n\n# 正文\n";
  const parsed = parseFrontmatter(withFm);
  assert.equal(parsed.attributes.kind, "plan");
  assert.match(parsed.body, /# 正文/);

  const bare = parseFrontmatter("# 无属性\n");
  assert.equal(bare.attributes.kind, undefined);
  assert.equal(bare.body, "# 无属性\n");
});

test("package manifests 显式声明 js-yaml", async () => {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const { resolve, join } = await import("node:path");
  const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
  for (const name of ["core/package.json", "package.json"]) {
    const manifest = JSON.parse(await readFile(join(root, name), "utf8"));
    if (manifest.dependencies) {
      assert.ok(manifest.dependencies["js-yaml"], `${name} must declare js-yaml`);
    }
  }
});
