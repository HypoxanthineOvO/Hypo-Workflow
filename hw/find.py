from __future__ import annotations

from .board import parse_board
from .project import Project, Requirement, path_matches
from .report import print_json


def mentions(requirement: Requirement, relation: str) -> bool:
    names = [name for name in requirement.names if len(name) >= 2]
    return any(name in relation for name in names)


def reverse_relations(project: Project, target: Requirement) -> list[dict]:
    result = []
    for other in project.requirements:
        if other.path == target.path:
            continue
        for relation in other.relations:
            if mentions(target, relation):
                result.append({"path": other.path, "title": other.title, "relation": relation})
    return result


def board_agents(project: Project, target: Requirement) -> list[dict]:
    board = parse_board(project.root / "BOARD.md")
    result = []
    for lane in board.lanes:
        hits = [
            anchor.path
            for anchor in target.code
            if any(path_matches(anchor.path, item) for item in lane.uncommitted)
        ]
        if hits:
            result.append({"agent": lane.name, "files": sorted(set(hits))})
    return result


def matches(project: Project, requirement: Requirement, query: str) -> bool:
    needle = query.casefold()
    text = (project.root / requirement.path).read_text(encoding="utf-8").casefold()
    return needle in requirement.path.casefold() or needle in text


def collect(project: Project, query: str) -> dict:
    results = []
    for requirement in project.requirements:
        if not matches(project, requirement, query):
            continue
        results.append(
            {
                **requirement.to_dict(),
                "reverse_relations": reverse_relations(project, requirement),
                "board_agents": board_agents(project, requirement),
            }
        )
    return {"query": query, "root": str(project.root), "files": results}


def run(project: Project, query: str, as_json: bool = False) -> int:
    data = collect(project, query)
    if as_json:
        print_json(data)
        return 0

    if not data["files"]:
        print(f"没有找到包含“{query}”的需求文件。")
        return 0

    for index, item in enumerate(data["files"]):
        if index:
            print()
        print(f"{item['title']} — {item['path']}")
        if item["now"]:
            print(f"  现在：{item['now']}")
        if item["relations"]:
            print(f"  牵连：{'、'.join(item['relations'])}")
        for reverse in item["reverse_relations"]:
            print(f"  反向牵连：{reverse['path']}（{reverse['title']}）— {reverse['relation']}")
        if item["code"]:
            print("  代码：")
            for anchor in item["code"]:
                symbols = f": {', '.join(anchor['symbols'])}" if anchor["symbols"] else ""
                print(f"    - {anchor['path']}{symbols}")
        if item["tests"]:
            print(f"  测试：{'、'.join(item['tests'])}")
        if item["undecided"]:
            print(f"  未定：{'；'.join(item['undecided'])}")
        for agent in item["board_agents"]:
            print(f"  BOARD：{agent['agent']} 未提交 {'、'.join(agent['files'])}")
    return 0
