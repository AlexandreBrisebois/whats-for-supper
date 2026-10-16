#!/usr/bin/env python3
"""Repository preparation and verification utilities; task progression belongs to OpenSpec."""
from __future__ import annotations

import argparse
import ast
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys
import time
import uuid

import test_ops
import worktree
import harness_identity as harness_runtime

ROOT = Path(__file__).resolve().parents[2]
CHECKS = ('documentation', 'spec:check', 'test:agent', 'lint', 'format:check:pwa', 'typecheck', 'test:unit',
          'agent:test:impact', 'test:api', 'review:contracts',
          'agent:drift:endpoints', 'database-behavior')


# Narrow exceptions for preview switches and the PWA demo pass-through addition.
# These do not cover arbitrary deployment configuration.
# Database connections, migrations, mounts, images and unrecognized formats retain
# the conservative classification below.
FEATURE_FLAG_CONFIG_PATHS = {
    'docker/compose/apps.yml', 'docker/compose/production.yml',
    'release-template/synology/compose.yaml', 'docker/compose/smoke.env',
}


def without_feature_flags(content, dotenv=False):
    remaining = []
    services = api = environment = False
    for line in content.splitlines(keepends=True):
        text = line.rstrip('\r\n')
        if dotenv:
            if re.fullmatch(r'WFS_FEATURE_[A-Z0-9_]+=(off|opt-in|on)', text):
                continue
        else:
            if text.strip() and not text.lstrip().startswith('#'):
                indent = len(text) - len(text.lstrip(' '))
                if indent == 0:
                    services = text == 'services:'
                    api = environment = False
                elif indent == 2:
                    api = services and text == '  api:'
                    environment = False
                elif indent == 4:
                    environment = api and text == '    environment:'
                elif indent == 6 and environment and re.fullmatch(
                        r'      (WFS_FEATURE_[A-Z0-9_]+): \$\{\1:-(off|opt-in|on)\}', text):
                    continue
        remaining.append(line)
    return ''.join(remaining)


def without_pwa_demo(content):
    """Recognize only the existing false-default demo input in PWA environment."""
    remaining = []
    services = pwa = environment = False
    removed = 0
    for line in content.splitlines(keepends=True):
        text = line.rstrip('\r\n')
        if text.strip() and not text.lstrip().startswith('#'):
            indent = len(text) - len(text.lstrip(' '))
            if indent == 0:
                services = text == 'services:'
                pwa = environment = False
            elif indent == 2:
                pwa = services and text == '  pwa:'
                environment = False
            elif indent == 4:
                environment = pwa and text == '    environment:'
            elif (indent == 6 and environment
                  and text == '      DEMO_MODE: ${DEMO_MODE:-false}'):
                removed += 1
                continue
        remaining.append(line)
    return ''.join(remaining), removed


def deployment_configuration_only(path, *, pwa_demo=False):
    allowed_paths = ({'docker/compose/apps.yml', 'release-template/synology/compose.yaml'}
                     if pwa_demo else FEATURE_FLAG_CONFIG_PATHS)
    if path not in allowed_paths:
        return False
    try:
        before = subprocess.check_output(
            ['git', 'show', f'HEAD:{path}'], cwd=ROOT, stderr=subprocess.DEVNULL)
        entry = subprocess.check_output(
            ['git', 'ls-tree', 'HEAD', '--', path], cwd=ROOT, text=True).split()
        current = worktree.fingerprint(ROOT / path)
        expected_mode = '100755' if current.get('mode', 0) & 0o111 else '100644'
        if current['kind'] != 'file' or not entry or entry[0] != expected_mode:
            return False
        after = (ROOT / path).read_bytes()
        if pwa_demo:
            stripped, count = without_pwa_demo(after.decode())
            # Addition only: API demo values, defaults, removals and mixed changes
            # are not covered. Match the verified task-boundary bytes exactly.
            return count == 1 and stripped == before.decode()
        return before != after and without_feature_flags(
            before.decode(), path.endswith('.env')) == without_feature_flags(
                after.decode(), path.endswith('.env'))
    except (OSError, RuntimeError, KeyError, ValueError, subprocess.CalledProcessError):
        return False


