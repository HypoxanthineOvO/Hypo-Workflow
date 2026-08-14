# C23 Revision 1 M6 Codex Hook RED Evidence

- Worker ID: `c23_m6_hook_test`
- Role: `test` only
- Milestone: `M6`
- Completed at: `2026-07-18T19:52:49+08:00`
- Verdict: `RED_EXPECTED`
- Production/docs/Skill/Hook config edits: `none`
- Workflow Runtime/Continuation advancement: `none`

## 结论

当前 Codex Hook validator 与 wrapper 不兼容省略 optional turn/tool identifiers 的合法 host payload。`validateCodexHookInput()` 对所有非 `SessionStart` 事件无条件要求 `turn_id`，对 `PreToolUse` 和 `PostToolUse` 无条件要求 `tool_use_id`；wrapper 因而退出 `1` 并持续报告 `Codex Hook failed: Codex Hook turn_id must be non-empty text`。

本轮新增一个独立 maintained RED 文件，冻结最小兼容契约：`turn_id` 和 `tool_use_id` 可以缺失；若 host 提供它们，仍必须是 non-empty safe single-component identifiers，且 identifier 本身不能是 raw-secret-like value；现有 event-specific output allowlist 不得放宽。M6 不改变 Hook enablement、trust hash/policy、matcher、command wrapper 或原始 tool payload 的观察策略。

## 调查与失败位置

- `core/src/codex-hooks/index.js:86`：`if (event !== "SessionStart") requireText(input.turn_id, "turn_id")` 把九类事件的 optional `turn_id` 变成 required。
- `core/src/codex-hooks/index.js:98`：`requireText(input.tool_use_id, "tool_use_id")` 把两个 tool events 的 optional `tool_use_id` 变成 required。
- `core/src/codex-hooks/index.js:827`：`requireText` 只校验 string/non-empty/length/control chars，没有使用已导入的 `normalizeSafeIdentifier`，所以 `../unsafe-turn`、`tool/unsafe` 与 secret-like ID 均被接受。
- `hooks/codex-hook.mjs:25` 调用 evaluator 后把 validator failure 写到 stderr，并在 catch 中设置 exit code `1`；wrapper 本身不是根因。
- `core/src/codex-hooks/index.js:782` 起的 output key matrix 与 `validateHookSpecificOutput()` 当前正确 fail closed，本轮不得修改或放宽。

官方 release Hooks 页面仍定义当前 event-specific output restrictions，并说明 exact wire schema 与 release behavior 可能有版本差异。官方 main generated schemas在本次只读检查时列出 IDs，但用户当前 host 的合法 payload 与明确 M6 acceptance 要求允许缺失，因此本 RED 固化的是跨 host/version input compatibility，不是改写官方文档或 Hook trust policy。

## 新增测试契约

`core/test/c23-m6-codex-hook-compatibility.test.js` 覆盖：

1. 九类携带 turn context 的事件省略 `turn_id` 后仍通过 input validator。
2. `PreToolUse` / `PostToolUse` 省略 `tool_use_id` 后仍通过 input validator。
3. 真实 process wrapper 对省略 IDs 的 `PreToolUse` / `Stop` payload 退出 `0`，stdout 恰好一个 JSON object。
4. 提供 optional IDs 时继续拒绝 non-string、path-like unsafe identifier 与 raw-secret-like identifier。
5. `PreToolUse.continue`、`permissionDecision:ask`、`PermissionRequest.updatedInput/interrupt`、`PostToolUse.suppressOutput/updatedMCPToolOutput` 继续拒绝。

测试没有增加对一般 `tool_input` / `tool_response` 中 secret 或 hidden-reasoning material 的全局拒绝。Hook 可能观察含敏感数据的工具调用，而当前实现不持久化这些原始字段；扩大该策略超出 M6 范围。

## RED 与基线结果

Focused command:

```text
node --test core/test/c23-m6-codex-hook-compatibility.test.js
```

结果：exit `1`；TAP `22` tests，`3 pass / 19 fail`。其中 `16` 个 leaf failures 是预期契约缺口：

- `9/9` omission cases 在 `core/src/codex-hooks/index.js:86` 失败，错误为 `turn_id must be non-empty text`。
- `2/2` tool omission cases 在 `core/src/codex-hooks/index.js:98` 失败，错误为 `tool_use_id must be non-empty text`。
- wrapper case 实际 exit `1`，stderr 精确复现持续 Hook failure。
- `4/4` unsafe/secret-like identifier cases未抛错。
- 两个 non-string identifier cases保持 GREEN。
- event-specific output restriction case保持 GREEN。

