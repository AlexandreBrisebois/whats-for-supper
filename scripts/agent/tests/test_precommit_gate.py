import os
from pathlib import Path
import shlex
import subprocess
import tempfile
import unittest

import yaml


ROOT = Path(__file__).resolve().parents[3]


class PrecommitGateTests(unittest.TestCase):
    def setUp(self):
        config = yaml.safe_load((ROOT / ".pre-commit-config.yaml").read_text())
        self.hooks = {hook["id"]: hook for hook in config["repos"][0]["hooks"]}

    def test_shared_inputs_select_both_application_reviews(self):
        for hook_id in ("api-review", "pwa-review"):
            for path in ("specs/openapi.yaml", ".pre-commit-config.yaml",
                         ".github/workflows/validate.yml"):
                with self.subTest(hook=hook_id, path=path):
                    self.assertRegex(path, self.hooks[hook_id]["files"])

    def test_pwa_runs_production_build_and_full_e2e_and_propagates_failures(self):
        for failure in ("", "lint", "typecheck", "test:unit", "build", "test:e2e"):
            with self.subTest(failure=failure), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                (root / "pwa").mkdir()
                npm = root / "npm"
                npm.write_text(
                    '#!/bin/sh\n'
                    'echo "$2" >> "$CALL_LOG"\n'
                    'if [ "$2" = build ] || [ "$2" = test:e2e ]; then\n'
                    '  [ "$CI" = true ] && [ -z "$BASE_URL" ] || exit 98\n'
                    'fi\n'
                    '[ "$2" != "$FAIL_STEP" ] || exit 42\n'
                )
                npm.chmod(0o755)
                env = {**os.environ, "PATH": f"{tmp}:{os.environ['PATH']}",
                       "CALL_LOG": str(root / "calls"), "FAIL_STEP": failure,
                       "BASE_URL": "http://external.invalid"}
                result = subprocess.run(shlex.split(self.hooks["pwa-review"]["entry"]),
                                        cwd=root, env=env, capture_output=True)
                steps = ["lint", "typecheck", "test:unit", "build", "test:e2e"]
                expected = steps[:steps.index(failure) + 1] if failure else steps
                self.assertEqual((root / "calls").read_text().splitlines(), expected)
                self.assertEqual(result.returncode, 42 if failure else 0)


if __name__ == "__main__":
    unittest.main()
