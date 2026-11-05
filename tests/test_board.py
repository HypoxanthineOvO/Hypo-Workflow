from __future__ import annotations

import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

from hw.board import claimed_name, directory_contains, parse_board
from hw.check import Collector, check_board
from hw.project import Project
from hw import status
from test_hw import RepoTestCase


NOW = datetime(2026, 11, 5, 14, 30)
BOARD = '''# 协作板

## 正在改
- DSH 11-05 14:05 · 清理报警 · docs/需求/ · 预计 15:00
- DSH 11-05 14:20 · 压力测试 · tests/、src/sync/ · 预计 11-06 08:00

## 留言
- 给 DSH 11-05 14:20：同步规则刚改过
'''


class BoardParserTests(unittest.TestCase):
    def parse(self, text, now=NOW):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'BOARD.md'
            path.write_text(text)
            return parse_board(path, now)

    def test_new_format_and_message_name_with_colon(self):
        board = self.parse(BOARD)
        self.assertEqual(board.hints, [])
        self.assertEqual(len(board.occupancies), 2)
        first, second = board.occupancies
        self.assertEqual(first.name, 'DSH 11-05 14:05')
        self.assertEqual(first.until, datetime(2026, 11, 5, 15))
        self.assertEqual(second.directories, ['tests/', 'src/sync/'])
        self.assertEqual(second.until, datetime(2026, 11, 6, 8))
        self.assertEqual(board.messages[0].recipient, 'DSH 11-05 14:20')
        self.assertEqual(board.messages[0].text, '同步规则刚改过')

    def test_short_estimate_uses_start_day_across_midnight(self):
        board = self.parse(BOARD, datetime(2026, 11, 6, 0, 5))
        self.assertEqual(board.occupancies[0].until, datetime(2026, 11, 5, 15))

    def test_explicit_date_crosses_year_boundary(self):
        board = self.parse('# 协作板\n\n## 正在改\n- DSH 12-31 23:00 · 测试 · src/ · 预计 01-01 08:00\n', datetime(2027, 1, 1))
        self.assertEqual(board.occupancies[0].until, datetime(2027, 1, 1, 8))

    def test_old_lanes_are_read_and_have_one_migration_hint(self):
        board = self.parse('# 协作板\n\n## 各 Agent 当前\n### Codex GPT · 后端\n- 更新：2026-11-05 14:00\n- 在做：同步\n- 未提交：src/sync.py、tests/test_sync.py\n')
        self.assertEqual(len(board.hints), 1)
        self.assertIn('旧分道格式', board.hints[0][1])
        self.assertEqual(board.occupancies[0].directories, ['src/', 'tests/'])
        self.assertTrue(board.occupancies[0].legacy)

    def test_missing_or_invalid_estimate_is_a_format_hint(self):
        for value in ('', '预计 明天', '预计 25:00', '预计 11-31 08:00'):
            with self.subTest(value=value):
                board = self.parse(f'# 协作板\n\n## 正在改\n- DSH 11-05 14:05 · 测试 · tests/ · {value}\n')
                self.assertTrue(any('预计结束格式不对' in message for _, message in board.hints))
                self.assertIsNone(board.occupancies[0].until)

    def test_file_paths_and_broken_rows_are_format_hints(self):
        board = self.parse('# 协作板\n\n## 正在改\n- DSH 11-05 14:05 · 测试 · BOARD.md · 预计 15:00\n- 少了三段\n')
        self.assertEqual(len(board.hints), 2)

    def test_directory_matching_uses_components_and_allows_root(self):
        self.assertTrue(directory_contains('src/', 'src/sync/a.py'))
        self.assertFalse(directory_contains('src/', 'src-other/a.py'))
        self.assertTrue(directory_contains('./', 'README.md'))
        self.assertFalse(directory_contains('./', '../outside.py'))

    def test_as_takes_priority_over_environment(self):
        with patch.dict('os.environ', {'HW_BOARD_NAME': 'DSH 11-05 14:05'}):
            self.assertEqual(claimed_name(), 'DSH 11-05 14:05')
            self.assertEqual(claimed_name('Codex 11-05 14:20'), 'Codex 11-05 14:20')


