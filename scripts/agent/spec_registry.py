#!/usr/bin/env python3
"""Search, validate, and render the active WFS specification registry."""
from __future__ import annotations

import argparse
from collections import defaultdict
from pathlib import Path
import sys

import yaml


ROOT = Path(__file__).resolve().parents[2]
SPECS = ROOT / '.kiro' / 'specs'
REGISTRY = SPECS / 'spec-registry.yaml'
INDEX = SPECS / 'SPEC_INDEX.md'
ARTIFACTS = ('requirements.md', 'design.md', 'tasks.md')
KINDS = {
    'capability-baseline',
    'planned-feature',
    'platform-initiative',
    'exploration',
    'legacy-source',
}
LIFECYCLES = {'current', 'planned', 'in-progress', 'superseded', 'archived', 'legacy'}
ACTIVE_LIFECYCLES = {'current', 'planned', 'in-progress'}
LIFECYCLE_HEADINGS = {
    'current': 'Current',
    'planned': 'Planned',
    'in-progress': 'In progress',
    'superseded': 'Superseded',
    'legacy': 'Legacy source awaiting normalization',
    'archived': 'Archived',
}


def load_registry(root: Path = ROOT) -> list[dict]:
    path = root / '.kiro' / 'specs' / 'spec-registry.yaml'
    if not path.is_file():
        raise ValueError(f'missing registry: {path.relative_to(root)}')
    try:
        document = yaml.safe_load(path.read_text()) or {}
    except yaml.YAMLError as error:
        raise ValueError(f'invalid registry YAML: {error}') from error
    if document.get('version') != 1 or not isinstance(document.get('entries'), list):
        raise ValueError('registry must contain version: 1 and an entries list')
    return document['entries']


def active_directories(root: Path) -> set[str]:
    specs = root / '.kiro' / 'specs'
    return {
        child.name for child in specs.iterdir()
        if child.is_dir() and child.name != 'archive'
    }


def validate(root: Path, entries: list[dict], selected_slug: str | None = None) -> list[str]:
    problems: list[str] = []
    slugs: set[str] = set()
    paths: set[str] = set()
    registered_dirs: set[str] = set()
    entry_by_slug: dict[str, dict] = {}

    for entry in entries:
        slug = entry.get('slug')
        name = entry.get('name')
        kind = entry.get('kind')
        lifecycle = entry.get('lifecycle')
        path = entry.get('path')
        if not isinstance(slug, str) or not slug:
            problems.append('registry entry has missing slug')
            continue
        if selected_slug and slug != selected_slug:
            continue
        if slug in slugs:
            problems.append(f'duplicate slug: {slug}')
        slugs.add(slug)
        entry_by_slug[slug] = entry
        if not isinstance(name, str) or not name:
            problems.append(f'{slug}: missing name')
        if kind not in KINDS:
            problems.append(f'{slug}: invalid kind {kind!r}')
        if lifecycle not in LIFECYCLES:
            problems.append(f'{slug}: invalid lifecycle {lifecycle!r}')
        if not isinstance(path, str) or not path.startswith('.kiro/specs/'):
            problems.append(f'{slug}: path must be rooted at .kiro/specs/')
            continue
        directory_name = Path(path).name
        if path in paths:
            problems.append(f'duplicate path: {path}')
        paths.add(path)
        registered_dirs.add(directory_name)
        packet = root / path
        if not packet.is_dir():
            problems.append(f'{slug}: missing package directory {path}')
            continue
        if lifecycle in ACTIVE_LIFECYCLES:
            for artifact in ARTIFACTS:
                if not (packet / artifact).is_file():
                    problems.append(f'{slug}: missing {artifact}')
        for dependency in entry.get('depends_on', []) or []:
            if not isinstance(dependency, str):
                problems.append(f'{slug}: dependency must be a slug')

    all_slugs = {entry.get('slug') for entry in entries if isinstance(entry.get('slug'), str)}
    for entry in entries:
        if selected_slug and entry.get('slug') != selected_slug:
            continue
        for dependency in entry.get('depends_on', []) or []:
            if dependency not in all_slugs:
                problems.append(f"{entry.get('slug')}: unknown dependency {dependency}")

    if selected_slug:
        if selected_slug not in all_slugs:
            problems.append(f'unknown slug: {selected_slug}')
    else:
        for directory in sorted(active_directories(root) - registered_dirs):
            problems.append(f'unregistered active package: {directory}')
    return sorted(set(problems))


