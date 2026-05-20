# C15-M4 Shared Skill Asset Path Contract Report

## 结论

C15-M4 已完成。`cycle`/`start` 子 Skill 中容易被解析成子目录本地文件的 ``assets/state-init.yaml`` 引用，已改成从子 Skill 目录出发的共享根资产路径 ``../../assets/state-init.yaml``。源仓库和已安装 Codex Skill 副本都已修复，且没有通过复制 `skills/*/assets/state-init.yaml` 来掩盖结构问题。

## 改动摘要

- 修复 `skills/cycle/SKILL.md` 中的 broken reference：原先写成 ``assets/state-init.yaml``，在子 Skill 上下文里会被理解成 `skills/cycle/assets/state-init.yaml`，该文件不存在。
- 同步修复 `skills/start/SKILL.md` 的同类引用，避免初始化路径在 start/resume/cycle 入口之间不一致。
- 在 `references/skill-spec.md` 中补充路径契约：child-local 文件可以用 `assets/...`、`references/...`、`scripts/...`；共享根资产必须用从子 Skill 出发的明确相对路径，例如 ``../../assets/state-init.yaml``。
- 扩展 `checkSkillQuality()`，让质量检查能捕获 child Skill 误把 root shared asset 写成 child-local ``assets/...`` 的情况。
- 同步修复已安装副本 `/home/heyx/.codex/skills/hypo-workflow` 中的 `cycle`、`start` 和 `skill-spec`，解决用户实际运行时看到的缺失模板路径问题。

## 技术思路

本里程碑没有选择把 `assets/state-init.yaml` 复制到 `skills/cycle/assets/`。复制会让当前报错消失，但会制造两个模板源，后续一旦 root asset 更新，child copy 很容易陈旧。

采用的契约是：

- child Skill 目录下真实存在的资源，继续允许 child-local 引用；
- root shared assets 只能通过明确共享路径引用；
- 质量检查把“child-local 不存在，但 repo root 同路径存在”的情况识别为结构引用错误，并给出建议路径。

这样既保留子 Skill 自带资源的能力，也能防止 Workflow 继续生成“缺模板则等价生成”的临时兜底逻辑。

## 修改文件和模块

- `skills/cycle/SKILL.md`：将共享 state 初始化模板引用改为 ``../../assets/state-init.yaml``。
- `skills/start/SKILL.md`：同步修复 state 初始化模板引用。
- `references/skill-spec.md`：记录 child-local 与 root shared asset 的路径约定。
- `core/src/skills/index.js`：新增 inline asset path 扫描和 `child-skill-shared-asset-path` 质量问题。
- `core/test/skill-quality.test.js`：新增 RED/GREEN 覆盖，验证错误 child-local 引用被拒绝，真实 child-local 和明确 shared-root 引用被允许。
- `.pipeline/reviews/C15/M4/test-evidence.md`：记录测试侧 RED/GREEN 证据。
- `.pipeline/reviews/C15/M4/implementation-evidence.md`：记录实现侧和安装副本修复证据。
- `/home/heyx/.codex/skills/hypo-workflow/skills/cycle/SKILL.md`：修复已安装 Skill。
- `/home/heyx/.codex/skills/hypo-workflow/skills/start/SKILL.md`：修复已安装 Skill。
- `/home/heyx/.codex/skills/hypo-workflow/references/skill-spec.md`：同步安装副本规格说明。

## 测试设计

测试不是只检查当前文件文本，而是构造三个路径语义场景：

- 错误场景：child Skill 写 ``assets/state-init.yaml``，child 目录下没有该文件，但 repo root 有 `assets/state-init.yaml`，期望 `checkSkillQuality()` 报错。
- 合法 child-local 场景：child Skill 引用自己目录下真实存在的 `assets/`、`references/`、`scripts/` 文件，期望通过。
- 合法 shared-root 场景：child Skill 显式写 ``../../assets/state-init.yaml``，期望通过。

另外加了源仓库和安装副本的 smoke 检查，验证 root asset 存在、child copy 不存在、安装 Skill 不再保留旧引用。

## 验证结果

- `uv run -- node --test core/test/skill-quality.test.js core/test/skill-spec.test.js`：9/9 passing。
- `rg -n '\`assets/state-init\.yaml\`|\`assets/' skills /home/heyx/.codex/skills/hypo-workflow/skills || true`：无旧式 inline ``assets/...`` 命中。
- `test -f assets/state-init.yaml && test -f /home/heyx/.codex/skills/hypo-workflow/assets/state-init.yaml && test ! -e skills/cycle/assets/state-init.yaml && test ! -e /home/heyx/.codex/skills/hypo-workflow/skills/cycle/assets/state-init.yaml`：通过，输出 `source-and-installed-state-init-layout-ok`。
- `git diff --check -- core/src/skills/index.js core/test/skill-quality.test.js skills/cycle/SKILL.md skills/start/SKILL.md references/skill-spec.md .pipeline/reviews/C15/M4/test-evidence.md .pipeline/reviews/C15/M4/implementation-evidence.md`：通过。
- 独立只读审计 Subagent 判定 PASS，确认源和安装副本均修复，且没有 child asset copy masking。

## 预期结果

后续 `/hw:cycle new`、`/hw:start` 或相关初始化说明再引用 state 初始化模板时，应从共享根资产 `assets/state-init.yaml` 解析，不再提示 `skills/cycle/assets/state-init.yaml` 不存在。若未来其他 child Skill 再写错 ``assets/<root-shared-file>``，`checkSkillQuality()` 会在 smoke/quality 阶段阻断。

## 遇到的问题

- 初始 RED 测试显示旧的 `checkSkillQuality()` 只看 Skill frontmatter/路径登记，没有扫描正文 inline code 中的 ``assets/...``，因此会误判 bad fixture 为 `ok: true`。
- 实现 worker 先修复了 `cycle` 和 spec；主代理在集成时发现 `start` 也有同类引用，并补齐实现和安装副本同步。
- 安装副本 `/home/heyx/.codex/skills/hypo-workflow` 与源仓库并不完全同步；本里程碑只修复了 path blocker 相关文件，未声称整个安装副本已经刷新到 M3 的 `/hw:analysis` 状态。

## 剩余风险和后续

- 审计 worker 额外跑了 `npm --prefix core test`，全量测试 514 个中 501 pass、13 fail。失败集中在其他 workflow/subagent/commit 文本契约断言，不是本次 `state-init.yaml` path contract；M5 需要把全局 release-readiness 状态讲清楚。
- 已安装 Codex Skill 副本当前仅完成 M4 路径修复，仍需在 M5 检查 `/hw:analysis`、OpenCode command map 和安装副本 freshness 的整体一致性。
