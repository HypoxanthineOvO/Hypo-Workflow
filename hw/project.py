from __future__ import annotations

import os
import re
from collections.abc import Iterator
from dataclasses import dataclass
from fnmatch import fnmatch
from functools import cached_property
from pathlib import Path, PurePosixPath

from .git import GitError, file_text, git, tracked_files, worktree_files

SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "__pycache__", "build", "dist"}
ARCHIVE_DIRS = {"archive", "archived", "归档", "旧记录"}
SOURCE_DIRS = ARCHIVE_DIRS | {"sources"}
SKIP_PARTITION_WORDS = ("原样保存", "不再更新", "原件", "不修改")
PLACEHOLDER = re.compile(r"<[^>/]+>")
SEPARATOR = re.compile(r":?-{3,}:?$")
HEADING = re.compile(r"^##\s+(.+?)\s*$")
FENCE = re.compile(r"^\s*(?:```|~~~)")
WORKFLOW_FILES = {"STATUS.md", "BOARD.md", "RULES.md", "AGENTS.md", "CLAUDE.md"}


def find_root(start: Path | None = None) -> Path | None:
    current = (start or Path.cwd()).resolve()
    for candidate in (current, *current.parents):
        if (candidate / "RULES.md").is_file() or (candidate / ".git").exists():
            return candidate
    return None


def relative(root: Path, path: Path) -> str:
    return path.relative_to(root).as_posix()


def skip_directory(name: str) -> bool:
    return name in SKIP_DIRS | ARCHIVE_DIRS or name.startswith(".")


def iter_markdown(root: Path) -> Iterator[Path]:
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(name for name in dirnames if not skip_directory(name))
        for name in sorted(filenames):
            if name.endswith(".md"):
                yield Path(dirpath) / name


def split_sections(text: str) -> list[tuple[str, str]]:
    sections: list[tuple[str, str]] = []
    heading = ""
    lines: list[str] = []
    fenced = False
    for line in text.splitlines():
        if FENCE.match(line):
            fenced = not fenced
            if heading:
                lines.append(line)
            continue
        match = None if fenced else HEADING.match(line)
        if match:
            sections.append((heading, "\n".join(lines).strip()))
            heading = match.group(1)
            lines = []
        elif heading:
            lines.append(line)
    if heading:
        sections.append((heading, "\n".join(lines).strip()))
    return sections


def section_map(text: str) -> dict[str, str]:
    result: dict[str, str] = {}
    for heading, body in split_sections(text):
        if not heading:
            continue
        result[heading] = f"{result[heading]}\n{body}".strip() if heading in result else body
    return result


def first_heading(text: str) -> str:
    pattern = re.compile(r"^#\s+(.+?)\s*$")
    fenced = False
    for line in text.splitlines():
        if FENCE.match(line):
            fenced = not fenced
            continue
        if not fenced:
            match = pattern.match(line)
            if match:
                return match.group(1)
    return ""


def has_heading(text: str, target: str) -> bool:
    fenced = False
    for line in text.splitlines():
        if FENCE.match(line):
            fenced = not fenced
            continue
        if not fenced and re.match(rf"^##\s+{re.escape(target)}\s*$", line):
            return True
    return False


def first_paragraph(body: str) -> str:
    lines: list[str] = []
    for raw in body.splitlines():
        line = raw.strip()
        if not line:
            if lines:
                break
            continue
        lines.append(re.sub(r"^[-*+]\s+", "", line))
    return " ".join(lines)


@dataclass(frozen=True)
class MapEntry:
    what: str
    where: str
    how: str

    @property
    def pattern(self) -> str:
        return PLACEHOLDER.sub("*", self.where.strip().strip("`"))

    @property
    def base(self) -> str:
        pattern = self.pattern
        if "*" not in pattern:
            if pattern.endswith("/"):
                return pattern.rstrip("/")
            return str(PurePosixPath(pattern).parent) if PurePosixPath(pattern).suffix else pattern.rstrip("/")
        parts = pattern.rstrip("/").split("/")
        while parts and "*" in parts[-1]:
            parts.pop()
        return "/".join(parts)

    @property
    def looks_like_directory(self) -> bool:
        return self.where.rstrip().endswith("/") or bool(PLACEHOLDER.search(self.where))

    def exists(self, root: Path) -> bool:
        pattern = self.pattern
        if "*" in pattern:
            return (root / self.base).exists()
        return (root / pattern).exists()

    def file_count(self, root: Path) -> int:
        pattern = self.pattern
        if "*" in pattern:
            if pattern.endswith("/"):
                return count_files(root / self.base)
            return sum(1 for path in root.glob(pattern) if path.is_file())
        target = root / pattern
        return count_files(target) if target.is_dir() else int(target.is_file())

    def agents_file(self, root: Path) -> Path | None:
        target = root / self.pattern
        if not self.looks_like_directory and not target.is_dir():
            return None
        return root / self.base / "AGENTS.md"


