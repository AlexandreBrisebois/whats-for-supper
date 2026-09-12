#!/usr/bin/env python3
"""Shared local/CI smoke lifecycle. The development Compose volumes are disposable."""
import argparse
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = ROOT / 'docker/compose/smoke.env'


class Interrupted(Exception):
    def __init__(self, signum):
        self.signum = signum
        super().__init__(f'interrupted by signal {signum}')


def smoke_environment():
    # Shell variables override Compose env files. Pin every interpolation input
    # here as well, so local credentials/settings cannot change the CI fixture.
    env = {key: value for key, value in os.environ.items()
           if not key.startswith('COMPOSE_')}
    for line in ENV_FILE.read_text().splitlines():
        if line and not line.startswith('#'):
            key, value = line.split('=', 1)
            env[key] = value
    env['COMPOSE_DISABLE_ENV_FILE'] = '1'
    env['GENERATED_API_URL'] = 'http://127.0.0.1:9001/openapi/v1.json'
    return env


def compose_command():
    return ['docker', 'compose', '-p', 'whats-for-supper', '--env-file', str(ENV_FILE),
            '-f', 'docker/compose/infrastructure.yml',
            '-f', 'docker/compose/apps.yml', '-f', 'docker/compose/ci-overrides.yml']


def call(command, env, capture=False, timeout=60):
    return subprocess.run(command, cwd=ROOT, env=env, check=True, text=True,
                          stdout=subprocess.PIPE if capture else None, timeout=timeout).stdout


def state(service, env):
    container = call(compose_command() + ['ps', '--all', '--quiet', service], env, True).strip()
    if not container:
        return {}
    return json.loads(call(['docker', 'inspect', '--format', '{{json .State}}', container], env, True))


def wait_for(label, check, attempts=30, interval=3):
    for attempt in range(attempts):
        if check():
            print(f'passed: {label}', flush=True)
            return
        if attempt + 1 < attempts:
            time.sleep(interval)
    raise RuntimeError(f'{label} timed out')


def migration_done(env):
    current = state('migration', env)
    if current.get('Status') == 'exited':
        if current.get('ExitCode') != 0:
            raise RuntimeError(f'migration failed with exit code {current.get("ExitCode")}')
        return True
    return False


def probe(url, require_json=False):
    try:
        # These probes must reach local containers, never an ambient HTTP proxy.
        with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(url, timeout=3) as response:
            if response.status != 200:
                return False
            if require_json:
                json.load(response)
            return True
    except (OSError, ValueError, urllib.error.URLError):
        return False


def error_code(error):
    print(f'failed: {error}', file=sys.stderr, flush=True)
    if isinstance(error, Interrupted):
        return 128 + error.signum
    if isinstance(error, KeyboardInterrupt):
        return 130
    if isinstance(error, subprocess.TimeoutExpired):
        return 124
    if isinstance(error, subprocess.CalledProcessError):
        return error.returncode if error.returncode > 0 else 128 - error.returncode
    return 1


def run_smoke(down_only=False):
    env = smoke_environment()
    compose = compose_command()
    down = compose + ['down', '--volumes', '--remove-orphans']
    result = 0
    cleanup_needed = False
    try:
        # Check dependencies and configuration before any destructive action.
        call(['docker', 'info', '--format', '{{.ServerVersion}}'], env, True)
        call(compose + ['config', '--quiet'], env)
        if down_only:
            call(down, env, timeout=120)
            return 0
        call([sys.executable, '-B', '-c', 'import yaml'], env)
        print('Resetting disposable whats-for-supper containers and volumes; local seed data is not mounted.', flush=True)
        cleanup_needed = True
        call(down, env, timeout=120)
        call(compose + ['up', '--build', '--detach'], env, timeout=1800)
        wait_for('migration', lambda: migration_done(env), interval=2)
        wait_for('Postgres health', lambda: state('postgres', env).get('Health', {}).get('Status') == 'healthy', interval=2)
        wait_for('API health (valid JSON)', lambda: probe('http://127.0.0.1:9001/api/health', require_json=True))
        wait_for('PWA health', lambda: probe('http://127.0.0.1:3000/api/health'))
        call([sys.executable, '-B', 'scripts/agent/drift.py', '--endpoint-diff'], env)
    except (Exception, KeyboardInterrupt) as error:
        result = error_code(error)
        if cleanup_needed:
            try:
                call(compose + ['logs', '--no-color'], env)
            except (Exception, KeyboardInterrupt) as log_error:
                error_code(log_error)
    finally:
        if cleanup_needed:
            try:
                call(down, env, timeout=120)
            except (Exception, KeyboardInterrupt) as cleanup_error:
                cleanup_result = error_code(cleanup_error)
                result = result or cleanup_result
    if result == 0:
        print('passed: Docker smoke checks and teardown; no seed or database-behavior qualification claim.', flush=True)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--down', action='store_true', help='Remove the disposable development Compose containers and volumes')
    args = parser.parse_args()
    def interrupt(signum, frame):
        raise Interrupted(signum)
    signal.signal(signal.SIGTERM, interrupt)
    return run_smoke(args.down)


if __name__ == '__main__':
    sys.exit(main())
