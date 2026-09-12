#!/usr/bin/env python3
"""Single completion orchestration. Preparation is explicit; verification is observed."""
from __future__ import annotations

import argparse
import ast
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys

import test_ops

ROOT = Path(__file__).resolve().parents[2]
CHECKS = ('documentation', 'test:agent', 'lint', 'format:check:pwa', 'typecheck', 'test:unit',
          'agent:test:impact', 'test:api', 'review:contracts',
          'agent:drift:endpoints', 'database-behavior')


def classes_for(paths):
    classes = set()
    for path in paths:
        # Runtime schemas beat documentation/spec-directory shortcuts.
        if (path == 'specs/openapi.yaml' or path.endswith('.sql')
                or path.startswith(('api/src/RecipeApi/Dto/', 'api/src/RecipeApi/Controllers/',
                                    'api/src/RecipeApi/Data/', 'api/src/RecipeApi/Models/'))):
            classes.add('contract')
        elif path == 'Taskfile.yml' or path.startswith(('scripts/agent/', '.agents/')):
            classes.add('harness')
        elif path.endswith('.md') or (path.startswith('.kiro/specs/')
                                        and path.endswith(('.yaml', '.yml', '.json', '.py', '.patch'))):
            classes.add('documentation')
        elif path.startswith(('pwa/', 'api/')):
            classes.add('application')
        else:
            classes.add('unknown')
    return classes


def checks_for(paths):
    classes = classes_for(paths)
    selected = {'documentation'} if classes else set()
    if classes & {'harness', 'unknown'}:
        selected.add('test:agent')
    if classes & {'application', 'contract', 'unknown'}:
        selected.update(('lint', 'format:check:pwa', 'typecheck', 'test:unit', 'agent:test:impact',
                         'test:api', 'review:contracts'))
    if classes & {'contract', 'unknown'}:
        selected.update(('agent:drift:endpoints', 'database-behavior'))
    return [check for check in CHECKS if check in selected]


def identity():
    return test_ops.build_impact_digest(ROOT, test_ops.get_changed_files(), [])


