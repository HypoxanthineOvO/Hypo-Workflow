---
name: showcase
description: "Generate a complete project showcase package for introduction docs, technical docs, slides, and an optional poster."
---

# /hypo-workflow:showcase

Use this skill when the user invokes `/hw:showcase` or `/hypo-workflow:showcase`.

Showcase is a non-development preset that proves Hypo-Workflow can run structured AI work beyond code implementation. It generates project introduction material under `.pipeline/showcase/` and keeps the normal Pipeline state machine untouched.

## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Showcase artifacts must follow `showcase.language` when set. `showcase.language: auto` follows `output.language`.

## 指令列表

Supported forms:

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

Step meanings:

- `analyze`: read the project and extract features, architecture, strengths, and statistics
- `intro_doc`: generate `.pipeline/showcase/PROJECT-INTRO.md`
- `tech_doc`: generate `.pipeline/showcase/TECHNICAL-DOC.md`
- `slides`: generate `.pipeline/showcase/slides.md`
- `poster`: call GPT Image API and write `.pipeline/showcase/poster.png`
- `review`: validate completeness, accuracy, consistency, and language

`analyze` always runs because every artifact depends on it. `review` always runs because Showcase is user-facing material.

## 选择逻辑

| Flags | Steps |
|---|---|
| none | interactive selection, then `analyze + selected steps + review` |
| `--all` | all 6 steps |
| `--doc` | `analyze + intro_doc + tech_doc + review` |
| `--slides` | `analyze + slides + review` |
| `--poster` | `analyze + poster + review` |
| combined flags | union of selected artifact steps, plus `analyze` and `review` |

When no selection flag is provided, ask and wait:

```text
🎨 Showcase — 本次要生成哪些物料？

  [1] 📄 项目介绍文档  (PROJECT-INTRO.md)
  [2] 📐 技术文档      (TECHNICAL-DOC.md)
  [3] 📊 演示 PPT      (slides.md)
  [4] 🖼️ 宣传海报      (poster.png — 需要 GPT Image)

  输入编号（如 1,3,4）或回复「全部」：
```

Do not auto-generate all artifacts in interactive mode. Wait for the user response before continuing.

## 目录初始化

Canonical directory:

- `.pipeline/showcase/`

On first run:

1. Create `.pipeline/showcase/`.
2. Create `.pipeline/showcase/showcase.yaml` with `version: 1`.
3. Run selected steps.

On later runs without `--new`:

1. Read existing `showcase.yaml`.
2. Tell the user that selected artifacts will be overwritten.
3. Keep unselected artifacts unchanged.
4. Keep the same Showcase version.
5. Update `last_run` and generated timestamps for overwritten artifacts.

## Lifecycle: `--new`

When `--new` is present:

1. Read current Showcase version `N`; default to `1` if missing.
2. Move current artifacts into `.pipeline/showcase/history/v{N}/`.
3. Increment version to `N+1`.
4. Start from a clean artifact set.
5. Run the selected steps.

Archive these files when they exist:

- `PROJECT-INTRO.md`
- `TECHNICAL-DOC.md`
- `slides.md`
- `poster.png`

Preserve `.pipeline/showcase/history/`.

## `showcase.yaml`

Use this shape:

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

Use ISO-8601 timestamps converted to `output.timezone`.

## Analyze 步骤

Read project files in this priority:

1. `README.md` (required)
2. `.pipeline/config.yaml` or `config.yaml` for project name, preset, and command count when present
3. `.pipeline/architecture.md` or `architecture.md` for architecture
4. root `SKILL.md` for command and capability overview
5. `src/` or main code directories for file tree and key modules
6. `.pipeline/PROGRESS.md` for current progress
7. `.pipeline/state.yaml` for current development state
8. `.pipeline/archives/*/summary.md` for version history

Extract an in-memory summary only. Do not write an intermediate analyze file.

Summary fields:

- project name and one-sentence description
- core features, at most 10
- tech stack: languages, frameworks, tools
- differentiators, at most 5
- statistics: command count, file count, code lines, tests, scenarios
- version history from README, PROGRESS, or archives

## `intro_doc` 步骤

Write `.pipeline/showcase/PROJECT-INTRO.md` for non-developer users.

Required structure:

- title and one-line tagline
- problem solved: pain point -> solution
- core highlights with concise emoji markers
- quick start in 3-5 steps
- version milestones
- suitable use cases

Style: concise, attractive, non-technical. Follow `output.language`.

## `tech_doc` 步骤

Write `.pipeline/showcase/TECHNICAL-DOC.md` for developers and contributors.

Required structure:

- architecture overview with directory tree and module responsibilities
- core design decisions and rationale
- key data flow / state machine
- compact API / command reference pointing to README for details
- extension guide for adding a preset or adapter
- tech stack and dependencies

Style: accurate, deep enough to be useful, and clearly structured. Follow `output.language`.

## `slides` 步骤

Write `.pipeline/showcase/slides.md` as Markdown slides separated by `---`.

Suggested pages:

1. title page with project name and tagline
2. pain point / problem
3. solution overview with a simple flow
4. two to three core feature pages
5. architecture diagram using Mermaid
6. demo / usage flow
7. version history / achievement data
8. next steps / roadmap
9. closing page with link/contact

Each page should have one clear topic, a title, and 3-5 bullets or one short paragraph.

## `poster` 步骤

Generate `.pipeline/showcase/poster.png` with GPT Image when available.

Resolve config:

```yaml
showcase:
  poster:
    api_key_env: OPENAI_API_KEY
    size: "1024x1536"
    quality: high
    style: auto
  language: auto
```

Prompt strategy:

- emphasize project name
- visualize core features with simple icon-like motifs
- include technology labels only when they help
- adapt style by project type:
  - CLI/tooling: minimal technical poster
  - Web/UI: modern product UI style
  - library/framework: architecture-forward style

API options:

- use `curl` against `https://api.openai.com/v1/images/generations`, or
- use Python OpenAI client when installed

Failure handling:

- if the configured API key env var is missing, skip poster and say `⚠️ OPENAI_API_KEY 未设置，跳过海报生成` in Chinese or the equivalent in configured language
- if API call fails, skip poster and continue other artifacts
- poster failure must not fail the whole Showcase run

## `review` 步骤

Run after all selected artifacts have been attempted.

Check:

- completeness: selected artifacts exist unless poster was skipped for missing API
- accuracy: data matches the analyze summary
- consistency: artifacts do not contradict each other
- language: artifacts follow `output.language` / `showcase.language`

Refresh `.pipeline/PROGRESS.md` with a concise Showcase result.

Progress table format:

```markdown
| 19:00 | Showcase | /hw:showcase --all | v3: 4 artifacts generated, review ✅ |
```

Update the top metadata timestamp and keep `PROGRESS.md` as a board-style summary instead of appending loose one-line events.

Use the compact time format required by `output.timezone`.

## 参考文件

- `config.schema.yaml` — `showcase.*` config
- `references/config-spec.md` — config fallback rules
- `references/progress-spec.md` — PROGRESS language and time rules
- `SKILL.md` — command routing and global language rules
