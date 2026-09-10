from pathlib import Path
p=Path('fixture/guide.md').read_text()
assert p == '# Guide\n\nSave recipes for supper.\n'
print('documentation check passed')