def classes_for(paths):
    classes = set()
    for path in paths:
        if (deployment_configuration_only(path)
                or deployment_configuration_only(path, pwa_demo=True)):
            classes.update(('application', 'harness'))
            continue
        # Runtime schemas beat documentation/spec-directory shortcuts.
        if (path == 'specs/openapi.yaml' or path.endswith('.sql') or path.startswith('docker/compose/')
                or path.startswith(('api/src/RecipeApi/Dto/', 'api/src/RecipeApi/Controllers/',
                                    'api/src/RecipeApi/Data/', 'api/src/RecipeApi/Models/'))):
            classes.add('contract')
        elif (openspec_class := test_ops.openspec_path_class(path)) is not None:
            classes.add(openspec_class)
        elif path in {'Taskfile.yml', '.gitignore', '.pre-commit-config.yaml', '.nvmrc', 'scripts/requirements.txt'} or path.startswith(('scripts/agent/', '.agents/', '.github/workflows/')):
            classes.add('harness')
        elif path.endswith('.md') or test_ops.documentation_artifact(path):
            classes.add('documentation')
        elif path.startswith(('pwa/', 'api/')):
            classes.add('application')
        else:
            classes.add('unknown')
    return classes


def checks_for(paths):
    classes = classes_for(paths)
    selected = {'documentation'} if classes else set()
    if 'unknown' in classes or any(path.startswith('openspec/') for path in paths):
        selected.add('spec:check')
    if classes & {'harness', 'unknown'}:
        selected.add('test:agent')
    if classes & {'application', 'contract', 'unknown'}:
        selected.update(('lint', 'format:check:pwa', 'typecheck', 'test:unit', 'agent:test:impact',
                         'test:api', 'review:contracts'))
    if classes & {'contract', 'unknown'}:
        selected.update(('agent:drift:endpoints', 'database-behavior'))
    return [check for check in CHECKS if check in selected]


def identity():
    # Verification identity covers the whole repository and runtime, even when
    # explicit paths select a bounded task's checks.
    return test_ops.build_impact_digest(ROOT, test_ops.get_changed_files(), [])


def can_scope_harness(paths, checks):
    classes = classes_for(paths)
    return ('harness' in classes and classes <= {'harness', 'documentation'}
            and bool(checks) and set(checks) <= {'documentation', 'test:agent', 'spec:check'}
            and os.environ.get('WFS_TEST_SQLDEF') != '1')


def harness_identity(checks):
    return test_ops.build_impact_digest(ROOT, test_ops.get_changed_files(), [],
                                       runtime_digest=harness_runtime.runtime_identity(checks))


def verification_plan(paths, changed, *, explicit):
    """Explain existing selection without executing checks or hashing runtime inputs."""
    by_path = {path: checks_for([path]) for path in paths}
    checks = []
    for check in checks_for(paths):
        item = {'name': check, 'selected_by': [path for path in paths if check in by_path[path]]}
        if check == 'database-behavior':
            item['prerequisites'] = 'Task-specific real database acceptance evidence.'
            item['limitations'] = 'Always blocked in this runner; reconcile task evidence separately.'
        elif check == 'agent:drift:endpoints':
            item['prerequisites'] = 'Running API exposing its generated OpenAPI document.'
            item['limitations'] = 'Live endpoint parity only; does not prove database behavior.'
        elif check == 'spec:check':
            item['prerequisites'] = 'Taskfile-pinned OpenSpec CLI.'
        elif check == 'documentation':
            item['prerequisites'] = 'Git and readable selected documents/link targets.'
        else:
            item['prerequisites'] = 'Installed repository toolchain and dependencies for this check; see Taskfile.yml.'
        checks.append(item)
    return {
        'mode': 'plan',
        'selection': 'explicit' if explicit else 'all-git-changes',
        'changed_paths': paths,
        'excluded_paths': sorted(set(changed) - set(paths)),
        'path_classes': {path: sorted(classes_for([path])) for path in paths},
        'runtime_scope_candidate': 'harness' if can_scope_harness(paths, [c['name'] for c in checks]) else 'existing-policy',
        'checks': checks,
        'verification_scope': 'selected-documentation' if explicit and can_scope_documentation(paths) else 'repository',
        'effects': 'Preview only: no checks, preparation, runtime fingerprinting or evidence writes. Verification may launch tools, tests and services and write generated test outputs.',
        'task_acceptance': 'not-evaluated',
        'limitations': 'Selection preview only; prerequisites are not probed. Paths do not establish ownership. Recompute after edits.',
    }


