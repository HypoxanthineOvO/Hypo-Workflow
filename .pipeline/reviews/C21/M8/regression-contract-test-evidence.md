# C21-M8 Maintained Regression Contract TEST Evidence

## 结论

M8 release-ready regression 的独立 TEST 合同已建立，当前状态为预期 `RED`。新增测试没有修改 production、CLI、package scripts、Skill、docs、Runtime、Manifest、Receipt，也没有删除或改写任何旧测试或 scenario。

本轮确认旧 `cli/bin/hypo-workflow` 是 C21 已退休的 installed-software surface，不应通过兼容 stub 恢复。它以及所有直接加载或调用它的 Core 测试和 scenario 必须进入 `quarantined`；当前默认 maintained runner 只能执行 host-loaded Skill 架构下的现行行为测试。

## 现状证据

输入证据显示旧全量入口不再能代表当前产品：

- `/tmp/c21-m8-postdelete-npm.tap`：`936` tests，`769` pass，`167` fail。主要失败是旧 root exports、已删除 Child Skills、旧 adapter/TUI/Rules/Automation surface 与 retired CLI 的静态依赖。
- `/tmp/c21-m8-postdelete-regression.txt`：`31/68` scenarios passed。大量失败场景绑定已移除命令、旧 OpenCode/Claude adapter 或 installed-software CLI。
- 当前物理 inventory：`164` 个 `core/test/*.test.js`；`76` 个非 placeholder、带 `checklist.md` 的注册 scenario，其中 8 个是本轮新增的 C21 maintained lane。
- 当前直接依赖 retired CLI 的 Core 测试：`11` 个。
- 当前直接依赖 retired CLI 的 scenario：`8` 个。

因此不能继续让 `npm test` 无差别加载全部旧测试，也不能删除失败文件来获得假 GREEN。正确边界是完整 catalog + 默认 maintained + 显式 quarantine/all 诊断入口。

## 新增合同

新增 `core/test/c21-m8-regression-contract.test.js`，覆盖以下行为：

1. `tests/regression-catalog.json` 必须把每个物理 Core 测试和每个注册 scenario 精确分为 `maintained` 或 `quarantined`；重复、重叠和漏项均失败。
2. 每个 entry 必须有非空 `reason`；每个 quarantine 必须给出至少一个、且实际属于 maintained 集的 replacement。
3. retired CLI 必须出现在 `retired_surfaces`，replacement 为 host-loaded Root Skill 的 `/hw:guide` 与 `/hw:init`。
4. 所有直接加载或调用 retired CLI 的测试/scenario 必须 quarantine；当前识别清单见下文。
5. maintained Core 集必须包含 C21 M1-M8 的具体架构/行为测试，并通过 `covers` 明确 Milestone 映射；不能只用命令数量或 Markdown 短语替代。
6. catalog runner 必须对 `unclassified`、`overlap`、`missing reason`、`missing replacement` 四类临时恶意 catalog fail closed。
7. 默认 `npm test` 只选择 maintained；`npm run test:all` 和 `npm run test:quarantine` 提供显式诊断入口。三者的 dry-run JSON 都必须显示 maintained/quarantined/selected 数量与精确路径。
8. 默认 `python3 tests/run_regression.py` 只选择 maintained；`--set all` 与 `--set quarantined` 提供显式诊断入口，并使用同一 catalog。
9. runner dry-run 前后会对 `core/test/` 与 `tests/scenarios/` 做内容摘要，防止诊断过程删除或改写旧 corpus。
10. 8 个精确 C21 scenario 路径必须进入 maintained，并分别声明 `init`、`goal`、`cycle`、`maintain`、`resume`、`accept-reject`、`deletion-drift` 与 `codex-hook-process` coverage。

### 建议 catalog schema

