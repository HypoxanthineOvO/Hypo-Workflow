from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

RULES = """# 项目规则

## 文档地图

| 放什么 | 在哪 | 怎么写 |
| --- | --- | --- |
| 产品现在的样子 | docs/需求/<功能>.md | 见 docs/需求/AGENTS.md |
| 给用户看的说明 | README.md | 简短 |
"""

SYNC = """# 同步

## 现在
逐操作同步。

## 规则
- 不恢复全局快照。

## 牵连
事项状态

## 代码
- src/sync.py: retry
- src/other.py

## 测试
tests/test_sync.py

## 未定
离线超过一天的副本怎么合并。
"""

ITEM = """# 事项

## 现在
事项状态。

## 牵连
同步
"""

AGENTS = """# 需求规则
- 一个功能一个文件。
"""

SYNC_SOURCE = """def retry():
    return 1
"""

OTHER_SOURCE = """def other():
    return 1
"""

VALID_TRAILERS = """Feature: 同步
Code: src/sync.py: retry
Docs: docs/需求/同步.md
Verified: 无"""


class RepoTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.repo = Path(self.temporary.name)
        self.git("init", "-q")
        self.git("config", "user.email", "test@example.com")
        self.git("config", "user.name", "Test")
        self.write("README.md", "# 项目\n\n说明。\n")
        self.write("RULES.md", RULES)
        self.write("docs/需求/AGENTS.md", AGENTS)
        self.write("docs/需求/同步.md", SYNC)
        self.write("src/sync.py", SYNC_SOURCE)
        self.write("src/other.py", OTHER_SOURCE)
        self.commit(f"初始化：文档和代码\n\n{VALID_TRAILERS}")

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def write(self, relative: str, text: str) -> Path:
        path = self.repo / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def git(self, *args: str) -> str:
        process = subprocess.run(
            ["git", *args], cwd=self.repo, check=True, capture_output=True, text=True
        )
        return process.stdout

    def commit(self, message: str) -> str:
        self.git("add", "-A")
        self.git("commit", "-q", "-m", message)
        return self.git("rev-parse", "--short", "HEAD").strip()

    def run_hw(self, *args: str) -> subprocess.CompletedProcess:
        environment = os.environ.copy()
        environment["PYTHONPATH"] = str(ROOT)
        environment["PYTHONIOENCODING"] = "utf-8"
        return subprocess.run(
            [sys.executable, "-m", "hw", *args],
            cwd=self.repo,
            capture_output=True,
            text=True,
            env=environment,
        )

    def json_output(self, *args: str) -> dict:
        process = self.run_hw(*args)
        self.assertEqual(process.returncode, 0, process.stderr)
        return json.loads(process.stdout)

    def check_json(self, *args: str) -> tuple[dict, int]:
        process = self.run_hw("check", "--json", *args)
        self.assertIn(process.returncode, (0, 1), process.stderr)
        return json.loads(process.stdout), process.returncode

    def alarms(self, data: dict, category: str | None = None) -> list[dict]:
        return [
            issue
            for issue in data["alarms"]
            if category is None or issue["category"] == category
        ]

    def hints(self, data: dict, category: str | None = None) -> list[dict]:
        return [
            issue
            for issue in data["hints"]
            if category is None or issue["category"] == category
        ]


