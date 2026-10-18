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
    first_record,
    join_content,
    json_lines,
    matches_cwd,
    pair_turns,
    parse_time,
    user_text,
)


def find(home: Path, target: str) -> Session | Failure | None:
    root = home / ".codex" / "sessions"
    if not root.is_dir():
        return None
    for path in sorted(root.rglob("*.jsonl"), key=file_mtime_key, reverse=True):
        record = first_record(path)
        if not record or record.get("type") != "session_meta":
            continue
        payload = record.get("payload") or {}
        cwd = str(payload.get("cwd") or "") if isinstance(payload, dict) else ""
        if not matches_cwd(cwd, target):
            continue
        try:
            return _parse(path, cwd)
        except ParseError as error:
            return Failure("codex", path, str(error), file_mtime(path))
    return None


def _parse(path: Path, cwd: str) -> Session:
    story: list[tuple[datetime | None, str, str, str, str]] = []
    model = ""
    started: datetime | None = None
    last: datetime | None = None

    for record in json_lines(path):
        kind = record.get("type")
        payload = record.get("payload") or {}
        if not isinstance(payload, dict):
            payload = {}
        when = parse_time(record.get("timestamp") or payload.get("timestamp"))
        if when is not None:
            started = started or when
            last = when

        if kind == "session_meta":
            cwd = str(payload.get("cwd") or cwd)
            started = parse_time(payload.get("timestamp")) or started
        elif kind == "turn_context":
            cwd = str(payload.get("cwd") or cwd)
            model = model or str(payload.get("model") or "")
        elif kind == "event_msg" and payload.get("type") == "user_message":
            text = user_text(payload.get("message"))
            if text:
                story.append((when, "user", text, "", "event"))
        elif kind == "response_item" and payload.get("role") == "user":
            text = user_text(payload.get("content"))
            if text:
                story.append((when, "user", text, "", "fallback"))
        elif kind == "response_item" and payload.get("role") == "assistant":
            if payload.get("type") != "message":
                continue
            text = clean_text(join_content(payload.get("content")))
            if text:
                story.append((when, "assistant", text, str(payload.get("phase") or ""), "assistant"))

    if any(item[4] == "event" for item in story):
        story = [item for item in story if item[4] != "fallback"]
    events = [(role, when, text, phase) for when, role, text, phase, _ in story]
    return Session(
        host="codex",
        path=path,
        cwd=cwd,
        started=started or file_mtime(path),
        updated=last or file_mtime(path),
        model=model,
        turns=pair_turns(events),
    )
