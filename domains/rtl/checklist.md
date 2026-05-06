# RTL Domain Checklist

- Classify the hardware request as combinational, sequential, or mixed before writing code.
- Name the target language: Verilog, SystemVerilog, or SpinalHDL.
- For combinational logic, confirm complete assignments and latch avoidance.
- For sequential logic, define clock/reset polarity, synchrony, initialization, and state update behavior.
- Keep synthesizable RTL separate from testbench-only constructs.
- Include or request a testbench that exercises reset, normal operation, and at least one edge case.
- Report simulator evidence: command, tool/version when known, pass/fail log, waveform note, or an explicit blocker.
- Tool probes are metadata-only. Do not install simulators, fetch remote packs, or execute external pack code without confirmed user approval.
