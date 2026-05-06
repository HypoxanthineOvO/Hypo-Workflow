# M08 / F003 - RTL Domain Pack Reference Implementation

## Objective

- Implement RTL as the first domain-pack reference implementation for Verilog, SystemVerilog, and SpinalHDL workflow guidance.

## 需求

- Add an RTL domain pack using the M07 boundary.
- Include terminology and task framing for Verilog, SystemVerilog, and SpinalHDL.
- Provide review checklists for combinational logic, sequential logic, clocks, resets, stimulus, expected behavior, and simulation evidence.
- Provide testbench/simulation validation strategy guidance.
- Provide common tool probe declarations without vendor lock-in.
- Keep formal verification, CDC, timing closure, and vendor-specific flows out of scope.

## Boundaries

- In scope:
  - `domains/rtl/` or equivalent built-in reference pack path
  - domain manifest
  - prompt snippets/checklists/test-profile fragments
  - tests for pack loading and rendered checklist content
- Do not add hardware tool dependencies.
- Do not require real Verilog simulator installation for tests.

## Non-Goals

- No formal verification flow.
- No CDC methodology.
- No synthesis/timing constraints.
- No vendor-specific FPGA/ASIC automation.

## Implementation Plan

1. Add fixture tests that load the RTL pack through the domain-pack helper.
2. Implement the RTL manifest and content files.
3. Add checklist rendering for combinational/sequential/testbench concerns.
4. Add tool probe declarations for common simulator/build tools as metadata only.
5. Document the reference-pack status and future externalization path.

## 预期测试

- RTL manifest validates.
- Rendered RTL checklist mentions combinational logic, sequential logic, clock/reset, testbench, simulator evidence, and SpinalHDL.
- Tool probes are metadata-only and do not execute during load.
- No RTL-specific code path bypasses the generic domain-pack interface.

## Validation Commands

- `node --test core/test/*domain*.test.js`
- `node --test core/test/*.test.js`
- `git diff --check`

## Evidence

- Include rendered RTL checklist sample.
- Include load-order evidence proving RTL uses the generic domain-pack path.

## Human QA

- Confirm the first RTL pack is useful for planning and review even without formal/CDC support.

## 预期产出

- Built-in RTL domain pack.
- RTL checklist/test-profile fragments.
- Focused tests and docs.
