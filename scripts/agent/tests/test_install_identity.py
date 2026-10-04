"""Native-build boundaries for install-identity qualification."""
import os
from pathlib import Path
import sys
import unittest
from unittest import mock

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
ROOT = Path(__file__).resolve().parents[3]


class InstallIdentityTests(unittest.TestCase):
    def test_local_amd64_is_rejected_before_docker_access(self):
        import install_identity as identity
        with mock.patch.dict(os.environ, {}, clear=True), \
                mock.patch.object(identity.platform, 'machine', return_value='x86_64'), \
                mock.patch.object(identity, 'command') as docker:
            with self.assertRaisesRegex(ValueError, 'GitHub Actions'):
                identity.images('amd64')
            docker.assert_not_called()

    def test_emulated_build_is_rejected_before_docker_access(self):
        import install_identity as identity
        with mock.patch.dict(os.environ, {'GITHUB_ACTIONS': 'true'}, clear=True), \
                mock.patch.object(identity.platform, 'machine', return_value='arm64'), \
                mock.patch.object(identity, 'command') as docker:
            with self.assertRaisesRegex(ValueError, 'native'):
                identity.images('amd64')
            docker.assert_not_called()

    def test_native_arm64_and_github_amd64_are_allowed(self):
        import install_identity as identity
        for arch, machine, github in [('arm64', 'arm64', ''),
                                      ('arm64', 'aarch64', ''),
                                      ('amd64', 'x86_64', 'true')]:
            with self.subTest(arch=arch, machine=machine), \
                    mock.patch.dict(os.environ, {'GITHUB_ACTIONS': github}, clear=True), \
                    mock.patch.object(identity.platform, 'machine', return_value=machine):
                identity.validate_architecture(arch)

    def test_workflow_checks_both_channels_without_delivery_or_secrets(self):
        path = ROOT / '.github/workflows/install-identity-validation.yml'
        self.assertTrue(path.exists())
        text = path.read_text()
        workflow = yaml.safe_load(text)
        self.assertEqual(workflow['permissions'], {'contents': 'read'})
        job = workflow['jobs']['amd64']
        self.assertEqual(job['strategy']['matrix']['channel'], ['stable', 'beta'])
        self.assertIn('--images --architecture amd64 --channel ${{ matrix.channel }}', text)
        self.assertIn('actions/upload-artifact@', text)
        for forbidden in ['secrets.', '--push', 'docker push', 'login-action', 'aws-actions/']:
            self.assertNotIn(forbidden, text)


if __name__ == '__main__':
    unittest.main()
