from pathlib import Path
import sys
r=Path(sys.argv[1]).resolve()
import importlib.util
spec=importlib.util.spec_from_file_location('quantity',r/'fixture/quantity.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
for n in [0,1,2,7]: assert m.quantity(n)==n*3
assert (r/'HANDOVER.md').read_text().split('## Other task',1)[1]=='\nOwner: another contributor. Leave this section unchanged.\n'
