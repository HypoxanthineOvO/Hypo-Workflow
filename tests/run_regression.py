#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCENARIOS_ROOT = ROOT / "tests" / "scenarios"
RESULTS_ROOT = ROOT / "tests" / "results"
TEST_BIN = ROOT / "tests" / "bin"
VALIDATE_CONFIG = ROOT / "scripts" / "validate-config.sh"
PLUGIN_JSON = ROOT / ".claude-plugin" / "plugin.json"
TARGET_SCENARIOS = {
    "s01-fresh-start",
    "s02-resume-interrupt",
    "s03-diff-score-blocks",
    "s04-skip-step",
    "s05-implement-only",
    "s06-custom-sequence",
    "s07-full-hypo-todo",
    "s08-subagent-self-review",
    "s09-subagent-full-delegation",
    "s10-progressive-disclosure",
    "s11-scripts-executability",
    "s12-hook-stop-check",
    "s13-hook-session-start",
    "s14-multi-dim-scoring",
    "s15-architecture-drift",
    "s16-plan-discover",
    "s17-plan-review",
    "s18-template-library",
    "s19-help-list",
    "s20-help-init",
    "s21-check-output",
    "s22-init-empty-project",
    "s23-init-existing-project",
    "s24-audit-report",
    "s25-debug-flow",
    "s26-release-dry-run",
    "s27-reset-modes",
    "s28-log-filters",
    "s29-plan-review-migration",
    "s30-init-rescan",
    "s31-import-history-tags",
    "s32-import-history-keyword",
    "s33-import-history-merge",
    "s34-import-history-time-gap",
    "s35-import-history-interactive",
    "s36-import-history-non-git",
    "s37-import-history-existing-pipeline",
    "s38-patch-fix-flow",
    "s39-compact-generator",
    "s40-compact-session-start",
    "s41-full-view-flags",
    "s42-guide-flow",
    "s43-v8-2-registration",
    "s44-showcase-skeleton",
    "s45-showcase-docs",
    "s46-showcase-slides-poster",
    "s47-showcase-lifecycle",
    "s48-i18n-templates",
    "s49-showcase-bootstrap",
    "s50-rules-system",
    "s51-opencode-capability-matrix",
    "s52-core-config-artifacts",
    "s53-global-cli-tui-setup",
    "s54-opencode-plugin-scaffold",
    "s55-opencode-command-map",
    "s56-agents-ask-todo-plan-discipline",
    "s57-opencode-events-auto-continue-file-guard",
    "s58-opencode-full-v84-parity",
    "s59-v9-regression-bundle",
    "s60-progress-board-format",
    "s61-opencode-model-matrix-sync",
    "s62-analysis-preset-runtime",
    "s63-init-automation-non-git",
    "s64-audit-governance-contract",
    "s65-audit-memory-handoff",
    "s67-worker-separation-spawn-enforcement",
    "s68-rejection-rework-blocked-runtime-loop",
    "s69-audit-regression-canonical-examples",
}


@dataclass
class CheckResult:
    name: str
    ok: bool
    detail: str = ""


@dataclass
class ScenarioResult:
    name: str
    version: str
    checks: list[CheckResult] = field(default_factory=list)
    duration_s: float = 0.0

    @property
    def ok(self) -> bool:
        return all(c.ok for c in self.checks)


