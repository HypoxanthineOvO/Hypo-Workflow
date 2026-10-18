from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from fnmatch import fnmatch
from pathlib import Path, PurePosixPath
from urllib.parse import unquote

from . import blacklist
from .board import parse_board
from .git import (
    ChangedLine,
    Commit,
    GitError,
    changed_files,
    changed_lines,
    commits,
    file_text,
    has_head,
    ignored_paths,
    parent_revision,
    status_entries,
    status_paths,
    tracked_files,
)
from .project import (
    ARCHIVE_DIRS,
    CodeAnchor,
    Project,
    Requirement,
    path_matches,
    requirement_matches_feature,
    section_map,
)
from .report import print_json
from .symbols import definitions, matching_names, owners

ALARM = "alarm"
HINT = "hint"
CODE_SUFFIXES = {
    ".py", ".pyi", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
    ".go", ".rs", ".c", ".cc", ".cpp", ".cxx", ".h", ".hh", ".hpp", ".hxx", ".cu",
    ".java", ".kt", ".kts", ".scala", ".swift", ".m", ".mm", ".cs",
    ".rb", ".php", ".sh", ".bash", ".zsh", ".lua", ".pl", ".pm",
    ".vue", ".svelte", ".dart", ".ex", ".exs", ".erl", ".hs", ".ml", ".mli",
    ".jl", ".r", ".f", ".f90", ".f95", ".for", ".zig", ".nim", ".sol",
    ".sql", ".html", ".css", ".scss", ".less",
}
ALLOWED_MARKDOWN = {"README.md", "AGENTS.md", "RULES.md", "STATUS.md", "BOARD.md", "CLAUDE.md"}
FORMAT_FIELDS = ("Feature", "Code", "Docs", "Verified")
PREFIX = re.compile(r"^(?:feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)(?:\([^)]*\))?!?:", re.I)
MILESTONE = re.compile(r"(?<![A-Za-z0-9])M\d+[a-z]?(?![A-Za-z0-9])")
CYCLE = re.compile(r"(?<![A-Za-z0-9])C\d{2,}(?![A-Za-z0-9])")
SHORT_HASH = re.compile(r"(?<![A-Za-z0-9])(?=[a-f0-9]*[0-9])[a-f0-9]{7,}(?![A-Za-z0-9])", re.I)
LINK = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")
README_RULES = (
    ("进度类内容", re.compile(r"^\s*(?:#{1,6}\s+|[-*+]\s+)?(?:项目|开发|当前|本周|本轮)?(?:进度|下一步|已完成)(?:[:：\s]|$)")),
    ("内部编号", re.compile(r"(?<![A-Za-z0-9])M\d+|Cycle")),
    ("日期开头的段落", re.compile(r"^\s*(?:#{1,6}\s*)?\d{4}[-年/]\d{1,2}")),
    ("Agent 规则", re.compile(r"^\s*(?:#{1,6}\s+|[-*+]\s+)?(?:(?:Agent|开发|协作)\s*(?:规则|须知|指令)|(?:所有\s*)?Agent\s*(?:必须|应当|需要|不得|禁止)|(?:开工前|提交前|完成前).*(?:运行|执行|读取))")),
)


@dataclass
class Issue:
    level: str
    category: str
    location: str
    message: str

    def to_dict(self) -> dict:
        return {
            "level": self.level,
            "category": self.category,
            "location": self.location,
            "message": self.message,
        }


class Collector:
    def __init__(self):
        self.alarms: list[Issue] = []
        self.hints: list[Issue] = []
        self.seen: set[tuple[str, str, str, str]] = set()

    def add(self, level: str, category: str, location: str, message: str) -> None:
        key = (level, category, location, message)
        if key in self.seen:
            return
        self.seen.add(key)
        issue = Issue(level, category, location, message)
        (self.alarms if level == ALARM else self.hints).append(issue)