def documentation_spec_targets(paths):
    """Resolve only local, active spec/change names; retain explicit item types."""
    targets = set()
    for name in paths:
        parts = Path(name).parts
        if parts[:2] == ('openspec', 'changes') and len(parts) >= 4:
            if parts[2] == 'archive' or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', parts[2]):
                return None
            targets.add((parts[2], 'change'))
        elif parts[:2] == ('openspec', 'specs') and name.endswith('/spec.md'):
            capability = '/'.join(parts[2:-1])
            if not re.fullmatch(r'[a-z0-9-]+(?:/[a-z0-9-]+)*', capability):
                return None
            targets.add((capability, 'spec'))
    return sorted(targets)


def can_scope_documentation(paths):
    return bool(paths) and classes_for(paths) == {'documentation'} and documentation_spec_targets(paths) is not None


def documentation_inputs(paths):
    """Inputs to bounded link/grammar checks, not application qualification."""
    inputs = set(paths) | {'Taskfile.yml', '.gitignore', 'openspec/config.yaml',
                           'openspec/config.yml', 'scripts/agent/finish.py',
                           'scripts/agent/test_ops.py', 'scripts/agent/worktree.py'}
    directories = {ROOT / 'openspec/schemas'}
    for name, kind in documentation_spec_targets(paths):
        directory = ROOT / 'openspec' / ('changes' if kind == 'change' else 'specs') / name
        directories.add(directory)
        if kind == 'change':
            for delta in (directory / 'specs').rglob('spec.md'):
                inputs.add('openspec/specs/' + str(delta.relative_to(directory / 'specs')))
    for directory in directories:
        inputs.update(str(p.relative_to(ROOT)) for p in directory.rglob('*') if p.is_file() or p.is_symlink())
    # The link check observes existence. Shared main-spec links also identify
    # policy dependencies; do not pull an index's unrelated draft plans into scope.
    links = {}
    pending = list(inputs)
    visited = set()
    while pending:
        name = pending.pop()
        path = ROOT / name
        if name in visited or path.suffix != '.md' or not path.is_file():
            continue
        visited.add(name)
        for link in re.findall(r'\]\(([^)\s]+)\)', path.read_text()):
            if '://' in link or link.startswith(('#', '/')):
                continue
            target = (path.parent / link.split('#')[0]).resolve()
            links[str(target)] = target.exists()
            if target.is_relative_to(ROOT.resolve() / 'openspec/specs'):
                relative = str(target.relative_to(ROOT.resolve()))
                if relative not in inputs:
                    inputs.add(relative)
                    pending.append(relative)
    return sorted(inputs), links


def documentation_identity(paths):
    inputs, links = documentation_inputs(paths)
    # Retain tooling/environment sensitivity without hashing unrelated app code
    # and installed browser/application dependencies for link/grammar checks.
    digest = hashlib.sha256(json.dumps(dict(os.environ), sort_keys=True).encode())
    digest.update(sys.version.encode())
    for tool in (sys.executable, shutil.which('task'), shutil.which('node'), shutil.which('openspec')):
        if tool:
            executable = Path(tool).resolve()
            digest.update(json.dumps([str(executable), worktree.fingerprint(executable)], sort_keys=True).encode())
    for name in inputs:
        digest.update(json.dumps([name, worktree.fingerprint(ROOT / name)], sort_keys=True).encode())
    digest.update(json.dumps(links, sort_keys=True).encode())
    # HEAD supplies link baselines; selected index entries supply staged whitespace.
    for command in (['git', 'rev-parse', '--verify', 'HEAD'],
                    ['git', 'ls-files', '--stage', '-z', '--', *inputs]):
        result = subprocess.run(command, cwd=ROOT, capture_output=True)
        digest.update(str(result.returncode).encode() + result.stdout)
    return digest.hexdigest()


def documentation_spec_check(paths):
    results = [(name, kind, *run_command(['task', 'spec:check', '--', name, '--type', kind]))
               for name, kind in documentation_spec_targets(paths)]
    status = 'failed' if any(r[2] == 'failed' for r in results) else (
        'blocked' if any(r[2] == 'blocked' for r in results) else 'passed')
    return status, json.dumps(results) + '; selected artifacts only; no repository-wide reconciliation claim'


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


