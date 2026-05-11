export const RESPONSE_SCHEMA_SECTIONS = Object.freeze([
  "conclusion",
  "explanation",
  "next_steps",
]);

export const COMPLETION_RESPONSE_SECTIONS = Object.freeze([
  "conclusion",
  "what_changed",
  "why",
  "key_files",
  "validation",
  "manual_operations",
  "known_risks",
  "next_steps",
]);

export const INTERMEDIATE_UPDATE_SECTIONS = Object.freeze([
  "current_work",
  "findings",
  "next_step",
]);

export function normalizeHumanResponse(input = {}, options = {}) {
  const language = options.language || input.language || "zh-CN";
  const zh = String(language).toLowerCase().startsWith("zh");
  const conclusion = textOrDefault(input.conclusion, zh ? "暂时没有可确认的结论。" : "No confirmed conclusion yet.");
  const explanation = textOrDefault(input.explanation || input.details, zh ? "证据或原因尚未补充。" : "Evidence or rationale has not been supplied.");
  const nextSteps = normalizeList(input.next_steps || input.nextSteps || input.next || []);
  return {
    schema: "human_response_v1",
    language,
    required_sections: [...RESPONSE_SCHEMA_SECTIONS],
    conclusion,
    explanation,
    next_steps: nextSteps.length ? nextSteps : [zh ? "补充证据后再继续。" : "Continue after adding evidence."],
  };
}

export function renderHumanResponse(input = {}, options = {}) {
  const response = normalizeHumanResponse(input, options);
  const zh = String(response.language).toLowerCase().startsWith("zh");
  return [
    heading(zh, "结论", "Conclusion"),
    response.conclusion,
    "",
    heading(zh, "解释", "Explanation"),
    response.explanation,
    "",
    heading(zh, "下一步", "Next Steps"),
    ...response.next_steps.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

export function normalizeCompletionResponse(input = {}, options = {}) {
  const language = options.language || input.language || "zh-CN";
  const zh = String(language).toLowerCase().startsWith("zh");
  return {
    schema: "completion_response_v1",
    language,
    required_sections: [...COMPLETION_RESPONSE_SECTIONS],
    conclusion: textOrDefault(input.conclusion, zh ? "本阶段已完成。" : "This stage is complete."),
    what_changed: normalizeList(input.what_changed || input.whatChanged || input.changed || []),
    why: textOrDefault(input.why || input.explanation, zh ? "按当前计划完成必要变更。" : "Completed according to the current plan."),
    key_files: normalizeList(input.key_files || input.keyFiles || input.files || []),
    validation: normalizeList(input.validation || input.tests || []),
    manual_operations: normalizeList(input.manual_operations || input.manualOperations || input.manual || []),
    known_risks: normalizeList(input.known_risks || input.knownRisks || input.risks || []),
    next_steps: normalizeList(input.next_steps || input.nextSteps || input.next || []),
  };
}

export function renderCompletionResponse(input = {}, options = {}) {
  const response = normalizeCompletionResponse(input, options);
  const zh = String(response.language).toLowerCase().startsWith("zh");
  return [
    heading(zh, "结论", "Conclusion"),
    response.conclusion,
    "",
    heading(zh, "做了什么", "What Changed"),
    ...listOrFallback(response.what_changed, zh ? "无变更记录。" : "No changes recorded."),
    "",
    heading(zh, "为什么这样做", "Why"),
    response.why,
    "",
    heading(zh, "关键文件", "Key Files"),
    ...listOrFallback(response.key_files, zh ? "无关键文件。" : "No key files."),
    "",
    heading(zh, "验证", "Validation"),
    ...listOrFallback(response.validation, zh ? "未记录验证。" : "No validation recorded."),
    "",
    heading(zh, "手动操作", "Manual Operations"),
    ...listOrFallback(response.manual_operations, zh ? "无需额外手动操作。" : "No manual operations required."),
    "",
    heading(zh, "已知风险", "Known Risks"),
    ...listOrFallback(response.known_risks, zh ? "未发现额外风险。" : "No additional risks found."),
    "",
    heading(zh, "下一步", "Next Steps"),
    ...listOrFallback(response.next_steps, zh ? "等待下一步指令。" : "Await the next instruction."),
    "",
  ].join("\n");
}

export function normalizeIntermediateUpdate(input = {}, options = {}) {
  const language = options.language || input.language || "zh-CN";
  const zh = String(language).toLowerCase().startsWith("zh");
  return {
    schema: "intermediate_update_v1",
    language,
    required_sections: [...INTERMEDIATE_UPDATE_SECTIONS],
    current_work: textOrDefault(input.current_work || input.currentWork, zh ? "正在继续当前任务。" : "Continuing the current task."),
    findings: textOrDefault(input.findings, zh ? "暂时没有新发现。" : "No new findings yet."),
    next_step: textOrDefault(input.next_step || input.nextStep, zh ? "继续执行下一步。" : "Continue with the next step."),
  };
}

export function validateHumanResponseShape(value = {}, options = {}) {
  const required = options.completion ? COMPLETION_RESPONSE_SECTIONS : RESPONSE_SCHEMA_SECTIONS;
  const missing = required.filter((key) => {
    const item = value[key];
    return Array.isArray(item) ? item.length === 0 : !String(item || "").trim();
  });
  return {
    ok: missing.length === 0,
    missing,
  };
}

function heading(zh, zhText, enText) {
  return `## ${zh ? zhText : enText}`;
}

function listOrFallback(items, fallback) {
  const list = normalizeList(items);
  return list.length ? list.map((item) => `- ${item}`) : [`- ${fallback}`];
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (!value) return [];
  return [String(value).trim()].filter(Boolean);
}

function textOrDefault(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}