Existing maintained Hook baseline:

```text
node --test core/test/codex-hooks-vnext.test.js core/test/codex-hook-process.test.js
```

结果：exit `0`；`7/7 PASS`。这证明 RED 来自新增兼容契约，不是测试设施或 Hook config 回归。

Catalog validation:

```text
node tests/run_core_tests.mjs --set maintained --dry-run --json
```

结果：exit `0`；maintained count `58`，selected paths包含 `core/test/c23-m6-codex-hook-compatibility.test.js`。

`git diff --check -- core/test/c23-m6-codex-hook-compatibility.test.js tests/regression-catalog.json`：PASS。

## 修改的测试资产

- 新增 `core/test/c23-m6-codex-hook-compatibility.test.js`。
- 在已有 dirty `tests/regression-catalog.json` 中仅追加 maintained `C23-M6` entry；保留所有先前 C23 catalog edits。
- 新增本 evidence。

未修改 production、docs、Root/Child Skill、plugin metadata/cachebuster、`hooks/hooks.json`、`hooks/codex-hook.mjs`、Runtime、Continuation 或 legacy `.pipeline` 文件。

## Production implement identity 建议范围

允许修改的最小 production 文件只有 `core/src/codex-hooks/index.js`：

1. 将 `turn_id` / `tool_use_id` 校验改为 presence-aware；缺失时接受，存在时先对 identifier 本身执行 raw-secret scan，再执行 `normalizeSafeIdentifier`。
2. 对需要写 Ambient Maintain / Recovery Journal 的事件，使用已经 required 的 safe operation ID 作为缺失 `turn_id` / `tool_use_id` 的内部 fallback；不要把 undefined 写入下游 authority schema，也不要持久化原始 `tool_input` / `tool_response`。
3. 保留 `assertExactKeys`、其他 required event fields、permission modes、tool/agent payload validators、`validateCodexHookOutput()`、`outputKeysFor()` 与 `validateHookSpecificOutput()` 原样 fail closed。

不建议修改 `hooks/hooks.json`、`hooks/codex-hook.mjs`、Hook enablement/trust、plugin/cachebuster、docs/Skills、Recovery Store 或 Runtime schema。若 implement identity 发现必须扩大到这些文件，应先停止并重新确认范围。

## Freeze SHA-256

- M6 RED test: `8945855851c7d8b9698c509c6a6c0cb94259b51f3f61c8d0366367715313fd5b`
- Regression catalog: `ddf1fd609232eb2bc5c6f86bcd74b8eca233e2c0db45af6c421351010fc6e846`
- Current production candidate `core/src/codex-hooks/index.js`: `efb49628896e9a9545c71b554664594e821ebf662441b598983b36d96d03dd1c`
- Unchanged `hooks/hooks.json`: `4c31e12a26158e3d67e48ee366d77c86ba8a98553ca0e953e723a7e9210fe2c5`
- Unchanged `hooks/codex-hook.mjs`: `8e3b9baa4c34e1aaac1a16794666a98d4837653776b0cc7e1f6a5c7875a92b5d`
- Read-only Runtime: `55d25ca494fec2c8db7d1d6a85d27a28d8361f358e5f1bb113033b260710a622`
- Read-only Continuation: `b39d0c3b6841ccd0096ac1a428fad17193e93b9499ed192848459ee02c9deb13`

本 evidence 自身的最终 SHA-256 在写入后由 test identity 计算并在 worker handoff 中报告，避免自引用改变文件内容。

## 权威状态、预期效果与风险

只读 Resume 显示 active Delivery 为 `c23-experiment-management`，Runtime仍是 M5 `executing`、M6 `pending`，Continuation为 `continue_active_milestone`，Recovery Pack `missing/degraded`。父任务已显式派发 M6 test-only 工作；本 identity 未推进或修复该投影。

实现变绿后，合法的省略-ID Hook payload不再每个 turn/tool event 产生失败通知；提供的 ID仍受安全约束；删除 guardrail、permission behavior、output handling、Hook trust与用户审核流程不变。

剩余风险：main generated schema 与当前 host compatibility要求存在版本差异，后续 audit应同时重跑本 focused file、现有 maintained Hook tests和完整 relevant Experiment suite。implement identity还必须验证 active-object写路径使用 fallback 后不产生 undefined authority field、重复 transaction ID或跨事件 identity collision。
