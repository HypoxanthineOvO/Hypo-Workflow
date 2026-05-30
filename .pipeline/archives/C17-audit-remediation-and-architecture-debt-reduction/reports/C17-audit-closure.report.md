# C17 审计闭环报告

生成时间：2026-05-21（Asia/Shanghai）

## 结论

C17 针对 `.pipeline/audits/audit-001.md` 的 3 个 Critical、6 个已枚举 Warning、6 个 Info 做了闭环处理。用户终端摘要曾写作 7 个 Warning，但审计源文件中实际枚举的 Warning ID 为 6 个；本报告以审计源文件的可追踪 ID 为准。当前 release readiness 结论为：无 blocker；可进入最终 audit/acceptance 判断，但本报告不宣称 Cycle 已 accepted。

最终验证证据来自 `.pipeline/reviews/C17/M6/test-evidence.md`：

- `npm test`：661/661 PASS。
- `git diff --check`：PASS。
- `rg -n '/home/heyx' core/src scripts`：PASS，无命中。
- workspace/parser/export/ledger 专项扫描：PASS with classified residual。
- 当前 inventory：`hardcoded_paths=0`、`duplicate_helpers=15`、`workspace_imports=0`、`yaml_parsers=1`、`ledger_rewrites=129`、`barrel_exports=0`。
- M0 baseline：`hardcoded_paths=31`、`duplicate_helpers=14`、`workspace_imports=9`、`yaml_parsers=2`、`ledger_rewrites=137`、`barrel_exports=55`。

## Closure Matrix

