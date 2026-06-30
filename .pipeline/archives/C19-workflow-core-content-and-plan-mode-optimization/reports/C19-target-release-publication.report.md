# C19 Target Release Publication Report

生成时间：2026-06-08T22:35:13+08:00

## 结果

C19 的两个目标仓库均已完成本地内容更新、Workflow 信息记录、Release 重建、打 tag 和远程推送。

| 仓库 | 分支 | Commit | Tag / Release | 状态 |
|---|---|---|---|---|
| `~/Codex-VSP` | `main` | `af11d8a308` | `v0.134.0-vsp.7.2` | 已推送 `origin/main`，GitLab Release 已创建 |
| `~/VSP-Open-Code` | `dev` | `4dc194e9639d0451885e16e2c7ec4548d299c865` | `v1.15.10-vsp.2.4` | 已推送 `origin/dev`，GitLab Release 已创建 |

## Release 链接

- Codex-VSP: https://gitlab.vsplab.cn/heyx/Codex/-/releases/v0.134.0-vsp.7.2
- VSP-Open-Code: https://gitlab.vsplab.cn/heyx/VSP-Open-Code/-/releases/v1.15.10-vsp.2.4

## 验证

Codex-VSP:

- JSON parse / stale scan / `git diff --check` 通过。
- `cargo build --manifest-path codex-rs/Cargo.toml --release --bin vsp-codex` 通过。
- `codex-rs/target/release/vsp-codex --version` 返回 `vsp-codex 0.134.0-vsp.7.2`。
- `.pipeline/release/v0.134.0-vsp.7.2/` 已生成 preview tarball 与 sha256。
- Release tarball sha256 校验和解包 smoke 通过。
- `pnpm prettier --check` 未运行：目标环境缺少 `prettier`，且 Node v20 不满足仓库 engine `>=22`；该验证缺口已在 Gate 中确认接受。

VSP-Open-Code:

- `bun test test/workflow/platform-awareness-contract.test.ts test/workflow/yolo-governance-contract.test.ts`：11/11 pass。
- `bun typecheck`：pass。
- `git diff --check HEAD^..HEAD`：pass。
- `bun run script/build.ts`：pass。
- `./script/vsp-release --version v1.15.10-vsp.2.4`：pass。
- branch/tag push pre-hook `bun turbo typecheck`：14/14 pass。
- `bash script/vsp-publish --version v1.15.10-vsp.2.4 --assets dist/vsp-release`：pass，12 个资产已上传。

## 范围控制

- 两个目标仓库的运行态 `.pipeline/chat*`、`.pipeline/inbox`、`.pipeline/knowledge` 文件均未纳入 release commit。
- VSP-Open-Code 的既有本地 dirty `.opencode/opencode.jsonc` 未触碰、未提交。
- Codex-VSP 仅推送 `origin`，未触碰 `upstream`。
