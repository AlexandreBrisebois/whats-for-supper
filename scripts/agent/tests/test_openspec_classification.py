import contextlib
import io
from pathlib import Path
import sys
import unittest
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import finish
import test_ops


class OpenSpecClassificationTests(unittest.TestCase):
    def test_planning_metadata_and_empty_directory_markers_need_only_documentation(self):
        for path in ['openspec/changes/example/.openspec.yaml',
                     'openspec/changes/archive/2026-10-14-example/.openspec.yaml',
                     'openspec/specs/.gitkeep', 'openspec/changes/archive/.gitkeep',
                     'openspec/changes/example/tasks.md', 'openspec/specs/example/spec.md']:
            with self.subTest(path=path):
                self.assertEqual(finish.classes_for([path]), {'documentation'})
                self.assertEqual(finish.checks_for([path]), ['documentation', 'spec:check'])
                self.assertFalse(test_ops.build_impact_plan([path]).tests)

    def test_workflow_configuration_and_templates_are_harness_changes(self):
        for path in ['openspec/config.yaml', 'openspec/schemas/wfs/schema.yaml',
                     'openspec/schemas/wfs/templates/tasks.md',
                     '.agents/skills/.openspec-target']:
            with self.subTest(path=path):
                self.assertEqual(finish.classes_for([path]), {'harness'})
                expected = ['documentation', 'spec:check', 'test:agent'] if path.startswith('openspec/') else ['documentation', 'test:agent']
                self.assertEqual(finish.checks_for([path]), expected)
                self.assertFalse(test_ops.build_impact_plan([path]).tests)

    def test_known_openspec_files_prepare_without_generation_or_formatting(self):
        paths = ['openspec/config.yaml', 'openspec/changes/example/.openspec.yaml',
                 'openspec/schemas/wfs/schema.yaml', 'openspec/specs/.gitkeep']
        with mock.patch.object(finish, 'run_command') as run, contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(finish.prepare(paths), 0)
        run.assert_not_called()

    def test_runtime_contracts_and_unknown_files_remain_conservative(self):
        for path in ['openspec/changes/example/migration.sql', 'specs/openapi.yaml']:
            with self.subTest(path=path):
                self.assertEqual(finish.classes_for([path]), {'contract'})
                self.assertIn('database-behavior', finish.checks_for([path]))
                self.assertTrue(test_ops.build_impact_plan([path]).run_all)
        for path in ['openspec/changes/example/openapi.yaml',
                     'openspec/schemas/wfs/run.py', 'openspec/new-format.json']:
            with self.subTest(path=path):
                self.assertEqual(finish.classes_for([path]), {'unknown'})
                self.assertTrue(test_ops.build_impact_plan([path]).run_all)

    def test_planning_files_do_not_reduce_mixed_application_or_contract_checks(self):
        planning = ['openspec/config.yaml', 'openspec/changes/example/.openspec.yaml']
        for path in ['pwa/src/lib/api/generated/models/example.ts', 'specs/openapi.yaml']:
            with self.subTest(path=path):
                self.assertTrue(set(finish.checks_for([path])) <= set(finish.checks_for(planning + [path])))
                self.assertTrue(test_ops.build_impact_plan(planning + [path]).run_all)


class DocumentationArtifactTests(unittest.TestCase):
    def test_documentation_metadata_and_recorded_patches_need_no_runtime_checks(self):
        for path in ['docs/examples/manifest.yaml', 'docs/examples/evidence.json',
                     'docs/examples/change.patch', 'docs/examples/.config.kiro']:
            with self.subTest(path=path):
                self.assertEqual(finish.classes_for([path]), {'documentation'})
                self.assertFalse(test_ops.build_impact_plan([path]).tests)

    def test_scripts_and_sql_in_documentation_remain_conservative(self):
        self.assertEqual(finish.classes_for(['docs/examples/script.py']), {'unknown'})
        self.assertEqual(finish.classes_for(['docs/examples/schema.sql']), {'contract'})
