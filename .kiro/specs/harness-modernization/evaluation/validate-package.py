"""Validate Phase 0 artifacts and optional portable fixture controls; never run models."""
from pathlib import Path
import argparse
import ast
import hashlib
import json
import os
import re
import shlex
import subprocess
import tempfile
import yaml

P = Path(__file__).resolve().parents[1]
E = P / 'evaluation'
R = P.parents[2]

def digest(data):
    return hashlib.sha256(data).hexdigest()

def read_yaml(path):
    return yaml.safe_load(path.read_text())

def safe_relative(value):
    path = Path(value)
    assert not path.is_absolute() and '..' not in path.parts, value
    assert '.git' not in path.parts, value
    return path

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--smoke', action='store_true')
    args = parser.parse_args()
    for p in P.rglob('*.yaml'):
        read_yaml(p)
    for p in P.rglob('*.yml'):
        read_yaml(p)
    for p in P.rglob('*.json'):
        json.loads(p.read_text())
    for p in P.rglob('*.py'):
        ast.parse(p.read_text(), filename=str(p))
    # Only actual Markdown links are checked; prose code paths may name planned destinations.
    for p in P.rglob('*.md'):
        for link in re.findall(r'\]\(([^)]+)\)', p.read_text()):
            if '://' not in link and not link.startswith('#'):
                assert (p.parent / link.split('#')[0]).exists(), (p, link)
    graph = read_yaml(P / 'task-graph.yaml')['tasks']
    tasks = {t['id']: t for t in graph}
    assert len(tasks) == len(graph) == 7
    seen = set()
    def visit(key, active):
        assert key in tasks and key not in active, ('cycle or unknown task', key)
        if key in seen:
            return
        for parent in tasks[key]['depends_on']:
            visit(parent, active | {key})
        seen.add(key)
    for key in tasks:
        visit(key, set())
    assert set().union(*(set(t['requirements']) for t in graph if t['id'] != 'HM-0')) == {f'HM-R{i:02}' for i in range(1, 15)}
    manifest = read_yaml(P / 'artifact-manifest.yaml')
    entries = manifest['artifacts']
    assert len({a['path'] for a in entries}) == len(entries)
    counts = {c: sum(a['category'] == c for a in entries) for c in manifest['counts']}
    assert counts == manifest['counts']
    for c, n in {'prompt': 6, 'skill-entry': 19, 'skill-support': 19, 'adapter': 4, 'core': 5, 'registry': 1, 'repo-memory': 2}.items():
        assert counts[c] == n, (c, counts[c])
    assert len(manifest['retirements']) == 9
    assert len(manifest['retained_skill_directories']) == 10
    assert not ({x['skill'] for x in manifest['retirements']} & set(manifest['retained_skill_directories']))
    for a in entries:
        data = subprocess.check_output(['git', 'show', manifest['baseline_commit'] + ':' + a['path']], cwd=R)
        assert digest(data) == a['baseline_sha256'] and len(data) == a['bytes'], a['path']
        for field in ['purpose', 'activation_trigger', 'authority', 'disposition', 'destinations', 'acceptance_evidence']:
            assert a[field], (a['path'], field)
        assert a['owner_task'] in tasks
        assert a['depends_on'] == tasks[a['owner_task']]['depends_on']
        for touch in a['migration_touches']:
            assert touch['task'] in tasks
        for destination in a['destinations']:
            assert destination['state'] in ['existing', 'planned']
            if destination['state'] == 'existing':
                # This is a frozen baseline inventory; candidate retirement is checked separately.
                subprocess.check_call(['git', 'cat-file', '-e', manifest['baseline_commit'] + ':' + destination['path']], cwd=R)
        for caller in a['callers']:
            subprocess.check_call(['git', 'cat-file', '-e', manifest['baseline_commit'] + ':' + caller['path']], cwd=R)
            assert caller['kind'] in ['historical', 'active-reference', 'incidental-mention']
    # A live caller must be repointed no later than its target's retirement.
    order = {key: n for n, key in enumerate(tasks)}
    indexed = {a['path']: a for a in entries}
    for retirement in manifest['retirements']:
        target = indexed['.agents/skills/' + retirement['skill'] + '/SKILL.md']
        for caller in target['callers']:
            if caller['kind'] != 'active-reference':
                continue
            touches = indexed[caller['path']]['migration_touches']
            assert min(order[t['task']] for t in touches) <= order[retirement['owner_task']], (retirement['skill'], caller)
    raw = subprocess.check_output(['git', 'show', manifest['baseline_commit'] + ':Taskfile.yml'], cwd=R).decode()
    matches = list(re.finditer(r'^  ([^\s#][^\n]*):\s*$', raw, re.M))
    blocks = {m.group(1): raw[m.start():matches[i + 1].start() if i + 1 < len(matches) else len(raw)] for i, m in enumerate(matches)}
    for target in manifest['task_targets']:
        assert digest(blocks[target['target']].encode()) == target['baseline_sha256'], target['id']
        assert target['owner_task'] in tasks
    catalog = read_yaml(E / 'scenarios.yaml')
    scenarios = catalog['scenarios']
    assert [s['id'] for s in scenarios] == [f'F{i:02}' for i in range(1, 9)]
    controls = read_yaml(E / 'controls.yaml')['controls']
    assert set(controls) == {s['id'] for s in scenarios}
    payload_count = 0
    for s in scenarios:
        assert s['application_snapshot'] == manifest['baseline_commit']
        for key in ['user_prompt', 'invocation_path', 'prerequisites', 'forbidden_effects', 'observable_acceptance_assertions', 'verification_commands', 'required_evidence', 'limits', 'cleanup']:
            assert s[key], (s['id'], key)
        assert (E / safe_relative(s['operator_oracle'])).is_file()
        committed = set()
        for payload in s['setup_payloads']:
            source = safe_relative(payload['source'])
            destination = safe_relative(payload['destination'])
            assert str(source).startswith('inputs/' + s['id'] + '/')
            assert digest((E / source).read_bytes()) == payload['sha256'], source
            if payload['state'] == 'committed':
                assert str(destination) not in committed
                committed.add(str(destination))
            elif payload['state'] == 'tracked-dirty':
                assert str(destination) in committed
            else:
                assert payload['state'] == 'untracked' and str(destination) not in committed
            payload_count += 1
        for path in controls[s['id']]['replace']:
            assert path in {x.split('#')[0] for x in s['authorized_effects']}, (s['id'], path)
        taskfile = read_yaml(E / f"inputs/{s['id']}/Taskfile.fixture.yml")
        assert taskfile['tasks']['fixture:check']['cmds'] == [s['phase0_smoke']['command']]
    schema = json.loads((E / 'run-record.schema.json').read_text())
    assert schema['$schema'] == 'http://json-schema.org/draft-07/schema#'
    assert set(schema['required']) == set(schema['properties'])
    assert schema['additionalProperties'] is False
    print(f"PASS package: {len(entries)} artifacts, {len(manifest['task_targets'])} targets, 14 requirements, 7 acyclic tasks, 8 scenarios, {payload_count} payload hashes")
    print('PASS YAML/JSON parsing, Python syntax, local Markdown links and baseline fingerprints')
    print('NOTE JSON Schema structure checked; this checker is not a general JSON Schema implementation')
    if not args.smoke:
        return
    def run(argv, root, expected):
        result = subprocess.run(argv, cwd=root, capture_output=True, text=True, timeout=30, env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"})
        assert result.returncode == expected, (argv, result.returncode, expected, result.stdout, result.stderr)
    for s in scenarios:
        with tempfile.TemporaryDirectory(prefix='harness-fixture-') as directory:
            root = Path(directory)
            for payload in s['setup_payloads']:
                path = root / payload['destination']
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes((E / payload['source']).read_bytes())
            run(shlex.split(s['phase0_smoke']['command']), root, s['phase0_smoke']['expected_exit'])
            run(['python3', str(E / s['operator_oracle']), str(root)], root, s['phase0_oracle_initial_expected_exit'])
            if s['id'] == 'F05':
                run(['python3', 'fixture/live_probe.py'], root, 3)
            for path, content in controls[s['id']]['replace'].items():
                (root / path).write_text(content)
            run(shlex.split(s['phase0_smoke']['command']), root, 0)
            run(['python3', str(E / s['operator_oracle']), str(root)], root, 0)
            for negative in controls[s['id']].get('negative_variants', []):
                originals = {path: (root / path).read_bytes() for path in negative['replace']}
                for path, content in negative['replace'].items():
                    (root / path).write_text(content)
                run(['python3', str(E / s['operator_oracle']), str(root)], root, 1)
                for path, content in originals.items():
                    (root / path).write_bytes(content)
                print(f"PASS {s['id']} rejects negative control: {negative['id']}")
            print(f"PASS {s['id']}: declared seeded outcome, initial oracle and positive control")
    print('PASS fixture smoke only; no model, native-host, real-service or production evaluation performed')

if __name__ == '__main__':
    main()