def run(cmd: str, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["PATH"] = f"{TEST_BIN}:{env.get('PATH', '')}"
    return subprocess.run(
        cmd,
        cwd=str(cwd or ROOT),
        shell=True,
        text=True,
        capture_output=True,
        env=env,
    )


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def add(result: ScenarioResult, name: str, ok: bool, detail: str = "") -> None:
    result.checks.append(CheckResult(name=name, ok=ok, detail=detail))


def version_of(scene: Path) -> str:
    return scene.parent.name.upper()


def validate_common(scene: Path, result: ScenarioResult) -> None:
    add(result, "checklist", (scene / "checklist.md").exists())
    results_keep = scene / "results" / ".gitkeep"
    add(result, "results_keep", results_keep.exists())
    config = scene / ".pipeline" / "config.yaml"
    if config.exists():
        if scene.name in {"s12-hook-stop-check", "s13-hook-session-start"}:
            add(result, "config_valid", True, "hook-only fixture; skipped validate-config project-root hooks check")
        else:
            proc = run(f'bash "{VALIDATE_CONFIG}" "{config}"')
            add(result, "config_valid", proc.returncode == 0, (proc.stdout + proc.stderr).strip())


def scenario_specific(scene: Path, result: ScenarioResult) -> None:
    name = scene.name
    if name == "s01-fresh-start":
        txt = read(scene / ".pipeline" / "config.yaml")
        add(result, "preset_tdd", "preset: tdd" in txt)
        add(result, "prompt_00", (scene / ".pipeline" / "prompts" / "00-scaffold.md").exists())
    elif name == "s02-resume-interrupt":
        add(result, "state_exists", (scene / ".pipeline" / "state.yaml").exists())
        add(result, "prompt_count", len(list((scene / ".pipeline" / "prompts").glob("*.md"))) == 2)
    elif name == "s03-diff-score-blocks":
        txt = read(scene / ".pipeline" / "config.yaml")
        add(result, "strict_diff", "max_diff_score: 1" in txt)
    elif name == "s04-skip-step":
        add(result, "checklist_mentions_skip", "skip step" in read(scene / "checklist.md"))
    elif name == "s05-implement-only":
        add(result, "preset_implement_only", "preset: implement-only" in read(scene / ".pipeline" / "config.yaml"))
    elif name == "s06-custom-sequence":
        txt = read(scene / ".pipeline" / "config.yaml")
        add(result, "preset_custom", "preset: custom" in txt and "- implement" in txt and "- review_code" in txt)
    elif name == "s07-full-hypo-todo":
        add(result, "prompt_count", len(list((scene / ".pipeline" / "prompts").glob("*.md"))) == 4)
    elif name in {"s08-subagent-self-review", "s09-subagent-full-delegation"}:
        txt = read(scene / ".pipeline" / "config.yaml")
        add(result, "subagent_mode", "mode: subagent" in txt)
        add(result, "reviewer_subagent", txt.count("reviewer: subagent") >= 2)
    elif name == "s10-progressive-disclosure":
        refs = len(list((ROOT / "references").glob("*.md")))
        scripts = len(list((ROOT / "scripts").glob("*.sh")))
        assets = len([p for p in (ROOT / "assets").rglob("*") if p.is_file()])
        add(result, "references_count", refs >= 6, str(refs))
        add(result, "scripts_count", scripts >= 5 and (ROOT / "scripts" / "watchdog.sh").exists(), str(scripts))
        add(result, "assets_present", assets >= 5, str(assets))
    elif name == "s11-scripts-executability":
        tmpdir = Path(tempfile.mkdtemp(prefix="hw-s11-"))
        before = run(f'bash "{ROOT / "scripts" / "state-summary.sh"}"', cwd=tmpdir)
        add(result, "state_summary_before", "No active pipeline" in before.stdout, before.stdout.strip())
        log = run(f'bash "{ROOT / "scripts" / "log-append.sh"}" --step test --status done --message ok', cwd=tmpdir)
        add(result, "log_append", log.returncode == 0 and (tmpdir / ".pipeline" / "log.md").exists())
        gitrepo = tmpdir / "repo"
        gitrepo.mkdir()
        run("git init -q", cwd=gitrepo)
        run("git config user.email test@example.com", cwd=gitrepo)
        run("git config user.name tester", cwd=gitrepo)
        (gitrepo / "f.txt").write_text("a\n", encoding="utf-8")
        run("git add f.txt && git commit -qm init", cwd=gitrepo)
        (gitrepo / "f.txt").write_text("a\nb\n", encoding="utf-8")
        diff = run(f'bash "{ROOT / "scripts" / "diff-stats.sh"}"', cwd=gitrepo)
        add(result, "diff_stats", "changed_files=" in diff.stdout and "added_lines=" in diff.stdout, diff.stdout.strip())
        plugin = run(f'python3 -m json.tool "{PLUGIN_JSON}"')
        add(result, "plugin_json", plugin.returncode == 0 and '"version": "' in plugin.stdout)
    elif name == "s12-hook-stop-check":
        tmp = Path(tempfile.mkdtemp(prefix="hw-s12-"))
        case_a = run(f'bash "{ROOT / "hooks" / "stop-check.sh"}"', cwd=tmp)
        add(result, "case_a", case_a.returncode == 0 and case_a.stdout.strip() == "{}", case_a.stdout.strip())
        case_b = tmp / "b"
        (case_b / ".pipeline").mkdir(parents=True)
        (case_b / ".pipeline" / "state.yaml").write_text("pipeline:\n  name: s12\n  status: completed\n", encoding="utf-8")
        out_b = run(f'bash "{ROOT / "hooks" / "stop-check.sh"}"', cwd=case_b)
        add(result, "case_b", out_b.returncode == 0 and out_b.stdout.strip() == "{}")
        case_c = tmp / "c"
        (case_c / ".pipeline").mkdir(parents=True)
        state_c = case_c / ".pipeline" / "state.yaml"
        state_c.write_text("pipeline:\n  name: s12\n  status: running\ncurrent:\n  step: implement\n", encoding="utf-8")
        ts = time.time() - 120
        os.utime(state_c, (ts, ts))
        out_c = run(f'bash "{ROOT / "hooks" / "stop-check.sh"}"', cwd=case_c)
        add(result, "case_c", '"decision":"block"' in out_c.stdout, out_c.stdout.strip())
    elif name == "s13-hook-session-start":
        tmp = Path(tempfile.mkdtemp(prefix="hw-s13-"))
        case_a = run(f'bash "{ROOT / "hooks" / "session-start.sh"}" startup', cwd=tmp)
        add(result, "case_a", case_a.returncode == 0 and case_a.stdout.strip() == "{}")
        case_c = tmp / "c"
        (case_c / ".pipeline").mkdir(parents=True)
        (case_c / ".pipeline" / "state.yaml").write_text(
            "pipeline:\n  name: s13-test\n  status: running\ncurrent:\n  prompt_file: 01-feature.md\n  step: implement\n  step_index: 3\n",
            encoding="utf-8",
        )
        out_c = run(f'bash "{ROOT / "hooks" / "session-start.sh"}" resume', cwd=case_c)
        add(result, "resume_context", "01-feature.md" in out_c.stdout and "implement" in out_c.stdout, out_c.stdout.strip())
    elif name == "s14-multi-dim-scoring":
        add(result, "prompt_count", len(list((scene / ".pipeline" / "prompts").glob("*.md"))) == 3)
        eval_spec = read(ROOT / "references" / "evaluation-spec.md")
        report_tpl = read(ROOT / "assets" / "report-template.md")
        add(result, "adaptive_threshold", "adaptive_threshold" in eval_spec)
        add(result, "scores_table", "### Scores" in report_tpl and "Architecture Drift Detail" in report_tpl)
    elif name == "s15-architecture-drift":
        add(result, "prompt_count", len(list((scene / ".pipeline" / "prompts").glob("*.md"))) == 2)
        eval_spec = read(ROOT / "references" / "evaluation-spec.md")
        add(result, "arch_stop_rule", "architecture_drift >= 4" in eval_spec)
    elif name in {
        "s16-plan-discover",
        "s17-plan-review",
        "s18-template-library",
        "s19-help-list",
        "s20-help-init",
        "s21-check-output",
        "s22-init-empty-project",
        "s23-init-existing-project",
        "s24-audit-report",
        "s25-debug-flow",
        "s26-release-dry-run",
        "s27-reset-modes",
        "s28-log-filters",
        "s29-plan-review-migration",
        "s30-init-rescan",
        "s31-import-history-tags",
        "s32-import-history-keyword",
        "s33-import-history-merge",
        "s34-import-history-time-gap",
        "s35-import-history-interactive",
        "s36-import-history-non-git",
        "s37-import-history-existing-pipeline",
        "s38-patch-fix-flow",
        "s39-compact-generator",
        "s40-compact-session-start",
        "s41-full-view-flags",
        "s42-guide-flow",
        "s43-v8-2-registration",
        "s44-showcase-skeleton",
        "s45-showcase-docs",
        "s46-showcase-slides-poster",
        "s47-showcase-lifecycle",
        "s48-i18n-templates",
        "s49-showcase-bootstrap",
        "s50-rules-system",
        "s51-opencode-capability-matrix",
        "s52-core-config-artifacts",
        "s53-global-cli-tui-setup",
        "s54-opencode-plugin-scaffold",
        "s55-opencode-command-map",
        "s56-agents-ask-todo-plan-discipline",
        "s57-opencode-events-auto-continue-file-guard",
        "s58-opencode-full-v84-parity",
        "s59-v9-regression-bundle",
        "s60-progress-board-format",
        "s61-opencode-model-matrix-sync",
        "s62-analysis-preset-runtime",
        "s63-init-automation-non-git",
        "s64-audit-governance-contract",
        "s65-audit-memory-handoff",
        "s67-worker-separation-spawn-enforcement",
        "s68-rejection-rework-blocked-runtime-loop",
        "s69-audit-regression-canonical-examples",
    }:
        proc = run(f'bash "{scene / "run.sh"}"', cwd=scene)
        add(result, "run_sh", proc.returncode == 0, (proc.stdout + proc.stderr).strip())


def main() -> int:
    RESULTS_ROOT.mkdir(parents=True, exist_ok=True)
    scenario_dirs = sorted(
        [p for p in SCENARIOS_ROOT.glob("v*/s*") if p.is_dir() and p.name in TARGET_SCENARIOS],
        key=lambda p: p.name,
    )
    results: list[ScenarioResult] = []
    for scene in scenario_dirs:
        started = time.time()
        res = ScenarioResult(name=scene.name, version=version_of(scene))
        validate_common(scene, res)
        scenario_specific(scene, res)
        res.duration_s = round(time.time() - started, 3)
        results.append(res)
        status = "PASS" if res.ok else "FAIL"
        print(f"{status} {scene.name} ({res.duration_s}s)")
        for check in res.checks:
            if not check.ok:
                print(f"  - {check.name}: {check.detail}")

    payload = {
        "results": [
            {
                "name": r.name,
                "version": r.version,
                "ok": r.ok,
                "duration_s": r.duration_s,
                "checks": [c.__dict__ for c in r.checks],
            }
            for r in results
        ]
    }
    stamp = time.strftime("%Y%m%dT%H%M%S")
    (RESULTS_ROOT / f"{stamp}-s01-s30.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    failed = [r for r in results if not r.ok]
    print(f"\nSummary: {len(results)-len(failed)}/{len(results)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
