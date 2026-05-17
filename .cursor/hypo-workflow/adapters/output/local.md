# Local Output Adapter

V0 writes pipeline artifacts to local files resolved from config.

## Output Rules

- Reports are written to `{reports_dir}/`
- Report filename format: `{NN}-{name}.report.md`
- State is written to `{state_file}`
- Log is appended to `{log_file}`

## Persistence Expectations

- Update `state.yaml` after every step transition
- Append to `log.md` after every meaningful event
- Do not silently overwrite previous reports unless the user explicitly restarts or reruns the same prompt
