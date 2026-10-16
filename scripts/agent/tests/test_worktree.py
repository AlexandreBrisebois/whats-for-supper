from pathlib import Path
import subprocess
import sys
import tempfile

from git_fixture import IsolatedGitTestCase

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import worktree
import test_ops
from unittest import mock


class WorktreeTests(IsolatedGitTestCase):
    def repo(self, root):
        for args in [('init', '-q'), ('config', 'user.email', 'tests@example.com'),
                     ('config', 'user.name', 'Tests')]:
            subprocess.run(['git', *args], cwd=root, check=True)
        (root / '.gitignore').write_text('.task/\n')
        (root / 'file.md').write_text('initial\n')
        subprocess.run(['git', 'add', '.'], cwd=root, check=True)
        subprocess.run(['git', 'commit', '-qm', 'initial'], cwd=root, check=True)

    def test_branch_and_head_changes_need_no_session_reset(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.repo(root)
            # Stale lifecycle metadata is ignored, including after a branch switch.
            stale = root / '.task/agent-session/manifest.json'
            stale.parent.mkdir(parents=True)
            stale.write_text('{"repository": {"branch": "old", "head": "old"}}')
            subprocess.run(['git', 'checkout', '-qb', 'next'], cwd=root, check=True)
            (root / 'file.md').write_text('committed\n')
            subprocess.run(['git', 'commit', '-qam', 'next'], cwd=root, check=True)
            (root / 'file.md').write_text('unstaged\n')
            (root / 'new.md').write_text('staged\n')
            subprocess.run(['git', 'add', 'new.md'], cwd=root, check=True)
            (root / 'untracked.md').write_text('new\n')
            with mock.patch.object(test_ops, 'ROOT', root):
                self.assertEqual(test_ops.get_changed_files(), ['file.md', 'new.md', 'untracked.md'])

    def test_snapshots_detect_edits_deletions_additions_and_mode_changes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.repo(root)
            (root / 'delete.md').write_text('delete\n')
            (root / 'mode.md').write_text('mode\n')
            before = worktree.snapshot(root)
            (root / 'file.md').write_text('edit\n')
            (root / 'delete.md').unlink()
            (root / 'mode.md').chmod(0o755)
            (root / 'new.md').write_text('new\n')
            self.assertEqual(worktree.changed_between(before, worktree.snapshot(root)),
                             ['delete.md', 'file.md', 'mode.md', 'new.md'])
