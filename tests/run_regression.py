#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCENARIOS_ROOT = ROOT / "tests" / "scenarios"
TEST_BIN = ROOT / "tests" / "bin"
VALIDATE_CONFIG = ROOT / "scripts" / "validate-config.sh"
PLUGIN_JSON = ROOT / ".claude-plugin" / "plugin.json"
DEFAULT_CATALOG = ROOT / "tests" / "regression-catalog.json"
CLASSIFICATIONS = ("maintained", "quarantined", "excluded")
VALID_SETS = ("maintained", "quarantined", "all")


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


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Hypo-Workflow regression scenarios.")
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--set", choices=VALID_SETS, default="maintained")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--json", action="store_true")
    parser.add_argument(
        "--scenario",
        action="append",
        default=[],
        help="Run only the named scenario. May be provided multiple times.",
    )
    return parser.parse_args(argv)


def canonical_repository_path(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} path must be a string")
    normalized = value.replace(os.sep, "/")
    segments = normalized.split("/")
    if (
        Path(value).is_absolute()
        or "\\" in normalized
        or any(not segment or segment in {".", ".."} for segment in segments)
    ):
        raise ValueError(f"{label} has an unsafe or non-canonical path: {value}")
    return normalized


def discover_core_tests() -> list[str]:
    return sorted(
        path.relative_to(ROOT).as_posix()
        for path in (ROOT / "core" / "test").rglob("*")
        if path.is_file() and re.search(r"\.(?:test|spec)\.[^.]+$", path.name)
    )


def discover_registered_scenarios() -> list[str]:
    discovered: list[str] = []
    for version in SCENARIOS_ROOT.iterdir():
        if not version.is_dir():
            continue
        for scene in version.iterdir():
            if (
                scene.is_dir()
                and scene.name.startswith("s")
                and "placeholder" not in scene.name
                and (scene / "checklist.md").is_file()
            ):
                discovered.append(scene.relative_to(ROOT).as_posix())
    return sorted(discovered)


def validate_partition(value: object, suite: str) -> dict[str, object]:
    if not isinstance(value, dict) or set(value) != set(CLASSIFICATIONS):
        raise ValueError(f"catalog.suites.{suite} must contain exactly maintained, quarantined, and excluded")
    entries: list[dict[str, object]] = []
    paths_by_class: dict[str, list[str]] = {}
    seen: set[str] = set()
    for classification in CLASSIFICATIONS:
        group = value[classification]
        if not isinstance(group, list):
            raise ValueError(f"{suite}.{classification} must be an array")
        paths: list[str] = []
        for entry in group:
            if not isinstance(entry, dict):
                raise ValueError(f"{suite}.{classification} contains an invalid entry")
            if entry.get("classification") != classification:
                raise ValueError(f"{suite}:{entry.get('path', '<unknown>')} classification mismatch")
            path = canonical_repository_path(entry.get("path"), f"{suite}.{classification}")
            if path in seen:
                raise ValueError(f"{suite} overlap: {path} is classified twice")
            seen.add(path)
            paths.append(path)
            entries.append(entry)
        paths_by_class[classification] = sorted(paths)
    if not paths_by_class["maintained"]:
        raise ValueError(f"{suite} must expose a non-empty maintained set")
    return {
        "entries": entries,
        "maintained": paths_by_class["maintained"],
        "quarantined": paths_by_class["quarantined"],
        "excluded": paths_by_class["excluded"],
        "all": sorted(paths_by_class["maintained"] + paths_by_class["quarantined"]),
        "inventory": sorted(path for classification in CLASSIFICATIONS for path in paths_by_class[classification]),
    }


def assert_exact_inventory(actual: list[str], expected: list[str], suite: str) -> None:
    actual_set = set(actual)
    expected_set = set(expected)
    unclassified = [path for path in expected if path not in actual_set]
    missing = [path for path in actual if path not in expected_set]
    if unclassified or missing:
        raise ValueError(
            f"{suite} catalog coverage mismatch; unclassified: {', '.join(unclassified) or 'none'}; "
            f"missing files: {', '.join(missing) or 'none'}"
        )


