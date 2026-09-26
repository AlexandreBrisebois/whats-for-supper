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
        self.assertIn("HEARTH_SECRET: wfs-ci-test-only", validation)

    def test_aws_secrets_are_confined_to_the_aws_delivery_workflow(self):
        aws_secret_names = (
            "AWS_ROLE_ARN",
            "GEMINI_API_KEY",
            "ELEVATED_ACTIONS_PIN",
        )
        for secret_name in aws_secret_names:
            self.assertIn(secret_name, self.text["aws-deploy.yml"])
            for name, content in self.text.items():
                if name != "aws-deploy.yml":
                    with self.subTest(secret=secret_name, workflow=name):
                        self.assertNotIn(secret_name, content)

    def test_synology_and_validation_workflows_do_not_reference_aws_delivery(self):
        forbidden = ("infrastructure/aws", "aws-actions/", "aws-cdk", "amazon-ecr")
        for name in ("ci.yml", "validate.yml", "publish.yml", "publish-dockerhub.yml"):
            for token in forbidden:
                with self.subTest(workflow=name, token=token):
                    self.assertNotIn(token, self.text[name].lower())

    def test_docker_hub_preflight_is_environment_protected_before_credentials(self):
        preflight = self.yaml["publish-dockerhub.yml"]["jobs"]["publish-preflight"]
        self.assertEqual(preflight["environment"], "dockerhub-publish")


if __name__ == "__main__":
    unittest.main()
