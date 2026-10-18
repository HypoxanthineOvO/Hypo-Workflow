from __future__ import annotations

from .git import commits
from .project import Project
from .report import print_json


def collect(project: Project, feature: str) -> dict:
    needle = feature.casefold()
    records = []
    for commit in commits(project.root, limit=None):
        if needle not in commit.trailer("Feature").casefold():
            continue
        records.append(commit.to_dict())
    return {"feature": feature, "root": str(project.root), "commits": records}


def run(project: Project, feature: str, as_json: bool = False) -> int:
    data = collect(project, feature)
    if as_json:
        print_json(data)
        return 0

    if not data["commits"]:
        print(f"没有找到 Feature 含“{feature}”的提交。")
        return 0

    for commit in data["commits"]:
        print(f"{commit['hash']}  {commit['date']}  {commit['subject']}")
        if commit["verified"]:
            print(f"  Verified：{commit['verified']}")
    return 0
