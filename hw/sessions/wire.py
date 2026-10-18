from __future__ import annotations

from datetime import datetime
from pathlib import Path

from . import (
    EPOCH,
    Failure,
    ParseError,
    Session,
    clean_text,
    file_mtime,
    json_lines,
    later,
    matches_cwd,
    pair_turns,
    parse_time,
    read_index,
    read_json,
    user_text,
)


def find_vspi(home: Path, target: str) -> Session | Failure | None:
    root = home / ".vspi"
    if not root.is_dir():
        return None
    candidates: list[tuple[datetime | None, Path, str, dict]] = []
    workspaces = read_json(root / "workspaces.json")
    entries = workspaces.get("workspaces", {}) if isinstance(workspaces, dict) else {}
    if not isinstance(entries, dict):
        entries = {}
    for workspace_id, info in entries.items():
        if not isinstance(info, dict):
            continue
        workspace_root = str(info.get("root") or "")
        if not (matches_cwd(workspace_root, target) or matches_cwd(target, workspace_root)):
            continue
        for state_path in (root / "sessions" / str(workspace_id)).glob("session_*/state.json"):
            state = read_json(state_path)
            if not isinstance(state, dict):
                continue
            candidate = _state_candidate(state_path.parent, workspace_root, target, state)
            if candidate is not None:
                candidates.append(candidate)

    known = {directory for _, directory, _, _ in candidates}
    try:
        index = read_index(root / "session_index.jsonl")
    except ParseError:
        index = {}
    for record in index.values():
        workdir = str(record.get("workDir") or "")
        if not matches_cwd(workdir, target):
            continue
        session_dir = Path(str(record.get("sessionDir") or ""))
        if session_dir in known:
            continue
        candidate = _state_candidate(session_dir, workdir, target)
        if candidate is not None:
            candidates.append(candidate)
    return _parse_selected("vspi", candidates)


def find_kimi(home: Path, target: str) -> Session | Failure | None:
    root = home / ".kimi-code"
    index_path = root / "session_index.jsonl"
    if not index_path.is_file():
        return None
    try:
        index = read_index(index_path)
    except ParseError as error:
        return Failure("kimi", error.path or index_path, str(error), file_mtime(index_path))

    candidates: list[tuple[datetime | None, Path, str, dict]] = []
    for record in index.values():
        workdir = str(record.get("workDir") or "")
        if not matches_cwd(workdir, target):
            continue
        candidate = _state_candidate(Path(str(record.get("sessionDir") or "")), workdir, target)
        if candidate is not None:
            candidates.append(candidate)
    return _parse_selected("kimi", candidates)


def _state_candidate(
    session_dir: Path,
    workdir: str,
    target: str,
    state: dict | None = None,
) -> tuple[datetime | None, Path, str, dict] | None:
    state_path = session_dir / "state.json"
    if state is None:
        loaded = read_json(state_path)
        state = loaded if isinstance(loaded, dict) else {}
    cwd = str(state.get("cwd") or workdir)
    if not matches_cwd(cwd, target):
        return None
    wire = session_dir / "agents" / "main" / "wire.jsonl"
    updated = parse_time(state.get("updatedAt")) or file_mtime(state_path) or file_mtime(wire)
    return updated, session_dir, cwd, state


def _parse_selected(
    host: str,
    candidates: list[tuple[datetime | None, Path, str, dict]],
) -> Session | Failure | None:
    if not candidates:
        return None
    updated, session_dir, cwd, state = max(candidates, key=lambda item: item[0] or EPOCH)
    wire = session_dir / "agents" / "main" / "wire.jsonl"
    try:
        return _parse_wire(
            host,
            wire,
            cwd,
            parse_time(state.get("createdAt")),
            parse_time(state.get("updatedAt")) or updated,
        )
    except ParseError as error:
        return Failure(host, error.path or wire, str(error), updated)


def _parse_wire(
    host: str,
    path: Path,
    cwd: str,
    started: datetime | None = None,
    updated: datetime | None = None,
) -> Session:
    events: list[tuple[str, datetime | None, str, str]] = []
    replies: list[tuple[int, datetime | None, str]] = []
    user: tuple[datetime | None, str] | None = None
    model = ""
    last: datetime | None = None

    def flush() -> None:
        nonlocal user, replies
        if user is None:
            replies = []
            return
        events.append(("user", user[0], user[1], ""))
        if replies:
            final_step = max(step for step, _, _ in replies)
            chunks = [(when, text) for step, when, text in replies if step == final_step]
            events.append(("assistant", chunks[-1][0], "\n\n".join(text for _, text in chunks), "final"))
        user = None
        replies = []

    for record in json_lines(path):
        kind = record.get("type")
        when = parse_time(record.get("time"))
        if when is not None:
            last = later(last, when)

        if kind == "llm.request":
            model = model or str(record.get("modelAlias") or record.get("model") or "")
        elif kind == "turn.prompt":
            flush()
            if record.get("agentId") not in (None, "main"):
                continue
            origin = record.get("origin") or {}
            if isinstance(origin, dict) and origin.get("kind") not in (None, "user"):
                continue
            text = user_text(record.get("input"))
            if text:
                user = (when, text)
        elif kind == "context.append_loop_event":
            event = record.get("event") or {}
            if not isinstance(event, dict) or event.get("type") != "content.part":
                continue
            part = event.get("part") or {}
            if not isinstance(part, dict) or part.get("type") != "text":
                continue
            text = clean_text(part.get("text"))
            if text and user is not None:
                step = event.get("step")
                replies.append((step if isinstance(step, int) else 0, when, text))
    flush()

    return Session(
        host=host,
        path=path,
        cwd=cwd,
        started=started or file_mtime(path),
        updated=later(updated, last) or file_mtime(path),
        model=model,
        turns=pair_turns(events),
    )
