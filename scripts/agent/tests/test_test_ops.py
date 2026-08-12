import contextlib
import importlib.util
import io
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock


SCRIPT_PATH = Path(__file__).parents[1] / "test_ops.py"


def load_module():
    spec = importlib.util.spec_from_file_location("test_ops", SCRIPT_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ImpactPlanningTests(unittest.TestCase):
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

    def test_recipe_api_wrapper_maps_to_recipe_flows_instead_of_all_e2e(self):
        module = load_module()
        plan = module.build_impact_plan(["pwa/src/lib/api/recipes.ts"])

        self.assertFalse(plan.run_all)
        self.assertEqual(
            {Path(test).name for test in plan.tests},
            {"recipes.spec.ts", "home-recipe.spec.ts"},
        )
        self.assertTrue(any("pwa/src/lib/api/recipes.ts" in reason for reason in plan.reasons))

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

    def test_success_cache_records_post_test_worktree_digest(self):
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

            with mock.patch.object(module, "ROOT", root), \
                mock.patch.object(module, "CACHE_PATH", cache_path), \
                mock.patch.object(module, "get_changed_files", return_value=["changed.ts"]), \
                mock.patch.object(module, "build_impact_plan", return_value=plan), \
                mock.patch.object(module.subprocess, "run", side_effect=run_and_mutate), \
                mock.patch.dict(os.environ, {}, clear=True):
                with contextlib.redirect_stdout(io.StringIO()):
                    module.run_impacted()

            post_test_digest = module.build_impact_digest(root, ["changed.ts"], tests)
            self.assertTrue(module.has_success_cache(cache_path, post_test_digest, tests))


if __name__ == "__main__":
    unittest.main()