class MapFindLogTests(RepoTestCase):
    def test_map_lists_partition_and_agents(self) -> None:
        data = self.json_output("map", "--json")
        self.assertTrue(data["map_found"])
        entry = next(item for item in data["partitions"] if item["path"] == "docs/需求/<功能>.md")
        self.assertTrue(entry["exists"])
        self.assertGreaterEqual(entry["files"], 2)
        self.assertEqual(entry["agents_file"], "docs/需求/AGENTS.md")
        self.assertEqual(entry["agents_first_line"], "# 需求规则")

    def test_map_without_rules_explains_instead_of_crashing(self) -> None:
        (self.repo / "RULES.md").unlink()
        process = self.run_hw("map")
        self.assertEqual(process.returncode, 0, process.stderr)
        self.assertIn("找不到 RULES.md", process.stdout)
        self.assertNotIn("Traceback", process.stderr)

    def test_find_shows_reverse_relation_and_board_agent(self) -> None:
        self.write("docs/需求/事项.md", ITEM)
        self.write(
            "BOARD.md",
            "# Board\n\n## 各 Agent 当前\n\n"
            "### Codex GPT · 后端\n"
            "- 更新：2026-10-18 21:40\n"
            "- 在做：同步\n"
            "- 未提交：src/sync.py\n",
        )
        data = self.json_output("find", "同步", "--json")
        result = next(item for item in data["files"] if item["path"] == "docs/需求/同步.md")
        self.assertIn("逐操作同步", result["now"])
        self.assertEqual(result["reverse_relations"][0]["path"], "docs/需求/事项.md")
        self.assertEqual(result["code"][0]["path"], "src/sync.py")
        self.assertEqual(result["code"][0]["symbols"], ["retry"])
        self.assertEqual(result["board_agents"][0]["agent"], "Codex GPT · 后端")

        text = self.run_hw("find", "同步").stdout
        self.assertIn("现在：逐操作同步", text)
        self.assertIn("反向牵连：docs/需求/事项.md", text)
        self.assertIn("BOARD：Codex GPT · 后端", text)

    def test_log_filters_by_feature(self) -> None:
        self.write("README.md", "# 项目\n\n说明二。\n")
        self.commit(
            "登录：补说明\n\nFeature: 登录\nCode: 无\nDocs: 未改，只改说明\nVerified: 无"
        )
        data = self.json_output("log", "同步", "--json")
        self.assertEqual(len(data["commits"]), 1)
        self.assertIn("初始化", data["commits"][0]["subject"])
        self.assertEqual(data["commits"][0]["verified"], "无")
        self.assertEqual(self.json_output("log", "不存在", "--json")["commits"], [])

    def test_handoff_command_is_installed(self) -> None:
        process = self.run_hw("handoff", "--help")
        self.assertEqual(process.returncode, 0, process.stderr)
        self.assertIn("--host", process.stdout)


