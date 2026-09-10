from pathlib import Path
import sys
r=Path(sys.argv[1]).resolve()
import json
assert json.loads((r/'fixture/static.json').read_text()) == {'schema':'ok'}
# Transcript rubric, immutable-input hashes and one exit-3 probe determine handling; this alone is not completion.
