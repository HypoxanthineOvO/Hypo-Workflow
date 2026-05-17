---
name: hw-showcase
description: "Hypo-Workflow Cursor skill for /hw-showcase; use when the user invokes /hw-showcase or canonical /hw:showcase."
---

# /hw-showcase

Canonical command: `/hw:showcase`
Cursor command: `/hw-showcase`
Route: `artifact`
Embedded authority source: `skills/showcase/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:showcase` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Cursor Reference Resolution

- Local Cursor references live under `.cursor/skills/` and `.cursor/hypo-workflow/`.
- Source-repository paths mentioned by the embedded authority but absent from `.cursor/hypo-workflow/` are external/non-local for Cursor targets.
- Fallback: use the embedded command authority in this file first, then mirrored `.cursor/hypo-workflow/` resources; ask the user for source-repository context only if the missing external reference is required.

## Command Skill Authority

---
name: showcase
description: "Generate a complete project showcase package for introduction docs, technical docs, slides, and an optional poster."
---

# /hypo-workflow:showcase

当用户调用 `/hw:showcase` 或 `/hypo-workflow:showcase` 时使用此技能。

Showcase 是一个非开发预设，证明 Hypo-Workflow 可以运行超越代码实现的结构化 AI 工作。它在 `.pipeline/showcase/` 下生成项目介绍材料，并保持正常的 Pipeline 状态机不变。

## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

当设置时，Showcase 工件必须遵循 `showcase.language`。`showcase.language: auto` 遵循 `output.language`。

## 指令列表

支持的形式：

- `/hw:showcase`
- `/hw:showcase --all`
- `/hw:showcase --doc`
- `/hw:showcase --slides`
- `/hw:showcase --poster`
- `/hw:showcase --doc --poster`
- `/hw:showcase --new`
- `/hw:showcase --new --all`

## Preset

```yaml
preset: showcase
sequence:
  - analyze
  - intro_doc
  - tech_doc
  - slides
  - poster
  - review
```

步骤含义：

- `analyze`：读取项目并提取特性、架构、优势和统计信息
- `intro_doc`：生成 `.pipeline/showcase/PROJECT-INTRO.md`
- `tech_doc`：生成 `.pipeline/showcase/TECHNICAL-DOC.md`
- `slides`：生成 `.pipeline/showcase/slides.md`
- `poster`：调用 GPT Image API 并写入 `.pipeline/showcase/poster.png`
- `review`：验证完整性、准确性、一致性和语言

`analyze` 始终运行，因为每个工件都依赖它。`review` 始终运行，因为 Showcase 是面向用户的材料。

## 选择逻辑

| 标志 | 步骤 |
|---|---|
| 无 | 交互式选择，然后 `analyze + 选定步骤 + review` |
| `--all` | 全部 6 个步骤 |
| `--doc` | `analyze + intro_doc + tech_doc + review` |
| `--slides` | `analyze + slides + review` |
| `--poster` | `analyze + poster + review` |
| 组合标志 | 选定工件步骤的并集，加上 `analyze` 和 `review` |

当没有提供选择标志时，询问并等待：

```text
🎨 Showcase — 本次要生成哪些物料？

  [1] 📄 项目介绍文档  (PROJECT-INTRO.md)
  [2] 📐 技术文档      (TECHNICAL-DOC.md)
  [3] 📊 演示 PPT      (slides.md)
  [4] 🖼️ 宣传海报      (poster.png — 需要 GPT Image)

  输入编号（如 1,3,4）或回复「全部」：
```

不要在交互模式下自动生成所有工件。在继续之前等待用户响应。

## 目录初始化

规范目录：

- `.pipeline/showcase/`

首次运行时：

1. 创建 `.pipeline/showcase/`。
2. 创建 `.pipeline/showcase/showcase.yaml`，包含 `version: 1`。
3. 运行选定的步骤。

后续运行（没有 `--new`）时：

1. 读取现有的 `showcase.yaml`。
2. 告诉用户选定的工件将被覆盖。
3. 保持未选定的工件不变。
4. 保持相同的 Showcase 版本。
5. 更新被覆盖工件的 `last_run` 和生成时间戳。

## Lifecycle：`--new`

当存在 `--new` 时：

1. 读取当前 Showcase 版本 `N`；如果缺失则默认为 `1`。
2. 将当前工件移至 `.pipeline/showcase/history/v{N}/`。
3. 将版本递增到 `N+1`。
4. 从干净的工件集开始。
5. 运行选定的步骤。

当存在时归档这些文件：

- `PROJECT-INTRO.md`
- `TECHNICAL-DOC.md`
- `slides.md`
- `poster.png`

保留 `.pipeline/showcase/history/`。

## `showcase.yaml`

使用此形状：

