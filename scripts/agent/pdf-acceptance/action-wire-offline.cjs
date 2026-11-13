const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

// Real wrappers, generated serializers and FetchRequestAdapter; transport is memory only.
async function actionWire(repoRoot, kind, input) {
  const root = fs.realpathSync(repoRoot), sourceRoot = path.join(root, 'pwa/src');
  const local = createRequire(path.join(root, 'pwa/package.json'));
  const ts = local('typescript'), cache = new Map(), calls = [];
  const { DateOnly } = local('@microsoft/kiota-abstractions');
  let client, adapter;
  async function memoryFetch(address, init) {
    const request = new Request(address, init), text = request.headers.get('content-type') ?? '';
    let body;
    if (text.startsWith('multipart/form-data')) {
      body = await require('./acceptance.cjs').describeBody(await request.formData());
    } else {
      const raw = await request.text(); body = raw ? JSON.parse(raw) : undefined;
    }
    if (request.method === 'GET') return new Response(JSON.stringify({recipe: input.currentSnapshot}), {status:200,headers:{'content-type':'application/json'}});
    calls.push({ method: request.method, url: request.url, body, contentType: text });
    return new Response(JSON.stringify({ data: { id: input.recipeId, version: 'acknowledged', days: [] } }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  const store = { getState: () => ({ refreshSession: () => {}, selectedFamilyMemberId: input.memberId }) };
  function load(filename) {
    filename = path.resolve(filename);
    if (!filename.startsWith(sourceRoot + path.sep)) throw Error('Offline module outside application source');
    if (!path.extname(filename)) filename = fs.existsSync(filename + '.ts') ? filename + '.ts' : path.join(filename, 'index.ts');
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} }; cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const requireActual = name => {
      if (name === './api-client' || name === '@/lib/api/api-client') return { apiClient: client, requestAdapter: adapter };
      if (name === './demo-session') return { demoFetch: memoryFetch };
      if (name.startsWith('@/store/')) return new Proxy({}, { get: () => store });
      if (name === '@/locales') return { t: (_key, fallback) => fallback };
      if (name === '@/lib/identity/cookie') return { getFamilyMemberIdCookie: () => input.memberId };
      if (name.startsWith('@/')) return load(path.join(sourceRoot, name.slice(2)));
      if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name));
      if (!name.startsWith('@microsoft/')) throw Error('Unexpected offline external module ' + name);
      return local(name);
    };
    vm.runInThisContext('(function(require,module,exports,__filename,__dirname){' + code + '\n})', { filename })(requireActual,module,module.exports,filename,path.dirname(filename));
    return module.exports;
  }
  const { FetchRequestAdapter, HttpClient } = local('@microsoft/kiota-http-fetchlibrary');
  adapter = new FetchRequestAdapter({ authenticateRequest: async () => {} }, undefined, undefined, new HttpClient(memoryFetch));
  adapter.baseUrl = 'http://localhost:3405';
  client = load(path.join(sourceRoot, 'lib/api/generated/apiClient.ts')).createApiClient(adapter);
  const api = name => load(path.join(sourceRoot, 'lib/api', name + '.ts'));
  if (kind === 'capture-pdf') await api('recipes').createPdfRecipe(new File([input.pdfBytes], input.filename, { type: 'application/pdf' }), 2, input.notes, input.memberId);
  else if (['portions-8-pdf', 'restore-portions-pdf'].includes(kind)) await api('supper-servings').saveSupperServings({ ...input.body, referenceWeekStartDate: DateOnly.parse(input.reference), days: input.body.days.map(day => ({ ...day, date: DateOnly.parse(day.date) })) });
  else if (kind === 'assign-pdf') await api('planner').assignRecipeToDay(0, 0, { id: input.recipeId, name: 'Pasta for four', image: '' }, input.reference, true);
  else if (kind === 'check-sauce-pdf') await api('schedule').useSchedule().toggleGroceryItem(0, input.body, input.reference);
  else if (['pdf-pasta-250', 'pdf-pasta-clear'].includes(kind)) {
    const drafts = load(path.join(sourceRoot, 'lib/recipes/ingredient-draft.ts'));
    const current = await api('recipes').getRecipe(input.recipeId);
    const editable = current.ingredientLines.map(drafts.ingredientDraft);
    editable[0].amount = kind === 'pdf-pasta-250' ? '250' : '';
    const prepared = drafts.prepareIngredientDrafts(editable);
    if (prepared.invalid) throw Error('Offline editor fixture is invalid');
    await api('recipes').updateRecipe(input.recipeId, { ...input.body, ingredientLines: prepared.lines });
  }
  else if (kind === 'remove-pdf') await load(path.join(sourceRoot, 'lib/planner/slotAssignment.ts')).resolveOccupiedSlot({ date: input.date, removalToken: input.removalToken }, 'drop');
  else if (kind === 'soft-delete-pdf') await api('recipes').deleteRecipe(input.recipeId);
  else throw Error('Unknown finite action');
  if (calls.length !== 1) throw Error('Expected exactly one in-memory request, never replay');
  return calls[0];
}
async function groceryWire(repoRoot, body, reference, offset = 0) {
  if (offset !== 0) throw Error('Only selected week is admitted');
  return actionWire(repoRoot, 'check-sauce-pdf', { body, reference });
}
module.exports = { actionWire, groceryWire };
