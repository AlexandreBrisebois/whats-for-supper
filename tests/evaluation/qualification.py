"""Operator-side HM-Q planning, clean export and evidence reporting. Never runs a model.

Export is staging, not process isolation. Mount only the exported workspace into a
disposable runner; keep this program, records, oracles and source Git outside it.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import statistics
import subprocess

import jsonschema
import yaml

E = Path(__file__).resolve().parent
P = E.parent
ROOT = P.parents[2]
CATALOG = yaml.safe_load((E / 'scenarios.yaml').read_text())
BASE = CATALOG['baseline_commit']
SCHEMA = json.loads((E / 'run-record.schema.json').read_text())
EXCLUDED = '.kiro/specs/harness-modernization'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def git(*args, cwd=ROOT):
    return subprocess.check_output(['git', *args], cwd=cwd, stderr=subprocess.PIPE)


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x') as stream:
        json.dump(value, stream, indent=2)
        stream.write('\n')


def safe_path(value):
    path = Path(value)
    if (path.is_absolute() or '..' in path.parts or '.git' in path.parts
            or value == EXCLUDED or value.startswith(EXCLUDED + '/')):
        raise ValueError(f'Not an agent-visible path: {value}')
    return path


def overlay_paths():
    """Only paths owned by recorded A-E implementation; no broad HEAD overlay."""
    paths = set()
    for letter, key in [('a', 'files'), ('b', 'files'), ('c', 'files'),
                        ('d', 'hm_d_changes'), ('e', 'implementation_files')]:
        record = json.loads((P / f'hm-{letter}-content.json').read_text())
        paths.update(record[key])
        if letter == 'b':
            paths.update(record.get('retired', []))
    return sorted(p for p in paths if not p.startswith(EXCLUDED + '/'))


def empty_value(schema):
    if 'const' in schema:
        return schema['const']
    if 'null' in schema.get('type', []):
        return None
    if 'enum' in schema:
        return schema['enum'][0]
    kind = schema.get('type')
    if kind == 'object':
        return {k: empty_value(schema['properties'][k]) for k in schema.get('required', [])}
    return {'array': [], 'string': '', 'boolean': False, 'integer': 1}.get(kind)


def schedule(config_id, host, model):
    if not re.fullmatch(r'[a-z0-9-]+', config_id):
        raise ValueError('Configuration ID must use lowercase letters, numbers and hyphens')
    rows = []
    for scenario in CATALOG['scenarios']:
        for repeat in range(1, 4):
            order = ['candidate', 'baseline'] if repeat == 2 else ['baseline', 'candidate']
            for variant in order:
                row = empty_value(SCHEMA)
                pair = f'{config_id}-{scenario["id"]}-{repeat}'
                row.update(run_id=f'{pair}-{variant}', pair_id=pair, variant=variant, repetition=repeat)
                row['identity'].update(application_commit=BASE, fixture_id=scenario['id'],
                                       fixture_version=scenario['version'],
                                       payloads=[{k: p[k] for k in ('destination', 'sha256', 'state')}
                                                 for p in scenario['setup_payloads']])
                row['configuration'].update(host=host, model_id=model, memory_mode='unknown')
                row['result'].update(run_outcome='not-run', task_handling='not-run',
                                     terminal_status='not-run', qualification='unqualified',
                                     reason='Scheduled slot; runner, settings and authentication not qualified.')
                rows.append(row)
    return rows


def validate_record(row, evidence_root=None):
    jsonschema.Draft7Validator.check_schema(SCHEMA)
    jsonschema.validate(row, SCHEMA)
    if row['result']['run_outcome'] == 'pass':
        if row['configuration']['memory_mode'] != 'absent-disposable-profile':
            raise ValueError('Passing qualification requires a disposable profile without host memory')
        if not row['operator_review']['reviewer']:
            raise ValueError('Passing qualification requires transcript/operator review')
        if evidence_root is not None:
            refs = [row[k] for k in ('initial_state_evidence', 'final_state_evidence',
                                    'transcript_evidence', 'exact_prompt_evidence')]
            refs.extend(c['evidence_ref'] for c in row['checks'])
            for ref in refs:
                path = evidence_root / safe_path(ref)
                if not path.is_file():
                    raise ValueError(f'Missing evidence: {ref}')


def summarize(rows):
    attempts = [r for r in rows if r['result']['run_outcome'] in ('pass', 'fail')]
    completed = sum(r['result']['completion_verified'] for r in attempts)
    handled = sum(r['result']['task_handling'] == 'pass' for r in attempts)
    values = [r['metrics']['total_tokens'] for r in attempts]
    total = sum(values) if values and all(v is not None for v in values) else None
    successes = [r for r in attempts if r['result']['run_outcome'] == 'pass']

    def median(field):
        values = [r['metrics'][field] for r in successes]
        return statistics.median(values) if values and all(v is not None for v in values) else None

    return {
        'scheduled': len(rows), 'attempted': len(attempts),
        'blocked': sum(r['result']['run_outcome'] == 'blocked' for r in rows),
        'not_run': sum(r['result']['run_outcome'] == 'not-run' for r in rows),
        'verified_completions': completed, 'successful_handling': handled,
        'total_attempt_tokens': total,
        'all_attempt_tokens_per_verified_completion': total / completed if total is not None and completed else None,
        'all_attempt_tokens_per_successful_handling': total / handled if total is not None and handled else None,
        'successful_median_tokens': median('total_tokens'),
        'successful_median_wall_clock_ms': median('wall_clock_ms'),
        'hard_failures': {k: sum(r['result'][k] for r in rows) for k in
                          ('scope_violation', 'destructive_action', 'dirty_file_loss', 'false_completion')},
        'qualification': 'unqualified',
        'limitation': 'Descriptive metrics only; paired per-scenario comparison, host probes and real gates require review.'}


def tree_identity(workspace):
    result = {}
    for path in sorted(workspace.rglob('*')):
        if '.git' in path.relative_to(workspace).parts:
            continue
        if path.is_symlink():
            raise ValueError(f'Symlink in exported workspace: {path}')
        if path.is_file():
            result[path.relative_to(workspace).as_posix()] = {
                'sha256': sha(path.read_bytes()), 'executable': bool(path.stat().st_mode & 0o111)}
    return result


def export(workspace, evidence, variant, fixture, candidate):
    """Use Git blobs, never clone/history, working-tree bytes or user credentials."""
    workspace, evidence = workspace.resolve(), evidence.resolve()
    if workspace.exists() or evidence.exists():
        raise ValueError('Export destinations must be new; never overwrite a run')
    if (workspace.is_relative_to(ROOT) or evidence.is_relative_to(workspace)
            or workspace.is_relative_to(evidence)):
        raise ValueError('Workspace must be outside source; evidence must be outside workspace')
    scenario = next(s for s in CATALOG['scenarios'] if s['id'] == fixture)
    candidate = git('rev-parse', '--verify', candidate + '^{commit}').decode().strip()
    owned = set(overlay_paths())

    def entries(commit):
        result = {}
        for raw in git('ls-tree', '-rz', '--full-tree', commit).split(b'\0'):
            if raw:
                header, name = raw.split(b'\t', 1)
                mode, kind, oid = header.decode().split()
                path = name.decode()
                if path.startswith(EXCLUDED + '/'):
                    continue
                safe_path(path)
                if kind != 'blob' or mode not in ('100644', '100755'):
                    raise ValueError(f'Unsupported snapshot entry: {path} {mode}')
                result[path] = (mode, oid)
        return result

    baseline, current = entries(BASE), entries(candidate)
    selected = dict(baseline)
    overlay = {}
    if variant == 'candidate':
        for path in sorted(owned):
            if baseline.get(path) != current.get(path):
                overlay[path] = current.get(path)
                if path in current:
                    selected[path] = current[path]
                else:
                    selected.pop(path, None)
    workspace.mkdir(parents=True)
    evidence.mkdir(parents=True)
    transformations = []
    for path, (mode, oid) in selected.items():
        data = git('cat-file', 'blob', oid)
        if path.endswith(('.md', '.yaml', '.yml', '.json', '.toml')):
            # Shared absent-resource marker, never copy evaluation text into the runner.
            changed = re.sub(rb'(?:\.kiro/specs/)?harness-modernization(?:/[A-Za-z0-9_./-]+)?',
                             b'HM_EVALUATION_RESOURCE_UNAVAILABLE', data)
            if changed != data:
                transformations.append({'path': path, 'before': sha(data), 'after': sha(changed)})
                data = changed
        destination = workspace / safe_path(path)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
        destination.chmod(0o755 if mode == '100755' else 0o644)
    application = {p: v for p, v in tree_identity(workspace).items() if p not in owned}
    for payload in scenario['setup_payloads']:
        data = (E / payload['source']).read_bytes()
        if sha(data) != payload['sha256']:
            raise ValueError('Fixture payload hash mismatch')
    for state in ('committed', 'tracked-dirty', 'untracked'):
        for payload in scenario['setup_payloads']:
            if payload['state'] != state:
                continue
            path = workspace / safe_path(payload['destination'])
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes((E / payload['source']).read_bytes())
        if state == 'committed':
            # No inherited hooks/config; this is a new synthetic history, not a clone.
            env = {**os.environ, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': os.devnull}
            for command in (['init', '-q'], ['add', '-f', '.'],
                            ['-c', 'user.name=HM-Q fixture', '-c', 'user.email=fixture@example.invalid',
                             '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'Synthetic fixture baseline']):
                subprocess.run(['git', *command], cwd=workspace, env=env, check=True, capture_output=True)
    write_json(evidence / 'export.json', {
        'variant': variant, 'fixture': fixture, 'application_commit': BASE, 'harness_commit': candidate,
        'application_tree_sha256': sha(json.dumps(application, sort_keys=True).encode()),
        'harness_overlay_sha256': sha(json.dumps(overlay, sort_keys=True).encode()),
        'overlay': overlay, 'shared_transformation': 'HM_EVALUATION_RESOURCE_UNAVAILABLE',
        'transformations': transformations, 'initial_files': tree_identity(workspace),
        'initial_git_status': git('status', '--porcelain', cwd=workspace).decode(),
        'isolation': 'staging-only; no process/auth/native-host qualification'})
    (evidence / 'prompt.txt').write_text(scenario['user_prompt'])
    print(f'Exported {variant}/{fixture}; evidence outside workspace. No model invoked.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    plan = sub.add_parser('plan')
    plan.add_argument('--configuration', required=True)
    plan.add_argument('--host', choices=['codex', 'antigravity'], required=True)
    plan.add_argument('--model')
    plan.add_argument('--output', type=Path, required=True)
    out = sub.add_parser('export')
    out.add_argument('--workspace', type=Path, required=True)
    out.add_argument('--evidence', type=Path, required=True)
    out.add_argument('--variant', choices=['baseline', 'candidate'], required=True)
    out.add_argument('--fixture', choices=[s['id'] for s in CATALOG['scenarios']], required=True)
    out.add_argument('--candidate', required=True)
    report = sub.add_parser('report')
    report.add_argument('records', type=Path)
    args = parser.parse_args()
    if args.command == 'plan':
        for row in schedule(args.configuration, args.host, args.model):
            validate_record(row)
            write_json(args.output / (row['run_id'] + '.json'), row)
        print('48 schema-valid not-run slots created; no qualification claim.')
    elif args.command == 'export':
        export(args.workspace, args.evidence, args.variant, args.fixture, args.candidate)
    else:
        rows = [json.loads(p.read_text()) for p in sorted(args.records.glob('*.json'))]
        if len({r['run_id'] for r in rows}) != len(rows):
            raise ValueError('Duplicate run IDs')
        for row in rows:
            validate_record(row, args.records)
        groups = {}
        for row in rows:
            key = (row['pair_id'].rsplit('-', 2)[0], row['identity']['fixture_id'], row['variant'])
            groups.setdefault('/'.join(key), []).append(row)
        print(json.dumps({k: summarize(v) for k, v in groups.items()}, indent=2))


if __name__ == '__main__':
    main()
