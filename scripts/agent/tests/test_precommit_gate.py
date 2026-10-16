"""Exercise commit-stage boundaries and the shared production PWA gate."""
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest

import yaml

ROOT = Path(__file__).resolve().parents[3]


class PrecommitGateTests(unittest.TestCase):
    def setUp(self):
        self.config = yaml.safe_load((ROOT / '.pre-commit-config.yaml').read_text())
        self.hooks = {hook['id']: hook for hook in self.config['repos'][0]['hooks']}
        self.tasks = yaml.safe_load((ROOT / 'Taskfile.yml').read_text())['tasks']

    def test_commit_stage_is_read_only_and_has_no_production_builds(self):
        self.assertEqual(self.config['default_install_hook_types'], ['pre-commit', 'pre-push'])
        for hook in self.hooks.values():
            if 'pre-commit' in hook['stages']:
                self.assertEqual(hook['language'], 'system')
                for forbidden in ['--write', 'git add', 'gen:client:sync', 'check:push', 'npm run build', 'test:e2e']:
                    self.assertNotIn(forbidden, hook['entry'])
        self.assertEqual(self.hooks['kiota-client-check']['entry'], 'task gen:client:check')
        self.assertEqual(self.hooks['push-validation']['stages'], ['pre-push'])
        self.assertTrue(self.hooks['push-validation']['always_run'])

    def test_spec_and_harness_changes_select_quick_hooks(self):
        for path in ['openspec/config.yaml', 'openspec/changes/new/tasks.md', 'openspec/specs/example/spec.md']:
            self.assertRegex(path, self.hooks['openspec']['files'])
        for path in ['scripts/requirements.txt', '.github/workflows/validate.yml', 'Taskfile.yml']:
            self.assertRegex(path, self.hooks['agent-harness']['files'])

    def test_pwa_production_checks_ignore_external_server_and_propagate_failures(self):
        for failure in ['', 'format:check', 'lint', 'typecheck', 'test:unit', 'build', 'test:e2e']:
            with self.subTest(failure=failure), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp); (root / 'pwa').mkdir()
                npm = root / 'npm'
                npm.write_text('#!/bin/sh\necho "$2" >> "$CALL_LOG"\n'
                               '[ "$CI" = true ] && [ -z "$BASE_URL" ] && [ "$HEARTH_SECRET" = Paris-Montreal ] || exit 98\n'
                               '[ "$2" != "$FAIL_STEP" ] || exit 42\n')
                npm.chmod(0o755)
                (root / 'Taskfile.yml').write_text(yaml.safe_dump({'version': '3', 'tasks': {
                    'check:push:pwa': self.tasks['check:push:pwa']}}))
                env = dict(os.environ, PATH=f'{tmp}:{os.environ["PATH"]}', CALL_LOG=str(root / 'calls'),
                           FAIL_STEP=failure, BASE_URL='http://external.invalid', CI='false', HEARTH_SECRET='wrong')
                result = subprocess.run([shutil.which('task') or 'task', 'check:push:pwa'], cwd=root, env=env,
                                        capture_output=True, text=True, timeout=15)
                steps = ['format:check', 'lint', 'typecheck', 'test:unit', 'build', 'test:e2e']
                expected = steps[:steps.index(failure)+1] if failure else steps
                self.assertEqual((root / 'calls').read_text().splitlines(), expected)
                self.assertEqual(result.returncode == 0, not failure, result.stdout + result.stderr)

    def test_push_gate_contains_full_checks_and_no_worktree_impact_selection(self):
        commands = str(self.tasks['check:push']['cmds'])
        for target in ['spec:check', 'test:agent', 'check:contracts', 'check:push:api', 'check:push:pwa']:
            self.assertIn(target, commands)
        self.assertNotIn('agent:test:impact', commands)
        self.assertNotIn('verify', commands)


class NodePinTests(unittest.TestCase):
    def test_ci_reads_local_pin_and_pin_changes_select_pwa_validation(self):
        pin = (ROOT / '.nvmrc').read_text().strip()
        self.assertRegex(pin, r'^\d+\.\d+\.\d+$')
        for path in (ROOT / '.github/workflows').glob('*.yml'):
            config = yaml.safe_load(path.read_text())
            for job in config.get('jobs', {}).values():
                for step in job.get('steps', []):
                    if step.get('uses', '').startswith('actions/setup-node@'):
                        self.assertEqual(step['with']['node-version-file'], '.nvmrc')
        workflow = (ROOT / '.github/workflows/validate.yml').read_text()
        self.assertIn("pwa/|\\.nvmrc$|", workflow)
