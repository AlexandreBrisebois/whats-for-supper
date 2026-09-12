"""Operator tooling regressions; these do not qualify any model."""
import copy
import importlib.util
from pathlib import Path
import tempfile
import unittest

P = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('qualification', P / 'qualification.py')
q = importlib.util.module_from_spec(spec)
spec.loader.exec_module(q)


class QualificationTests(unittest.TestCase):
    def test_schedule_has_all_pairs_and_counterbalanced_order(self):
        rows = q.schedule('codex-astra', 'codex', 'gpt-6-astra')
        self.assertEqual(len(rows), 48)
        self.assertEqual([r['variant'] for r in rows[:6]],
                         ['baseline', 'candidate', 'candidate', 'baseline', 'baseline', 'candidate'])
        for row in rows:
            q.validate_record(row)
            self.assertIsNone(row['metrics']['total_tokens'])
            self.assertFalse(row['result']['completion_verified'])

    def test_evaluator_and_unsafe_paths_are_rejected(self):
        for path in ['../escape', '/absolute', 'a/.git/config',
                     '.kiro/specs/harness-modernization/evaluation/oracles/F01.py']:
            with self.assertRaises(ValueError):
                q.safe_path(path)

    def test_failed_attempt_cost_is_retained_and_missing_cost_is_null(self):
        rows = q.schedule('test', 'codex', None)[:2]
        for row in rows:
            row['result']['run_outcome'] = 'fail'
            row['metrics']['total_tokens'] = 200
        rows[0]['result'].update(run_outcome='pass', task_handling='pass', completion_verified=True)
        result = q.summarize(rows)
        self.assertEqual(result['all_attempt_tokens_per_verified_completion'], 400)
        rows[1]['metrics']['total_tokens'] = None
        self.assertIsNone(q.summarize(rows)['all_attempt_tokens_per_verified_completion'])
        self.assertIsNone(q.summarize([])['all_attempt_tokens_per_verified_completion'])

    def test_schema_rejects_false_f05_completion(self):
        row = q.schedule('test', 'codex', None)[24]
        self.assertEqual(row['identity']['fixture_id'], 'F05')
        row['result']['completion_verified'] = True
        with self.assertRaises(Exception):
            q.validate_record(row)

    def test_pass_without_actual_evidence_is_rejected(self):
        row = q.schedule('test', 'codex', None)[0]
        row['result'].update(run_outcome='pass', task_handling='pass',
                             completion_verified=True, terminal_status='complete')
        with self.assertRaises(Exception):
            q.validate_record(row)

    def test_no_overwrite_of_operator_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'record.json'
            q.write_json(path, {'first': True})
            with self.assertRaises(FileExistsError):
                q.write_json(path, {'first': False})

    def test_overlay_excludes_product_changes(self):
        paths = q.overlay_paths()
        self.assertIn('Taskfile.yml', paths)
        self.assertIn('.agents/skills/session-review/SKILL.md', paths)
        self.assertFalse(any(p.startswith(('api/', 'pwa/src/')) for p in paths))


if __name__ == '__main__':
    unittest.main()
