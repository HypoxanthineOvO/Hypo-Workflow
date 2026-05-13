# M7 - References 中文化与回归

## Objective

把行为相关 `references/*.md` 改成中文主体结构，并完成 C11 的整体回归与用户手动验收说明。

## 需求

- 中文化会影响 Agent 行为的 reference/spec，保留命令、路径、配置键、字段名和协议术语。
- 同步必要 docs 入口，避免 Skill 与 reference 语义漂移。
- 做最终回归：core tests、config validation、Python scenario regression、docs governance、diff check。
- 生成完成报告时必须详细说明：改了什么、如何验证、怎么手动试、有哪些风险。

## Boundaries

- In scope: `references/*.md`、必要 docs/test updates、final regression。
- Out of scope: 新增大功能。

## 预期测试

- reference 中文主体完成。
- Skill/reference 术语保持一致。
- 全量回归通过或明确列出未跑原因。

## Validation Commands

- `npm test --prefix core`
- `bash scripts/validate-config.sh .pipeline/config.yaml`
- `python tests/run_regression.py`
- `git diff --check`

## Audit Fields

- `audit_target`: references 中文化、Skill/spec 一致性、C11 full regression。
- `risk_hypotheses`: reference 翻译破坏协议；docs 与 Skill 冲突；回归遗漏关键场景。
- `test_scenarios`: reference inventory、terminology preservation、full regression。
- `evidence_required`: 全量测试输出、中文化文件清单、手动 QA 指南。
- `independent_validator`: audit Subagent 最终只读审查。
- `manual_checks`: 用户按完成报告运行 `/hw:status`、`/hw:report`、一次 `/hw:plan`，观察是否说人话。
- `known_limits`: 真实远端写入不做自动验证。

## Subworker Assignment Plan

- `test`: 需授权；补 references/docs regression checks。
- `implement`: 需授权；中文化 references 和必要入口。
- `audit`: 已授权只读；最终审查全 Cycle 是否满足用户原始诉求。

## 预期产出

- references 中文主体完成。
- C11 完整回归报告和用户手动操作步骤。
