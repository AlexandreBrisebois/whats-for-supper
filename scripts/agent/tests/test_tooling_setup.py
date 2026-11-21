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

    def test_spec_check_accepts_any_cli_version_and_propagates_failures(self):
        config = self.tasks()
        self.assertNotIn('OPENSPEC_VERSION', config.get('vars', {}))
        self.assertNotIn('OPENSPEC_VERSION', json.dumps(config['tasks']['spec:check']))
        self.assertIn('npm install --global @fission-ai/openspec', config['tasks']['hooks:setup']['cmds'])
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            fake = root / 'openspec'
            fake.write_text('#!' + sys.executable + '\n' +
                            'import json, os, sys\n' +
                            'from pathlib import Path\n' +
                            'p=Path(os.environ["CALLS"])\n' +
                            'with p.open("a") as f: f.write(json.dumps(sys.argv[1:])+"\\n")\n' +
                            'if sys.argv[1:] == ["--version"]:\n' +
                            '    if os.environ["CLI_VERSION"]: print(os.environ["CLI_VERSION"])\n' +
                            '    sys.exit(int(os.environ.get("VERSION_EXIT", "0")))\n' +
                            'else: sys.exit(int(os.environ["VALIDATE_EXIT"]))\n')
            fake.chmod(0o755)
            (root / 'Taskfile.yml').write_text(yaml.safe_dump({
                'version': '3',
                'tasks': {'spec:check': config['tasks']['spec:check']},
            }))
            for version, version_exit, exit_code in [('1.17.0', '0', '0'),
                                                     ('2.0.0', '0', '0'),
                                                     ('2.0.0', '0', '1'),
                                                     ('', '1', '0')]:
                with self.subTest(version=version, version_exit=version_exit, exit_code=exit_code):
                    calls = root / 'calls.jsonl'
                    calls.unlink(missing_ok=True)
                    result = subprocess.run([shutil.which('task') or 'task', 'spec:check'], cwd=root,
                                            capture_output=True, text=True, timeout=15,
                                            env=dict(os.environ, PATH=str(root)+os.pathsep+os.environ['PATH'],
                                                     CALLS=str(calls), CLI_VERSION=version,
                                                     VERSION_EXIT=version_exit, VALIDATE_EXIT=exit_code))
                    expected_ok = (version_exit == '0' and exit_code == '0')
                    self.assertEqual(result.returncode == 0, expected_ok, result.stdout + result.stderr)
                    commands = [json.loads(line) for line in calls.read_text().splitlines()]
                    validation = ['validate', '--all', '--strict', '--no-interactive']
                    self.assertEqual(validation in commands, version_exit == '0')
                    if version_exit != '0':
                        self.assertIn('npm install --global @fission-ai/openspec.', result.stdout + result.stderr)

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
            shutil.copy(ROOT / 'scripts/agent/test_agent.py', root / 'scripts/agent/test_agent.py')
            (tests / 'test_dependency.py').write_text('import yaml\nimport unittest\nclass Dependency(unittest.TestCase):\n def test_yaml(self): self.assertEqual(yaml.safe_load("ok: true"), {"ok": True})\n')
            ci = root / 'scripts/ci'
            ci.mkdir()
            (ci / 'dependency.test.cjs').write_text("require('node:test')('shared Node suite is invoked', () => {});\n")
            (root / 'Taskfile.yml').write_text(yaml.safe_dump({
                'version': '3', 'vars': {'PYTHON': config['vars'].get('PYTHON', 'python3')},
                'tasks': {'test:agent': config['tasks']['test:agent']},
            }))
            result = subprocess.run([shutil.which('task') or 'task', 'test:agent'], cwd=root,
                                    capture_output=True, text=True, timeout=20)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_ci_validates_specs_without_version_pin(self):
        workflow = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())
        job = workflow['jobs']['spec-validate']
        self.assertNotIn('if', job)  # Spec-only changes must not be filtered out.
        self.assertNotIn('OPENSPEC_VERSION', job.get('env', {}))
        commands = '\n'.join(step.get('run', '') for step in job['steps'])
        self.assertNotIn('OPENSPEC_VERSION', commands)
        self.assertIn('npm install --global @fission-ai/openspec', commands)
        self.assertNotIn('@fission-ai/openspec@', commands)
        self.assertIn('openspec validate --all --strict --no-interactive', commands)

    def test_spec_search_falls_back_to_grep_when_rg_is_missing(self):
        config = self.tasks()
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'openspec/specs/demo').mkdir(parents=True)
            (root / 'openspec/changes').mkdir(parents=True)
            (root / 'openspec/specs/demo/spec.md').write_text('Demo mode requirement\n')
            (root / 'openspec/specs/demo/notes.txt').write_text('Demo mode ignored file\n')
            bin_dir = root / 'bin'
            bin_dir.mkdir()
            for cmd in ('bash', 'grep', 'task'):
                found = shutil.which(cmd)
                self.assertIsNotNone(found, f'missing prerequisite {cmd}')
                (bin_dir / cmd).symlink_to(found)
            (root / 'Taskfile.yml').write_text(yaml.safe_dump({
                'version': '3',
                'tasks': {'spec:search': config['tasks']['spec:search']},
            }))
            result = subprocess.run(
                [str(bin_dir / 'task'), 'spec:search', '--', 'demo'],
                cwd=root,
                capture_output=True,
                text=True,
                timeout=15,
                env={
                    'PATH': str(bin_dir),
                    'HOME': os.environ.get('HOME', str(root)),
                },
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn('openspec/specs/demo/spec.md:1:Demo mode requirement', result.stdout)
            self.assertNotIn('notes.txt', result.stdout)
