# M12 — P0 文档补齐

## 目标
补齐关键文档缺口。

## F001: 创建 CONTRIBUTING.md
**文件**: 根目录 `CONTRIBUTING.md`

至少包含：
- 如何添加命令/Skill
- 如何运行测试（npm test, pytest, run_regression.py）
- 代码风格规则
- 平台适配器添加流程
- PR 流程

## F002-F003: 扩展 developer.md
**文件**: `docs/developer.md` 和 `docs/en/developer.md`

从当前 10-19 行扩展到至少包含：
- 命令注册流程（commandMap + opencode.json + commands-spec）
- Skill 编写规范（引用 skill-spec.md）
- 状态文件 schema 变更流程
- 测试编写和执行说明

## F004: 同步 configuration.md 英文版
**文件**: `docs/en/reference/configuration.md`

从当前 64 行同步到与中文版（260 行）一致，包含 Profile YAML 配置模板。

## 验收
- CONTRIBUTING.md 存在且内容完整
- developer.md zh/en 均 ≥ 100 行
- configuration.md en 与 zh 内容一致
