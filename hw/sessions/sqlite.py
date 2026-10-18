from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path

from . import (
    EPOCH,
    Failure,
    ParseError,
    Session,
    clean_text,
    file_mtime,
    is_injected,
    later,
    matches_cwd,
    pair_turns,
    parse_time,
)


def find_opencode(home: Path, target: str) -> Session | Failure | None:
    root = home / ".local" / "share" / "opencode"
    if not root.is_dir():
        return None
    return _find_sqlite("opencode", sorted(root.glob("*.db")), target)


def find_zcode(home: Path, target: str) -> Session | Failure | None:
    return _find_sqlite("zcode", [home / ".zcode" / "cli" / "db" / "db.sqlite"], target)


def _find_sqlite(host: str, paths: list[Path], target: str) -> Session | Failure | None:
    best: Session | Failure | None = None
    for path in paths:
        if not path.is_file():
            continue
        try:
            candidate = _sqlite_candidate(host, path, target)
        except ParseError as error:
            candidate = Failure(host, error.path or path, str(error))
        if candidate is None:
            continue
        if best is None or (candidate.updated or EPOCH) > (best.updated or EPOCH):
            best = candidate
    return best


def _sqlite_candidate(host: str, path: Path, target: str) -> Session | None:
    try:
        connection = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)
    except sqlite3.Error as error:
        raise ParseError(f"无法打开数据库：{error}", path) from error
    try:
        tables = {
            str(row[0])
            for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
        }
        if not {"session", "message", "part"} <= tables:
            return None
        rows = connection.execute(
            "SELECT id, directory, time_created, time_updated FROM session "
            "WHERE parent_id IS NULL OR parent_id = '' ORDER BY time_updated DESC"
        ).fetchall()
        for session_id, directory, created, updated in rows:
            if not matches_cwd(str(directory or ""), target):
                continue
            chosen = (
                str(session_id),
                str(directory or ""),
                parse_time(created),
                parse_time(updated),
            )
            return _parse_sqlite(host, path, connection, chosen)
        return None
    except sqlite3.Error as error:
        raise ParseError(f"sqlite 查询失败：{error}", path) from error
    finally:
        connection.close()


def _parse_sqlite(
    host: str,
    path: Path,
    connection: sqlite3.Connection,
    chosen: tuple[str, str, datetime | None, datetime | None],
) -> Session:
    session_id, cwd, started, updated = chosen
    rows = connection.execute(
        "SELECT m.id, m.data, m.time_created, p.data "
        "FROM message m JOIN part p ON p.message_id = m.id "
        "WHERE m.session_id = ? ORDER BY m.time_created, p.time_created",
        (session_id,),
    )

    events: list[tuple[str, datetime | None, str, str]] = []
    model = ""
    last = updated
    user_id: str | None = None
    user_when: datetime | None = None
    user_chunks: list[str] = []
    reply_id: str | None = None
    reply_when: datetime | None = None
    reply_chunks: list[str] = []
    turn_has_user = False

    def flush_user() -> bool:
        nonlocal user_id, user_when, user_chunks
        text = clean_text("\n".join(user_chunks))
        visible = bool(text and not is_injected(text))
        if visible:
            events.append(("user", user_when, text, ""))
        user_id = None
        user_when = None
        user_chunks = []
        return visible

    def flush_reply() -> None:
        nonlocal reply_id, reply_when, reply_chunks
        text = clean_text("\n".join(reply_chunks))
        if text and turn_has_user:
            events.append(("assistant", reply_when, text, "final"))
        reply_id = None
        reply_when = None
        reply_chunks = []

    for message_id, message_data, message_time, part_data in rows:
        when = parse_time(message_time)
        if when is not None:
            last = later(last, when)
        try:
            message = json.loads(message_data) if message_data else {}
            part = json.loads(part_data) if part_data else {}
        except (json.JSONDecodeError, TypeError, ValueError):
            continue
        if not isinstance(message, dict) or not isinstance(part, dict):
            continue
        role = message.get("role")

        if role == "user":
            flush_reply()
            if message_id != user_id:
                flush_user()
                user_id = str(message_id)
                user_when = when
                turn_has_user = False
            if part.get("type") == "text" and not part.get("synthetic"):
                text = part.get("text")
                if isinstance(text, str):
                    user_chunks.append(text)
        elif role == "assistant":
            if user_id is not None:
                turn_has_user = flush_user()
            if message_id != reply_id:
                flush_reply()
                reply_id = str(message_id)
                reply_when = when
            model = model or str(message.get("modelID") or "")
            if not model:
                model_info = message.get("model")
                if isinstance(model_info, dict):
                    model = str(model_info.get("modelID") or "")
            if part.get("type") == "text" and not part.get("synthetic"):
                text = part.get("text")
                if isinstance(text, str):
                    reply_chunks.append(text)
    if user_id is not None:
        turn_has_user = flush_user()
    flush_reply()

    return Session(
        host=host,
        path=path,
        cwd=cwd,
        started=started or file_mtime(path),
        updated=last or file_mtime(path),
        model=model,
        turns=pair_turns(events),
    )