| ID | 原始级别 | 原始问题 | C17 状态 | 证据 | 说明 |
| --- | --- | --- | --- | --- | --- |
| SEC-01 | Critical | `workspace/index.js` 和 `project-events` 中硬编码 `/home/heyx/...` 路径，泄露用户环境并阻断可移植运行。 | fixed | C17-M2；M6 `hardcoded_paths=0`；`rg -n '/home/heyx' core/src scripts` 无命中。 | 路径、Hypo-Claw、Hypo-Writer、project seed 改为分层配置或 HOME 派生；用户级配置迁移只允许显式命令触发。 |
| ARCH-01 | Critical | 工具函数大量重复，缺少共享 `utils` 层。 | fixed | C17-M1；新增 `core/src/utils/index.js`；M1/M6 `npm test` PASS。 | 低风险重复 helper 已迁移到共享 utils。M6 inventory 的 `duplicate_helpers=15` 是宽松 detector 残留，不作为当前 release blocker。 |
| ARCH-02 | Critical | `workspace/index.js` God Module 承担 workspace authority、linkage、stop event、codex capture、notification 等职责。 | fixed | C17-M4；`core/src/workspace/index.js` 删除；workspace stale import 扫描仅剩 `workspace-authority` 新模块误报。 | 已拆为 `workspace-authority`、`project-linkage`、`project-stop-events`、`codex-capture`、`notification-sender`，不保留旧 shim。 |
| ARCH-03 | Warning | `project-events/index.js` 硬编码 Hypo-Writer CLI 调用方式。 | fixed | C17-M2；`rg -n '/home/heyx' core/src scripts` 无命中；project-events 回归 PASS。 | Writer CLI spec 改为配置/默认值派生，不再绑定单一用户目录。 |
| ARCH-04 | Warning | `config/index.js` 自实现 YAML parser，功能受限。 | fixed | C17-M3；`js-yaml` manifest/lock 声明；M6 `yaml_parsers=1`。 | 剩余 `parseYaml` 是统一 `js-yaml` public wrapper，不是 split parser。 |
| ARCH-05 | Warning | 模块数量膨胀，多个模块组职责重叠。 | follow-up candidate | C17-M4/M5 已拆 workspace 并清理 root barrel；M6 无 blocker。 | C17 关闭了最严重的 workspace God Module 和 barrel export 面，但没有全面重组 `platform-adapters`、project event/notification 管道或 maintenance 子系统。该问题属于架构减债后续候选，不阻塞本次 release readiness，因为当前行为回归全绿，且原始高风险耦合点已被专项处理。 |
| ARCH-06 | Warning | config YAML parser 与 knowledge YAML parser 实现分裂。 | fixed | C17-M3；`parseKnowledgeYaml` 无命中；YAML focused 回归 PASS。 | knowledge 读写已复用 config 的统一 `parseYaml` / `stringifyYaml`。 |
| PERF-01 | Warning | project-events、maintenance、notification、daily summary 等 ledger 写入为 O(n) YAML 重写。 | fixed | C17-M5；新增 JSONL ledger authority；M6 ledger scan PASS with classified residual。 | 高频写入改为 append-only JSONL；compact YAML 仅做人读 metadata summary。`ledger_rewrites=129` 是宽松 detector 和 analysis/fixture/self-test 残留，不等价于长期 YAML authority。 |
| TEST-01 | Warning | 项目根目录测试套件无法运行。 | fixed | C17-M0；M6 `npm test` 661/661 PASS。 | 根目录 `package.json` 提供稳定 `npm test` 入口。 |
| QUAL-01 | Info | root barrel `export *` 无选择性，命名空间污染。 | fixed | C17-M5；M6 `barrel_exports=0`；`export * from` 无真实生产命中。 | `core/src/index.js` 与 `maintenance/index.js` 改为显式 re-export。 |
| QUAL-02 | Info | `DEFAULT_TIMEZONE_OFFSET` 硬编码为 `+08:00`。 | fixed | C17-M2；分层配置与 timezone 默认策略迁移；M2/M6 回归 PASS。 | 时区来源改为配置/defaults 派生，保留 Asia/Shanghai 作为当前项目配置语义而非源码硬编码假设。 |
| QUAL-03 | Info | `assistant-hooks` 在 git status 中显示修改但文件系统不存在。 | fixed | M6 文档收口前 `git status --short -- core/src/assistant-hooks/index.js` 无输出。 | 当前未发现该 ghost file 仍作为工作树残留；本项是状态卫生问题，未要求生产代码改动。若后续全仓 git status 出现同类条目，可作为独立 repo hygiene 处理。 |
| QUAL-04 | Info | `PROJECT_LINKAGE_SEED_PROJECTS` 过度冻结，实际应由配置驱动。 | fixed | C17-M2/M4；seed 数据迁移到分层配置/workspace authority；workspace split PASS。 | 特定用户项目清单不再作为旧 `workspace/index.js` 常量 authority。 |
| QUAL-05 | Info | `notificationStdinPayload` 使用 `new String()` 包装对象并 monkey patch。 | fixed | C17-M4；notification sender 拆分；workspace behavior focused tests PASS。 | 通知发送逻辑从旧 workspace God Module 中拆出，旧 `new String()` hack 随旧文件删除。 |
| QUAL-06 | Info | `deep-plan/index.js` 最大单文件，建议按子命令拆分。 | follow-up candidate | C17 未专项拆分 deep-plan；M6 `npm test` PASS。 | 本项未阻塞 C17 release readiness：它是局部可维护性建议，不涉及本 Cycle 的硬编码、测试入口、YAML parser、workspace shim、ledger authority 或 export blocker。建议后续 Cycle 单独拆分 Deep Plan 子命令并配套 focused tests。 |

## Release Readiness 判断

本次 C17 release readiness 的 blocker 条件均已通过：根目录测试可运行、硬编码 runtime 路径清零、旧 workspace shim 删除、YAML parser 不再分裂、长期 ledger authority 改为 JSONL、root broad barrel 清零。

保留项为架构减债性质：`ARCH-05` 的全局模块重组和 `QUAL-06` 的 deep-plan 单文件拆分。二者不影响当前 release readiness，因为没有对应失败测试、没有违反 C17 的强制扫描 gate，也没有阻断用户环境可移植性或数据 authority 安全性。
