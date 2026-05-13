# M3 - 自动化授权白名单

## 结论

已实现长期自动化白名单契约：本地测试动作可按 `safe_local` / `stateful_local` 允许，`external` 动作默认仍需要确认。

## 做了什么

- 在 `DEFAULT_GLOBAL_CONFIG.automation.local_whitelist` 中加入三档白名单。
- 新增 `normalizeAutomationWhitelist` 和 `isAutomationActionAllowed`。
- 更新 `config.schema.yaml` 与 `references/config-spec.md`。

## 验证

- `node --test core/test/config.test.js`
- `bash scripts/validate-config.sh .pipeline/config.yaml`
- 全量 `npm test --prefix core` 已通过。

## 手动操作

- 在 `.pipeline/config.yaml` 或全局 config 中配置 `automation.local_whitelist.safe_local.actions: [restart_dev_server]` 后，本地测试重启服务应不再反复询问。
- `remote_pr_write`、`publish_release`、`write_real_api` 仍应确认。

## 已知风险

- 真实服务重启行为由 host 执行；本次提供配置和判定 contract。
