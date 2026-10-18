from __future__ import annotations

import json
import shutil
import subprocess
from collections.abc import Iterator
from datetime import datetime
from pathlib import Path

from . import (
    ParseError,
    Session,
    Skipped,
    clean_text,
    decode_lines,
    file_mtime,
    first_record,
    join_content,
    json_lines,
    later,
    matches_cwd,
    pair_turns,
    parse_time,
    reading,
    user_text,
)


def find(home: Path, target: str) -> Session | Skipped | None:
    root = home / ".dsh" / "sessions"
    if not root.is_dir():
        return None
    files = sorted(
        [*root.rglob("session*.jsonl"), *root.rglob("session*.jsonl.zstd")],
        key=file_mtime,
        reverse=True,
    )
    if not files:
        return None
    if any(path.suffix == ".zstd" for path in files) and shutil.which("zstd") is None:
        return Skipped("dsh", "没有 zstd 命令")
    for path in files:
        header = _first_record(path)
        if header.get("type") != "session":
            continue
        cwd = str(header.get("cwd") or "")
        if not matches_cwd(cwd, target):
            continue
        with reading(path):
            return _parse(path, cwd)
    return None


def _json_lines(path: Path) -> Iterator[dict]:
    if path.suffix != ".zstd":
        yield from json_lines(path)
        return
    try:
        result = subprocess.run(
            ["zstd", "-dc", str(path)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
    except OSError as error:
        raise ParseError(f"无法解压：{error}", path) from error
    if result.returncode != 0:
        raise ParseError(result.stderr.strip() or "zstd 解压失败", path)
    yield from decode_lines(result.stdout.splitlines(), path)


def _first_record(path: Path) -> dict:
    if path.suffix != ".zstd":
        return first_record(path)
    try:
        process = subprocess.Popen(
            ["zstd", "-dc", str(path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
    except OSError as error:
        raise ParseError(f"无法解压：{error}", path) from error
    try:
        line = process.stdout.readline() if process.stdout else ""
    finally:
        process.kill()
        process.wait()
        if process.stdout is not None:
            process.stdout.close()
    if not line.strip():
        raise ParseError("会话文件为空", path)
    try:
        record = json.loads(line)
    except (json.JSONDecodeError, ValueError) as error:
        raise ParseError(str(error), path) from error
    if not isinstance(record, dict):
        raise ParseError("第 1 行不是 JSON 对象", path)
    return record


def _parse(path: Path, cwd: str) -> Session:
    events: list[tuple[str, datetime | None, str, str]] = []
    started: datetime | None = None
    last: datetime | None = None

    for record in _json_lines(path):
        kind = record.get("type")
        when = parse_time(record.get("time"))
        if when is not None:
            last = later(last, when)
        data = record.get("data") or {}
        if not isinstance(data, dict):
            data = {}

        if kind == "session":
            cwd = str(data.get("cwd") or record.get("cwd") or cwd)
            started = parse_time(record.get("createdAt") or data.get("createdAt")) or started
        elif kind == "user/message":
            source = data.get("source") or {}
            if isinstance(source, dict) and source.get("kind") not in (None, "user"):
                continue
            text = user_text(data.get("content"))
            if text:
                events.append(("user", when, text, ""))
        elif kind == "assistant/message":
            message = data.get("message") or {}
            text = clean_text(join_content(message.get("content"))) if isinstance(message, dict) else ""
            if text:
                events.append(("assistant", when, text, "final"))

    return Session(
        host="dsh",
        path=path,
        cwd=cwd,
        started=started or file_mtime(path),
        updated=later(last, file_mtime(path)),
        model="",
        turns=pair_turns(events),
    )
