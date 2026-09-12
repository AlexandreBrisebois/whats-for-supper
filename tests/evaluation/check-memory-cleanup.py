"""HM-E source/retirement/discovery closure. Static evidence, never model qualification."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import yaml

ROOT = Path(__file__).resolve().parents[4]
PACKAGE = ROOT / '.kiro/specs/harness-modernization'
BASE = '52e2ed2d3505d74020e7628fc83c53e1019f63e1'


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def check():
    manifest = yaml.safe_load((PACKAGE / 'artifact-manifest.yaml').read_text())
    identity = json.loads((PACKAGE / 'hm-e-content.json').read_text())
    assert identity['starting_commit'] == BASE
    permitted = {a['path'] for a in manifest['artifacts']
                 if any(t['task'] == 'HM-E' for t in a.get('migration_touches', []))
                 and a['category'] != 'historical'}
    # Explicit HM-E task effects and manifest destinations, not a manifest rewrite.
    permitted.update({'.agents/core/execution-harness.md', '.agents/core/context-loading.md',
                      '.agents/core/network-topology.md', '.agents/core/ontology.md',
                      'LOCAL_DEV_LOOP.md', 'scripts/agent/tests/test_summary_status.py',
                      'specs/decisions/044-bounded-review-and-resume-evidence.md'})
    changed = set(git('diff', '--name-only', BASE).decode().splitlines())
    changed.update(git('ls-files', '--others', '--exclude-standard').decode().splitlines())
    outside = {p for p in changed if p not in permitted
               and not p.startswith('.kiro/specs/harness-modernization/')}
    assert not outside, ('outside HM-E', outside)
    assert not git('diff', '--cached', '--name-only'), 'unexpected staging'
    # Frozen baseline, protocol, fixtures, previous evidence and unrelated history stay exact.
    for p in git('ls-tree', '-r', '--name-only', BASE).decode().splitlines():
        if p.startswith('.kiro/specs/harness-modernization/'):
            if Path(p).name in {'tasks.md', 'task-graph.yaml', 'requirements.md', 'design.md'}:
                continue
            assert (ROOT / p).read_bytes() == git('show', BASE + ':' + p), ('prior evidence', p)
        if p not in permitted and not p.startswith('.kiro/specs/harness-modernization/'):
            assert (ROOT / p).read_bytes() == git('show', BASE + ':' + p), ('unrelated bytes', p)
    old_graph = yaml.safe_load(git('show', BASE + ':.kiro/specs/harness-modernization/task-graph.yaml'))
    new_graph = yaml.safe_load((PACKAGE / 'task-graph.yaml').read_text())
    for old, new in zip(old_graph['tasks'], new_graph['tasks']):
        if old['id'] == 'HM-E':
            assert new['status'] == 'implemented-verification-blocked'
            new = {**new, 'status': old['status']}
        assert old == new, ('task scope or prior status altered', old['id'])
    original = git('show', BASE + ':JOURNAL.md')
    journal = (ROOT / 'JOURNAL.md').read_bytes()
    assert journal.endswith(original), 'historical body was changed'
    inventory = json.loads((PACKAGE / 'hm-e-journal-inventory.json').read_text())
    assert inventory['source_sha256'] == digest(original)
    lines = original.decode().splitlines(keepends=True)
    assert inventory['line_count'] == len(lines)
    previous = 0
    for row in inventory['sections']:
        assert row['start_line'] == previous + 1
        previous = row['end_line']
        data = ''.join(lines[row['start_line']-1:previous]).encode()
        assert digest(data) == row['source_section_sha256']
        assert row['decision'] and row['destinations'] and row['verification']['method']
        for name in row['verification']['owner_paths']:
            assert (ROOT / name).exists(), ('ledger destination', name)
    assert previous == len(lines)
    for name, item in identity['implementation_files'].items():
        p = ROOT / name
        assert (digest(p.read_bytes()) if p.is_file() else None) == item['after_sha256'], ('identity', name)
    for name, value in identity['verification_sources'].items():
        assert digest((ROOT / name).read_bytes()) == value, ('verification source drift', name)
    expected = set(manifest['retained_skill_directories'])
    skills = list((ROOT / '.agents/skills').glob('*/SKILL.md'))
    assert len(skills) == len(expected) == 10
    assert {p.parent.name for p in skills} == expected
    registry = (ROOT / '.agents/skills/README.md').read_text()
    rows = re.findall(r'^\| `([^`]+)` \| \[([^]]+)\]\(([^)]+)\)', registry, re.M)
    assert len(rows) == 10
    for p in skills:
        metadata = yaml.safe_load(p.read_text().split('---')[1])
        name = metadata['name']
        if p.parent.name == 'aws-architect':
            assert name == 'aws-well-architected'
        else:
            assert name == p.parent.name
        assert any(r[0] == name and r[2] == p.parent.name + '/SKILL.md' for r in rows)
    retired = [r['skill'] for r in manifest['retirements']]
    assert len(retired) == 9
    for name in retired:
        assert not (ROOT / '.agents/skills' / name).exists(), ('retired directory', name)
    for name in ['.agents/MEMORY.md', '.agents/core/memory']:
        assert not (ROOT / name).exists(), ('retired memory', name)
    # Historical mentions (including evaluation code) are evidence, not active routes.
    active = []
    tracked = set(git('ls-files', '-co', '--exclude-standard').decode().splitlines())
    for name in tracked:
        p = ROOT / name
        if not p.is_file() or p.suffix not in {'.md', '.yaml', '.yml', '.json', '.py'}:
            continue
        if any(x in p.parts for x in ['archive', 'arcive', '05_ARCHIVE', 'harness-modernization']):
            continue
        if name == 'JOURNAL.md' or name.startswith('specs/decisions/'):
            continue
        text = p.read_bytes().decode("utf-8", errors="replace")
        for retired_name in retired:
            assert not re.search(r'(?:skills/|\.agents/SKILL_)' + re.escape(retired_name) + r'(?:/|\.md)', text), ('active retired caller', name, retired_name)
        assert '.agents/MEMORY.md' not in text and 'core/memory/' not in text, ('memory caller', name)
        if name.startswith('.agents/') or name in {'AGENT.md', 'AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.kiro/steering.md', '.github/copilot-instructions.md'}:
            active.append(p)
    for p in active:
        body = re.sub(r'```.*?```', '', p.read_text(), flags=re.S)
        for link in re.findall(r'\]\(([^)\s]+)\)', body):
            if '://' in link or link.startswith(('#', '/')):
                continue
            assert (p.parent / link.split('#')[0]).exists(), ('active link', p, link)
    targets = yaml.safe_load((ROOT / 'Taskfile.yml').read_text())['tasks']
    summary = '\n'.join(targets['agent:summary']['cmds'])
    assert 'cat HANDOVER' not in summary and '.agents/skills/README.md' not in summary
    assert targets['agent:status']['cmds'] == ['cat HANDOVER.md']
    print(f'PASS HM-E static closure: {len(inventory["sections"])} journal sections/{len(lines)} lines; '
          f'9 retired/10 retained skills; {len(active)} active route files; ledger destinations, '
          'content identities, scope and previous evidence preserved.')
    print('Native fresh/resumed loading and F07 candidate behavior remain separate blocked evidence.')


if __name__ == '__main__':
    check()
