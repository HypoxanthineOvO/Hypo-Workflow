import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCompletionResponse,
  normalizeHumanResponse,
  normalizeIntermediateUpdate,
  renderCompletionResponse,
  renderHumanResponse,
  validateHumanResponseShape,
} from "../src/index.js";

test("human response schema requires conclusion explanation and next steps", () => {
  const response = normalizeHumanResponse({
    conclusion: "已确认问题。",
    explanation: "证据来自本地报告。",
    next_steps: ["运行 /hw:status 检查。"],
  });

  assert.deepEqual(response.required_sections, ["conclusion", "explanation", "next_steps"]);
  assert.equal(validateHumanResponseShape(response).ok, true);

  const rendered = renderHumanResponse(response);
  assert.match(rendered, /## 结论/);
  assert.match(rendered, /## 解释/);
  assert.match(rendered, /## 下一步/);
});

test("completion response includes manual operations and known risks", () => {
  const response = normalizeCompletionResponse({
    conclusion: "M1 完成。",
    what_changed: ["更新输出模板"],
    why: "避免只返回路径。",
    key_files: ["skills/report/SKILL.md"],
    validation: ["npm test --prefix core"],
    manual_operations: ["运行 /hw:report 阅读完成报告。"],
    known_risks: ["宿主模型仍可能压缩回复。"],
    next_steps: ["继续 M2。"],
  });

  assert.equal(validateHumanResponseShape(response, { completion: true }).ok, true);
  const rendered = renderCompletionResponse(response);
  assert.match(rendered, /## 手动操作/);
  assert.match(rendered, /\/hw:report/);
  assert.match(rendered, /## 已知风险/);
});

test("intermediate updates state current work findings and next step", () => {
  const update = normalizeIntermediateUpdate({
    current_work: "正在跑回归。",
    findings: "发现一个旧命令残留。",
    next_step: "修正后重跑。",
  });

  assert.deepEqual(update.required_sections, ["current_work", "findings", "next_step"]);
  assert.equal(update.current_work, "正在跑回归。");
  assert.equal(update.findings, "发现一个旧命令残留。");
  assert.equal(update.next_step, "修正后重跑。");
});
