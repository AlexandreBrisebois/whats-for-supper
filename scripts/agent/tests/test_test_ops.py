from git_fixture import IsolatedGitTestCase
import contextlib
import importlib.util
import io
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock
import subprocess
import sys


SCRIPT_PATH = Path(__file__).parents[1] / "test_ops.py"


def load_module():
    spec = importlib.util.spec_from_file_location("test_ops", SCRIPT_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.runtime_identity = lambda: "unit-test-runtime"
    return module


class ImpactPlanningTests(IsolatedGitTestCase):
    def mocked_inventory(self, module):
        return tuple(sorted(str(p) for p in module.E2E_DIR.glob('*.spec.ts')
                            if not p.name.endswith('-live.spec.ts')))
    def test_shared_detail_and_cooking_select_cross_capability_scenarios(self):
        module = load_module()
        for source, expected in [
            ('pwa/src/components/recipes/RecipeDetailSheet.tsx', 'quiet-portions-layout.spec.ts'),
            ('pwa/src/components/planner/CooksMode.tsx', 'prepared-supper.spec.ts'),
            ('pwa/src/components/planner/CooksMode.tsx', 'supper-servings-context.spec.ts'),
        ]:
            with self.subTest(source=source, expected=expected):
                plan = module.build_impact_plan([source])
                self.assertIn(str(module.E2E_DIR / expected), plan.tests)

    def test_source_plus_test_does_not_narrow_shared_component_coverage(self):
        module = load_module()
        source = 'pwa/src/components/recipes/RecipeDetailSheet.tsx'
        for files in [[source, 'pwa/e2e/recipes.spec.ts'], ['pwa/e2e/recipes.spec.ts', source]]:
            with self.subTest(files=files):
                plan = module.build_impact_plan(files)
                self.assertIn(str(module.E2E_DIR / 'quiet-portions-layout.spec.ts'), plan.tests)

    def test_deleted_renamed_unknown_and_shared_pwa_inputs_keep_the_complete_mocked_inventory(self):
        module = load_module()
        for paths in [
            ['pwa/src/components/recipes/DeletedDetail.tsx'],
            ['pwa/src/components/planner/CooksMode.tsx', 'pwa/src/components/recipes/RenamedCook.tsx'],
            ['pwa/new-input.ts'], ['pwa/src/store/weekStore.ts'], ['pwa/e2e/mock-api.ts'],
        ]:
            with self.subTest(paths=paths):
                plan = module.build_impact_plan(paths)
                self.assertEqual(plan.tests, self.mocked_inventory(module))
                self.assertTrue(plan.run_all)
        self.assertEqual(module.build_impact_plan(['docs/development.md']).tests, ())

    def test_changed_files_include_untracked_paths(self):
        module = load_module()

        def git_output(command, cwd):
            if "--cached" in command:
                return b"Taskfile.yml\n"
            if "--others" in command:
                return b"pwa/src/lib/api/new-client.ts\n"
            return b"pwa/src/app/(app)/recipes/page.tsx\n"

        with mock.patch.object(module.subprocess, "check_output", side_effect=git_output):
            changed = module.get_changed_files()

        self.assertEqual(
            changed,
            [
                "Taskfile.yml",
                "pwa/src/app/(app)/recipes/page.tsx",
                "pwa/src/lib/api/new-client.ts",
            ],
        )

    def test_changed_files_ignore_next_generated_environment_declaration(self):
        module = load_module()

        def git_output(command, cwd):
            if "--cached" in command or "--others" in command:
                return b""
            return b"pwa/next-env.d.ts\npwa/src/app/(app)/recipes/page.tsx\n"

        with mock.patch.object(module.subprocess, "check_output", side_effect=git_output):
            changed = module.get_changed_files()

        self.assertEqual(changed, ["pwa/src/app/(app)/recipes/page.tsx"])

    def test_shared_recipe_api_wrapper_requires_all_e2e(self):
        module = load_module()
        plan = module.build_impact_plan(["pwa/src/lib/api/recipes.ts"])

        self.assertTrue(plan.run_all)
        self.assertEqual(plan.tests, self.mocked_inventory(module))
        self.assertTrue(any("pwa/src/lib/api/recipes.ts" in reason for reason in plan.reasons))

    def test_shared_recipe_wrapper_widens_mixed_changes_in_either_order(self):
        module = load_module()
        wrapper = "pwa/src/lib/api/recipes.ts"
        browser_test = "pwa/e2e/recipes.spec.ts"
        for changed in [[wrapper, browser_test], [browser_test, wrapper]]:
            with self.subTest(changed=changed):
                plan = module.build_impact_plan(changed)
                self.assertTrue(plan.run_all)
                self.assertEqual(plan.tests, self.mocked_inventory(module))

    def test_shared_generated_client_reports_why_all_e2e_are_required(self):
        module = load_module()
        plan = module.build_impact_plan(["pwa/src/lib/api/generated/models/index.ts"])

        self.assertTrue(plan.run_all)
        self.assertTrue(any("generated client" in reason.lower() for reason in plan.reasons))

    def test_digest_changes_when_untracked_file_content_changes(self):
        module = load_module()
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            changed = root / "new-file.ts"
            changed.write_text("first")

            first = module.build_impact_digest(root, ["new-file.ts"], ["pwa/e2e/recipes.spec.ts"])
            changed.write_text("second")
            second = module.build_impact_digest(root, ["new-file.ts"], ["pwa/e2e/recipes.spec.ts"])

        self.assertNotEqual(first, second)

    def test_success_cache_is_reused_only_for_the_same_digest(self):
        module = load_module()
        with tempfile.TemporaryDirectory() as temp_dir:
            cache_path = Path(temp_dir) / "last-success.json"
            module.write_success_cache(cache_path, "digest-a", ["recipes.spec.ts"])

            self.assertTrue(module.has_success_cache(cache_path, "digest-a", ["recipes.spec.ts"]))
            self.assertFalse(module.has_success_cache(cache_path, "digest-b", ["recipes.spec.ts"]))
            self.assertFalse(module.has_success_cache(cache_path, "digest-a", ["planner.spec.ts"]))

    def test_mutation_during_tests_rejects_success_even_with_cache_disabled(self):
        module = load_module()
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            changed = root / "changed.ts"
            changed.write_text("before")
            cache_path = root / ".task" / "last-success.json"
            tests = [str(root / "recipes.spec.ts")]
            plan = module.ImpactPlan(tuple(tests), ("mapped",), False)

            def run_and_mutate(*args, **kwargs):
                changed.write_text("after")
                return "passed", "exit 0"

            with mock.patch.object(module, "ROOT", root), \
                mock.patch.object(module, "CACHE_PATH", cache_path), \
                mock.patch.object(module, "get_changed_files", return_value=["changed.ts"]), \
                mock.patch.object(module, "build_impact_plan", return_value=plan), \
                mock.patch("finish.run_command", side_effect=run_and_mutate), \
                mock.patch.dict(os.environ, {"WFS_DISABLE_TEST_CACHE": "1"}, clear=True):
                with contextlib.redirect_stdout(io.StringIO()):
                    with self.assertRaises(SystemExit):
                        module.run_impacted()

            post_test_digest = module.build_impact_digest(root, ["changed.ts"], tests)
            self.assertFalse(module.has_success_cache(cache_path, post_test_digest, tests))

    def test_stable_success_caches_pretest_identity_and_reuses_it(self):
        module = load_module()
        with tempfile.TemporaryDirectory() as tmp:
            cache = Path(tmp) / 'cache.json'
            with mock.patch.object(module, 'get_changed_files', return_value=['unknown.ts']), \
                 mock.patch.object(module, 'build_impact_digest', return_value='tested'), \
                 mock.patch.object(module, 'CACHE_PATH', cache), \
                 mock.patch.dict(os.environ, {'WFS_ISOLATED_RUNNER': '1'}, clear=True), \
                 mock.patch('finish.run_command', return_value=('passed', 'exit 0')) as run:
                module.run_impacted()
                module.run_impacted()
            self.assertEqual(run.call_count, 1)
            self.assertTrue(module.has_success_cache(cache, 'tested', [str(module.E2E_DIR)]))

    def test_impact_timeout_is_blocked_and_never_cached(self):
        module = load_module()
        with tempfile.TemporaryDirectory() as tmp:
            cache = Path(tmp) / 'cache.json'
            with mock.patch.object(module, 'get_changed_files', return_value=['unknown.ts']), \
                 mock.patch.object(module, 'build_impact_digest', return_value='before'), \
                 mock.patch.object(module, 'CACHE_PATH', cache), \
                 mock.patch('finish.run_command', return_value=('blocked', 'TimeoutExpired')) as run:
                with self.assertRaises(SystemExit) as result:
                    module.run_impacted()
            self.assertEqual(result.exception.code, 2)
            self.assertFalse(cache.exists())
            self.assertEqual(run.call_count, 1)


if __name__ == "__main__":
    unittest.main()