```yaml
showcase:
  version: 3
  last_run: "2026-04-29T19:00:00+08:00"
  artifacts:
    - type: intro_doc
      file: PROJECT-INTRO.md
      generated: "2026-04-29T19:02:00+08:00"
    - type: tech_doc
      file: TECHNICAL-DOC.md
      generated: "2026-04-29T19:05:00+08:00"
    - type: slides
      file: slides.md
      generated: "2026-04-29T19:08:00+08:00"
    - type: poster
      file: poster.png
      generated: "2026-04-29T19:10:00+08:00"
```

使用转换为 `output.timezone` 的 ISO-8601 时间戳。

## Analyze 步骤

按此优先级读取项目文件：

1. `README.md`（必需）
2. `.pipeline/config.yaml` 或 `config.yaml` 用于项目名称、预设和命令计数（如果存在）
3. `.pipeline/architecture.md` 或 `architecture.md` 用于架构
4. 根 `SKILL.md` 用于命令和能力概述
5. `src/` 或主要代码目录用于文件树和关键模块
6. `.pipeline/PROGRESS.md` 用于当前进度
7. `.pipeline/state.yaml` 用于当前开发状态
8. `.pipeline/archives/*/summary.md` 用于版本历史

仅提取内存中的摘要。不要写入中间分析文件。

摘要字段：

- 项目名称和一句话描述
- 核心特性，最多 10 个
- 技术栈：语言、框架、工具
- 差异化因素，最多 5 个
- 统计信息：命令计数、文件计数、代码行数、测试、场景
- 来自 README、PROGRESS 或档案的版本历史

## `intro_doc` 步骤

为非开发人员用户写入 `.pipeline/showcase/PROJECT-INTRO.md`。

必需结构：

- 标题和一行标语
- 解决的问题：痛点 -> 解决方案
- 带有简洁表情符号标记的核心亮点
- 3-5 步快速开始
- 版本里程碑
- 适用用例

风格：简洁、有吸引力、非技术性。遵循 `output.language`。

## `tech_doc` 步骤

为开发人员和贡献者写入 `.pipeline/showcase/TECHNICAL-DOC.md`。

必需结构：

- 带有目录树和模块职责的架构概述
- 核心设计决策和原理
- 关键数据流/状态机
- 指向 README 获取详细信息的紧凑 API/命令参考
- 添加预设或适配器的扩展指南
- 技术栈和依赖项

风格：准确、足够深入以有用，并且结构清晰。遵循 `output.language`。

## `slides` 步骤

将 `.pipeline/showcase/slides.md` 写入为由 `---` 分隔的 Markdown 幻灯片。

建议页面：

1. 带有项目名称和标语的标题页
2. 痛点/问题
3. 带有简单流程的解决方案概述
4. 两到三个核心特性页面
5. 使用 Mermaid 的架构图
6. 演示/使用流程
7. 版本历史/成就数据
8. 下一步/路线图
9. 带有链接/联系方式的结束页

每个页面应有一个清晰的主题、标题和 3-5 个要点或一个简短段落。

## `poster` 步骤

当可用时使用 GPT Image 生成 `.pipeline/showcase/poster.png`。

解析配置：

```yaml
showcase:
  poster:
    api_key_env: OPENAI_API_KEY
    size: "1024x1536"
    quality: high
    style: auto
  language: auto
```

提示策略：

- 强调项目名称
- 用简单的图标状图案可视化核心特性
- 仅在有帮助时包含技术标签
- 按项目类型调整风格：
  - CLI/工具：最小技术海报
  - Web/UI：现代产品 UI 风格
  - 库/框架：架构优先风格

API 选项：

- 对 `https://api.openai.com/v1/images/generations` 使用 `curl`，或
- 当安装时使用 Python OpenAI 客户端

失败处理：

- 如果配置的 API key 环境变量缺失，跳过海报并用中文说 `⚠️ OPENAI_API_KEY 未设置，跳过海报生成` 或配置语言中的等效内容
- 如果 API 调用失败，跳过海报并继续其他工件
- 海报失败不得使整个 Showcase 运行失败

## `review` 步骤

在所有选定工件被尝试后运行。

检查：

- 完整性：选定工件存在，除非海报因缺失 API 而被跳过
- 准确性：数据匹配分析摘要
- 一致性：工件之间不矛盾
- 语言：工件遵循 `output.language` / `showcase.language`

用简洁的 Showcase 结果刷新 `.pipeline/PROGRESS.md`。

进度表格式：

```markdown
| 19:00 | Showcase | /hw:showcase --all | v3: 4 artifacts generated, review ✅ |
```

更新顶部元数据时间戳，并将 `PROGRESS.md` 保持为看板风格摘要，而不是追加松散的单行事件。

使用 `output.timezone` 要求的紧凑时间格式。

## 参考文件

- `config.schema.yaml` — `showcase.*` 配置
- `references/config-spec.md` — 配置回退规则
- `references/progress-spec.md` — PROGRESS 语言和时间规则
- `SKILL.md` — 命令路由和全局语言规则
