"""Release reuse must bind success, source identity and both architecture artifacts."""
import importlib.util
import unittest
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[3]


class PipelineTests(unittest.TestCase):
    def test_public_demo_welcome_is_household_only_and_keeps_private_artifacts(self):
        jobs = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']
        job = jobs['pwa-e2e']
        steps = job['steps']
        matches = [step for step in steps if step.get('name') == 'Public Demo Welcome regression']
        self.assertEqual(len(matches), 1, 'The core public Demo journey needs a durable CI invocation')
        public = matches[0]
        self.assertEqual(public['if'], "matrix.suite == 'household'")
        self.assertEqual(public['env'], {'WFS_WELCOME_DEMO': 'true', 'WFS_WELCOME_SECRET': 'Swipe-Match-Cook'})
        self.assertEqual(public['working-directory'], 'pwa')
        self.assertEqual(public['run'], 'npm run test:e2e -- --config=e2e/welcome-demo.playwright.config.ts --output=test-results/welcome-demo')
        private = next(step for step in steps if step.get('name') == 'Run capability suite')
        self.assertEqual(private['run'], 'npm run test:e2e')
        self.assertLess(steps.index(private), steps.index(public))
        self.assertEqual(job['env']['HEARTH_SECRET'], 'Paris-Montreal')
        self.assertNotIn('WFS_WELCOME_DEMO', job['env'])
        self.assertNotIn('WFS_WELCOME_SECRET', job['env'])
        self.assertEqual(sum('actions/download-artifact@' in step.get('uses', '') for step in steps), 1)

    def test_e2e_has_four_suites_and_one_build(self):
        jobs = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']
        self.assertIn('pwa-build', jobs)
        self.assertIn('fromJSON', jobs['pwa-e2e']['strategy']['matrix']['suite'])
        self.assertFalse(jobs['pwa-e2e']['strategy']['fail-fast'])
        self.assertFalse(any('npm run build' in s.get('run', '')
                             for s in jobs['pwa-e2e']['steps']))

    def test_database_smoke_is_single_arch_and_packaging_is_release_only(self):
        jobs = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())['jobs']
        self.assertNotIn('strategy', jobs['docker-smoke'])
        self.assertEqual(jobs['docker-smoke']['runs-on'], 'ubuntu-latest')
        workflow = yaml.safe_load((ROOT / '.github/workflows/container-candidate.yml').read_text())
        matrix = workflow['jobs']['build-smoke']['strategy']['matrix']['include']
        self.assertEqual({(m['arch'], m['runner']) for m in matrix},
                         {('amd64', 'ubuntu-24.04'), ('arm64', 'ubuntu-24.04-arm')})
        self.assertNotIn('container-candidate', (ROOT / '.github/workflows/ci.yml').read_text())

    def test_publish_never_builds_or_unconditionally_validates(self):
        jobs = yaml.safe_load((ROOT / '.github/workflows/publish-dockerhub.yml').read_text())['jobs']
        self.assertIn('resolve-candidate', jobs)
        self.assertIn('resolve-candidate', jobs['validate']['needs'])
        self.assertIn("run-id == ''", jobs['validate']['if'])
        for job in ('publish', 'publish-platforms'):
            for step in jobs.get(job, {}).get('steps', []):
                self.assertNotIn('docker/build-push-action', step.get('uses', ''))
                self.assertNotIn('npm run', step.get('run', ''))

    def test_database_and_container_inputs_select_smoke_without_packaging_every_pwa_change(self):
        import re
        text = (ROOT / '.github/workflows/validate.yml').read_text()
        pattern = re.search(r'echo "docker=\$\(selected \'(.*?)\'\)', text).group(1)
        for path in ['api/database/schema.sql', 'api/database/compatibility.sql',
                     'api/src/RecipeApi/Data/AppDbContext.cs', 'api/src/RecipeApi/Models/Recipe.cs',
                     'api/Dockerfile', 'docker/compose/apps.yml']:
            self.assertRegex(path, pattern)
        for path in ['pwa/src/app/(app)/planner/page.tsx', 'pwa/e2e/planner.spec.ts']:
            self.assertNotRegex(path, pattern)

    def test_completed_pdf_workflow_is_retired_and_identity_trigger_is_bounded(self):
        self.assertFalse((ROOT / '.github/workflows/pdf-preview-validation.yml').exists())
        text = (ROOT / '.github/workflows/install-identity-validation.yml').read_text()
        self.assertNotIn("'pwa/**'", text)
        for path in ['pwa/Dockerfile', 'pwa/src/app/manifest.json/**',
                     'pwa/src/lib/server/release-channel*', 'pwa/src/app/layout.tsx']:
            self.assertIn(path, text)


