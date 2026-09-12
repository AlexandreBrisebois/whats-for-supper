"""HM-A static checks only. Does not launch a host/model or qualify native loading."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import yaml

ROOT = Path(__file__).resolve().parents[4]
PACKAGE = ROOT / '.kiro/specs/harness-modernization'
MANIFEST = yaml.safe_load((PACKAGE / 'artifact-manifest.yaml').read_text())
BASELINE = MANIFEST['baseline_commit']
EXISTING = [a['path'] for a in MANIFEST['artifacts'] if a['owner_task'] == 'HM-A']
ADDED = ['.agents/core/ontology.md', '.kiro/steering/home-e2e.md']
SHIMS = [a['path'] for a in MANIFEST['artifacts'] if a['owner_task'] == 'HM-A' and a['category'] == 'shim']


def baseline(path):
    return subprocess.check_output(['git', 'show', f'{BASELINE}:{path}'], cwd=ROOT)


def links(path):
    text = (ROOT / path).read_text()
    values = re.findall(r'\]\(([^)]+)\)', text)
    values += re.findall(r'^@([^\s]+)$', text, re.M)
    result = []
    for value in values:
        if '://' in value or value.startswith('#'):
            continue
        target = ((ROOT / path).parent / value.split('#')[0]).resolve()
        assert target.is_relative_to(ROOT), (path, value, 'outside repo')
        assert target.is_file(), (path, value, 'missing destination')
        result.append(str(target.relative_to(ROOT)))
    return result


def main():
    for artifact in MANIFEST['artifacts']:
        if artifact['path'] in EXISTING:
            data = baseline(artifact['path'])
            assert hashlib.sha256(data).hexdigest() == artifact['baseline_sha256']
    graph = {p: links(p) for p in EXISTING + ADDED}
    for shim in SHIMS:
        pending, seen = [shim], set()
        while pending:
            node = pending.pop()
            if node in seen:
                continue
            seen.add(node)
            if node != 'AGENT.md':
                pending.extend(graph.get(node, []))
        assert 'AGENT.md' in seen, (shim, 'no common authority route')
    print(f'PASS {len(SHIMS)} native routes reach AGENT.md; all local links/imports resolve in {len(graph)} foundation files')

    # The former shim contains newer guidance than ADR032: retain the exact section.
    marker = '## 6. E2E testing constraints'
    original = baseline('.kiro/steering.md').decode().split(marker, 1)[1]
    candidate = (ROOT / ADDED[1]).read_text().split(marker, 1)[1]
    assert original == candidate, 'home E2E reference changed beyond loading move'
    assert yaml.safe_load((ROOT / ADDED[1]).read_text().split('---')[1])['inclusion'] == 'manual'
    print('PASS former Kiro section 6 preserved verbatim with manual inclusion declaration (host behavior unqualified)')

    # These were unconditional skill dependencies in the foundation being migrated.
    default_paths = [p for p in graph if p != ADDED[1]]
    retired_names = [r['skill'] for r in MANIFEST['retirements']]
    for path in default_paths:
        content = (ROOT / path).read_text()
        for name in retired_names:
            assert not re.search(rf'(?:skills/|\*\*`?){re.escape(name)}(?:/|\.md|`?\*\*)', content), (path, name)
        for obsolete in ['Trust tool output unconditionally', 'core rules remain your absolute authority',
                         'Fix the **contract/spec first**', 'wait for approval before executing']:
            assert obsolete not in content, (path, obsolete)
    print('PASS known mandatory retired-skill routes and conflicting trust/approval clauses removed from foundation')

    changed = subprocess.check_output(['git', 'diff', '--name-only', 'HEAD'], cwd=ROOT, text=True).splitlines()
    untracked = subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard'], cwd=ROOT, text=True).splitlines()
    for path in changed + untracked:
        assert path in EXISTING + ADDED or path.startswith('.kiro/specs/harness-modernization/'), ('outside HM-A', path)
    # Later-slice procedures, registry, memory, tools and product artifacts remain at baseline.
    for artifact in MANIFEST['artifacts']:
        if artifact['path'] not in EXISTING:
            assert hashlib.sha256((ROOT / artifact['path']).read_bytes()).hexdigest() == artifact['baseline_sha256'], artifact['path']
    print('PASS changed/untracked path scope and unchanged manifest artifacts outside HM-A')

    identity_file = PACKAGE / 'hm-a-content.json'
    if identity_file.exists():
        identities = json.loads(identity_file.read_text())
        assert identities['baseline_commit'] == BASELINE
        for path, expected in identities['files'].items():
            data = (ROOT / path).read_bytes()
            assert hashlib.sha256(data).hexdigest() == expected['sha256'] and len(data) == expected['bytes'], ('candidate identity mismatch', path)
        print('PASS recorded candidate/checker content identities')

    common_before = ['AGENT.md'] + [f'.agents/core/{name}.md' for name in ['mission', 'contract-testing', 'execution-harness', 'context-loading']]
    for host, shim, adapter in [('Codex', 'AGENTS.md', 'codex'), ('Gemini/Antigravity', 'GEMINI.md', 'gemini')]:
        mechanic = f'.agents/adapters/{adapter}.md'
        before = [shim] + common_before + [mechanic]
        after = [shim, 'AGENT.md', '.agents/core/context-loading.md', mechanic]
        before_bytes = sum(len(baseline(p)) for p in before)
        after_bytes = sum((ROOT / p).stat().st_size for p in after)
        print(f'STATIC {host}: baseline direct mandatory {len(before)} files/{before_bytes} bytes; candidate entry {len(after)} files/{after_bytes} bytes; conditional context excluded; tokens unavailable')
    print('NOTE semantic rule ownership requires review; these checks do not prove model behavior or host discovery')


if __name__ == '__main__':
    main()
