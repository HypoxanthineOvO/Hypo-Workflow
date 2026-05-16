# M11 — P2 测试修复

## 目标
修复 i18n 测试脆性和命令计数硬编码。

## F211: i18n 测试修复
**范围**: `core/test/*.test.js` 中 23 个失败的文档契约测试

1. 识别所有失败测试：`npm test 2>&1 | grep FAIL`
2. 找出因中文文本匹配英文正则而失败的测试
3. 修复策略：
   - 对文档断言：使用中英双模式匹配
   - 对 Skill 内容检查：提取模式到共享配置
   - 对语言敏感断言：标记 `output.language` 依赖

## F210: readme-update 硬编码修复
**文件**: `core/test/readme-update.test.js`

1. 将硬编码的 36 条命令计数改为：
   - 从 commandMap 动态读取，或
   - 改为范围检查（≥ 最小预期值）

## 验收
- `npm test` 通过率 > 95%（当前 472/495 = 95.4%，目标≥ 97%）
- readme-update 测试不再硬编码具体命令数