def count_files(path: Path) -> int:
    if not path.is_dir():
        return 0
    return sum(1 for item in path.rglob("*") if item.is_file() and ".git" not in item.parts)


def parse_document_map(text: str) -> list[MapEntry]:
    for heading, body in split_sections(text):
        if heading != "文档地图":
            continue
        entries: list[MapEntry] = []
        in_table = False
        for line in body.splitlines():
            line = line.strip()
            if not line.startswith("|"):
                if in_table and entries:
                    break
                continue
            cells = [cell.strip() for cell in line.strip("|").split("|")]
            if len(cells) < 3:
                continue
            if cells[0] == "放什么" or all(SEPARATOR.match(cell) for cell in cells):
                in_table = True
                continue
            in_table = True
            entries.append(MapEntry(cells[0], cells[1].strip("`"), cells[2]))
        return entries
    return []


@dataclass(frozen=True)
class CodeAnchor:
    path: str
    symbols: tuple[str, ...] = ()


@dataclass
class Requirement:
    path: str
    title: str
    sections: dict[str, str]

    @property
    def stem(self) -> str:
        return PurePosixPath(self.path).stem

    @property
    def filename(self) -> str:
        return PurePosixPath(self.path).name

    @property
    def names(self) -> set[str]:
        names = {self.path, self.path[:-3], self.title}
        if self.filename == "README.md":
            names.add(PurePosixPath(self.path).parent.name)
        else:
            names.update((self.stem, self.filename))
        return names - {""}

    @property
    def now(self) -> str:
        return first_paragraph(self.sections.get("现在", ""))

    @property
    def relations(self) -> list[str]:
        body = self.sections.get("牵连", "")
        return split_items(body)

    @property
    def code(self) -> list[CodeAnchor]:
        anchors: list[CodeAnchor] = []
        for line in self.sections.get("代码", "").splitlines():
            item = clean_item(line).replace("`", "")
            if not item or item.startswith(("（", "(", "|", "...", "…")):
                continue
            if item in ("无", "（无）", "-", "——"):
                continue
            item = re.sub(r"\s*[（(][^）)]*[）)]\s*$", "", item)
            path, _, rest = item.partition(":")
            if "：" in path:
                path, _, rest = item.partition("：")
            symbols = tuple(
                symbol.strip()
                for symbol in re.split(r"[,，、]", rest)
                if symbol.strip()
            )
            path = path.strip().strip("`")
            if path:
                anchors.append(CodeAnchor(path, symbols))
        return anchors

    @property
    def tests(self) -> list[str]:
        return split_items(self.sections.get("测试", ""))

    @property
    def undecided(self) -> list[str]:
        return split_items(self.sections.get("未定", ""))

    def to_dict(self) -> dict:
        return {
            "path": self.path,
            "title": self.title,
            "now": self.now,
            "relations": self.relations,
            "code": [
                {"path": anchor.path, "symbols": list(anchor.symbols)}
                for anchor in self.code
            ],
            "tests": self.tests,
            "undecided": self.undecided,
        }


def clean_item(line: str) -> str:
    return re.sub(r"^[-*+]\s+", "", line.strip()).strip()


def split_items(body: str) -> list[str]:
    items: list[str] = []
    for raw in body.splitlines():
        line = clean_item(raw)
        if not line:
            continue
        for part in re.split(r"[、，,；;]", line):
            part = part.strip()
            if part:
                items.append(part)
    return items


def parse_requirement(root: Path, path: Path, text: str) -> Requirement:
    return Requirement(
        path=relative(root, path),
        title=first_heading(text) or path.stem,
        sections=section_map(text),
    )


def feature_tokens(value: str) -> list[str]:
    return [token.strip().strip("`") for token in re.split(r"[,，、;；|]", value) if token.strip()]


