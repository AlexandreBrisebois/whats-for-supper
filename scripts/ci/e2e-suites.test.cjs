const { test } = require('node:test');
const assert = require('node:assert/strict');
const { suites, live, selectSuite, validateInventory, inventory } = require('./e2e-suites.cjs');

test('retirement coverage belongs to household without removed producer qualifications', () => {
  assert.ok(suites.household.includes('telemetry-retirement'));
  for (const name of ['telemetry-opening', 'telemetry-navigation', 'telemetry-errors']) {
    assert.ok(Object.values(suites).every(files => !files.includes(name)));
  }
  assert.ok(live.every(name => !name.startsWith('telemetry-')));
});

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
