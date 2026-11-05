# 进度

Hypo-Workflow 3.0。设计见 [docs/设计.md](docs/设计.md)。

## 现在
- 3.2.0 已发布：通用模板、三种起步地图，init、体验、清理三个 skill，以及 `hw` 的 map、find、status、log、check、handoff。
- 第一个接入的真实项目已经跑通：按功能建了十个需求文件，hw check 0 报警。
- 体验和清理已在本仓库各走过一遍：新用户照 README 能装上并用起来；真实 Agent 里跑 init 还没验证。
- 表达约束以 Hypo-Expression 为准，安装时一起装上 `hypo-exp`，关系见 [docs/设计.md](docs/设计.md) 5.1 节。通用 AGENTS.md 新增四行：讨论时先找现成方案、防御性复杂度在汇报里单独交代、界面默认不加次要标签和说明、写东西用 hypo-exp。

## 下一步
1. 在一个开发项目和一个科研项目上各试用两周，按 docs/设计.md 第 11 节判断规则的去留。
2. 用便宜的模型批量接入现有项目。
3. hw 黑词表改为以 Hypo-Expression 验证过的词表为准，等那边建完语料库后同步。

## 以后
- P2：单文件 ctags 解析失败时，hw check 会返回 2 并停止本次检查；cleanup 时评估是否改成逐文件提示并继续，使其余文件仍能查完（[hw/check.py:517–519](hw/check.py#L517-L519)）。
- 多 Agent 协作（下一个大版本）：大量子 Agent 并行做改进和测试；worktree 到时一起考虑。等这一版试用成功后开始。
