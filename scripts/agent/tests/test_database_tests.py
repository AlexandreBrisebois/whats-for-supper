import contextlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class DatabaseTests(unittest.TestCase):
    def setUp(self):
        import database_tests
        self.runner = database_tests
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.calls = []
        self.outcomes = ['Passed']
        self.test_exit = 0
        self.bootstrap_failure = False

    def command(self, args, **kwargs):
        self.calls.append(args)
        if 'run' in args and self.bootstrap_failure:
            raise self.runner.Unavailable('Docker unavailable')
        if '{{.Image}}' in args:
            return 'sha256:fixture-image'
        if 'inspect' in args:
            return json.dumps({'5432/tcp': [{'HostPort': '54321'}]})
        return ''

    def fake_tests(self, args, env, log):
        self.calls.append(args)
        self.assertTrue(env['WFS_TEST_POSTGRES_CONNECTION'])
        self.assertIn('PostgresTests', args[args.index('--filter') + 1])
        self.assertIn('!~LiveBrowser_', args[args.index('--filter') + 1])
        results = Path(args[args.index('--results-directory') + 1])
        results.mkdir(parents=True, exist_ok=True)
        (results / 'database.trx').write_text('<TestRun xmlns="http://microsoft.com/schemas/VisualStudio/TeamTest/2010"><Results>' + ''.join(
            f'<UnitTestResult testName="RecipeApi.Tests.Integration.SamplePostgresTests.Case{i}" outcome="{outcome}" />'
            for i, outcome in enumerate(self.outcomes)) + '</Results></TestRun>')
        Path(log).write_text('test output\n')
        return self.test_exit

    def run_gate(self, connection=None, identity_values=None, **kwargs):
        environment = {'WFS_TEST_POSTGRES_CONNECTION': connection} if connection else {}
        with mock.patch.object(self.runner, 'ROOT', self.root), \
             mock.patch.dict(os.environ, environment, clear=True), \
             mock.patch.object(self.runner.shutil, 'which', return_value='/tool'), \
             mock.patch.object(self.runner, 'postgres_image', return_value='pgvector/pgvector:fixture'), \
             mock.patch.object(self.runner, 'command', side_effect=self.command), \
             mock.patch.object(self.runner, 'execute_tests', side_effect=self.fake_tests), \
             mock.patch.object(self.runner.test_ops, 'build_impact_digest', side_effect=identity_values or ['same', 'same']), \
             mock.patch.object(self.runner.test_ops, 'get_changed_files', return_value=[]), \
             contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            status, detail = self.runner.run_database_tests(**kwargs)
        record = json.loads(next(self.root.glob('.task/database-tests/runs/*/result.json')).read_text())
        self.assertIn(record['record_path'], detail)
        return status, record

    def test_automatic_database_has_unique_container_loopback_port_no_compose_and_cleanup(self):
        status, record = self.run_gate()
        self.assertEqual(status, 'passed')
        create = next(c for c in self.calls if c[:2] == ['docker', 'run'])
        self.assertIn('127.0.0.1::5432', create)
        self.assertIn('POSTGRES_PASSWORD', create)
        self.assertNotIn('compose', [arg for c in self.calls for arg in c])
        self.assertEqual(self.calls[-1][:3], ['docker', 'rm', '--force'])
        self.assertEqual(record['database']['source'], 'temporary-container')
        self.assertEqual(record['passed'], 1)
        ready = next(c for c in self.calls if 'pg_isready' in c)
        self.assertIn('-h', ready)
        self.assertIn('127.0.0.1', ready)
        self.assertEqual(record['database']['image_id'], 'sha256:fixture-image')
        self.assertNotIn('Password=', json.dumps(record))

    def test_configured_connection_uses_no_docker_and_never_records_credentials(self):
        secret = 'Host=localhost;Password=fixture-secret;Database=postgres'
        status, record = self.run_gate(secret)
        self.assertEqual(status, 'passed')
        self.assertFalse(any(c[0] == 'docker' for c in self.calls))
        self.assertNotIn('fixture-secret', json.dumps(record))
        self.assertEqual(record['database']['source'], 'configured-connection')

    def test_skipped_relational_tests_block_instead_of_success(self):
        self.outcomes = ['Passed', 'NotExecuted']
        status, record = self.run_gate()
        self.assertEqual(status, 'blocked')
        self.assertEqual(record['skipped'], 1)
        self.assertEqual(self.calls[-1][:3], ['docker', 'rm', '--force'])

    def test_zero_matched_tests_block(self):
        self.outcomes = []
        self.assertEqual(self.run_gate()[0], 'blocked')

    def test_test_failure_fails_and_removes_only_owned_container(self):
        self.test_exit = 1
        self.outcomes = ['Failed']
        status, record = self.run_gate()
        self.assertEqual(status, 'failed')
        self.assertEqual(record['tests'][0]['outcome'], 'Failed')
        create = next(c for c in self.calls if c[:2] == ['docker', 'run'])
        self.assertEqual(self.calls[-1], ['docker', 'rm', '--force', create[create.index('--name') + 1]])

    def test_startup_failure_blocks_and_attempts_owned_cleanup(self):
        self.bootstrap_failure = True
        self.assertEqual(self.run_gate()[0], 'blocked')
        self.assertEqual(self.calls[-1][:3], ['docker', 'rm', '--force'])

    def test_focus_intersects_postgres_filter_and_cannot_replace_it(self):
        self.assertEqual(self.run_gate(filter_expression='FullyQualifiedName~DeferRecipe')[0], 'passed')
        test = next(c for c in self.calls if c[0] == 'dotnet')
        self.assertIn('(FullyQualifiedName~DeferRecipe)', test[test.index('--filter') + 1])

    def test_source_mutation_never_becomes_passed_evidence(self):
        status, record = self.run_gate(identity_values=['before', 'after'])
        self.assertEqual(status, 'failed')
        self.assertIn('Mutation', record['detail'])

    def test_timeout_stops_test_process_group(self):
        process = mock.Mock(pid=123)
        process.wait.side_effect = [subprocess.TimeoutExpired('dotnet', 180), 0]
        with mock.patch.object(self.runner.subprocess, 'Popen', return_value=process), \
             mock.patch.object(self.runner.os, 'killpg') as kill, \
             self.assertRaises(self.runner.Unavailable):
            self.runner.execute_tests(['dotnet', 'test'], {}, self.root / 'output.log')
        kill.assert_called_once()
        self.assertEqual(process.wait.call_count, 2)