def requirement_matches_feature(requirement: Requirement, value: str) -> bool:
    names = {name.casefold() for name in requirement.names}
    return any(token.casefold() in names for token in feature_tokens(value))


def path_matches(anchor: str, path: str) -> bool:
    anchor = anchor.strip().strip("`").removeprefix("./")
    path = path.removeprefix("./")
    if not anchor or not path:
        return False
    if any(char in anchor for char in "*?["):
        return fnmatch(path, anchor)
    return anchor == path


class Project:
    def __init__(self, root: Path | None = None, rev: str | None = None):
        self.root = root or find_root() or Path.cwd().resolve()
        self.rev = rev

    def read_text(self, rel: str) -> str:
        if self.rev is not None:
            return file_text(self.root, self.rev, rel)
        path = self.root / rel
        return path.read_text(encoding="utf-8") if path.is_file() else ""

    @cached_property
    def rules_text(self) -> str:
        return self.read_text("RULES.md")

    @cached_property
    def document_map(self) -> list[MapEntry]:
        return parse_document_map(self.rules_text)

    @cached_property
    def map_directories(self) -> list[str]:
        directories: list[str] = []
        for entry in self.document_map:
            if not entry.looks_like_directory:
                if (self.root / entry.pattern).is_dir():
                    directories.append(entry.pattern.rstrip("/"))
                continue
            base = entry.base
            if base and (self.root / base).is_dir():
                directories.append(base)
        return list(dict.fromkeys(directories))

    @cached_property
    def markdown_files(self) -> list[Path]:
        if self.rev is not None:
            paths = tracked_files(self.root, self.rev)
        elif self.is_git():
            paths = sorted(worktree_files(self.root))
        else:
            return list(iter_markdown(self.root))
        return [
            self.root / path for path in paths
            if path.endswith(".md")
            and not any(skip_directory(part) for part in PurePosixPath(path).parts[:-1])
        ]

    @cached_property
    def requirements(self) -> list[Requirement]:
        result: list[Requirement] = []
        for path in self.markdown_files:
            rel = relative(self.root, path)
            if self.partition_skipped(rel) or rel.startswith(("templates/", "skills/")):
                continue
            text = self.read_text(rel)
            named = PurePosixPath(rel).name
            if named in WORKFLOW_FILES:
                continue
            if has_heading(text, "现在") or has_heading(text, "代码") or (named == "README.md" and "/" in rel and self.mapped(rel)):
                result.append(parse_requirement(self.root, path, text))
        return result

    def is_git(self) -> bool:
        try:
            git(self.root, "rev-parse", "--git-dir")
            return True
        except GitError:
            return False

    def mapped(self, rel: str) -> bool:
        return any(self._entry_contains(entry, rel) for entry in self.document_map)

    def _entry_contains(self, entry: MapEntry, rel: str) -> bool:
        pattern = entry.pattern
        if "*" in pattern:
            return (
                rel == pattern
                or fnmatch(rel, pattern)
                or rel == entry.base
                or rel.startswith(entry.base + "/")
            )
        if entry.looks_like_directory or (self.root / pattern).is_dir():
            return rel == entry.base or rel.startswith(entry.base + "/")
        return rel == pattern

    def partition_skipped(self, rel: str) -> bool:
        if any(part in SOURCE_DIRS for part in PurePosixPath(rel).parts):
            return True
        for entry in self.document_map:
            text = f"{entry.what} {entry.how}"
            if any(word in text for word in SKIP_PARTITION_WORDS) and self._entry_contains(entry, rel):
                return True
        return False

    def document_markdown(self, include_literal: bool = True, include_root_agents: bool = False) -> list[Path]:
        selected: dict[str, Path] = {}
        for name in ("README.md", "STATUS.md", "BOARD.md", "RULES.md"):
            path = self.root / name
            if path.is_file():
                selected[name] = path
        if include_root_agents and (self.root / "AGENTS.md").is_file():
            selected["AGENTS.md"] = self.root / "AGENTS.md"
        for requirement in self.requirements:
            selected.setdefault(requirement.path, self.root / requirement.path)
        directories = self.map_directories
        for path in self.markdown_files:
            rel = relative(self.root, path)
            under_map = any(rel == directory or rel.startswith(directory + "/") for directory in directories)
            if under_map or (include_literal and self.mapped(rel)):
                selected.setdefault(rel, path)
        return [path for rel, path in sorted(selected.items()) if not self.partition_skipped(rel)]
