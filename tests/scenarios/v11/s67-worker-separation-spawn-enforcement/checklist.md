# s67 Worker Separation Spawn Enforcement

- Run the focused worker separation spawn enforcement test.
- Reject shared implement/test worker identity in recommended and strict modes.
- Reject audit identity reuse in strict mode.
- Ignore runtime-only subtask observations as acceptance evidence.
- Reject missing lifecycle closure.
- Reject changed file ownership and prompt scope mismatches.
- Reject missing persisted prompt scope or changed-file evidence for file-changing implement/test roles.
- Allow explicit empty changed_files with persisted prompt scope as valid no-op worker evidence.
