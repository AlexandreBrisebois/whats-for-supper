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
        self.test_names = None
        self.test_exit = 0
        self.bootstrap_failure = False
        self.test_timeout = False
        self.source_paths = ['global.json', 'api/database/schema.sql', 'api/src/Example.cs',
                             'api/src/bin/stale.dll', 'api/src/obj/stale.dll']
        for name in self.source_paths:
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('fixture input')

    def command(self, args, **kwargs):
        self.calls.append(args)
        if 'run' in args and self.bootstrap_failure:
            raise self.runner.Unavailable('Docker unavailable')
        if '{{.Image}}' in args or '{{.Id}}' in args:
            return 'sha256:fixture-image'
        if args[:2] == ['git', 'ls-files']:
            return '\0'.join(self.source_paths)
        if 'inspect' in args:
            return json.dumps({'5432/tcp': [{'HostPort': '54321'}]})
        return ''

    def fake_tests(self, args, env, log):
        self.calls.append(args)
        self.assertTrue(env['WFS_TEST_POSTGRES_CONNECTION'])
        self.assertIn('PostgresTests', args[args.index('--filter') + 1])
        self.assertIn('!~LiveBrowser_', args[args.index('--filter') + 1])
        if self.test_timeout:
            raise self.runner.Unavailable('Database tests interrupted/timed out; no retry.')
        if args[0] == 'docker':
            results = Path(log).parent
        else:
            results = Path(args[args.index('--results-directory') + 1])
        results.mkdir(parents=True, exist_ok=True)
        names = self.test_names or [f'RecipeApi.Tests.Integration.SamplePostgresTests.Case{i}'
                                    for i in range(len(self.outcomes))]
        (results / 'database.trx').write_text('<TestRun xmlns="http://microsoft.com/schemas/VisualStudio/TeamTest/2010"><Results>' + ''.join(
            f'<UnitTestResult testName="{name}" outcome="{outcome}" />'
            for name, outcome in zip(names, self.outcomes)) + '</Results></TestRun>')
        Path(log).write_text('test output\n')
        return self.test_exit

    def run_gate(self, connection=None, identity_values=None, host_platform='Linux', local_dotnet=True, **kwargs):
        environment = {'WFS_TEST_POSTGRES_CONNECTION': connection} if connection else {}
        previous_records = set(self.root.glob('.task/database-tests/runs/*/result.json'))
        with mock.patch('platform.system', return_value=host_platform), \
             mock.patch.object(self.runner, 'sdk_image', return_value='mcr.microsoft.com/dotnet/sdk:fixture', create=True), \
             mock.patch.object(self.runner, 'ROOT', self.root), \
             mock.patch.dict(os.environ, environment, clear=True), \
             mock.patch.object(self.runner.shutil, 'which', side_effect=lambda name: None if name == 'dotnet' and not local_dotnet else '/tool'), \
             mock.patch.object(self.runner, 'postgres_image', return_value='pgvector/pgvector:fixture'), \
             mock.patch.object(self.runner, 'command', side_effect=self.command), \
             mock.patch.object(self.runner, 'execute_tests', side_effect=self.fake_tests), \
             mock.patch.object(self.runner.test_ops, 'build_impact_digest', side_effect=identity_values or ['same', 'same']), \
             mock.patch.object(self.runner.test_ops, 'get_changed_files', return_value=[]), \
             contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            status, detail = self.runner.run_database_tests(**kwargs)
        record_path = next(iter(set(self.root.glob('.task/database-tests/runs/*/result.json')) - previous_records))
        record = json.loads(record_path.read_text())
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


    def assert_owned_linux_cleanup(self, record):
        creates = [call for call in self.calls if call[:2] == ['docker', 'run']]
        self.assertTrue(any('mcr.microsoft.com/dotnet/sdk:fixture' in call for call in creates),
                        'macOS acceptance must create the owned Linux SDK container')
        sdk = next(call for call in creates if 'mcr.microsoft.com/dotnet/sdk:fixture' in call)
        postgres = next(call for call in creates if 'pgvector/pgvector:fixture' in call)
        sdk_name = sdk[sdk.index('--name') + 1]
        postgres_name = postgres[postgres.index('--name') + 1]
        network = next(call for call in self.calls if call[:3] == ['docker', 'network', 'create'])[-1]
        removals = [call for call in self.calls if call[:3] == ['docker', 'rm', '--force']]
        self.assertEqual(removals, [['docker', 'rm', '--force', sdk_name],
                                    ['docker', 'rm', '--force', postgres_name]])
        self.assertEqual(self.calls[-1], ['docker', 'network', 'rm', network])
        self.assertTrue(record['runtime']['removed'])
        self.assertTrue(record['database']['removed'])
        return sdk, postgres

    def test_macos_automatic_database_uses_linux_sdk_without_local_dotnet(self):
        status, record = self.run_gate(host_platform='Darwin', local_dotnet=False,
                                       filter_expression='FullyQualifiedName~OnlineRecovery')
        self.assertEqual(status, 'passed')
        self.assertEqual(record['runtime']['source'], 'linux-container')
        self.assertEqual(record['runtime']['image'], 'mcr.microsoft.com/dotnet/sdk:fixture')
        self.assertEqual(record['runtime']['image_id'], 'sha256:fixture-image')
        sdk, postgres = self.assert_owned_linux_cleanup(record)
        self.assertIn('--network', sdk)
        self.assertIn('--network', postgres)
        self.assertNotIn('--publish', postgres)
        self.assertIn('postgres', postgres)
        text = ' '.join(sdk)
        self.assertIn('/source', text)
        self.assertTrue(':ro' in text or 'readonly' in text)
        self.assertIn('/results', text)
        self.assertIn('/work', text)
        source = next(self.root.glob('.task/database-tests/runs/*/source'))
        self.assertEqual((source / 'api/database/schema.sql').read_text(), 'fixture input')
        self.assertTrue((source / 'api/src/Example.cs').is_file())
        self.assertFalse((source / 'api/src/bin').exists())
        self.assertFalse((source / 'api/src/obj').exists())
        self.assertIn('FullyQualifiedName~OnlineRecovery', text)
        self.assertIn('!~LiveBrowser_', text)
        self.assertIn('WFS_TEST_POSTGRES_CONNECTION', sdk)
        self.assertNotIn('Password=', json.dumps(record))
        self.assertNotIn('Password=', json.dumps(self.calls))

    def test_macos_configured_connection_keeps_native_runtime(self):
        status, record = self.run_gate('Host=localhost;Password=fixture-secret;Database=postgres',
                                       host_platform='Darwin')
        self.assertEqual(status, 'passed')
        self.assertFalse(any(call[0] == 'docker' for call in self.calls))
        self.assertTrue(any(call[0] == 'dotnet' for call in self.calls))
        self.assertNotIn('fixture-secret', json.dumps(record))

    def test_macos_test_failure_cleans_owned_sdk_database_and_network(self):
        self.test_exit = 1
        self.outcomes = ['Failed']
        status, record = self.run_gate(host_platform='Darwin')
        self.assertEqual(status, 'failed')
        self.assert_owned_linux_cleanup(record)

    def test_macos_test_timeout_cleans_owned_sdk_database_and_network(self):
        self.test_timeout = True
        status, record = self.run_gate(host_platform='Darwin')
        self.assertEqual(status, 'blocked')
        self.assertIn('timed out', record['detail'])
        self.assert_owned_linux_cleanup(record)

    def test_macos_skipped_tests_never_qualify(self):
        self.outcomes = ['Passed', 'NotExecuted']
        status, record = self.run_gate(host_platform='Darwin')
        self.assertEqual(status, 'blocked')
        self.assertEqual(record['skipped'], 1)
        self.assert_owned_linux_cleanup(record)

    def test_macos_empty_selection_never_qualifies(self):
        self.outcomes = []
        status, record = self.run_gate(host_platform='Darwin')
        self.assertEqual(status, 'blocked')
        self.assert_owned_linux_cleanup(record)
