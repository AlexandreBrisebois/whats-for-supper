"""Exercise the existing push command against real committed ranges, with task doubles."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

import yaml
from git_fixture import IsolatedGitTestCase

ROOT = Path(__file__).resolve().parents[3]


class PushSelectionTests(IsolatedGitTestCase):
    def setUp(self):
        super().setUp()
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.git('init', '-q')
        self.git('config', 'user.email', 'tests@example.com')
        self.git('config', 'user.name', 'Tests')
        scripts = self.root / 'scripts/agent'
        scripts.mkdir(parents=True)
        for name in ['push_guard.py', 'finish.py', 'worktree.py', 'test_ops.py', 'harness_identity.py']:
            shutil.copyfile(ROOT / 'scripts/agent' / name, scripts / name)
        shutil.copytree(ROOT / 'scripts/ci', self.root / 'scripts/ci')
        (self.root / 'pwa/e2e').mkdir(parents=True)
        (self.root / 'pwa/e2e/.gitkeep').touch()
        (self.root / 'README.md').write_text('Baseline\n')
        (self.root / 'record.py').write_text(
            'import os,sys\nfrom pathlib import Path\n'
            'p=Path(os.environ["CALL_LOG"])\n'
            'with p.open("a") as f:f.write(sys.argv[1]+"\\n")\n'
            'if sys.argv[1]==os.environ.get("MUTATE_TASK"):Path("README.md").write_text("mutation")\n'
            'if sys.argv[1]=="check:push:pwa":Path(".git/suites").write_text(os.environ.get("RECORDED_SUITES",""))\n'
            'if sys.argv[1]=="test:smoke":Path(".git/smoke-args").write_text(os.environ.get("RECORDED_CLI_ARGS",""))\n'
            'raise SystemExit(42 if sys.argv[1]==os.environ.get("FAIL_TASK") else 0)\n')
        original = yaml.safe_load((ROOT / 'Taskfile.yml').read_text())['tasks']
        child_names = ['check:node', 'spec:check', 'test:agent', 'check:contracts',
                       'gen:client:check', 'check:push:api', 'check:push:pwa', 'test:database', 'test:smoke']
        tasks = {name: {'cmds': [f'"{sys.executable}" -B record.py {name}']} for name in child_names}
        tasks['test:smoke']['env'] = {'RECORDED_CLI_ARGS': '{{.CLI_ARGS}}'}
        tasks['check:push:pwa']['env'] = {'RECORDED_SUITES': '{{.SUITES | default "all"}}'}
        tasks['check:push'] = original['check:push']
        (self.root / 'Taskfile.yml').write_text(yaml.safe_dump({
            'version': '3', 'vars': {'PYTHON': sys.executable}, 'tasks': tasks}))
        self.commit('baseline')
        self.base = self.git('rev-parse', 'HEAD')

    def git(self, *args):
        return subprocess.check_output(['git', *args], cwd=self.root, text=True).strip()

    def change(self, name, text='change\n'):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)

    def commit(self, message):
        self.git('add', '.')
        self.git('-c', 'core.hooksPath=/dev/null', 'commit', '-qm', message)

    def push_check(self, *args, base=True, extra_env=None):
        env = {k: v for k, v in os.environ.items() if not k.startswith('PRE_COMMIT_')}
        env.update(CALL_LOG=str(self.root / '.git/calls'))
        if base:
            env.update(PRE_COMMIT_FROM_REF=self.base, PRE_COMMIT_TO_REF=self.git('rev-parse', 'HEAD'))
        env.update(extra_env or {})
        result = subprocess.run(['task', 'check:push', '--', *args], cwd=self.root, env=env,
                                capture_output=True, text=True, timeout=30)
        log = self.root / '.git/calls'
        return result, log.read_text().splitlines() if log.exists() else []

    def test_markdown_push_never_invokes_application_tools(self):
        self.change('README.md', 'Small correction\n')
        self.commit('docs')
        result, calls = self.push_check()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(calls, [], result.stdout + result.stderr)

    def test_all_unpushed_commits_are_selected_even_when_last_commit_is_docs(self):
        self.change('api/src/RecipeApi/Services/RecipeService.cs')
        self.commit('api')
        self.change('README.md', 'Docs after code\n')
        self.commit('docs')
        result, calls = self.push_check()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('check:push:api', calls)
        self.assertNotIn('check:push:pwa', calls)

    def test_docs_check_compares_links_to_the_committed_base(self):
        self.change('README.md', '[Broken](missing-file.md)\n')
        self.commit('broken link')
        result, calls = self.push_check()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('unresolved', result.stdout + result.stderr)
        self.assertEqual(calls, [])

    def test_open_spec_planning_runs_spec_checks_without_node_or_apps(self):
        self.change('openspec/changes/example/tasks.md', '# Tasks\n')
        self.commit('planning')
        result, calls = self.push_check()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(calls, ['spec:check'])

    def test_unknown_and_explicit_full_keep_broad_checks(self):
        for path, args in [('unknown.runtime', []), ('README.md', ['--full'])]:
            with self.subTest(path=path):
                log = self.root / '.git/calls'
                log.unlink(missing_ok=True)
                self.change(path)
                self.commit('change')
                result, calls = self.push_check(*args)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                for target in ['check:push:api', 'check:push:pwa', 'check:contracts', 'test:database', 'test:smoke']:
                    self.assertIn(target, calls)

    def test_database_changes_run_existing_database_and_smoke_commands(self):
        self.change('api/database/schema.sql')
        self.commit('schema')
        result, calls = self.push_check()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('test:database', calls)
        self.assertIn('test:smoke', calls)
        self.assertEqual((self.root / '.git/smoke-args').read_text(), '--isolated')

    def test_dirty_source_and_wrong_target_block_before_tasks(self):
        self.change('README.md')
        result, calls = self.push_check()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('clean', result.stdout + result.stderr)
        self.assertEqual(calls, [])
        self.commit('docs')
        result, calls = self.push_check(extra_env={'PRE_COMMIT_TO_REF': self.base})
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(calls, [])

    def test_missing_base_falls_back_to_full_and_failure_stops_later_checks(self):
        self.change('README.md', 'correction\n')
        self.commit('docs')
        result, calls = self.push_check(base=False, extra_env={'FAIL_TASK': 'check:push:api'})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('check:push:api', calls)
        self.assertNotIn('check:push:pwa', calls)

    def test_rename_accounts_for_deleted_code_path(self):
        self.change('api/src/RecipeApi/Services/Example.cs')
        self.commit('code baseline')
        self.base = self.git('rev-parse', 'HEAD')
        self.git('mv', 'api/src/RecipeApi/Services/Example.cs', 'README-code.md')
        self.commit('rename')
        result, calls = self.push_check()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('check:push:api', calls)

    def test_plan_is_read_only_and_ignores_dirty_worktree_changes(self):
        self.change('README.md', 'committed correction\n')
        self.commit('docs')
        self.change('api/dirty.cs')
        result, calls = self.push_check('--plan')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        plan = json.loads(result.stdout)
        self.assertEqual(plan['files'], ['README.md'])
        self.assertEqual(plan['checks'], [])
        self.assertEqual(calls, [])

    def test_manual_upstream_covers_code_before_the_last_documentation_commit(self):
        branch = self.git('branch', '--show-current')
        self.git('remote', 'add', 'origin', self.root.as_uri())
        self.git('update-ref', 'refs/remotes/origin/main', self.base)
        self.git('config', f'branch.{branch}.remote', 'origin')
        self.git('config', f'branch.{branch}.merge', 'refs/heads/main')
        self.change('api/src/RecipeApi/Services/Example.cs')
        self.commit('api')
        self.change('README.md', 'docs\n')
        self.commit('docs')
        result, calls = self.push_check(base=False)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('check:push:api', calls)
        self.assertNotIn('check:push:pwa', calls)

    def test_invalid_baseline_falls_back_to_full_instead_of_skipping(self):
        self.change('README.md', 'docs\n')
        self.commit('docs')
        result, calls = self.push_check(extra_env={'PRE_COMMIT_FROM_REF': 'f' * 40})
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('test:database', calls)
        self.assertIn('check:push:pwa', calls)

    def test_hook_base_cannot_be_narrowed_by_manual_override(self):
        self.change('api/src/RecipeApi/Services/Example.cs')
        self.commit('api')
        result, calls = self.push_check('--base', 'HEAD')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('check:push:api', calls)

    def test_shared_ci_selector_limits_pwa_checks_to_the_owning_suite(self):
        self.change('pwa/e2e/planner.spec.ts')
        self.commit('planner test')
        result, calls = self.push_check(extra_env={'WFS_E2E_SUITE': 'household', 'FULL_VALIDATION': 'true'})
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('check:push:pwa', calls)
        self.assertNotIn('check:push:api', calls)
        self.assertEqual((self.root / '.git/suites').read_text(), 'planning')

    def test_checked_out_annotated_tag_target_is_accepted(self):
        self.change('README.md', 'correction\n')
        self.commit('docs')
        self.git('tag', '-a', 'example', '-m', 'example')
        result, calls = self.push_check(extra_env={'PRE_COMMIT_TO_REF': self.git('rev-parse', 'example')})
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(calls, [])

    def test_mutation_stops_execution_before_the_next_task(self):
        self.change('api/src/RecipeApi/Services/Example.cs')
        self.change('pwa/e2e/planner.spec.ts')
        self.commit('api and pwa')
        result, calls = self.push_check(extra_env={'MUTATE_TASK': 'check:push:api'})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('check:push:api', calls)
        self.assertNotIn('check:push:pwa', calls)
        self.assertIn('clean', result.stdout + result.stderr)
