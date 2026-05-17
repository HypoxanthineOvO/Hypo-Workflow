# 平台参考

本页汇总各平台的 command、Ask、Plan 和事件能力。第三方 IDE adapter 提供仓库指令面；Cursor 还同步每命令一个平铺 Skill 和 command 文件，但仍不代表 native hook 或自动执行能力。平台能力表用于避免夸大自动化边界，也方便用户判断当前宿主 Agent 能支持哪些 Hypo-Workflow 行为。

| Platform | Commands | Ask | Plan | Events |
|---|---|---|---|---|
| codex | skill | chat | codex-plan-tool | limited |
| claude-code | plugin-slash+skills | chat | prompt-managed | hooks |
| opencode | native-slash | question-tool | todowrite | plugin-events |
| cursor | repository-instructions+skills | chat | host-dependent | host-dependent |
| copilot | repository-instructions | chat | host-dependent | host-dependent |
| trae | repository-instructions | chat | host-dependent | host-dependent |
