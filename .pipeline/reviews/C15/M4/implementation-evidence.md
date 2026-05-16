# C15-M4 Implementation Evidence

## Scope

- Worker: implement plus main-agent integration after RED test evidence
- Source files changed:
  - `skills/cycle/SKILL.md`
  - `skills/start/SKILL.md`
  - `references/skill-spec.md`
  - `core/src/skills/index.js`
- Installed bundle files changed:
  - `/home/heyx/.codex/skills/hypo-workflow/skills/cycle/SKILL.md`
  - `/home/heyx/.codex/skills/hypo-workflow/skills/start/SKILL.md`
  - `/home/heyx/.codex/skills/hypo-workflow/references/skill-spec.md`

## Change Summary

The broken child-local reference was:

```text
assets/state-init.yaml
```

inside child Skills such as `skills/cycle/SKILL.md`. Because child Skills are loaded from their own directory, this can be interpreted as `skills/cycle/assets/state-init.yaml`, which does not exist.

The repaired shared root asset reference is:

```text
../../assets/state-init.yaml
```

from child Skill directories such as `skills/cycle/` and `skills/start/`.

## Technical Approach

The fix uses a path convention instead of copying files:

- child-local assets may stay as `assets/...` only when the file really exists under the child Skill directory
- shared root assets must use an explicit shared-root relative path such as `../../assets/state-init.yaml`
- root assets are not duplicated into `skills/*/assets/`

`checkSkillQuality()` now scans inline code references for `assets/...`. If the child-local file does not exist but a root file with the same path does exist, it reports `child-skill-shared-asset-path` and recommends `../../assets/...`.

## Validation

Commands run:

```sh
node --test core/test/skill-quality.test.js
uv run -- node --test core/test/skill-quality.test.js core/test/skill-spec.test.js
rg -n '`assets/state-init\.yaml`|`assets/' skills /home/heyx/.codex/skills/hypo-workflow/skills
test -f assets/state-init.yaml
test -f /home/heyx/.codex/skills/hypo-workflow/assets/state-init.yaml
test ! -e skills/cycle/assets/state-init.yaml
test ! -e /home/heyx/.codex/skills/hypo-workflow/skills/cycle/assets/state-init.yaml
```

Results:

- source skill-quality/spec tests: passing
- source and installed root assets exist
- no child-local `skills/cycle/assets/state-init.yaml` copy exists
- no remaining child Skill inline `` `assets/...` `` references in source or installed bundle

## Notes

The installed Codex bundle is older than the source tree for the M3 `/hw:analysis` command surface. For this M4 path issue, the installed bundle's own command map still has 40 commands and passes its own skill quality checks after the path repair. Full installed-bundle synchronization remains a final integration/readiness concern for M5.
