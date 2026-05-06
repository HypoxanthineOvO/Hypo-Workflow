import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import {
  loadDomainPack,
  normalizeDomainPackRef,
  renderDomainChecklist,
  selectDomainPacksForTask,
  validateDomainManifest,
} from "../src/domains/index.js";

test("RTL reference pack spec and manifest cover M07-M09 hardware planning needs", async () => {
  const spec = await readFile("references/domain-pack-spec.md", "utf8");
  const testProfileSpec = await readFile("references/test-profile-spec.md", "utf8");
  const progressiveSpec = await readFile("references/progressive-discover-spec.md", "utf8");
  const manifest = JSON.parse(await readFile("domains/rtl/manifest.json", "utf8"));
  const checklist = await readFile("domains/rtl/checklist.md", "utf8");

  for (const heading of [
    "# Domain Pack Spec",
    "## Pack Locations",
    "## Manifest Contract",
    "## External References",
    "## RTL Reference Pack",
    "## M07-M09 Prompt Coverage",
  ]) {
    assert.match(spec, new RegExp(`^${escapeRegExp(heading)}$`, "m"));
  }

  for (const phrase of [
    "domains/<id>/",
    ".pipeline/domains/<id>/",
    "project-local pack overrides",
    "external pack references are metadata-only",
    "no remote install",
    "Verilog",
    "SystemVerilog",
    "SpinalHDL",
    "simulator evidence",
  ]) {
    assert.match(spec, new RegExp(escapeRegExp(phrase), "i"));
  }

  assert.equal(manifest.id, "rtl");
  assert.deepEqual(manifest.languages, ["Verilog", "SystemVerilog", "SpinalHDL"]);
  assert.ok(manifest.design_kinds.includes("combinational"));
  assert.ok(manifest.design_kinds.includes("sequential"));
  assert.ok(manifest.evidence.includes("simulator_evidence"));
  assert.ok(manifest.tool_probes.every((probe) => probe.mode === "metadata-only"));

  for (const phrase of [
    "clock/reset",
    "testbench",
    "simulator evidence",
    "combinational",
    "sequential",
  ]) {
    assert.match(checklist, new RegExp(escapeRegExp(phrase), "i"));
  }

  assert.match(testProfileSpec, /RTL Domain/i);
  assert.match(progressiveSpec, /RTL Domain/i);
});

test("domain manifests validate required fields and reject executable probes", () => {
  const valid = {
    id: "rtl",
    name: "RTL",
    version: "1.0.0",
    triggers: ["verilog"],
    languages: ["Verilog"],
    checklist: ["identify clock/reset"],
    tool_probes: [{ id: "verilator", mode: "metadata-only" }],
  };

  assert.deepEqual(validateDomainManifest(valid).errors, []);

  const invalid = validateDomainManifest({
    id: "../rtl",
    name: "bad",
    triggers: [],
    checklist: [],
    tool_probes: [{ id: "install", mode: "execute" }],
  });
  assert.ok(invalid.errors.includes("id must use lowercase letters, numbers, and dashes"));
  assert.ok(invalid.errors.includes("version is required"));
  assert.ok(invalid.errors.includes("tool probes must be metadata-only"));
});

test("project-local domain pack overrides built-in pack", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-domain-pack-"));
  await mkdir(join(dir, "domains", "rtl"), { recursive: true });
  await mkdir(join(dir, ".pipeline", "domains", "rtl"), { recursive: true });

  await writeFile(
    join(dir, "domains", "rtl", "manifest.json"),
    JSON.stringify({
      id: "rtl",
      name: "Built-in RTL",
      version: "1.0.0",
      triggers: ["verilog"],
      checklist: ["built-in checklist"],
    }),
  );
  await writeFile(join(dir, "domains", "rtl", "checklist.md"), "built-in checklist\n");

  await writeFile(
    join(dir, ".pipeline", "domains", "rtl", "manifest.json"),
    JSON.stringify({
      id: "rtl",
      name: "Project RTL",
      version: "2.0.0",
      triggers: ["uvm"],
      checklist: ["project checklist"],
    }),
  );
  await writeFile(join(dir, ".pipeline", "domains", "rtl", "checklist.md"), "project checklist\n");

  const pack = await loadDomainPack("rtl", { projectRoot: dir });
  assert.equal(pack.source, "project");
  assert.equal(pack.manifest.name, "Project RTL");
  assert.equal(pack.content.checklist.trim(), "project checklist");
});

test("external pack references are represented but unsupported without install confirmation", () => {
  const ref = normalizeDomainPackRef("github:example/rtl-pack");
  assert.equal(ref.kind, "external");
  assert.equal(ref.supported, false);
  assert.equal(ref.requires_confirmed_install, true);
  assert.match(ref.reason, /remote install/i);
});

test("external pack checklist rendering preserves unsupported confirmation evidence", async () => {
  const snippet = await renderDomainChecklist(["github:example/rtl-pack"], { projectRoot: "." });

  assert.match(snippet, /Unsupported Domain Pack Reference/);
  assert.match(snippet, /github:example\/rtl-pack/);
  assert.match(snippet, /requires confirmed install: yes/);
  assert.match(snippet, /remote install/i);
});

test("RTL is suggested for HDL tasks and checklist rendering stays quiet for non-RTL", async () => {
  const selection = selectDomainPacksForTask(
    "Implement a SystemVerilog sequential FIFO with async reset and a Verilator testbench.",
    { manifests: [{ id: "rtl", triggers: ["verilog", "systemverilog", "verilator", "testbench"] }] },
  );
  assert.deepEqual(selection.map((item) => item.id), ["rtl"]);

  const quiet = selectDomainPacksForTask(
    "Update the README wording for the release checklist.",
    { manifests: [{ id: "rtl", triggers: ["verilog", "systemverilog", "verilator", "testbench"] }] },
  );
  assert.deepEqual(quiet, []);

  const snippet = await renderDomainChecklist(["rtl"], { projectRoot: "." });
  assert.match(snippet, /RTL Domain Checklist/);
  assert.match(snippet, /simulator evidence/i);

  assert.equal(await renderDomainChecklist([], { projectRoot: "." }), "");
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
