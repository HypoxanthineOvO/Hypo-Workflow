# Representative Sample Selection

生成时间：2026-05-18T22:21:08+08:00

范围：DR005/DR006 样本选择。根据用户回答，修正 successor / legacy 关系，并选择下一轮代表性 Notion 页面深读与本地 Artifact Catalog 盘点样本。本报告只写 Deep Plan 本地产物，不写 Notion，不修改其他项目，不读取 secret。

## 用户确认的关系修正

1. `Hypo-Info` 旧版做得有问题，应归档为 legacy/predecessor。
2. `Hypo-Info-V2` 是当前 canonical 项目。
3. `Hypo-Agent` 是 `Hypo-Claw` 的前身，应归档为 legacy/predecessor。
4. `Hypo-Claw` 是当前 canonical 项目。

这意味着 Global Project Registry 不能把 `Hypo-Info` / `Hypo-Agent` 当作当前项目直接 `register-and-bind`。正确模型是：

```text
Hypo-Info      --replaced_by--> Hypo-Info-V2
Hypo-Agent     --replaced_by--> Hypo-Claw
```

旧本地项目和旧 Notion 页面仍保留为 legacy corpus，用于历史内容整理、旧设计归档和链接跳转；当前状态、Project Home、artifact catalog 和后续同步应以 successor 为 canonical。

## 选定样本

| 样本组 | 角色 | 本地对象 | Notion 对象 | 为什么选 |
|---|---|---|---|---|
| Baseline | 已完成首轮 mapping 的当前项目 | `Hypo-Workflow` | `Hypo-Workflow` | 已有 87 blocks / 34 child pages 的 mapping dry-run，用作模板 baseline。 |
| Sample A | Workflow-managed successor + legacy Notion page | `Hypo-Info-V2` + legacy `Hypo-Info` | `Hypo-Info` | 验证“旧页归档 + 新项目 canonical”的 Project Home 合并策略。 |
| Sample B | Workflow-managed local-only successor + legacy matched predecessor | `Hypo-Claw` + legacy `Hypo-Agent` | `Hypo-Agent` | 验证 successor 没有当前 Notion page 时，如何处理旧页、旧项目和当前项目的绑定/创建 dry-run。 |
| Sample C | pre-Workflow/git-only matched project | `Hypo-GPU` | `Hypo-GPU — 教学级 GPU Simulator` | 验证无 `.pipeline` 的项目如何生成 pre-Workflow Project Home、manual snapshot 和 missing artifact 表达。 |
| Sample D | Notion-only / skill-backed object | no top-level repo; local skill `~/.codex/skills/hypo-image` | `Hypo-Image` | 验证 Notion-only 页面不一定对应顶层 repo，可能对应 skill/service object。 |
| Pressure Sample | long-running local maintenance object | `Hypo-Writer` | none found | 验证文章/发布类维护对象，覆盖用户最早提出的“多篇文章并行维护”问题。 |

## 本地 artifact 初筛

| 项目 | 本地 artifact 信号 |
|---|---|
| `Hypo-Info-V2` | 有 README、PROJECT-SUMMARY、state、cycle、PROGRESS、architecture；prompts 7、reports 2、archives 2。 |
| `Hypo-Info` | 有 README、PROJECT-SUMMARY、state、cycle、PROGRESS、knowledge compact；prompts 6、reports 6、archives 2、knowledge 12。 |
| `Hypo-Claw` | 有 PROJECT-SUMMARY、state、cycle、PROGRESS、architecture、knowledge compact；prompts 18、reports 1、archives 4、knowledge 11。 |
| `Hypo-Agent` | 有 README、PROJECT-SUMMARY、state、cycle、PROGRESS、architecture、knowledge compact；prompts 9、archives 8、knowledge 11。 |
| `Hypo-GPU` | 只有 README 等 git-only/pre-Workflow 信号；没有当前 `.pipeline` artifact。 |
| `Hypo-Writer` | 有 README、PROJECT-SUMMARY、state、cycle、PROGRESS、architecture、knowledge compact；prompts 4、reports 15、archives 9、knowledge 16。 |
| `Hypo-Image` | 没有顶层 repo；存在 Codex skill `~/.codex/skills/hypo-image/SKILL.md`，包含私有 wrapper 配置引用但本轮未读取任何 raw key。 |

## DR005 执行边界

DR005 只做 Notion read-only deep read，候选页面：

1. `Hypo-Info`
2. `Hypo-Agent`
3. `Hypo-GPU — 教学级 GPU Simulator`
4. `Hypo-Image`

读取目标不是直接生成写入操作，而是为每个页面生成：

- 页面现有信息架构；
- 旧内容是否应归档、迁移、合并或保留；
- 与 canonical local object 的绑定关系；
- Project Home 目标树差异；
- access gate / missing page / legacy page 状态。

## DR006 执行边界

DR006 只做本地 artifact inventory，不改其他项目：

1. `Hypo-Info-V2` + `Hypo-Info`
2. `Hypo-Claw` + `Hypo-Agent`
3. `Hypo-GPU`
4. `Hypo-Writer`
5. `~/.codex/skills/hypo-image`

盘点维度：

- `README.md` / `PROJECT-SUMMARY.md`
- `.pipeline/state.yaml` / `cycle.yaml` / `PROGRESS.md`
- `.pipeline/prompts/**`
- `.pipeline/reports/**`
- `.pipeline/archives/**`
- `.pipeline/architecture*`
- `.pipeline/knowledge/**`
- `.pipeline/rules.yaml`
- skill/service object 的 `SKILL.md`、公开 wrapper contract 和私有配置引用；不读取 raw key。

## 对后续模型的影响

1. Project Registry 需要支持 `canonical_project_id` 与 `legacy_project_id` 分离。
2. Notion page binding 需要支持 `legacy_page_for`，不能只表达 `project_page_for`。
3. Project Link Graph 第一版必须包含 `replaced_by` / `predecessor_of`。
4. Storage Sync Template 需要表达 `current_missing_remote_page` 与 `legacy_remote_page_exists` 的组合状态。
5. Artifact Catalog 需要区分 current artifacts、legacy artifacts 和 skill/service object artifacts。