def run_command(command, timeout=1200, cwd=None):
    """Own just this process group; stop/reap on timeout or interruption, no retry."""
    try:
        child = subprocess.Popen(command, cwd=cwd or ROOT, start_new_session=True)
    except OSError as error:
        return 'blocked', str(error)
    try:
        code = child.wait(timeout=timeout)
    except (subprocess.TimeoutExpired, KeyboardInterrupt) as error:
        try:
            os.killpg(child.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        child.wait()
        return 'blocked', f'{type(error).__name__}: child group stopped; no retry'
    if code == 0:
        return 'passed', f'exit {code}'
    if code in (2, 124, 130, -signal.SIGINT, -signal.SIGTERM):
        return 'blocked', f'exit {code}; no retry'
    return 'failed', f'exit {code}'


def introduced_links(current, baseline):
    pattern = r'\]\(([^)\s]+)\)'
    existing = set(re.findall(pattern, baseline))
    return [link for link in re.findall(pattern, current) if link not in existing]


def documentation_check():
    """Check changed Markdown links and Python syntax without writing bytecode."""
    problems = []
    for name in test_ops.get_changed_files():
        path = ROOT / name
        if not path.is_file():
            continue
        if name.endswith('.py'):
            try:
                ast.parse(path.read_text(), filename=name)
            except SyntaxError as error:
                problems.append(str(error))
        if name.endswith('.md'):
            try:
                baseline = subprocess.check_output(['git', 'show', f'HEAD:{name}'],
                                                   cwd=ROOT, stderr=subprocess.DEVNULL).decode()
            except subprocess.CalledProcessError:
                baseline = ''
            for link in introduced_links(path.read_text(), baseline):
                if '://' in link or link.startswith(('#', '/')):
                    continue
                target = link.split('#')[0]
                if target and not (path.parent / target).exists():
                    problems.append(f'{name}: unresolved {link}')
    status, detail = run_command(['git', 'diff', '--check'])
    if problems:
        return 'failed', '; '.join(problems)
    return status, 'introduced links/Python syntax and ' + detail


def run_check(check):
    if check == 'documentation':
        return documentation_check()
    if check == 'database-behavior':
        return 'blocked', ('Task-specific real database behavior evidence required; '
                           'static parity and generic test:api do not establish it. '
                           'Record the approved isolated database check in task evidence.')
    if check in ('agent:test:impact', 'test:api') and os.environ.get('WFS_ISOLATED_RUNNER') != '1':
        return 'blocked', ('Requires a disposable runner with dedicated processes/ports/data; '
                           'WFS_ISOLATED_RUNNER=1 is an operator assertion after setup, not qualification.')
    # Invoke scripts directly where Task wraps distinct exits as 201, preserving
    # blocked live/Kiota evidence. Public commands remain Taskfile entrypoints.
    if check == 'agent:drift:endpoints':
        return run_command([sys.executable, '-B', 'scripts/agent/drift.py', '--endpoint-diff'])
    if check == 'review:contracts':
        results = [run_command([sys.executable, '-B', 'scripts/agent/api_tools.py', '--route-drift']),
                   run_command([sys.executable, '-B', 'scripts/agent/kiota_client.py', 'check']),
                   run_command([sys.executable, '-B', 'scripts/agent/drift.py', '--schema-only']),
                   run_command([sys.executable, '-B', 'scripts/agent/drift_mocks.py']),
                   run_command([sys.executable, '-B', 'scripts/agent/api_tools.py'])]
        status = 'failed' if any(s == 'failed' for s, _ in results) else (
            'blocked' if any(s == 'blocked' for s, _ in results) else 'passed')
        return status, json.dumps(results) + '; static checks only; no live API/database claim'
    return run_command(['task', check])


def verify(checks):
    tested = identity()
    results = {check: {'status': 'not-run' if check in checks else 'not-applicable'}
               for check in CHECKS}
    results['content'] = {'status': 'passed', 'tested_identity': tested}
    for check in checks:
        status, detail = run_check(check)
        results[check] = {'status': status, 'detail': detail, 'tested_identity': tested}
        if identity() != tested:
            results['content']['status'] = 'failed'
            results['content']['detail'] = 'Mutation during verification; no success for final content.'
            break
    return results


def prepare(paths):
    classes = classes_for(paths)
    commands = []
    print('Preparation classes: ' + ', '.join(sorted(classes)), flush=True)
    if 'unknown' in classes:
        print('blocked: classify unknown paths and inspect preparation effects before writes; '
              'final verification still requires the conservative union.')
        return 2
    if classes & {'contract', 'unknown'}:
        commands.append('gen:client')
    if classes & {'application', 'contract', 'unknown'}:
        commands.append('format')
    for command in commands:
        status, detail = run_command(['task', command])
        print(f'{command}: {status}: {detail}', flush=True)
        if status != 'passed':
            return 2 if status == 'blocked' else 1
    print('Preparation finished; inspect diff before task agent:finish. No verification claim.')
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepare', action='store_true')
    args = parser.parse_args()
    paths = test_ops.get_changed_files()
    if args.prepare:
        return prepare(paths)
    selected = checks_for(paths)
    print('Change classes: ' + ', '.join(sorted(classes_for(paths))), flush=True)
    print('Checks: ' + ', '.join(selected), flush=True)
    results = verify(selected)
    record = {'checks': results, 'automated_checks_passed': bool(selected) and all(
        value['status'] in ('passed', 'not-applicable') for value in results.values())}
    record['task_acceptance'] = 'not-evaluated: reconcile selected task/fixture/host evidence separately'
    # .task is ignored output, never part of the tested input. Never cache finish.
    output = ROOT / '.task/agent-finish/last-run.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(record, indent=2) + '\n')
    print(json.dumps(record, indent=2))
    if record['automated_checks_passed']:
        return 0
    return 1 if any(v['status'] == 'failed' for v in results.values()) else 2


if __name__ == '__main__':
    raise SystemExit(main())
