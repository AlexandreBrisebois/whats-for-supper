import importlib.util
import contextlib
import io
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from unittest import mock

import yaml

ROOT = Path(__file__).resolve().parents[3]


class DockerSmokeTests(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.spec_from_file_location('docker_smoke', ROOT / 'scripts/agent/docker_smoke.py')
        self.smoke = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.smoke)
        self.calls = []
        self.failure = None
        self.migration = {'Status': 'exited', 'ExitCode': 0}
        self.health = 'healthy'
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.sentinel = Path(self.temp.name) / 'unrelated.txt'
        self.sentinel.write_text('preserve unrelated work')

    def fake_run(self, command, **kwargs):
        self.calls.append(command)
        output = ''
        if self.failure:
            self.failure(command)
        if 'ps' in command:
            output = 'fixture-' + command[-1]
        elif 'inspect' in command:
            state = self.migration if command[-1] == 'fixture-migration' else {'Health': {'Status': self.health}}
            output = json.dumps(state)
        return subprocess.CompletedProcess(command, 0, output, '')

    def run_smoke(self):
        with mock.patch.object(self.smoke.subprocess, 'run', side_effect=self.fake_run), \
             mock.patch.object(self.smoke.time, 'sleep'), \
             mock.patch.object(self.smoke, 'probe', return_value=True), \
             contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return self.smoke.run_smoke()

    def downs(self):
        return [c for c in self.calls if 'down' in c]

    def test_success_resets_before_build_checks_migration_and_drift_then_cleans(self):
        self.assertEqual(self.run_smoke(), 0)
        self.assertEqual(len(self.downs()), 2)
        first_down = self.calls.index(self.downs()[0])
        up = next(i for i, c in enumerate(self.calls) if 'up' in c)
        self.assertLess(first_down, up)
        self.assertTrue(any('fixture-migration' in c and 'inspect' in c for c in self.calls))
        self.assertTrue(any('--endpoint-diff' in c for c in self.calls))
        self.assertIn('down', self.calls[-1])
        for command in self.downs():
            self.assertIn('--volumes', command)
            self.assertIn('whats-for-supper', command)
        self.assertEqual(self.sentinel.read_text(), 'preserve unrelated work')

    def test_build_failure_logs_then_cleans_and_preserves_exit(self):
        def fail(command):
            if 'up' in command:
                raise subprocess.CalledProcessError(7, command)
        self.failure = fail
        self.assertEqual(self.run_smoke(), 7)
        self.assertIn('logs', self.calls[-2])
        self.assertIn('down', self.calls[-1])

    def test_initial_reset_failure_never_builds(self):
        self.failure = lambda c: self.raise_failure(c) if 'down' in c else None
        self.assertNotEqual(self.run_smoke(), 0)
        self.assertFalse(any('up' in c for c in self.calls))

    @staticmethod
    def raise_failure(command):
        raise subprocess.CalledProcessError(9, command)

    def test_cleanup_failure_cannot_report_success(self):
        self.failure = lambda c: self.raise_failure(c) if 'down' in c and len(self.downs()) == 2 else None
        self.assertEqual(self.run_smoke(), 9)

    def test_logs_and_cleanup_failures_do_not_mask_test_failure(self):
        def fail(c):
            if 'up' in c:
                raise subprocess.CalledProcessError(7, c)
            if 'logs' in c or ('down' in c and len(self.downs()) == 2):
                self.raise_failure(c)
        self.failure = fail
        self.assertEqual(self.run_smoke(), 7)

    def test_migration_failure_and_timeout_fail_and_clean(self):
        for state in ({'Status': 'exited', 'ExitCode': 1}, {'Status': 'running', 'ExitCode': 0}):
            with self.subTest(state=state):
                self.calls = []
                self.migration = state
                self.assertNotEqual(self.run_smoke(), 0)
                self.assertIn('down', self.calls[-1])
                self.assertFalse(any('--endpoint-diff' in c for c in self.calls))

    def test_postgres_timeout_fails_and_cleans(self):
        self.health = 'starting'
        self.assertNotEqual(self.run_smoke(), 0)
        self.assertIn('down', self.calls[-1])

    def test_drift_blocked_exit_survives_teardown(self):
        def fail(c):
            if '--endpoint-diff' in c:
                raise subprocess.CalledProcessError(2, c)
        self.failure = fail
        self.assertEqual(self.run_smoke(), 2)
        self.assertIn('down', self.calls[-1])

    def test_interruption_and_command_timeout_clean_up(self):
        for error in (KeyboardInterrupt(), self.smoke.Interrupted(signal.SIGTERM),
                      subprocess.TimeoutExpired('fixture', 1)):
            with self.subTest(error=type(error).__name__):
                self.calls = []
                def fail(c):
                    if 'up' in c:
                        raise error
                self.failure = fail
                self.assertNotEqual(self.run_smoke(), 0)
                self.assertIn('down', self.calls[-1])

    def test_unavailable_docker_does_not_reset(self):
        self.failure = lambda c: self.raise_failure(c) if 'info' in c else None
        self.assertNotEqual(self.run_smoke(), 0)
        self.assertEqual(self.downs(), [])

    def test_environment_overrides_synthetic_host_credentials_and_compose_injection(self):
        with mock.patch.dict(os.environ, {'POSTGRES_PASSWORD': 'synthetic-host-secret',
                                         'HEARTH_SECRET': 'synthetic-host-hearth',
                                         'COMPOSE_FILE': 'unrelated.yml', 'COMPOSE_PROFILES': 'unrelated',
                                         'API_INTERNAL_URL': 'http://unrelated:9001'}):
            env = self.smoke.smoke_environment()
        self.assertEqual(env['POSTGRES_PASSWORD'], 'ci_password')
        self.assertNotEqual(env['HEARTH_SECRET'], 'synthetic-host-hearth')
        self.assertEqual(env['API_INTERNAL_URL'], 'http://api:9001')
        self.assertNotIn('COMPOSE_FILE', env)
        self.assertNotIn('COMPOSE_PROFILES', env)
        self.assertEqual(env['COMPOSE_DISABLE_ENV_FILE'], '1')

    def test_local_and_ci_share_runner_without_dev_overrides(self):
        task = yaml.safe_load((ROOT / 'Taskfile.yml').read_text())
        ci = yaml.safe_load((ROOT / '.github/workflows/ci.yml').read_text())
        self.assertEqual(task['tasks']['test:smoke']['cmds'], ['python3 -B scripts/agent/docker_smoke.py'])
        steps = ci['jobs']['docker-smoke']['steps']
        self.assertTrue(any(s.get('run') == 'python3 -B scripts/agent/docker_smoke.py' for s in steps))
        command = self.smoke.compose_command()
        self.assertNotIn('docker/compose/dev-overrides.yml', command)
        self.assertEqual(command.count('-f'), 3)

    def test_all_compose_interpolation_inputs_have_pinned_smoke_values(self):
        inputs = set()
        for name in ('infrastructure.yml', 'apps.yml', 'ci-overrides.yml'):
            inputs.update(re.findall(r'(?<!\$)\$\{([A-Z_][A-Z_0-9]*)',
                                     (ROOT / 'docker/compose' / name).read_text()))
        pinned = {line.split('=', 1)[0] for line in self.smoke.ENV_FILE.read_text().splitlines()
                  if line and not line.startswith('#')}
        self.assertFalse(inputs - pinned, f'Unpinned Compose inputs: {inputs - pinned}')

    def test_failed_http_and_invalid_json_are_not_healthy(self):
        for body, status, expected in ((b'{"status":"ok"}', 200, True),
                                       (b'not JSON', 200, False), (b'{}', 503, False)):
            with self.subTest(body=body, status=status):
                response = io.BytesIO(body)
                response.status = status
                opener = mock.Mock()
                opener.open.return_value.__enter__ = lambda _: response
                opener.open.return_value.__exit__ = lambda *args: None
                with mock.patch.object(self.smoke.urllib.request, 'build_opener', return_value=opener):
                    self.assertEqual(self.smoke.probe('http://fixture/api/health', True), expected)

    def test_api_and_pwa_timeouts_fail_and_clean(self):
        for failing_port in ('9001', '3000'):
            self.calls = []
            with self.subTest(port=failing_port), \
                 mock.patch.object(self.smoke.subprocess, 'run', side_effect=self.fake_run), \
                 mock.patch.object(self.smoke.time, 'sleep'), \
                 mock.patch.object(self.smoke, 'probe', side_effect=lambda url, **kw: failing_port not in url), \
                 contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                self.assertNotEqual(self.smoke.run_smoke(), 0)
                self.assertIn('down', self.calls[-1])
                self.assertFalse(any('--endpoint-diff' in c for c in self.calls))

    def test_real_cli_failure_and_sigterm_teardown_using_disposable_docker_fixture(self):
        fixture = Path(self.temp.name)
        docker = fixture / 'docker'
        docker.write_text('#!' + sys.executable + '\n' + '''
import json, os, sys, time
from pathlib import Path
with open(os.environ['SMOKE_FIXTURE_LOG'], 'a') as log:
    log.write(json.dumps(sys.argv[1:]) + '\\n')
if 'up' in sys.argv:
    Path(os.environ['SMOKE_FIXTURE_READY']).touch()
    if os.environ['SMOKE_FIXTURE_MODE'] == 'fail':
        sys.exit(7)
    time.sleep(20)
''')
        docker.chmod(0o700)
        for mode, expected in (('fail', 7), ('interrupt', 143)):
            with self.subTest(mode=mode):
                log = fixture / (mode + '.jsonl')
                ready = fixture / (mode + '.ready')
                env = dict(os.environ, PATH=str(fixture) + os.pathsep + os.environ['PATH'],
                           SMOKE_FIXTURE_LOG=str(log), SMOKE_FIXTURE_READY=str(ready), SMOKE_FIXTURE_MODE=mode)
                child = subprocess.Popen([sys.executable, '-B', str(ROOT / 'scripts/agent/docker_smoke.py')],
                                         env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                try:
                    if mode == 'interrupt':
                        deadline = time.monotonic() + 10
                        while not ready.exists() and child.poll() is None and time.monotonic() < deadline:
                            time.sleep(0.02)
                        self.assertTrue(ready.exists(), 'fixture never reached build')
                        child.send_signal(signal.SIGTERM)
                    stdout, stderr = child.communicate(timeout=10)
                    self.assertEqual(child.returncode, expected, stdout + stderr)
                    commands = [json.loads(line) for line in log.read_text().splitlines()]
                    self.assertEqual(sum('down' in c for c in commands), 2)
                    self.assertIn('logs', commands[-2])
                    self.assertIn('down', commands[-1])
                    self.assertEqual(self.sentinel.read_text(), 'preserve unrelated work')
                finally:
                    if child.poll() is None:
                        child.kill()
                        child.communicate()


if __name__ == '__main__':
    unittest.main()
