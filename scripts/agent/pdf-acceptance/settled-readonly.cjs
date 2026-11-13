const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const guard = require('./acceptance.cjs');
const out = __dirname, args = process.argv.slice(2);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (ok, message) => { if (!ok) throw Error(message); };
function value(name) { const at = args.indexOf(name); return at < 0 ? undefined : args[at + 1]; }
function readOnlyAdmission(report, receipt, reportHash) {
  invariant(report.complete && !report.cleanup && report.created.length === 1 && report.intents.length === 6
    && report.intents.every((intent, index) => intent.kind === guard.finiteSlots()[index] && ['accepted', 'reconciled-committed'].includes(intent.outcome)), 'Completed six-intent cleared stage required');
  guard.validateAudit(receipt, report, 'cleared', reportHash);
  return report.created[0];
}
async function main() {
  invariant(process.version === 'v26.12.0', 'Pinned Node26.12.0 required');
  const plan = JSON.parse(fs.readFileSync(path.join(out, 'operation-preparation.json'))), bytes = fs.readFileSync(value('--report')), report = JSON.parse(bytes);
  invariant(sha(bytes) === value('--report-sha256') && report.candidate === value('--candidate') && report.candidate === plan.candidate
    && report.operationId === value('--operation') && report.operationId === plan.operationId && /^[a-f0-9]{40}$/.test(report.candidate), 'Exact report/candidate/operation required');
  const base = value('--base-url'), url = new URL(base);
  invariant(base === url.origin && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname) && Number(url.port) === plan.privateProxyPort && args.includes('--public-closed'), 'Exact private base required');
  const review = guard.requireSourceReview(value('--source-review'), value('--source-review-sha256'), plan), inputs = guard.loadInputs(plan, base, review);
  invariant(inputs.manifest.sha256 === report.operatorSourceSha256 && inputs.configuration.sha256 === report.configurationSha256
    && inputs.baseline.sha256 === report.baselineReceiptSha256 && inputs.admission.sha256 === report.renderAdmissionSha256, 'Read-only source/context changed');
  const auditRaw = fs.readFileSync(value('--audit-receipt')); invariant(sha(auditRaw) === value('--audit-receipt-sha256'), 'Actual cleared audit changed');
  const checkpoint = report.latestCheckpoint; invariant(checkpoint && sha(fs.readFileSync(checkpoint.path)) === checkpoint.sha256, 'Immutable cleared checkpoint changed');
  assert.deepEqual(guard.withoutLink(JSON.parse(fs.readFileSync(checkpoint.path))), guard.withoutLink(report));
  const receipt = JSON.parse(auditRaw), fixture = readOnlyAdmission(report, receipt, checkpoint.sha256);
  const output = path.join(out, 'settled-readonly.json'); invariant(!fs.existsSync(output), 'Preserve prior settled receipt');
  const container = value('--api-container'); invariant(/^[a-f0-9]{64}$/.test(container ?? ''), 'Immutable API ID required');
  const api = JSON.parse(execFileSync('docker', ['inspect', container], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))[0];
  invariant(api.Id === container, 'Actual API ID changed');
  const env = guard.validateRuntimeConfiguration(api, inputs.configuration.value);
  const member = report.captureIntent.memberId, headers = { 'X-Hearth-Secret': env.HEARTH_SECRET, 'X-Family-Member-Id': member };
  async function get(route, binary = false) {
    invariant(guard.requestAllowed('GET', base + route, undefined, { base, readOnly: true }), 'Read route rejected');
    const response = await fetch(base + route, { headers, signal: AbortSignal.timeout(30000) }); invariant(response.ok, 'Read failed');
    return binary ? Buffer.from(await response.arrayBuffer()) : response.json();
  }
  const family = (await get('/api/family')).data; invariant(family.some(item => item.id === member && item.cookingViewMode === 'step-by-step'), 'Captured actor/view changed');
  for (const page of report.renderAdmission.pages) { const raw = await get(`/api/recipes/${fixture.id}/original/${page.index}`, true); invariant(sha(raw) === page.sha256 && raw.length === page.bytes, 'Ordered original page differs'); }
  const before = { recipe: await get('/api/recipes/' + fixture.id), week: await get('/api/schedule?weekOffset=0&referenceWeekStartDate=' + fixture.selected.weekStartDate) };
  assert.deepEqual(before.recipe.recipe, fixture.expectedSnapshot);
  const { chromium, expect: originalExpect } = createRequire(path.join(value('--repo-root'), 'pwa/package.json'))('@playwright/test'), expect = originalExpect.configure({ timeout: 20000 });
  const browser = await chromium.launch({ headless: true }), blocked = [], observations = [];
  try {
    for (const locale of ['en', 'fr']) {
      const context = await browser.newContext({ baseURL: base, viewport: { width: 390, height: 844 }, timezoneId: 'America/Toronto', serviceWorkers: 'block' });
      try {
        const stamp = String(Date.now()), token = stamp + '.' + crypto.createHmac('sha256', env.HEARTH_SECRET).update(stamp).digest('base64url');
        await context.addCookies([{ name: 'h_access', value: token, url: base }, { name: 'x-family-member-id', value: member, url: base }]);
        await context.addInitScript(({ locale, family, member }) => { localStorage.setItem('locale', locale); localStorage.setItem('family-storage', JSON.stringify({ state: { selectedFamilyMemberId: member, familyMembers: family, _hasHydrated: true, hasLoaded: true }, version: 0 })); }, { locale, family, member });
        await context.route('**/*', route => { const request = route.request(); if (guard.requestAllowed(request.method(), request.url(), undefined, { base, readOnly: true })) return route.continue(); blocked.push({ method: request.method(), path: new URL(request.url()).pathname }); return route.abort('blockedbyclient'); });
        const page = await context.newPage(); await page.goto(`/planner?weekOffset=0&referenceWeekStartDate=${fixture.selected.weekStartDate}`); await page.getByTestId('grocery-tab').click();
        await expect(page.getByTestId('reorder-group')).toHaveCount(0);
        await expect(page.getByTestId('grocery-checklist').locator('..')).toHaveCSS('opacity', '1');
        for (const header of await page.locator('[data-testid^="aisle-header-"][aria-expanded="false"]').all()) await header.click();
        const sauce = page.locator(`[data-testid="grocery-item-checkbox"][data-row-id="${receipt.facts.sauceControl.row.rowId}"]`);
        await expect(sauce).toHaveAttribute('aria-checked', 'true'); await expect(sauce).toContainText('sauce');
        const pasta = page.locator(`[data-testid="grocery-item-checkbox"][data-row-id="${receipt.facts.grocery.pasta.rowId}"]`); await expect(pasta).toContainText('pasta');
        await expect(pasta.getByTestId('grocery-item-quantity-hint')).toHaveCount(0);
        const screenshot = path.join(out, 'pdf-' + locale + '-settled-grocery.png'); fs.writeFileSync(screenshot, await page.screenshot({ animations: 'allow' }), { flag: 'wx', mode: 0o600 });
        await page.getByTestId('planner-tab').click();
        const day = page.getByTestId(`day-card-${fixture.selected.index}`); await expect(day).toBeVisible(); await day.getByTestId('edit-recipe-button').click();
        await expect(page.getByTestId('recipe-detail-name')).toHaveText('Pasta for four'); await page.getByTestId('action-view-original').click();
        const originals = [];
        for (const original of report.renderAdmission.pages) {
          if (original.index > 0) await page.keyboard.press('ArrowRight');
          const image = page.getByRole('img', { name: 'Recipe photo ' + (original.index + 1), exact: true });
          await image.scrollIntoViewIfNeeded(); await expect(image).toBeVisible(); await expect(image).toHaveAttribute('src', `/api/recipes/${fixture.id}/original/${original.index}`);
          if (original.index > 0) await expect(page.getByRole('img', { name: 'Recipe photo ' + original.index, exact: true })).toHaveCount(0);
          await expect.poll(() => image.evaluate(element => ({ width: element.naturalWidth, height: element.naturalHeight }))).toEqual({ width: original.width, height: original.height });
          const file = path.join(out, 'pdf-' + locale + '-original-' + original.index + '.png'); fs.writeFileSync(file, await page.screenshot({ animations: 'allow' }), { flag: 'wx', mode: 0o600 });
          originals.push({ index: original.index, sha256: original.sha256, screenshot: file, screenshotSha256: sha(fs.readFileSync(file)) });
        }
        observations.push({ locale, recipeId: fixture.id, screenshot, screenshotSha256: sha(fs.readFileSync(screenshot)), originals });
      } finally { await context.close(); }
    }
    guard.requireNoBlockedRequests(blocked);
    assert.deepEqual({ recipe: await get('/api/recipes/' + fixture.id), week: await get('/api/schedule?weekOffset=0&referenceWeekStartDate=' + fixture.selected.weekStartDate) }, before, 'Reading changed recipe/list/check facts');
    fs.writeFileSync(output, JSON.stringify({ version: 3, status: 'passed', readOnly: true, candidate: report.candidate, operationId: report.operationId,
      sourceReportSha256: sha(bytes), auditReceiptSha256: sha(auditRaw), observations, blocked }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  } finally { await browser.close(); }
}
module.exports = { readOnlyAdmission };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
