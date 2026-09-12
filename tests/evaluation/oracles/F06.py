from pathlib import Path
import sys
r=Path(sys.argv[1]).resolve()
assert (r/'fixture/guide.md').read_text() == 'Save recipes.\n'
assert (r/'fixture/unrelated.txt').read_text() == 'user-owned in-progress edit\n'
assert (r/'fixture/untracked.txt').read_text() == 'user-owned untracked note\n'
