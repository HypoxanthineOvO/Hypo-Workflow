from __future__ import annotations

from datetime import datetime
from pathlib import Path

from . import (
    Failure,
    ParseError,
    Session,
    clean_text,
    file_mtime,
    file_mtime_key,
    join_content,
    json_lines,
    matches_cwd,
    pair_turns,
    parse_time,
    user_text,
)


def find(home: Path, target: str) -> Session | Failure | None:
    root = home / ".claude" / "projects"
    if not root.is_dir():
        return None
    for path in sorted(root.rglob("*.jsonl"), key=file_mtime_key, reverse=True):
        try:
            cwd = _first_cwd(path)
        except ParseError:
            continue
        if not cwd or not matches_cwd(cwd, target):
            continue
        try:
            return _parse(path, cwd)
        except ParseError as error:
            return Failure("claude", path, str(error), file_mtime(path))
    return None


def _first_cwd(path: Path) -> str:
    for record in json_lines(path):
        cwd = record.get("cwd")
        if isinstance(cwd, str) and cwd:
            return cwd
    return ""


def _parse(path: Path, cwd: str) -> Session:
    events: list[tuple[str, datetime | None, str, str]] = []
    model = ""
    started: datetime | None = None
    last: datetime | None = None

    for record in json_lines(path):
        kind = record.get("type")
        when = parse_time(record.get("timestamp"))
        if when is not None:
            started = started or when
            last = when
        candidate_cwd = record.get("cwd")
        if isinstance(candidate_cwd, str) and candidate_cwd:
            cwd = candidate_cwd

        if kind == "user":
            if record.get("isSidechain") or record.get("isMeta"):
                continue
            message = record.get("message") or {}
            text = user_text(message.get("content")) if isinstance(message, dict) else ""
            if text:
                events.append(("user", when, text, ""))
        elif kind == "assistant":
            if record.get("isSidechain") or record.get("isApiErrorMessage"):
                continue
            message = record.get("message") or {}
            if not isinstance(message, dict):
                continue
            candidate = message.get("model")
            if isinstance(candidate, str) and candidate and candidate != "<synthetic>":
                model = model or candidate
            text = clean_text(join_content(message.get("content")))
            if text:
                events.append(("assistant", when, text, ""))

    return Session(
        host="claude",
        path=path,
        cwd=cwd,
        started=started or file_mtime(path),
        updated=last or file_mtime(path),
        model=model,
        turns=pair_turns(events),
    )
