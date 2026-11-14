"""Harness children must not inherit the invoking Git hook's repository context."""
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

import yaml

ROOT = Path(__file__).resolve().parents[3]


def clean_git_environment():
    names = subprocess.check_output(['git', 'rev-parse', '--local-env-vars'], text=True).splitlines()
    return {key: value for key, value in os.environ.items() if key not in names}


class AgentRunnerTests(unittest.TestCase):
    def run_fixture(self, *, foreign_git=False, fail_python=False, fail_node=False):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            foreign = base / 'foreign'
            foreign.mkdir()
            clean = clean_git_environment()
            subprocess.run(['git', 'init', '-q', str(foreign)], env=clean, check=True)
            root = base / 'runner'
            (root / '.venv/bin').mkdir(parents=True)
            (root / '.venv/bin/python').symlink_to(sys.executable)
            (root / 'scripts/agent/tests').mkdir(parents=True)
            (root / 'scripts/ci').mkdir(parents=True)
            runner = ROOT / 'scripts/agent/test_agent.py'
            if runner.exists():
                shutil.copy(runner, root / 'scripts/agent/test_agent.py')
            task = yaml.safe_load((ROOT / 'Taskfile.yml').read_text())['tasks']['test:agent']
            (root / 'Taskfile.yml').write_text(yaml.safe_dump({
                'version': '3', 'vars': {'PYTHON': sys.executable}, 'tasks': {'test:agent': task},
            }))
            (root / 'scripts/agent/tests/test_probe.py').write_text('''
import os
from pathlib import Path
import subprocess
import unittest
class Probe(unittest.TestCase):
    def test_child(self):
        for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE']:
            self.assertIsNone(os.environ.get(key), key + ' escaped into Python fixture')
        self.assertEqual(os.environ['AGENT_RUNNER_KEEP'], 'preserved')
        self.assertNotEqual(os.environ.get('AGENT_RUNNER_FAIL_PYTHON'), '1')
        root = Path(os.environ['AGENT_RUNNER_PROBE'])
        repo = root / 'python-repository'
        repo.mkdir()
        subprocess.run(['git', 'init', '-q', str(repo)], check=True)
        (repo / 'owned.txt').write_text('Python fixture only')
        subprocess.run(['git', 'add', 'owned.txt'], cwd=repo, check=True)
        (root / 'python-ran').write_text('yes')
''')
            (root / 'scripts/ci/probe.test.cjs').write_text('''
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
require('node:test')('Node receives an isolated Git context after Python', () => {
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE'])
    assert.equal(process.env[key], undefined, 'Git hook context escaped into Node fixture');
  assert.equal(process.env.AGENT_RUNNER_KEEP, 'preserved');
  const root = process.env.AGENT_RUNNER_PROBE;
  assert.ok(fs.existsSync(path.join(root, 'python-ran')));
  fs.writeFileSync(path.join(root, 'node-ran'), 'yes');
  assert.notEqual(process.env.AGENT_RUNNER_FAIL_NODE, '1');
  const repo = path.join(root, 'node-repository');
  fs.mkdirSync(repo);
  execFileSync('git', ['init', '-q', repo]);
  fs.writeFileSync(path.join(repo, 'owned.txt'), 'Node fixture only');
  execFileSync('git', ['add', 'owned.txt'], { cwd: repo });
});
''')

            def foreign_state():
                return {str(p.relative_to(foreign)): hashlib.sha256(p.read_bytes()).hexdigest()
                        for p in foreign.rglob('*') if p.is_file()}

            before = foreign_state()
            env = dict(clean, AGENT_RUNNER_KEEP='preserved', AGENT_RUNNER_PROBE=str(base))
            if foreign_git:
                env.update(GIT_DIR=str(foreign / '.git'), GIT_WORK_TREE=str(foreign),
                           GIT_INDEX_FILE=str(foreign / '.git/index'))
            if fail_python:
                env['AGENT_RUNNER_FAIL_PYTHON'] = '1'
            if fail_node:
                env['AGENT_RUNNER_FAIL_NODE'] = '1'
            result = subprocess.run(['task', 'test:agent'], cwd=root, env=env, text=True,
                                    capture_output=True, timeout=30)
            return result, before == foreign_state(), (base / 'python-ran').exists(), (base / 'node-ran').exists()

    def test_hook_git_context_cannot_escape_into_either_suite(self):
        result, preserved, python_ran, node_ran = self.run_fixture(foreign_git=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertTrue(preserved, 'The foreign repository/index/hooks must remain untouched')
        self.assertTrue(python_ran and node_ran)

    def test_python_failure_stops_node(self):
        result, preserved, _, node_ran = self.run_fixture(fail_python=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(preserved)
        self.assertFalse(node_ran)

    def test_node_failure_propagates(self):
        result, preserved, python_ran, node_ran = self.run_fixture(fail_node=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(preserved)
        self.assertTrue(python_ran and node_ran)