class BoardIntegrationTests(RepoTestCase):
    def board(self, expected='预计 14:00', directory='src/', name='DSH 11-05 13:00'):
        self.write('BOARD.md', f'# 协作板\n\n## 正在改\n- {name} · 测试 · {directory} · {expected}\n\n## 留言\n')

    def test_expired_clean_directory_is_hint_without_deleting_row(self):
        self.board()
        before = (self.repo / 'BOARD.md').read_bytes()
        data = status.collect(Project(self.repo), now=NOW)
        self.assertTrue(any('这行可能已经过期，确认后删掉' in hint for hint in data['hints']))
        self.assertEqual((self.repo / 'BOARD.md').read_bytes(), before)

    def test_expired_directory_with_uncommitted_change_is_not_hint(self):
        self.board()
        self.write('src/new.txt', '正在改\n')
        data = status.collect(Project(self.repo), now=NOW)
        self.assertFalse(any('过期' in hint for hint in data['hints']))

    def test_not_expired_directory_is_not_hint(self):
        self.board('预计 15:00')
        data = status.collect(Project(self.repo), now=NOW)
        self.assertFalse(any('过期' in hint for hint in data['hints']))

    def test_status_reports_invalid_estimate(self):
        self.board('预计 明天')
        data = status.collect(Project(self.repo), now=NOW)
        self.assertTrue(any('预计结束格式不对' in hint for hint in data['hints']))

    def test_unknown_owner_overlap_alarms_and_as_claim_suppresses_it(self):
        self.board('预计 15:00')
        self.write('src/new.txt', '改动\n')
        data, code = self.check_json()
        self.assertEqual(code, 1)
        self.assertTrue(any('与 BOARD 上 DSH 11-05 13:00 的占用重叠，确认是不是你自己那行' in item['message'] for item in self.alarms(data, 'BOARD')))
        data, code = self.check_json('--as', 'DSH 11-05 13:00')
        self.assertEqual(code, 0)
        self.assertEqual(self.alarms(data, 'BOARD'), [])

    def test_claim_does_not_hide_other_owner_on_overlapping_directory(self):
        self.write('BOARD.md', '# 协作板\n\n## 正在改\n- DSH 11-05 13:00 · 测试 · src/ · 预计 15:00\n- Codex 11-05 13:10 · 同步 · src/nested/ · 预计 15:00\n')
        self.write('src/nested/new.txt', '改动\n')
        data, code = self.check_json('--as', 'DSH 11-05 13:00')
        self.assertEqual(code, 1)
        self.assertEqual(len(self.alarms(data, 'BOARD')), 1)
        self.assertIn('Codex 11-05 13:10', self.alarms(data, 'BOARD')[0]['message'])

    def test_directory_prefix_is_not_a_false_overlap(self):
        self.board(directory='src/')
        self.write('src-other/new.txt', '改动\n')
        collector = Collector()
        check_board(Project(self.repo), collector)
        self.assertEqual(collector.alarms, [])

    def test_environment_claim_and_explicit_parameter_priority(self):
        self.board('预计 15:00')
        self.write('src/new.txt', '改动\n')
        with patch.dict('os.environ', {'HW_BOARD_NAME': 'DSH 11-05 13:00'}):
            data, code = self.check_json()
            self.assertEqual(code, 0)
            data, code = self.check_json('--as', '其他对话')
            self.assertEqual(code, 1)
            data = self.json_output('status', '--as', 'Codex 11-05 13:10', '--json')
            self.assertEqual(data['as'], 'Codex 11-05 13:10')

    def test_find_shows_occupied_code_and_requirement_directories(self):
        self.write('BOARD.md', '# 协作板\n\n## 正在改\n- DSH 11-05 13:00 · 同步 · src/ · 预计 15:00\n- Codex 11-05 13:10 · 文档 · docs/需求/ · 预计 15:00\n')
        data = self.json_output('find', '同步', '--json')
        agents = data['files'][0]['board_agents']
        self.assertEqual([item['directories'] for item in agents], [['src/'], ['docs/需求/']])
        text = self.run_hw('find', '同步').stdout
        self.assertIn('占用 src/', text)
        self.assertNotIn('未提交', text)

    def test_duplicate_names_cannot_suppress_two_rows(self):
        self.write('BOARD.md', '# 协作板\n\n## 正在改\n- DSH 11-05 13:00 · 测试 · src/ · 预计 15:00\n- DSH 11-05 13:00 · 文档 · docs/ · 预计 15:00\n')
        self.write('src/new.txt', '改动\n')
        collector = Collector()
        check_board(Project(self.repo), collector, 'DSH 11-05 13:00')
        self.assertTrue(collector.alarms)


if __name__ == '__main__':
    unittest.main()
