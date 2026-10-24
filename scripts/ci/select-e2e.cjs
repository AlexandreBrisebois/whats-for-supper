// Conservative capability selection: only known route/test boundaries narrow a run.
const { suites } = require('./e2e-suites.cjs');
const all = Object.keys(suites);
const routes = {
  home: all,
  planner: ['planning', 'tonight', 'household'],
  recipes: all,
  capture: ['household', 'recipes'],
  discovery: ['recipes', 'tonight'],
  settings: ['household'],
  profile: ['household'],
};

function selectSuites(files, full = false) {
  if (full) return all;
  const selected = new Set();
  for (const file of files) {
    if (!file) continue;
    if (file === '.nvmrc' || file === 'specs/openapi.yaml' ||
        file.startsWith('.github/workflows/') || file.startsWith('scripts/ci/')) return all;
    if (!file.startsWith('pwa/')) continue;
    const spec = /^pwa\/e2e\/(.+)\.spec\.ts$/.exec(file);
    if (spec) {
      const owner = all.find(name => suites[name].includes(spec[1]));
      // Live qualification is separate, but uncertain impact keeps the broad gate.
      if (!owner) return all;
      selected.add(owner);
      continue;
    }
    const route = /^pwa\/src\/app\/\(app\)\/([^/]+)\/(?:page|loading|error)(?:\.test)?\.tsx$/.exec(file);
    if (!route || !routes[route[1]]) return all;
    for (const suite of routes[route[1]]) selected.add(suite);
  }
  return all.filter(name => selected.has(name));
}
module.exports = { selectSuites };
if (require.main === module) {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { input += chunk; });
  process.stdin.on('end', () => console.log(JSON.stringify(selectSuites(input.trim().split('\n'), process.env.FULL_VALIDATION === 'true'))));
}
