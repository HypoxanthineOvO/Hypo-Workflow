# M09 / F003 - RTL-Aware Planning Review and Test Integration

## Objective

- Integrate domain packs, especially RTL, into Plan Discover, prompt generation, Test Profiles, and Agent Review.

## 需求

- When an RTL task is detected or selected, Plan Discover should ask domain-aware questions about language, clock/reset model, combinational/sequential boundaries, stimulus, expected behavior, and validation evidence.
- Prompt generation should include relevant RTL domain snippets without making all software tasks carry RTL content.
- Review should include the RTL checklist and record checked/unchecked domain rules.
- Validation guidance should prefer simulator/testbench evidence when available and allow documented fallback when tools are absent.

## Boundaries

- In scope:
  - progressive discover integration
  - test-profile/domain-profile composition
  - review checklist integration
  - prompt template injection
  - focused tests and docs
- Do not require installing Verilog/SpinalHDL tools.
- Do not change default software task prompts when no domain pack is active.

## Non-Goals

- No live hardware simulation runner.
- No generated RTL code framework.
- No formal verification automation.

## Implementation Plan

1. Add tests for RTL detection/selection and domain-aware Discover questions.
2. Add prompt-rendering tests proving RTL snippets appear only when active.
3. Add review/test-profile composition tests.
4. Implement integration through generic domain-pack helpers.
5. Update docs and report guidance.

## 预期测试

- RTL-like task inputs select the RTL domain pack or suggest it.
- Non-RTL tasks do not receive RTL checklist noise.
- Generated prompts include RTL validation expectations when RTL is active.
- Review artifacts list domain checklist results.
- Missing simulator tools are recorded as fallback, not silent success.

## Validation Commands

- `node --test core/test/progressive-discover.test.js`
- `node --test core/test/test-profile*.test.js`
- `node --test core/test/*domain*.test.js`
- `node --test core/test/*.test.js`
- `git diff --check`

## Evidence

- Include one RTL planning prompt sample and one non-RTL control sample.
- Include review artifact fixture with RTL checklist results.

## Human QA

- Confirm RTL questions feel natural rather than generic software engineering questions.

## 预期产出

- RTL-aware Discover, prompt, review, and test-profile integration.
- Focused regression tests.
