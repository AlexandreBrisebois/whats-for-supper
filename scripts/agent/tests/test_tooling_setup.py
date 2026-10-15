"""Exercise public tooling targets and their shared dependency/version contracts."""
import json
import os
from pathlib import Path
import shutil
import shlex
import subprocess
import sys
import tempfile
import unittest

import yaml

ROOT = Path(__file__).resolve().parents[3]


class ToolingSetupTests(unittest.TestCase):
    def tasks(self):
        return yaml.safe_load((ROOT / 'Taskfile.yml').read_text())

    def test_spec_check_requires_pinned_cli_and_propagates_validation_failure(self):
        config = self.tasks()
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            fake = root / 'openspec'
            fake.write_text('#!' + sys.executable + '\n' +
                            'import json, os, sys\n' +
                            'from pathlib import Path\n' +
                            'p=Path(os.environ["CALLS"])\n' +
                            'with p.open("a") as f: f.write(json.dumps(sys.argv[1:])+"\\n")\n' +
                            'if sys.argv[1:] == ["--version"]: print(os.environ["CLI_VERSION"])\n' +
                            'else: sys.exit(int(os.environ["VALIDATE_EXIT"]))\n')
            fake.chmod(0o755)
            (root / 'Taskfile.yml').write_text(yaml.safe_dump({
                'version': '3', 'vars': {'OPENSPEC_VERSION': config['vars']['OPENSPEC_VERSION']},
                'tasks': {'spec:check': config['tasks']['spec:check']},
            }))
            for version, exit_code in [(config['vars']['OPENSPEC_VERSION'], '0'),
                                       (config['vars']['OPENSPEC_VERSION'], '1'), ('0.0.0', '0')]:
                with self.subTest(version=version, exit_code=exit_code):
                    calls = root / 'calls.jsonl'
                    calls.unlink(missing_ok=True)
                    result = subprocess.run([shutil.which('task') or 'task', 'spec:check'], cwd=root,
                                            capture_output=True, text=True, timeout=15,
                                            env=dict(os.environ, PATH=str(root)+os.pathsep+os.environ['PATH'],
                                                     CALLS=str(calls), CLI_VERSION=version, VALIDATE_EXIT=exit_code))
                    self.assertEqual(result.returncode == 0,
                                     version == config['vars']['OPENSPEC_VERSION'] and exit_code == '0',
                                     result.stdout + result.stderr)
                    commands = [json.loads(line) for line in calls.read_text().splitlines()]
                    validation = ['validate', '--all', '--strict', '--no-interactive']
                    self.assertEqual(validation in commands, version == config['vars']['OPENSPEC_VERSION'])

    def test_agent_tests_use_repository_python_without_shell_activation(self):
        config = self.tasks()
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            python = root / '.venv/bin/python'
            python.parent.mkdir(parents=True)
            python.write_text('#!/bin/sh\nexec ' + shlex.quote(sys.executable) + ' "$@"\n')
            python.chmod(0o755)
            tests = root / 'scripts/agent/tests'
            tests.mkdir(parents=True)
            (tests / 'test_dependency.py').write_text('import yaml\nimport unittest\nclass Dependency(unittest.TestCase):\n def test_yaml(self): self.assertEqual(yaml.safe_load("ok: true"), {"ok": True})\n')
            (root / 'Taskfile.yml').write_text(yaml.safe_dump({
                'version': '3', 'vars': {'PYTHON': config['vars'].get('PYTHON', 'python3')},
                'tasks': {'test:agent': config['tasks']['test:agent']},
            }))
            result = subprocess.run([shutil.which('task') or 'task', 'test:agent'], cwd=root,
                                    capture_output=True, text=True, timeout=20)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_ci_validates_specs_with_same_pinned_cli(self):
        config = self.tasks()
        workflow = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())
        job = workflow['jobs']['spec-validate']
        self.assertNotIn('if', job)  # Spec-only changes must not be filtered out.
        self.assertEqual(job['env']['OPENSPEC_VERSION'], config['vars']['OPENSPEC_VERSION'])
        commands = '\n'.join(step.get('run', '') for step in job['steps'])
        self.assertIn('@fission-ai/openspec@${OPENSPEC_VERSION}', commands)
        self.assertIn('openspec validate --all --strict --no-interactive', commands)
