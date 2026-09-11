"""Exercise the real Task targets in a disposable directory with sentinel context."""
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

import yaml


class SummaryStatusTests(unittest.TestCase):
    def test_summary_does_not_read_resume_or_skill_bodies(self):
        result = self.run_target("agent:summary")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("PRIVATE_RESUME_SENTINEL", result.stdout + result.stderr)
        self.assertNotIn("WHOLE_REGISTRY_SENTINEL", result.stdout + result.stderr)
        self.assertIn("AGENT.md", result.stdout)
        self.assertIn("agent:status", result.stdout)

    def test_explicit_status_reads_the_checkpoint(self):
        result = self.run_target("agent:status")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("PRIVATE_RESUME_SENTINEL", result.stdout)
        self.assertNotIn("WHOLE_REGISTRY_SENTINEL", result.stdout + result.stderr)

    def run_target(self, target):
        root = Path(__file__).resolve().parents[3]
        tasks = yaml.safe_load((root / "Taskfile.yml").read_text())["tasks"]
        with tempfile.TemporaryDirectory() as directory:
            fixture = Path(directory)
            (fixture / "HANDOVER.md").write_text("PRIVATE_RESUME_SENTINEL\n")
            (fixture / ".agents/skills").mkdir(parents=True)
            (fixture / ".agents/skills/README.md").write_text("WHOLE_REGISTRY_SENTINEL\n")
            (fixture / "Taskfile.yml").write_text(yaml.safe_dump({
                "version": "3", "tasks": {target: tasks[target]},
            }))
            return subprocess.run([shutil.which("task") or "task", "--silent", target],
                                  cwd=fixture, capture_output=True, text=True, timeout=15)


if __name__ == "__main__":
    unittest.main()
