from __future__ import annotations

import json
import unicodedata


def display_width(text: str) -> int:
    return sum(2 if unicodedata.east_asian_width(char) in "WF" else 1 for char in text)


def pad(text: str, width: int) -> str:
    return text + " " * max(0, width - display_width(text))


def print_json(data: dict) -> None:
    print(json.dumps(data, ensure_ascii=False, indent=2))
