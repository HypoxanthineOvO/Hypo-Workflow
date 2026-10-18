from __future__ import annotations

import json
import os
import re
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

HOSTS = ("codex", "claude", "vspi", "kimi", "opencode", "zcode", "dsh")
TEXT_LIMIT = 1500

INJECT_PREFIXES = (
    "# AGENTS.md instructions",
    "<environment_context",
    "<user_instructions",
    "<INSTRUCTIONS",
    "<system-reminder",
    "<permissions",
    "<turn_aborted",
    "<user_shell_command",
    "# /hw",
    "Canonical command:",
    "<cron-fire",
    "<notification",
    "<skill-loaded",
    "Caveat:",
    "<command-",
    "<local-command",
    "<task-notification",
    "This session is being continued",
    "Base directory for this skill",
    "<recommended_plugins",
    "<app-context",
    "<external_codex_apps_open_page",
    "<send_user_message_question_reply",
    "<in-app-browser-context",
)

HOST_ROOTS = {
    "codex": Path(".codex"),
    "claude": Path(".claude"),
    "vspi": Path(".vspi"),
    "kimi": Path(".kimi-code"),
    "opencode": Path(".local/share/opencode"),
    "zcode": Path(".zcode"),
    "dsh": Path(".dsh"),
}

EPOCH = datetime.min.replace(tzinfo=timezone.utc)
WINDOWS_DRIVE = re.compile(r"^[A-Za-z]:/")


class ParseError(Exception):
    def __init__(self, message: str, path: Path | None = None):
        super().__init__(message)
        self.path = path


@dataclass(frozen=True)
class Turn:
    role: str
    text: str
    time: datetime | None


@dataclass
class Session:
    host: str
    path: Path
    cwd: str
    started: datetime | None
    updated: datetime | None
    model: str
    turns: list[Turn]


@dataclass
class Failure:
    host: str
    path: Path
    error: str
    updated: datetime | None = None


@dataclass
class Skipped:
    host: str
    reason: str


def normalize_cwd(value: str) -> str:
    text = (value or "").strip().replace("\\", "/")
    if not text:
        return ""
    text = re.sub(r"/+$", "", text) or "/"
    if WINDOWS_DRIVE.match(text):
        return text[0].upper() + text[1:]
    return os.path.realpath(text).replace("\\", "/").rstrip("/") or "/"


def matches_cwd(cwd: str, target: str) -> bool:
    current = normalize_cwd(cwd)
    root = normalize_cwd(target)
    if WINDOWS_DRIVE.match(current):
        current = current.casefold()
    if WINDOWS_DRIVE.match(root):
        root = root.casefold()
    return bool(current) and (current == root or current.startswith(root.rstrip("/") + "/"))


def parse_time(value: object) -> datetime | None:
    def from_number(number: float) -> datetime | None:
        if number > 1e11:
            number /= 1000
        try:
            return datetime.fromtimestamp(number, tz=timezone.utc)
        except (OverflowError, OSError, ValueError):
            return None

    if value is None or value == "":
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return from_number(float(value))
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            return from_number(float(text))
        except ValueError:
            pass
        try:
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            return None
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    return None


def file_mtime(path: Path) -> datetime | None:
    try:
        return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
    except OSError:
        return None


def file_mtime_key(path: Path) -> float:
    try:
        return path.stat().st_mtime
    except OSError:
        return 0.0


def later(*values: datetime | None) -> datetime | None:
    known = [value for value in values if value is not None]
    return max(known) if known else None


def is_injected(text: str) -> bool:
    head = text.lstrip()
    return any(head.startswith(prefix) for prefix in INJECT_PREFIXES)


def clean_text(value: object) -> str:
    if not isinstance(value, str):
        return ""
    return value.replace("\x00", "").strip()


def join_content(value: object) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        chunks: list[str] = []
        for item in value:
            if isinstance(item, str):
                chunks.append(item)
            elif isinstance(item, dict):
                if item.get("type") in (None, "text", "input_text", "output_text"):
                    chunk = item.get("text")
                    if isinstance(chunk, str):
                        chunks.append(chunk)
        return "\n".join(chunks)
    if isinstance(value, dict):
        for key in ("text", "content", "message"):
            if key in value:
                return join_content(value[key])
    return ""


def user_text(value: object) -> str:
    text = clean_text(join_content(value))
    return "" if not text or is_injected(text) else text


def pair_turns(events: list[tuple[str, datetime | None, str, str]]) -> list[Turn]:
    turns: list[Turn] = []
    user: tuple[datetime | None, str] | None = None
    replies: list[tuple[datetime | None, str, str]] = []

    def flush() -> None:
        nonlocal user, replies
        if user is None:
            replies = []
            return
        turns.append(Turn("user", user[1], user[0]))
        finals = [reply for reply in replies if reply[2] == "final"]
        if replies:
            chosen = (finals or replies)[-1]
            turns.append(Turn("assistant", chosen[1], chosen[0]))
        user = None
        replies = []

    for role, when, text, phase in events:
        if role == "user":
            flush()
            user = (when, text)
        elif user is not None and text:
            replies.append((when, text, phase))
    flush()
    return turns


def decode_lines(lines: Iterable[str], path: Path) -> Iterator[dict]:
    seen = False
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            record = json.loads(line)
        except (json.JSONDecodeError, ValueError):
            continue
        if not isinstance(record, dict):
            continue
        seen = True
        yield record
    if not seen:
        raise ParseError("没有可解析的 JSON 行", path)


def json_lines(path: Path) -> Iterator[dict]:
    try:
        handle = path.open("r", encoding="utf-8", errors="replace")
    except OSError as error:
        raise ParseError(f"无法读取：{error}", path) from error
    with handle:
        yield from decode_lines(handle, path)


def first_record(path: Path) -> dict | None:
    try:
        with path.open("r", encoding="utf-8", errors="replace") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                except (json.JSONDecodeError, ValueError):
                    return None
                return record if isinstance(record, dict) else None
    except OSError:
        return None
    return None


def read_json(path: Path) -> object:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, ValueError):
        return None


def read_index(path: Path) -> dict[str, dict]:
    entries: dict[str, dict] = {}
    if not path.is_file():
        return entries
    for record in json_lines(path):
        session_id = record.get("sessionId")
        if not session_id:
            continue
        if record.get("deleted"):
            entries.pop(str(session_id), None)
        else:
            entries[str(session_id)] = record
    return entries


def clip(text: str, limit: int = TEXT_LIMIT) -> tuple[str, bool]:
    if len(text) <= limit:
        return text, False
    return f"{text[:limit].rstrip()}\n…（已截断，共 {len(text)} 字）", True


from . import claude, codex, dsh, sqlite, wire

FINDERS = {
    "codex": codex.find,
    "claude": claude.find,
    "vspi": wire.find_vspi,
    "kimi": wire.find_kimi,
    "opencode": sqlite.find_opencode,
    "zcode": sqlite.find_zcode,
    "dsh": dsh.find,
}
