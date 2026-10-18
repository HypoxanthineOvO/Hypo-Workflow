from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

from .project import Project
from .report import print_json
from .sessions import (
    EPOCH,
    FINDERS,
    HOSTS,
    HOST_ROOTS,
    Failure,
    Session,
    Skipped,
    Turn,
    clip,
    file_mtime,
    normalize_cwd,
)


def last_rounds(turns: list[Turn], count: int) -> list[Turn]:
    users = [index for index, turn in enumerate(turns) if turn.role == "user"]
    if not users:
        return turns[-count:]
    start = users[-count] if len(users) >= count else 0
    return turns[start:]


def iso_time(value: datetime | None) -> str:
    if value is None:
        return ""
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def serialize_turn(turn: Turn) -> dict:
    text, truncated = clip(turn.text)
    return {
        "role": turn.role,
        "time": iso_time(turn.time),
        "text": text,
        "truncated": truncated,
        "chars": len(turn.text),
    }


def serialize_session(session: Session, count: int) -> dict:
    turns = last_rounds(session.turns, count)
    return {
        "host": session.host,
        "path": str(session.path),
        "cwd": session.cwd,
        "started": iso_time(session.started),
        "updated": iso_time(session.updated),
        "model": session.model,
        "rounds": sum(1 for turn in turns if turn.role == "user"),
        "turns": [serialize_turn(turn) for turn in turns],
    }


def serialize_failure(failure: Failure) -> dict:
    return {
        "host": failure.host,
        "path": str(failure.path),
        "error": failure.error,
        "updated": iso_time(failure.updated),
    }


def collect(
    root: Path,
    home: Path | None = None,
    host: str | None = None,
    turns: int = 6,
) -> dict:
    home = home or Path.home()
    target = normalize_cwd(str(root))
    results: list[Session | Failure | Skipped] = []
    for name in [host] if host else list(HOSTS):
        finder = FINDERS.get(name)
        if finder is None:
            continue
        try:
            result = finder(home, target)
        except Exception as error:
            path = getattr(error, "path", None) or home / HOST_ROOTS.get(name, Path("."))
            result = Failure(name, path, str(error), file_mtime(path))
        if result is not None:
            results.append(result)

    sessions = [item for item in results if isinstance(item, Session)]
    failures = [item for item in results if isinstance(item, Failure)]
    skipped = [item for item in results if isinstance(item, Skipped)]
    candidates = [*sessions, *failures]
    primary = max(candidates, key=lambda item: item.updated or EPOCH) if candidates else None
    others = [
        session
        for session in sorted(sessions, key=lambda item: item.updated or EPOCH, reverse=True)
        if session is not primary
    ]
    other_failures = [failure for failure in failures if failure is not primary]

    return {
        "root": str(root),
        "session": serialize_session(primary, turns) if isinstance(primary, Session) else None,
        "failure": serialize_failure(primary) if isinstance(primary, Failure) else None,
        "others": [
            {"host": session.host, "updated": iso_time(session.updated), "path": str(session.path)}
            for session in others
        ],
        "other_failures": [serialize_failure(failure) for failure in other_failures],
        "skipped": [{"host": item.host, "reason": item.reason} for item in skipped],
    }


def display_time(value: str) -> str:
    if not value:
        return "未知"
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return value
    return parsed.astimezone().strftime("%Y-%m-%d %H:%M")


def render_session(session: dict) -> None:
    print(f"会话：{session['host']}")
    print(f"文件：{session['path']}")
    print(f"工作目录：{session['cwd']}")
    print(f"开始：{display_time(session['started'])}")
    print(f"最后活动：{display_time(session['updated'])}")
    print(f"模型：{session['model'] or '未知'}")
    print()
    print(f"对话（最后 {session['rounds']} 轮）：")
    if not session["turns"]:
        print("  没有可读的对话。")
        return
    for turn in session["turns"]:
        label = "用户" if turn["role"] == "user" else "Agent"
        print(f"[{display_time(turn['time'])}] {label}")
        print(turn["text"])
        print()


def render_failure(failure: dict) -> None:
    print(f"解析失败，会话文件：{failure['path']}，请直接读")
    print(f"宿主：{failure['host']}")
    if failure["error"]:
        print(f"原因：{failure['error']}")


def render(data: dict) -> None:
    if data["session"] is not None:
        render_session(data["session"])
    elif data["failure"] is not None:
        render_failure(data["failure"])
    else:
        print(f"在 {data['root']} 下没找到会话。")

    if data["others"]:
        print("同目录其他宿主：")
        for session in data["others"]:
            print(f"  {session['host']:<8} {display_time(session['updated'])}  {session['path']}")
        print()

    if data["other_failures"]:
        print("其他宿主解析失败：")
        for failure in data["other_failures"]:
            print(f"  {failure['host']} 解析失败，会话文件：{failure['path']}，请直接读")
        print()

    for skipped in data["skipped"]:
        print(f"跳过 {skipped['host']}：{skipped['reason']}")


def run(args: argparse.Namespace, home: Path | None = None, root: Path | None = None) -> int:
    host = getattr(args, "host", None)
    if host and host not in FINDERS:
        print(f"不支持的宿主：{host}（可选：{'、'.join(HOSTS)}）", file=sys.stderr)
        return 2
    root = root or Project().root
    count = max(1, getattr(args, "turns", 6) or 6)
    data = collect(root, home=home, host=host, turns=count)
    if getattr(args, "json", False):
        print_json(data)
        return 0
    render(data)
    return 0
