import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadKnowledgeRecords,
  parseYaml,
  stringifyYaml,
} from "../src/index.js";

const COMPLEX_YAML = `title: "YAML: parser unification"
literal: |
  first line: with colon
  second line
folded: >
  folded line one
  folded line two: with colon
quoted_colon: "value: with colon"
single_quoted: 'single: colon'
items:
  - "alpha: one"
  - beta
  - null
nested:
  enabled: true
  count: 2
  nothing: null
  list:
    - name: "first: item"
      value: null
    - name: second
      value: "two: value"
`;

test("parseYaml supports js-yaml standard complex YAML constructs", () => {
  const parsed = parseYaml(COMPLEX_YAML);

  assert.equal(parsed.title, "YAML: parser unification");
  assert.equal(parsed.literal, "first line: with colon\nsecond line\n");
  assert.equal(parsed.folded, "folded line one folded line two: with colon\n");
  assert.equal(parsed.quoted_colon, "value: with colon");
  assert.equal(parsed.single_quoted, "single: colon");
  assert.deepEqual(parsed.items, ["alpha: one", "beta", null]);
  assert.deepEqual(parsed.nested, {
    enabled: true,
    count: 2,
    nothing: null,
    list: [
      { name: "first: item", value: null },
      { name: "second", value: "two: value" },
    ],
  });
});

test("stringifyYaml round-trips through parseYaml with deterministic output", () => {
  const value = {
    title: "YAML: parser unification",
    literal: "first line: with colon\nsecond line\n",
    items: ["alpha: one", "beta", null],
    nested: {
      nothing: null,
      list: [
        { name: "first: item", value: null },
        { name: "second", value: "two: value" },
      ],
    },
  };

  const first = stringifyYaml(value);
  const second = stringifyYaml(value);

  assert.equal(first, second);
  assert.deepEqual(parseYaml(first), value);
});

test("config and knowledge YAML loaders share js-yaml semantics for complex records", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-yaml-unification-"));
  try {
    const recordsDir = join(root, ".pipeline", "knowledge", "records");
    await mkdir(recordsDir, { recursive: true });

    const recordYaml = `schema_version: "1"
id: yaml-unification-record
type: milestone
source:
  cycle: C17
  feature: F001
  milestone: M03
  prompt_file: .pipeline/prompts/03-yaml-parser-unification-with-js-yaml.md
created_at: "2026-05-21T10:00:00+08:00"
summary: "YAML: parser unification"
details:
  description: |
    Keep colon text: intact.
    Preserve arrays and nulls.
  folded: >
    Folded text: should
    become one paragraph.
  optional: null
  values:
    - "alpha: one"
    - beta
    - null
tags:
  - yaml
  - "parser:unification"
categories:
  - dependencies
refs:
  docs:
    - "references/config-spec.md:yaml"
    - references/knowledge-spec.md
`;
    await writeFile(join(recordsDir, "yaml-unification-record.yaml"), recordYaml, "utf8");

    const configParsed = parseYaml(recordYaml);
    const [knowledgeRecord] = await loadKnowledgeRecords(root);

    assert.equal(knowledgeRecord.summary, configParsed.summary);
    assert.equal(knowledgeRecord.details.description, configParsed.details.description);
    assert.equal(knowledgeRecord.details.folded, configParsed.details.folded);
    assert.equal(knowledgeRecord.details.optional, null);
    assert.deepEqual(knowledgeRecord.details.values, ["alpha: one", "beta", null]);
    assert.deepEqual(knowledgeRecord.tags, ["yaml", "parser:unification"]);
    assert.deepEqual(knowledgeRecord.refs.docs, [
      "references/config-spec.md:yaml",
      "references/knowledge-spec.md",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("public API exposes shared YAML helpers for knowledge consumers", () => {
  assert.equal(typeof parseYaml, "function");
  assert.equal(typeof stringifyYaml, "function");
});

test("package manifests explicitly declare js-yaml", async () => {
  const manifests = [
    JSON.parse(await readFile("package.json", "utf8")),
    JSON.parse(await readFile("core/package.json", "utf8")),
  ];

  assert.ok(
    manifests.some((manifest) => [
      manifest.dependencies,
      manifest.devDependencies,
      manifest.optionalDependencies,
      manifest.peerDependencies,
    ].some((section) => section && Object.hasOwn(section, "js-yaml"))),
    "js-yaml must be declared explicitly in the root or core package manifest",
  );
});
