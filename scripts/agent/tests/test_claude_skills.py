"""Claude skill shims stay generated from, and in sync with, .agents/skills."""
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import claude_skills  # noqa: E402


def write_skill(root, folder, name, description='Does a thing. Use when needed.'):
    path = root / '.agents/skills' / folder / 'SKILL.md'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f'---\nname: {name}\ndescription: {description}\n'
                    f'allowed-tools: Bash(x:*)\n---\n\n# Body\n\n[core](../../core/a.md)\n')


class ClaudeSkillShimTests(unittest.TestCase):
    def setUp(self):
        self._dir = tempfile.TemporaryDirectory()
        self.root = Path(self._dir.name)

    def tearDown(self):
        self._dir.cleanup()

    def test_repository_shims_are_current(self):
        self.assertEqual(claude_skills.sync(claude_skills.ROOT, check=True), [])

    def test_shim_uses_discovery_name_and_points_at_source_folder(self):
        write_skill(self.root, 'aws-architect', 'aws-well-architected')
        claude_skills.sync(self.root, check=False)
        shim = (self.root / '.claude/skills/aws-well-architected/SKILL.md').read_text()
        meta = claude_skills.read_frontmatter(
            self.root / '.claude/skills/aws-well-architected/SKILL.md')
        self.assertEqual(set(meta), {'name', 'description'})
        self.assertIn('.agents/skills/aws-architect/SKILL.md', shim)
        self.assertNotIn('# Body', shim)
        self.assertEqual(claude_skills.sync(self.root, check=True), [])

    def test_check_reports_drift_without_writing(self):
        write_skill(self.root, 'db', 'database')
        claude_skills.sync(self.root, check=False)
        write_skill(self.root, 'db', 'database', 'Changed description.')
        problems = claude_skills.sync(self.root, check=True)
        self.assertEqual(len(problems), 1)
        self.assertIn('stale', problems[0])
        self.assertNotIn('Changed', (self.root / '.claude/skills/database/SKILL.md').read_text())

    def test_removes_orphaned_generated_shims_only(self):
        write_skill(self.root, 'db', 'database')
        claude_skills.sync(self.root, check=False)
        manual = self.root / '.claude/skills/hand-made/SKILL.md'
        manual.parent.mkdir(parents=True)
        manual.write_text('---\nname: hand-made\ndescription: mine\n---\n')
        (self.root / '.agents/skills/db/SKILL.md').unlink()
        claude_skills.sync(self.root, check=False)
        self.assertFalse((self.root / '.claude/skills/database').exists())
        self.assertTrue(manual.exists())

    def test_replaces_legacy_symlink(self):
        write_skill(self.root, 'db', 'database')
        (self.root / '.claude').mkdir()
        (self.root / '.claude/skills').symlink_to('../.agents/skills')
        self.assertIn('symlink', claude_skills.sync(self.root, check=True)[0])
        claude_skills.sync(self.root, check=False)
        self.assertFalse((self.root / '.claude/skills').is_symlink())
        self.assertEqual(claude_skills.sync(self.root, check=True), [])


if __name__ == '__main__':
    unittest.main()