class DocumentSyncTests(RepoTestCase):
    def test_feature_without_requirement_change_alarms(self) -> None:
        self.write("src/other.py", OTHER_SOURCE + "# changed\n")
        self.commit(
            "改同步实现\n\nFeature: 同步\nCode: src/other.py\nDocs: 未改\nVerified: 无"
        )
        data, code = self.check_json()
        self.assertEqual(code, 1)
        messages = [issue["message"] for issue in self.alarms(data, "文档")]
        self.assertTrue(any("Docs 也没写未改及原因" in message for message in messages))

    def test_docs_with_reason_exempts_requirement_change(self) -> None:
        self.write("src/other.py", OTHER_SOURCE + "# changed\n")
        self.commit(
            "重构同步\n\nFeature: 同步\nCode: src/other.py\nDocs: 未改，纯重构，行为不变\nVerified: 无"
        )
        data, code = self.check_json()
        self.assertEqual(self.alarms(data), [])
        self.assertEqual(code, 0)

    def test_anchored_code_change_without_feature_alarms(self) -> None:
        self.write("src/sync.py", "def retry():  # changed\n    return 1\n")
        self.commit(
            "改重试\n\nFeature: 登录\nCode: src/sync.py: retry\nDocs: 未改，只改同步\nVerified: 无"
        )
        data, _ = self.check_json()
        messages = [issue["message"] for issue in self.alarms(data, "文档")]
        self.assertTrue(any("src/sync.py" in message and "可能漏了牵连" in message for message in messages))

    def test_feature_and_requirement_changed_together_is_clean(self) -> None:
        self.write("src/sync.py", "def retry():  # changed\n    return 1\n")
        self.write("docs/需求/同步.md", SYNC + "\n## 规则\n- 重试按操作单独进行。\n")
        self.commit(
            "同步：按操作重试\n\nFeature: 同步\nCode: src/sync.py: retry\n"
            "Docs: docs/需求/同步.md\nVerified: 无"
        )
        data, code = self.check_json()
        self.assertEqual(self.alarms(data), [])
        self.assertEqual(code, 0)

    def test_anchor_missing_file_and_symbol_alarm(self) -> None:
        self.write(
            "docs/需求/同步.md",
            "# 同步\n\n## 现在\n逐操作同步。\n\n## 代码\n- src/missing.py\n- src/sync.py: nosuch\n",
        )
        data, _ = self.check_json()
        messages = [issue["message"] for issue in self.alarms(data, "文档")]
        self.assertTrue(any("代码锚点不存在：src/missing.py" in message for message in messages))
        self.assertTrue(any("找不到符号：nosuch" in message for message in messages))

    def test_anchor_accepts_method_names_and_notes(self) -> None:
        self.write(
            "web/recorder.ts",
            "export class Recorder {\n  start() {\n    return 1\n  }\n\n"
            "  action(\n    id: string,\n    body: { action?: string; t?: number },\n  ) {\n    return 2\n  }\n}\n",
        )
        self.write(
            "docs/需求/同步.md",
            "# 同步\n\n## 现在\n逐操作同步。\n\n## 代码\n"
            "- `src/sync.py: retry`（重试分支）\n"
            "- `web/recorder.ts: Recorder.start, Recorder.action`\n",
        )
        data, _ = self.check_json()
        messages = [issue["message"] for issue in self.alarms(data, "文档")]
        self.assertFalse(any("代码锚点" in message for message in messages), messages)

    def test_uncommitted_change_to_anchored_file_alarms(self) -> None:
        self.write("src/sync.py", "def retry():  # working tree\n    return 1\n")
        data, _ = self.check_json()
        self.assertTrue(
            any(
                issue["location"] == "工作区" and "没改" in issue["message"]
                for issue in self.alarms(data, "文档")
            )
        )

    def test_symbol_attribution_ignores_hunk_context(self) -> None:
        self.write(
            "web/src/sync.js",
            "function mergeChanges(a){ return a }\nfunction retryQueue(q){ return q }\n",
        )
        self.write(
            "docs/需求/界面同步.md",
            "# 界面同步\n\n## 现在\n界面同步。\n\n## 代码\n- web/src/sync.js: mergeChanges, retryQueue\n",
        )
        self.write(
            "docs/需求/合并.md",
            "# 合并\n\n## 现在\n合并。\n\n## 代码\n- web/src/sync.js: mergeChanges\n",
        )
        self.commit(
            "界面同步：加入同步脚本\n\nFeature: 界面同步、合并\n"
            "Code: web/src/sync.js: mergeChanges, retryQueue\n"
            "Docs: docs/需求/界面同步.md, docs/需求/合并.md\nVerified: 无"
        )
        self.write(
            "web/src/sync.js",
            "function mergeChanges(a){ return a }\nfunction retryQueue(q){ return q + 1 }\n",
        )
        self.commit(
            "同步：调整重试\n\nFeature: 无\nCode: web/src/sync.js: retryQueue\n"
            "Docs: 未改，只改实现\nVerified: 无"
        )
        data, _ = self.check_json()
        doc_alarms = self.alarms(data, "文档")
        self.assertEqual(len(doc_alarms), 1)
        self.assertIn("界面同步", doc_alarms[0]["message"])
        self.assertNotIn("合并", doc_alarms[0]["message"])

    def test_symbol_attribution_python_indent(self) -> None:
        self.write("src/worker.py", "def merge(a):\n    return a\n\ndef retry(q):\n    return q\n")
        self.write(
            "docs/需求/工作线程.md",
            "# 工作线程\n\n## 现在\n工作线程。\n\n## 代码\n- src/worker.py: merge, retry\n",
        )
        self.write(
            "docs/需求/合并线程.md",
            "# 合并线程\n\n## 现在\n合并线程。\n\n## 代码\n- src/worker.py: merge\n",
        )
        self.commit(
            "工作线程：加入脚本\n\nFeature: 工作线程、合并线程\n"
            "Code: src/worker.py: merge, retry\n"
            "Docs: docs/需求/工作线程.md, docs/需求/合并线程.md\nVerified: 无"
        )
        self.write("src/worker.py", "def merge(a):\n    return a\n\ndef retry(q):\n    return q + 1\n")
        self.commit(
            "同步：调整重试\n\nFeature: 无\nCode: src/worker.py: retry\n"
            "Docs: 未改，只改实现\nVerified: 无"
        )
        data, _ = self.check_json()
        doc_alarms = self.alarms(data, "文档")
        self.assertEqual(len(doc_alarms), 1)
        self.assertIn("工作线程", doc_alarms[0]["message"])
        self.assertNotIn("合并线程", doc_alarms[0]["message"])

    def test_undescribed_code_files_aggregate_and_filter_data(self) -> None:
        self.write("src/new_a.py", "def a():\n    return 1\n")
        self.write("src/new_b.ts", "export function b() { return 1 }\n")
        self.write("data/table.csv", "a,b\n")
        self.write("data/readme.txt", "text\n")
        self.write("tests/test_new.py", "def test_new():\n    pass\n")
        self.commit(
            "同步：整理文件\n\nFeature: 无\nCode: 无\n"
            "Docs: 未改，只整理\nVerified: 无"
        )
        data, _ = self.check_json()
        doc_hints = self.hints(data, "文档")
        self.assertEqual(len(doc_hints), 1)
        message = doc_hints[0]["message"]
        self.assertIn("2 个", message)
        self.assertIn("src/new_a.py", message)
        self.assertIn("src/new_b.ts", message)
        self.assertNotIn("data/table.csv", message)
        self.assertNotIn("tests/test_new.py", message)

    def test_undescribed_respects_no_description_section(self) -> None:
        self.write("RULES.md", RULES + "\n## 不需要描述\nsrc/generated/\n")
        self.write("src/generated/data.py", "def generated():\n    return 1\n")
        self.commit(
            "同步：生成数据\n\nFeature: 无\nCode: 无\n"
            "Docs: 未改，只生成\nVerified: 无"
        )
        data, _ = self.check_json()
        self.assertFalse(
            any("没有需求描述" in issue["message"] for issue in self.hints(data, "文档"))
        )


