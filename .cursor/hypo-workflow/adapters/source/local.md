# Local Source Adapter

V0 reads prompt files from the configured `prompts_dir`.

## Rules

- Prompt files live under `{prompts_dir}/`
- Filename format: `{NN}-{name}.md`
- Example names:
  - `00-scaffold.md`
  - `01-core-crud.md`
- Execution order is determined by ascending filename sort

## Recommended Prompt Structure

Each prompt file should include these sections:

- `需求`
- `预期测试`
- `预期产出`

Minor heading variations are acceptable if the meaning is still clear.
