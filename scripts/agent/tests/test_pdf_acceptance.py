"""Run finite PDF operator guards against actual application request serialization."""
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[3]


class PdfAcceptanceTests(unittest.TestCase):
    def test_offline_pdf_operator_and_all_nine_serialized_actions(self):
        result = subprocess.run(
            ['node', '--test', 'scripts/agent/pdf-acceptance/acceptance-selftest.cjs'],
            cwd=ROOT,
            env={**os.environ, 'WFS_OFFLINE_REPO_ROOT': str(ROOT)},
            capture_output=True,
            text=True,
            timeout=60,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertRegex(result.stdout, r'(?:tests|# tests) 30\b')
        self.assertRegex(result.stdout, r'(?:skipped|# skipped) 0\b')
