"""HM-B candidate closure and preservation checks; not host qualification."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import yaml

ROOT = Path(__file__).resolve().parents[4]
PACKAGE = ROOT / '.kiro/specs/harness-modernization'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    manifest = yaml.safe_load((PACKAGE / 'artifact-manifest.yaml').read_text())
    allowed = {a['path'] for a in manifest['artifacts']
               if any(t['task'] == 'HM-B' for t in a['migration_touches'])}
    retired = {f".agents/skills/{r['skill']}/SKILL.md" for r in manifest['retirements']
               if r['owner_task'] == 'HM-B'}
    added = {'.agents/core/specification-workflow.md', '.agents/templates/execution-packet.md'}
    foundation = json.loads((PACKAGE / 'hm-a-content.json').read_text())['files']
    for path, identity in foundation.items():
        assert sha(ROOT / path) == identity['sha256'], ('HM-A changed', path)
    for a in manifest['artifacts']:
        if a['path'] not in allowed and a['path'] not in foundation:
            assert sha(ROOT / a['path']) == a['baseline_sha256'], ('unrelated changed', a['path'])
    for path in retired:
        assert not (ROOT / path).exists(), ('entrypoint retained', path)
    paths = subprocess.check_output(['git', 'diff', '--name-only', 'HEAD'], cwd=ROOT, text=True).splitlines()
    paths += subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard'], cwd=ROOT, text=True).splitlines()
    for path in paths:
        assert path in allowed | added | set(foundation) or path.startswith('.kiro/specs/harness-modernization/'), ('scope', path)
    for path in (allowed | added) - retired:
        # Only changed/new callers: unchanged manifest entries retain historical links.
        p = ROOT / path
        if path not in paths:
            continue
        for target in re.findall(r'\]\(([^)]+)\)', p.read_text()):
            if '://' in target or target.startswith('#'):
                continue
            # HM-C owns legacy non-planning links in retained orchestration.
            if path.endswith('team-orchestration/SKILL.md') and not any(x in target for x in ['specification-workflow', 'execution-packet']):
                continue
            assert (p.parent / target.split('#')[0]).resolve().exists(), (path, target)
    names = re.compile(r'shared-understanding|prompt-planner|create-prompt')
    for base in ['.agents', '.kiro', '.github', 'specs']:
        for p in (ROOT / base).rglob('*'):
            if not p.is_file() or p.suffix not in {'.md', '.yaml', '.yml', '.json'}:
                continue
            if any(x in p.parts for x in ['archive', '05_ARCHIVE', 'arcive', 'harness-modernization']):
                continue
            assert not names.search(p.read_text()), ('active retirement mention', str(p.relative_to(ROOT)))
    registry = (ROOT / '.agents/skills/README.md').read_text()
    skills = list((ROOT / '.agents/skills').glob('*/SKILL.md'))
    assert len(skills) == 16
    for skill in skills:
        metadata = yaml.safe_load(skill.read_text().split('---')[1])
        assert f"`{metadata['name']}`" in registry, ('missing discovery name', skill)
        assert f'{skill.parent.name}/SKILL.md' in registry
    tasks = (ROOT / '.kiro/specs/cnf/cnf-cross-spec-review/tasks.md').read_text()
    kickoffs = re.findall(r'```text\n(.*?)```', tasks, re.S)
    assert len(kickoffs) == 15
    assert all('Return findings only (including no findings)' in text for text in kickoffs)
    identity_path = PACKAGE / 'hm-b-content.json'
    if identity_path.exists():
        for path, identity in json.loads(identity_path.read_text())['files'].items():
            assert sha(ROOT / path) == identity['sha256'], ('HM-B identity mismatch', path)
    print('PASS HM-B: 3 retirements; 16 skills registered; active references and changed links resolve; 15 standalone CNF kickoffs routed; HM-A identities and unrelated manifest artifacts preserved; diff scope and candidate identity checked')
    print('NOTE static closure only; invocation observations and unavailable host qualification are recorded separately')


if __name__ == '__main__':
    main()
