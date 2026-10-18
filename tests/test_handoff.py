from __future__ import annotations

import io
import json
import os
import shutil
import sqlite3
import subprocess
import tempfile
import unittest
from argparse import Namespace
from contextlib import redirect_stdout
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock

from hw import handoff
from hw.sessions import clip, matches_cwd, normalize_cwd


def moment(day: int, hour: int = 10) -> datetime:
    return datetime(2026, 1, day, hour, tzinfo=timezone.utc)


def stamp(value: datetime) -> str:
    return value.strftime("%Y-%m-%dT%H:%M:%SZ")


def millis(value: datetime) -> int:
    return int(value.timestamp() * 1000)


def write_jsonl(path: Path, records: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def set_mtime(path: Path, value: datetime) -> None:
    seconds = value.timestamp()
    os.utime(path, (seconds, seconds))


class HandoffTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.base = Path(self.temporary.name)
        self.root = self.base / "repo"
        self.root.mkdir()
        self.home = self.base / "home"
        self.home.mkdir()

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def collect(self, **kwargs) -> dict:
        return handoff.collect(self.root, home=self.home, **kwargs)


class CodexTests(HandoffTestCase):
    def test_latest_session_turns_and_injection_filter(self) -> None:
        old = self.home / ".codex/sessions/2026/01/01/rollout-old.jsonl"
        write_jsonl(
            old,
            [
                {
                    "type": "session_meta",
                    "timestamp": stamp(moment(1)),
                    "payload": {"cwd": str(self.root)},
                },
                {
                    "type": "event_msg",
                    "timestamp": stamp(moment(1)),
                    "payload": {"type": "user_message", "message": "旧问题"},
                },
                {
                    "type": "response_item",
                    "timestamp": stamp(moment(1)),
                    "payload": {
                        "type": "message",
                        "role": "assistant",
                        "content": [{"type": "output_text", "text": "旧回复"}],
                    },
                },
            ],
        )
        set_mtime(old, moment(1))

        new = self.home / ".codex/sessions/2026/01/02/rollout-new.jsonl"
        nested = self.root / "src"
        write_jsonl(
            new,
            [
                {
                    "type": "session_meta",
                    "timestamp": stamp(moment(2)),
                    "payload": {"cwd": str(nested)},
                },
                {
                    "type": "turn_context",
                    "timestamp": stamp(moment(2)),
                    "payload": {"cwd": str(nested), "model": "gpt-test"},
                },
                {
                    "type": "event_msg",
                    "timestamp": stamp(moment(2, 10)),
                    "payload": {"type": "user_message", "message": "第一问"},
                },
                {
                    "type": "response_item",
                    "timestamp": stamp(moment(2, 10)),
                    "payload": {
                        "type": "message",
                        "role": "assistant",
                        "phase": "final",
                        "content": [{"type": "output_text", "text": "第一答"}],
                    },
                },
                {
                    "type": "event_msg",
                    "timestamp": stamp(moment(2, 11)),
                    "payload": {"type": "user_message", "message": "新问题"},
                },
                {
                    "type": "event_msg",
                    "timestamp": stamp(moment(2, 11)),
                    "payload": {
                        "type": "user_message",
                        "message": "# AGENTS.md instructions\n\n<INSTRUCTIONS>注入</INSTRUCTIONS>",
                    },
                },
                {
                    "type": "response_item",
                    "timestamp": stamp(moment(2, 11)),
                    "payload": {
                        "type": "message",
                        "role": "assistant",
                        "phase": "commentary",
                        "content": [{"type": "output_text", "text": "先看看"}],
                    },
                },
                {
                    "type": "response_item",
                    "timestamp": stamp(moment(2, 12)),
                    "payload": {
                        "type": "message",
                        "role": "assistant",
                        "phase": "final",
                        "content": [{"type": "output_text", "text": "新回复"}],
                    },
                },
                {
                    "type": "event_msg",
                    "timestamp": stamp(moment(2, 13)),
                    "payload": {"type": "user_message", "message": "第三问"},
                },
                {
                    "type": "response_item",
                    "timestamp": stamp(moment(2, 13)),
                    "payload": {
                        "type": "message",
                        "role": "assistant",
                        "phase": "final",
                        "content": [{"type": "output_text", "text": "第三答"}],
                    },
                },
            ],
        )
        set_mtime(new, moment(2, 13))

        data = self.collect(host="codex", turns=2)
        session = data["session"]
        self.assertIsNotNone(session)
        self.assertEqual(session["path"], str(new))
        self.assertEqual(session["cwd"], str(nested))
        self.assertEqual(session["model"], "gpt-test")
        self.assertEqual(session["started"], stamp(moment(2)))
        self.assertEqual(session["updated"], stamp(moment(2, 13)))
        contents = [(turn["role"], turn["text"]) for turn in session["turns"]]
        self.assertEqual(
            contents,
            [
                ("user", "新问题"),
                ("assistant", "新回复"),
                ("user", "第三问"),
                ("assistant", "第三答"),
            ],
        )
        self.assertEqual(data["others"], [])

    def test_host_filter_hides_other_hosts(self) -> None:
        path = self.home / ".codex/sessions/2026/01/01/rollout.jsonl"
        write_jsonl(
            path,
            [
                {
                    "type": "session_meta",
                    "timestamp": stamp(moment(1)),
                    "payload": {"cwd": str(self.root)},
                },
                {
                    "type": "event_msg",
                    "timestamp": stamp(moment(1)),
                    "payload": {"type": "user_message", "message": "问题"},
                },
            ],
        )
        set_mtime(path, moment(1))

        self.assertIsNotNone(self.collect(host="codex")["session"])
        self.assertIsNone(self.collect(host="claude")["session"])
        self.assertEqual(self.collect(host="claude")["others"], [])


class ClaudeTests(HandoffTestCase):
    def test_turns_model_and_sidechain_filter(self) -> None:
        old = self.home / ".claude/projects/-repo/old.jsonl"
        write_jsonl(
            old,
            [
                {"type": "user", "cwd": str(self.root), "timestamp": stamp(moment(1)), "message": {"content": "旧问题"}},
                {
                    "type": "assistant",
                    "cwd": str(self.root),
                    "timestamp": stamp(moment(1)),
                    "message": {"model": "claude-test", "content": [{"type": "text", "text": "旧回复"}]},
                },
            ],
        )
        set_mtime(old, moment(1))

        new = self.home / ".claude/projects/-repo/new.jsonl"
        write_jsonl(
            new,
            [
                {"type": "user", "cwd": str(self.root), "timestamp": stamp(moment(2)), "message": {"content": "问一"}},
                {
                    "type": "assistant",
                    "cwd": str(self.root),
                    "timestamp": stamp(moment(2)),
                    "message": {"model": "<synthetic>", "content": []},
                },
                {
                    "type": "assistant",
                    "cwd": str(self.root),
                    "timestamp": stamp(moment(2)),
                    "message": {"model": "claude-test", "content": [{"type": "text", "text": "答一"}]},
                },
                {
                    "type": "user",
                    "cwd": str(self.root),
                    "timestamp": stamp(moment(2, 11)),
                    "message": {"content": "<system-reminder>注入</system-reminder>"},
                },
                {
                    "type": "user",
                    "cwd": str(self.root),
                    "timestamp": stamp(moment(2, 11)),
                    "isSidechain": True,
                    "message": {"content": "子代理问题"},
                },
                {
                    "type": "assistant",
                    "cwd": str(self.root),
                    "timestamp": stamp(moment(2, 11)),
                    "isSidechain": True,
                    "message": {"content": [{"type": "text", "text": "子代理回复"}]},
                },
                {"type": "user", "cwd": str(self.root), "timestamp": stamp(moment(2, 12)), "message": {"content": "问二"}},
                {
                    "type": "assistant",
                    "cwd": str(self.root),
                    "timestamp": stamp(moment(2, 12)),
                    "message": {"model": "claude-test", "content": [{"type": "text", "text": "答二"}]},
                },
            ],
        )
        set_mtime(new, moment(2, 12))

        session = self.collect(host="claude")["session"]
        self.assertEqual(session["path"], str(new))
        self.assertEqual(session["model"], "claude-test")
        contents = [(turn["role"], turn["text"]) for turn in session["turns"]]
        self.assertEqual(
            contents,
            [("user", "问一"), ("assistant", "答一"), ("user", "问二"), ("assistant", "答二")],
        )


class VspiTests(HandoffTestCase):
    def session_dir(self, name: str) -> Path:
        return self.home / ".vspi" / "sessions" / "wd_repo_demo" / name

    def test_latest_session_and_wire_turns(self) -> None:
        (self.home / ".vspi").mkdir()
        (self.home / ".vspi/workspaces.json").write_text(
            json.dumps({"version": 1, "workspaces": {"wd_repo_demo": {"root": str(self.root)}}}),
            encoding="utf-8",
        )

        old = self.session_dir("session_old")
        old.mkdir(parents=True)
        (old / "state.json").write_text(
            json.dumps(
                {
                    "id": "session_old",
                    "cwd": str(self.root),
                    "createdAt": millis(moment(1)),
                    "updatedAt": millis(moment(1, 12)),
                }
            ),
            encoding="utf-8",
        )
        write_jsonl(
            old / "agents/main/wire.jsonl",
            [
                {"type": "metadata", "protocol_version": "1.5"},
                {"type": "turn.prompt", "agentId": "main", "input": [{"type": "text", "text": "旧会话"}], "origin": {"kind": "user"}, "time": millis(moment(1))},
            ],
        )

        new = self.session_dir("session_new")
        new.mkdir(parents=True)
        (new / "state.json").write_text(
            json.dumps(
                {
                    "id": "session_new",
                    "cwd": str(self.root),
                    "createdAt": millis(moment(2)),
                    "updatedAt": millis(moment(2, 12)),
                }
            ),
            encoding="utf-8",
        )
        write_jsonl(
            new / "agents/main/wire.jsonl",
            [
                {"type": "metadata", "protocol_version": "1.5"},
                {"type": "llm.request", "modelAlias": "test/vspi-model", "time": millis(moment(2))},
                {"type": "turn.prompt", "agentId": "main", "input": [{"type": "text", "text": "实现功能"}], "origin": {"kind": "user"}, "time": millis(moment(2))},
                {
                    "type": "context.append_loop_event",
                    "agentId": "main",
                    "event": {"type": "content.part", "step": 1, "part": {"type": "think", "think": "思考"}},
                    "time": millis(moment(2, 1)),
                },
                {
                    "type": "context.append_loop_event",
                    "agentId": "main",
                    "event": {"type": "content.part", "step": 2, "part": {"type": "text", "text": "中间说明"}},
                    "time": millis(moment(2, 2)),
                },
                {
                    "type": "context.append_loop_event",
                    "agentId": "main",
                    "event": {"type": "content.part", "step": 3, "part": {"type": "text", "text": "最终回复"}},
                    "time": millis(moment(2, 3)),
                },
                {"type": "turn.prompt", "agentId": "main", "input": [{"type": "text", "text": "自动任务"}], "origin": {"kind": "task"}, "time": millis(moment(2, 4))},
                {
                    "type": "context.append_loop_event",
                    "agentId": "main",
                    "event": {"type": "content.part", "step": 1, "part": {"type": "text", "text": "任务回复"}},
                    "time": millis(moment(2, 5)),
                },
            ],
        )
        set_mtime(new / "state.json", moment(2, 12))

        unrelated = self.home / ".vspi/sessions/wd_other/session_other"
        unrelated.mkdir(parents=True)
        (unrelated / "state.json").write_text(
            json.dumps(
                {
                    "id": "session_other",
                    "cwd": "/tmp/elsewhere",
                    "createdAt": millis(moment(3)),
                    "updatedAt": millis(moment(3)),
                }
            ),
            encoding="utf-8",
        )
        write_jsonl(unrelated / "agents/main/wire.jsonl", [{"type": "metadata"}])

        session = self.collect(host="vspi")["session"]
        self.assertEqual(session["path"], str(new / "agents/main/wire.jsonl"))
        self.assertEqual(session["model"], "test/vspi-model")
        self.assertEqual(session["started"], stamp(moment(2)))
        contents = [(turn["role"], turn["text"]) for turn in session["turns"]]
        self.assertEqual(contents, [("user", "实现功能"), ("assistant", "最终回复")])


class KimiTests(HandoffTestCase):
    def test_session_index_and_wire(self) -> None:
        session_dir = self.home / ".kimi-code/sessions/wd_repo/session_kimi"
        state = {
            "cwd": str(self.root),
            "workDir": str(self.root),
            "createdAt": stamp(moment(1)),
            "updatedAt": stamp(moment(1, 12)),
        }
        (session_dir / "agents/main").mkdir(parents=True)
        (session_dir / "state.json").write_text(json.dumps(state), encoding="utf-8")
        write_jsonl(
            session_dir / "agents/main/wire.jsonl",
            [
                {"type": "turn.prompt", "input": [{"type": "text", "text": "Kimi 问题"}], "origin": {"kind": "user"}, "time": millis(moment(1))},
                {
                    "type": "context.append_loop_event",
                    "event": {"type": "content.part", "step": 1, "part": {"type": "text", "text": "Kimi 回复"}},
                    "time": millis(moment(1, 1)),
                },
            ],
        )
        (self.home / ".kimi-code").mkdir(exist_ok=True)
        write_jsonl(
            self.home / ".kimi-code/session_index.jsonl",
            [{"sessionId": "session_kimi", "sessionDir": str(session_dir), "workDir": str(self.root)}],
        )

        session = self.collect(host="kimi")["session"]
        self.assertEqual(session["cwd"], str(self.root))
        self.assertEqual(session["started"], stamp(moment(1)))
        contents = [(turn["role"], turn["text"]) for turn in session["turns"]]
        self.assertEqual(contents, [("user", "Kimi 问题"), ("assistant", "Kimi 回复")])


def create_database(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.executescript(
        """
        CREATE TABLE session (
            id text PRIMARY KEY,
            parent_id text,
            directory text NOT NULL,
            title text,
            time_created integer NOT NULL,
            time_updated integer NOT NULL
        );
        CREATE TABLE message (
            id text PRIMARY KEY,
            session_id text NOT NULL,
            time_created integer NOT NULL,
            time_updated integer NOT NULL,
            data text NOT NULL
        );
        CREATE TABLE part (
            id text PRIMARY KEY,
            message_id text NOT NULL,
            session_id text NOT NULL,
            time_created integer NOT NULL,
            time_updated integer NOT NULL,
            data text NOT NULL
        );
        """
    )
    connection.commit()
    connection.close()


def insert_turn(
    path: Path,
    session_id: str,
    index: int,
    user: str,
    assistant: str,
    when: datetime,
    model: str = "sqlite-model",
    injected: str | None = None,
) -> None:
    connection = sqlite3.connect(path)
    base = millis(when) + index * 1000
    connection.execute(
        "INSERT INTO message VALUES (?, ?, ?, ?, ?)",
        (
            f"{session_id}-user-{index}",
            session_id,
            base,
            base,
            json.dumps({"role": "user", "modelID": model}),
        ),
    )
    connection.execute(
        "INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)",
        (
            f"{session_id}-part-user-{index}",
            f"{session_id}-user-{index}",
            session_id,
            base,
            base,
            json.dumps({"type": "text", "text": user}),
        ),
    )
    connection.execute(
        "INSERT INTO message VALUES (?, ?, ?, ?, ?)",
        (
            f"{session_id}-assistant-{index}",
            session_id,
            base + 10,
            base + 10,
            json.dumps({"role": "assistant", "modelID": model}),
        ),
    )
    connection.execute(
        "INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)",
        (
            f"{session_id}-part-think-{index}",
            f"{session_id}-assistant-{index}",
            session_id,
            base + 10,
            base + 10,
            json.dumps({"type": "reasoning", "text": "思考"}),
        ),
    )
    connection.execute(
        "INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)",
        (
            f"{session_id}-part-text-{index}",
            f"{session_id}-assistant-{index}",
            session_id,
            base + 11,
            base + 11,
            json.dumps({"type": "text", "text": assistant}),
        ),
    )
    if injected:
        connection.execute(
            "INSERT INTO message VALUES (?, ?, ?, ?, ?)",
            (
                f"{session_id}-injected-{index}",
                session_id,
                base + 20,
                base + 20,
                json.dumps({"role": "user"}),
            ),
        )
        connection.execute(
            "INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)",
            (
                f"{session_id}-part-injected-{index}",
                f"{session_id}-injected-{index}",
                session_id,
                base + 20,
                base + 20,
                json.dumps({"type": "text", "text": injected}),
            ),
        )
    connection.commit()
    connection.close()


def insert_session(path: Path, session_id: str, directory: str, when: datetime, parent: str | None = None) -> None:
    connection = sqlite3.connect(path)
    connection.execute(
        "INSERT INTO session VALUES (?, ?, ?, ?, ?, ?)",
        (session_id, parent, directory, session_id, millis(when), millis(when)),
    )
    connection.commit()
    connection.close()


class OpenCodeTests(HandoffTestCase):
    def test_latest_matching_session(self) -> None:
        database = self.home / ".local/share/opencode/opencode.db"
        create_database(database)
        nested = self.root / "nested"
        insert_session(database, "ses_old", str(self.root), moment(1))
        insert_turn(database, "ses_old", 0, "旧问题", "旧回复", moment(1))
        insert_session(database, "ses_new", str(nested), moment(2))
        insert_turn(
            database,
            "ses_new",
            0,
            "OpenCode 问题",
            "OpenCode 回复",
            moment(2),
            injected="# AGENTS.md instructions\n\n注入",
        )
        insert_session(database, "ses_other", "/tmp/elsewhere", moment(3))
        insert_turn(database, "ses_other", 0, "别处问题", "别处回复", moment(3))

        session = self.collect(host="opencode")["session"]
        self.assertEqual(session["path"], str(database))
        self.assertEqual(session["cwd"], str(nested))
        self.assertEqual(session["model"], "sqlite-model")
        contents = [(turn["role"], turn["text"]) for turn in session["turns"]]
        self.assertEqual(contents, [("user", "OpenCode 问题"), ("assistant", "OpenCode 回复")])

    def test_last_assistant_message_wins(self) -> None:
        database = self.home / ".local/share/opencode/opencode.db"
        create_database(database)
        insert_session(database, "ses_steps", str(self.root), moment(1))
        base = millis(moment(1))
        connection = sqlite3.connect(database)
        messages = [
            ("u", "user", base, "多段问题"),
            ("a1", "assistant", base + 10, "中间回复"),
            ("a2", "assistant", base + 20, "最终回复"),
            ("i", "user", base + 30, "# AGENTS.md instructions\n\n注入"),
            ("a3", "assistant", base + 40, "注入后的回复"),
        ]
        for message_id, role, when, text in messages:
            data = {"role": role}
            if role == "assistant":
                data["modelID"] = "steps-model"
            connection.execute(
                "INSERT INTO message VALUES (?, ?, ?, ?, ?)",
                (message_id, "ses_steps", when, when, json.dumps(data)),
            )
            connection.execute(
                "INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)",
                (
                    f"{message_id}-part",
                    message_id,
                    "ses_steps",
                    when,
                    when,
                    json.dumps({"type": "text", "text": text}),
                ),
            )
        connection.commit()
        connection.close()

        session = self.collect(host="opencode")["session"]
        contents = [(turn["role"], turn["text"]) for turn in session["turns"]]
        self.assertEqual(contents, [("user", "多段问题"), ("assistant", "最终回复")])


class ZCodeTests(HandoffTestCase):
    def test_database_session(self) -> None:
        database = self.home / ".zcode/cli/db/db.sqlite"
        create_database(database)
        insert_session(database, "sess_zcode", str(self.root), moment(1))
        insert_turn(database, "sess_zcode", 0, "ZCode 问题", "ZCode 回复", moment(1))

        session = self.collect(host="zcode")["session"]
        self.assertEqual(session["path"], str(database))
        contents = [(turn["role"], turn["text"]) for turn in session["turns"]]
        self.assertEqual(contents, [("user", "ZCode 问题"), ("assistant", "ZCode 回复")])


class DshTests(HandoffTestCase):
    def write_session(self, path: Path) -> None:
        write_jsonl(
            path,
            [
                {"type": "session", "id": "session_1", "createdAt": millis(moment(1)), "cwd": str(self.root)},
                {
                    "type": "user/message",
                    "time": millis(moment(1)),
                    "data": {"content": [{"type": "text", "text": "DSH 问题"}], "source": {"kind": "user"}},
                },
                {
                    "type": "agent/inbox/spliced",
                    "time": millis(moment(1)),
                    "data": {"content": [{"type": "text", "text": "DSH 问题"}]},
                },
                {
                    "type": "assistant/message",
                    "time": millis(moment(1, 1)),
                    "data": {
                        "message": {
                            "content": [
                                {"type": "reasoning", "text": "思考"},
                                {"type": "text", "text": "DSH 回复"},
                            ]
                        }
                    },
                },
            ],
        )

    def test_plain_jsonl(self) -> None:
        path = self.home / ".dsh/sessions/--repo--/session-1/session.jsonl"
        self.write_session(path)

        session = self.collect(host="dsh")["session"]
        self.assertEqual(session["path"], str(path))
        contents = [(turn["role"], turn["text"]) for turn in session["turns"]]
        self.assertEqual(contents, [("user", "DSH 问题"), ("assistant", "DSH 回复")])

    @unittest.skipUnless(shutil.which("zstd"), "需要 zstd 命令")
    def test_zstd_session(self) -> None:
        plain = self.home / ".dsh/sessions/--repo--/session-1/session.jsonl"
        self.write_session(plain)
        compressed = plain.with_name("session.jsonl.zstd")
        subprocess.run(["zstd", "-q", "-f", str(plain), "-o", str(compressed)], check=True)
        plain.unlink()

        session = self.collect(host="dsh")["session"]
        contents = [(turn["role"], turn["text"]) for turn in session["turns"]]
        self.assertEqual(contents, [("user", "DSH 问题"), ("assistant", "DSH 回复")])

    def test_missing_zstd_is_reported(self) -> None:
        path = self.home / ".dsh/sessions/--repo--/session-1/session.jsonl.zstd"
        path.parent.mkdir(parents=True)
        path.write_bytes(b"not a real zstd file")

        with mock.patch("hw.sessions.dsh.shutil.which", return_value=None):
            data = self.collect(host="dsh")

        self.assertIsNone(data["session"])
        self.assertEqual(data["skipped"], [{"host": "dsh", "reason": "没有 zstd 命令"}])


class FailureAndOutputTests(HandoffTestCase):
    def test_parse_failure_returns_path(self) -> None:
        (self.home / ".vspi").mkdir()
        (self.home / ".vspi/workspaces.json").write_text(
            json.dumps({"version": 1, "workspaces": {"wd_repo_demo": {"root": str(self.root)}}}),
            encoding="utf-8",
        )
        session_dir = self.home / ".vspi/sessions/wd_repo_demo/session_broken"
        session_dir.mkdir(parents=True)
        (session_dir / "state.json").write_text(
            json.dumps(
                {
                    "id": "session_broken",
                    "cwd": str(self.root),
                    "createdAt": millis(moment(1)),
                    "updatedAt": millis(moment(1)),
                }
            ),
            encoding="utf-8",
        )
        wire = session_dir / "agents/main/wire.jsonl"
        wire.parent.mkdir(parents=True)
        wire.write_text("this is not json\n", encoding="utf-8")

        data = self.collect(host="vspi")
        self.assertIsNone(data["session"])
        self.assertEqual(data["failure"]["path"], str(wire))
        self.assertIn("没有可解析的 JSON 行", data["failure"]["error"])

        output = io.StringIO()
        with redirect_stdout(output):
            handoff.render(data)
        self.assertIn(f"解析失败，会话文件：{wire}，请直接读", output.getvalue())

    def test_json_output_and_entry_options(self) -> None:
        path = self.home / ".codex/sessions/2026/01/01/rollout.jsonl"
        write_jsonl(
            path,
            [
                {
                    "type": "session_meta",
                    "timestamp": stamp(moment(1)),
                    "payload": {"cwd": str(self.root)},
                },
                {
                    "type": "event_msg",
                    "timestamp": stamp(moment(1)),
                    "payload": {"type": "user_message", "message": "问题"},
                },
                {
                    "type": "response_item",
                    "timestamp": stamp(moment(1)),
                    "payload": {
                        "type": "message",
                        "role": "assistant",
                        "content": [{"type": "output_text", "text": "回复"}],
                    },
                },
            ],
        )
        set_mtime(path, moment(1))

        output = io.StringIO()
        with redirect_stdout(output):
            code = handoff.run(
                Namespace(host="codex", turns=6, json=True),
                home=self.home,
                root=self.root,
            )
        self.assertEqual(code, 0)
        payload = json.loads(output.getvalue())
        self.assertEqual(payload["session"]["host"], "codex")
        self.assertEqual(payload["session"]["turns"][0]["text"], "问题")

    def test_long_text_is_clipped(self) -> None:
        text, truncated = clip("字" * 2000)
        self.assertTrue(truncated)
        self.assertIn("已截断，共 2000 字", text)
        self.assertLess(len(text), 1600)

    def test_path_normalization(self) -> None:
        self.assertEqual(normalize_cwd("D:\\Work\\Repo\\"), "D:/Work/Repo")
        self.assertTrue(matches_cwd("/repo/sub", "/repo"))
        self.assertFalse(matches_cwd("/repository", "/repo"))


if __name__ == "__main__":
    unittest.main()