```json
{
  "schema_version": "1",
  "retired_surfaces": [
    {
      "path": "cli/bin/hypo-workflow",
      "classification": "quarantined",
      "reason": "Installed-software CLI retired by C21 Skill-first architecture.",
      "replacement": ["/hw:guide", "/hw:init"]
    }
  ],
  "suites": {
    "core": {
      "maintained": [
        {
          "path": "core/test/workspace-format.test.js",
          "classification": "maintained",
          "reason": "Current manifest workspace behavior.",
          "covers": ["C21-M1"]
        }
      ],
      "quarantined": [
        {
          "path": "core/test/ink-tui.test.js",
          "classification": "quarantined",
          "reason": "Exercises retired CLI/TUI surface.",
          "replacement": ["core/test/root-skill-router.test.js"]
        }
      ]
    },
    "scenarios": {
      "maintained": [
        {
          "path": "tests/scenarios/c21/s70-init-current",
          "classification": "maintained",
          "reason": "Current manifest-based Init behavior.",
          "covers": ["init"]
        }
      ],
      "quarantined": []
    }
  }
}
```

Runner `--dry-run --json` 的建议输出合同：

```json
{
  "schema_version": "1",
  "suite": "core",
  "selected_set": "maintained",
  "maintained_count": 0,
  "quarantined_count": 0,
  "selected_count": 0,
  "selected_paths": []
}
```

`core` 与 `scenarios` 使用相同字段；实际计数和路径必须与 catalog 精确一致。Core runner 建议路径为 `tests/run_core_tests.mjs`，并支持 `--catalog <path> --set maintained|quarantined|all --dry-run --json`。Python runner 使用同名 `--set`、`--dry-run`、`--json` 和 `--catalog` 语义。

## Retired CLI 依赖清单

### Core tests

- `core/test/claude-settings-sync.test.js`
- `core/test/daily-project-summary.test.js`
- `core/test/global-config-registry.test.js`
- `core/test/global-consolidation.test.js`
- `core/test/init-automation-contract.test.js`
- `core/test/ink-tui.test.js`
- `core/test/layered-config-integration.test.js`
- `core/test/legacy-write-fence.test.js`
- `core/test/project-events.test.js`
- `core/test/project-notifications.test.js`
- `core/test/sync-standardization.test.js`

### Scenarios

- `tests/scenarios/v11/s63-init-automation-non-git`
- `tests/scenarios/v9/s53-global-cli-tui-setup`
- `tests/scenarios/v9/s54-opencode-plugin-scaffold`
- `tests/scenarios/v9/s55-opencode-command-map`
- `tests/scenarios/v9/s56-agents-ask-todo-plan-discipline`
- `tests/scenarios/v9/s57-opencode-events-auto-continue-file-guard`
- `tests/scenarios/v9/s58-opencode-full-v84-parity`
- `tests/scenarios/v9/s61-opencode-model-matrix-sync`

清单由合同测试从当前源文件直接识别；后续若新增 direct dependency，也会自动要求 quarantine。

## C21 Maintained Scenario Lane

这些场景只做两件事：从 `run.sh` 自身位置计算仓库根，然后调用现有当前行为测试。它们不复制实现、不调用 retired CLI，也不写旧 Workflow authority。

| Scenario | Coverage | Existing behavior test |
|---|---|---|
| `tests/scenarios/c21/s70-init-current` | `init` | `init-bootstrap.test.js` 的 empty repository Init transaction |
| `tests/scenarios/c21/s71-goal-delivery` | `goal` | `goal-lifecycle.test.js` 的完整 Goal lifecycle |
| `tests/scenarios/c21/s72-cycle-delivery` | `cycle` | `cycle-lifecycle-vnext.test.js` 的 Milestone order 与 aggregate acceptance |
| `tests/scenarios/c21/s73-maintain-ambient` | `maintain` | `maintain-ambient.test.js` 全部三个行为测试 |
| `tests/scenarios/c21/s74-resume-recovery` | `resume` | `goal-lifecycle.test.js` 的 fresh-process Resume fallback |
| `tests/scenarios/c21/s75-accept-reject` | `accept-reject` | `cycle-lifecycle-vnext.test.js` 的 reject/revise/restart/final accept |
| `tests/scenarios/c21/s76-deletion-drift` | `deletion-drift` | `deletion-gate.test.js` 的 Receipt/content/Git drift matrix |
| `tests/scenarios/c21/s77-codex-hook-process` | `codex-hook-process` | `codex-hook-process.test.js` 的 Official Hook process contracts |

