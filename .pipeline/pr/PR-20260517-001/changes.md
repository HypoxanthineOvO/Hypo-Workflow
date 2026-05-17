# Change Notes

## Implementation Shape

PR 把 Cursor adapter 从单个规则文件扩展成三层生成产物：

- `.cursor/rules/hypo-workflow.mdc`：仓库级 Cursor rule。
- `.cursor/skills/hw-*.md`：每个 `/hw-*` 命令一个平铺 Skill，命令 authority 直接嵌入。
- `.cursor/commands/hw-*.md`：Cursor slash command 入口，转发到对应 Skill。
- `.cursor/hypo-workflow/`：共享资源镜像，包含部分 references、assets、adapters 和 scripts。

核心生成入口在 `core/src/artifacts/third-party.js`：

- `writeThirdPartyAdapterArtifacts()` 在平台为 Cursor 时调用 `writeCursorSkillBundle()`。
- `writeCursorSkillBundle()` 清理旧 managed bundle，重建 `.cursor/hypo-workflow/`，然后写入 flat skill 和 command files。
- `renderCursorSetupAuthority()` 为 `/hw-setup` 使用 Cursor 专用 authority，避免 Cursor adapter 写入或推荐模型/provider 默认值。

## Local Verification

- PR 自带测试通过。
- docs/readme/skill/sync 相关 smoke 通过。
- `node --test core/test/*.test.js` 完整 Node 测试通过，516 tests pass。

## Review Focus

这次变更主体是生成产物和跨平台 instruction surface，不是业务 runtime。审阅重点放在：

- Cursor 生成内容是否自洽。
- 生成文件是否能被独立目标项目使用。
- 清理逻辑是否只删除 managed 文件。
- 文档和测试是否覆盖新增 surface。
- 是否触碰 `.pipeline/**` 工作流 payload。
