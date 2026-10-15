"""Exercise npm's public audit command from its real package working directory."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]


class NpmAuditTests(unittest.TestCase):
    def test_audit_alias_discovers_both_applications_and_filters_by_area(self):
        script = json.loads((ROOT / 'pwa/package.json').read_text())['scripts']['agent:audit']
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'pwa').mkdir()
            (root / 'pwa/package.json').write_text(json.dumps({'name': 'audit-fixture', 'scripts': {'agent:audit': script}}))
            for name in ['test_audit.py', 'test_ops.py']:
                target = root / 'scripts/agent' / name
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / 'scripts/agent' / name, target)
            for name in ['pwa/src/Selected.test.ts', 'pwa/e2e/selected.spec.ts',
                         'api/src/RecipeApi.Tests/SelectedTests.cs']:
                target = root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text('// UniqueAuditArea\n')
            (root / 'pwa/src/Unrelated.test.ts').write_text('// other behavior\n')
            result = subprocess.run([shutil.which('npm') or 'npm', 'run', 'agent:audit', '--', 'UniqueAuditArea'],
                                    cwd=root / 'pwa', text=True, capture_output=True, timeout=30,
                                    env=dict(os.environ, npm_config_cache=str(root / '.npm-cache')))
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            for expected in ['# Test Audit Report: UniqueAuditArea', '**PWA Unit**: 1', '**PWA E2E**: 1', '**API Tests**: 1']:
                self.assertIn(expected, result.stdout)
            self.assertNotIn('Unrelated.test.ts', result.stdout)
