---
authority_role: record
confidence: high
created_at: 2026-05-15T18:00:00+08:00
dedupe_key: project:validation:dynamic-selection-localization-installed-freshness
id: requirement-7afeee592a8ed10bda80e7344b981d88
kind: requirement
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 7afeee592a8ed10bda80e7344b981d8834e7d1994e3f9b6b368446d83b2c7999
source_refs:
  - locator: .pipeline/archives/C14-prompt-compatibility-audit/cycle.yaml
    ref: legacy:C14/cycle#cycle.status
    type: legacy_file
  - locator: .pipeline/archives/C14-prompt-compatibility-audit/summary.md
    ref: 'legacy:C14/summary#Key data: bilingual i18n regex and dynamic command count tests'
    type: legacy_file
  - locator: .pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml
    ref: 'legacy:C15/cycle#cycle.lessons: focused regression flags'
    type: legacy_file
  - locator: .pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml
    ref: 'legacy:C15/cycle#cycle.lessons: installed Codex skill bundle freshness'
    type: legacy_file
  - locator: .pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md
    ref: 'legacy:C15/summary#Completion notes: regression runner scenario filter defect'
    type: legacy_file
  - locator: .pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md
    ref: 'legacy:C15/summary#Completion notes: shared asset and installed bundle failures'
    type: legacy_file
supersedes: []
updated_at: 2026-07-12T08:15:40+08:00
---
Validation derives expected command inventory from authority, uses language-aware assertions, proves that focused selectors changed the executed scenario set, and checks installed Skill bundles plus shared asset references against the source version. A green source-only or selector-ambiguous run does not establish the intended runtime contract.
