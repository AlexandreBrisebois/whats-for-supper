import sys
import tempfile
import unittest
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))
import spec_registry


class SpecRegistryTests(unittest.TestCase):
    def write_registry(self, root: Path, entries: list[dict]) -> None:
        registry = root / '.kiro/specs/spec-registry.yaml'
        registry.parent.mkdir(parents=True, exist_ok=True)
        registry.write_text(spec_registry.yaml.safe_dump(
            {'version': 1, 'entries': entries}, sort_keys=False
        ))

    def make_packet(self, root: Path, name: str, complete: bool = True) -> None:
        packet = root / '.kiro/specs' / name
        packet.mkdir(parents=True)
        for filename in ('requirements.md', 'design.md', 'tasks.md'):
            if complete or filename != 'tasks.md':
                (packet / filename).write_text(f'# {filename}\n')

    def test_check_requires_exactly_one_entry_for_each_active_packet(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.make_packet(root, 'recipe-timer')
            self.make_packet(root, 'orphaned-feature')
            self.write_registry(root, [{
                'slug': 'recipe-timer',
                'name': 'Recipe timer',
                'kind': 'planned-feature',
                'lifecycle': 'planned',
                'path': '.kiro/specs/recipe-timer',
            }])

            problems = spec_registry.validate(root, spec_registry.load_registry(root))

            self.assertIn('unregistered active package: orphaned-feature', problems)

    def test_check_requires_three_artifacts_for_active_work(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.make_packet(root, 'pwa-cache-coherence', complete=False)
            self.write_registry(root, [{
                'slug': 'pwa-cache-coherence',
                'name': 'PWA cache coherence',
                'kind': 'platform-initiative',
                'lifecycle': 'planned',
                'path': '.kiro/specs/pwa-cache-coherence',
            }])

            problems = spec_registry.validate(root, spec_registry.load_registry(root))

            self.assertIn('pwa-cache-coherence: missing tasks.md', problems)

    def test_search_matches_aliases_and_dependencies(self):
        entries = [{
            'slug': 'offline-capture-recovery',
            'name': 'Offline capture recovery',
            'kind': 'planned-feature',
            'lifecycle': 'planned',
            'path': '.kiro/specs/offline-capture-recovery',
            'aliases': ['retry photo upload'],
            'depends_on': ['shared-real-time-state'],
        }]

        matches = spec_registry.search(entries, 'retry capture')

        self.assertEqual([entry['slug'] for entry in matches], ['offline-capture-recovery'])

    def test_render_groups_entries_by_lifecycle(self):
        document = spec_registry.render_index([
            {
                'slug': 'recipe-timer', 'name': 'Recipe timer',
                'kind': 'planned-feature', 'lifecycle': 'planned',
                'path': '.kiro/specs/recipe-timer',
            },
            {
                'slug': 'photo-capture', 'name': 'Photo capture',
                'kind': 'capability-baseline', 'lifecycle': 'current',
                'path': '.kiro/specs/cap-01-photo-capture',
            },
        ])

        self.assertIn('## Current', document)
        self.assertIn('## Planned', document)
        self.assertIn('[Recipe timer](recipe-timer/)', document)


if __name__ == '__main__':
    unittest.main()
