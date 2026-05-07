# M04 只读 inspect/review 流程报告

## 结果

M04 已完成。`/hw:pr inspect` 和 `/hw:pr review` 的核心 helper 已支持 fixture/mock provider，以 remote-readonly 方式读取 PR/MR metadata、diff、comments 和 checks，并把证据写入 `.pipeline/pr/` 本地归档。

## 变更

- `core/src/pr/index.js` 新增 `inspectChangeRequest()` 和 `reviewChangeRequest()`。
- `core/test/pr-readonly-flow.test.js` 覆盖 inspect/review 只读读取顺序、archive 写入、review findings、失败 CI、评论、大 diff 和缺失 provider 方法。
- `references/pr-spec.md` 增加 inspect/review flow 和 fixture provider 只读方法合同。
- `skills/pr/SKILL.md` 细化 inspect/review 的执行步骤。

## 只读边界

- inspect/review 只调用 `readChangeRequest`、`readDiff`、`readComments`、`readChecks`。
- 测试 provider 中的 `push`、`merge`、`close` 都是抛错方法，验证流程不会触发远端写。
- 本地写入仅限 `.pipeline/pr/PR-YYYYMMDD-NNN/` 归档文件。

## 验证

- `node --test core/test/pr-readonly-flow.test.js core/test/pr-contract.test.js`：7/7 通过。
- `node --test core/test/pr-readonly-flow.test.js core/test/pr-contract.test.js core/test/commands-rules-artifacts.test.js`：12/12 通过。
- `node --test core/test/skill-quality.test.js core/test/skill-spec.test.js`：6/6 通过。
- `npm test --prefix core`：326/326 通过。
- `bash scripts/validate-config.sh .pipeline/config.yaml`：通过。
- `node cli/bin/hypo-workflow sync --check-only --project .`：derived=fresh。
- `git diff --check`：通过。

## 后续

自动推进到 M05，处理 `/hw:pr fix|merge|close` 的本地修复记录和高风险人工确认门。
