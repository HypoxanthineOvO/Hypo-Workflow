# 小红书 SkillHub 上传文案

---

## 简介（≤1000 字）

一套开源的 AI 项目管理工作流，给 AI 干活装上「断点续传」。

核心思路：任务状态不留在会话里，而是全部落盘到项目的 .pipeline/ 目录——计划、进度、验收标准、否掉的方案和决策理由都写成文件。换 Agent、换电脑、额度用完断线重来，新会话读盘即可从断点继续（/hw:resume），支持 Claude Code、Codex、OpenCode 跨平台接力。

流程按项目管理推进：/hw:init 立项建档 → /hw:plan 规划（需求访谈、技术选型、架构设计、任务拆解、生成计划五道工序，先问清楚再开工）→ /hw:start 按 Milestone 施工（测试先行，可分派 subagent 互相审计，另有 hooks 兜底防止半途而废）→ 验收 accept/reject 由你说了算。

共 53 个命令，记不住就敲 /hw:guide，它会读盘告诉你下一步该做什么。

它不直接替代任何 Agent，而是让它们的工作变得可规划、可追溯、可接续。

---

## 内容介绍（≤10000 字，连贯段落体，不依赖换行排版）
# Hypo Workflow 是什么？
Hypo-Workflow 是一套开源的 AI 项目管理工作流。它解决的问题是：现在的 Agent Skill 大多只管一次对话里的事——写计划、问需求、编排 Subagent——但项目不是一次对话能干完的，会话一关，干了什么、怎么想的、踩过什么坑，全没了。Hypo-Workflow 把所有状态落盘到项目的 `.pipeline/` 目录：计划、进度、验收标准、否掉的方案、决策理由，都是实实在在的文件。记录做扎实了，断点续传就是白送的。

# Hypo Workflow 能做什么？
* 断点续传：Codex 额度用完活干到一半，Claude Code 一句 `/hw:resume` 从断点接着干，不用干等额度恢复；换 Agent、换电脑、断网重来，新会话读一遍 `.pipeline/` 就掌握全部进度，中间不需要一句人工交代；隔了一周回来全忘了，`/hw:guide` 读盘告诉你当前走到哪、下一步该做什么。
* 跨平台接力：支持 Claude Code、Codex、OpenCode 三个平台，共享同一套 `.pipeline/` 协议，在 Claude Code 上规划、Codex 上执行、OpenCode 上检查，无缝接力。
* 完整的项目管理流程：/hw:init 立项建档，生成 `.pipeline/` 档案结构；`/hw:plan` 规划，AI 项目经理先跟你把需求聊透，需求访谈→技术选型→架构设计→任务拆解→生成计划，五道工序先问清楚再开工；`/hw:start` 按 Milestone 逐个施工，测试先行，可分派不同 subagent 分别负责测试、实现和审计互相盯着不许糊弄，另有 hooks 在关键节点自动检查防止偷懒跳步；验收 accept/reject 由你说了算，验收标准在规划阶段就定好了，不是事后拍脑袋。
* 53 个命令覆盖完整项目生命周期：`/hw:status` 查进度、`/hw:resume` 断点继续、`/hw:patch` 小修复不进完整 Milestone、`/hw:explain` 带证据解释代码和改动、`/hw:audit` 审查代码质量、`/hw:compact` 压缩长上下文、`/hw:rules` 管理项目规则与习惯、`/hw:pr` 管理 PR/MR……

记不住？没关系，还有 `/hw:guide` 这个万能入口，自适应给你推荐下一步工作计划。

Hypo-Workflow 不直接替代任何 Agent——代码仍由你的 Agent 完成。它是项目经理，不是程序员，负责让 AI 的工作变得可规划、可追溯、可接续。
