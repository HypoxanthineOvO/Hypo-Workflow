from __future__ import annotations

import unittest
from pathlib import Path

from hw import blacklist
from hw.check import Collector, check_review_levels
from hw.project import Project, parse_review_levels, section_map
from test_hw import ROOT, RULES, RepoTestCase, VALID_TRAILERS


GRADING = '''
## 审核分级

| 级别 | 通用定义 | 本项目的例子 | 阻塞吗 |
| --- | --- | --- | --- |
| P0 | 悄悄出错 | 漏报真实问题 | 是 |
| P1 | 明显出错 | 命令崩溃 | 是 |
| P2 | 以后有代价 | 缺少回归测试 | 否 |
| P3 | 纯偏好 | 同义命名 | 否 |
'''


class ReviewTableTests(unittest.TestCase):
    def test_only_level_column_in_review_table_defines_names(self):
        text = '# 项目规则\n' + GRADING.replace('| P0 |', '| `致命` |')
        levels = parse_review_levels(text + '\n## 其他\n| 假级别 | 假定义 | 假例子 | 是 |\n')
        self.assertEqual([level.name for level in levels], ['致命', 'P1', 'P2', 'P3'])
        self.assertEqual(levels[0].example, '漏报真实问题')

    def test_fenced_table_is_not_configuration(self):
        self.assertEqual(parse_review_levels('# 规则\n## 审核分级\n```md\n' + GRADING.split('## 审核分级\n')[1] + '```\n'), [])

    def test_defined_names_do_not_hide_undefined_names_on_same_line(self):
        findings = blacklist.scan_text('说明.md', 'P0 P1', review_levels={'P0'})
        self.assertEqual(len(findings), 1)
        self.assertIn('P1', findings[0].message)
        self.assertEqual(blacklist.scan_text('说明.md', 'P0', review_levels={'P0'}), [])
        self.assertTrue(blacklist.scan_text('说明.md', 'P0'))

    def test_level_names_adjacent_to_chinese_are_exempt_but_identifiers_are_not(self):
        self.assertEqual(blacklist.without_review_levels('这是P0级问题，修P1问题', {'P0', 'P1'}), '这是  级问题，修  问题')
        self.assertEqual(blacklist.without_review_levels('XP0 P01', {'P0'}), 'XP0 P01')

    def test_exemptions_apply_only_to_number_rules(self):
        findings = blacklist.scan_text('说明.md', '已核验', review_levels={'已核验'})
        self.assertTrue(any(item.level == 'alarm' for item in findings))

    def test_shared_rules_and_fixed_definitions_match(self):
        self.assertEqual((ROOT / 'AGENTS.md').read_text(), (ROOT / 'skills/init/templates/AGENTS.md').read_text())
        project = parse_review_levels((ROOT / 'RULES.md').read_text())
        template = parse_review_levels((ROOT / 'skills/init/templates/RULES.md').read_text())
        self.assertEqual([(item.name, item.definition, item.blocking) for item in project], [(item.name, item.definition, item.blocking) for item in template])
        self.assertTrue(all(item.example == '（填）' for item in template))
        self.assertTrue(all('（填）' not in item.example for item in project))
        for name in ('RULES.md', 'skills/init/templates/RULES.md'):
            sections = section_map((ROOT / name).read_text())
            self.assertIn('红线', sections)
            self.assertNotIn('禁区', sections)
            self.assertNotIn('分工', sections)


class ReviewRuleChecks(RepoTestCase):
    def test_missing_grading_is_hint(self):
        collector = Collector()
        check_review_levels(Project(self.repo), collector)
        self.assertEqual(collector.alarms, [])
        self.assertEqual(len(collector.hints), 1)
        self.assertIn('缺少', collector.hints[0].message)

    def test_empty_table_and_placeholder_examples_are_hints(self):
        for grading, expected in [('\n## 审核分级\n', '有效表格'), (GRADING.replace('漏报真实问题', '（填）').replace('命令崩溃', '(填)'), 'P0、P1')]:
            with self.subTest(grading=grading):
                self.write('RULES.md', RULES + grading)
                collector = Collector()
                check_review_levels(Project(self.repo), collector)
                self.assertEqual(collector.alarms, [])
                self.assertEqual(len(collector.hints), 1)
                self.assertIn(expected, collector.hints[0].message)

    def test_defined_levels_are_quiet_in_documents_and_commits(self):
        self.write('RULES.md', RULES + GRADING)
        self.write('STATUS.md', '# 进度\n\n## 以后\n- P2 补充测试。\n- P3 调整命名。\n')
        self.commit('审核：修复 P0/P1\n\nP0 P1 P2 P3。\n\n' + VALID_TRAILERS.replace('Docs: docs/需求/同步.md', 'Docs: 未改，只调整项目规则'))
        data, code = self.check_json()
        self.assertEqual(code, 0)
        self.assertEqual(self.alarms(data), [])
        self.assertEqual(self.hints(data, '黑词'), [])
        self.assertEqual(self.hints(data, '规则'), [])

    def test_custom_names_exempt_blacklist_subject_and_readme_number_checks(self):
        grading = GRADING.replace('P0', 'M1').replace('P1', 'C12').replace('P2', 'Stage 1').replace('P3', 'abc1234')
        self.write('RULES.md', RULES + grading)
        self.write('STATUS.md', '# 进度\n\n阶段 M1、C12、Stage 1、abc1234。\n')
        self.write('README.md', '# 项目\n\nM1 级意见。\n')
        self.commit('审核：处理M1级、修C12问题、Stage 1、abc1234\n\n阶段 M1、C12、Stage 1。\n\n' + VALID_TRAILERS.replace('Docs: docs/需求/同步.md', 'Docs: 未改，只调整项目规则'))
        data, code = self.check_json()
        self.assertEqual(code, 0)
        self.assertEqual(self.alarms(data), [])
        self.assertEqual(self.hints(data, '黑词'), [])
        self.assertEqual(self.hints(data, 'README'), [])

    def test_check_does_not_write_or_remove_project_files(self):
        self.write('src/a.cpp', 'void Foo::bar() {}\n')
        self.write('docs/需求/类方法.md', '# 类方法\n\n## 代码\n- src/a.cpp: Foo::bar\n')
        def snapshot():
            return {path.relative_to(self.repo).as_posix(): path.read_bytes() for path in self.repo.rglob('*') if path.is_file() and '.git' not in path.relative_to(self.repo).parts}
        before = snapshot()
        self.check_json()
        self.assertEqual(snapshot(), before)


if __name__ == '__main__':
    unittest.main()
