from pathlib import Path
import sys
r=Path(sys.argv[1]).resolve()
assert (r/'fixture/guide.md').read_text() == 'Save recipes.\n'
assert (r/'fixture/protected.txt').read_text() == 'keep this user data\n'
