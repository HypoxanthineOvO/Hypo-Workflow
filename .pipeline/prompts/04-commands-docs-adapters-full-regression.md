# M4 - 命令、文档、适配器与完整回归

## Objective

- 将 C10 新能力贯穿命令注册、OpenCode/Claude/Codex 适配文档、用户指南和回归场景，并完成全量验证。

## 需求

- 更新命令表、README、`docs/user-guide.md`、`docs/reference/commands.md`、`docs/reference/configuration.md`、`docs/reference/generated-artifacts.md` 和平台 docs。
- 更新 OpenCode command map 和 generated artifact tests，必要时新增 scenario。
- 确保 `/hw:pr create`、`P0 Configure`、Subagent strict/degraded 出现在用户可见文档中。
- 同步版本相关引用时遵循项目现有 release/docs governance。
- 最终执行完整回归。

## Boundaries

- In scope: docs、command map、adapter generated artifact tests、regression scenarios、final report。
- 不发布 release，除非用户后续明确要求。

## Implementation Plan

1. 写或更新 docs/command/adapters tests，确认新能力出现在正确 surface。
2. 更新 README/docs/reference/platform docs，保持中文主体。
3. 增加 C10 scenario 或扩展现有 scenario 覆盖 PR create/P0/Subagent contract。
4. 运行 focused tests、core 全量测试、配置校验、完整 Python regression 和 diff check。
5. 生成最终报告，记录未做真实远端 smoke 的原因和后续手工条件。

## 预期测试

- 命令/文档/adapter surface 不遗漏 C10 新能力。
- 完整 regression bundle 通过。

## Validation Commands

- `npm test --prefix core`
- `bash scripts/validate-config.sh .pipeline/config.yaml`
- `python3 tests/run_regression.py`
- `git diff --check`

## Evidence

- 报告记录完整命令输出、文档覆盖点、新增/更新测试列表。

## Human QA

- review/test Subagent 复核最终 diff、测试输出和文档覆盖。

## 预期产出

- 更新后的 docs/adapters/tests、完整回归证据、C10 final report。
