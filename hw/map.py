from __future__ import annotations

from pathlib import Path

from .project import Project, relative
from .report import display_width, pad, print_json


def collect(project: Project) -> dict:
    partitions = []
    for entry in project.document_map:
        agents = entry.agents_file(project.root)
        partitions.append(
            {
                "what": entry.what,
                "path": entry.where,
                "exists": entry.exists(project.root),
                "files": entry.file_count(project.root),
                "how": entry.how,
                "agents_file": relative(project.root, agents) if agents and agents.is_file() else "",
                "agents_first_line": _first_line(agents),
            }
        )
    return {
        "root": str(project.root),
        "map_found": bool(project.document_map),
        "rules_found": bool(project.rules_text),
        "partitions": partitions,
    }


def _first_line(path: Path | None) -> str:
    if path is None or not path.is_file():
        return ""
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            return line.strip()
    return ""


def run(project: Project, as_json: bool = False) -> int:
    data = collect(project)
    if as_json:
        print_json(data)
        return 0

    if not data["map_found"]:
        if not data["rules_found"]:
            print("找不到 RULES.md，这个项目还没接入 Hypo-Workflow。在 Agent 里说“用 Hypo-Workflow 接入这个项目”。")
        else:
            print("RULES.md 里没有“## 文档地图”一节。")
        return 0

    print(f"项目根：{data['root']}")
    print()
    headers = ("分区", "路径", "存在", "文件", "分区 AGENTS.md")
    rows = [
        (
            item["what"],
            item["path"],
            "是" if item["exists"] else "否",
            str(item["files"]),
            f"{item['agents_file']} — {item['agents_first_line']}" if item["agents_file"] else "无",
        )
        for item in data["partitions"]
    ]
    widths = [
        max(display_width(header), *(display_width(row[index]) for row in rows))
        if rows
        else display_width(header)
        for index, header in enumerate(headers)
    ]
    print("  ".join(pad(header, widths[index]) for index, header in enumerate(headers)).rstrip())
    print("  ".join("-" * widths[index] for index in range(len(headers))))
    for row in rows:
        print("  ".join(pad(cell, widths[index]) for index, cell in enumerate(row)).rstrip())
    described = [item for item in data["partitions"] if item["how"]]
    if described:
        print()
        print("怎么写")
        for item in described:
            print(f"- {item['what']}（{item['path']}）：{item['how']}")
    return 0
