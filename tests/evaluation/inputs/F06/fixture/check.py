from pathlib import Path
assert Path('fixture/guide.md').read_text() == 'Save recipes.\n'
print('documentation check passed')