def helper():
    spec = importlib.util.spec_from_file_location('image_candidate', ROOT / 'scripts/ci/image-candidate.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CandidateIdentityTests(unittest.TestCase):
    def setUp(self):
        self.c = helper()
        self.sha = 'a' * 40
        self.repository = 'owner/repository'
        self.run = {'head_sha': self.sha, 'event': 'push', 'conclusion': 'success',
                    'status': 'completed', 'head_branch': 'main',
                    'head_repository': {'full_name': self.repository}}

    def eligible(self):
        return self.c.eligible(self.run, self.sha, 'stable', self.repository)

    def test_exact_successful_push_is_reusable_source_validation(self):
        self.assertTrue(self.eligible())

    def test_wrong_commit_pr_failure_incomplete_branch_and_fork_are_rejected(self):
        for field, value in [('head_sha', 'b' * 40), ('event', 'pull_request'),
                             ('conclusion', 'failure'), ('status', 'in_progress'),
                             ('head_branch', 'feature'), ('head_branch', None),
                             ('head_repository', {'full_name': 'fork/repository'})]:
            with self.subTest(field=field, value=value):
                original = self.run[field]
                self.run[field] = value
                self.assertFalse(self.eligible())
                self.run[field] = original

    def test_non_main_beta_validation_is_reusable_without_image_artifacts(self):
        self.run['head_branch'] = 'feature/test'
        self.assertTrue(self.c.eligible(self.run, self.sha, 'beta', self.repository))

    def test_archive_tampering_and_mismatched_metadata_are_rejected_before_load(self):
        import tempfile
        import copy
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            images = {}
            for service in self.c.SERVICES:
                path = directory / f'{service}.tar'
                path.write_bytes(b'fixture image bytes')
                images[service] = {'id': 'sha256:fixture', 'sha256': self.c.checksum(path)}
            metadata = {'schema': self.c.SCHEMA, 'revision': self.sha, 'channel': 'stable',
                        'arch': 'amd64', 'run_id': '123', 'images': images}
            self.c.verify_metadata(metadata, self.sha, 'stable', 'amd64', '123', directory)
            for field, wrong in [('revision', 'b' * 40), ('channel', 'beta'), ('arch', 'arm64'),
                                 ('run_id', '124'), ('schema', 0), ('images', {})]:
                with self.subTest(field=field):
                    changed = copy.deepcopy(metadata)
                    changed[field] = wrong
                    with self.assertRaises(ValueError):
                        self.c.verify_metadata(changed, self.sha, 'stable', 'amd64', '123', directory)
            (directory / 'api.tar').write_bytes(b'tampered')
            with self.assertRaisesRegex(ValueError, 'checksum'):
                self.c.verify_metadata(metadata, self.sha, 'stable', 'amd64', '123', directory)

    def test_loaded_image_must_match_architecture_labels_and_image_id(self):
        import copy
        info = {'Architecture': 'amd64', 'Os': 'linux', 'Id': 'sha256:fixture',
                'Config': {'Labels': {'org.opencontainers.image.revision': self.sha,
                                      'io.whats-for-supper.channel': 'stable'}}}
        self.c.check_image(info, self.sha, 'stable', 'amd64', 'sha256:fixture')
        for field, value in [('Architecture', 'arm64'), ('Os', 'windows'), ('Id', 'sha256:wrong')]:
            changed = copy.deepcopy(info)
            changed[field] = value
            with self.assertRaises(ValueError):
                self.c.check_image(changed, self.sha, 'stable', 'amd64', 'sha256:fixture')
        with self.assertRaises(ValueError):
            self.c.check_image(info, self.sha, 'beta', 'amd64')


if __name__ == '__main__':
    unittest.main()
