from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

FIELD = re.compile(r"^-\s*(更新|更新时间|在做|做到哪|下一步|未提交)\s*[:：]\s*(.*)$")
MESSAGE = re.compile(
    r"^-\s*\[(\d{2})-(\d{2})\s+(\d{2}):(\d{2})\s+([^→\]]+?)\s*→\s*([^\]]+?)\]\s*(.*)$"
)
UPDATE_FORMATS = ("%Y-%m-%d %H:%M", "%Y-%m-%d")


@dataclass
class Lane:
    name: str
    updated: datetime | None = None
    doing: str = ""
    next: str = ""
    uncommitted: list[str] = field(default_factory=list)

    @property
    def owner(self) -> str:
        return self.name.split("·", 1)[0].strip()

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "updated": self.updated.strftime("%Y-%m-%d %H:%M") if self.updated else "",
            "doing": self.doing,
            "next": self.next,
            "uncommitted": self.uncommitted,
        }


@dataclass
class Message:
    at: datetime
    sender: str
    recipient: str
    text: str

    @property
    def to_user(self) -> bool:
        return self.recipient.strip() == "用户"

    def to_dict(self) -> dict:
        return {
            "time": self.at.strftime("%Y-%m-%d %H:%M"),
            "from": self.sender,
            "to": self.recipient,
            "text": self.text,
        }


@dataclass
class Board:
    lanes: list[Lane]
    messages: list[Message]
    line_count: int

    def lane_for(self, name: str) -> Lane | None:
        name = name.strip()
        for lane in self.lanes:
            if lane.name == name or lane.owner == name or name in lane.name:
                return lane
        return None

    def to_dict(self) -> dict:
        return {
            "lanes": [lane.to_dict() for lane in self.lanes],
            "messages": [message.to_dict() for message in self.messages],
            "line_count": self.line_count,
        }


def parse_update(value: str) -> datetime | None:
    for fmt in UPDATE_FORMATS:
        try:
            return datetime.strptime(value.strip(), fmt)
        except ValueError:
            continue
    return None


def parse_message_time(month: str, day: str, hour: str, minute: str) -> datetime | None:
    now = datetime.now()
    try:
        parsed = datetime(now.year, int(month), int(day), int(hour), int(minute))
    except ValueError:
        return None
    if parsed.month - now.month > 6:
        parsed = parsed.replace(year=now.year - 1)
    return parsed


def split_files(value: str) -> list[str]:
    value = value.strip()
    if value in ("", "无", "（无）", "-"):
        return []
    return [
        part.strip().strip("`")
        for part in re.split(r"[、，,；;]", value)
        if part.strip() and part.strip() not in ("无", "（无）")
    ]


def parse_board(path: Path) -> Board:
    if not path.is_file():
        return Board([], [], 0)
    text = path.read_text(encoding="utf-8")
    lanes: list[Lane] = []
    messages: list[Message] = []
    section = ""
    lane: Lane | None = None
    for line in text.splitlines():
        if line.startswith("## "):
            section = line[3:].strip()
            lane = None
            continue
        if line.startswith("### "):
            lane = Lane(line[4:].strip()) if section == "各 Agent 当前" else None
            if lane:
                lanes.append(lane)
            continue
        if section == "各 Agent 当前" and lane:
            match = FIELD.match(line)
            if not match:
                continue
            key, value = match.groups()
            if key.startswith("更新"):
                lane.updated = parse_update(value)
            elif key == "在做":
                lane.doing = value.strip()
            elif key == "下一步":
                lane.next = value.strip()
            elif key == "未提交":
                lane.uncommitted = split_files(value)
        elif section == "留言":
            match = MESSAGE.match(line)
            if not match:
                continue
            at = parse_message_time(*match.group(1, 2, 3, 4))
            if at:
                messages.append(Message(at, match.group(5).strip(), match.group(6).strip(), match.group(7).strip()))
    return Board(lanes, messages, len(text.splitlines()))
