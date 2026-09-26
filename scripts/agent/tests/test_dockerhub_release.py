import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[3]
HELPER_PATH = ROOT / "scripts/agent/dockerhub_release.py"
WORKFLOW_PATH = ROOT / ".github/workflows/publish-dockerhub.yml"


def load_helper():
    spec = importlib.util.spec_from_file_location("dockerhub_release", HELPER_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class DockerHubReleaseHelperTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.release = load_helper()

    def test_accepts_stable_and_beta_tags_and_strips_only_trigger_prefix(self):
        self.assertEqual(
            "1.2.3", self.release.image_version("dockerhub/v1.2.3")
        )
        self.assertEqual(
            "1.2.3-beta.1", self.release.image_version("dockerhub/v1.2.3-beta.1")
        )

    def test_rejects_malformed_tags(self):
        for tag in (
            "v1.2.3",
            "dockerhub/v1.2",
            "dockerhub/v1.2.3-rc.1",
            "dockerhub/v1.2.3-beta.0",
            "dockerhub/v01.2.3",
            "dockerhub/v1.2.3-beta.01",
        ):
            with self.subTest(tag=tag):
                with self.assertRaises(ValueError):
                    self.release.image_version(tag)

    def test_calculates_next_stable_and_beta_by_semver_precedence(self):
        tags = [
            "dockerhub/v0.9.9",
            "dockerhub/v1.2.3-beta.2",
            "dockerhub/v1.2.3-beta.10",
            "dockerhub/v1.2.2",
        ]
        self.assertEqual("1.2.3", self.release.next_version(tags, "stable"))
        self.assertEqual("1.2.3-beta.11", self.release.next_version(tags, "beta"))
        self.assertEqual("0.1.0", self.release.next_version([], "stable"))
        self.assertEqual("0.1.0-beta.1", self.release.next_version([], "beta"))

    def test_stable_precedence_advances_patch_for_both_kinds(self):
        tags = ["dockerhub/v1.2.3", "dockerhub/v1.2.3-beta.9"]
        self.assertEqual("1.2.4", self.release.next_version(tags, "stable"))
        self.assertEqual("1.2.4-beta.1", self.release.next_version(tags, "beta"))

    def test_explicit_package_bumps_reset_or_set_the_beta_number(self):
        tags = ["dockerhub/v1.2.3-beta.4", "dockerhub/v1.2.2"]
        self.assertEqual(
            "1.2.4-beta.1", self.release.next_beta_version(tags, package_bump="patch")
        )
        self.assertEqual(
            "1.3.0-beta.2", self.release.next_beta_version(
                tags, package_bump="minor", beta_number=2
            )
        )
        self.assertEqual(
            "2.0.0-beta.1", self.release.next_beta_version(tags, package_bump="major")
        )

    def test_explicit_beta_bump_never_changes_the_package_version(self):
        self.assertEqual(
            "1.2.3-beta.5",
            self.release.next_beta_version(
                ["dockerhub/v1.2.3-beta.4"], beta_bump=True
            ),
        )

    def test_explicit_beta_bump_requires_a_current_beta_release(self):
        with self.assertRaisesRegex(
            self.release.ReleasePreflightError, "requires the latest Docker Hub release to be beta"
        ):
            self.release.next_beta_version(["dockerhub/v1.2.3"], beta_bump=True)

    def test_beta_number_requires_a_package_bump_and_is_positive(self):
        with self.assertRaisesRegex(ValueError, "requires --package-bump"):
            self.release.next_beta_version(["dockerhub/v1.2.3-beta.4"], beta_number=2)
        with self.assertRaisesRegex(ValueError, "positive integer"):
            self.release.next_beta_version(
                ["dockerhub/v1.2.3-beta.4"], package_bump="patch", beta_number=0
            )

    def test_invalid_or_existing_targets_fail_before_tag_creation(self):
        with self.assertRaises(ValueError):
            self.release.validate_target("1.2.3-rc.1")
        with self.assertRaises(self.release.ReleasePreflightError):
            self.release.require_annotated_tag_object("commit")
        with self.assertRaises(self.release.ReleasePreflightError):
            self.release.assert_target_absent(
                "dockerhub/v1.2.3", {"dockerhub/v1.2.3"}, set()
            )
        with self.assertRaises(self.release.ReleasePreflightError):
            self.release.assert_target_absent(
                "dockerhub/v1.2.3", set(), {"dockerhub/v1.2.3"}
            )

    def test_dirty_worktree_stops_before_annotated_tag_creation(self):
        def output(*args):
            if args[:2] == ("tag", "--list"):
                return ""
            if args[:2] == ("status", "--porcelain"):
                return " M Taskfile.yml"
            self.fail(f"unexpected git output: {args}")

        with (
            patch.object(self.release, "git_run") as git_run,
            patch.object(self.release, "git_output", side_effect=output),
            patch.object(self.release, "remote_tags", return_value=set()),
        ):
            with self.assertRaises(self.release.ReleasePreflightError):
                self.release.create_tag("stable")

        git_run.assert_called_once_with("fetch", "origin", "main", "--tags", "--quiet")

    def test_taskfile_exposes_only_the_two_interactive_release_helpers(self):
        taskfile = (ROOT / "Taskfile.yml").read_text()
        self.assertIn("release:dockerhub:tag:", taskfile)
        self.assertIn("python3 -B scripts/agent/dockerhub_release.py stable", taskfile)
        self.assertIn("release:dockerhub:beta:", taskfile)
        self.assertIn("python3 -B scripts/agent/dockerhub_release.py beta {{.CLI_ARGS}}", taskfile)


class DockerHubWorkflowContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = WORKFLOW_PATH.read_text()

    def test_tag_only_workflow_has_the_expected_trigger_and_destinations(self):
        self.assertIn("tags:\n      - 'dockerhub/v*'", self.workflow)
        self.assertNotIn("workflow_dispatch:", self.workflow)
        self.assertNotIn("pull_request:", self.workflow)
        self.assertNotIn("branches:", self.workflow)
        for image in (
            "brisebois/whats-for-supper-api",
            "brisebois/whats-for-supper-pwa",
            "brisebois/whats-for-supper-db-migration",
        ):
            self.assertIn(image, self.workflow)

    def test_workflow_enforces_immutable_multi_arch_publication_preflight(self):
        self.assertIn("linux/amd64,linux/arm64", self.workflow)
        self.assertIn('git rev-parse -q --verify "refs/tags/$TAG^{tag}"', self.workflow)
        self.assertNotIn("EVENT_SHA", self.workflow)
        self.assertNotIn('"$tag_object" != "$EVENT_SHA"', self.workflow)
        self.assertIn("git merge-base --is-ancestor \"$tag_commit\" origin/main", self.workflow)
        self.assertIn("DOCKERHUB_USERNAME", self.workflow)
        self.assertIn("DOCKERHUB_TOKEN", self.workflow)
        self.assertIn("github.actor == vars.DOCKERHUB_PUBLISHER_GITHUB_LOGIN", self.workflow)
        self.assertIn("environment: dockerhub-publish", self.workflow)
        self.assertIn("hub.docker.com/v2/repositories", self.workflow)
        self.assertNotIn(":latest", self.workflow)
        self.assertNotIn("192.168.1.226", self.workflow)
        self.assertNotIn("self-hosted", self.workflow)

    def test_preflight_checks_credentials_and_tags_once_before_the_matrix(self):
        preflight, publish = self.workflow.split("  publish:\n", 1)
        self.assertIn("DOCKERHUB_USERNAME", preflight)
        self.assertIn("DOCKERHUB_TOKEN", preflight)
        self.assertIn("Reject existing Docker Hub image tags", preflight)
        self.assertIn("publish-preflight", preflight)
        self.assertNotIn("Require Docker Hub credentials", publish)
        self.assertNotIn("Reject existing Docker Hub image tag", publish)


if __name__ == "__main__":
    unittest.main()
