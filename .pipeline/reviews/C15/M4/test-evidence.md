# C15-M4 Test Evidence

## Scope

- Worker: test
- Files changed by this worker:
  - `core/test/skill-quality.test.js`
  - `.pipeline/reviews/C15/M4/test-evidence.md`

## RED Run

Command:

```sh
node --test core/test/skill-quality.test.js
```

Result: RED / failed as expected.

Key output:

```text
# Subtest: checkSkillQuality rejects child skill references to shared root assets as child-local assets
not ok 2 - checkSkillQuality rejects child skill references to shared root assets as child-local assets
error: |-
  Expected values to be strictly equal:

  true !== false

1..6
# tests 6
# pass 5
# fail 1
```

Interpretation:

- The new failing contract fixture models `skills/cycle/SKILL.md` using ``assets/state-init.yaml`` while only the shared root `assets/state-init.yaml` exists.
- Current `checkSkillQuality` returns `ok: true`, so it does not yet catch the child skill asset path mistake.
- The added allow-list fixtures verify the intended non-error cases:
  - real child-local `assets/`, `references/`, and `scripts/` paths
  - explicit shared root path `../../assets/state-init.yaml`

## GREEN Run

Command:

```sh
node --test core/test/skill-quality.test.js
```

Result: GREEN / passed.

Key output:

```text
1..6
# tests 6
# pass 6
# fail 0
```

Additional validation:

```sh
uv run -- node --test core/test/skill-quality.test.js core/test/skill-spec.test.js
```

Result:

```text
1..9
# tests 9
# pass 9
# fail 0
```

Interpretation:

- `checkSkillQuality` now rejects child Skill references that point to a root shared asset using a child-local path such as `assets/state-init.yaml`.
- It still allows real child-local `assets/`, `references/`, and `scripts/` paths.
- It allows explicit shared-root relative paths such as `../../assets/state-init.yaml`.
