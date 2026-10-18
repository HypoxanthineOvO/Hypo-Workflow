from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass
from pathlib import Path


class GitError(RuntimeError):
    pass


def git(root: Path, *args: str) -> str:
    process = subprocess.run(
        ["git", "--no-optional-locks", "-c", "core.quotepath=false", *args],
        cwd=root,
        capture_output=True,
        text=True,
    )
    if process.returncode != 0:
        raise GitError(process.stderr.strip() or f"git {' '.join(args)} 失败")
    return process.stdout


def has_head(root: Path) -> bool:
    try:
        git(root, "rev-parse", "--verify", "HEAD")
        return True
    except GitError:
        return False


@dataclass(frozen=True)
class Commit:
    hash: str
    date: str
    subject: str
    body: str
    trailers: dict[str, str]

    @property
    def short(self) -> str:
        return self.hash[:7]

    def trailer(self, name: str) -> str:
        return self.trailers.get(name.lower(), "")

    def to_dict(self) -> dict:
        return {
            "hash": self.short,
            "date": self.date,
            "subject": self.subject,
            "feature": self.trailer("Feature"),
            "code": self.trailer("Code"),
            "docs": self.trailer("Docs"),
            "verified": self.trailer("Verified"),
        }


def parse_trailers(text: str) -> dict[str, str]:
    trailers: dict[str, str] = {}
    key = ""
    for line in text.strip().splitlines():
        if line.startswith((" ", "\t")) and key:
            trailers[key] = f"{trailers[key]} {line.strip()}".strip()
            continue
        match = re.match(r"^([A-Za-z][A-Za-z0-9-]*)\s*:\s*(.*)$", line)
        if not match:
            continue
        key = match.group(1).lower()
        value = match.group(2).strip()
        trailers[key] = f"{trailers[key]}, {value}" if key in trailers else value
    return trailers


def commits(root: Path, since: str | None = None, limit: int | None = 10) -> list[Commit]:
    if not has_head(root):
        return []
    output = git(
        root,
        "log",
        "--no-merges",
        "--date=short",
        "--format=%H%x00%ad%x00%s%x00%b%x00%(trailers:only,unfold)%x1e",
        *([f"{since}..HEAD"] if since else (["-n", str(limit)] if limit is not None else [])),
    )
    result: list[Commit] = []
    for record in output.split("\x1e"):
        record = record.strip("\n")
        if not record:
            continue
        parts = record.split("\x00")
        if len(parts) < 5:
            continue
        result.append(
            Commit(
                hash=parts[0],
                date=parts[1],
                subject=parts[2],
                body=parts[3],
                trailers=parse_trailers(parts[4]),
            )
        )
    return result


def changed_files(root: Path, rev: str) -> list[str]:
    output = git(root, "show", "--name-only", "-z", "--format=", "--no-renames", rev)
    return [path for path in output.split("\0") if path]


@dataclass(frozen=True)
class StatusEntry:
    code: str
    path: str


def status_entries(root: Path) -> list[StatusEntry]:
    output = git(root, "status", "--porcelain=v1", "-z", "--untracked-files=all")
    entries: list[StatusEntry] = []
    records = iter(output.rstrip("\0").split("\0")) if output else iter(())
    for line in records:
        path = line[3:]
        entries.append(StatusEntry(line[:2], path))
        if "R" in line[:2] or "C" in line[:2]:
            original = next(records)
            if "R" in line[:2]:
                entries.append(StatusEntry("D ", original))
    return entries


def status_paths(root: Path) -> list[str]:
    return list(dict.fromkeys(entry.path for entry in status_entries(root)))


def tracked_files(root: Path, rev: str | None = None) -> list[str]:
    args = ("ls-tree", "-r", "--name-only", "-z", rev) if rev else ("ls-files", "-z")
    return [path for path in git(root, *args).split("\0") if path]


def ignored_paths(root: Path, paths: list[str]) -> set[str]:
    if not paths:
        return set()
    process = subprocess.run(
        ["git", "-c", "core.quotepath=false", "check-ignore", "--stdin", "-z"],
        cwd=root,
        input="\0".join(paths) + "\0",
        capture_output=True,
        text=True,
    )
    if process.returncode not in (0, 1):
        raise GitError(process.stderr.strip())
    return {path for path in process.stdout.split("\0") if path}


HUNK = re.compile(r"^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@")


@dataclass(frozen=True)
class ChangedLine:
    side: str
    number: int
    text: str


def diff_text(root: Path, rev: str | None, path: str) -> str:
    if rev:
        return git(root, "show", "-U0", "--format=", "--no-renames", rev, "--", path)
    return git(root, "diff", "-U0", "--no-renames", "HEAD", "--", path)


def parse_changed_lines(diff: str) -> list[ChangedLine]:
    result: list[ChangedLine] = []
    old_number = new_number = 0
    in_hunk = False
    for line in diff.splitlines():
        match = HUNK.match(line)
        if match:
            old_number = int(match.group(1))
            new_number = int(match.group(2))
            in_hunk = True
            continue
        if not in_hunk:
            continue
        if line.startswith("+"):
            result.append(ChangedLine("new", new_number, line[1:]))
            new_number += 1
        elif line.startswith("-"):
            result.append(ChangedLine("old", old_number, line[1:]))
            old_number += 1
        elif line.startswith(" "):
            old_number += 1
            new_number += 1
    return result


def changed_lines(root: Path, rev: str | None, path: str) -> list[ChangedLine]:
    return parse_changed_lines(diff_text(root, rev, path))


def parent_revision(root: Path, rev: str) -> str | None:
    revisions = git(root, "rev-list", "--parents", "-n", "1", rev).split()
    return revisions[1] if len(revisions) > 1 else None


def file_text(root: Path, rev: str | None, path: str) -> str:
    if rev is None or not git(root, "ls-tree", rev, "--", path):
        return ""
    return git(root, "show", f"{rev}:{path}")
