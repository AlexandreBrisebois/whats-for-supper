import contextlib
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import openspec_audit as audit
from git_fixture import IsolatedGitTestCase


SPEC = ('# Example\n\n## Purpose\n\nOwn a focused observable behavior.\n\n'
        '## Requirements\n\n### Requirement: Save café\n'
        'The system SHALL preserve café 🥘.\n\n'
        '#### Scenario: Success\n- **WHEN** saved\n- **THEN** retained\n')


class InventoryTests(IsolatedGitTestCase):
    def setUp(self):
        super().setUp()
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.spec('alpha', SPEC)

    def spec(self, capability, content):
        path = self.root / 'openspec/specs' / capability / 'spec.md'
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content.encode() if isinstance(content, str) else content)
        return path

    def invoke(self, *args):
        stdout, stderr = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            result = audit.main(list(args), root=self.root)
        return result, stdout.getvalue(), stderr.getvalue()

    def snapshot(self):
        return {p.relative_to(self.root).as_posix(): (p.read_bytes(), p.stat().st_mtime_ns)
                for p in self.root.rglob('*') if p.is_file()}

    def test_unicode_counts_and_raw_spans_round_trip(self):
        data = audit.build_inventory(self.root)
        self.assertEqual(data.get('totals', {}).get('requirements'), 1)
        f = data['files'][0]
        self.assertEqual(f['bytes'], len(SPEC.encode()))
        self.assertEqual(f['characters'], len(SPEC))
        self.assertGreater(f['bytes'], f['characters'])
        self.assertEqual(f['sha256'], hashlib.sha256(SPEC.encode()).hexdigest())
        lines = SPEC.splitlines(keepends=True)
        for span in [f['purpose'], f['preamble'], *f['requirements'],
                     *f['requirements'][0]['scenarios']]:
            self.assertEqual(span['raw'], ''.join(lines[span['start_line']-1:span['end_line']]))
            self.assertEqual(span['sha256'], hashlib.sha256(span['raw'].encode()).hexdigest())
        self.assertEqual(f['requirements'][0]['description']['raw'],
                         'The system SHALL preserve café 🥘.\n\n')

    def test_crlf_and_missing_final_newline_are_preserved(self):
        content = SPEC.replace('\n', '\r\n').rstrip('\r\n')
        self.spec('alpha', content)
        f = audit.build_inventory(self.root)['files'][0]
        self.assertEqual(f['lines'], len(content.splitlines()))
        self.assertFalse(f['final_newline'])
        self.assertIn('\r\n', f['requirements'][0]['raw'])
        self.assertEqual(f['bytes'], len(content.encode()))

    def test_fences_indented_examples_and_nested_headings_are_not_declarations(self):
        content = SPEC.replace('#### Scenario: Success',
            '```markdown\n### Requirement: Fake\n~~~~\n#### Scenario: Fake\n```\n'
            '~~~\n### Requirement: Also fake\n~~~\n'
            '    ### Requirement: Indented example\n##### Detail\nText\n'
            '#### Scenario: Success')
        self.spec('alpha', content)
        data = audit.build_inventory(self.root)
        self.assertTrue(data['complete'])
        self.assertEqual(data['totals']['requirements'], 1)
        self.assertEqual(data['totals']['scenarios'], 1)
        self.assertIn('##### Detail', data['files'][0]['requirements'][0]['description']['raw'])

    def test_sorted_nested_capabilities_exact_filters_and_no_archive_inputs(self):
        self.spec('zeta/nested', SPEC)
        self.spec('beta', SPEC)
        archive = self.root / 'openspec/changes/archive/old/specs/ignored/spec.md'
        archive.parent.mkdir(parents=True)
        archive.write_text(SPEC)
        data = audit.build_inventory(self.root)
        self.assertEqual([f['capability'] for f in data['files']], ['alpha', 'beta', 'zeta/nested'])
        result, stdout, stderr = self.invoke('--format', 'json', '--capability', 'zeta/nested')
        self.assertEqual((result, stderr), (0, ''))
        self.assertEqual(json.loads(stdout)['totals']['capabilities'], 1)
        for capability in ['zet', '../alpha', '/alpha', 'zeta//nested']:
            self.assertEqual(self.invoke('--capability', capability)[0], 1)

    def test_duplicate_titles_remain_distinct_without_semantic_claims(self):
        block = SPEC[SPEC.index('### Requirement:'):]
        self.spec('alpha', SPEC + '\n' + block)
        data = audit.build_inventory(self.root)
        reqs = data['files'][0]['requirements']
        self.assertEqual([r['occurrence'] for r in reqs], [1, 2])
        self.assertEqual(len({r['id'] for r in reqs}), 2)
        self.assertTrue(data['complete'])
        self.assertIn('duplicate_heading', {x['code'] for x in data['files'][0]['diagnostics']})
        self.assertNotIn('semantic', json.dumps(data))

    def test_malformed_specs_and_invalid_utf8_fail_with_partial_diagnostics(self):
        cases = {
            'missing_purpose': SPEC.replace('## Purpose', '## About'),
            'orphan_scenario': SPEC.replace('### Requirement: Save café', '### Other'),
            'wrong_heading_level': SPEC.replace('#### Scenario:', '### Scenario:'),
            'missing_scenario': SPEC[:SPEC.index('#### Scenario:')],
            'empty_title': SPEC.replace('Requirement: Save café', 'Requirement:'),
            'unclosed_fence': SPEC + '\n```\n',
            'duplicate_purpose': SPEC + '\n## Purpose\nAnother purpose\n',
        }
        for code, content in cases.items():
            with self.subTest(code=code):
                self.spec('alpha', content)
                result, stdout, _ = self.invoke('--format', 'json')
                data = json.loads(stdout)
                self.assertEqual(result, 2)
                self.assertFalse(data['complete'])
                self.assertIn(code, {x['code'] for x in data['files'][0]['diagnostics']})
        self.spec('alpha', b'\xff')
        result, stdout, _ = self.invoke('--format', 'json')
        self.assertEqual(result, 2)
        self.assertIn('invalid_utf8', {x['code'] for x in json.loads(stdout)['diagnostics']})

    def test_default_and_json_modes_write_nothing(self):
        before = self.snapshot()
        for args in [(), ('--format', 'json'), ('--capability', 'alpha')]:
            with mock.patch.object(audit.subprocess, 'run', side_effect=AssertionError('unexpected subprocess')):
                result, stdout, stderr = self.invoke(*args)
            self.assertEqual((result, stderr), (0, ''))
            self.assertTrue(stdout)
            self.assertEqual(self.snapshot(), before)

    def test_explicit_output_is_only_write_and_refuses_existing_or_protected_paths(self):
        target = self.root / 'inventory.json'
        before = self.snapshot()
        result, stdout, stderr = self.invoke('--format', 'json', '--output', str(target))
        self.assertEqual((result, stdout, stderr), (0, '', ''))
        self.assertEqual(json.loads(target.read_text())['totals']['requirements'], 1)
        after = self.snapshot()
        self.assertEqual(set(after)-set(before), {'inventory.json'})
        self.assertTrue(all(after[k] == v for k, v in before.items()))
        self.assertEqual(self.invoke('--output', str(target))[0], 1)
        for path in [self.root/'openspec/specs/new.md', self.root/'openspec/config.yaml',
                     self.root/'absent/report.json']:
            self.assertEqual(self.invoke('--output', str(path))[0], 1)
        self.assertFalse((self.root/'absent').exists())

    def test_output_publish_failure_cleans_only_owned_temporary_file(self):
        before = self.snapshot()
        with mock.patch.object(audit.os, 'link', side_effect=OSError('publish failed')):
            self.assertEqual(self.invoke('--output', str(self.root/'report.json'))[0], 1)
        self.assertEqual(self.snapshot(), before)

    def test_output_rejects_git_metadata_and_deleted_tracked_paths(self):
        subprocess.run(['git', 'init', '-q', str(self.root)], check=True)
        target = self.root/'note.json'
        target.write_text('original')
        subprocess.run(['git', '-C', str(self.root), 'add', '--', 'note.json'], check=True)
        target.unlink()
        for path in [target, self.root/'.git/config-new']:
            self.assertEqual(self.invoke('--output', str(path))[0], 1)
            self.assertFalse(path.exists())

    def test_symlink_sources_and_destinations_are_rejected(self):
        path = self.root / 'alias.json'
        path.symlink_to(self.root/'missing.json')
        self.assertEqual(self.invoke('--output', str(path))[0], 1)
        source = self.root/'openspec/specs/alpha/spec.md'
        source.rename(source.with_name('original.md'))
        source.symlink_to(source.with_name('original.md'))
        data = audit.build_inventory(self.root)
        self.assertFalse(data['complete'])
        self.assertIn('symlink_source', {x['code'] for x in data['diagnostics']})

    def test_missing_canonical_directory_is_incomplete(self):
        with tempfile.TemporaryDirectory() as empty:
            self.assertFalse(audit.build_inventory(Path(empty))['complete'])

    def test_deferred_flags_are_not_available(self):
        for flag in ['--overlaps', '--benchmark']:
            self.assertEqual(self.invoke(flag)[0], 1)

    def test_explicit_empty_output_is_an_error(self):
        result, stdout, _ = self.invoke('--output', '')
        self.assertEqual(result, 1)
        self.assertEqual(stdout, '')


class RepositoryIntegrationTests(unittest.TestCase):
    def test_json_is_identical_across_processes_and_working_directories(self):
        script = Path(audit.__file__).resolve()
        outputs = []
        for cwd in [script.parents[2], Path(tempfile.gettempdir())]:
            result = subprocess.run([sys.executable, '-B', str(script), '--format', 'json'],
                                    cwd=cwd, capture_output=True, check=True)
            outputs.append(result.stdout)
            self.assertEqual(result.stderr, b'')
        self.assertEqual(*outputs)
        self.assertTrue(json.loads(outputs[0])['complete'])


if __name__ == '__main__':
    unittest.main()
