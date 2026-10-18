from __future__ import annotations

import unittest

from hw import blacklist
from hw.check import docs_exempted
from hw.git import status_paths
from hw.project import Project, Requirement, requirement_matches_feature
from test_hw import RepoTestCase, RULES, SYNC, VALID_TRAILERS


class SyncReviewTests(RepoTestCase):
    def worktree_alarms(self):
        data, _ = self.check_json()
        return [issue for issue in self.alarms(data, '文档') if issue['location'] == '工作区']

    def test_unanchored_python_function_does_not_belong_to_previous_anchor(self):
        source = 'def retry():\n    return 1\n\ndef helper():\n    return 2\n'
        self.write('src/sync.py', source)
        self.commit('同步：增加辅助函数\n\n' + VALID_TRAILERS.replace('Docs: docs/需求/同步.md', 'Docs: 未改，行为不变'))
        self.write('src/sync.py', source.replace('return 2', 'return 3'))
        self.assertEqual(self.worktree_alarms(), [])

    def test_call_to_other_anchor_does_not_replace_enclosing_function(self):
        self.write('src/sync.py', 'def retry():\n    return helper(1)\n\ndef helper(x):\n    return x\n')
        self.write('docs/需求/辅助.md', '# 辅助\n\n## 现在\n计算。\n\n## 代码\n- src/sync.py: helper\n')
        self.commit('同步：引用辅助函数\n\n' + VALID_TRAILERS.replace('Feature: 同步', 'Feature: 同步、辅助'))
        self.write('src/sync.py', 'def retry():\n    return helper(2)\n\ndef helper(x):\n    return x\n')
        alarms = self.worktree_alarms()
        self.assertEqual(len(alarms), 1)
        self.assertIn('同步.md', alarms[0]['message'])

    def test_javascript_scopes_do_not_leak(self):
        source = 'function retry() {\n  return 1;\n}\nfunction helper() {\n  return 2;\n}\n'
        self.write('src/sync.js', source)
        self.write('docs/需求/同步.md', SYNC.replace('src/sync.py: retry', 'src/sync.js: retry'))
        self.commit('同步：使用脚本\n\n' + VALID_TRAILERS)
        self.write('src/sync.js', source.replace('return 2', 'return 3'))
        self.assertEqual(self.worktree_alarms(), [])

    def test_module_change_does_not_belong_to_last_function(self):
        source = 'def retry():\n    return 1\n\nVALUE = 2\n'
        self.write('src/sync.py', source)
        self.commit('同步：增加常量\n\n' + VALID_TRAILERS.replace('Docs: docs/需求/同步.md', 'Docs: 未改，行为不变'))
        self.write('src/sync.py', source.replace('VALUE = 2', 'VALUE = 3'))
        self.assertEqual(self.worktree_alarms(), [])

    def test_changed_docs_do_not_excuse_missing_feature(self):
        self.write('src/sync.py', 'def retry():\n    return 2\n')
        self.write('docs/需求/同步.md', SYNC.replace('逐操作同步。', '重试两次。'))
        commit = self.commit('同步：调整重试\n\n' + VALID_TRAILERS.replace('Feature: 同步', 'Feature: 登录'))
        data, _ = self.check_json()
        self.assertTrue(any(issue['location'] == f'提交 {commit}' and 'Feature 未包含' in issue['message'] for issue in self.alarms(data, '文档')))

    def test_calls_comments_and_longer_names_are_not_definitions(self):
        self.write('src/sync.py', '# retry\ndef retry_later():\n    return retry()\n')
        data, _ = self.check_json()
        self.assertTrue(any('找不到符号：retry' in issue['message'] for issue in self.alarms(data, '文档')))

    def test_backticks_in_anchors(self):
        self.write('docs/需求/同步.md', SYNC.replace('src/sync.py: retry', '`src/sync.py`: `retry`'))
        data, _ = self.check_json()
        self.assertEqual(self.alarms(data, '文档'), [])

    def test_new_directory_lists_individual_code_files(self):
        self.write('new/module.py', 'VALUE = 1\n')
        data, _ = self.check_json()
        self.assertTrue(any('new/module.py' in issue['message'] for issue in self.hints(data, '文档')))

    def test_spaces_in_tracked_paths(self):
        self.write('src/with space.py', 'def retry():\n    return 1\n')
        self.write('docs/需求/同步.md', SYNC.replace('src/sync.py', 'src/with space.py'))
        self.commit('同步：移动脚本\n\n' + VALID_TRAILERS)
        self.write('src/with space.py', 'def retry():\n    return 2\n')
        self.assertIn('src/with space.py', status_paths(self.repo))
        self.assertEqual(len(self.worktree_alarms()), 1)

    def test_staged_rename_checks_old_anchor(self):
        self.git('mv', 'src/sync.py', 'src/renamed.py')
        self.assertTrue(any('同步.md' in issue['message'] for issue in self.worktree_alarms()))

    def test_staged_code_is_checked(self):
        self.write('src/sync.py', 'def retry():\n    return 2\n')
        self.git('add', 'src/sync.py')
        self.assertEqual(len(self.worktree_alarms()), 1)

    def test_requirements_exclude_rules_templates_and_raw_materials(self):
        self.write('RULES.md', RULES + '\n| 模板 | templates/ | 安装模板 |\n| 原件 | sources/ | 原样保存 |\n')
        self.write('templates/需求.md', SYNC)
        self.write('sources/旧需求.md', SYNC)
        self.assertEqual([item.path for item in Project(self.repo).requirements], ['docs/需求/同步.md'])

    def test_old_commits_do_not_use_new_requirement_anchors(self):
        self.write('src/later.py', 'def later():\n    return 1\n')
        old = self.commit('其他：新代码\n\nFeature: 无\nCode: src/later.py\nDocs: 未改，尚无功能变更\nVerified: 无')
        self.write('docs/需求/后来.md', '# 后来\n\n## 现在\n新功能。\n\n## 代码\n- src/later.py: later\n')
        self.commit('后来：建立需求\n\nFeature: 后来\nCode: 无\nDocs: docs/需求/后来.md\nVerified: 无')
        data, _ = self.check_json()
        self.assertFalse(any(issue['location'] == f'提交 {old}' and '后来' in issue['message'] for issue in self.alarms(data, '文档')))

    def test_cutoff_survives_more_than_ten_unformatted_commits(self):
        for number in range(11):
            self.write('README.md', f'# 项目\n\n说明 {number}。\n')
            self.commit('更新说明')
        data, _ = self.check_json()
        self.assertEqual(len(self.alarms(data, '提交')), 10)

    def test_since_does_not_erase_integration_boundary(self):
        base = self.git('rev-parse', 'HEAD').strip()
        self.write('README.md', '# 项目\n\n说明更新。\n')
        self.commit('更新说明')
        data, _ = self.check_json('--since', base)
        self.assertEqual(len(self.alarms(data, '提交')), 1)


