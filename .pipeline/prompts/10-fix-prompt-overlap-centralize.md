# M10 — P1 Prompt 重叠修复

## 目标
修复 SKILL.md 命令同步，集中化输出语言规则。

## F104: SKILL.md 与 commands-spec.md 命令同步
1. 对比 `SKILL.md` 和 `references/commands-spec.md` 的命令列表
2. 确保两者一致（当前差异：/hw:chat）
3. 确定哪一个是权威源，另一个标注"派生视角"

## F105: SKILL.md 分层策略
1. 在 `SKILL.md` 顶部添加注释明确其角色：索引 + 路由摘要
2. 在每个命令段落添加指向独立 Skill 文件的引用："完整规范见 `skills/{name}/SKILL.md`"
3. 清理不必要的重复内容

## F108: 输出语言规则集中化
1. 在 `SKILL.md` 中集中定义输出语言规则
2. 在 `references/skill-spec.md` 中增加 Skill 编写规范：`@include: output-language-rule`
3. 各独立 Skill 中替换逐字重复为 `@include: output-language-rule` 引用宏

## 验收
- 两个命令列表一致
- SKILL.md 有明确分层标注
- 输出语言规则有集中定义 + 引用机制
