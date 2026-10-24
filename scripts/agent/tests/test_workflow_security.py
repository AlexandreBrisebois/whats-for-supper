"""Regression checks for GitHub Actions secret and delivery-path boundaries."""
from pathlib import Path
import unittest

import yaml


ROOT = Path(__file__).resolve().parents[3]
WORKFLOWS = ROOT / ".github/workflows"


class WorkflowSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = {path.name: path.read_text() for path in WORKFLOWS.glob("*.yml")}
        cls.yaml = {name: yaml.safe_load(content) for name, content in cls.text.items()}

    def test_validation_callers_do_not_inherit_all_repository_secrets(self):
        for name, content in self.text.items():
            with self.subTest(workflow=name):
                self.assertNotIn("secrets: inherit", content)

    def test_reusable_validation_uses_only_a_non_production_test_auth_value(self):
        validation = self.text["validate.yml"]
        self.assertNotIn("secrets.", validation)
        self.assertIn("HEARTH_SECRET: Paris-Montreal", validation)

    def test_retired_aws_delivery_workflow_and_secret_references_are_absent(self):
        self.assertFalse((WORKFLOWS / "aws-deploy.yml").exists())
        retired_secret_names = (
            "GEMINI_API_KEY",
            "ELEVATED_ACTIONS_PIN",
        )
        for name, content in self.text.items():
            with self.subTest(token="AWS_ROLE_ARN", workflow=name):
                self.assertNotIn("AWS_ROLE_ARN", content)
            for secret_name in retired_secret_names:
                with self.subTest(secret=secret_name, workflow=name):
                    self.assertNotIn(f"secrets.{secret_name}", content)
                    self.assertNotIn(f"secrets['{secret_name}']", content)
                    self.assertNotIn(f'secrets["{secret_name}"]', content)

    def test_workflows_do_not_reference_retired_aws_delivery(self):
        forbidden = ("infrastructure/aws", "aws-actions/", "aws-cdk", "amazon-ecr")
        for name in self.text:
            for token in forbidden:
                with self.subTest(workflow=name, token=token):
                    self.assertNotIn(token, self.text[name].lower())

    def test_docker_hub_preflight_is_environment_protected_before_credentials(self):
        preflight = self.yaml["publish-dockerhub.yml"]["jobs"]["publish-preflight"]
        self.assertEqual(preflight["environment"], "dockerhub-publish")

    def test_legacy_private_registry_delivery_paths_are_removed(self):
        self.assertFalse((WORKFLOWS / "publish.yml").exists())
        self.assertFalse((ROOT / "docker" / "actions-runner" / "compose.yml").exists())
        self.assertFalse((ROOT / "docker" / "actions-runner" / "DockerFile").exists())


if __name__ == "__main__":
    unittest.main()
