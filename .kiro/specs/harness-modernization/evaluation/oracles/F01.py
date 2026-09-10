from pathlib import Path
import sys
r=Path(sys.argv[1]).resolve()
assert (r/'fixture/guide.md').read_text() == '# Guide\n\nSave recipes for supper.\n'