def docs_exempted(value: str) -> bool:
    return bool(re.fullmatch(r"未改\s*[，,:：;；]\s*[^\s，,:：;；。].*", value.strip()))


def no_description_patterns(project: Project) -> list[str]:
    body = section_map(project.rules_text).get("不需要描述", "")
    patterns: list[str] = []
    for raw in body.splitlines():
        line = re.sub(r"^[-*+]\s+", "", raw.strip())
        if not line:
            continue
        patterns.extend(part.strip().strip("`") for part in re.split(r"[、，,；;]", line) if part.strip())
    return patterns


def is_code(path: str) -> bool:
    pure = PurePosixPath(path)
    if pure.suffix.lower() not in CODE_SUFFIXES:
        return False
    if "tests" in pure.parts[:-1] or path.startswith("tests/"):
        return False
    return not any(part in ARCHIVE_DIRS for part in pure.parts)


def skipped(path: str, patterns: list[str]) -> bool:
    for pattern in patterns:
        clean = pattern.rstrip("/")
        if not clean:
            continue
        if path == clean or path.startswith(clean + "/") or fnmatch(path, clean):
            return True
    return False


def anchor_files(project: Project, anchor: CodeAnchor) -> list[Path]:
    if any(char in anchor.path for char in "*?["):
        return sorted(path for path in project.root.glob(anchor.path) if path.is_file())
    path = project.root / anchor.path
    return [path] if path.is_file() else []


def known_symbols(anchors: list[tuple[Requirement, CodeAnchor]], path: str) -> set[str]:
    result: set[str] = set()
    for _, anchor in anchors:
        if path_matches(anchor.path, path):
            result.update(anchor.symbols)
    return result


def touched_symbols(project: Project, rev: str | None, path: str, symbols: set[str], code: str = "") -> set[str]:
    if not symbols:
        return set()
    target = project.root / path
    if rev is None and (code == "??" or not has_head(project.root)):
        lines = target.read_text(encoding="utf-8", errors="replace").splitlines() if target.is_file() else []
        changed = [ChangedLine("new", number, text) for number, text in enumerate(lines, start=1)]
    else:
        changed = changed_lines(project.root, rev, path)
    if not changed:
        return set()

    old_rev = parent_revision(project.root, rev) if rev else ("HEAD" if has_head(project.root) else None)
    old_text = file_text(project.root, old_rev, path)
    if rev:
        new_text = file_text(project.root, rev, path)
    else:
        new_text = target.read_text(encoding="utf-8", errors="replace") if target.is_file() else ""
    sides = {"old": definitions(path, old_text), "new": definitions(path, new_text)}
    return {name for item in changed for name in owners(sides[item.side], item.number, symbols)}


def check_anchors(project: Project, collector: Collector) -> list[tuple[Requirement, CodeAnchor]]:
    anchors: list[tuple[Requirement, CodeAnchor]] = []
    for requirement in project.requirements:
        for anchor in requirement.code:
            anchors.append((requirement, anchor))
            if not anchor_files(project, anchor):
                collector.add(ALARM, "文档", requirement.path, f"代码锚点不存在：{anchor.path}")
                continue
            if not anchor.symbols:
                continue
            found = {
                name for path in anchor_files(project, anchor)
                for item in definitions(path.name, path.read_text(encoding="utf-8"))
                for name in matching_names(item, set(anchor.symbols))
            }
            missing = [symbol for symbol in anchor.symbols if symbol not in found]
            if missing:
                collector.add(
                    ALARM,
                    "文档",
                    requirement.path,
                    f"代码锚点在 {anchor.path} 中找不到符号：{', '.join(missing)}",
                )
    return anchors


def commit_requirements(project: Project, commit: Commit) -> list[Requirement]:
    parent = parent_revision(project.root, commit.hash)
    previous = Project(project.root, parent).requirements if parent else []
    return previous + Project(project.root, commit.hash).requirements


