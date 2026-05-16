# Debug Spec

Use this reference for `/hw:debug`, the symptom-driven debugging workflow.

## Difference From Audit

- `audit` is a preventive broad scan
- `debug` is a symptom-driven root-cause investigation after a failure or abnormal behavior appears
- when a debug session becomes a sustained investigation with recoverable hypotheses, experiments, interpretation, and conclusion, it should enter the Analysis lane instead of keeping all evidence inside a debug report

## Five-Step Method

### Step 1: Collect Symptoms

- gather the user-reported error or abnormal behavior
- `--trace` may inspect the latest error logs or failing tests automatically
- collect error text, failing tests, and reproduction steps

### Step 2: Gather Context

- read the architecture baseline
- read `.pipeline/log.yaml`
- read the latest milestone report when available
- inspect `git diff` and `git log --oneline -10`

### Step 3: Generate Hypotheses

- produce 3 to 5 possible root-cause hypotheses
- rank them by likelihood
- record the files or modules involved and a validation method for each

### Step 4: Validate

- validate hypotheses in order through code reading, tests, or targeted instrumentation
- mark each as confirmed, rejected, or needing more information
- if all are rejected, widen the scope and generate a fresh round
- if validation requires multiple experiment records, cross-turn continuation, or a traceable conclusion ledger, initialize or continue `/hw:analysis` state and record evidence in the Analysis ledger

### Step 5: Report Root Cause

- explain the confirmed root cause clearly
- provide a concrete fix suggestion, preferably as a diff
- assess impact radius and whether architecture documentation needs an update
- `--auto-fix` may apply the fix only if verification passes
- write the report in `output.language`
- render timestamps in `output.timezone`

## Report Template

```markdown
# Debug-NNN: [symptom title]

> Language: {output_language} | Timezone: {output_timezone}

## Symptom
[user description or error output]

## Context
- Recent changes: [git summary]
- Related modules: [from architecture baseline]

## Hypotheses And Validation
1. [hypothesis 1] — ✅ confirmed / ❌ rejected
   Validation: ...
2. [hypothesis 2] — ...

## Root Cause
[clear explanation]

## Fix Suggestion
[concrete code change]

## Completion Narrative
- Change Summary: [symptom, root cause, or applied fix]
- Technical Approach: [hypothesis ranking and validation strategy]
- Modified Files / Modules: [reviewed or changed files/modules]
- Test Design: [reproduction and validation plan]
- Validation Results: [confirmed/rejected evidence and command results]
- Expected Result: [expected behavior after fix]
- Problems Encountered: [constraints or none]
- Risks / Follow-Up: [remaining uncertainty or follow-up]

## Architecture Impact
[whether architecture should be updated]
```

## Safety

- `/hw:debug --auto-fix` must run validation after applying a fix
- if validation fails, keep the diagnosis but do not claim the fix is complete
- always write a report to `.pipeline/debug/` and a `type: debug` entry to `.pipeline/log.yaml`
- debug completion narratives must follow `references/completion-report-contract.md`
- Analysis handoff uses `.pipeline/analysis/<cycle-or-milestone>/ledger.yaml` as the source of truth, with legacy `.pipeline/analysis/<milestone-id>-analysis-ledger.yaml` accepted when state already points there
- status/report/progress surfaces for the handoff should show question, ledger path, outcome/confidence, next action, and compact counts, not full hypotheses or observations
