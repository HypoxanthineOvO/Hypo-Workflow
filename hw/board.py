from __future__ import annotations

import os
import posixpath
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path, PurePosixPath

FIELD = re.compile(r"^-\s*(更新|更新时间|在做|做到哪|下一步|未提交)\s*[:：]\s*(.*)$")
OLD_MESSAGE = re.compile(r"^-\s*\[(\d{2})-(\d{2})\s+(\d{2}):(\d{2})\s+([^→\]]+?)\s*→\s*([^\]]+?)\]\s*(.*)$")
MESSAGE = re.compile(r"^-\s*给\s+(.+?)(?:：\s*|:\s+)(.*)$")
NAME = re.compile(r"^(.+?)\s+(\d{2}-\d{2}\s+\d{2}:\d{2})$")


@dataclass
class Occupancy:
    name: str
    doing: str
    directories: list[str]
    expected: str
    until: datetime | None = None
    line: int = 0
    legacy: bool = False

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "doing": self.doing,
            "directories": self.directories,
            "expected": self.expected,
            "until": self.until.strftime("%Y-%m-%d %H:%M") if self.until else "",
            "line": self.line,
            "legacy": self.legacy,
        }


@dataclass
class LegacyLane:
    name: str
    doing: str = ""
    uncommitted: list[str] = field(default_factory=list)


@dataclass
class Message:
    at: datetime | None
    sender: str
    recipient: str
    text: str

    def to_dict(self) -> dict:
        return {"time": self.at.strftime("%Y-%m-%d %H:%M") if self.at else "", "from": self.sender, "to": self.recipient, "text": self.text}


@dataclass
class Board:
    occupancies: list[Occupancy] = field(default_factory=list)
    messages: list[Message] = field(default_factory=list)
    hints: list[tuple[int, str]] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "occupancies": [item.to_dict() for item in self.occupancies],
            "messages": [message.to_dict() for message in self.messages],
            "hints": [{"line": line, "message": message} for line, message in self.hints],
        }


def claimed_name(as_name: str | None = None) -> str:
    return (as_name if as_name is not None else os.environ.get("HW_BOARD_NAME", "")).strip()


def directory_contains(directory: str, path: str) -> bool:
    directory = posixpath.normpath(directory.strip().strip("`"))
    path = posixpath.normpath(path)
    if directory == ".":
        return not path.startswith(("../", "/")) and path != ".."
    return path.startswith(directory.rstrip("/") + "/")


def month_day(value: str, reference: datetime) -> datetime | None:
    candidates = []
    for year in (reference.year - 1, reference.year, reference.year + 1):
        try:
            candidates.append(datetime.strptime(f"{year}-{value}", "%Y-%m-%d %H:%M"))
        except ValueError:
            pass
    return min(candidates, key=lambda item: abs(item - reference)) if candidates else None


def parse_expected(value: str, started: datetime) -> datetime | None:
    match = re.fullmatch(r"预计\s+(?:(\d{2}-\d{2})\s+)?(\d{2}:\d{2})", value)
    if not match:
        return None
    day, time = match.groups()
    if day:
        return month_day(f"{day} {time}", started)
    try:
        until = datetime.strptime(f"{started:%Y-%m-%d} {time}", "%Y-%m-%d %H:%M")
        return until + timedelta(days=1) if until < started else until
    except ValueError:
        return None


def split_files(value: str) -> list[str]:
    return [part.strip().strip("`") for part in re.split(r"[、，,；;]", value) if part.strip() and part.strip() not in ("无", "（无）", "-")]


def parse_board(path: Path, now: datetime | None = None) -> Board:
    if not path.is_file():
        return Board()
    now = now or datetime.now()
    text = path.read_text(encoding="utf-8")
    board = Board()
    legacy_lanes: list[LegacyLane] = []
    section = ""
    lane: LegacyLane | None = None
    fenced = False
    legacy_seen = False
    for number, line in enumerate(text.splitlines(), start=1):
        if re.match(r"^\s*(?:```|~~~)", line):
            fenced = not fenced
            continue
        if fenced:
            continue
        if line.startswith("## "):
            section = line[3:].strip()
            lane = None
            if section == "各 Agent 当前":
                legacy_seen = True
            continue
        if section == "正在改" and line.lstrip().startswith("-"):
            parts = [part.strip() for part in line.lstrip()[1:].split("·")]
            if len(parts) != 4:
                board.hints.append((number, "占用行格式不对：名字、在做什么、占用目录、预计结束，四段用 · 分隔"))
                continue
            name, doing, directories, expected = parts
            names = NAME.fullmatch(name)
            started = month_day(names.group(2), now) if names else None
            until = parse_expected(expected, started) if started else None
            paths = split_files(directories)
            item = Occupancy(name, doing, paths, expected, until, number)
            board.occupancies.append(item)
            if not started:
                board.hints.append((number, f"{name} 名字格式不对，应为“工具名 月-日 时:分”"))
            if not until:
                board.hints.append((number, f"{name} 预计结束格式不对，应为“预计 15:00”或“预计 11-06 08:00”"))
            if not doing or not paths or any(PurePosixPath(part).is_absolute() or ".." in PurePosixPath(part).parts or (path.parent / part).is_file() or any(char in part for char in "*?[") for part in paths):
                board.hints.append((number, f"{name} 占用行格式不对：写清在做什么，只列项目内的目录，不列文件或通配符"))
        elif section == "各 Agent 当前":
            if line.startswith("### "):
                lane = LegacyLane(line[4:].strip())
                legacy_lanes.append(lane)
            elif lane and (match := FIELD.match(line)):
                key, value = match.groups()
                if key == "在做":
                    lane.doing = value.strip()
                elif key == "未提交":
                    lane.uncommitted = split_files(value)
        elif section == "留言":
            if match := MESSAGE.match(line):
                board.messages.append(Message(None, "", match.group(1).strip(), match.group(2).strip()))
            elif match := OLD_MESSAGE.match(line):
                legacy_seen = True
                at = month_day(f"{match[1]}-{match[2]} {match[3]}:{match[4]}", now)
                if at:
                    board.messages.append(Message(at, match[5].strip(), match[6].strip(), match[7].strip()))
    if legacy_seen:
        board.hints.insert(0, (0, "BOARD 使用旧分道格式，建议改成“正在改”的一行目录占用格式"))
        for lane in legacy_lanes:
            directories = sorted({PurePosixPath(item).parent.as_posix().rstrip("/") + "/" for item in lane.uncommitted})
            board.occupancies.append(Occupancy(lane.name, lane.doing, directories, "", legacy=True))
    return board
