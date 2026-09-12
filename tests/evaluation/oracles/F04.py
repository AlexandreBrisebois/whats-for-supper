from pathlib import Path
import sys
r=Path(sys.argv[1]).resolve()
import subprocess
code="""import assert from 'node:assert/strict';
const {createStore}=await import(process.argv[1]);
for(const early of [true,false]) {
 const s=createStore(),v=s.begin();
 if(early) { s.signal(v); assert.deepEqual(s.snapshot().effects,[]); }
 s.resolve(v,[]);assert.deepEqual(s.snapshot().effects,[]);
 s.resolve(v,['current']);
 if(!early) { assert.deepEqual(s.snapshot().effects,[]); s.signal(v); }
 s.signal(v);s.resolve(v,['current']);
 assert.deepEqual(s.snapshot().effects,[v]);
 const next=s.begin();s.signal(next);s.resolve(v,['stale']);s.signal(v);
 assert.deepEqual(s.snapshot().items,[]);
 s.resolve(next,['new']);s.resolve(v,['stale']);s.signal(next);
 assert.deepEqual(s.snapshot().items,['new']);assert.deepEqual(s.snapshot().effects,[v,next]);
}
"""
subprocess.run(['node','--input-type=module','-e',code,(r/'fixture/store.mjs').as_uri()],check=True)
