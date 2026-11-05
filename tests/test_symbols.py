from __future__ import annotations

import contextlib
import io
import unittest
from unittest.mock import patch

from hw.check import Collector, check_anchors, touched_symbols
from hw.project import Project
from hw import status
from hw.symbols import Definition, ctags_path, definitions, matching_names
from test_hw import RepoTestCase, SYNC, VALID_TRAILERS


class QualifiedNameTests(unittest.TestCase):
    def test_separators_and_short_name(self):
        names = {'Foo::bar', 'Foo.bar', 'Foo#bar', 'Foo->bar', 'bar'}
        self.assertEqual(matching_names(Definition('Foo.bar', 1, 3), names), names)
        self.assertEqual(matching_names(Definition('Other.bar', 1, 3), {'Foo::bar'}), set())

    def test_qualified_name_suffixes_respect_segment_boundaries(self):
        names = {'bar', 'Foo::bar', 'ns.Foo.bar', 'Foo#bar', 'Foo->bar'}
        self.assertEqual(matching_names(Definition('ns.Foo.bar', 1, 3), names), names)
        self.assertEqual(matching_names(Definition('ns.Foo.bar', 1, 3), {'oo.bar', 'wrong.Foo.bar'}), set())

    def test_local_bin_lookup(self):
        with patch('hw.symbols.shutil.which', side_effect=[None, '/home/test/.local/bin/ctags']) as which:
            self.assertEqual(ctags_path(), '/home/test/.local/bin/ctags')
            self.assertEqual(which.call_count, 2)


class CtagsTests(RepoTestCase):
    def cpp_project(self):
        self.write('src/a.cpp', 'void Foo::bar() {\n  work(1);\n}\nvoid Other::bar() {\n  work(2);\n}\n')
        self.write('docs/需求/同步.md', SYNC.replace('src/sync.py: retry', 'src/a.cpp: Foo::bar'))

    @unittest.skipUnless(ctags_path(), '需要 Universal Ctags')
    def test_cpp_out_of_class_definition_and_scope(self):
        self.cpp_project()
        collector = Collector()
        check_anchors(Project(self.repo), collector)
        self.assertEqual(collector.alarms, [])
        items = definitions('src/a.cpp', (self.repo / 'src/a.cpp').read_text())
        self.assertIn(Definition('Foo.bar', 1, 3), items)
        self.commit('同步：增加类外方法\n\n' + VALID_TRAILERS)
        self.write('src/a.cpp', 'void Foo::bar() {\n  work(3);\n}\nvoid Other::bar() {\n  work(2);\n}\n')
        self.assertEqual(touched_symbols(Project(self.repo), None, 'src/a.cpp', {'Foo::bar'}), {'Foo::bar'})
        self.write('src/a.cpp', 'void Foo::bar() {\n  work(1);\n}\nvoid Other::bar() {\n  work(3);\n}\n')
        self.assertEqual(touched_symbols(Project(self.repo), None, 'src/a.cpp', {'Foo::bar'}), set())

    @unittest.skipUnless(ctags_path(), '需要 Universal Ctags')
    def test_namespaced_cpp_definition_accepts_class_qualified_anchor(self):
        self.write('src/a.cpp', 'namespace ns {\nclass Foo { void bar(); };\nvoid Foo::bar() {\n  work(1);\n}\n}\n')
        self.write('docs/需求/同步.md', SYNC.replace('src/sync.py: retry', 'src/a.cpp: Foo::bar'))
        collector = Collector()
        check_anchors(Project(self.repo), collector)
        self.assertEqual(collector.alarms, [])
        self.assertEqual(touched_symbols(Project(self.repo), None, 'src/a.cpp', {'Foo::bar'}, '??'), {'Foo::bar'})

    def test_missing_ctags_skips_non_python_symbols_and_status_hints_once(self):
        self.cpp_project()
        with patch('hw.symbols.shutil.which', return_value=None):
            collector = Collector()
            check_anchors(Project(self.repo), collector)
            self.assertEqual(collector.alarms, [])
            self.assertEqual(touched_symbols(Project(self.repo), None, 'src/a.cpp', {'Foo::bar'}, '??'), set())
            self.assertTrue(definitions('a.py', 'def foo():\n    pass\n'))
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                status.run(Project(self.repo))
            self.assertEqual(output.getvalue().count('装 universal-ctags 可检查非 Python 代码'), 1)
            self.assertEqual(status.collect(Project(self.repo))['hints'], ['装 universal-ctags 可检查非 Python 代码'])


if __name__ == '__main__':
    unittest.main()
