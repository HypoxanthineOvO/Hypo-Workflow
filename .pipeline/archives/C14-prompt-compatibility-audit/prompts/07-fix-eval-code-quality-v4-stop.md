# M7 — P1 状态评分修复

## 目标
修复 `code_quality` 评分方向矛盾，明确 V4 STOP 规则兼容性。

## F101: code_quality 评分方向统一
**文件**: `references/evaluation-spec.md`

1. 在 V1 评分章节（第 19-25 行区域）添加兼容说明：标注 V1 的 1=不可接受 已废弃，统一使用 V4 的 1=优秀方向。
2. 确保 V4 多维定义是唯一活跃的 `code_quality` 语义。

## F102: V4 STOP 规则兼容性
**文件**: `references/evaluation-spec.md`

1. 在向后兼容章节明确：当 `adaptive_threshold=false` 时，V4 额外的 STOP 条件 (`overall > threshold + 1`, `architecture_drift >= 4`) 也同时禁用。
2. 或添加配置项 `use_v4_multi_dimension_stop` 供用户选择。

## 验收
- `code_quality` 在整个 evaluation-spec.md 中语义一致
- V4 STOP 条件有明确的启用/禁用规则
