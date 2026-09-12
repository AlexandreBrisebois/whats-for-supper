import assert from 'node:assert/strict';
import { reportButton } from './button.mjs';
assert.equal(reportButton({ busy: false }).disabled, false);
assert.equal(reportButton({ busy: false }).minHeight, 44);
console.log('idle button checks passed');
