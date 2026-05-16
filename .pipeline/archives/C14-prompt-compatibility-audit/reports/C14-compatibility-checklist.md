# C14 兼容性检查清单

## 每次发布前检查

### Workflow 语义
- [ ] `code_quality` 评分方向是否已统一（1=差, 5=好 → 1=好, 5=差）
- [ ] V4 STOP 规则兼容性是否已有文档或配置开关
- [ ] `current.phase` 枚举是否包含 `needs_revision`
- [ ] Feature Queue `decomposed` 状态语义是否已明确

### 跨平台适配器
- [ ] 运行 `hypo-workflow sync --platform opencode` 确保版本一致
- [ ] `.opencode/hypo-workflow.json.analysis` 是否存在
- [ ] OpenCode agent 文件 (12) 与 Claude Code agent 文件 (8) 是否同步
- [ ] `commandMap` 是否在 .ts 和 .json 中一致

### Prompt 与规则
- [ ] 根 SKILL.md 的命令列表是否与 commands-spec.md 同步
- [ ] dashboard Skill 文件是否已清理或文档化
- [ ] `claude-hw-command-namespace` 规则文件是否存在
- [ ] `skill-spec.md` 声称的 Skill 数量是否与实际一致
- [ ] 输出语言规则集中化策略是否已裁决

### 测试
- [ ] `npm test` 是否 100% 通过（当前 472/495）
- [ ] i18n 测试正则是否支持中英双语
- [ ] `readme-update.test.js` 命令计数是否已动态化
- [ ] 新增命令/Skill 是否有对应测试

### 文档
- [ ] CONTRIBUTING.md 是否存在
- [ ] developer.md 是否包含：命令添加、Skill 编写、测试运行、平台适配器添加
- [ ] configuration.md 中英文是否同步
- [ ] user-guide.md 是否包含阻塞处理指南
- [ ] 所有平台指南是否有中英双语

## 每次新增命令后检查

- [ ] 命令是否在 5 个位置注册：commandMap (.ts + .json) + opencode.json + commands-spec.md + SKILL.md
- [ ] OpenCode agent 是否需要新建
- [ ] Claude Code agent 是否需要新建
- [ ] 是否添加了测试

## 每次新增平台后检查

- [ ] 是否创建了 platform-*.md 参考文档 (zh + en)
- [ ] 是否创建了 agent 文件
- [ ] 是否更新了 platform-capabilities.md
- [ ] 是否更新了 README 平台入口表
