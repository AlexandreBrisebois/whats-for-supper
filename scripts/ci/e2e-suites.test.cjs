const { test } = require('node:test');
const assert = require('node:assert/strict');
const { suites, live, selectSuite, validateInventory, inventory } = require('./e2e-suites.cjs');

test('every current spec belongs to exactly one suite or explicit live qualification', () => {
  validateInventory(inventory());
  const selected = Object.keys(suites).flatMap(name => selectSuite(name, inventory()));
  assert.equal(new Set(selected).size, selected.length);
  assert.equal(selected.length + live.length, inventory().length);
});
test('unknown, newly added and removed files fail closed', () => {
  assert.throws(() => selectSuite('typo', inventory()), /Unknown/);
  assert.throws(() => validateInventory([...inventory(), 'new.spec.ts']), /unassigned=new/);
  assert.throws(() => validateInventory(inventory().slice(1)), /stale=.+spec.ts/);
});
