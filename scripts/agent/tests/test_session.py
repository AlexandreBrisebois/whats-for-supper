from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))
import session


class TaskSessionTests(unittest.TestCase):
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

    def test_begin_separates_ambient_and_task_owned_changes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self.repo(tmp)
            session_dir = root / ".task" / "agent-session"
            (root / "dirty.txt").write_text("ambient\n")
            manifest = session.begin("pilot", root, session_dir)
            self.assertEqual(manifest["ambient_at_start"], ["dirty.txt"])
            self.assertEqual((session_dir / "baseline" / "dirty.txt").read_text(), "ambient\n")

            (root / "clean.txt").write_text("task edit\n")
            delta = session.task_delta(root, session_dir)

            self.assertEqual(delta["owned"], ["clean.txt"])
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

            self.assertEqual(delta["owned"], ["dirty.txt"])
            self.assertEqual(delta["ambient"], [])
            self.assertEqual(delta["overlap"], ["dirty.txt"])

    def test_new_and_deleted_files_are_task_owned(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self.repo(tmp)
            session_dir = root / ".task" / "agent-session"
            session.begin("pilot", root, session_dir)

            (root / "clean.txt").unlink()
            (root / "new.txt").write_text("new\n")

            self.assertEqual(session.task_delta(root, session_dir)["owned"],
                             ["clean.txt", "new.txt"])

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
