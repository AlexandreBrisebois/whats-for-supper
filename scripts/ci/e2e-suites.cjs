const fs = require('node:fs');
const path = require('node:path');

const suites = {
  tonight: [
    'action-pivot', 'home-goto', 'home-race', 'home-recipe', 'cook-mode-steps',
    'cooking-instruction-recovery', 'meal-outcome-close', 'tomorrow-push',
    'tonight-replacement-recovery',
  ],
  planning: [
    'deployment-calendar', 'grocery', 'plan-later', 'planner', 'planner-full-cycle',
    'planner-non-cooking-days', 'planner-reconciliation',
    'planner-smart-defaults-week-offset', 'planner-voting-identity',
  ],
  recipes: [
    'browse-all-stack', 'browse-stack', 'stack-gestures', 'discovery', 'goto-layout', 'recipe-hero-actions',
    'recipe-notes-recovery', 'recipe-original-viewer', 'recipe-recovery',
    'recipe-share', 'recipes', 'search-hardening', 'search-invalidation-recovery',
    'sharing-fidelity',
  ],
  household: [
    'auth-flow', 'welcome-demo', 'bug-condition-exploration', 'capture-flow', 'demo-mode',
    'demo-management-access', 'demo-reset',
    'identity-persistence', 'install-identity', 'member-creation', 'onboarding',
    'online-recovery', 'pdf-capture', 'profile', 'recipe-import-reporting',
    'settings', 'telemetry-retirement', 'url-capture-recovery', 'utility-flows',
  ],
};

// Live-service qualification is explicitly excluded from mocked PR suites.
// Its dedicated environment/configuration remains unchanged.
const live = inventory().filter(name => name.endsWith('-live.spec.ts'))
  .map(name => name.slice(0, -'.spec.ts'.length));

function validateInventory(files) {
  const assigned = [...Object.values(suites).flat(), ...live].map(n => `${n}.spec.ts`);
  const duplicates = assigned.filter((name, i) => assigned.indexOf(name) !== i);
  const missing = files.filter(name => !assigned.includes(name));
  const stale = assigned.filter(name => !files.includes(name));
  if (duplicates.length || missing.length || stale.length) {
    throw new Error(`E2E suite inventory: duplicates=${duplicates}; unassigned=${missing}; stale=${stale}`);
  }
}

function selectSuite(name, files) {
  validateInventory(files);
  if (!Object.hasOwn(suites, name)) throw new Error(`Unknown E2E suite: ${name}`);
  return suites[name].map(n => `**/${n}.spec.ts`);
}

function inventory() {
  return fs.readdirSync(path.resolve(__dirname, '../../pwa/e2e'))
    .filter(name => name.endsWith('.spec.ts'));
}

module.exports = { suites, live, selectSuite, validateInventory, inventory };
if (require.main === module) {
  validateInventory(inventory());
  console.log('E2E inventory is complete and disjoint:', Object.keys(suites).join(', '));
}
