export const RESPONSE_SCHEMA_SECTIONS = Object.freeze([
  "conclusion",
  "explanation",
  "next_steps",
]);

export const COMPLETION_RESPONSE_SECTIONS = Object.freeze([
  "conclusion",
  "change_summary",
  "technical_approach",
  "modified_files_or_modules",
  "test_design",
  "validation_results",
  "expected_results",
  "encountered_issues",
  "risks_and_followups",
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
  const validation = normalizeList(input.validation || input.tests || []);
  const knownRisks = normalizeList(input.known_risks || input.knownRisks || input.risks || []);
  const nextSteps = normalizeList(input.next_steps || input.nextSteps || input.next || []);
  const manualOperations = normalizeList(input.manual_operations || input.manualOperations || input.manual || []);
  const changeSummary = normalizeList(
    input.change_summary || input.changeSummary || input.what_changed || input.whatChanged || input.changed || [],
  );
  const modifiedFiles = normalizeList(
    input.modified_files_or_modules ||
      input.modifiedFilesOrModules ||
      input.key_files ||
      input.keyFiles ||
      input.files ||
      [],
  );
  const validationResults = normalizeList(input.validation_results || input.validationResults || validation);
  const risksAndFollowups = normalizeList(input.risks_and_followups || input.risksAndFollowups || knownRisks);
  return {
    schema: "completion_response_v1",
    language,
    required_sections: [...COMPLETION_RESPONSE_SECTIONS],
    conclusion: textOrDefault(input.conclusion, zh ? "本阶段已完成。" : "This stage is complete."),
    change_summary: changeSummary.length ? changeSummary : [zh ? "未记录改动摘要。" : "No change summary recorded."],
    technical_approach: textOrDefault(
      input.technical_approach || input.technicalApproach || input.why || input.explanation,
      zh ? "按当前计划完成必要变更。" : "Completed according to the current plan.",
    ),
    modified_files_or_modules: modifiedFiles.length ? modifiedFiles : [zh ? "无关键文件或模块。" : "No key files or modules."],
    test_design: textOrDefault(
      input.test_design || input.testDesign || input.testing_approach || input.testingApproach,
      validation.length ? validation.join("; ") : zh ? "未记录测试设计。" : "No test design recorded.",
    ),
    validation_results: validationResults.length ? validationResults : [zh ? "未记录验证结果。" : "No validation results recorded."],
    expected_results: textOrDefault(
      input.expected_results || input.expectedResults || input.expected_result || input.expectedResult,
      nextSteps.length
        ? nextSteps.join("; ")
        : zh
          ? "完成后的预期结果已体现在当前结论中。"
          : "Expected results are reflected in the current conclusion.",
    ),
    encountered_issues: normalizeList(input.encountered_issues || input.encounteredIssues || input.problems || manualOperations),
    risks_and_followups: risksAndFollowups.length ? risksAndFollowups : [zh ? "未发现额外风险。" : "No additional risks found."],
    what_changed: changeSummary,
    why: textOrDefault(input.why || input.explanation || input.technical_approach || input.technicalApproach, zh ? "按当前计划完成必要变更。" : "Completed according to the current plan."),
    key_files: modifiedFiles,
    validation,
    manual_operations: manualOperations,
    known_risks: knownRisks,
    next_steps: nextSteps,
  };
}

export function renderCompletionResponse(input = {}, options = {}) {
  const response = normalizeCompletionResponse(input, options);
  const zh = String(response.language).toLowerCase().startsWith("zh");
  return [
    heading(zh, "结论", "Conclusion"),
    response.conclusion,
    "",
    heading(zh, "改动摘要", "Change Summary"),
    ...listOrFallback(response.change_summary, zh ? "无变更记录。" : "No changes recorded."),
    "",
    heading(zh, "技术思路", "Technical Approach"),
    response.technical_approach,
    "",
    heading(zh, "修改文件/模块", "Modified Files / Modules"),
    ...listOrFallback(response.modified_files_or_modules, zh ? "无关键文件或模块。" : "No key files or modules."),
    "",
    heading(zh, "测试设计", "Test Design"),
    response.test_design,
    "",
    heading(zh, "验证结果", "Validation Results"),
    ...listOrFallback(response.validation_results, zh ? "未记录验证结果。" : "No validation results recorded."),
    "",
    heading(zh, "预期结果", "Expected Results"),
    response.expected_results,
    "",
    heading(zh, "遇到的问题", "Problems Encountered"),
    ...listOrFallback(response.encountered_issues, zh ? "无。" : "None."),
    "",
    heading(zh, "风险/后续", "Risks / Follow-Up"),
    ...listOrFallback(response.risks_and_followups, zh ? "未发现额外风险。" : "No additional risks found."),
    "",
    heading(zh, "已知风险", "Known Risks"),
    ...listOrFallback(response.known_risks, zh ? "未发现额外风险。" : "No additional risks found."),
    "",
    heading(zh, "手动操作", "Manual Operations"),
    ...listOrFallback(response.manual_operations, zh ? "无需额外手动操作。" : "No manual operations required."),
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
