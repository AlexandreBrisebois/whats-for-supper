import contextlib
import io
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import finish
import test_ops


class StatelessCompletionTests(unittest.TestCase):
    def test_prepare_requires_explicit_paths_before_any_write(self):
        with mock.patch.object(sys, 'argv', ['finish.py', '--prepare']), \
             mock.patch.object(test_ops, 'get_changed_files', return_value=['pwa/src/example.ts']), \
             mock.patch.object(finish, 'prepare') as prepare, \
             contextlib.redirect_stderr(io.StringIO()), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(finish.main(), 2)
        prepare.assert_not_called()

    def test_prepare_uses_only_explicit_changed_paths(self):
        with mock.patch.object(sys, 'argv', ['finish.py', '--prepare', 'docs/task.md']), \
             mock.patch.object(test_ops, 'get_changed_files', return_value=['docs/task.md', 'pwa/src/ambient.ts']), \
             mock.patch.object(finish, 'prepare', return_value=0) as prepare, \
             contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(finish.main(), 0)
        prepare.assert_called_once_with(['docs/task.md'])

    def test_finish_defaults_to_git_changes_without_session_manifest(self):
        with tempfile.TemporaryDirectory() as tmp, \
             mock.patch.object(finish, 'ROOT', Path(tmp)), \
             mock.patch.object(sys, 'argv', ['finish.py']), \
             mock.patch.object(test_ops, 'get_changed_files', return_value=['docs/task.md']), \
             mock.patch.object(finish, 'verify', return_value={'documentation': {'status': 'passed'}}) as verify, \
             contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(finish.main(), 0)
        verify.assert_called_once_with(['documentation'], ['docs/task.md'])

    def test_explicit_paths_cannot_escape_repository_or_hide_non_changes(self):
        for path in ['../outside.ts', '/tmp/outside.ts', 'docs/unchanged.md']:
            with self.subTest(path=path), \
                 mock.patch.object(sys, 'argv', ['finish.py', '--prepare', path]), \
                 mock.patch.object(test_ops, 'get_changed_files', return_value=['docs/task.md']), \
                 mock.patch.object(finish, 'prepare') as prepare, \
                 contextlib.redirect_stderr(io.StringIO()), contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(finish.main(), 2)
            prepare.assert_not_called()

    def test_impact_uses_current_git_changes_without_begin(self):
        with mock.patch.object(test_ops, 'get_changed_files', return_value=['docs/task.md']) as changes, \
             contextlib.redirect_stdout(io.StringIO()):
            test_ops.run_impacted()
        changes.assert_called_once()

    def test_finish_passes_selected_paths_to_impact_runner(self):
        with mock.patch.object(finish, 'run_command', return_value=('passed', 'ok')) as run:
            self.assertEqual(finish.run_check('agent:test:impact', ['pwa/src/example.ts']), ('passed', 'ok'))
        run.assert_called_once_with([sys.executable, '-B', 'scripts/agent/test_ops.py', '--impact', '--files', 'pwa/src/example.ts'])
