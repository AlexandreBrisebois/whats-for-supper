const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const dateAdmission = require('./date-admission.cjs');
const out = __dirname, args = process.argv.slice(2);
const sourceBytes = fs.readFileSync(path.join(out, 'fixture-source.json'));
const fixtureSource = JSON.parse(sourceBytes);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (ok, message) => { if (!ok) throw Error(message); };
const same = (a, b) => { try { assert.deepEqual(a, b); return true; } catch { return false; } };
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value) && value.replaceAll('-', '') !== '0'.repeat(32);
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const unwrap = value => value && Object.hasOwn(value, 'data') ? value.data : value;
const scalar = (n, d = '1') => ({ kind: 'scalar', value: { n, d } });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function value(name, fallback) { const index = args.indexOf(name); return index < 0 ? fallback : args[index + 1]; }
function listIdentity(week) { return { days: week.days, groceryItems: week.groceryItems, groceryState: week.groceryState, groceryExtras: week.groceryExtras }; }
function ingredientInput(row) { return Object.fromEntries(['id', 'description', 'amount', 'amountText', 'unit', 'scaling', 'package', 'shopping'].map(key => [key, row[key]])); }
function instructionInput(recipe) { return recipe.instructionSections.map(section => ({ id: section.id, name: section.name, steps: section.steps.map(step => ({ id: step.id, text: step.text })) })); }
function finiteSlots() { return ['capture-pdf', 'portions-8-pdf', 'assign-pdf', 'check-sauce-pdf', 'pdf-pasta-250', 'pdf-pasta-clear', 'remove-pdf', 'restore-portions-pdf', 'soft-delete-pdf']; }
const committed = intent => ['accepted', 'reconciled-committed'].includes(intent.outcome);
function hasUnresolvedMutation(state) { return state.intents.some(intent => intent.outcome === 'unknown' || intent.outcome === 'pending' && intent.transportIssuedAt); }
function requireNextIntent(state, kind) {
  invariant(!hasUnresolvedMutation(state), 'Uncertain mutation requires explicit read-only reconciliation, never replay');
  const slots = finiteSlots();
  invariant(state.intents.length < 9 && !state.intents.some(intent => intent.kind === kind), 'Finite mutation budget or one-use intent violated');
  invariant(state.intents.every((intent, index) => intent.kind === slots[index] && committed(intent)) && slots[state.intents.length] === kind, 'Exact nine-slot prefix differs');
}
function prefixAdmitted(state, intent) {
  try { const index = state.intents.indexOf(intent); requireNextIntent({ ...state, intents: state.intents.slice(0, index) }, intent.kind); return index === state.intents.length - 1; } catch { return false; }
}
function selectedAllowed(state, selected) { return dateAdmission.selectedAllowed(state, selected) && selected.weekStartDate === state.dateAdmission.dates[0]; }
function fixtureAuthority(state, source) {
  return source?.version === 2 && source.kind === 'pdf' && source.operationId === state.operationId && source.marker === state.marker
    && source.candidate === state.candidate && /^[a-f0-9]{40}$/.test(source.candidate ?? '') && /^sha256:[a-f0-9]{64}$/.test(source.candidateApiImageId ?? '')
    && digest(state.fixtureSourceSha256) && digest(state.renderAdmissionSha256) && digest(state.operatorSourceSha256) && digest(state.configurationSha256)
    && source.document?.multipartField === 'file' && source.document.filename === 'canonical-pasta-bilingual.pdf'
    && source.document.contentType === 'application/pdf' && source.document.bytes === 1330
    && source.document.sha256 === '20808885823da6870ff6dfd8b7408e35d0fc0de766491bdc0344b204df48916d'
    && same(state.dateAdmission?.dates, source.proposedFixtureWeeks) && source.captureMetadata?.rating === '2' && source.captureMetadata.notes === 'DV PDF fixture ' + state.marker;
}
function pdfBody(source = fixtureSource) { return { file: { name: source.document.filename, type: source.document.contentType, size: source.document.bytes, sha256: source.document.sha256 }, rating: source.captureMetadata.rating, notes: source.captureMetadata.notes }; }
function patchAllowed(body, intent) {
  const current = intent.currentSnapshot, expected = current?.ingredientLines?.map(ingredientInput), type = intent.patchPolicy?.type;
  if (!current || !body || !['pasta-250', 'pasta-clear'].includes(type) || !Array.isArray(expected) || expected.length !== 3
    || body.expectedContentRevision !== current.contentRevision || current.servings !== 4) return false;
  if (Object.keys(body).some(key => !['expectedContentRevision', 'ingredientLines', 'instructionSections', 'servings', 'name', 'description', 'cuisineType', 'mealTypes'].includes(key))) return false;
  for (const key of ['servings', 'name', 'description', 'cuisineType', 'mealTypes']) if (Object.hasOwn(body, key) && !same(body[key], current[key] ?? null)) return false;
  if (Object.hasOwn(body, 'instructionSections') && !same(body.instructionSections, instructionInput(current))) return false;
  if (!same(expected[0].unit, { text: 'g', definitionId: null }) || expected.some(row => row.package !== null)
    || expected.some(row => row.shopping?.foodId !== null || row.shopping?.mappingRevision !== null)
    || new Set(expected.map(row => row.id)).size !== 3 || !expected.every(row => uuid(row.id))) return false;
  if (!same(expected[0].amount, scalar(type === 'pasta-250' ? '200' : '250')) || expected[0].amountText !== (type === 'pasta-250' ? '200' : '250')) return false;
  expected[0].amount = type === 'pasta-250' ? scalar('250') : null; expected[0].amountText = type === 'pasta-250' ? '250' : null;
  return same(body.ingredientLines, expected);
}
function cleanupOverride(state) { return state.intents.some(intent => intent.kind === 'portions-8-pdf' && committed(intent) && intent.allowedBody?.days?.[0]?.servings === 8) ? 8 : undefined; }
function requestAllowed(method, address, body, context) {
  let url; try { url = new URL(address, context.base); } catch { return false; }
  if (['data:', 'blob:'].includes(url.protocol)) return ['GET', 'HEAD'].includes(method);
  if (url.origin !== new URL(context.base).origin || /%2f|%5c|%2e/i.test(url.pathname)) return false;
  const route = url.pathname;
  if (/^\/(?:api\/)?(?:workflows?|management|_test)(?:\/|$)/i.test(route)) return false;
  if (['GET', 'HEAD'].includes(method)) {
    if (['/sw.js', '/pdf-share.js', '/discovery', '/profile', '/profile/settings'].includes(route)) return true;
    if (!route.startsWith('/api/')) return /^\/(?:$|home(?:\/|$)|capture(?:\/|$)|planner(?:\/|$)|recipes(?:\/|$)|welcome(?:\/|$)|_next\/|icons\/|fonts\/|splash\/|favicon[.-]|apple-touch-icon\.|manifest\.|robots\.)/.test(route);
    if (['/api/stream', '/api/discovery/session', '/api/discovery/categories', '/api/feature-flags', '/api/captures/failures', '/api/goto', '/api/goto/active'].includes(route)) return true;
    if (/^\/api\/settings\/[A-Za-z0-9_.-]+$/.test(route)) return true;
    return /^\/api\/(?:family(?:\/|$)|recipes(?:\/|$)|schedule(?:\/|$)|push(?:\/|$)|demo(?:\/|$)|recovery(?:\/|$)|version$|health$|app(?:\/|$))/.test(route);
  }
  const state = context.report, source = context.fixtureSource ?? fixtureSource;
  if (context.readOnly || !state || !fixtureAuthority(state, source) || !dateAdmission.planAllowed(state) || hasUnresolvedMutation(state)
    || state.created.length > 1 || state.created.some(fixture => fixture.kind !== 'pdf')) return false;
  const intent = [...state.intents].reverse().find(item => item.outcome === 'pending' && item.method === method && item.route === route && !item.transportIssuedAt);
  if (!intent || !prefixAdmitted(state, intent)) return false;
  if (method === 'POST' && route === '/api/recipes/capture-pdf') return !url.search && intent.kind === 'capture-pdf' && state.stage === 'capture'
    && !state.created.length && same(body, pdfBody(source)) && same(body, intent.allowedBody);
  const fixture = state.created[0]; if (!fixture || !uuid(fixture.id) || !selectedAllowed(state, fixture.selected)) return false;
  const stages = { 'portions-8-pdf': 'demand', 'assign-pdf': 'demand', 'check-sauce-pdf': 'demand', 'pdf-pasta-250': 'save250', 'pdf-pasta-clear': 'clear', 'remove-pdf': 'cleanup', 'restore-portions-pdf': 'cleanup', 'soft-delete-pdf': 'cleanup' };
  if (stages[intent.kind] !== state.stage || !stageAuditAdmitted(state)) return false;
  if (method === 'PATCH' && route === `/api/recipes/${fixture.id}`) return !url.search && intent.recipeId === fixture.id && patchAllowed(body, intent);
  if (method === 'POST' && route === '/api/schedule/assign') return intent.kind === 'assign-pdf' && fixture.assignmentIntent?.outcome === 'pending'
    && url.searchParams.size === 1 && url.searchParams.get('referenceWeekStartDate') === fixture.selected.weekStartDate
    && same(body, { weekOffset: 0, dayIndex: 0, recipeId: fixture.id, requireEmpty: true }) && same(body, intent.allowedBody);
  if (method === 'PUT' && route === '/api/schedule/servings') {
    const old = intent.kind === 'portions-8-pdf' ? null : cleanupOverride(state), target = intent.kind === 'portions-8-pdf' ? 8 : fixture.selected.priorOverride;
    return !url.search && ['portions-8-pdf', 'restore-portions-pdf'].includes(intent.kind) && old !== undefined && intent.previousOverride === old
      && body?.referenceWeekStartDate === fixture.selected.weekStartDate && body.weekOffset === 0 && typeof body.expectedVersion === 'string' && body.expectedVersion.length > 0
      && same(body.days, [{ date: fixture.selected.date, servings: target }]) && same(body, intent.allowedBody);
  }
  if (method === 'PATCH' && route === '/api/schedule/0/grocery/item') {
    const row = intent.checkedRow;
    return intent.kind === 'check-sauce-pdf' && !url.username && !url.password
      && url.searchParams.size === 1 && url.searchParams.get('referenceWeekStartDate') === fixture.selected.weekStartDate
      && row && row.normalizedKey === source.ingredientNames.sauce && same(row.recipeIds, [fixture.id])
      && same(row.quantity, scalar('200')) && typeof body?.clientMutationId === 'string' && uuid(body.clientMutationId)
      && !state.intents.some(other => other !== intent && other.issuedBody?.clientMutationId === body.clientMutationId)
      && same({ ...body, clientMutationId: null }, { rowId: row.rowId, weekStartDate: fixture.selected.weekStartDate, expectedRowVersion: row.rowVersion, checked: true, clientMutationId: null });
  }
  if (method === 'DELETE' && route === `/api/schedule/day/${fixture.selected.date}/remove`) return intent.kind === 'remove-pdf' && body === undefined
    && url.searchParams.size === 1 && url.searchParams.get('expectedPlanToken') === fixture.assignmentReceipt?.removalToken;
  return method === 'DELETE' && route === `/api/recipes/${fixture.id}` && !url.search && intent.kind === 'soft-delete-pdf'
    && fixture.removalIntent?.recipeId === fixture.id && body === undefined;
}
async function describeBody(body) {
  if (!(body instanceof FormData)) return body;
  const described = {};
  for (const [key, value] of body.entries()) {
    invariant(!Object.hasOwn(described, key), 'Duplicate multipart field rejected');
    if (typeof value === 'string') { invariant(['rating', 'notes'].includes(key), 'Foreign multipart metadata'); described[key] = value; }
    else { invariant(key === 'file', 'Exactly singular PDF file required'); described.file = { name: value.name, type: value.type, size: value.size, sha256: sha(Buffer.from(await value.arrayBuffer())) }; }
  }
  return described;
}
function requireNoBlockedRequests(blocked) { invariant(blocked.length === 0, 'Unexpected blocked request requires review'); }
function requireOwnedAssignment(day, id, token) { invariant(day?.recipe?.id === id && day.removalToken && (token === undefined || day.removalToken === token), 'Assignment needs read-only reconciliation'); return day.removalToken; }
function requireReconciledCaptures(state) {
  const captures = state.intents.filter(intent => intent.kind === 'capture-pdf' && intent.outcome !== 'not-issued');
  invariant(captures.length === 1 && state.created.length === 1 && committed(captures[0]) && captures[0].recipeId === state.created[0].id && state.created[0].kind === 'pdf', 'Capture ownership unresolved; cleanup cannot succeed');
}
async function reconcileMutation(intent, read) {
  try { const observed = await read(); intent.authoritativeRead = observed; if (observed?.confirmed === true) { intent.outcome = 'reconciled-committed'; return observed.result; } } catch { intent.authoritativeRead = { confirmed: false, readFailed: true }; }
  intent.outcome = 'unknown'; throw Error(intent.kind + ' needs explicit read-only reconciliation before replay');
}
function validateImports(recipe, source = fixtureSource) {
  invariant(recipe?.isReady && recipe.name === source.recipe.name && recipe.servings === 4 && recipe.contentRevision && recipe.ingredientLines?.length === 3, 'Ordinary PDF import has not reached coherent Ready');
  assert.deepEqual(recipe.ingredients, source.recipe.recipeIngredient);
  assert.deepEqual(recipe.ingredientLines.map(row => row.amount), [scalar('200'), scalar('100'), null]);
  assert.deepEqual(recipe.ingredientLines.map(row => row.amountText), ['200', '100', null]);
  assert.deepEqual(recipe.ingredientLines.map(row => row.unit), [{ text: 'g', definitionId: null }, { text: 'ml', definitionId: null }, null]);
  invariant(new Set(recipe.ingredientLines.map(row => row.id)).size === 3 && recipe.ingredientLines.every(row => uuid(row.id) && row.package === null
    && row.shopping.foodId === null && row.shopping.mappingRevision === null && row.provenance.origin === 'source' && row.provenance.sourceRef), 'PDF source facts or IDs differ');
  assert.deepEqual(recipe.instructionSections.flatMap(section => section.steps).map(step => step.text), source.recipe.recipeInstructions.map(step => step.text));
  invariant(recipe.instructionSections.every(section => section.steps.every(step => step.bindings.length === 0)), 'Unexpected source relationships');
  invariant(recipe.rating === 2 && recipe.notes === source.captureMetadata.notes && recipe.cuisineType === 'Italian' && recipe.isVegetarian === true && same(recipe.mealTypes, ['Supper']), 'Capture metadata/categories differ');
}
function sourcePreserved(before, saved) {
  if (!saved || before.servings !== 4 || saved.servings !== 4 || before.id !== saved.id || !same(before.ingredientLines.slice(1), saved.ingredientLines.slice(1))) return false;
  const semantic = new Set(['contentRevision', 'ingredientLines', 'ingredients', 'recipeInstructions', 'instructionSections']);
  if (!same(Object.fromEntries(Object.entries(before).filter(([key]) => !semantic.has(key))), Object.fromEntries(Object.entries(saved).filter(([key]) => !semantic.has(key))))) return false;
  const facts = row => Object.fromEntries(Object.entries(ingredientInput(row)).filter(([key]) => !['amount', 'amountText'].includes(key)));
  return same(facts(before.ingredientLines[0]), facts(saved.ingredientLines[0])) && same(before.instructionSections, saved.instructionSections)
    && saved.ingredientLines[0].provenance.origin === 'human' && saved.ingredientLines[0].provenance.sourceRef === before.ingredientLines[0].provenance.sourceRef
    && ['amount', 'amountText'].every(key => saved.ingredientLines[0].provenance.protectedFields.includes(key));
}
function savedMatches(before, saved, input) { return sourcePreserved(before, saved) && saved.contentRevision !== before.contentRevision && same(saved.ingredientLines.map(ingredientInput), input?.ingredientLines); }
const factKeys = ['captureOutcome', 'canonicalContentRevision', 'sourceRevision', 'producerSettled', 'assignment', 'overrideServings', 'sauceControl', 'grocery', 'sourceEvidence'];
function validateAudit(receipt, state, phase, checkpointSha256) {
  invariant(same(Object.keys(receipt).sort(), ['version', 'phase', 'operationId', 'candidate', 'fixtureSourceSha256', 'renderAdmissionSha256', 'operatorSourceSha256', 'configurationSha256', 'recipeIds', 'facts', 'sourceReportSha256'].sort()), 'Audit envelope fields differ');
  invariant(receipt.version === 3 && receipt.phase === phase && receipt.operationId === state.operationId && receipt.candidate === state.candidate
    && receipt.fixtureSourceSha256 === state.fixtureSourceSha256 && receipt.renderAdmissionSha256 === state.renderAdmissionSha256
    && receipt.operatorSourceSha256 === state.operatorSourceSha256 && receipt.configurationSha256 === state.configurationSha256
    && receipt.sourceReportSha256 === checkpointSha256 && digest(checkpointSha256), 'Audit source/config/checkpoint binding differs');
  const facts = receipt.facts;
  invariant(facts && same(Object.keys(facts).sort(), factKeys.slice().sort()) && typeof facts.producerSettled === 'boolean'
    && ['accepted', 'unresolved', 'ambiguous'].includes(facts.captureOutcome), 'Audit facts shape differs');
  invariant(same(Object.keys(facts.sourceEvidence).sort(), ['pdfSha256', 'pages', 'rawMetadataSha256'].sort()) && facts.sourceEvidence.pdfSha256 === fixtureSource.document.sha256, 'Audit original PDF differs');
  invariant(Array.isArray(facts.sourceEvidence.pages) && facts.sourceEvidence.pages.length <= 2
    && facts.sourceEvidence.pages.every((page, index) => page.index === index && digest(page.sha256) && Number.isSafeInteger(page.bytes) && page.bytes > 0), 'Audit pages absent or malformed');
  invariant((facts.canonicalContentRevision === null || typeof facts.canonicalContentRevision === 'string' && facts.canonicalContentRevision.length > 0)
    && (facts.sourceRevision === null || typeof facts.sourceRevision === 'string' && facts.sourceRevision.length > 0)
    && (facts.sourceEvidence.rawMetadataSha256 === null || digest(facts.sourceEvidence.rawMetadataSha256)), 'Malformed nullable capture facts');
  if (phase === 'capture-reconcile') {
    invariant(!facts.producerSettled && facts.assignment === null && facts.sauceControl === null && facts.grocery === null && facts.overrideServings === null, 'Capture reconciliation cannot settle producer or mutate demand');
    if (facts.captureOutcome !== 'accepted') { invariant(same(receipt.recipeIds, []), 'Unresolved/ambiguous capture cannot claim an ID'); return receipt; }
    invariant(receipt.recipeIds.length === 1 && uuid(receipt.recipeIds[0]) && !state.baselineRecipeIds.includes(receipt.recipeIds[0]), 'Reconciled capture identity differs');
    return receipt;
  }
  invariant(facts.captureOutcome === 'accepted' && facts.producerSettled && typeof facts.canonicalContentRevision === 'string' && facts.canonicalContentRevision
    && typeof facts.sourceRevision === 'string' && facts.sourceRevision && digest(facts.sourceEvidence.rawMetadataSha256), 'Actual settled source evidence required');
  invariant(state.created.length === 1 && same(receipt.recipeIds, [state.created[0].id]), 'Audit owned membership differs');
  invariant(same(facts.sourceEvidence.pages, state.renderAdmission.pages.map(page => ({ index: page.index, sha256: page.sha256, bytes: page.bytes }))), 'Ordered original page evidence differs');
  const fixture = state.created[0];
  invariant(fixture.initialSnapshot?.ingredientLines?.every(row => row.provenance.sourceRef === facts.sourceRevision), 'Audit source revision differs from retained import');
  if (phase === 'producer-settled') invariant(facts.assignment === null && facts.overrideServings === null && facts.sauceControl === null && facts.grocery === null, 'Producer phase contains demand writes');
  else if (phase !== 'cleanup') {
    const assignment = facts.assignment;
    invariant(assignment && same(Object.keys(assignment).sort(), ['recipeId', 'date', 'occurrenceId', 'removalToken'].sort()) && assignment.recipeId === fixture.id
      && assignment.date === fixture.selected.date && uuid(assignment.occurrenceId) && /^v1\.[A-Za-z0-9_-]{43}$/.test(assignment.removalToken)
      && facts.overrideServings === 8 && facts.sauceControl?.checked === true && facts.sauceControl.baseline && typeof facts.sauceControl.baseline === 'object' && !Array.isArray(facts.sauceControl.baseline) && Object.keys(facts.sauceControl.baseline).length > 0, 'Audit dated/check ownership differs');
    invariant(fixture.assignmentReceipt && ['recipeId', 'date', 'occurrenceId'].every(key => assignment[key] === fixture.assignmentReceipt[key]), 'Audit changed assigned occurrence');
    const grocery = facts.grocery, control = facts.sauceControl;
    invariant(grocery?.weekStartDate === fixture.selected.weekStartDate && same(grocery.sauce, control.row) && control.row.normalizedKey === 'sauce' && same(control.row.recipeIds, [fixture.id])
      && same(control.row.quantity, scalar('200')) && grocery.pasta && same(grocery.pasta.recipeIds, [fixture.id]) && grocery.salt && same(grocery.salt.recipeIds, [fixture.id]), 'Audit complete owned grocery facts differ');
    invariant(same(grocery.pasta.quantity, phase === 'checked-demand' ? scalar('400') : phase === 'saved-250' ? scalar('500') : null), 'Audit expected pasta demand differs');
    const prior = state.audits?.['checked-demand']?.receipt.facts;
    if (prior) { invariant(same(control, prior.sauceControl), 'Unrelated sauce row/check/baseline changed'); invariant(same(facts.sourceEvidence, prior.sourceEvidence), 'Original source/media changed'); }
  }
  if (phase !== 'cleanup') invariant(facts.canonicalContentRevision === fixture.expectedSnapshot.contentRevision, 'Audit canonical revision changed');
  return receipt;
}
function stageAuditAdmitted(state) {
  const phase = { demand: 'producer-settled', save250: 'checked-demand', clear: 'saved-250', cleanup: 'cleared' }[state.stage];
  const audit = state.audits?.[phase];
  try { invariant(audit && digest(audit.sha256), 'Missing actual phase receipt'); validateAudit(audit.receipt, state, phase, audit.receipt.sourceReportSha256); return true; } catch { return false; }
}
let report, headers, base, reportPath, candidate, marker, operationId, expect, source, boundInputs;
function writeReportRecord(filename, state, exclusive = false) {
  const bytes = Buffer.isBuffer(state) ? state : JSON.stringify(state, null, 2) + '\n';
  const target = exclusive ? filename : filename + '.' + crypto.randomUUID() + '.pending';
  const fd = fs.openSync(target, 'wx', 0o600);
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  if (!exclusive) fs.renameSync(target, filename);
  const directory = fs.openSync(path.dirname(filename), 'r');
  try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
}
function save() { writeReportRecord(reportPath, report); }
function createReport() {
  try { writeReportRecord(reportPath, report, true); }
  catch (error) { report = undefined; throw error; }
}
function withoutLink(state) { const { latestCheckpoint, ...facts } = state; return facts; }
function checkpoint(phase) {
  report.checkpointPhase = phase;
  const filename = reportPath.replace(/\.json$/, '') + '-' + phase + '.json';
  writeReportRecord(filename, report, true);
  report.latestCheckpoint = { phase, path: fs.realpathSync(filename), sha256: sha(fs.readFileSync(filename)) }; save();
}
function loadAudit(filename, hash, state, phase) {
  invariant(path.isAbsolute(filename ?? '') && digest(hash), 'Explicit raw audit path/SHA required');
  const raw = fs.readFileSync(filename); invariant(sha(raw) === hash, 'Audit changed');
  const link = state.latestCheckpoint;
  invariant(link && path.isAbsolute(link.path) && digest(link.sha256), 'Immutable prior checkpoint required');
  const checkpointRaw = fs.readFileSync(link.path);
  invariant(sha(checkpointRaw) === link.sha256 && same(withoutLink(JSON.parse(checkpointRaw)), withoutLink(state)), 'Prior report/checkpoint changed');
  const receipt = validateAudit(JSON.parse(raw), state, phase, link.sha256);
  return { path: fs.realpathSync(filename), sha256: hash, receipt };
}
function requireRetainedAudits(state) {
  for (const [phase, entry] of Object.entries(state.audits ?? {})) {
    invariant(path.isAbsolute(entry.path ?? '') && digest(entry.sha256) && !fs.lstatSync(entry.path).isSymbolicLink(), 'Retained audit path differs');
    const bytes = fs.readFileSync(entry.path);
    invariant(sha(bytes) === entry.sha256 && same(JSON.parse(bytes), entry.receipt) && entry.receipt.phase === phase, 'Retained immutable audit changed');
  }
}
function retainAudit(state, audit) {
  const phase = audit.receipt.phase;
  invariant(!state.audits?.[phase], 'Preserve earlier audit receipt');
  (state.audits ??= {})[phase] = audit;
  if (audit.receipt.facts.assignment) {
    const fixture = state.created[0];
    (fixture.assignmentHistory ??= []).push({ ...fixture.assignmentReceipt, auditSha256: audit.sha256 });
    fixture.assignmentReceipt = audit.receipt.facts.assignment;
  }
}
function beginIntent(intent) { requireNextIntent(report, intent.kind); intent.intentId ??= crypto.randomUUID(); report.intents.push(intent); save(); }
function authorize(method, address, body) {
  if (!['GET', 'HEAD'].includes(method)) {
    dateAdmission.requireUnchanged(report);
    invariant(Date.now() < Date.parse(report.windowEndUtc) - report.restoreBufferSeconds * 1000, 'Restoration buffer reached');
  }
  invariant(requestAllowed(method, address, body, { base, report, fixtureSource: source ?? fixtureSource }), 'Private request rejected: ' + method + ' ' + new URL(address, base).pathname);
  if (!['GET', 'HEAD'].includes(method)) {
    const intent = report.intents.at(-1);
    intent.transportIssuedAt = new Date().toISOString(); intent.issuedBody = body; intent.issuedBodySha256 = sha(JSON.stringify(body ?? null)); save();
  }
}
async function call(method, route, data, allow404 = false) {
  authorize(method, base + route, await describeBody(data));
  const options = { method, headers: { ...headers }, signal: AbortSignal.timeout(30000) };
  if (data instanceof FormData) options.body = data;
  else if (data !== undefined) { options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(data); }
  const response = await fetch(base + route, options);
  if (allow404 && response.status === 404) return null;
  invariant(response.ok, 'Private HTTP failed ' + method + ' ' + route.split('?')[0] + ' ' + response.status);
  const text = await response.text(); return text ? JSON.parse(text) : null;
}
const readRecipe = async id => (await call('GET', '/api/recipes/' + id, undefined, true))?.recipe;
const week = async reference => unwrap(await call('GET', '/api/schedule?weekOffset=0&referenceWeekStartDate=' + reference));
const portions = async reference => unwrap(await call('GET', '/api/schedule/servings?weekOffset=0&referenceWeekStartDate=' + reference));
async function until(label, read, timeout = 240000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const observed = await read(); if (observed) return observed; await delay(1000); }
  throw Error('Timed out waiting for ' + label);
}
async function mutate(kind, method, route, data, reconcile, details = {}) {
  const intent = { ...details, kind, method, route: route.split('?')[0], allowedBody: await describeBody(data), at: new Date().toISOString(), outcome: 'pending' };
  beginIntent(intent);
  try { const result = await call(method, route, data); intent.outcome = 'accepted'; save(); return result; }
  catch (error) {
    if (!intent.transportIssuedAt) { intent.outcome = 'not-issued'; save(); throw error; }
    intent.outcome = 'unknown'; save();
    try { const result = await reconcileMutation(intent, reconcile); save(); return result; } catch (unresolved) { save(); throw unresolved; }
  }
}
async function pageFacts(id) {
  const pages = [];
  for (const index of [0, 1]) {
    authorize('GET', `${base}/api/recipes/${id}/original/${index}`);
    const response = await fetch(`${base}/api/recipes/${id}/original/${index}`, { headers, signal: AbortSignal.timeout(30000) });
    if (!response.ok || !response.headers.get('content-type')?.includes('image/png')) return null;
    const bytes = Buffer.from(await response.arrayBuffer()); pages.push({ index, sha256: sha(bytes), bytes: bytes.length });
  }
  return pages;
}
async function readyCaptureCandidates() {
  const pendingCounts = unwrap(await call('GET', '/api/recipes/import-status')), ids = [], pages = [];
  for (let page = 1; ; page++) {
    invariant(page <= 10000, 'Ready inventory pagination bound exceeded');
    const result = await call('GET', `/api/recipes?page=${page}&limit=100`);
    invariant(Array.isArray(result.recipes), 'Ready inventory shape differs');
    for (const row of result.recipes) {
      if (report.baselineRecipeIds.includes(row.id)) continue;
      const recipe = await readRecipe(row.id);
      if (recipe?.notes !== source.captureMetadata.notes || recipe.rating !== 2 || recipe.sourceUrl || recipe.addedBy !== report.captureIntent.memberId) continue;
      const observed = await pageFacts(row.id);
      if (same(observed, report.renderAdmission.pages.map(item => ({ index: item.index, sha256: item.sha256, bytes: item.bytes })))) { ids.push(row.id); pages.push(observed); }
    }
    if (result.recipes.length < 100) break;
  }
  return { confirmed: ids.length === 1, result: ids.length === 1 ? { id: ids[0] } : null, readyCandidateIds: ids, pages, pendingCounts,
    limit: 'Ordinary pending summary has counts only; unresolved pending identity requires independent DB capture-reconcile receipt' };
}
function captureBodyAdapterEnabled(stage, readOnly) { return stage === 'capture' && readOnly === false; }
function installCaptureBodyAdapter({ origin }) {
  const NativeRequest = globalThis.Request, nativeFetch = globalThis.fetch;
  globalThis.fetch = function(input, init) {
    let url;
    try { url = new URL(input instanceof NativeRequest ? input.url : String(input), globalThis.location.href); }
    catch { return nativeFetch.call(globalThis, input, init); }
    const method = String(init?.method ?? (input instanceof NativeRequest ? input.method : 'GET')).toUpperCase();
    if (globalThis.location.origin !== origin || url.origin !== origin || url.pathname !== '/api/recipes/capture-pdf' || url.search
      || method !== 'POST' || !(init?.body instanceof FormData)) return nativeFetch.call(globalThis, input, init);
    return (async () => {
      // Snapshot actual UI metadata once. Never reconstruct FormData, expected
      // fixture bytes, headers, credentials or member state after serialization.
      const request = new NativeRequest(input, init), signal = request.signal;
      if (signal.aborted) throw signal.reason;
      let onAbort;
      const aborted = new Promise((_, reject) => { onAbort = () => reject(signal.reason); signal.addEventListener('abort', onAbort, { once: true }); });
      try {
        const bytes = await Promise.race([request.clone().arrayBuffer(), aborted]);
        if (signal.aborted) throw signal.reason;
        // Native construction with an init resets referrer metadata; explicitly
        // retain it from THAT Request, never reread init/member state. Its generated
        // multipart boundary and other metadata carry through. Node still decides.
        return await nativeFetch.call(globalThis, new NativeRequest(request,
          { body: bytes, referrer: request.referrer, referrerPolicy: request.referrerPolicy }));
      } finally { signal.removeEventListener('abort', onAbort); }
    })();
  };
}
async function authenticate(browser, family, member, secret, locale, readOnly = false) {
  const context = await browser.newContext({ baseURL: base, viewport: { width: 390, height: 844 }, timezoneId: 'America/Toronto', serviceWorkers: 'block' });
  const stamp = String(Date.now()), token = stamp + '.' + crypto.createHmac('sha256', secret).update(stamp).digest('base64url');
  await context.addCookies([{ name: 'h_access', value: token, url: base }, { name: 'x-family-member-id', value: member, url: base }]);
  await context.addInitScript(({ family, member, locale }) => {
    localStorage.setItem('locale', locale); localStorage.setItem('family-storage', JSON.stringify({ state: { selectedFamilyMemberId: member, familyMembers: family, _hasHydrated: true, hasLoaded: true }, version: 0 }));
  }, { family, member, locale });
  if (captureBodyAdapterEnabled(report.stage, readOnly)) await context.addInitScript(installCaptureBodyAdapter, { origin: base });
  await context.route('**/*', async route => {
    const request = route.request();
    const diagnostic = { phase: 'read-body' };
    try {
      let body;
      if (!['GET', 'HEAD'].includes(request.method())) {
        const type = request.headers()['content-type'] ?? '';
        if (type.includes('application/json')) body = request.postDataJSON();
        else if (type.includes('multipart/form-data')) {
          const raw = request.postDataBuffer();
          diagnostic.multipart = { present: raw !== null, bytes: raw?.length ?? null, sha256: raw === null ? null : sha(raw) };
          diagnostic.phase = 'parse-multipart';
          const form = await new Response(raw, { headers: { 'Content-Type': type } }).formData();
          diagnostic.fields = [...form.keys()].slice(0, 16).map(key => key.slice(0, 64));
          diagnostic.phase = 'describe-body'; body = await describeBody(form);
          diagnostic.file = body.file ? { bytes: body.file.size, sha256: body.file.sha256,
            nameMatches: body.file.name === fixtureSource.document.filename, typeMatches: body.file.type === fixtureSource.document.contentType } : null;
          diagnostic.metadata = { ratingMatches: body.rating === fixtureSource.captureMetadata.rating, notesMatches: body.notes === fixtureSource.captureMetadata.notes };
        }
        else throw Error('Unsupported write body');
      }
      diagnostic.phase = 'authorize';
      if (readOnly) invariant(requestAllowed(request.method(), request.url(), body, { base, readOnly: true }), 'Read-only browser write blocked');
      else authorize(request.method(), request.url(), body);
      diagnostic.phase = 'continue'; await route.continue();
    } catch (error) {
      const known = ['Failed to parse body as FormData.', 'Duplicate multipart field rejected', 'Foreign multipart metadata', 'Exactly singular PDF file required', 'Unsupported write body', 'Restoration buffer reached', 'Read-only browser write blocked'];
      const reason = known.includes(error.message) || error.message?.startsWith('Private request rejected: ') ? error.message : 'Local boundary validation failed';
      (report.blockedRequests ??= []).push({ method: request.method(), path: new URL(request.url()).pathname, ...diagnostic,
        error: { name: String(error.name).slice(0, 64), code: String(error.code ?? '').slice(0, 64), reason: reason.slice(0, 256) } }); save(); await route.abort('blockedbyclient');
    }
  });
  return context;
}
async function openDetail(page, fixture) {
  await page.goto(`/planner?weekOffset=0&referenceWeekStartDate=${fixture.selected.weekStartDate}`);
  await page.getByTestId(`day-card-${fixture.selected.index}`).getByTestId('edit-recipe-button').click();
  await expect(page.getByTestId('recipe-detail-name')).toHaveText(source.recipe.name);
}
async function observeDemand(fixture, amount) {
  return until('owned PDF demand', async () => {
    const current = await week(fixture.selected.weekStartDate), rows = current.groceryItems;
    if (rows.length !== 3 || current.groceryExtras.length) return null;
    const byName = name => rows.filter(row => row.normalizedKey === name);
    const groups = ['pasta', 'sauce', 'salt to taste'].map(byName);
    if (groups.some(group => group.length !== 1 || !same(group[0].recipeIds, [fixture.id]))) return null;
    if (!same(groups[0][0].quantity, amount === null ? null : scalar(amount)) || !same(groups[1][0].quantity, scalar('200')) || groups[2][0].quantity !== null) return null;
    invariant(current.weekStartDate === fixture.selected.weekStartDate, 'Demand week changed');
    return { week: current, pasta: groups[0][0], sauce: groups[1][0], salt: groups[2][0] };
  });
}
async function readyOwnedCapture() {
  const fixture = report.created[0];
  const recipe = await until('owned PDF Ready', async () => { const current = await readRecipe(fixture.id); return current?.isReady ? current : null; });
  validateImports(recipe, source); invariant(!report.baselineRecipeIds.includes(fixture.id), 'Original recipe cannot be adopted');
  assert.deepEqual(await pageFacts(fixture.id), report.renderAdmission.pages.map(item => ({ index: item.index, sha256: item.sha256, bytes: item.bytes })));
  fixture.initialSnapshot = recipe; fixture.expectedSnapshot = recipe; report.complete = false; checkpoint('capture');
}
async function captureStage(browser, family, member, secret, selected) {
  report.captureIntent = { intentId: crypto.randomUUID(), memberId: member, startedAtUtc: new Date().toISOString(), observedAtUtc: null,
    notes: source.captureMetadata.notes, pdfSha256: source.document.sha256, documentBytes: source.document.bytes };
  const intent = { intentId: report.captureIntent.intentId, kind: 'capture-pdf', method: 'POST', route: '/api/recipes/capture-pdf', allowedBody: pdfBody(source), at: report.captureIntent.startedAtUtc, outcome: 'pending' };
  beginIntent(intent);
  const context = await authenticate(browser, family, member, secret, 'en');
  try {
    const page = await context.newPage(); await page.goto('/capture');
    await page.getByTestId('import-recipe-file-input').setInputFiles(path.join(out, source.document.filename));
    await expect(page.getByTestId('pdf-confirmation')).toBeVisible(); await page.getByTestId('pdf-rating-2').click(); await page.getByTestId('pdf-notes').fill(source.captureMetadata.notes);
    const pending = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === intent.route); pending.catch(() => {});
    let captured;
    try {
      await page.getByTestId('pdf-save').click(); const response = await pending;
      intent.responseEvidence = { status: response.status(), observedAtUtc: new Date().toISOString() }; save();
      invariant(response.status() === 202, 'Ordinary PDF capture did not accept202');
      const responseBody = await response.text(); intent.responseEvidence.bodySha256 = sha(responseBody); intent.responseEvidence.body = JSON.parse(responseBody); save();
      captured = unwrap(intent.responseEvidence.body); invariant(uuid(captured.id), 'Capture returned no exact ID'); intent.outcome = 'accepted';
    } catch (error) {
      if (!intent.transportIssuedAt) { intent.outcome = 'not-issued'; throw error; }
      intent.outcome = 'unknown'; save(); captured = await reconcileMutation(intent, readyCaptureCandidates);
    } finally { report.captureIntent.observedAtUtc = new Date().toISOString(); save(); }
    invariant(!report.baselineRecipeIds.includes(captured.id), 'Capture returned an original ID'); intent.recipeId = captured.id;
    report.created.push({ id: captured.id, kind: 'pdf', selected }); save(); await readyOwnedCapture();
  } finally { await context.close(); }
}
async function demandStage(browser, family, member, secret) {
  const fixture = report.created[0], selected = fixture.selected;
  assert.deepEqual(await readRecipe(fixture.id), fixture.expectedSnapshot);
  const existing = await week(selected.weekStartDate); invariant(!existing.days.some(day => day.recipe || day.nonCooking || day.preparation) && !existing.groceryItems.length && !existing.groceryExtras.length, 'Owned future week changed');
  const current = await portions(selected.weekStartDate), day = current.days.find(item => item.date === selected.date);
  invariant(day?.editable && day.overrideServings === null, 'Dated override changed'); fixture.portionsIntent = { priorOverride: null }; save();
  await mutate('portions-8-pdf', 'PUT', '/api/schedule/servings', { referenceWeekStartDate: selected.weekStartDate, weekOffset: 0, expectedVersion: current.version, days: [{ date: selected.date, servings: 8 }] },
    async () => ({ confirmed: (await portions(selected.weekStartDate)).days.find(item => item.date === selected.date)?.overrideServings === 8 }), { previousOverride: null });
  fixture.currentTarget = 8; fixture.assignmentIntent = { outcome: 'pending' }; save();
  await mutate('assign-pdf', 'POST', '/api/schedule/assign?referenceWeekStartDate=' + selected.weekStartDate,
    { weekOffset: 0, dayIndex: 0, recipeId: fixture.id, requireEmpty: true }, async () => ({ confirmed: false }));
  fixture.assignmentIntent.outcome = 'accepted'; save();
  const assigned = (await week(selected.weekStartDate)).days[0];
  fixture.assignmentReceipt = { recipeId: fixture.id, date: selected.date, occurrenceId: assigned.occurrenceId, removalToken: requireOwnedAssignment(assigned, fixture.id) };
  invariant(uuid(fixture.assignmentReceipt.occurrenceId), 'Assignment missing occurrence identity'); save();
  const demand = await observeDemand(fixture, '400');
  invariant(demand.week.groceryState[demand.sauce.rowId] !== true, 'Unowned preexisting check');
  const context = await authenticate(browser, family, member, secret, 'en');
  try {
    const page = await context.newPage(); await page.goto(`/planner?weekOffset=0&referenceWeekStartDate=${selected.weekStartDate}`); await page.getByTestId('grocery-tab').click();
    for (const header of await page.locator('[data-testid^="aisle-header-"][aria-expanded="false"]').all()) await header.click();
    const intent = { kind: 'check-sauce-pdf', method: 'PATCH', route: '/api/schedule/0/grocery/item', checkedRow: demand.sauce, at: new Date().toISOString(), outcome: 'pending' };
    beginIntent(intent);
    const pending = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname === intent.route); pending.catch(() => {});
    try {
      await page.locator(`[data-testid="grocery-item-checkbox"][data-row-id="${demand.sauce.rowId}"]`).click(); const response = await pending;
      invariant(response.status() === 200, 'Sauce check not acknowledged'); intent.acknowledgement = unwrap(await response.json());
      invariant(intent.acknowledgement.rowId === demand.sauce.rowId && intent.acknowledgement.checked === true && intent.acknowledgement.weekStartDate === selected.weekStartDate, 'Sauce check acknowledgement differs');
      intent.outcome = 'accepted';
    } catch (error) { intent.outcome = intent.transportIssuedAt ? 'unknown' : 'not-issued'; save(); throw error; }
    const checked = await observeDemand(fixture, '400'); invariant(checked.week.groceryState[checked.sauce.rowId] === true, 'Sauce check not current');
    fixture.checkedDemand = checked; save(); checkpoint('demand');
  } finally { await context.close(); }
}
async function saveStage(browser, family, member, secret, clear) {
  const fixture = report.created[0], before = await readRecipe(fixture.id); assert.deepEqual(before, fixture.expectedSnapshot);
  const current = await observeDemand(fixture, clear ? '500' : '400'), control = report.audits['checked-demand'].receipt.facts.sauceControl;
  assert.deepEqual(current.sauce, control.row); invariant(current.week.groceryState[current.sauce.rowId] === true, 'Unrelated check changed');
  const context = await authenticate(browser, family, member, secret, 'en');
  try {
    const page = await context.newPage(); await openDetail(page, fixture); await page.getByTestId('action-gear-menu').click(); await page.getByTestId('action-edit-recipe').click();
    await page.getByTestId('recipe-edit-amount-0').fill(clear ? '' : '250');
    const intent = { kind: clear ? 'pdf-pasta-clear' : 'pdf-pasta-250', recipeId: fixture.id, method: 'PATCH', route: '/api/recipes/' + fixture.id,
      currentSnapshot: before, patchPolicy: { type: clear ? 'pasta-clear' : 'pasta-250' }, at: new Date().toISOString(), outcome: 'pending' };
    beginIntent(intent);
    const pending = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname === intent.route); pending.catch(() => {});
    let saved;
    try {
      await page.getByTestId('recipe-save-edits').click(); const response = await pending; invariant(response.status() === 200, 'Ordinary editor Save failed'); saved = (await response.json()).recipe;
      invariant(savedMatches(before, saved, intent.issuedBody), 'Saved facts/source differ'); intent.outcome = 'accepted';
    } catch (error) {
      if (!intent.transportIssuedAt) { intent.outcome = 'not-issued'; save(); throw error; }
      intent.outcome = 'unknown'; save(); const reconciled = await reconcileMutation(intent, async () => { const observed = await readRecipe(fixture.id); return { confirmed: savedMatches(before, observed, intent.issuedBody), result: { recipe: observed } }; }); saved = reconciled.recipe;
    }
    fixture.expectedSnapshot = saved; intent.contentRevision = saved.contentRevision; save();
    const demand = await observeDemand(fixture, clear ? null : '500'); assert.deepEqual(demand.sauce, control.row); invariant(demand.week.groceryState[demand.sauce.rowId] === true, 'Unrelated sauce check changed');
    const projection = unwrap(await call('GET', `/api/recipes/${fixture.id}/ingredient-projection?supperDate=${fixture.selected.date}&context=assigned&occurrenceId=${fixture.assignmentReceipt.occurrenceId}`));
    invariant(projection.contentRevision === saved.contentRevision && projection.targetServings === 8 && projection.baseServings === 4, 'Dated projection changed');
    if (!clear) invariant(projection.lines[0].displayText === '500 g pasta', 'Assigned exact500g missing');
    else invariant(projection.lines[0].quantity === null && ['unquantified', 'unresolved'].includes(projection.lines[0].status), 'Human clear revived a numeric amount');
    fixture[clear ? 'final' : 'saved250'] = { snapshot: saved, demand, projection }; report.complete = clear; save(); checkpoint(clear ? 'clear' : 'save250');
  } finally { await context.close(); }
}
function hasCompletedRemoval(state, fixture) {
  return state.intents.some(intent => intent.kind === 'remove-' + fixture.kind && intent.method === 'DELETE'
    && intent.route === `/api/schedule/day/${fixture.selected.date}/remove` && intent.transportIssuedAt
    && ['accepted', 'reconciled-committed'].includes(intent.outcome));
}
async function requireCleanupAssignmentReceipts(state) {
  const checkpoint = 'Assignment ownership needs explicit read-only reconciliation before cleanup';
  const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
  const validId = value => typeof value === 'string' && uuid.test(value) && value.replaceAll('-', '') !== '0'.repeat(32);
  const assignments = state.intents.filter(intent => intent.kind.startsWith('assign-') || intent.route === '/api/schedule/assign');
  invariant(assignments.every(intent => state.created.some(fixture => intent.kind === 'assign-' + fixture.kind)), checkpoint);
  for (const fixture of state.created) {
    const selected = fixture.selected, receipt = fixture.assignmentReceipt;
    const attempts = assignments.filter(intent => intent.kind === 'assign-' + fixture.kind);
    const issued = attempts.some(intent => intent.transportIssuedAt || ['accepted', 'reconciled-committed'].includes(intent.outcome));
    const claimed = ['accepted', 'reconciled-committed'].includes(fixture.assignmentIntent?.outcome);
    const needsReceipt = issued || claimed || Boolean(receipt);
    invariant(validId(fixture.id) && dateAdmission.selectedAllowed(state, selected) && attempts.length <= 1, checkpoint);
    if (needsReceipt) {
      invariant(attempts.length === 1 && attempts[0].transportIssuedAt && attempts[0].method === 'POST'
        && attempts[0].route === '/api/schedule/assign'
        && same(attempts[0].allowedBody, { recipeId: fixture.id, weekOffset: 0, dayIndex: selected.index, requireEmpty: true })
        && receipt?.recipeId === fixture.id && receipt.date === selected.date && validId(receipt.occurrenceId)
        && typeof receipt.removalToken === 'string' && /^v1\.[A-Za-z0-9_-]{43}$/.test(receipt.removalToken), checkpoint);
    }
    const current = await week(selected.weekStartDate), day = current.days.find(row => row.date === selected.date);
    invariant(current.weekStartDate === selected.weekStartDate && day && !day.nonCooking && !day.preparation, checkpoint);
    if (!needsReceipt) invariant(!day.recipe, checkpoint);
    else if (day.recipe) invariant(day.recipe.id === receipt.recipeId && day.occurrenceId === receipt.occurrenceId
      && day.removalToken === receipt.removalToken, checkpoint);
    else invariant(hasCompletedRemoval(state, fixture), checkpoint);
  }
}
async function cleanup() {
  requireReconciledCaptures(report);
  invariant(!hasUnresolvedMutation(report), 'Resolve prior mutation through explicit read-only reconciliation before cleanup');
  await requireCleanupAssignmentReceipts(report);
  report.cleaning = true; save();
  for (const fixture of report.created) {
    const selected = fixture.selected;
    if (fixture.assignmentReceipt) {
      const current = await week(selected.weekStartDate), day = current.days.find(row => row.date === selected.date);
      invariant(day && !day.nonCooking && !day.preparation, 'Assignment ownership needs explicit read-only reconciliation before cleanup');
      if (day?.recipe) {
        invariant(day.occurrenceId === fixture.assignmentReceipt.occurrenceId, 'Assignment ownership needs explicit read-only reconciliation before cleanup');
        const token = requireOwnedAssignment(day, fixture.id, fixture.assignmentReceipt.removalToken);
        await mutate('remove-' + fixture.kind, 'DELETE', `/api/schedule/day/${selected.date}/remove?expectedPlanToken=${encodeURIComponent(token)}`, undefined,
          async () => ({ confirmed: !(await week(selected.weekStartDate)).days.find(row => row.date === selected.date)?.recipe }));
      } else invariant(hasCompletedRemoval(report, fixture), 'Assignment ownership needs explicit read-only reconciliation before cleanup');
    }
    if (fixture.portionsIntent) {
      const current = await portions(selected.weekStartDate), day = current.days.find(row => row.date === selected.date);
      const previous = cleanupOverride(report, fixture);
      invariant(day && (day.overrideServings === previous || day.overrideServings === selected.priorOverride), 'Owned cleanup portions changed');
      if (day.overrideServings !== selected.priorOverride) await mutate('restore-portions-' + fixture.kind, 'PUT', '/api/schedule/servings',
        { referenceWeekStartDate: selected.weekStartDate, weekOffset: 0, expectedVersion: current.version, days: [{ date: selected.date, servings: selected.priorOverride }] },
        async () => ({ confirmed: (await portions(selected.weekStartDate)).days.find(row => row.date === selected.date)?.overrideServings === selected.priorOverride }), { previousOverride: previous });
    }
    if (!fixture.removed) {
      const current = await readRecipe(fixture.id);
      if (current) {
        invariant(current.isReady && same(current, fixture.expectedSnapshot), 'Owned recipe changed before deletion');
        fixture.removalIntent = { recipeId: fixture.id }; save();
        await mutate('soft-delete-' + fixture.kind, 'DELETE', `/api/recipes/${fixture.id}`, undefined,
          async () => ({ confirmed: !(await readRecipe(fixture.id)) }));
      } else invariant(fixture.removalIntent?.recipeId === fixture.id && report.intents.some(intent => intent.kind === 'soft-delete-' + fixture.kind
        && ['accepted', 'reconciled-committed'].includes(intent.outcome)), 'Missing recipe requires an accepted owned deletion');
      fixture.removed = true; save();
    }
    const settled = await until('owned week empty after cleanup', async () => {
      const current = await week(selected.weekStartDate);
      return !current.days.some(day => day.recipe || day.nonCooking || day.preparation) && !current.groceryItems.length
        && !Object.values(current.groceryState ?? {}).some(Boolean) && !current.groceryExtras.length ? current : null;
    });
    fixture.cleanupReadback = { week: listIdentity(settled), portions: await portions(selected.weekStartDate) }; save();
  }
  assert.deepEqual(listIdentity(await week(report.currentReference)), report.currentListBefore);
  report.cleanup = { passed: true, at: new Date().toISOString() }; save();
}
function readBound(name) { const bytes = fs.readFileSync(path.join(out, name)); return { bytes, sha256: sha(bytes), value: JSON.parse(bytes) }; }
function validateRender(source, sourceHash, admission, result, pageBytes) {
  invariant(/^[a-f0-9]{40}$/.test(source.candidate ?? '') && /^sha256:[a-f0-9]{64}$/.test(source.candidateApiImageId ?? '') && uuid(source.operationId), 'Render candidate/image remains unbound');
  invariant(admission?.version === 1 && admission.approved === true && admission.operationId === source.operationId && admission.candidate === source.candidate
    && admission.candidateApiImageId === source.candidateApiImageId && admission.fixtureSourceSha256 === sourceHash && admission.documentSha256 === source.document.sha256
    && admission.renderResultSha256 === sha(result.bytes), 'Reviewed exact-image render admission missing');
  const actual = result.value;
  invariant(actual.version === 1 && Number.isFinite(Date.parse(actual.renderedAtUtc))
    && same(Object.keys(actual.runtime ?? {}).sort(), ['framework', 'os', 'architecture'].sort())
    && Object.values(actual.runtime).every(value => typeof value === 'string' && value.length > 0)
    && Object.entries(actual).every(([key, value]) => same(admission[key], value)), 'Render admission must retain exact actual runtime/result facts');
  invariant(actual.candidate === source.candidate && actual.candidateApiImageId === source.candidateApiImageId && actual.documentSha256 === source.document.sha256
    && same(actual.defaultProfile, admission.defaultProfile) && same(actual.defaultProfile, { dpi: 200, maxDimension: 4096, maxPixels: 16777216, maxOutputBytes: 67108864, maxResidentBytes: 536870912, timeoutSeconds: 60 })
    && same(actual.pages, admission.pages) && actual.runtime && digest(actual.assemblySha256) && digest(actual.runtimeConfigSha256) && digest(actual.depsSha256)
    && actual.nativeAssets && Object.keys(actual.nativeAssets).length > 0 && Object.values(actual.nativeAssets).every(digest), 'Render source/profile/runtime differs');
  invariant(Array.isArray(admission.pages) && admission.pages.length === 2 && same(admission.pages.map(page => page.index), [0, 1]), 'Exactly two ordered PDF pages required');
  for (const [index, bytes] of pageBytes.entries()) {
    const page = admission.pages[index];
    invariant(page.sha256 === sha(bytes) && page.bytes === bytes.length && page.width > 0 && page.height > 0, 'Rendered page bytes/order/dimensions differ');
    invariant(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'Rendered page is not PNG');
  }
  invariant(admission.pages[0].sha256 !== admission.pages[1].sha256, 'Distinct original pages required');
}
function loadInputs(plan, selectedBase, reviewed, source = fixtureSource) {
  const manifest = readBound('operator-source-manifest.json'), configuration = readBound('runtime-config-allowlist.json'), baseline = readBound('locked-baseline-recipe-ids.json');
  for (const item of [manifest.value, configuration.value, baseline.value]) invariant(item.version === 1 && item.operationId === plan.operationId && item.candidate === plan.candidate, 'Bound input identity differs');
  invariant(Array.isArray(manifest.value.files) && manifest.value.files.length > 0 && new Set(manifest.value.files.map(file => file.name)).size === manifest.value.files.length, 'Static source manifest invalid');
  for (const file of manifest.value.files) {
    const closedPage = ['pdf-render-pages/0.png', 'pdf-render-pages/1.png'].includes(file.name);
    const location = path.join(out, file.name);
    invariant((file.name === path.basename(file.name) || closedPage) && !['operator-source-manifest.json', 'runtime-config-allowlist.json', 'locked-baseline-recipe-ids.json'].includes(file.name)
      && digest(file.sha256) && !fs.lstatSync(location).isSymbolicLink() && fs.lstatSync(location).isFile()
      && (!closedPage || !fs.lstatSync(path.join(out, 'pdf-render-pages')).isSymbolicLink())
      && fs.realpathSync(location).startsWith(fs.realpathSync(out) + path.sep) && sha(fs.readFileSync(location)) === file.sha256, 'Static source changed');
    invariant(reviewed.fileHashes?.[file.name] === file.sha256, 'Independent review did not bind static source ' + file.name);
  }
  for (const name of ['acceptance.cjs', 'acceptance-selftest.cjs', 'date-admission.cjs', 'settled-readonly.cjs', 'public-smoke.cjs', 'server.py', 'provider-selftest.py', 'audit-workflow-readonly.py', 'audit-workflow-selftest.py', 'fixture-source.json', 'canonical-pasta-bilingual.pdf', 'pdf-render-result.json', 'pdf-render-admission.json', 'pdf-render-pages/0.png', 'pdf-render-pages/1.png']) invariant(manifest.value.files.some(file => file.name === name), 'Required static helper absent');
  const config = configuration.value;
  invariant([config.apiImageId, config.pwaImageId, config.migrationImageId].every(id => /^sha256:[a-f0-9]{64}$/.test(id ?? ''))
    && config.apiImageId === source.candidateApiImageId && config.calendarTimeZone === 'UTC' && config.embeddingDimensions === 1536 && config.geminiKeyMode === 'empty'
    && config.privateOrigin === selectedBase && digest(config.dataRootIdentitySha256), 'Candidate configuration is unbound');
  const endpoint = new URL(config.providerEndpoint);
  invariant(endpoint.hostname === 'host.docker.internal' && Number(endpoint.port) === plan.providerPort, 'Closed provider configuration differs');
  invariant(Array.isArray(baseline.value.recipeIds) && baseline.value.recipeIds.every(uuid) && new Set(baseline.value.recipeIds).size === baseline.value.recipeIds.length
    && digest(baseline.value.backupManifestSha256) && digest(baseline.value.backupSnapshotSha256) && Number.isFinite(Date.parse(baseline.value.baselineCapturedAtUtc)), 'Locked baseline membership invalid');
  const admission = readBound('pdf-render-admission.json'), render = readBound('pdf-render-result.json');
  invariant(source.renderAdmissionFile === 'pdf-render-admission.json' && sha(fs.readFileSync(path.join(out, source.document.filename))) === source.document.sha256, 'Immutable original PDF differs');
  validateRender(source, sha(sourceBytes), admission.value, render, [0, 1].map(index => fs.readFileSync(path.join(out, 'pdf-render-pages', index + '.png'))));
  return { manifest, configuration, baseline, admission };
}
function validateRuntimeConfiguration(api, config) {
  const env = Object.fromEntries(api.Config.Env.map(entry => { const at = entry.indexOf('='); return [entry.slice(0, at), entry.slice(at + 1)]; }));
  invariant(api.State.Running && api.Image === config.apiImageId && env.WFS_VERSION === config.candidate && env.Calendar__TimeZone === config.calendarTimeZone
    && env.GEMINI_API_KEY === '' && env.GEMINI_ENDPOINT === config.providerEndpoint && Number(env.EMBEDDING_DIMENSIONS ?? '1536') === config.embeddingDimensions
    && env.DATA_ROOT === '/data' && !env.RECIPES_ROOT && !env.RecipesRoot && env.HEARTH_SECRET, 'Private actual image/environment differs');
  const mounts = api.Mounts.filter(mount => mount.Destination === '/data');
  invariant(mounts.length === 1 && mounts[0].RW === true, 'Exactly one owned writable data root required');
  const mount = mounts[0], identity = { destination: mount.Destination, name: mount.Name ?? null, readWrite: mount.RW, source: mount.Source, type: mount.Type };
  invariant(sha(JSON.stringify(identity)) === config.dataRootIdentitySha256, 'Actual data root differs from independently bound configuration');
  return env;
}
function requireSourceReview(filename, hash, plan) {
  invariant(path.isAbsolute(filename ?? '') && digest(hash), 'Explicit independent source review/SHA required');
  const bytes = fs.readFileSync(filename); invariant(sha(bytes) === hash, 'Independent source review changed');
  const review = JSON.parse(bytes);
  invariant(review.status === 'passed' && review.approved === true && review.independent === true && review.operationId === plan.operationId && review.candidate === plan.candidate, 'Source approval remains unbound');
  return { ...review, path: fs.realpathSync(filename), sha256: hash };
}
function freezeCaptureUncertain(state, source, nowUtc) {
  const intent = state.intents?.[0], capture = state.captureIntent, now = Date.parse(nowUtc);
  invariant(fixtureAuthority(state, source) && dateAdmission.planAllowed(state) && state.intents.length === 1 && state.created.length === 0
    && !state.complete && !state.cleanup && !state.captureUncertainty && intent?.kind === 'capture-pdf' && intent.method === 'POST' && intent.route === '/api/recipes/capture-pdf'
    && uuid(capture?.intentId) && capture.intentId === intent.intentId && uuid(capture.memberId) && !intent.recipeId
    && same(intent.allowedBody, pdfBody(source)) && capture.notes === source.captureMetadata.notes && capture.pdfSha256 === source.document.sha256 && capture.documentBytes === 1330, 'Only the unowned original capture slot can freeze');
  const issued = Date.parse(intent.transportIssuedAt), started = Date.parse(capture.startedAtUtc), window = state.finiteWindow;
  invariant(Number.isFinite(now) && Number.isFinite(issued) && Number.isFinite(started) && issued >= started && issued <= now
    && Date.parse(window?.startUtc) <= started && now < Date.parse(window?.endUtc) && state.windowEndUtc === window.endUtc, 'Durable issued checkpoint/time window required; planned time is not transport evidence');
  const response = intent.responseEvidence;
  invariant(!response || response.status === 202 && Number.isFinite(Date.parse(response.observedAtUtc)) && Date.parse(response.observedAtUtc) >= issued && Date.parse(response.observedAtUtc) <= now
    && (response.bodySha256 === undefined || digest(response.bodySha256)), 'Contradictory or definitive non202 HTTP outcome cannot freeze');
  invariant(intent.outcome === 'pending' || intent.outcome === 'accepted' && response?.status === 202, 'Completed/unknown/rejected outcomes cannot be reclassified');
  const next = structuredClone(state);
  next.intents[0].outcome = 'unknown'; next.captureIntent.observedAtUtc = nowUtc; next.stage = 'capture-unknown';
  next.captureUncertainty = { reason: intent.outcome === 'pending' ? 'pending-issued' : 'observed-202-unowned', frozenAtUtc: nowUtc, priorOutcome: intent.outcome,
    observationMeaning: 'Local freeze observation only; neither planned nor issued timestamps prove an HTTP request or server commit', originalHead: null, http202Evidence: null };
  return next;
}
function freezeHead(previous, previousBytes) {
  const next = freezeCaptureUncertain(previous, source, new Date().toISOString()), prefix = reportPath.replace(/\.json$/, '');
  const original = prefix + '-capture-interrupted-head.json', unknown = prefix + '-capture-unknown.json', http = prefix + '-capture-http-202.json';
  invariant(!fs.existsSync(original) && !fs.existsSync(unknown) && !fs.existsSync(http), 'Preserve existing interruption/checkpoint evidence');
  writeReportRecord(original, previousBytes, true);
  next.captureUncertainty.originalHead = { path: fs.realpathSync(original), sha256: sha(previousBytes) };
  if (previous.intents[0].responseEvidence?.status === 202) {
    writeReportRecord(http, { operationId: previous.operationId, candidate: previous.candidate, captureIntentId: previous.captureIntent.intentId,
      sourceReportSha256: sha(previousBytes), responseEvidence: previous.intents[0].responseEvidence }, true);
    next.captureUncertainty.http202Evidence = { path: fs.realpathSync(http), sha256: sha(fs.readFileSync(http)) };
  }
  next.checkpointPhase = 'capture-unknown'; writeReportRecord(unknown, next, true);
  invariant(sha(fs.readFileSync(reportPath)) === sha(previousBytes), 'Interrupted head changed concurrently; do not overwrite it');
  report = next; report.latestCheckpoint = { phase: 'capture-unknown', path: fs.realpathSync(unknown), sha256: sha(fs.readFileSync(unknown)) }; save();
}
function adoptCapture(state, audit) {
  invariant(audit.receipt.phase === 'capture-reconcile' && audit.receipt.facts.captureOutcome === 'accepted' && audit.receipt.recipeIds.length === 1 && state.created.length === 0, 'Pending capture remains unresolved/ambiguous');
  const intent = state.intents[0], id = audit.receipt.recipeIds[0];
  invariant(state.intents.length === 1 && intent.kind === 'capture-pdf' && intent.outcome === 'unknown' && intent.transportIssuedAt
    && intent.intentId === state.captureIntent.intentId && uuid(id) && !state.baselineRecipeIds.includes(id), 'Unknown capture membership differs');
  intent.recipeId = id; intent.outcome = 'reconciled-committed'; intent.reconciliation = audit;
  state.created.push({ id, kind: 'pdf', selected: state.selected });
  retainAudit(state, audit);
}
async function unchangedOriginalViews() {
  assert.deepEqual(listIdentity(await week(report.currentReference)), report.currentListBefore, 'Unrelated current list changed');
  assert.deepEqual(listIdentity(await week(report.dateAdmission.dates[1])), report.unusedWeekBefore, 'Unused admitted week changed');
  requireNoBlockedRequests(report.blockedRequests ?? []);
}
async function main() {
  invariant(process.version === 'v26.12.0', 'Pinned Node26.12.0 required');
  const plan = readBound('operation-preparation.json').value; source = fixtureSource;
  candidate = value('--candidate'); operationId = plan.operationId; marker = source.marker;
  invariant(/^[a-f0-9]{40}$/.test(candidate ?? '') && candidate === plan.candidate && plan.transportReviewed === true && source.candidate === candidate
    && source.operationId === operationId && source.marker === plan.fixtureMarker && source.candidateApiImageId, 'Unadmitted candidate/source/transport');
  base = value('--base-url'); const origin = new URL(base);
  invariant(base === origin.origin && origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname)
    && Number(origin.port) === plan.privateProxyPort && plan.privateProxyPort !== plan.providerPort && ![3000].includes(plan.privateProxyPort) && args.includes('--public-closed'), 'Exact private base without trailing slash required');
  const stages = ['capture', 'demand', 'save250', 'clear', 'cleanup', 'capture-ready'];
  const stage = value('--stage'); const modes = ['--run', '--cleanup', '--reconcile-capture', '--read-owned', '--freeze-capture-uncertain'].filter(mode => args.includes(mode));
  invariant(modes.length === 1 && !args.includes('--resume-owned'), 'Exactly one explicit bounded mode required');
  const mode = modes[0]; invariant(mode === '--reconcile-capture' ? stage === undefined || stage === 'capture-reconcile' : mode === '--freeze-capture-uncertain' ? stage === undefined || stage === 'capture-unknown' : stages.includes(stage), 'Explicit PDF stage required');
  invariant(mode === '--cleanup' ? stage === 'cleanup' : mode === '--read-owned' ? stage === 'capture-ready' : mode !== '--run' || ['capture', 'demand', 'save250', 'clear'].includes(stage), 'Mode/stage mismatch');
  const review = requireSourceReview(value('--source-review'), value('--source-review-sha256'), plan);
  boundInputs = loadInputs(plan, base, review);
  const policy = readBound('pending-intents-reviewed.json').value, deployment = readBound('deployment.json').value, preflight = readBound('dv-preflight.json').value;
  invariant(policy.approved === true && policy.operationId === operationId && policy.candidate === candidate && Number.isFinite(Date.parse(policy.windowEndUtc)) && Number.isSafeInteger(policy.restoreBufferSeconds) && policy.restoreBufferSeconds >= 60
    && Date.now() < Date.parse(policy.windowEndUtc) - policy.restoreBufferSeconds * 1000, 'Finite private window not admitted');
  reportPath = value('--report', path.join(out, 'acceptance.json')); invariant(path.isAbsolute(reportPath) && reportPath.endsWith('.json'), 'Absolute report path required');
  const starting = mode === '--run' && stage === 'capture';
  const previousBytes = starting ? null : fs.readFileSync(reportPath), previous = previousBytes && JSON.parse(previousBytes);
  if (starting) invariant(!fs.existsSync(reportPath), 'Preserve previous report; capture is never replayed');
  else invariant(digest(value('--report-sha256')) && sha(previousBytes) === value('--report-sha256'), 'Exact prior mutable head SHA required');
  const dates = starting ? value('--fixture-weeks', '').split(',') : previous.dateAdmission.dates;
  const admission = dateAdmission.load({ dates, referenceWeekStartDate: dates[0], receiptPath: starting ? value('--date-admission') : previous.dateAdmission.receiptPath,
    receiptSha256: starting ? value('--date-admission-sha256') : previous.dateAdmission.receiptSha256, candidate, operationId, marker, deployment, preflight }, starting ? Date.now() : Date.parse(previous.dateAdmission.verifiedAtUtc));
  const identities = { candidate, operationId, marker, fixtureSourceSha256: sha(sourceBytes), renderAdmissionSha256: boundInputs.admission.sha256,
    operatorSourceSha256: boundInputs.manifest.sha256, configurationSha256: boundInputs.configuration.sha256, baselineReceiptSha256: boundInputs.baseline.sha256 };
  invariant(fixtureAuthority({ ...identities, dateAdmission: admission }, source), 'Fixture source/document remains unadmitted');
  let admittedAudit;
  if (previous) {
    for (const [key, expected] of Object.entries(identities)) invariant(previous[key] === expected, 'Prior report identity/source changed');
    assert.deepEqual(previous.dateAdmission, admission); requireRetainedAudits(previous);
    const phase = mode === '--reconcile-capture' ? 'capture-reconcile' : { demand: 'producer-settled', save250: 'checked-demand', clear: 'saved-250', cleanup: 'cleared' }[stage];
    if (phase) {
      if (stage === 'cleanup' && previous.cleaning && previous.audits?.cleared) {
        const kept = previous.audits.cleared; invariant(value('--audit-receipt') === kept.path && value('--audit-receipt-sha256') === kept.sha256 && sha(fs.readFileSync(kept.path)) === kept.sha256, 'Cleanup resume requires unchanged retained cleared audit');
        validateAudit(kept.receipt, previous, 'cleared', kept.receipt.sourceReportSha256);
      } else admittedAudit = loadAudit(value('--audit-receipt'), value('--audit-receipt-sha256'), previous, phase);
    }
    if (mode === '--reconcile-capture') invariant(previous.intents.length === 1 && previous.intents[0].outcome === 'unknown', 'Only unknown capture may adopt an independently observed ID');
    else if (mode !== '--freeze-capture-uncertain' && stage !== 'cleanup') invariant(!hasUnresolvedMutation(previous) && previous.intents.length === { demand: 1, save250: 4, clear: 5, 'capture-ready': 1 }[stage]
      && previous.intents.every((intent, index) => intent.kind === finiteSlots()[index] && committed(intent)), 'Partial/accepted stage cannot be blindly resumed or repeated');
  }
  if (mode === '--freeze-capture-uncertain') { freezeHead(previous, previousBytes); console.log(JSON.stringify({ stage: 'capture-unknown', metadataOnly: true, report: reportPath, checkpoint: report.latestCheckpoint })); return; }
  const container = value('--api-container'), member = value('--member-id'); invariant(/^[a-f0-9]{64}$/.test(container ?? '') && uuid(member), 'Exact immutable API container/actor required');
  const api = JSON.parse(execFileSync('docker', ['inspect', container], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))[0];
  invariant(api.Id === container, 'Immutable inspected API ID changed');
  const env = validateRuntimeConfiguration(api, boundInputs.configuration.value);
  headers = { 'X-Hearth-Secret': env.HEARTH_SECRET, 'X-Family-Member-Id': member };
  const family = unwrap(await call('GET', '/api/family')); invariant(family.some(item => item.id === member && item.cookingViewMode === 'step-by-step'), 'Captured actor/current StepByStep preference differs');
  if (previous) { report = previous; if (admittedAudit && mode !== '--reconcile-capture') retainAudit(report, admittedAudit); report.stage = mode === '--reconcile-capture' ? 'capture-reconcile' : stage; }
  else {
    const currentReference = admission.currentWeekStartDate, currentListBefore = listIdentity(await week(currentReference)), unusedWeekBefore = listIdentity(await week(dates[1]));
    const selectedWeek = await week(dates[0]), serving = await portions(dates[0]);
    invariant(!selectedWeek.locked && selectedWeek.days.length === 7 && !selectedWeek.days.some(day => day.recipe || day.nonCooking || day.preparation)
      && !selectedWeek.groceryItems.length && !selectedWeek.groceryExtras.length && serving.days[0]?.date === dates[0] && serving.days[0].editable && serving.days[0].overrideServings === null, 'First admitted week is no longer empty');
    const selected = { weekStartDate: dates[0], date: dates[0], index: 0, priorOverride: null, beforeWeek: selectedWeek };
    report = { ...identities, sourceReview: { path: review.path, sha256: review.sha256 }, stage: 'capture', dateAdmission: admission,
      windowEndUtc: policy.windowEndUtc, restoreBufferSeconds: policy.restoreBufferSeconds,
      finiteWindow: { startUtc: deployment.maintenanceStartedAtUtc, endUtc: policy.windowEndUtc, restoreBufferSeconds: policy.restoreBufferSeconds },
      renderAdmission: boundInputs.admission.value, baselineRecipeIds: boundInputs.baseline.value.recipeIds, currentReference, currentListBefore, unusedWeekBefore, selected,
      created: [], intents: [], audits: {}, complete: false, realProviderQualified: false, semanticSearchQualified: false, syntheticEmbedding: true, startedAt: new Date().toISOString() };
    invariant(Number.isFinite(Date.parse(report.finiteWindow.startUtc)) && Date.parse(report.startedAt) >= Date.parse(report.finiteWindow.startUtc), 'Private window start unbound');
    createReport();
  }
  if (mode === '--reconcile-capture') { adoptCapture(report, admittedAudit); save(); checkpoint('capture-adopted'); return; }
  if (mode === '--read-owned') { await readyOwnedCapture(); await unchangedOriginalViews(); return; }
  if (stage === 'cleanup') { await cleanup(); await unchangedOriginalViews(); checkpoint('cleanup'); invariant(report.intents.length === 9, 'Exact nine-intent cleanup differs'); return; }
  const repoRoot = value('--repo-root'); invariant(repoRoot && path.isAbsolute(repoRoot), 'Explicit private worktree required');
  const playwright = createRequire(path.join(repoRoot, 'pwa/package.json'))('@playwright/test'); expect = playwright.expect.configure({ timeout: 20000 });
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    if (stage === 'capture') await captureStage(browser, family, member, env.HEARTH_SECRET, report.selected);
    if (stage === 'demand') await demandStage(browser, family, member, env.HEARTH_SECRET);
    if (stage === 'save250' || stage === 'clear') await saveStage(browser, family, member, env.HEARTH_SECRET, stage === 'clear');
    await unchangedOriginalViews();
  } finally { await browser.close(); }
  console.log(JSON.stringify({ stage, status: 'passed', report: reportPath, checkpoint: report.latestCheckpoint }));
}
module.exports = { requestAllowed, patchAllowed, scalar, ingredientInput, instructionInput, validateImports, sourcePreserved, savedMatches,
  hasUnresolvedMutation, reconcileMutation, requireReconciledCaptures, requireOwnedAssignment, requireNoBlockedRequests, listIdentity,
  finiteSlots, requireNextIntent, writeReportRecord, cleanupOverride, requireSourceReview, describeBody, fixtureAuthority, validateAudit, stageAuditAdmitted,
  adoptCapture, validateRender, withoutLink, loadAudit, loadInputs, requireRetainedAudits, freezeCaptureUncertain, validateRuntimeConfiguration,
  captureBodyAdapterEnabled, installCaptureBodyAdapter };
if (require.main === module) main().catch(error => {
  if (report) {
    report.failure = { message: error.message, at: new Date().toISOString() }; save();
    if (report.stage === 'capture' && report.intents[0]?.outcome === 'unknown' && !report.created.length) {
      try { checkpoint('capture-unknown'); } catch { /* Retain an existing immutable unknown checkpoint. */ }
    }
  }
  console.error(JSON.stringify({ acceptance: 'failed', message: error.message, report: reportPath })); process.exitCode = 1;
});