每个目录包含 `checklist.md`、可执行 `run.sh` 和 `results/.gitkeep`。

## 验证结果

### JavaScript syntax

```bash
node --check core/test/c21-m8-regression-contract.test.js
```

结果：`PASS`。

### Focused RED

```bash
node --test core/test/c21-m8-regression-contract.test.js
```

结果：`0/8 pass`，退出码 `1`。八个顶层合同都首先在同一前置条件失败：

```text
shared regression catalog is required at tests/regression-catalog.json
```

这证明当前 implementation 尚未建立 release-ready catalog。创建 catalog 后，测试会继续暴露 runner、package script、Python selector、非法 catalog fail-closed 和具体分类问题；当前没有用 skip 或兼容 fallback 隐藏后续约束。

### C21 scenario GREEN

8 个 `run.sh` 均从 `/tmp` 调用，以验证它们不依赖调用方当前目录：

| Scenario | Result | Behavior assertions |
|---|---:|---:|
| `s70-init-current` | GREEN | `1/1` |
| `s71-goal-delivery` | GREEN | `1/1` |
| `s72-cycle-delivery` | GREEN | `1/1` |
| `s73-maintain-ambient` | GREEN | `3/3` |
| `s74-resume-recovery` | GREEN | `1/1` |
| `s75-accept-reject` | GREEN | `1/1` |
| `s76-deletion-drift` | GREEN | `6/6` |
| `s77-codex-hook-process` | GREEN | `2/2` |

合计 `16/16` behavior assertions 通过。`bash -n` 对全部 8 个脚本通过；脚本权限为 `0755`，checklist 与 `.gitkeep` 为 `0644`。

### Whitespace

```bash
git diff --check -- core/test/c21-m8-regression-contract.test.js
```

结果：`PASS`。

## 修改文件

- `core/test/c21-m8-regression-contract.test.js`
- `.pipeline/reviews/C21/M8/regression-contract-test-evidence.md`
- `tests/scenarios/c21/s70-init-current/{checklist.md,run.sh,results/.gitkeep}`
- `tests/scenarios/c21/s71-goal-delivery/{checklist.md,run.sh,results/.gitkeep}`
- `tests/scenarios/c21/s72-cycle-delivery/{checklist.md,run.sh,results/.gitkeep}`
- `tests/scenarios/c21/s73-maintain-ambient/{checklist.md,run.sh,results/.gitkeep}`
- `tests/scenarios/c21/s74-resume-recovery/{checklist.md,run.sh,results/.gitkeep}`
- `tests/scenarios/c21/s75-accept-reject/{checklist.md,run.sh,results/.gitkeep}`
- `tests/scenarios/c21/s76-deletion-drift/{checklist.md,run.sh,results/.gitkeep}`
- `tests/scenarios/c21/s77-codex-hook-process/{checklist.md,run.sh,results/.gitkeep}`

## 预期实现结果

实现角色应新增共享 catalog 与 Core runner，更新 `package.json` 和 `tests/run_regression.py` 的选择入口，但保留旧测试与 scenario 文件供显式诊断。默认 maintained 集必须实际运行 C21 M1-M8 行为 anchors；quarantine 不是删除，也不能计入 release GREEN。

## 问题与风险

- 由于 catalog 尚不存在，当前 RED 在第一道前置门停止，四类恶意 catalog 的深层失败会在实现后才执行；合同代码已经写入对应 negative fixtures。
- catalog 必须在 implementation worker 开始时按最新物理 tree 生成。若并发增加新的 `*.test.js` 或注册 scenario，精确覆盖检查会有意失败，防止漏项。
- `all`/`quarantined` 是诊断入口，允许暴露旧失败；只有默认 maintained 结果属于 release gate。
- 本 TEST worker 没有运行或修改 production，也没有代替 IMPLEMENT 决定每个非 CLI 旧测试的最终分类。
