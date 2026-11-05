from __future__ import annotations

import ast
import json
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath


@dataclass(frozen=True)
class Definition:
    name: str
    start: int
    end: int


def python_definitions(path: str, text: str) -> list[Definition]:
    definitions: list[Definition] = []

    def visit(node: ast.AST, parents: tuple[str, ...] = ()) -> None:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            names = (*parents, node.name)
            start = min([node.lineno, *(item.lineno for item in node.decorator_list)])
            definitions.append(Definition('.'.join(names), start, node.end_lineno))
            parents = names
        elif isinstance(node, (ast.Assign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            for target in targets:
                for name in ast.walk(target):
                    if isinstance(name, ast.Name):
                        definitions.append(Definition('.'.join((*parents, name.id)), node.lineno, node.end_lineno))
        for child in ast.iter_child_nodes(node):
            visit(child, parents)

    visit(ast.parse(text, filename=path))
    return definitions


class SymbolError(Exception):
    pass


def ctags_path() -> str | None:
    return shutil.which("ctags") or shutil.which(str(Path.home() / ".local/bin/ctags"))


def supported(path: str) -> bool:
    return PurePosixPath(path).suffix.lower() in {".py", ".pyi"} or ctags_path() is not None


def qualified_name(name: str) -> str:
    return re.sub(r"::|->|#", ".", name)


def ctags_definitions(path: str, text: str) -> list[Definition]:
    executable = ctags_path()
    if executable is None or not text:
        return []
    try:
        with tempfile.TemporaryDirectory(prefix="hw-symbols-") as directory:
            source = Path(directory) / PurePosixPath(path).name
            source.write_text(text, encoding="utf-8")
            result = subprocess.run(
                [executable, "--options=NONE", "--output-format=json", "--fields=+ne", "-o", "-", str(source)],
                capture_output=True, text=True, encoding="utf-8", check=True,
            )
        items = []
        for line in result.stdout.splitlines():
            tag = json.loads(line)
            if tag.get("_type") != "tag" or not tag.get("line"):
                continue
            name = qualified_name(tag["name"])
            scope = qualified_name(tag.get("scope", ""))
            if scope:
                name = f"{scope}.{name}"
            items.append(Definition(name, tag["line"], tag.get("end", tag["line"])))
        return items
    except (OSError, subprocess.CalledProcessError, ValueError, KeyError) as error:
        raise SymbolError(f"{path}: ctags 解析失败：{error}") from error


def definitions(path: str, text: str) -> list[Definition]:
    if PurePosixPath(path).suffix.lower() in {".py", ".pyi"}:
        return python_definitions(path, text)
    return ctags_definitions(path, text)


def matching_names(definition: Definition, symbols: set[str]) -> set[str]:
    name = qualified_name(definition.name)
    parts = name.split(".")
    accepted = {".".join(parts[index:]) for index in range(len(parts))}
    return {symbol for symbol in symbols if qualified_name(symbol) in accepted}


def owners(items: list[Definition], number: int, symbols: set[str]) -> set[str]:
    return {
        name for item in items if item.start <= number <= item.end
        for name in matching_names(item, symbols)
    }
