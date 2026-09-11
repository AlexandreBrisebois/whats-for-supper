import importlib.util
import contextlib
import io
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))
import test_ops
import drift


class CompletionTests(unittest.TestCase):
    def finish(self):
        import finish
        return finish

    def test_unknown_and_unmapped_application_impact_runs_all(self):
        for path in ['mystery.bin', 'pwa/src/components/NewWidget.tsx',
                     'api/src/RecipeApi/Services/NewService.cs', 'pwa/e2e/new-helper.ts']:
            with self.subTest(path=path):
                self.assertTrue(test_ops.build_impact_plan([path]).run_all)

    def test_documentation_has_no_e2e_impact(self):
        self.assertFalse(test_ops.build_impact_plan(['docs/help.md']).tests)

    def test_mixed_and_unknown_checks_take_union(self):
        f = self.finish()
        docs = set(f.checks_for(['docs/help.md']))
        harness = set(f.checks_for(['scripts/agent/test_ops.py']))
        app = set(f.checks_for(['pwa/src/app/page.tsx']))
        self.assertEqual(set(f.checks_for(['docs/help.md', 'scripts/agent/test_ops.py',
                                         'pwa/src/app/page.tsx'])), docs | harness | app)
        self.assertTrue((docs | harness | app) <= set(f.checks_for(['unknown.bin'])))
        self.assertIn('database-behavior', f.checks_for(['specs/sql/tables.sql']))

    def test_digest_includes_unchanged_sources_selected_tests_and_runtime(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            p = root / 'unchanged.ts'; p.write_text('one')
            with mock.patch.object(test_ops, 'runtime_identity', return_value='runtime-one'):
                before = test_ops.build_impact_digest(root, [], [])
                p.write_text('two')
                after = test_ops.build_impact_digest(root, [], [])
            self.assertNotEqual(before, after)
            with mock.patch.object(test_ops, 'runtime_identity', return_value='runtime-two'):
                self.assertNotEqual(after, test_ops.build_impact_digest(root, [], []))

    def test_unavailable_service_is_blocked_not_zero_mismatches(self):
        with mock.patch('urllib.request.urlopen', side_effect=OSError('unavailable')) as probe:
            self.assertIsNone(drift.run_endpoint_diff(verbose=False))
        self.assertEqual(probe.call_count, 1)
        with mock.patch.object(sys, 'argv', ['drift.py', '--endpoint-diff']), \
             mock.patch.object(drift, 'run_endpoint_diff', return_value=None), \
             contextlib.redirect_stdout(io.StringIO()) as output:
            with self.assertRaises(SystemExit) as result:
                drift.main()
        self.assertEqual(result.exception.code, 2)
        self.assertNotIn('No drift detected', output.getvalue())

    def test_final_validation_detects_mutation_and_keeps_remaining_not_run(self):
        f = self.finish()
        with mock.patch.object(f, 'identity', side_effect=['before', 'after']), \
             mock.patch.object(f, 'run_check', return_value=('passed', 'ok')):
            results = f.verify(['documentation', 'test:agent'])
        self.assertEqual(results['content']['status'], 'failed')
        self.assertEqual(results['test:agent']['status'], 'not-run')

    def test_blocked_check_does_not_skip_independent_checks(self):
        f = self.finish()
        with mock.patch.object(f, 'identity', return_value='same'), \
             mock.patch.object(f, 'run_check', side_effect=[('blocked', 'no DB'), ('passed', 'ok')]):
            results = f.verify(['database-behavior', 'test:agent'])
        self.assertEqual(results['database-behavior']['status'], 'blocked')
        self.assertEqual(results['test:agent']['status'], 'passed')

    def test_timeout_stops_process_group_once_without_retry(self):
        f = self.finish()
        child = mock.Mock(pid=9876)
        child.wait.side_effect = [subprocess.TimeoutExpired('task', 1), -9]
        with mock.patch.object(f.subprocess, 'Popen', return_value=child) as spawn, \
             mock.patch.object(f.os, 'killpg') as kill:
            self.assertEqual(f.run_command(['task', 'x'], timeout=1)[0], 'blocked')
        self.assertEqual(spawn.call_count, 1)
        kill.assert_called_once()
        self.assertEqual(child.wait.call_count, 2)

    def test_interruption_stops_child_and_records_blocked(self):
        f = self.finish()
        child = mock.Mock(pid=9876)
        child.wait.side_effect = [KeyboardInterrupt(), -9]
        with mock.patch.object(f.subprocess, 'Popen', return_value=child), \
             mock.patch.object(f.os, 'killpg') as kill:
            self.assertEqual(f.run_command(['task', 'x'])[0], 'blocked')
        kill.assert_called_once()

    def test_reconciliation_does_not_hide_missing_controller_when_api_unavailable(self):
        import api_tools
        endpoint = {'method': 'GET', 'path': '/api/example'}
        with mock.patch.object(api_tools, 'load_spec', return_value={}), \
             mock.patch.object(api_tools, 'get_spec_endpoints', return_value=[endpoint]), \
             mock.patch.object(api_tools, 'get_mock_endpoints', return_value=[endpoint]), \
             mock.patch.object(api_tools, 'get_real_endpoints', return_value=[]), \
             mock.patch.object(api_tools, 'is_api_reachable', return_value=False) as probe, \
             contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(SystemExit):
                api_tools.reconcile()
        probe.assert_not_called()

    def test_spec_diff_is_documentation_but_unknown_preparation_blocks_before_writes(self):
        f = self.finish()
        self.assertEqual(f.classes_for(['.kiro/specs/example/change.patch']), {'documentation'})
        with mock.patch.object(f, 'run_command') as run:
            self.assertEqual(f.prepare(['unknown.bin']), 2)
        run.assert_not_called()

    def test_prepare_generation_and_format_precede_any_verification(self):
        f = self.finish()
        with mock.patch.object(f, 'run_command', return_value=('passed', 'ok')) as run:
            self.assertEqual(f.prepare(['specs/openapi.yaml']), 0)
        self.assertEqual(run.call_args_list, [mock.call(['task', 'gen:client']),
                                             mock.call(['task', 'format'])])

    def test_documentation_checks_new_links_without_expanding_legacy_cleanup(self):
        f = self.finish()
        self.assertEqual(f.introduced_links('[old](missing.md) [new](new.md)',
                                            '[old](missing.md)'), ['new.md'])

    def test_audit_preserves_discovery_and_semantic_assertions(self):
        import test_audit
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = root / 'pwa/e2e/example.spec.ts'
            spec.parent.mkdir(parents=True)
            spec.write_text("await page.getByTestId('save').click();\n"
                            "await expect(page.getByRole('button', {name: 'Save'})).toBeVisible();")
            self.assertEqual(test_audit.find_tests(tmp, 'Save')[1], [str(spec)])
            self.assertNotIn('selector', test_audit.analyze_e2e(str(spec), tmp))

    def test_taskfile_final_validation_has_no_format_or_process_kill(self):
        import yaml
        tasks = yaml.safe_load((SCRIPTS.parents[1] / 'Taskfile.yml').read_text())['tasks']
        self.assertEqual(tasks['agent:finish']['cmds'], ['python3 -B scripts/agent/finish.py'])
        self.assertIn('python3 -B -m unittest', tasks['test:agent']['cmds'][0])
        self.assertNotIn({'task': 'format'}, tasks['review']['cmds'])
        self.assertIn('format:check:pwa', tasks['review:validate']['deps'])
        self.assertNotIn({'task': 'dev:kill'}, tasks['review']['cmds'])
        self.assertNotIn({'task': 'test:kill'}, tasks['review']['cmds'])


if __name__ == '__main__':
    unittest.main()
