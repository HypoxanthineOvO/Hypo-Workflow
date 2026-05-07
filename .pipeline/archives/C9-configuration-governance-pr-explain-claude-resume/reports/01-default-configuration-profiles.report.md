# M02 默认配置组合报告

## 结果

M02 已完成。新增四组默认配置组合：`solo-auto`、`manual-review`、`team-strict`、`analysis-hybrid`，并把对应用途、风险边界和 YAML 片段写入配置治理参考文档。

## 变更

- `core/src/profile/index.js` 新增配置组合注册表、读取 API 和 YAML 渲染。
- `core/src/docs/index.js` 的配置参考生成器接入默认配置组合，避免 `/hw:docs repair` 后丢失文档内容。
- `docs/reference/configuration.md` 增加中文主体的默认配置组合说明和可复制片段。
- `core/test/profile-platform.test.js` 增加配置组合、high-risk gate 和文档覆盖测试。

## 风险边界

- 所有默认配置组合都保留 `destructive_external: confirm`、`release_publish: confirm`、`pr_remote_write: confirm`、`plugin_install: confirm` 和 `user_level_config: confirm`。
- `solo-auto` 只自动推进普通本地执行，不代表远端写、插件安装、用户级配置写入或发布可以自动执行。
- `analysis-hybrid` 允许先做证据收集；代码变更仍按 `code_changes.hybrid: confirm` 处理。

## 验证

- `node --test core/test/profile-platform.test.js`：8/8 通过。
- `node --test core/test/docs-governance.test.js`：6/6 通过。
- `node --test core/test/init-automation-contract.test.js core/test/global-config-registry.test.js core/test/config.test.js core/test/profile-platform.test.js`：26/26 通过。
- `bash scripts/validate-config.sh .pipeline/config.yaml`：通过。
- `git diff --check`：通过。
- `npm test --prefix core`：319/319 通过。

## 后续

自动推进到 F002/M03，开始设计 PR/MR Change Request 合同和 `.pipeline/pr/` 本地归档结构。
