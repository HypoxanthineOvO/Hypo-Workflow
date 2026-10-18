from __future__ import annotations

from datetime import datetime
from pathlib import Path

from . import (
    EPOCH,
    Session,
    Turn,
    clean_text,
    file_mtime,
    json_lines,
    later,
    matches_cwd,
    parse_time,
    read_index,
    read_json,
    reading,
    user_text,
)


def find_vspi(home: Path, target: str) -> Session | None:
    root = home / ".vspi"
    if not root.is_dir():
        return None
    candidates: list[tuple[datetime | None, Path, str, dict]] = []
    workspaces_path = root / "workspaces.json"
    workspaces = read_json(workspaces_path) if workspaces_path.is_file() else {}
    entries = workspaces.get("workspaces", {})
    for workspace_id, info in entries.items():
        workspace_root = str(info.get("root") or "")
        if not (matches_cwd(workspace_root, target) or matches_cwd(target, workspace_root)):
            continue
        for state_path in (root / "sessions" / str(workspace_id)).glob("session_*/state.json"):
            state = read_json(state_path)
            candidate = _state_candidate(state_path.parent, workspace_root, target, state)
            if candidate is not None:
                candidates.append(candidate)

    known = {directory for _, directory, _, _ in candidates}
    index = read_index(root / "session_index.jsonl")
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


def find_kimi(home: Path, target: str) -> Session | None:
    root = home / ".kimi-code"
    index_path = root / "session_index.jsonl"
    if not index_path.is_file():
        return None
    candidates: list[tuple[datetime | None, Path, str, dict]] = []
    for record in read_index(index_path).values():
        workdir = str(record.get("workDir") or "")
        if not matches_cwd(workdir, target):
            continue
        session_dir = Path(str(record.get("sessionDir") or ""))
        candidate = _state_candidate(session_dir, workdir, target)
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
        state = read_json(state_path)
    cwd = str(state.get("cwd") or workdir)
    if not matches_cwd(cwd, target):
        return None
    with reading(state_path):
        updated = parse_time(state.get("updatedAt")) or file_mtime(state_path)
    return updated, session_dir, cwd, state


def _parse_selected(
    host: str,
    candidates: list[tuple[datetime | None, Path, str, dict]],
) -> Session | None:
    if not candidates:
        return None
    updated, session_dir, cwd, state = max(candidates, key=lambda item: item[0] or EPOCH)
    wire = session_dir / "agents" / "main" / "wire.jsonl"
    with reading(wire):
        return _parse_wire(
            wire,
            cwd,
            parse_time(state.get("createdAt")),
            parse_time(state.get("updatedAt")) or updated,
            host,
        )


def _parse_wire(
    path: Path,
    cwd: str,
    started: datetime | None = None,
    updated: datetime | None = None,
    host: str = "vspi",
) -> Session:
    turns: list[Turn] = []
    replies: list[tuple[int, datetime | None, str]] = []
    user: tuple[datetime | None, str] | None = None
    model = ""
    last: datetime | None = None

    def flush() -> None:
        nonlocal user, replies
        if user is None:
            replies = []
            return
        turns.append(Turn("user", user[1], user[0]))
        if replies:
            final_step = max(step for step, _, _ in replies)
            chunks = [(when, text) for step, when, text in replies if step == final_step]
            turns.append(Turn("assistant", "\n\n".join(text for _, text in chunks), chunks[-1][0]))
        user = None
        replies = []

    for record in json_lines(path):
        if record.get("agentId") not in (None, "main"):
            continue
        kind = record.get("type")
        when = parse_time(record.get("time"))
        if when is not None:
            last = later(last, when)

        if kind == "llm.request":
            model = model or str(record.get("modelAlias") or record.get("model") or "")
        elif kind == "turn.prompt":
            flush()
            origin = record.get("origin", {})
            if origin.get("kind") not in (None, "user"):
                continue
            text = user_text(record.get("input"))
            if text:
                user = (when, text)
        elif kind == "context.append_loop_event":
            event = record["event"]
            if event.get("type") != "content.part":
                continue
            part = event["part"]
            if part.get("type") != "text":
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
        turns=turns,
    )
