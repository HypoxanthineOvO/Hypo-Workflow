from __future__ import annotations

import argparse
import sys

from . import __version__, check, find, handoff, log, map as map_command, status
from .git import GitError
from .project import Project


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="hw", description="只读的项目文档与代码一致性检查工具")
    parser.add_argument("--version", action="version", version=f"hw {__version__}")
    subparsers = parser.add_subparsers(dest="command", required=True)

    map_parser = subparsers.add_parser("map", help="列出文档地图")
    map_parser.add_argument("--json", action="store_true")

    find_parser = subparsers.add_parser("find", help="按词查找需求文件")
    find_parser.add_argument("word")
    find_parser.add_argument("--json", action="store_true")

    status_parser = subparsers.add_parser("status", help="显示 STATUS、BOARD 和未提交对比")
    status_parser.add_argument("--json", action="store_true")

    log_parser = subparsers.add_parser("log", help="按功能查看提交")
    log_parser.add_argument("feature")
    log_parser.add_argument("--json", action="store_true")

    check_parser = subparsers.add_parser("check", help="检查文档、提交、黑词、地图和敏感文件")
    check_parser.add_argument("--since")
    check_parser.add_argument("--json", action="store_true")

    handoff_parser = subparsers.add_parser("handoff", help="找最近的会话记录")
    handoff_parser.add_argument("--host", choices=handoff.HOSTS, help="只看某个宿主")
    handoff_parser.add_argument("--turns", type=int, default=6, help="显示最后几轮对话")
    handoff_parser.add_argument("--json", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    project = Project()
    try:
        if args.command == "map":
            return map_command.run(project, args.json)
        if args.command == "find":
            return find.run(project, args.word, args.json)
        if args.command == "status":
            return status.run(project, args.json)
        if args.command == "log":
            return log.run(project, args.feature, args.json)
        if args.command == "check":
            return check.run(project, args.since, args.json)
        if args.command == "handoff":
            return handoff.run(args)
    except GitError as error:
        print(f"git 读取失败：{error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