def documentation_check(paths):
    """Check changed Markdown links and Python syntax without writing bytecode."""
    problems = []
    for name in paths:
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
    if paths:
        worktree = run_command(['git', 'diff', '--check', '--', *paths])
        staged = run_command(['git', 'diff', '--cached', '--check', '--', *paths])
        status = 'failed' if 'failed' in (worktree[0], staged[0]) else (
            'blocked' if 'blocked' in (worktree[0], staged[0]) else 'passed')
        detail = f'worktree {worktree[1]}; staged {staged[1]}'
    else:
        status, detail = 'passed', 'no changed paths selected'
    if problems:
        return 'failed', '; '.join(problems)
    return status, 'introduced links/Python syntax and ' + detail


def run_check(check, paths=()):
    if check == 'documentation':
        return documentation_check(paths)
    if check == 'agent:test:impact':
        return run_command([sys.executable, '-B', 'scripts/agent/test_ops.py',
                            '--impact', '--files', *paths])
    if check == 'database-behavior':
        return 'blocked', ('Task-specific real database behavior evidence required; '
                           'static parity and generic test:api do not establish it. '
                           'Record the approved task-specific database check in task evidence.')
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


def verify(checks, paths=(), *, scoped_documentation=False):
    current_identity = (lambda: documentation_identity(paths)) if scoped_documentation else identity
    runtime_scope = 'selected-documentation' if scoped_documentation else 'full'
    runtime_scope_reason = ''
    if not scoped_documentation and can_scope_harness(paths, checks):
        current_identity = lambda: harness_identity(checks)
        runtime_scope = 'harness'
    started = time.perf_counter()
    identity_started = time.perf_counter()
    try:
        tested = current_identity()
    except (OSError, ValueError) as error:
        if runtime_scope != 'harness':
            raise
        current_identity = identity
        runtime_scope = 'full'
        runtime_scope_reason = str(error)
        tested = current_identity()
    initial_identity_seconds = time.perf_counter() - identity_started
    timing = {'initial_identity_seconds': initial_identity_seconds,
              'identity_seconds': initial_identity_seconds, 'identity_calls': 1,
              'checks_seconds': 0.0}
    results = {check: {'status': 'not-run' if check in checks else 'not-applicable'}
               for check in CHECKS}
    results['content'] = {'status': 'passed', 'tested_identity': tested}
    results['content'].update(runtime_scope=runtime_scope, runtime_scope_reason=runtime_scope_reason)
    if scoped_documentation:
        results['content'].update(scope='selected-documentation', input_paths=documentation_inputs(paths)[0])
    for check in checks:
        check_started = time.perf_counter()
        status, detail = (documentation_spec_check(paths) if scoped_documentation and check == 'spec:check'
                          else run_check(check, paths))
        duration = time.perf_counter() - check_started
        timing['checks_seconds'] += duration
        identity_started = time.perf_counter()
        try:
            after = current_identity()
        except (OSError, ValueError) as error:
            if runtime_scope != 'harness':
                raise
            # A previously discoverable runtime disappearing/changing layout
            # is mutation, not an opportunity to switch identities mid-run.
            identity_duration = time.perf_counter() - identity_started
            results[check] = {'status': status, 'detail': detail, 'tested_identity': tested,
                              'duration_seconds': duration, 'identity_duration_seconds': identity_duration}
            results['content'].update(status='failed', detail=f'Runtime identity unavailable after check: {error}')
            timing['identity_seconds'] += identity_duration
            timing['identity_calls'] += 1
            break
        identity_duration = time.perf_counter() - identity_started
        timing['identity_seconds'] += identity_duration
        timing['identity_calls'] += 1
        results[check] = {'status': status, 'detail': detail, 'tested_identity': tested,
                          'duration_seconds': duration, 'identity_duration_seconds': identity_duration}
        if after != tested:
            results['content']['status'] = 'failed'
            results['content']['detail'] = 'Mutation during verification; no success for final content.'
            break
    timing['total_seconds'] = time.perf_counter() - started
    results['content']['timing'] = timing
    return results


