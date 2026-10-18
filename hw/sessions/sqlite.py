from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from itertools import groupby
from pathlib import Path

from . import (
    Session,
    clean_text,
    file_mtime,
    matches_cwd,
    pair_turns,
    parse_time,
    reading,
    user_text,
)


def find_opencode(home: Path, target: str) -> Session | None:
    root = home / '.local' / 'share' / 'opencode'
    candidates: list[Session] = []
    for path in sorted(root.glob('*.db')):
        with reading(path):
            candidate = sqlite_candidate(path, target)
        if candidate is not None:
            candidates.append(candidate)
    return max(candidates, key=lambda item: item.updated) if candidates else None


def find_zcode(home: Path, target: str) -> Session | None:
    path = home / '.zcode' / 'cli' / 'db' / 'db.sqlite'
    if not path.is_file():
        return None
    with reading(path):
        return sqlite_candidate(path, target, host='zcode')


def sqlite_candidate(path: Path, target: str, host: str = 'opencode') -> Session | None:
    connection = sqlite3.connect(f'{path.as_uri()}?mode=ro', uri=True)
    try:
        rows = connection.execute(
            "SELECT id, directory, time_created, time_updated FROM session "
            "WHERE parent_id IS NULL OR parent_id = '' ORDER BY time_updated DESC"
        )
        for session_id, directory, created, updated in rows:
            if matches_cwd(directory, target):
                return parse_session(path, connection, session_id, directory, created, updated, host)
        return None
    finally:
        connection.close()


def parse_session(
    path: Path,
    connection: sqlite3.Connection,
    session_id: str,
    cwd: str,
    created: int,
    updated: int,
    host: str = 'opencode',
) -> Session:
    rows = connection.execute(
        "SELECT m.id, m.data, m.time_created, p.data "
        "FROM message m JOIN part p ON p.message_id = m.id "
        "WHERE m.session_id = ? ORDER BY m.time_created, m.id, p.time_created, p.id",
        (session_id,),
    )
    events: list[tuple[str, datetime | None, str, str]] = []
    model = ''
    for _, group in groupby(rows, key=lambda row: row[0]):
        parts = list(group)
        message = json.loads(parts[0][1])
        when = parse_time(parts[0][2])
        role = message['role']
        chunks = [json.loads(row[3]) for row in parts]
        text = clean_text('\n'.join(part['text'] for part in chunks if part['type'] == 'text' and not part.get('synthetic')))
        if role == 'user':
            events.append(('user', when, user_text(text), ''))
        elif role == 'assistant':
            model = message.get('modelID') or message.get('model', {}).get('modelID') or model
            if text:
                events.append(('assistant', when, text, 'final'))
    return Session(
        host=host,
        path=path,
        cwd=cwd,
        started=parse_time(created) or file_mtime(path),
        updated=parse_time(updated) or file_mtime(path),
        model=model,
        turns=pair_turns(events),
    )
