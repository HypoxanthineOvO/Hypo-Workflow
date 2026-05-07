# M03 Change Request 合同与本地归档报告

## 结果

M03 已完成。新增 `/hw:pr` 作为已有 GitHub PR / GitLab MR 的平台中立 Change Request 入口，并建立 `.pipeline/pr/PR-YYYYMMDD-NNN/` 本地归档合同。

## 变更

- `core/src/pr/index.js` 新增 Change Request URL 标准化、本地归档构建和写入 helper。
- `core/test/pr-contract.test.js` 覆盖 GitHub PR、GitLab MR、稳定 archive id、不覆盖已有归档、secret redaction 和 remote write gate。
- `core/src/commands/index.js` 注册 `/hw:pr` -> `/hw-pr` -> `hw-review` -> `skills/pr/SKILL.md`。
- 新增 `skills/pr/SKILL.md` 和 `references/pr-spec.md`。
- 更新 README、User Guide、Commands Reference、OpenCode Command Map、Commands Spec 和 Skill Spec，使 37 个用户命令与 36 个用户 Skill path 保持一致。

## 归档合同

```text
.pipeline/pr/PR-YYYYMMDD-001/
  request.yaml
  summary.md
  review-notes.md
  changes.md
  decisions.yaml
  evidence/
    snapshot.md
```

`request.yaml` 记录 provider、kind、host、owner、repository、number、ref、url、branch、author、status snapshot 和创建时间。`decisions.yaml` 固定 `remote_write_gate: confirm`，并区分 inspect/review/local archive write 与 push/merge/close/reviewer/label/target branch 写入。

## 风险边界

- `.pipeline/pr/` 是本地证据归档，不是远端平台 source of truth。
- `/hw:pr create` 只预留，不在 C9 M03 实现。
- M03 不连接 live GitHub/GitLab，不执行 push、merge、close 或远端状态写入。
- 归档写入会 redacted token、Authorization、Cookie、password、API key、private key 等 secret marker。

## 验证

- `node --test core/test/pr-contract.test.js`：4/4 通过。
- `node --test core/test/commands-rules-artifacts.test.js core/test/docs-governance.test.js core/test/skill-spec.test.js core/test/skill-quality.test.js`：通过。
- `node --test core/test/readme-update.test.js core/test/claude-plugin-alias.test.js core/test/sync-standardization.test.js core/test/knowledge-ledger.test.js core/test/codex-subagent-discipline.test.js`：通过。
- `npm test --prefix core`：323/323 通过。
- `bash scripts/validate-config.sh .pipeline/config.yaml`：通过。
- `node cli/bin/hypo-workflow sync --check-only --project .`：derived=fresh。
- `git diff --check`：通过。

## 后续

自动推进到 M04，实现或规范 `/hw:pr inspect` 和 `/hw:pr review` 的 remote-readonly 流程。
