"""HM-C static closure, path/target, preservation and identity checks; no model qualification."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import yaml

ROOT = Path(__file__).resolve().parents[4]
PACKAGE = ROOT / '.kiro/specs/harness-modernization'
BASE = '55bd68f7961647fc9a3c4d754e8de2f46821b1e9'
ADDITIONS = {'.agents/core/wfs-source-map.md',
             '.agents/skills/openapi-expert/api-design-principles.md'}
ROUTING = {'.agents/core/context-loading.md', '.agents/core/ontology.md',
           '.agents/skills/README.md'}
EVIDENCE = {'.kiro/specs/harness-modernization/' + p for p in [
    'tasks.md', 'task-graph.yaml', 'requirements.md', 'design.md',
    'hm-c-validation.md', 'hm-c-content.json', 'hm-c-fixtures.json',
    'evaluation/check-implementation-guidance.py']}


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True)


def check():
    manifest = yaml.safe_load((PACKAGE / 'artifact-manifest.yaml').read_text())
    owned = {a['path'] for a in manifest['artifacts'] if a['owner_task'] == 'HM-C'}
    allowed = owned | ROUTING | ADDITIONS | EVIDENCE
    changed = set(git('diff', '--name-only', BASE).splitlines())
    untracked = set(git('ls-files', '--others', '--exclude-standard').splitlines())
    assert not (changed | untracked) - allowed, ('outside HM-C', (changed | untracked) - allowed)
    # The starting worktree was clean. Checking every tracked change against BASE
    # preserves unrelated tracked bytes, prior evidence, tooling and frozen fixtures.
    assert git('diff', '--cached', '--name-only') == '', 'unexpected staging'
    old_graph = yaml.safe_load(git('show', BASE + ':.kiro/specs/harness-modernization/task-graph.yaml'))
    new_graph = yaml.safe_load((PACKAGE / 'task-graph.yaml').read_text())
    for old, new in zip(old_graph['tasks'], new_graph['tasks']):
        if old['id'] == 'HM-C':
            assert new['status'] == 'implemented-unqualified'
            new = {**new, 'status': old['status']}
        assert old == new, ('task scope/dependency changed', old['id'])
    retired = ['team-orchestration', 'tracer', 'contract-engineer']
    for name in retired:
        assert not (ROOT / '.agents/skills' / name).exists(), name
    for base in ['.agents', '.kiro', '.github', 'specs']:
        for p in (ROOT / base).rglob('*'):
            if not p.is_file() or p.suffix not in {'.md', '.yaml', '.yml', '.json'}:
                continue
            if any(x in p.parts for x in ['archive', '05_ARCHIVE', 'arcive', 'harness-modernization']):
                continue
            assert not re.search(r'\b(?:team-orchestration|contract-engineer|tracer)\b', p.read_text()), ('active caller', p)
    registry = (ROOT / '.agents/skills/README.md').read_text()
    skills = list((ROOT / '.agents/skills').glob('*/SKILL.md'))
    assert len(skills) == 13
    for p in skills:
        name = yaml.safe_load(p.read_text().split('---')[1])['name']
        assert f'`{name}`' in registry and f'{p.parent.name}/SKILL.md' in registry
    targets = yaml.safe_load((ROOT / 'Taskfile.yml').read_text())['tasks']
    documented_targets, source_paths = set(), set()
    for name in owned | ROUTING | ADDITIONS:
        p = ROOT / name
        if not p.exists():
            continue
        text = p.read_text()
        for link in re.findall(r'\]\(([^)]+)\)', text):
            if '://' not in link and not link.startswith('#'):
                assert (p.parent / link.split('#')[0]).resolve().exists(), (name, link)
        for target in re.findall(r'`task ([\w:-]+)', text):
            assert target in targets, (name, target)
            documented_targets.add(target)
        for ref in re.findall(r'`([^`\n]+)`', text):
            if ref.startswith(('api/', 'pwa/', 'specs/', 'scripts/', '.kiro/')) and not any(x in ref for x in ['{', '*', ' ']):
                source_paths.add(ref)
            elif ref.startswith(('Services/', 'Models/', 'Data/', 'Infrastructure/', 'Workflows/', 'Workflow/')):
                source_paths.add('api/src/RecipeApi/' + ref)
        assert not any(x in text for x in ['task types:sync', 'task api:test', 'task pwa:test', 'task db:migrate:', 'Code can change entirely; the spec and the tests should not']), name
    for path in source_paths:
        assert (ROOT / path).exists(), ('source path', path)
    identity_file = PACKAGE / 'hm-c-content.json'
    assert identity_file.exists(), 'missing HM-C identity record'
    if identity_file.exists():
        identity = json.loads(identity_file.read_text())
        assert identity['starting_commit'] == BASE
        for group in ['files', 'source_inputs']:
            for name, entry in identity[group].items():
                p = ROOT / name
                if entry is None:
                    assert not p.exists(), ('removed identity', name)
                else:
                    assert sha(p) == entry['sha256'] and p.stat().st_size == entry['bytes'], ('identity', name)
    print(f'PASS HM-C: 3 retirements; 13 registered skills; {len(documented_targets)} documented Taskfile targets; {len(source_paths)} source paths; changed Markdown links; scope, unstaged state, prior evidence/tooling preservation and content identities')
    print('NOTE static checks only; semantic reviews and blocked model/native-host qualification are separate evidence')
    return owned | ROUTING | ADDITIONS, source_paths


if __name__ == '__main__':
    check()
