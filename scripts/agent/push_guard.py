#!/usr/bin/env python3
"""Guard clean committed source and select existing push checks from its Git range."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

import finish

ROOT = Path(__file__).resolve().parents[2]
TASK_ORDER = ('check:node', 'spec:check', 'test:agent', 'check:contracts',
              'gen:client:check', 'check:push:api', 'check:push:pwa', 'test:database', 'test:smoke')


def git(root, *args, input=None):
    return subprocess.check_output(['git', *args], cwd=root, input=input,
                                   text=True, stderr=subprocess.DEVNULL).strip()


def commit(root, ref):
    return git(root, 'rev-parse', '--verify', '--end-of-options', f'{ref}^{{commit}}')


def validate(root: Path, expected_head: str) -> None:
    head = git(root, 'rev-parse', 'HEAD')
    if head != expected_head:
        raise RuntimeError('Checked-out revision changed during validation; rerun task check:push.')
    target = os.environ.get('PRE_COMMIT_TO_REF')
    if target:
        try:
            target = commit(root, target)
        except subprocess.CalledProcessError as error:
            raise RuntimeError('The pushed revision cannot be resolved; check out that revision before pushing.') from error
        if target != head:
            raise RuntimeError('The pushed revision is not checked out; check out that revision before pushing.')
    dirty = git(root, 'status', '--porcelain', '--untracked-files=normal')
    if dirty:
        raise RuntimeError('Push validation requires a clean worktree. Commit or preserve pending tracked/untracked changes first.')


def selection(paths, full=False):
    """Reuse the repository classifier, with API/PWA owners within its application class."""
    tasks, reasons = set(), set()
    pwa_files = []
    if full:
        return list(TASK_ORDER), [], ['Full validation requested or no trustworthy range is available.']
    for path in paths:
        kind = finish.classes_for([path])
        if path.startswith('scripts/ci/'):
            kind = {'harness'}
        if kind == {'documentation'}:
            reasons.add('Documentation: committed whitespace and introduced links only.')
            if path.startswith('openspec/'):
                tasks.add('spec:check')
            continue
        if path == '.nvmrc':
            tasks.update(('check:node', 'test:agent', 'check:push:pwa'))
            pwa_files.append(path)
            reasons.add('Node pin: tooling checks and all PWA suites.')
        elif kind == {'harness'}:
            tasks.update(('check:node', 'test:agent'))
            if path.startswith('openspec/'):
                tasks.add('spec:check')
            reasons.add('Harness/pipeline inputs: existing tooling regression tests.')
        elif (path == 'specs/openapi.yaml' or path.startswith('pwa/src/lib/api/generated/')
              or path.startswith(('api/src/RecipeApi/Controllers/', 'api/src/RecipeApi/Dto/'))):
            tasks.update(('check:node', 'check:contracts', 'gen:client:check', 'check:push:api', 'check:push:pwa'))
            pwa_files.append('specs/openapi.yaml')
            reasons.add('API/client contract seam: API checks, client parity and all PWA suites.')
        elif (path.endswith('.sql') or path.startswith(('api/database/', 'api/src/RecipeApi/Data/',
                                                       'api/src/RecipeApi/Models/'))):
            tasks.update(('check:contracts', 'check:push:api', 'test:database', 'test:smoke'))
            reasons.add('Database inputs: API checks, relational tests and disposable smoke stack.')
        elif (path.startswith(('docker/', 'release-template/')) or Path(path).name.startswith('Dockerfile')):
            tasks.update(TASK_ORDER)
            reasons.add('Container/deployment inputs: full validation including database smoke.')
        elif path.startswith('api/'):
            tasks.update(('check:contracts', 'check:push:api'))
            if path.endswith(('.csproj', '.sln', '.slnx', '.props', '.targets', 'packages.lock.json')):
                tasks.update(TASK_ORDER)
                reasons.add('Backend build/dependency inputs: full validation.')
            else:
                reasons.add('API-only inputs: API checks and static contract checks.')
        elif path.startswith('pwa/'):
            tasks.update(('check:node', 'check:push:pwa'))
            if path.startswith('pwa/e2e/'):
                tasks.add('check:contracts')
            pwa_files.append(path)
            reasons.add('PWA inputs: production checks with the shared CI suite selector.')
        else:
            tasks.update(TASK_ORDER)
            reasons.add(f'Unknown input {path}: full validation.')
    return [task for task in TASK_ORDER if task in tasks], pwa_files, sorted(reasons)


def build_plan(root, base=None, full=False):
    head = commit(root, 'HEAD')
    hook_from, hook_to = os.environ.get('PRE_COMMIT_FROM_REF'), os.environ.get('PRE_COMMIT_TO_REF')
    fallback = None
    # Hook refs are authoritative. Never silently substitute upstream for a bad hook range.
    ref = hook_from if hook_from or hook_to else base
    if not ref and not (hook_from or hook_to):
        try:
            ref = git(root, 'rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}')
        except subprocess.CalledProcessError:
            fallback = 'No hook range, explicit base or upstream is available.'
    if ref:
        try:
            base = commit(root, ref)
            subprocess.run(['git', 'merge-base', '--is-ancestor', base, head], cwd=root,
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except subprocess.CalledProcessError:
            base = None
            fallback = 'The base is unavailable or not an ancestor; use full validation.'
    else:
        base = None
        fallback = fallback or 'The hook did not supply a complete range; use full validation.'
    if base:
        raw = subprocess.check_output(['git', 'diff', '--no-renames', '--name-only', '-z', base, head], cwd=root)
    else:
        raw = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', '-z', head], cwd=root)
    paths = sorted(filter(None, raw.decode().split('\0')))
    checks, pwa_files, reasons = selection(paths, full or bool(fallback))
    suites = []
    if 'check:push:pwa' in checks:
        if not pwa_files or full or fallback or len(checks) == len(TASK_ORDER):
            suites = ['all']
        else:
            result = subprocess.run(['node', 'scripts/ci/select-e2e.cjs'], input='\n'.join(pwa_files),
                                    cwd=root, capture_output=True, text=True, check=True,
                                    env={**os.environ, 'FULL_VALIDATION': 'false'})
            suites = json.loads(result.stdout)
            if not suites or any(s not in ('tonight', 'planning', 'recipes', 'household') for s in suites):
                raise RuntimeError('The shared E2E selector returned no valid suites for a PWA change.')
    return {'head': head, 'base': base, 'files': paths, 'checks': checks,
            'e2e_suites': suites, 'reasons': reasons, 'fallback': fallback}


def execute(root, plan):
    head = plan['head']
    validate(root, head)
    try:
        base = plan['base']
        if not base:
            # Only execution writes the canonical empty tree object; plan mode stays read-only.
            base = git(root, 'hash-object', '-t', 'tree', '-w', '--stdin', input='')
        subprocess.run(['git', 'diff', '--check', base, head], cwd=root, check=True)
        status, detail = finish.documentation_check(plan['files'], baseline_ref=base)
        if status != 'passed':
            raise RuntimeError(detail)
        print('passed: committed whitespace and introduced documentation links', flush=True)
        for target in plan['checks']:
            validate(root, head)
            command = ['task', target]
            if target == 'check:push:pwa':
                command.append('SUITES=' + ' '.join(plan['e2e_suites']))
            if target == 'test:smoke':
                command += ['--', '--isolated']
            child_env = {k: v for k, v in os.environ.items() if k not in {
                'WFS_E2E_SUITE', 'WFS_PUSH_E2E_SUITES', 'WFS_SMOKE_IMAGES',
                'WFS_SMOKE_PROJECT', 'WFS_SMOKE_OVERRIDE'}}
            subprocess.run(command, cwd=root, env=child_env, check=True)
    finally:
        validate(root, head)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--expected-head')
    parser.add_argument('--run', action='store_true', help='Select and execute existing push tasks')
    parser.add_argument('--plan', action='store_true', help='Explain committed-range checks without running them')
    parser.add_argument('--full', action='store_true', help='Run all existing push validation tasks')
    parser.add_argument('--base', help='Manual comparison base; hook refs take precedence')
    args = parser.parse_args()
    try:
        if not (args.run or args.plan):
            validate(ROOT, args.expected_head or commit(ROOT, 'HEAD'))
            return 0
        if not args.plan:
            validate(ROOT, args.expected_head or commit(ROOT, 'HEAD'))
        plan = build_plan(ROOT, args.base, args.full)
        if args.plan:
            print(json.dumps(plan, indent=2))
            return 0
        print(f'Push range: {plan["base"] or "full tree"} → {plan["head"]}', flush=True)
        for reason in plan['reasons']:
            print('  ' + reason, flush=True)
        print('Selected: ' + (', '.join(plan['checks']) or 'documentation checks only'), flush=True)
        if plan['e2e_suites']:
            print('E2E suites: ' + ', '.join(plan['e2e_suites']), flush=True)
        execute(ROOT, plan)
        print('passed: selected committed-source push checks', flush=True)
    except (RuntimeError, subprocess.CalledProcessError, ValueError, OSError) as error:
        print(f'failed: push validation: {error}', file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
