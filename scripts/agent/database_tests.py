#!/usr/bin/env python3
"""Run real PostgreSQL integration tests locally, without deploying the application."""
from __future__ import annotations

import argparse
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import signal
import subprocess
import sys
import time
import uuid
import xml.etree.ElementTree as ET

import yaml
import test_ops

ROOT = Path(__file__).resolve().parents[2]
# The live API/PWA browser fixture remains a separate, explicitly enabled qualification.
POSTGRES_FILTER = 'FullyQualifiedName~PostgresTests&FullyQualifiedName!~LiveBrowser_'


class Unavailable(Exception):
    pass


def command(args, *, env=None, timeout=30):
    try:
        result = subprocess.run(args, cwd=ROOT, env=env, capture_output=True,
                                text=True, timeout=timeout)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise Unavailable(f'{args[0]} unavailable or timed out') from error
    if result.returncode:
        # Do not echo process environment or connection credentials.
        raise Unavailable(f'{args[0]} {args[1]} exited {result.returncode}')
    return result.stdout.strip()


def postgres_image():
    infrastructure = yaml.safe_load((ROOT / 'docker/compose/infrastructure.yml').read_text())
    return infrastructure['services']['postgres']['image']


@contextmanager
def database_environment(metadata):
    env = dict(os.environ)
    configured = env.get('WFS_TEST_POSTGRES_CONNECTION', '').strip()
    if configured:
        metadata.update(source='configured-connection',
                        connection_sha256=hashlib.sha256(configured.encode()).hexdigest())
        yield env
        return
    if not shutil.which('docker'):
        raise Unavailable('Docker is required when WFS_TEST_POSTGRES_CONNECTION is not configured.')
    command(['docker', 'info', '--format', '{{.ServerVersion}}'])
    name = 'wfs-database-tests-' + uuid.uuid4().hex
    image = postgres_image()
    password = secrets.token_urlsafe(24)
    docker_env = {**env, 'POSTGRES_PASSWORD': password}
    metadata.update(source='temporary-container', container=name, image=image)
    try:
        command(['docker', 'run', '--detach', '--rm', '--name', name,
                 '--publish', '127.0.0.1::5432', '--env', 'POSTGRES_PASSWORD',
                 '--env', 'POSTGRES_USER=wfs_test', '--env', 'POSTGRES_DB=postgres',
                 '--tmpfs', '/var/lib/postgresql', image], env=docker_env, timeout=60)
        metadata['image_id'] = command(['docker', 'inspect', '--format', '{{.Image}}', name])
        ports = json.loads(command(['docker', 'inspect', '--format', '{{json .NetworkSettings.Ports}}', name]))
        port = int(ports['5432/tcp'][0]['HostPort'])
        for attempt in range(60):
            try:
                command(['docker', 'exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'wfs_test', '-d', 'postgres'], timeout=5)
                break
            except Unavailable:
                if attempt == 59:
                    raise Unavailable('Temporary PostgreSQL did not become ready.')
                time.sleep(0.5)
        env['WFS_TEST_POSTGRES_CONNECTION'] = (
            f'Host=127.0.0.1;Port={port};Database=postgres;Username=wfs_test;Password={password}')
        yield env
    finally:
        # Never reset a Compose project, shared container, or development volume.
        command(['docker', 'rm', '--force', name])
        metadata['removed'] = True


def execute_tests(args, env, log):
    with Path(log).open('w') as output:
        try:
            child = subprocess.Popen(args, cwd=ROOT, env=env, stdout=output,
                                     stderr=subprocess.STDOUT, start_new_session=True)
        except OSError as error:
            raise Unavailable('Could not start dotnet test.') from error
        try:
            return child.wait(timeout=180)
        except (subprocess.TimeoutExpired, KeyboardInterrupt):
            try:
                os.killpg(child.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            child.wait()
            raise Unavailable('Database tests interrupted/timed out; test process group stopped, no retry.')


def read_results(path):
    if not path.is_file():
        raise Unavailable('No TRX results produced; database coverage is unverified.')
    try:
        results = ET.parse(path).getroot().findall('.//{*}UnitTestResult')
    except ET.ParseError as error:
        raise Unavailable('Invalid TRX results; database coverage is unverified.') from error
    tests = [{'name': result.get('testName', ''), 'outcome': result.get('outcome', '')}
             for result in results]
    if not tests or any('PostgresTests.' not in test['name'] for test in tests):
        raise Unavailable('No valid PostgreSQL test results matched; database coverage is unverified.')
    return tests


def run_database_tests(filter_expression=None):
    started = time.monotonic()
    run_id = uuid.uuid4().hex
    directory = ROOT / '.task/database-tests/runs' / run_id
    directory.mkdir(parents=True, exist_ok=False)
    record = {'record_path': str((directory / 'result.json').relative_to(ROOT)),
              'database': {}, 'tests': [], 'passed': 0, 'skipped': 0}
    before = None
    try:
        if not shutil.which('dotnet'):
            raise Unavailable('Repository .NET SDK is required for database acceptance.')
        before = test_ops.build_impact_digest(ROOT, test_ops.get_changed_files(), [])
        record['tested_identity'] = before
        selection = POSTGRES_FILTER
        if filter_expression:
            selection = f'({selection})&({filter_expression})'
        args = ['dotnet', 'test', 'api/src/RecipeApi.Tests/RecipeApi.Tests.csproj',
                '--filter', selection, '--logger', 'trx;LogFileName=database.trx',
                '--results-directory', str(directory)]
        record['command'] = args
        print('Running local PostgreSQL integration tests (no application deployment).', flush=True)
        with database_environment(record['database']) as env:
            code = execute_tests(args, env, directory / 'test.log')
            record['exit_code'] = code
            result_path = directory / 'database.trx'
            tests = read_results(result_path) if code == 0 or result_path.is_file() else []
            record['tests'] = tests
            record['passed'] = sum(test['outcome'] == 'Passed' for test in tests)
            record['skipped'] = sum(test['outcome'] == 'NotExecuted' for test in tests)
            if code:
                record.update(status='failed', detail=f'dotnet test exited {code}; inspect test.log/TRX.')
            elif record['skipped']:
                raise Unavailable('Selected PostgreSQL tests were skipped; database coverage is unverified.')
            elif record['passed'] != len(tests):
                record.update(status='failed', detail='Non-passing PostgreSQL test outcomes in TRX.')
            else:
                record.update(status='passed', detail=f'{len(tests)} PostgreSQL tests passed, zero skipped.')
    except (Unavailable, OSError, ValueError, KeyError, KeyboardInterrupt) as error:
        record.update(status='blocked', detail=str(error) or 'Database verification interrupted.')
    if before is not None:
        try:
            after = test_ops.build_impact_digest(ROOT, test_ops.get_changed_files(), [])
            if after != before:
                record.update(status='failed', detail='Mutation during database verification; no success for final content.')
        except (OSError, ValueError):
            record.update(status='failed', detail='Runtime identity unavailable after database verification.')
    record['duration_seconds'] = time.monotonic() - started
    (directory / 'result.json').write_text(json.dumps(record, indent=2) + '\n')
    detail = f"{record['detail']} record_path={record['record_path']}"
    print(f"{record['status']}: {detail}", flush=True)
    return record['status'], detail


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--filter', dest='filter_expression', help='Further narrow the PostgreSQL suite')
    args = parser.parse_args()
    def interrupted(signum, frame):
        raise KeyboardInterrupt()
    signal.signal(signal.SIGTERM, interrupted)
    status, _ = run_database_tests(args.filter_expression)
    return {'passed': 0, 'failed': 1, 'blocked': 2}[status]


if __name__ == '__main__':
    raise SystemExit(main())