def prepare(paths):
    classes = classes_for(paths)
    print('Preparation classes: ' + ', '.join(sorted(classes)), flush=True)
    if 'unknown' in classes:
        print('blocked: classify unknown paths and inspect preparation effects before writes; '
              'final verification still requires the conservative union.')
        return 2
    commands = []
    if 'contract' in classes:
        commands.append(('gen:client', ['task', 'gen:client']))
    pwa_paths = [path[4:] for path in paths if path.startswith('pwa/') and path.endswith(
        ('.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.json', '.yaml', '.yml'))]
    api_paths = [path[4:] for path in paths if path.startswith('api/') and path.endswith('.cs')]
    if pwa_paths:
        commands.append(('format:pwa:task',
                         ['npm', 'exec', '--', 'prettier', '--write', '--', *pwa_paths],
                         ROOT / 'pwa'))
    if api_paths:
        commands.append(('format:api:task',
                         ['dotnet', 'format', '--include', *api_paths], ROOT / 'api'))
    for item in commands:
        name, command, *cwd = item
        before = worktree.snapshot(ROOT)
        status, detail = run_command(command, cwd=cwd[0] if cwd else None)
        print(f'{name}: {status}: {detail}', flush=True)
        if status != 'passed':
            return 2 if status == 'blocked' else 1
        writes = set(worktree.changed_between(before, worktree.snapshot(ROOT)))
        if name == 'gen:client':
            allowed = {path for path in writes if path.startswith('pwa/src/lib/api/generated/')}
        elif name == 'format:pwa:task':
            allowed = {'pwa/' + path for path in pwa_paths}
        else:
            allowed = {'api/' + path for path in api_paths}
        unexpected = sorted(writes - allowed)
        if unexpected:
            print('blocked: preparation changed unexpected paths: ' + ', '.join(unexpected))
            return 2
    print('Preparation finished; inspect diff before task verify. No verification claim.')
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--prepare', action='store_true')
    mode.add_argument('--plan', action='store_true', help='Print selection as JSON without running checks or writing evidence')
    parser.add_argument('paths', nargs='*', help='Explicit changed repository-relative paths; default: all Git changes')
    args = parser.parse_args()
    changed = test_ops.get_changed_files()
    paths = sorted(set(args.paths)) if args.paths else changed
    invalid = [path for path in paths if Path(path).is_absolute()
               or '..' in Path(path).parts or path not in changed]
    if invalid:
        print('blocked: paths must be changed repository-relative files: ' + ', '.join(invalid), file=sys.stderr)
        return 2
    if args.prepare and changed and not args.paths:
        print('blocked: preparation requires explicit paths; use task prepare -- <paths>', file=sys.stderr)
        return 2
    if args.plan:
        print(json.dumps(verification_plan(paths, changed, explicit=bool(args.paths)), indent=2))
        return 0
    print(f'Selected changed paths: {len(paths)}; other Git changes excluded: {len(set(changed) - set(paths))}. '
          'Path selection does not prove edit ownership.', flush=True)
    if args.prepare:
        return prepare(paths)
    selected = checks_for(paths)
    print('Change classes: ' + ', '.join(sorted(classes_for(paths))), flush=True)
    print('Checks: ' + ', '.join(selected), flush=True)
    scoped = bool(args.paths) and can_scope_documentation(paths)
    results = verify(selected, paths, scoped_documentation=True) if scoped else verify(selected, paths)
    record = {'changed_paths': paths, 'selection': 'explicit' if args.paths else 'all-git-changes',
              'excluded_paths': sorted(set(changed) - set(paths)),
              'checks': results, 'automated_checks_passed': bool(selected) and all(
        value['status'] in ('passed', 'not-applicable') for value in results.values())}
    record['task_acceptance'] = 'not-evaluated: reconcile selected task/fixture/host evidence separately'
    record['verification_scope'] = 'selected-documentation' if scoped else 'repository'
    # Preserve every invocation; publish the convenience pointer atomically.
    run_id = uuid.uuid4().hex
    record['record_path'] = f'.task/agent-finish/runs/{run_id}.json'
    run_output = ROOT / record['record_path']
    run_output.parent.mkdir(parents=True, exist_ok=True)
    encoded = json.dumps(record, indent=2) + '\n'
    with run_output.open('x') as output_file:
        output_file.write(encoded)
    output = ROOT / '.task/agent-finish/last-run.json'
    temporary = output.with_name(f'.{run_id}.tmp')
    temporary.write_text(encoded)
    os.replace(temporary, output)
    print(json.dumps(record, indent=2))
    if record['automated_checks_passed']:
        return 0
    return 1 if any(v['status'] == 'failed' for v in results.values()) else 2


if __name__ == '__main__':
    raise SystemExit(main())
