from __future__ import annotations

from datetime import datetime

from .board import claimed_name, directory_contains, parse_board
from .git import GitError, status_paths
from .project import Project, split_sections
from .report import print_json
from .symbols import ctags_path


def status_sections(project: Project) -> list[dict]:
    path = project.root / "STATUS.md"
    if not path.is_file():
        return []
    sections = []
    for heading, body in split_sections(path.read_text(encoding="utf-8")):
        if not heading:
            continue
        lines = [line.strip() for line in body.splitlines() if line.strip()][:3]
        sections.append({"heading": heading, "lines": lines})
    return sections


def collect(project: Project, as_name: str | None = None, now: datetime | None = None) -> dict:
    now = now or datetime.now()
    board = parse_board(project.root / "BOARD.md", now)
    hints = [] if ctags_path() else ["装 universal-ctags 可检查非 Python 代码"]
    hints.extend(f"BOARD.md{':' + str(line) if line else ''}: {message}" for line, message in board.hints)
    changed = None
    if project.is_git():
        try:
            changed = status_paths(project.root)
        except GitError:
            pass
    if changed is not None:
        for item in board.occupancies:
            if item.until is not None and item.until < now and not any(directory_contains(directory, path) for directory in item.directories for path in changed):
                hints.append(f"BOARD.md:{item.line}: {item.name} 这行可能已经过期，确认后删掉")
    return {
        "root": str(project.root),
        "status": status_sections(project),
        "board": board.to_dict(),
        "as": claimed_name(as_name),
        "hints": hints,
    }


def run(project: Project, as_json: bool = False, as_name: str | None = None) -> int:
    data = collect(project, as_name)
    if as_json:
        print_json(data)
        return 0

    print("STATUS.md")
    if data["status"]:
        for section in data["status"]:
            print(f"  {section['heading']}")
            for line in section["lines"]:
                print(f"    {line}")
    else:
        print("  没有 STATUS.md。")

    print()
    print("BOARD.md · 正在改")
    if data["board"]["occupancies"]:
        for item in data["board"]["occupancies"]:
            own = "（自己）" if item["name"] == data["as"] else ""
            print(f"  {item['name']}{own} · {item['doing']} · {'、'.join(item['directories'])} · {item['expected']}")
    else:
        print("  无。")
    if data["board"]["messages"]:
        print("留言")
        for message in data["board"]["messages"]:
            print(f"  给 {message['to']}：{message['text']}")
    if data["hints"]:
        print()
        print("提示")
        for hint in data["hints"]:
            print(f"  {hint}")
    return 0
