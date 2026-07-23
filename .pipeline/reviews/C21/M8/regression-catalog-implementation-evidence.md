# C21-M8 Maintained/Quarantine Regression IMPLEMENT Evidence

## 结论

C21-M8 的透明回归目录和双 lane runner 已实现。默认发布门禁现在只执行 manifest-based、Skill-first 的当前行为；历史、已移除、延期和 retired CLI 相关测试仍完整保留、可显式运行，并继续以真实失败退出，未被删除或伪装为 PASS。

当前 catalog 精确覆盖：

| Suite | Maintained | Quarantined | Total |
|---|---:|---:|---:|
| Core test files | 48 | 116 | 164 |
| Registered scenarios | 8 | 68 | 76 |
| Combined entries | 56 | 184 | 240 |

每个 entry 都有非空 `reason`；每个 quarantined entry 都至少指向一个真实 maintained replacement。`cli/bin/hypo-workflow` 被显式登记为 retired/quarantined surface，replacement 为 `/hw:guide` 和 `/hw:init`。

## 分类原则

1. C21 M1-M8 的 32 个行为 anchor 全部 maintained，并用 `covers` 绑定对应 Milestone。
2. 继续 maintained 的支持契约包括 Delivery proposal preflight、M5 single-writer/Knowledge fence、YAML/transaction compatibility、当前 Deep Plan 行为、内部 Explain evidence、会话内 completion response、metadata-only secret refs 和共享 utils。
3. 已移除的 Rules/Patch/Showcase/Watchdog/TUI、延期的 Analysis/Audit/PR/非 Codex adapter、旧 global automation/JSONL ledger，以及 legacy `state.yaml` lifecycle 进入 quarantine。
4. 所有直接加载或调用 retired installed-software CLI 的 11 个 Core tests 与 8 个 scenarios 均 quarantine。
5. Scenario 默认 lane 只保留 `s70`-`s77` 的 C21 thin behavior lane；原 68 个 scenario 不删除，继续由 `--set quarantined|all` 运行。
6. 分类不是删除权限。后续若物理清理 quarantine corpus，仍需新的 exact Deletion Manifest 与批准。

## 技术实现

- `tests/regression-catalog.json` 是 Core 与 scenario 的共享、显式、source-controlled inventory。
- `tests/run_core_tests.mjs` 独立扫描物理 `core/test/*.test.js` 和注册 scenario，拒绝漏项、重复、重叠、非法路径、空 reason、缺失 replacement 和非 maintained replacement。
- Core runner 支持 `--catalog`、`--set maintained|quarantined|all`、`--dry-run` 和 `--json`；非 dry-run 将精确路径交给 Node test runner，并透传真实退出码。
- `tests/run_regression.py` 使用相同 catalog 和 fail-closed 校验；不再以 `TARGET_SCENARIOS` 硬编码集合为 authority。任何带 `run.sh` 的 catalog scenario 都通过通用路径执行，因此 `s70`-`s77` 不需要新增名称分支。
- Scenario dry-run 在任何写入前返回；实际执行也不再自动向仓库写 timestamp result，避免回归诊断污染测试 corpus。
- 根包和 Core 包的默认 `npm test` 都选择 maintained；`test:all`、`test:quarantine`、`test:inventory` 暴露完整诊断面。Core 的 scenario smoke 同步改为当前 maintained scenario lane。

## 修改文件

- `tests/regression-catalog.json`
- `tests/run_core_tests.mjs`
- `tests/run_regression.py`
- `package.json`
- `core/package.json`
- `.pipeline/reviews/C21/M8/regression-catalog-implementation-evidence.md`

没有修改任何现有 `core/test/*.test.js`、旧 scenario、production Core、Skill、docs、CLI、Workflow authority，也没有删除文件或触碰 Codex-VSP。

## 测试设计与结果

| Validation | Result |
|---|---:|
| RED contract after implementation | `12/12` PASS |
| Default `npm test` | `479/479` PASS across 48 selected files |
| Default `python3 tests/run_regression.py` | `8/8` scenarios PASS |
| M8 contract + surface + deletion suite | `52/52` PASS |
| Core quarantine actual execution | exit `1` with original failures |
| Scenario quarantine actual execution | exit `1`, `31/68` historical scenarios passed |
| Core all dry-run inventory | `164/164` selected |
| Scenario all dry-run inventory | `76/76` selected |
| Malicious catalog: unclassified scenario | rejected, exit `2` |
| Malicious catalog: missing replacement | rejected, exit `2` |
| JSON / JavaScript / Python / C21 shell syntax | PASS |
| Root and Core package dry-run routing | PASS |
| Tracked and untracked whitespace/diff checks | PASS |
| Repository `tests/results/` mutation | none |

The contract also generated temporary malicious catalogs for Core `unclassified`, `overlap`, `missing reason`, and `missing replacement`; all four failed closed. Dry-run digests in the contract confirmed no rewrite of `core/test/` or `tests/scenarios/`.

## 预期效果

- `npm test` 再次成为严格且有意义的当前发布门禁，而不是被 167 个历史失败淹没的全量 glob。
- 新增 Core test 或 registered scenario 若未登记，runner 会在执行前失败，不能静默逃离回归面。
- 历史失败仍然可见、可执行、可追踪；`test:quarantine` 和 `--set quarantined` 不会把已知失败重新标成成功。
- C21 的 Init、Goal、Cycle、Maintain、Resume、Accept/Reject、Deletion drift 与 Official Codex Hook process 都有默认 scenario coverage。

## 遇到的问题

- 旧 Core 和 scenario corpus 同时包含当前行为、removed surface、deferred adapter 与 legacy authority，不能仅按当前 PASS/FAIL 自动分类。本实现以 C21 product boundary 和现有 M1-M8 evidence 为先，再用逐文件执行结果校验 maintained 集。
- 第一次 quarantine 验证脚本误用了 zsh 只读变量 `status`；测试命令本身已完成，随后用普通变量 `code` 重新执行并确认两个 quarantine runner 都真实退出 `1`。这不是产品或 runner 故障。
- `s59-v9-regression-bundle` 仍检查已删除的 `TARGET_SCENARIOS` 字面量；它因此在 quarantine 中失败，符合该旧 bundle 不再定义 authority 的预期。

## 风险与后续

- Quarantine 中仍有 mixed-current/legacy 文件。当前行为已有 maintained replacement，但后续可逐个拆出更细的 current assertions；不能把 quarantine 永久当作无需复查的废弃区。
- Catalog 是 C21 当前 policy snapshot。未来增加测试或 scenario 必须同时做显式分类，否则 inventory 会 fail closed。
- `test:all` 和 `test:quarantine` 预期非零；CI/release gate 必须使用默认 maintained 命令，同时把 quarantine 作为独立诊断结果展示。
- 本实现没有授权也没有执行旧 corpus 的物理删除、自动改写或更广泛 cleanup。
