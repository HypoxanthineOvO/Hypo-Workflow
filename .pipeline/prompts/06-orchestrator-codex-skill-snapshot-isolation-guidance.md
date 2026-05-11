# M07 / F001 - Codex Skill Snapshot Isolation Guidance

## Objective

- Document and standardize safe Codex skill consumption so active development does not mutate the skill currently being read by Codex.

## Prompt Shape

canonical milestone prompt only

## Subworker Assignment Plan

- `test`: validate docs/examples/guard guidance if testable, with explicit regression checks for snapshot/copy isolation wording, controlled sync fallback, and no self-modifying live-symlink advice
- `implement`: update Codex platform docs/guidance, including the source skill file, the sync guidance, and any adapter-facing instructions that mention safe skill development
- `audit`: confirm the guidance reduces self-modifying skill-source risk, does not overclaim guarantees, and preserves the distinction between supporting guidance and the main workflow contract

## Required Work

- prefer snapshot or controlled sync for live skill consumption
- explain why direct hot-edit symlink can be risky during self-modifying skill work
- keep this as supporting guidance, not the main audit feature
- make the guidance concrete enough that a worker can act on it without inventing missing steps
- ensure the prompt itself names the files or surfaces that should change
- add explicit non-goals so the worker does not drift into unrelated workflow redesign

## Pass Signal

- Codex docs clearly describe safe development-time isolation, include at least one concrete safe path, and state the live-symlink hazard in operational terms
