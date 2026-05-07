# M06 Evidence-first Explain 合同报告

## 结果

M06 已完成。新增 `/hw:explain` 命令合同、Explain Skill、Explain Spec 和核心 evidence packet helper，确保解释类回答默认只读、先收集证据、缺证据时明确 `needs_context`。

## 变更

- `core/src/explain/index.js` 新增 `buildExplainEvidencePacket()` 和 `renderExplainAnswer()`。
- `core/test/explain-contract.test.js` 覆盖命令注册、显式文件证据、只读 state/log 行为和 unknown 输出。
- `core/src/commands/index.js` 注册 `/hw:explain` -> `/hw-explain` -> `hw-review` -> `skills/explain/SKILL.md`。
- 新增 `skills/explain/SKILL.md` 和 `references/explain-spec.md`。
- 更新 README、User Guide、Commands Reference、OpenCode Command Map、Commands Spec、Skill Spec 和 command count，从 37 增至 38 个用户指令。

## 证据包样例

```yaml
question: "为什么这个配置是 strict?"
mode: read_only
scope:
  - .pipeline/config.yaml
files_read:
  - path: .pipeline/config.yaml
    excerpt: "execution.worker_separation.mode: strict"
pipeline_refs:
  - .pipeline/config.yaml
diff_refs: []
confidence: grounded
unknowns: []
```

## 只读边界

- Explain 不推进 Cycle。
- Explain 不创建 Patch。
- Explain 不修改 `.pipeline/state.yaml`、`.pipeline/log.yaml`、reports、source files 或远端状态。
- 缺证据时输出 `needs_context` / `unknown`，不编造。

## 验证

- `node --test core/test/explain-contract.test.js`：4/4 通过。
- `node --test core/test/explain-contract.test.js core/test/commands-rules-artifacts.test.js core/test/docs-governance.test.js`：15/15 通过。
- `node --test core/test/skill-quality.test.js core/test/skill-spec.test.js core/test/readme-update.test.js core/test/claude-plugin-alias.test.js core/test/sync-standardization.test.js core/test/knowledge-ledger.test.js core/test/codex-subagent-discipline.test.js`：35/35 通过。
- `npm test --prefix core`：334/334 通过。
- `bash scripts/validate-config.sh .pipeline/config.yaml`：通过。
- `node cli/bin/hypo-workflow sync --check-only --project .`：修复后 derived=fresh。
- `git diff --check`：通过。

## 后续

自动推进到 M07，实现或规范 `/hw:explain --subagent` 的独立取证 handoff。