def search(entries: list[dict], terms: str) -> list[dict]:
    needles = [term.casefold() for term in terms.split() if term]
    if not needles:
        return []

    def searchable(entry: dict) -> str:
        values = [
            entry.get('slug', ''), entry.get('name', ''), entry.get('description', ''),
            *entry.get('aliases', []), *entry.get('depends_on', []),
        ]
        return ' '.join(str(value) for value in values).casefold()

    return [entry for entry in entries if all(term in searchable(entry) for term in needles)]


def render_index(entries: list[dict]) -> str:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for entry in entries:
        grouped[entry['lifecycle']].append(entry)
    lines = [
        '# Specification index',
        '',
        'This is the readable view of `spec-registry.yaml`, the canonical registry for active',
        'and legacy WFS specification packages. Search it before creating or revising a spec.',
        '',
        'New package folders use descriptive lowercase kebab-case names. Legacy prefixes remain',
        'stable paths and are not a numbering scheme for new work.',
        '',
    ]
    for lifecycle in LIFECYCLE_HEADINGS:
        items = sorted(grouped.get(lifecycle, []), key=lambda entry: entry['name'].casefold())
        if not items:
            continue
        lines.extend([
            f"## {LIFECYCLE_HEADINGS[lifecycle]}",
            '',
            '| Name | Kind | Canonical package | Dependencies | Next action |',
            '|---|---|---|---|---|',
        ])
        for entry in items:
            dependencies = ', '.join(entry.get('depends_on', [])) or '—'
            next_action = entry.get('next_action', '—')
            path = entry['path'].removeprefix('.kiro/specs/')
            lines.append(
                f"| {entry['name']} | {entry['kind']} | [{entry['name']}]({path}/) | "
                f'{dependencies} | {next_action} |'
            )
        lines.append('')
    lines.extend([
        '## Registry rules',
        '',
        '- Search the registry before creating a feature spec; revise or depend on existing work',
        '  when scope overlaps.',
        '- Active current, planned, and in-progress packages contain `requirements.md`,',
        '  `design.md`, and `tasks.md`.',
        '- Explorations and legacy sources are not implementation authorization. Promote an',
        '  exploration to an active package before selecting implementation work.',
        '- `task spec:check` verifies the registry and generated index; it does not certify',
        '  runtime behavior or replace selected-task validation.',
        '',
    ])
    return '\n'.join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('search', 'check', 'render'))
    parser.add_argument('value', nargs='*', help='search terms or one optional registry slug')
    args = parser.parse_args()
    try:
        entries = load_registry()
        if args.action == 'search':
            terms = ' '.join(args.value)
            matches = search(entries, terms)
            if not matches:
                print(f'No specification registry matches for: {terms}')
                return 1
            for entry in matches:
                print(f"{entry['slug']}\t{entry['lifecycle']}\t{entry['kind']}\t{entry['path']}")
            return 0
        if args.action == 'render':
            INDEX.write_text(render_index(entries))
            print(f'Updated {INDEX.relative_to(ROOT)}')
            return 0
        if len(args.value) > 1:
            raise ValueError('check accepts at most one slug')
        problems = validate(ROOT, entries, args.value[0] if args.value else None)
        expected = render_index(entries)
        if not INDEX.is_file() or INDEX.read_text() != expected:
            problems.append('SPEC_INDEX.md is stale; run task spec:index')
        if problems:
            for problem in sorted(set(problems)):
                print(f'error: {problem}', file=sys.stderr)
            return 1
        print('Specification registry is valid.')
        return 0
    except ValueError as error:
        print(f'error: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