class TextReviewTests(unittest.TestCase):
    def test_docs_reason_must_be_explicit(self):
        for value in ('未改', 'docs/未改变.md', '未改变行为', '未改，'):
            with self.subTest(value=value):
                self.assertFalse(docs_exempted(value))
        self.assertTrue(docs_exempted('未改，纯重构，行为不变'))

    def test_feature_paths_and_research_line_names(self):
        item = Requirement('research/低温/README.md', '低温计算', {})
        self.assertTrue(requirement_matches_feature(item, 'research/低温/README.md'))
        self.assertTrue(requirement_matches_feature(item, '低温'))
        self.assertFalse(requirement_matches_feature(item, 'README'))

    def test_normal_chinese_and_identifiers_are_quiet(self):
        text = '# 说明\n\n设计已确认。本文件说明。\n甲、乙、丙、丁。\n说明——补充。\n列出：\n下一步：\nM1 芯片与 C500 模型。\n'
        self.assertEqual(blacklist.scan_text('说明.md', text), [])

    def test_confirmation_label_still_suggests_edit(self):
        self.assertTrue(blacklist.scan_text('说明.md', '【已确认】结果。'))

    def test_contrast_sentence_never_alarms(self):
        findings = blacklist.scan_text('说明.md', '\n\n'.join(['不是数量，而是质量。'] * 5))
        self.assertTrue(findings)
        self.assertTrue(all(item.level == 'hint' for item in findings))

    def test_quoted_examples_urls_and_paths_are_not_prose(self):
        self.assertEqual(blacklist.scan_text('说明.md', '> 已核验\n\n[实验](research/2026-10-10-pack-v2/)\n\n旧路径 research/2026-10-10-pack-v2/。'), [])

    def test_slash_in_prose_does_not_hide_audit_label(self):
        findings = blacklist.scan_text('说明.md', '入口认证边界/别名跳转已核验。')
        self.assertTrue(any('B1' in item.message for item in findings))

    def test_product_limits_are_distinct_from_verification_disclaimers(self):
        self.assertEqual(blacklist.scan_text('说明.md', 'SQLite 历史不替代离机备份。'), [])
        self.assertTrue(any(item.level == 'alarm' for item in blacklist.scan_text('说明.md', '本次验证不替代用户验收。')))


