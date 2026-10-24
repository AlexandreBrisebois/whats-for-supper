const { test } = require('node:test');
const assert = require('node:assert/strict');
const { selectSuites } = require('./select-e2e.cjs');
const all = ['tonight', 'planning', 'recipes', 'household'];
test('known test changes select their owning suites', () => {
  assert.deepEqual(selectSuites(['pwa/e2e/planner.spec.ts']), ['planning']);
  assert.deepEqual(selectSuites(['pwa/e2e/grocery.spec.ts', 'pwa/e2e/capture-flow.spec.ts']), ['planning', 'household']);
});
test('route selection includes known cross-feature consumers', () => {
  assert.deepEqual(selectSuites(['pwa/src/app/(app)/planner/page.tsx']), ['tonight', 'planning', 'household']);
  assert.deepEqual(selectSuites(['pwa/src/app/(app)/capture/page.tsx']), ['recipes', 'household']);
});
test('shared and unknown PWA inputs retain complete coverage', () => {
  for (const file of ['pwa/e2e/fixtures.ts', 'pwa/src/store/weekStore.ts', 'pwa/new-file.ts',
    'pwa/package-lock.json', 'pwa/playwright.config.ts', '.nvmrc', 'specs/openapi.yaml',
    '.github/workflows/validate.yml', 'scripts/ci/select-e2e.cjs']) {
    assert.deepEqual(selectSuites([file]), all, file);
  }
});
test('unrelated paths select no E2E; explicit full validation selects everything', () => {
  assert.deepEqual(selectSuites(['docs/user-guide.md', 'api/database/schema.sql']), []);
  assert.deepEqual(selectSuites([], true), all);
});