def check_commit_sync(
    project: Project,
    history: list[Commit],
    collector: Collector,
) -> None:
    for commit in history:
        requirements = commit_requirements(project, commit)
        anchors = [(requirement, anchor) for requirement in requirements for anchor in requirement.code]
        changed = sorted(set(changed_files(project.root, commit.hash)))
        feature = commit.trailer("Feature")
        docs = commit.trailer("Docs")
        touched = {
            path: touched_symbols(project, commit.hash, path, known_symbols(anchors, path))
            for path in changed
        }
        for requirement in requirements:
            if (
                requirement_matches_feature(requirement, feature)
                and requirement.path not in changed
                and not docs_exempted(docs)
            ):
                collector.add(
                    ALARM,
                    "文档",
                    f"提交 {commit.short}",
                    f"声明 Feature: {feature}，但没改 {requirement.path}，Docs 也没写未改及原因",
                )
        for requirement, anchor in anchors:
            if requirement_matches_feature(requirement, feature):
                continue
            for path in changed:
                if not path_matches(anchor.path, path):
                    continue
                if anchor.symbols and not set(anchor.symbols) & touched.get(path, set()):
                    continue
                collector.add(
                    ALARM,
                    "文档",
                    f"提交 {commit.short}",
                    f"改了 {path} 的相关代码，但 Feature 未包含“{requirement.title}”（{requirement.path}），可能漏了牵连",
                )


def check_worktree_sync(
    project: Project,
    anchors: list[tuple[Requirement, CodeAnchor]],
    collector: Collector,
) -> list[str]:
    if not project.is_git():
        return []
    entries = status_entries(project.root)
    changed = [entry.path for entry in entries]
    touched = {
        entry.path: touched_symbols(project, None, entry.path, known_symbols(anchors, entry.path), entry.code)
        for entry in entries
    }
    for requirement, anchor in anchors:
        if requirement.path in changed:
            continue
        for entry in entries:
            if not path_matches(anchor.path, entry.path):
                continue
            if anchor.symbols and not set(anchor.symbols) & touched.get(entry.path, set()):
                continue
            collector.add(
                ALARM,
                "文档",
                "工作区",
                f"未提交改动改了 {entry.path}，但 {requirement.path} 没改，可能漏了牵连或文档",
            )
    return changed


def check_undescribed(
    project: Project,
    history: list[Commit],
    worktree_changed: list[str],
    collector: Collector,
) -> None:
    if not project.rules_text:
        return
    patterns = no_description_patterns(project)

    def undescribed(paths: list[str], anchors: list[tuple[Requirement, CodeAnchor]]) -> list[str]:
        return sorted(
            {
                path
                for path in paths
                if is_code(path)
                and not skipped(path, patterns)
                and not any(path_matches(anchor.path, path) for _, anchor in anchors)
            }
        )

    for commit in history:
        anchors = [(requirement, anchor) for requirement in commit_requirements(project, commit) for anchor in requirement.code]
        paths = undescribed(changed_files(project.root, commit.hash), anchors)
        if paths:
            sample = "、".join(paths[:3])
            collector.add(
                HINT,
                "文档",
                f"提交 {commit.short}",
                f"改了 {len(paths)} 个没有需求描述的代码文件，例如 {sample}",
            )
    anchors = [(requirement, anchor) for requirement in project.requirements for anchor in requirement.code]
    paths = undescribed(worktree_changed, anchors)
    if paths:
        sample = "、".join(paths[:3])
        collector.add(
            HINT,
            "文档",
            "工作区",
            f"改了 {len(paths)} 个没有需求描述的代码文件，例如 {sample}",
        )


def integrated_commits(history: list[Commit]) -> list[Commit]:
    oldest: int | None = None
    for index, commit in enumerate(history):
        if commit.trailer("Feature"):
            oldest = index
    return history[: oldest + 1] if oldest is not None else []