class ReadmeReviewTests(RepoTestCase):
    def test_user_description_and_file_index_are_quiet(self):
        self.write('README.md', '# 给用 Agent 做项目的人看\n\n| 文件 | 内容 |\n| --- | --- |\n| STATUS.md | 下一步、进度 |\n\n工作规则见 [AGENTS.md](docs/需求/AGENTS.md)。\n')
        data, _ = self.check_json()
        self.assertEqual(self.hints(data, 'README'), [])

    def test_actual_progress_and_agent_instructions_are_reported(self):
        self.write('README.md', '# 项目\n\n## 下一步\n实现同步。\n\nAgent 必须先读 RULES.md。\n')
        data, _ = self.check_json()
        self.assertEqual(len(self.hints(data, 'README')), 2)


class AdditionalSyncReviewTests(RepoTestCase):
    def test_preintegration_code_change_is_not_checked_against_new_docs(self):
        self.git('checkout', '--orphan', 'before-integration')
        self.write('src/sync.py', 'def retry():\n    return 2\n')
        old = self.commit('旧版代码')
        self.write('README.md', '# 项目\n\n接入。\n')
        self.commit('同步：接入\n\n' + VALID_TRAILERS.replace('Docs: docs/需求/同步.md', 'Docs: 未改，建立提交格式'))
        data, _ = self.check_json()
        self.assertFalse(any(issue['location'] == f'提交 {old}' for issue in data['alarms'] + data['hints']))

    def test_decorators_and_qualified_methods_have_correct_owners(self):
        source = 'class First:\n    @decorator(1)\n    def retry(self):\n        return 1\n\nclass Second:\n    def retry(self):\n        return 2\n'
        self.write('src/sync.py', source)
        self.write('docs/需求/同步.md', SYNC.replace(': retry', ': First.retry'))
        self.commit('同步：类方法\n\n' + VALID_TRAILERS)
        self.write('src/sync.py', source.replace('return 2', 'return 3'))
        data, _ = self.check_json()
        self.assertFalse(any(issue['location'] == '工作区' for issue in self.alarms(data, '文档')))
        self.write('src/sync.py', source.replace('decorator(1)', 'decorator(2)'))
        data, _ = self.check_json()
        self.assertTrue(any(issue['location'] == '工作区' for issue in self.alarms(data, '文档')))

    def test_broken_python_reports_path_instead_of_guessing_ownership(self):
        self.write('src/sync.py', 'def retry(:\n')
        process = self.run_hw('check')
        self.assertEqual(process.returncode, 2)
        self.assertIn('sync.py:1', process.stdout)
        self.assertNotIn('Traceback', process.stderr)

    def test_same_basename_in_another_directory_is_not_the_anchor(self):
        self.write('other/src/other.py', 'def other():\n    return 2\n')
        data, _ = self.check_json()
        self.assertFalse(any(issue['location'] == '工作区' for issue in self.alarms(data, '文档')))

    def test_board_instruction_is_not_a_completed_list(self):
        self.write('BOARD.md', '# 协作板\n\n不写已完成的事。\n')
        data, _ = self.check_json()
        self.assertEqual(self.hints(data, 'BOARD'), [])
        self.write('BOARD.md', '# 协作板\n\n## 已完成\n- 同步。\n')
        data, _ = self.check_json()
        self.assertEqual(len(self.hints(data, 'BOARD')), 1)


if __name__ == "__main__":
    unittest.main()
