import assert from 'node:assert/strict';
import {createStore} from './store.mjs';
const s=createStore(),v=s.begin();s.resolve(v,['current']);s.signal(v);
assert.deepEqual(s.snapshot().effects,[v]);
console.log('data-before-event smoke passed');
