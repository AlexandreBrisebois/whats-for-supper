import contextlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import finish


class ParallelDocumentationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        subprocess.run(['git', 'init', '-q', str(self.root)], check=True)
        self.selected = 'openspec/changes/cooking/proposal.md'
        self.write(self.selected, 'Cooking proposal\n')
        self.write('openspec/changes/cooking/specs/cooking/spec.md',
                   '## ADDED Requirements\n')
        self.write('openspec/specs/cooking/spec.md', 'Main cooking\n')
        self.write('openspec/changes/groceries/proposal.md', 'Incomplete unrelated draft\n')
        self.patch = mock.patch.object(finish, 'ROOT', self.root)
        self.patch.start()
        self.addCleanup(self.patch.stop)

    def write(self, name, text):
        p = self.root / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)

    def run_scoped(self, mutate=None, spec_result=('passed', 'selected valid')):
        def run_check(check, paths):
            if mutate:
                mutate()
            return 'passed', 'docs valid'
        with mock.patch.object(finish, 'run_check', side_effect=run_check), \
             mock.patch.object(finish, 'run_command', return_value=spec_result) as run:
            result = finish.verify(['documentation', 'spec:check'], [self.selected],
                                   scoped_documentation=True)
        return result, run

    def test_explicit_docs_survive_unrelated_writer_through_public_entrypoint(self):
        def check(_check, _paths):
            self.write('openspec/changes/groceries/proposal.md', 'Concurrent writer\n')
            return 'passed', 'ok'
        with mock.patch.object(sys, 'argv', ['finish.py', self.selected]), \
             mock.patch.object(finish.test_ops, 'get_changed_files', return_value=[self.selected]), \
             mock.patch.object(finish.test_ops, 'runtime_identity', return_value='test-runtime'), \
             mock.patch.object(finish, 'run_check', side_effect=check), \
             mock.patch.object(finish, 'run_command', return_value=('passed', 'ok')), \
             contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(finish.main(), 0)

    def test_another_agents_incomplete_draft_does_not_invalidate_selected_docs(self):
        result, run = self.run_scoped(lambda: self.write(
            'openspec/changes/groceries/proposal.md', 'Another agent is still writing\n'))
        self.assertEqual(result['content']['status'], 'passed')
        self.assertEqual(result['spec:check']['status'], 'passed')
        run.assert_called_once_with(['task', 'spec:check', '--', 'cooking', '--type', 'change'])
        self.assertEqual(result['content']['scope'], 'selected-documentation')
        self.assertNotIn('openspec/changes/groceries/proposal.md',
                         result['content']['input_paths'])

    def test_selected_artifact_dependency_and_harness_mutations_still_fail(self):
        for name in [self.selected, 'openspec/changes/cooking/.openspec.yaml',
                     'openspec/changes/cooking/tasks.md',
                     'openspec/specs/cooking/spec.md', 'openspec/config.yaml',
                     'scripts/agent/finish.py', 'Taskfile.yml']:
            with self.subTest(name=name):
                result, run = self.run_scoped(lambda: self.write(name, 'Changed\n'))
                self.assertEqual(result['content']['status'], 'failed')
                self.assertEqual(result['spec:check']['status'], 'not-run')
                run.assert_not_called()
                (self.root / name).unlink()

    def test_referenced_shared_main_spec_is_a_dependency(self):
        self.write(self.selected, '[Owner](../../../openspec/specs/identity/spec.md)\n')
        self.write('openspec/specs/identity/spec.md', 'Owner\n')
        result, _ = self.run_scoped(lambda: self.write(
            'openspec/specs/identity/spec.md', 'Changed shared policy\n'))
        self.assertEqual(result['content']['status'], 'failed')

    def test_removing_a_documentation_link_target_is_detected(self):
        self.write(self.selected, '[Source](../../../pwa/source.ts)\n')
        self.write('pwa/source.ts', 'source\n')
        result, _ = self.run_scoped(lambda: (self.root / 'pwa/source.ts').unlink())
        self.assertEqual(result['content']['status'], 'failed')

    def test_selected_staged_changes_are_part_of_content_identity(self):
        def change_index_only():
            self.write(self.selected, 'Staged replacement\n')
            subprocess.run(['git', 'add', self.selected], cwd=self.root, check=True)
            self.write(self.selected, 'Cooking proposal\n')
        result, _ = self.run_scoped(change_index_only)
        self.assertEqual(result['content']['status'], 'failed')

    def test_selected_invalid_spec_remains_failed(self):
        result, _ = self.run_scoped(spec_result=('failed', 'invalid selected delta'))
        self.assertEqual(result['spec:check']['status'], 'failed')
        self.assertEqual(result['content']['status'], 'passed')

    def test_main_spec_and_change_with_same_name_are_not_ambiguous(self):
        paths = [self.selected, 'openspec/specs/cooking/spec.md']
        with mock.patch.object(finish, 'run_command', return_value=('passed', 'ok')) as run:
            self.assertEqual(finish.documentation_spec_check(paths)[0], 'passed')
        self.assertEqual(run.call_args_list, [
            mock.call(['task', 'spec:check', '--', 'cooking', '--type', 'change']),
            mock.call(['task', 'spec:check', '--', 'cooking', '--type', 'spec'])])

    def test_only_explicit_recognized_documentation_uses_scoped_verification(self):
        for paths, expected in [([self.selected], True),
                                ([self.selected, 'api/source.cs'], False),
                                (['openspec/config.yaml'], False),
                                (['unknown.bin'], False),
                                (['openspec/changes/archive/old/tasks.md'], False)]:
            with self.subTest(paths=paths):
                self.assertEqual(finish.can_scope_documentation(paths), expected)

    def test_each_invocation_keeps_its_own_record_and_latest_stays_valid_json(self):
        records = []
        for _ in range(2):
            with mock.patch.object(sys, 'argv', ['finish.py']), \
                 mock.patch.object(finish.test_ops, 'get_changed_files', return_value=['docs/task.md']), \
                 mock.patch.object(finish, 'verify', return_value={'documentation': {'status': 'passed'}}), \
                 contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(finish.main(), 0)
            records.append(json.loads((self.root / '.task/agent-finish/last-run.json').read_text()))
        self.assertNotEqual(records[0]['record_path'], records[1]['record_path'])
        for record in records:
            self.assertEqual(json.loads((self.root / record['record_path']).read_text()), record)
        self.assertEqual(len(list((self.root / '.task/agent-finish/runs').glob('*.json'))), 2)
