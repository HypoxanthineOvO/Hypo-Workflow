# C15-M5 Implementation Evidence

Timestamp: 2026-05-16T12:28:58+08:00

## Installed Freshness Repair

Synchronized the C15-M3 `/hw:analysis` install surface from `/home/heyx/Hypo-Workflow` into `/home/heyx/.codex/skills/hypo-workflow` without whole-repo rsync and without deleting other installed files.

Installed files updated:

- `skills/analysis/SKILL.md`
- `.opencode/commands/hw-analysis.md`
- `core/src/commands/index.js`
- `core/src/analysis/index.js`
- `core/src/opencode-status/index.js`
- `core/src/claude-status/index.js`
- `SKILL.md`
- `.opencode/hypo-workflow.json`
- `opencode.json`

## Verification

Command surface:

```sh
cd /home/heyx/.codex/skills/hypo-workflow
node core/bin/hw-core commands --platform opencode | node -e '...'
```

Result:

```json
{
  "count": 41,
  "hasAnalysis": true,
  "analysis": {
    "canonical": "/hw:analysis",
    "opencode": "/hw-analysis",
    "agent": "hw-debug",
    "route": "analysis",
    "skill": "skills/analysis/SKILL.md"
  }
}
```

Skill quality:

```sh
cd /home/heyx/.codex/skills/hypo-workflow
node --input-type=module -e "import { checkSkillQuality } from './core/src/skills/index.js'; const result = await checkSkillQuality({ repoRoot: process.cwd() }); console.log(JSON.stringify(result, null, 2)); if (!result.ok) process.exit(1);"
```

Result: `ok: true`, `0 issues across 41 Skill files`.

M4 path preservation:

```sh
cd /home/heyx/.codex/skills/hypo-workflow
rg -n "\\.\\./\\.\\./assets/state-init\\.yaml" skills/start skills/cycle core/src
```

Result:

```text
skills/cycle/SKILL.md:86:   - 从共享根资产 `../../assets/state-init.yaml` 重置 `.pipeline/state.yaml`
skills/start/SKILL.md:32:4. 如果存在，读取 `.pipeline/state.yaml`；否则从共享根资产 `../../assets/state-init.yaml` 初始化状态。
```

Analysis command file:

```sh
ls -l /home/heyx/.codex/skills/hypo-workflow/.opencode/commands/hw-analysis.md
```

Result: file exists.

Source parity spot check:

`cmp -s` confirmed installed copies match source for all updated files listed above.

## Risk

No installed files outside the requested allowlist were edited. Existing unrelated source-repo worktree changes were not reverted or overwritten.

## Runner Filter Repair

Updated `tests/run_regression.py` so repeated `--scenario` arguments run only the named scenarios, preserve the requested order, and report unknown scenario names with exit code `2` instead of silently ignoring them. Full runs without `--scenario` keep the existing all-scenario behavior. Filtered result JSON files now use a selected-count suffix instead of the fixed `s01-s30` suffix.

Verification command:

```sh
cd /home/heyx/Hypo-Workflow
uv run python tests/run_regression.py --scenario s24-audit-report --scenario s25-debug-flow --scenario s38-patch-fix-flow --scenario s62-analysis-preset-runtime
```

Result:

```text
PASS s24-audit-report (0.086s)
PASS s25-debug-flow (0.068s)
PASS s38-patch-fix-flow (0.072s)
PASS s62-analysis-preset-runtime (0.248s)

Summary: 4/4 passed
```

Filtered JSON artifact:

```text
tests/results/20260516T123210-selected-4.json
```

Unknown scenario check:

```sh
cd /home/heyx/Hypo-Workflow
uv run python tests/run_regression.py --scenario does-not-exist
```

Result: clear `Unknown scenario(s): does-not-exist` error, with script exit code `2`.

## Audit Repair: Regression Result Suffix

The M5 read-only audit found that filtered regression results used `selected-<count>`, but full-suite results still used the legacy suffix `s01-s30` even though the registered suite now contains 68 scenarios through `s69-*`.

Repair:

- `tests/run_regression.py` now writes full-suite result files with `all-<count>`.
- Filtered runs still write `selected-<count>`.

Expected behavior:

- `uv run python tests/run_regression.py --scenario s24-audit-report ...` writes `*-selected-4.json`.
- `uv run python tests/run_regression.py` writes `*-all-68.json` for the current registered suite.