def load_catalog(path: Path) -> dict[str, dict[str, object]]:
    catalog = json.loads(path.resolve().read_text(encoding="utf-8"))
    if not isinstance(catalog, dict) or catalog.get("schema_version") != "1":
        raise ValueError("catalog schema_version must be 1")
    suites = catalog.get("suites")
    if not isinstance(suites, dict) or set(suites) != {"core", "scenarios"}:
        raise ValueError("catalog.suites must contain exactly core and scenarios")
    partitions = {
        "core": validate_partition(suites["core"], "core"),
        "scenarios": validate_partition(suites["scenarios"], "scenarios"),
    }
    assert_exact_inventory(partitions["core"]["inventory"], discover_core_tests(), "core")
    assert_exact_inventory(partitions["scenarios"]["inventory"], discover_registered_scenarios(), "scenarios")

    maintained = set(partitions["core"]["maintained"] + partitions["scenarios"]["maintained"])
    for suite, partition in partitions.items():
        for entry in partition["entries"]:
            reason = entry.get("reason")
            if not isinstance(reason, str) or not reason.strip():
                raise ValueError(f"{suite}:{entry.get('path')} requires a non-empty reason")
            replacement = entry.get("replacement")
            if entry["classification"] == "quarantined" and (not isinstance(replacement, list) or not replacement):
                raise ValueError(f"{suite}:{entry['path']} requires at least one replacement")
            if replacement is None:
                continue
            if not isinstance(replacement, list) or not replacement:
                raise ValueError(f"{suite}:{entry['path']} has an invalid replacement")
            for target in replacement:
                if target not in maintained:
                    raise ValueError(f"{suite}:{entry['path']} replacement is not maintained: {target}")

    retired_surfaces = catalog.get("retired_surfaces")
    if not isinstance(retired_surfaces, list):
        raise ValueError("retired_surfaces must be an array")
    for surface in retired_surfaces:
        if not isinstance(surface, dict):
            raise ValueError("retired_surfaces contains an invalid entry")
        path = canonical_repository_path(surface.get("path"), "retired surface")
        if surface.get("classification") != "quarantined":
            raise ValueError(f"retired surface {path} must be quarantined")
        reason = surface.get("reason")
        if not isinstance(reason, str) or not reason.strip():
            raise ValueError(f"retired surface {path} requires a reason")
        replacement = surface.get("replacement")
        if not isinstance(replacement, list) or not replacement:
            raise ValueError(f"retired surface {path} requires replacement routes")
        for target in replacement:
            if not isinstance(target, str) or not target.strip():
                raise ValueError(f"retired surface {path} has an invalid replacement")
            if not target.startswith("/hw:") and target not in maintained:
                raise ValueError(f"retired surface {path} replacement is not maintained: {target}")
    return partitions


def selection_payload(selected_set: str, partition: dict[str, object], paths: list[str]) -> dict[str, object]:
    return {
        "schema_version": "1",
        "suite": "scenarios",
        "selected_set": selected_set,
        "maintained_count": len(partition["maintained"]),
        "quarantined_count": len(partition["quarantined"]),
        "excluded_count": len(partition["excluded"]),
        "inventoried_count": len(partition["inventory"]),
        "selected_count": len(paths),
        "selected_paths": paths,
    }


def print_selection(payload: dict[str, object]) -> None:
    print(
        "Scenario regression inventory: "
        f"maintained={payload['maintained_count']} "
        f"quarantined={payload['quarantined_count']} "
        f"excluded={payload['excluded_count']} "
        f"inventoried={payload['inventoried_count']} "
        f"selected={payload['selected_count']} set={payload['selected_set']}"
    )
    for path in payload["selected_paths"]:
        print(f"- {path}")


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
    elif (scene / "run.sh").is_file():
        proc = run(f'bash "{scene / "run.sh"}"', cwd=scene)
        add(result, "run_sh", proc.returncode == 0, (proc.stdout + proc.stderr).strip())


def main() -> int:
    args = parse_args(sys.argv[1:])
    try:
        partitions = load_catalog(args.catalog)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Regression catalog error: {error}", file=sys.stderr)
        return 2

    partition = partitions["scenarios"]
    selected_paths = list(partition["all"] if args.set == "all" else partition[args.set])
    if args.scenario:
        by_path = {path: path for path in selected_paths}
        by_name = {Path(path).name: path for path in selected_paths}
        unknown = [name for name in args.scenario if name not in by_path and name not in by_name]
        if unknown:
            print(
                "Unknown scenario(s): " + ", ".join(unknown) + "\n"
                "Known scenarios in selected set: " + ", ".join(sorted(by_name)),
                file=sys.stderr,
            )
            return 2
        selected_paths = [
            by_path[name] if name in by_path else by_name[name]
            for name in args.scenario
        ]

    selection = selection_payload(args.set, partition, selected_paths)
    if args.dry_run:
        if args.json:
            print(json.dumps(selection, ensure_ascii=False, separators=(",", ":")))
        else:
            print_selection(selection)
        return 0

    scenario_dirs = [ROOT / path for path in selected_paths]
    if not args.json:
        print_selection(selection)

    results: list[ScenarioResult] = []
    for scene in scenario_dirs:
        started = time.time()
        res = ScenarioResult(name=scene.name, version=version_of(scene))
        validate_common(scene, res)
        scenario_specific(scene, res)
        res.duration_s = round(time.time() - started, 3)
        results.append(res)
        if not args.json:
            status = "PASS" if res.ok else "FAIL"
            print(f"{status} {scene.name} ({res.duration_s}s)")
            for check in res.checks:
                if not check.ok:
                    print(f"  - {check.name}: {check.detail}")

    payload = {
        **selection,
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
    failed = [r for r in results if not r.ok]
    if args.json:
        print(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    else:
        print(f"\nSummary: {len(results)-len(failed)}/{len(results)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
