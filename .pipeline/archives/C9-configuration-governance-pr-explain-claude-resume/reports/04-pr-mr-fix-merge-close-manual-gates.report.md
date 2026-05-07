# M05 fix/merge/close 手动门报告

## 结果

M05 已完成。`/hw:pr fix|merge|close` 的核心 helper 已实现为本地记录和确认提案流程，不会自动执行 push、merge、close 或远端平台状态写入。

## 变更

- `core/src/pr/index.js` 新增 `planChangeRequestFix()`、`prepareChangeRequestMerge()`、`prepareChangeRequestClose()`。
- `core/test/pr-manual-gates.test.js` 覆盖 fix 本地变更记录、push 确认门、merge blocker、ready merge 仍等待确认、close reason 和 close 确认门。
- `references/pr-spec.md` 增加 fix/merge/close gate 合同。
- `skills/pr/SKILL.md` 细化 fix、merge、close 的人工确认步骤。

## 人工门行为

- `fix` 写 `changes.md`，记录本地变更和测试，并写入 `push_requires_confirmation: true`。
- `merge` 检查 CI/checks、approval、conflict 和 mergeable 状态；有 blocker 时 `blocked`，ready 时仍为 `waiting_confirmation`。
- `close` 缺少 reason 时直接失败；有 reason 时只写 `decisions.yaml` 并等待确认。
- 所有函数都返回 `remote_write_attempted: false`。

## 验证

- `node --test core/test/pr-manual-gates.test.js core/test/pr-readonly-flow.test.js core/test/pr-contract.test.js`：11/11 通过。
- `node --test core/test/pr-manual-gates.test.js core/test/pr-readonly-flow.test.js core/test/pr-contract.test.js core/test/skill-quality.test.js`：14/14 通过。
- `node --test core/test/init-automation-contract.test.js core/test/commands-rules-artifacts.test.js`：9/9 通过。
- `npm test --prefix core`：330/330 通过。
- `bash scripts/validate-config.sh .pipeline/config.yaml`：通过。
- `git diff --check`：通过。

## 后续

F002 完成，自动推进到 F003/M06，开始 Evidence-first Explain 命令合同。