def check_commit_format(history: list[Commit], collector: Collector) -> None:
    for commit in history:
        missing = [field for field in FORMAT_FIELDS if not commit.trailer(field)]
        if missing:
            collector.add(ALARM, "提交", f"提交 {commit.short}", f"缺少 trailer：{', '.join(missing)}")
        if PREFIX.match(commit.subject):
            collector.add(ALARM, "提交", f"提交 {commit.short}", f"第一行带类型前缀：{commit.subject}")
        if MILESTONE.search(commit.subject) or CYCLE.search(commit.subject):
            collector.add(ALARM, "提交", f"提交 {commit.short}", f"第一行带内部编号：{commit.subject}")
        if SHORT_HASH.search(commit.subject):
            collector.add(ALARM, "提交", f"提交 {commit.short}", f"第一行带 hash：{commit.subject}")


def check_blacklist(project: Project, history: list[Commit], collector: Collector) -> None:
    for finding in blacklist.scan_documents(project):
        collector.add(finding.level, "黑词", finding.location, finding.message)
    for commit in history:
        message = "\n".join(part for part in (commit.subject, commit.body) if part)
        for finding in blacklist.scan_commit(commit.short, message):
            collector.add(finding.level, "黑词", finding.location, finding.message)


def check_map(project: Project, collector: Collector) -> None:
    if not project.rules_text:
        collector.add(HINT, "地图", "RULES.md", "项目还没接入 Hypo-Workflow（没有 RULES.md）")
        check_links(project, collector)
        return
    if not project.document_map:
        collector.add(ALARM, "地图", "RULES.md", "没有“## 文档地图”一节")
        check_links(project, collector)
        return
    for entry in project.document_map:
        if not entry.exists(project.root):
            collector.add(ALARM, "地图", entry.where, "地图路径不存在")

    for path in project.markdown_files:
        rel = path.relative_to(project.root).as_posix()
        if PurePosixPath(rel).name in ALLOWED_MARKDOWN or project.mapped(rel):
            continue
        collector.add(HINT, "地图", rel, "地图之外的记录类 Markdown")

    check_links(project, collector)


def check_links(project: Project, collector: Collector) -> None:
    paths = project.document_markdown(include_literal=True, include_root_agents=True)
    rels = [path.relative_to(project.root).as_posix() for path in paths]
    ignored = ignored_paths(project.root, rels) if project.is_git() else set()
    for path, rel in zip(paths, rels):
        if rel in ignored:
            continue
        lines = blacklist.mask_code(path.read_text(encoding="utf-8"))
        for number, line in enumerate(lines, start=1):
            for match in LINK.finditer(line):
                target = match.group(1).strip()
                if target.startswith("<") and target.endswith(">"):
                    target = target[1:-1]
                target = target.split('"', 1)[0].strip()
                decoded = unquote(target)
                if not decoded or decoded.startswith(
                    ("#", "http://", "https://", "mailto:", "tel:", "data:", "javascript:", "/")
                ):
                    continue
                if any(char in decoded for char in "<>{}"):
                    continue
                clean = decoded.split("#", 1)[0].split("?", 1)[0]
                if clean and not (path.parent / clean).exists():
                    collector.add(ALARM, "地图", f"{rel}:{number}", f"链接失效：{target}")


def check_readme(project: Project, collector: Collector) -> None:
    path = project.root / "README.md"
    if not path.is_file():
        return
    seen: set[str] = set()
    for number, line in enumerate(blacklist.mask_code(path.read_text(encoding="utf-8")), start=1):
        for label, pattern in README_RULES:
            if label in seen:
                continue
            if pattern.search(line):
                seen.add(label)
                collector.add(HINT, "README", f"README.md:{number}", f"出现{label}：{line.strip()}")


