from __future__ import annotations

from .board import Board, parse_board
from .git import GitError, status_paths
from .project import Project, path_matches, split_sections
from .report import print_json


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


def uncommitted_consistency(project: Project, board: Board) -> dict:
    if not project.is_git():
        return {"git": False, "compared": False, "listed_missing": [], "unlisted": []}
    try:
        changed = status_paths(project.root)
    except GitError:
        return {"git": False, "compared": False, "listed_missing": [], "unlisted": []}
    if not board.lanes:
        return {"git": True, "compared": False, "listed_missing": [], "unlisted": []}

    listed_missing = []
    listed: list[str] = []
    for lane in board.lanes:
        for item in lane.uncommitted:
            listed.append(item)
            if not any(path_matches(item, path) for path in changed):
                listed_missing.append({"agent": lane.name, "file": item})
    unlisted = [
        path
        for path in changed
        if not any(path_matches(item, path) for item in listed)
    ]
    return {"git": True, "compared": True, "listed_missing": listed_missing, "unlisted": unlisted}


def collect(project: Project) -> dict:
    board = parse_board(project.root / "BOARD.md")
    return {
        "root": str(project.root),
        "status": status_sections(project),
        "board": board.to_dict(),
        "messages_to_user": [message.to_dict() for message in board.messages if message.to_user],
        "uncommitted": uncommitted_consistency(project, board),
    }


def run(project: Project, as_json: bool = False) -> int:
    data = collect(project)
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
    print("BOARD.md")
    if data["board"]["lanes"]:
        for lane in data["board"]["lanes"]:
            updated = f"（更新 {lane['updated']}）" if lane["updated"] else ""
            print(f"  {lane['name']}{updated}")
            if lane["doing"]:
                print(f"    在做：{lane['doing']}")
            if lane["next"]:
                print(f"    下一步：{lane['next']}")
            if lane["uncommitted"]:
                print(f"    未提交：{'、'.join(lane['uncommitted'])}")
    else:
        print("  没有 BOARD.md，或其中没有 Agent 道。")

    print()
    print("等用户决定")
    if data["messages_to_user"]:
        for message in data["messages_to_user"]:
            print(f"  [{message['time'][5:]}] {message['from']}：{message['text']}")
    else:
        print("  无。")

    print()
    print("未提交对比")
    uncommitted = data["uncommitted"]
    if not uncommitted["git"]:
        print("  不在 git 仓库，跳过对比。")
    elif not uncommitted["compared"]:
        print("  没有 BOARD 道，跳过对比。")
    else:
        for item in uncommitted["listed_missing"]:
            print(f"  BOARD 列了但 git status 没有：{item['file']}（{item['agent']}）")
        for path in uncommitted["unlisted"]:
            print(f"  git status 有改动但 BOARD 没列：{path}")
        if not uncommitted["listed_missing"] and not uncommitted["unlisted"]:
            print("  一致。")
    return 0
