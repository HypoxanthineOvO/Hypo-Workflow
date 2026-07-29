# redskill-package — 小红书 REDSkill 参赛包（2026-07）

本目录**不属于 Hypo-Workflow 源码**，是为小红书 REDSkill 活动（Skill 组件上传）打的发行包，由仓库当前状态（13.1.0-beta.2）手工装配。

- **上传目录**：`hypo-workflow/`（根 `SKILL.md` 即 SkillHub 入口；Skill ID 派生为 `hypo-workflow`，首次提交后不可改）。
- **本 README 不随包上传**（上传时只传 `hypo-workflow/` 子目录）。

## 装配规则（重建时照做）

上传 CLI（`@xhs/skillhub-upload`）对目录打包是**遇到白名单外文件直接报错**，不是跳过，所以包必须 100% 干净：

1. 从仓库根复制：`SKILL.md`、`skills/ commands/ references/ templates/ rules/ plan/ assets/ hooks/ scripts/ adapters/ domains/ .claude-plugin/ .codex-plugin/`、`README.md README.en.md CHANGELOG.md AGENTS.md opencode.json config.schema.yaml`，`LICENSE → LICENSE.txt`。
2. 删除白名单外/依赖 Node CLI 的文件：`hooks/claude-hook.mjs`、`scripts/claude-smoke-fixture.mjs`、`scripts/__pycache__/`、`scripts/{daily-summary,maintenance,news-noon}-scheduler.sh`。
3. 所有 `*.yaml` 改名为 `*.yaml.txt`（白名单无 .yaml）；包内附 `restore-yaml.sh` 供下载者一键恢复。
4. 包内 `.claude-plugin/plugin.json` 删掉 `"monitors"` 键（monitor 依赖已删的 claude-hook.mjs）。
5. 新增 `INSTALL.md`（CC / Codex / OpenCode 三平台安装 + 与完整版差异清单）与 `restore-yaml.sh`。
6. 自检：包内不得有 yaml/mjs/pyc/无后缀文件（LICENSE 已转 .txt）与符号链接。

## 上传（人工在场时执行）

volta 垫片会吞 CLI 输出，需直接调 node 入口：

```bash
CLI=~/.volta/tools/image/packages/@xhs/skillhub-upload/lib/node_modules/@xhs/skillhub-upload/cli/index.mjs
node $CLI whoami
node $CLI login --agent          # 手机授权
node $CLI publish ~/Hypo-Workflow/redskill-package/hypo-workflow --dry-run --agent --source original --tag <实时拉取的中文标签>
# 确认 payload 后 printf 'submit\n' | node $CLI publish ... （不带 --yes）
```

发布事实记录在 Hypo-Writer `workspace/BOARD.md`。