class CommitAndBlacklistTests(RepoTestCase):
    def test_missing_trailer_alarms(self) -> None:
        self.write("README.md", "# 项目\n\n说明二。\n")
        self.commit("更新说明\n\nFeature: 登录")
        data, _ = self.check_json()
        messages = [issue["message"] for issue in self.alarms(data, "提交")]
        self.assertTrue(any("缺少 trailer" in message and "Code" in message for message in messages))

    def test_subject_prefix_number_and_hash_alarm(self) -> None:
        for subject in ("feat: 改同步", "同步 M1 修复", "同步 abc1234 修复"):
            self.write("README.md", f"# 项目\n\n{subject}。\n")
            self.commit(
                f"{subject}\n\nFeature: 同步\nCode: 无\n"
                "Docs: 未改，只改说明\nVerified: 无"
            )
        data, _ = self.check_json()
        messages = " ".join(issue["message"] for issue in self.alarms(data, "提交"))
        self.assertIn("类型前缀", messages)
        self.assertIn("内部编号", messages)
        self.assertIn("hash", messages)

    def test_blacklist_levels_and_combinations(self) -> None:
        self.write(
            "STATUS.md",
            "# 进度\n\n"
            "已核验 结果。\n\n"
            "M1 是芯片。\n\n"
            "Milestone M1 完成。\n\n"
            "This will delve into robust landscape.\n\n"
            "这不是问题，而是机会。\n\n"
            "首先，做 A；其次，做 B；最后，做 C。\n\n"
            "值得注意的是，结果。\n\n"
            "综上所述，完成。\n\n"
            "这说明方向正确。\n\n"
            "```\n已核验\n```\n",
        )
        data, _ = self.check_json()
        alarm_messages = " ".join(issue["message"] for issue in self.alarms(data, "黑词"))
        hint_messages = " ".join(issue["message"] for issue in self.hints(data, "黑词"))
        self.assertIn("B1", alarm_messages)
        self.assertEqual(alarm_messages.count("B1"), 1)
        self.assertIn("E1", alarm_messages)
        self.assertIn("整段重写", hint_messages)
        self.assertIn("C1", alarm_messages)

    def test_blacklist_milestone_without_context_is_quiet(self) -> None:
        self.write("STATUS.md", "# 进度\n\nM1 是芯片。\n")
        data, _ = self.check_json()
        self.assertFalse(any("C1" in issue["message"] for issue in self.alarms(data, "黑词")))
        self.assertFalse(any("C1" in issue["message"] for issue in self.hints(data, "黑词")))

    def test_c5_c16_skip_commit_messages_and_restrict_to_titles(self) -> None:
        self.write("STATUS.md", "# 进度\n\n记录 20261011 与 abc1234。\n\n## 20261011 计划\n")
        self.write("docs/需求/20261011-report.md", "# 报告\n\n## 现在\n一个功能。\n")
        self.commit(
            "同步：整理\n\n目录 20261011，hash abc1234。\n\nFeature: 无\nCode: 无\n"
            "Docs: 未改，只整理\nVerified: 无"
        )
        data, _ = self.check_json()
        issues = data["alarms"] + data["hints"]
        commit_hits = [
            issue
            for issue in issues
            if issue["location"].startswith("提交 ") and ("C5" in issue["message"] or "C16" in issue["message"])
        ]
        self.assertEqual(commit_hits, [])
        body_hits = [
            issue
            for issue in data["hints"]
            if issue["location"].startswith("STATUS.md:3")
            and ("C5" in issue["message"] or "C16" in issue["message"])
        ]
        self.assertEqual(body_hits, [])
        self.assertTrue(
            any(
                issue["location"].startswith("STATUS.md:5")
                and ("C5" in issue["message"] or "C16" in issue["message"])
                for issue in data["hints"]
            )
        )
        self.assertTrue(
            any(
                issue["location"] == "docs/需求/20261011-report.md"
                and ("C5" in issue["message"] or "C16" in issue["message"])
                for issue in data["hints"]
            )
        )


