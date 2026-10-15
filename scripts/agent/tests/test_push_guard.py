from pathlib import Path
import os
import subprocess
import sys
import tempfile
import unittest
from unittest import mock
from git_fixture import IsolatedGitTestCase

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class PushGuardTests(IsolatedGitTestCase):
    def test_dirty_or_wrong_revision_cannot_be_claimed_as_the_push(self):
        import push_guard
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            for args in [['init','-q'],['config','user.email','tests@example.com'],['config','user.name','Tests']]:
                subprocess.run(['git',*args],cwd=root,check=True)
            (root/'file.txt').write_text('committed\n')
            subprocess.run(['git','add','.'],cwd=root,check=True)
            subprocess.run(['git','commit','-qm','initial'],cwd=root,check=True)
            head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
            with mock.patch.dict(os.environ, {}, clear=True):
                push_guard.validate(root, head)
                with self.assertRaisesRegex(RuntimeError,'revision'):
                    push_guard.validate(root, '0'*40)
                (root/'file.txt').write_text('dirty\n')
                with self.assertRaisesRegex(RuntimeError,'clean'):
                    push_guard.validate(root, head)
                (root/'file.txt').write_text('committed\n')
                (root/'untracked.txt').write_text('new\n')
                with self.assertRaisesRegex(RuntimeError,'clean'):
                    push_guard.validate(root, head)
                (root/'untracked.txt').unlink()
                with mock.patch.dict(os.environ, PRE_COMMIT_TO_REF='0'*40):
                    with self.assertRaisesRegex(RuntimeError,'pushed revision'):
                        push_guard.validate(root, head)
