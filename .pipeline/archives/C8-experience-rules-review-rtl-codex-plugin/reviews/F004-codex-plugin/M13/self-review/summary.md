# C8 M13 Self Review Summary

Verdict: `needs_changes`

Final status: `resolved`

## Findings

- **High - external-domain-checklist-silent-drop**
  `loadDomainPack()` correctly turns external refs such as `github:org/pack` into unsupported metadata, but `renderDomainChecklist()` then passes a `null` manifest to `renderManifestChecklist()` and filters the empty result. The user-facing prompt/report loses the evidence that an external pack was configured but unsupported pending confirmation.

- **Medium - structured-rule-writes-path-separator-assumption**
  `writeConfirmedStructuredRule()` and `writeStructuredHabitsDocument()` build parent directories with string slicing on `/`. This is fragile under Windows path separators and should use `dirname()` or an equivalent path API.

- **Medium - claude-slash-commands-rendered-as-shell-chain**
  `renderClaudeCodexInstallProposal()` returns `command: commands.join(" && ")` even though the listed steps are Claude Code slash commands, not shell commands. The markdown and `commands` array are clear, but the `command` field can mislead adapters or UI code into treating the proposal as an executable shell chain.

## Checked Coverage

- Structured Rules/Habits authority and generated HABITS surface
- Review artifact schema, retry policy, checked/unchecked rule fields, and secret handling
- Domain Pack local/external boundary and RTL pack helper interface
- Claude Code Codex plugin capability/proposal helpers
- OpenCode and third-party adapter review surfaces

## Unchecked Coverage

- Live Claude Code plugin install flow
- Native Windows filesystem smoke run
- Real remote domain pack install/import behavior

## Recommendation

The three round 1 findings were repaired with focused tests. Retry review moved to `subagent-review-r2`.