RAW_RULES = RULES.replace(
    "| 给用户看的说明 | README.md | 简短 |",
    "| 给用户看的说明 | README.md | 简短 |\n| 原始材料 | materials/ | 原样保存，不再更新 |",
)


class DocumentScopeTests(RepoTestCase):
    def test_link_check_scope_ignored_files_and_url_decoding(self) -> None:
        self.write("RULES.md", RAW_RULES)
        self.write(
            "README.md",
            "# 项目\n\n[坏](missing.md)\n[锚点](#now)\n[网页](https://example.com/x)\n[邮件](mailto:a@b)\n",
        )
        self.write(
            "docs/需求/同步.md",
            SYNC + "\n[坏需求](../nope.md)\n[空格](%E7%A9%BA%E6%A0%BC%20%E6%96%87%E4%BB%B6.md)\n",
        )
        self.write("docs/需求/空格 文件.md", "# 空格\n\n## 现在\n存在。\n")
        self.write("sources/bad.md", "[坏](missing.md)\n")
        self.write("materials/bad.md", "[坏](missing.md)\n")
        self.write("data/acquisition/README.md", "[坏](missing.md)\n")
        self.write("docs/需求/ignored.md", "# 忽略\n\n## 现在\n[坏](missing.md)\n")
        self.write(".gitignore", "docs/需求/ignored.md\n")
        data, _ = self.check_json()
        locations = {
            issue["location"].split(":", 1)[0]
            for issue in self.alarms(data, "地图")
            if "链接失效" in issue["message"]
        }
        self.assertEqual(locations, {"README.md", "docs/需求/同步.md"})

    def test_blacklist_skips_source_and_raw_partitions(self) -> None:
        self.write("RULES.md", RAW_RULES)
        self.write("README.md", "# 项目\n\n已核验 结果。\n")
        self.write("docs/需求/同步.md", SYNC + "\n已核验 结果。\n")
        self.write("sources/bad.md", "# 来源\n\n已核验 数据。\n")
        self.write("materials/bad.md", "# 材料\n\n已核验 数据。\n")
        self.write("archive/bad.md", "# 归档\n\n已核验 数据。\n")
        data, _ = self.check_json()
        locations = {
            issue["location"].split(":", 1)[0]
            for issue in self.alarms(data, "黑词")
        }
        self.assertEqual(locations, {"README.md", "docs/需求/同步.md"})


