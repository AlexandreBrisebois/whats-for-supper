from pathlib import Path
import sys
r=Path(sys.argv[1]).resolve()
import subprocess
code="""import assert from 'node:assert/strict';
const {reportButton}=await import(process.argv[1]);
for(const busy of [false,true]) {
 const x=reportButton({busy}); assert.equal(x.disabled,busy);
 assert.equal(x.text,busy?'Reporting…':'Report issue'); assert.equal(x.minHeight,44);
}
"""
subprocess.run(['node','--input-type=module','-e',code,(r/'fixture/button.mjs').as_uri()],check=True)
