# Platforms Reference

[中文](../../../reference/platforms.md) | English

This page summarizes command, Ask, Plan, and event capabilities across supported platforms. Third-party IDE adapters provide repository instruction surfaces; Cursor also syncs one flat Skill and command file per `/hw-*` entry, but none of them imply native hooks or automatic execution.

| Platform | Commands | Ask | Plan | Events |
|---|---|---|---|---|
| codex | skill | chat | codex-plan-tool | limited |
| claude-code | plugin-slash+skills | chat | prompt-managed | hooks |
| opencode | native-slash | question-tool | todowrite | plugin-events |
| cursor | repository-instructions+skills | chat | host-dependent | host-dependent |
| copilot | repository-instructions | chat | host-dependent | host-dependent |
| trae | repository-instructions | chat | host-dependent | host-dependent |