def check_board(project: Project, collector: Collector) -> None:
    path = project.root / "BOARD.md"
    if not path.is_file():
        return
    board = parse_board(path)
    changed = status_paths(project.root) if project.is_git() else []
    now = datetime.now()

    for message in board.messages:
        if message.to_user:
            continue
        lane = board.lane_for(message.recipient)
        if lane and lane.updated and message.at < lane.updated:
            collector.add(
                HINT,
                "BOARD",
                "BOARD.md",
                f"给 {message.recipient} 的留言可能没处理：该道更新于 {lane.updated:%Y-%m-%d %H:%M}，晚于留言 {message.at:%m-%d %H:%M}",
            )

    for lane in board.lanes:
        if not lane.updated:
            continue
        clean = all(not any(path_matches(item, path) for path in changed) for item in lane.uncommitted)
        if now - lane.updated > timedelta(days=7) and clean:
            collector.add(
                HINT,
                "BOARD",
                "BOARD.md",
                f"{lane.name} 超过 7 天没更新，未提交文件也不在 git status 中",
            )

    text = path.read_text(encoding="utf-8")
    for number, line in enumerate(text.splitlines(), start=1):
        if re.match(r"^\s*(?:#{1,6}\s+|[-*+]\s+)已完成(?:[:：\s]|$)", line):
            collector.add(HINT, "BOARD", f"BOARD.md:{number}", "出现“已完成”列表")
            break
    if board.line_count > 80:
        collector.add(HINT, "BOARD", "BOARD.md", f"超过 80 行（{board.line_count} 行）")


def check_sensitive(project: Project, collector: Collector) -> None:
    if not project.is_git():
        return
    for path in tracked_files(project.root):
        base = PurePosixPath(path).name
        lower = base.lower()
        if (
            (lower.startswith(".env") and lower not in (".env.example", ".env.sample", ".env.template"))
            or lower.endswith(".pem")
            or (lower.startswith("id_rsa") and not lower.endswith(".pub"))
            or "credentials" in lower
            or "secret" in lower
        ):
            collector.add(ALARM, "敏感", base, "敏感文件被 git 跟踪")


def run_checks(project: Project, since: str | None, collector: Collector) -> None:
    history = commits(project.root, limit=None) if project.is_git() else []
    integrated = integrated_commits(history)
    if history and not integrated:
        collector.add(HINT, "提交", "最近提交", "最近提交没有使用 Hypo-Workflow 提交格式")
    if since:
        selected = {commit.hash for commit in commits(project.root, since=since)}
        integrated = [commit for commit in integrated if commit.hash in selected]
    else:
        integrated = integrated[:10]
    anchors = check_anchors(project, collector)
    check_commit_sync(project, integrated, collector)
    changed = check_worktree_sync(project, anchors, collector)
    check_undescribed(project, integrated, changed, collector)
    check_commit_format(integrated, collector)
    check_blacklist(project, integrated, collector)
    check_map(project, collector)
    check_readme(project, collector)
    check_board(project, collector)
    check_sensitive(project, collector)


def run(project: Project, since: str | None = None, as_json: bool = False) -> int:
    collector = Collector()
    try:
        run_checks(project, since, collector)
    except GitError as error:
        print(f"git 读取失败：{error}")
        return 2
    except SyntaxError as error:
        print(f"符号解析失败：{error.filename}:{error.lineno}: {error.msg}")
        return 2

    if as_json:
        print_json(
            {
                "root": str(project.root),
                "alarms": [issue.to_dict() for issue in collector.alarms],
                "hints": [issue.to_dict() for issue in collector.hints],
                "counts": {"alarms": len(collector.alarms), "hints": len(collector.hints)},
            }
        )
    else:
        print("报警")
        if collector.alarms:
            for issue in collector.alarms:
                print(f"[{issue.category}] {issue.location}: {issue.message}")
        else:
            print("（无）")
        print("提示")
        if collector.hints:
            for issue in collector.hints:
                print(f"[{issue.category}] {issue.location}: {issue.message}")
        else:
            print("（无）")
        print(f"共 {len(collector.alarms)} 条报警、{len(collector.hints)} 条提示。")
    return 1 if collector.alarms else 0
