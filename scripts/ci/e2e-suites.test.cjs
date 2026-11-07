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
test('dated portions and recipe-detail acceptance have explicit capability owners', () => {
  for (const name of [
    'prepared-supper', 'supper-servings', 'supper-servings-context', 'supper-servings-movement',
  ]) {
    assert.ok(suites.planning.includes(name), `${name} belongs to planning`);
  }
  assert.ok(suites.recipes.includes('recipe-detail-layout'));
});

test('duplicate capability ownership fails closed', () => {
  suites.tonight.push('planner');
  try {
    assert.throws(() => validateInventory(inventory()), /duplicates=planner\.spec\.ts/);
  } finally {
    suites.tonight.pop();
  }
});

test('unknown, newly added and removed files fail closed', () => {
  assert.throws(() => selectSuite('typo', inventory()), /Unknown/);
  assert.throws(() => validateInventory([...inventory(), 'new.spec.ts']), /unassigned=new/);
  assert.throws(() => validateInventory(inventory().slice(1)), /stale=.+spec.ts/);
});

test('explicit filtered production feedback uses the complete mocked inventory', () => {
  const selected = selectSuite('all', inventory());
  assert.equal(selected.length, Object.values(suites).flat().length);
  assert.ok(selected.every(name => !name.endsWith('-live.spec.ts')));
});


test('refinement browser specs retain capability ownership and separate live qualification', () => {
  assert.ok(suites.recipes.includes('recipe-ingredient-preview'));
  assert.ok(suites.planning.includes('planner-portions-refinement'));
  assert.ok(suites.planning.includes('grocery-recipe-sources'));
  assert.ok(live.includes('recipe-ingredient-preview-live'));
  assert.ok(live.includes('grocery-recipe-sources-live'));
  validateInventory(inventory());
});
