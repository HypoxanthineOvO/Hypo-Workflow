# C17-M3 YAML Parser Unification With js-yaml Report

## 结论

C17-M3 已完成并通过审计。config 与 knowledge 的 YAML 行为已统一到 `js-yaml`，复杂 YAML 结构得到覆盖，独立 knowledge parser 已移除。

## 变更摘要

- 根 `package.json`、`package-lock.json` 与 `core/package.json` 显式声明 `js-yaml: ^4.1.1`。
- `core/src/config/index.js` 的 public `parseYaml` / `stringifyYaml` 改为 `js-yaml` wrapper。
- `stringifyYaml` 使用稳定 dump 策略：`sortKeys: true`、`noRefs: true`、`lineWidth: 120`。
- `core/src/knowledge/index.js` 的 record/index 读写改用共享 YAML wrapper，移除独立 `parseKnowledgeYaml` / `stringifyKnowledgeYaml`。
- `core/src/rules/index.js` 增加 `id/name` 兼容和历史未加引号 `@scope/pack` extends fallback，保留 `js-yaml` 作为主解析路径。

## Worker Evidence

- Test worker: Avicenna (`019e4a0c-e6d0-79c3-be0d-82f14a823d59`)
  - Evidence: `.pipeline/reviews/C17/M3/test-evidence.md`
  - RED: YAML focused test 5 项中 4 项失败。
- Implement worker: Banach (`019e4a11-f5f9-7740-9af6-23002963a998`)
  - Evidence: `.pipeline/reviews/C17/M3/implementation-evidence.md`
  - 实现 `js-yaml` wrapper、knowledge 迁移和 manifest/lockfile 依赖声明。
- Audit worker: Pascal (`019e4a1b-8c6b-78a2-abea-1e3d7a7436f1`)
  - Evidence: `.pipeline/reviews/C17/M3/audit.md`
  - Verdict: PASS。

## Validation

- `node --test core/test/yaml-parser-unification.test.js core/test/global-config-registry.test.js core/test/knowledge-ledger.test.js core/test/knowledge-opencode-gate.test.js core/test/progressive-discover.test.js`: 29/29 passing
- `npm test`: 650/650 passing
- `git diff --check`: passing

## Warning

- 当前工作树包含 C17 前序 Milestone 的大量未提交改动；M3 审计已按 parser/knowledge/rules 相关文件收窄判断，最终 release audit 仍需全局复核。

## Next

进入 C17-M4：一次性拆分 `workspace/index.js` God Module，不保留 public compatibility shim。
