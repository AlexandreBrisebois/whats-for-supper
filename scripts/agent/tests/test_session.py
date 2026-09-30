from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import contextlib
import io
import os
from git_fixture import IsolatedGitTestCase


SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))
import session


class HookEnvironmentTests(unittest.TestCase):
    def test_worktree_fixture_ignores_inherited_hook_environment(self):
        environment = dict(os.environ, GIT_INDEX_FILE=".git/index",
                           GIT_CONFIG_COUNT="1",
                           GIT_CONFIG_KEY_0="commit.gpgsign",
                           GIT_CONFIG_VALUE_0="true")
        result = subprocess.run(
            [sys.executable, "-B", "-m", "unittest",
             "test_session.TaskSessionTests.test_distinct_worktrees_support_independent_sessions"],
            cwd=Path(__file__).parent, env=environment,
            capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


class TaskSessionTests(IsolatedGitTestCase):
    def repo(self, directory: str) -> Path:
        root = Path(directory)
        subprocess.run(["git", "init", "-q"], cwd=root, check=True)
        subprocess.run(["git", "config", "user.email", "tests@example.com"], cwd=root, check=True)
        subprocess.run(["git", "config", "user.name", "Tests"], cwd=root, check=True)
        (root / ".gitignore").write_text(".task/\n")
        (root / "clean.txt").write_text("clean\n")
        (root / "dirty.txt").write_text("original\n")
        subprocess.run(["git", "add", "."], cwd=root, check=True)
        subprocess.run(["git", "commit", "-qm", "initial"], cwd=root, check=True)
        return root

    def test_begin_separates_ambient_and_post_begin_changes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self.repo(tmp)
            session_dir = root / ".task" / "agent-session"
            (root / "dirty.txt").write_text("ambient\n")
            manifest = session.begin("pilot", root, session_dir)
            self.assertEqual(manifest["ambient_at_start"], ["dirty.txt"])
            self.assertEqual((session_dir / "baseline" / "dirty.txt").read_text(), "ambient\n")

            (root / "clean.txt").write_text("task edit\n")
            delta = session.task_delta(root, session_dir)

            self.assertEqual(delta["changed_since_begin"], ["clean.txt"])
            self.assertEqual(delta["ambient"], ["dirty.txt"])
            self.assertEqual(delta["overlap"], [])

    def test_editing_an_already_dirty_file_is_reported_as_overlap(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self.repo(tmp)
            session_dir = root / ".task" / "agent-session"
            (root / "dirty.txt").write_text("ambient\n")
            session.begin("pilot", root, session_dir)

            (root / "dirty.txt").write_text("task changed ambient file\n")
            delta = session.task_delta(root, session_dir)

            self.assertEqual(delta["changed_since_begin"], ["dirty.txt"])
            self.assertEqual(delta["ambient"], [])
            self.assertEqual(delta["overlap"], ["dirty.txt"])

    def test_new_and_deleted_files_are_changed_since_begin(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self.repo(tmp)
            session_dir = root / ".task" / "agent-session"
            session.begin("pilot", root, session_dir)

            (root / "clean.txt").unlink()
            (root / "new.txt").write_text("new\n")

            self.assertEqual(session.task_delta(root, session_dir)["changed_since_begin"],
                             ["clean.txt", "new.txt"])

    def test_staging_only_does_not_claim_a_content_change(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self.repo(tmp)
            session_dir = root / ".task" / "agent-session"
            (root / "dirty.txt").write_text("ambient\n")
            session.begin("pilot", root, session_dir)

            subprocess.run(["git", "add", "dirty.txt"], cwd=root, check=True)

            self.assertEqual(session.task_delta(root, session_dir), {
                "changed_since_begin": [], "ambient": ["dirty.txt"], "overlap": []})

    def test_head_change_blocks_delta_and_status_with_recovery_details(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self.repo(tmp)
            session_dir = root / ".task" / "agent-session"
            manifest = session.begin("pilot", root, session_dir)
            (root / "second.txt").write_text("second\n")
            subprocess.run(["git", "add", "second.txt"], cwd=root, check=True)
            subprocess.run(["git", "commit", "-qm", "second"], cwd=root, check=True)
            current = subprocess.check_output(
                ["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()

            pattern = f"baseline HEAD {manifest['head']}.*current HEAD {current}.*preserve"
            with self.assertRaisesRegex(RuntimeError, pattern):
                session.task_delta(root, session_dir)
            with contextlib.redirect_stderr(io.StringIO()):
                with self.assertRaisesRegex(RuntimeError, pattern):
                    session.print_status(root, session_dir)

    def test_post_begin_writer_is_reported_as_unattributed_difference(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self.repo(tmp)
            session_dir = root / ".task" / "agent-session"
            session.begin("pilot", root, session_dir)

            subprocess.run([sys.executable, "-c",
                            "from pathlib import Path; Path('concurrent.txt').write_text('other\\n')"],
                           cwd=root, check=True)
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                session.print_status(root, session_dir)

            self.assertIn("changed since begin (writer unverified): 1", output.getvalue())
            self.assertNotIn("task-owned", output.getvalue().lower())

    def test_distinct_worktrees_support_independent_sessions(self):
        with tempfile.TemporaryDirectory() as tmp:
            primary_path = Path(tmp) / "primary"
            primary_path.mkdir()
            primary = self.repo(str(primary_path))
            secondary = Path(tmp) / "secondary"
            subprocess.run(["git", "worktree", "add", "-q", "-b", "secondary",
                            str(secondary)], cwd=primary, check=True)
            primary_session = primary / ".task/agent-session"
            secondary_session = secondary / ".task/agent-session"

            first = session.begin("first", primary, primary_session)
            second = session.begin("second", secondary, secondary_session)

            self.assertNotEqual(first["repository"]["git_dir"],
                                second["repository"]["git_dir"])
            self.assertEqual(session.task_delta(primary, primary_session)["changed_since_begin"], [])
            self.assertEqual(session.task_delta(secondary, secondary_session)["changed_since_begin"], [])

    def test_changed_between_reports_edits_additions_and_deletions(self):
        before = {"edited": {"sha256": "one"}, "deleted": {"sha256": "old"}}
        after = {"edited": {"sha256": "two"}, "added": {"sha256": "new"}}
        self.assertEqual(session.changed_between(before, after),
                         ["added", "deleted", "edited"])

    def test_second_session_is_blocked_and_abort_never_changes_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self.repo(tmp)
            session_dir = root / ".task" / "agent-session"
            session.begin("pilot", root, session_dir)
            with self.assertRaisesRegex(RuntimeError, "already active"):
                session.begin("other", root, session_dir)

            (root / "clean.txt").write_text("keep me\n")
            session.abort(session_dir)

            self.assertEqual((root / "clean.txt").read_text(), "keep me\n")
            self.assertFalse(session_dir.exists())


if __name__ == "__main__":
    unittest.main()
