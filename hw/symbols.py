from __future__ import annotations

import ast
import re
from dataclasses import dataclass
from pathlib import PurePosixPath


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


LITERALS = re.compile(r'//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|`(?:\\.|[^`\\])*`')
DECLARATION = re.compile(
    r'\b(?:function\s*\*?|class|interface|struct|enum|fn|func(?:\s+\([^\n]*?\))?)\s+(?P<declared>\w+)'
    r'|\b(?:const|let|var)\s+(?P<assigned>\w+)\s*(?::[^=;\n]+)?='
    r'|^[ \t]*(?:(?:[\w:*&<>]+)[ \t]+)*(?P<method>\w+)\s*\((?:[^;{}()]|\{[^{}]*\}|\([^()]*\))*\)[^;{}\n]*\{',
    re.M,
)
CONTROL_WORDS = {'if', 'else', 'for', 'while', 'switch', 'catch', 'return', 'with'}


def brace_definitions(text: str) -> list[Definition]:
    source = LITERALS.sub(lambda match: re.sub(r'[^\n]', ' ', match.group()), text)
    ends: dict[int, int] = {}
    stack: list[int] = []
    for index, char in enumerate(source):
        if char == '{':
            stack.append(index)
        elif char == '}' and stack:
            ends[stack.pop()] = index
    definitions: list[Definition] = []
    for match in DECLARATION.finditer(source):
        name = match.group('declared') or match.group('assigned') or match.group('method')
        if name in CONTROL_WORDS:
            continue
        start = source.count('\n', 0, match.start()) + 1
        boundary = re.search(r'[{};\n]' if match.group('assigned') else r'[{};]', source[match.start():])
        end = start
        if boundary and boundary.group() == '{':
            opening = match.start() + boundary.start()
            if opening not in ends:
                continue
            end = source.count('\n', 0, ends[opening]) + 1
        definitions.append(Definition(name, start, end))
    return qualify(definitions)


def qualify(definitions: list[Definition]) -> list[Definition]:
    qualified: list[Definition] = []
    for item in definitions:
        parents = [
            outer.name for outer in definitions
            if outer is not item and outer.start < item.start and item.end <= outer.end
        ]
        name = '.'.join([*parents, item.name]) if parents else item.name
        qualified.append(Definition(name, item.start, item.end))
    return qualified


def definitions(path: str, text: str) -> list[Definition]:
    if PurePosixPath(path).suffix in {'.py', '.pyi'}:
        return python_definitions(path, text)
    return brace_definitions(text)


def matching_names(definition: Definition, symbols: set[str]) -> set[str]:
    return symbols & {definition.name, definition.name.rsplit('.', 1)[-1]}


def owners(items: list[Definition], number: int, symbols: set[str]) -> set[str]:
    return {
        name for item in items if item.start <= number <= item.end
        for name in matching_names(item, symbols)
    }
