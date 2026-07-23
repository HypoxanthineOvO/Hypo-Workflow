# G22 Post-Acceptance Release Follow-up

## Conclusion

The user accepted G22 and separately authorized Push and Release for Hypo-Workflow, VSP-Codex, and VSP-Open-Code. All three releases are published and their remote branches, tags, commits, and assets were verified through the hosting APIs.

After publication, the user identified that `v13.1.0-beta.3` overstated the maturity of the unfinished major redesign. Hypo-Workflow was therefore republished with corrected semantic-versioning as `v14.0.0-alpha.1`. The original beta tag and assets remain available for historical compatibility, while its GitHub Release is explicitly marked superseded.

## Version-semantics correction

- Hypo-Workflow `v14.0.0-alpha.1`: release commit `aa97902143403ff0eee8096c32b8efa0ce880ec2`, GitHub prerelease `https://github.com/HypoxanthineOvO/Hypo-Workflow/releases/tag/v14.0.0-alpha.1`.
  - Codex plugin ZIP: `437528` bytes, SHA-256 `a2bac5cf6f8cc5279868450adac8803eb6b2be48648f25ec3891f343ed5e356f`.
  - Portable ZIP: `443186` bytes, SHA-256 `9bf6bbe5a5c22a3ad5f5fcd2b53c0c2e167cfc56c981b94f2cc55c20529fb475`.
  - Release manifest: `869` bytes, SHA-256 `7aa012870ad08a56181b31018305d30723670b224749f9da7c5175ed7ee43b61`.
  - Installed descriptor: `337` bytes, SHA-256 `39ef2802128e8ad20109d9ffdd9c6fbee58c54cd9c44e55f47cad36101bea843`.
- `v13.1.0-beta.3` remains an immutable historical tag and prerelease asset set. Its Release title is now `v13.1.0-beta.3 (superseded)` and its notice directs users to Alpha 1.
- VSP-Codex `v0.145.0-vsp.9.3` and VSP-Open-Code `v1.15.10-vsp.2.6` were not rebuilt or republished because their own product version semantics and artifacts did not change.

## Releases

- Hypo-Workflow `v13.1.0-beta.3`: source/release commit `8e6b1659f6c14b6c8f655757e1eeba32805994a7`, GitHub prerelease `https://github.com/HypoxanthineOvO/Hypo-Workflow/releases/tag/v13.1.0-beta.3`.
  - Codex plugin ZIP: `5ba80afaec1fdf54f07aa76784b755e8e0144c8fdc0835f5c740dd35f2147d65`.
  - Portable ZIP: `d5b495e633b041244e1769bede98422be8d56fbbe1ccab7174c741d88e0a56de`.
- VSP-Codex `v0.145.0-vsp.9.3`: product commit `e1f6e262fc`, release commit `0c3f4cffa24eb1a91f20c888b1a9b95be6f15621`, GitLab release `https://gitlab.vsplab.cn/heyx/Codex/-/releases/v0.145.0-vsp.9.3`.
  - Linux x64 archive: `342586353` bytes, SHA-256 `d8558ecf42b5f55703438f41948bb0fad776ff5b9bccc2884ea6ba66eb32d80d`.
- VSP-Open-Code `v1.15.10-vsp.2.6`: release commit `97b7c7ec54dbd60573ae1761843a8d6c6f2acb36`, GitLab release `https://gitlab.vsplab.cn/heyx/VSP-Open-Code/-/releases/v1.15.10-vsp.2.6`.
  - Linux x64 archive: `50128388` bytes, SHA-256 `b933e9d4b962f90ff44640fff825d1a6f86c7fdb7e2bad816914d4ebe05aa472`.

## Technical approach and modified modules

- Hypo-Workflow bumped all current platform/package version sources to beta.3, added bilingual release notes, rebuilt deterministic Host Contract artifacts twice, and uploaded the release manifest, installed descriptor, Codex plugin ZIP, and portable ZIP.
- VSP-Codex committed the G22 Core/TUI Host Contract consumer and legacy-writer retirement, bumped the workspace to vsp.9.3, rebuilt the release entrypoint and code-mode host, updated the stable updater manifest, and published the archive plus checksum.
- VSP-Open-Code committed the G22 CLI/TUI Host Contract consumer, real portable installer, and legacy-runner retirement, rebuilt the Linux x64 binary, and published it through the existing Generic Package Registry release path.

## Validation

- Hypo maintained Core: `486/486`; two beta.3 artifact builds produced identical hashes.
- Codex: `cargo check`; Host `5/5`; TUI `8/8`; package layout `2/2`; archive checksum and extracted `vsp-codex 0.145.0-vsp.9.3` smoke passed.
- OpenCode: typecheck; related tests `17/17` in the release pass; archive-extracted binary `--version` smoke passed.
- Remote APIs confirm all release commits and assets. All three repositories preserve excluded local Workflow/config/chat state outside the release commits.

## Problems encountered

- Codex's first release build exceeded the process file-descriptor limit. Retrying with four Cargo jobs resolved it.
- The host lacked `libcap.pc`. The release builder's supported prebuilt-resource path reused the published vsp.9.2 bwrap for the same Linux target and upstream baseline; the vsp.9.3 entrypoint and code-mode host were still rebuilt from current source.
- The OpenCode publish script lacked an executable bit, so it was invoked unchanged through `bash`.
- The quarantined legacy Hypo docs test cannot load a retired `repairDocs` root export. Maintained regression, direct docs language/narrative checks, and current release mapping checks passed; no obsolete 13-command/status/start contract was restored.
- GitHub HTTPS requests through the configured proxy repeatedly timed out during the Alpha 1 release. Direct GitHub API access with the proxy variables omitted succeeded; Git SSH push, repository state, authentication, and release data were unaffected.

## Residual risks and follow-up

- Only Linux x86_64 assets were published for VSP-Codex and VSP-Open-Code.
- No user-directory installation or Codex Hook re-trust was performed.
- Target repositories retain their pre-existing local `.pipeline`, config, chat, inbox, and temp changes; those were deliberately excluded from release commits.
- Alpha 1 is intentionally an early prerelease: it makes the redesigned core usable and distributable, but does not claim the completeness or stabilization expected from Beta.