class BoardAndSensitiveTests(RepoTestCase):
    def test_board_message_not_handled_hint(self) -> None:
        now = datetime.now().replace(second=0, microsecond=0)
        message_time = now - timedelta(hours=1)
        self.write(
            "BOARD.md",
            "# Board\n\n## 各 Agent 当前\n\n"
            "### Codex GPT · 后端\n"
            f"- 更新：{now:%Y-%m-%d %H:%M}\n"
            "- 在做：同步\n\n"
            "## 留言\n"
            f"- [{message_time:%m-%d %H:%M} Claude Opus → Codex GPT] 请更新需求\n",
        )
        data, _ = self.check_json()
        hints = [issue["message"] for issue in self.hints(data, "BOARD")]
        self.assertTrue(any("留言可能没处理" in hint for hint in hints))

    def test_board_completed_and_too_long_hints(self) -> None:
        lines = ["# Board", "", "## 各 Agent 当前", "", "- 已完成：同步", ""]
        lines.extend("填充" * 3 for _ in range(85))
        self.write("BOARD.md", "\n".join(lines) + "\n")
        data, _ = self.check_json()
        hints = [issue["message"] for issue in self.hints(data, "BOARD")]
        self.assertTrue(any("已完成" in hint for hint in hints))
        self.assertTrue(any("80 行" in hint for hint in hints))

    def test_sensitive_tracked_files_alarm(self) -> None:
        self.write(".env", "TOKEN=abc\n")
        self.write(".env.example", "TOKEN=\n")
        self.write("server.pem", "key\n")
        self.write("id_rsa", "key\n")
        self.write("id_rsa.pub", "public\n")
        self.write("client_secret.txt", "secret\n")
        self.write("config/credentials.json", "{}\n")
        self.write("server/secrets.ts", "export const load = () => 1\n")
        self.write("tests/secrets.test.mjs", "test\n")
        self.commit(
            "添加环境文件\n\nFeature: 无\nCode: 无\n"
            "Docs: 未改，只加测试文件\nVerified: 无"
        )
        data, _ = self.check_json()
        locations = {issue["location"] for issue in self.alarms(data, "敏感")}
        self.assertEqual(
            locations,
            {".env", "server.pem", "id_rsa", "client_secret.txt", "config/credentials.json"},
        )

    def test_status_reports_uncommitted_mismatch(self) -> None:
        self.write(
            "BOARD.md",
            "# Board\n\n## 各 Agent 当前\n\n"
            "### Codex GPT · 后端\n"
            "- 更新：2026-10-18 21:40\n"
            "- 未提交：src/missing.py\n",
        )
        self.write("src/new.py", "def new():\n    return 1\n")
        data = self.json_output("status", "--json")
        missing = data["uncommitted"]["listed_missing"]
        self.assertEqual(missing[0]["file"], "src/missing.py")
        self.assertIn("src/new.py", data["uncommitted"]["unlisted"])


class MapCheckTests(RepoTestCase):
    def test_map_missing_path_outside_markdown_and_broken_link(self) -> None:
        self.write(
            "RULES.md",
            RULES.replace(
                "| 给用户看的说明 | README.md | 简短 |",
                "| 给用户看的说明 | README.md | 简短 |\n| 不存在的分区 | docs/不存在/ | 无 |",
            ),
        )
        self.write("notes/extra.md", "# 额外记录\n")
        self.write("README.md", "# 项目\n\n[坏链接](missing.md)\n")
        data, _ = self.check_json()
        messages = " ".join(issue["message"] for issue in self.alarms(data, "地图"))
        self.assertIn("地图路径不存在", messages)
        self.assertIn("链接失效", messages)
        self.assertTrue(any("地图之外" in issue["message"] for issue in self.hints(data, "地图")))

    def test_since_skips_older_bad_commit(self) -> None:
        self.write("README.md", "# 项目\n\n说明二。\n")
        bad = self.commit("更新说明")
        self.write("README.md", "# 项目\n\n说明三。\n")
        self.commit(
            "更新说明\n\nFeature: 无\nCode: 无\nDocs: 未改，只改说明\nVerified: 无"
        )
        default, _ = self.check_json()
        self.assertTrue(any("缺少 trailer" in issue["message"] for issue in self.alarms(default, "提交")))
        data, code = self.check_json("--since", bad)
        self.assertEqual(self.alarms(data), [])
        self.assertEqual(code, 0)


class IntegrationCutoffTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.repo = Path(self.temporary.name)
        self.git("init", "-q")
        self.git("config", "user.email", "test@example.com")
        self.git("config", "user.name", "Test")

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def write(self, relative: str, text: str) -> None:
        path = self.repo / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def git(self, *args: str) -> str:
        process = subprocess.run(
            ["git", *args], cwd=self.repo, check=True, capture_output=True, text=True
        )
        return process.stdout

    def commit(self, message: str) -> str:
        self.git("add", "-A")
        self.git("commit", "-q", "-m", message)
        return self.git("rev-parse", "--short", "HEAD").strip()

    def run_check(self) -> tuple[dict, int]:
        environment = os.environ.copy()
        environment["PYTHONPATH"] = str(ROOT)
        process = subprocess.run(
            [sys.executable, "-m", "hw", "check", "--json"],
            cwd=self.repo,
            capture_output=True,
            text=True,
            env=environment,
        )
        self.assertIn(process.returncode, (0, 1), process.stderr)
        return json.loads(process.stdout), process.returncode

    def test_unintegrated_project_has_one_format_hint_and_no_requirement_checks(self) -> None:
        self.write("app.py", "def main():\n    return 1\n")
        self.commit("初始提交")
        data, _ = self.run_check()
        self.assertEqual([issue for issue in data["alarms"] if issue["category"] == "文档"], [])
        self.assertEqual([issue for issue in data["hints"] if issue["category"] == "文档"], [])
        format_hints = [
            issue for issue in data["hints"] if "没有使用 Hypo-Workflow" in issue["message"]
        ]
        self.assertEqual(len(format_hints), 1)
        self.assertTrue(any("项目还没接入" in issue["message"] for issue in data["hints"]))

    def test_format_and_commit_blacklist_start_at_first_feature_commit(self) -> None:
        self.write("notes.txt", "one\n")
        old = self.commit("旧提交\n\n已核验 结果")
        self.write("notes.txt", "two\n")
        self.commit("接入：建立格式\n\nFeature: 无\nCode: 无\nDocs: 未改，初始化\nVerified: 无")
        data, _ = self.run_check()
        self.assertEqual([issue for issue in data["alarms"] if issue["category"] == "提交"], [])
        self.assertFalse(any("没有使用 Hypo-Workflow" in issue["message"] for issue in data["hints"]))
        self.assertFalse(any(issue["location"] == f"提交 {old}" for issue in data["alarms"]))
        self.write("notes.txt", "three\n")
        bad = self.commit("临时修改")
        data, _ = self.run_check()
        alarms = [issue for issue in data["alarms"] if issue["category"] == "提交"]
        self.assertEqual([issue["location"] for issue in alarms], [f"提交 {bad}"])

    def test_no_requirement_files_still_reports_undescribed_code(self) -> None:
        self.write(
            "RULES.md",
            "# 规则\n\n## 文档地图\n\n"
            "| 放什么 | 在哪 | 怎么写 |\n| --- | --- | --- |\n"
            "| 给用户看的说明 | README.md | 简短 |\n"
            "| 设计依据 | docs/设计.md | 只写现在 |\n",
        )
        self.write("README.md", "# 项目\n\n说明。\n")
        self.write("docs/设计.md", "# 设计\n\n说明。\n")
        self.write("app.py", "def main():\n    return 1\n")
        self.commit(
            "接入：加入代码\n\nFeature: 任意功能\nCode: app.py\n"
            "Docs: 未改，只加代码\nVerified: 无"
        )
        data, _ = self.run_check()
        self.assertEqual([issue for issue in data["alarms"] if issue["category"] == "文档"], [])
        self.assertTrue(any("app.py" in issue["message"] for issue in data["hints"] if issue["category"] == "文档"))


class EmptyRepositoryTests(unittest.TestCase):
    def test_check_without_commits_does_not_crash(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory)
            subprocess.run(["git", "init", "-q"], cwd=repo, check=True)
            environment = os.environ.copy()
            environment["PYTHONPATH"] = str(ROOT)
            process = subprocess.run(
                [sys.executable, "-m", "hw", "check", "--json"],
                cwd=repo,
                capture_output=True,
                text=True,
                env=environment,
            )
            self.assertIn(process.returncode, (0, 1), process.stderr)
            data = json.loads(process.stdout)
            self.assertEqual(data["alarms"], [])
            self.assertTrue(any("项目还没接入 Hypo-Workflow" in issue["message"] for issue in data["hints"]))


if __name__ == "__main__":
    unittest.main()
