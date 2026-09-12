import json
from pathlib import Path
assert json.loads(Path('fixture/static.json').read_text()) == {'schema':'ok'}
print('static fixture schema passed; no live check performed')
