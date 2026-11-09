import { qualifyPreparedCorrection } from './prepared-correction';
import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { generateSecretToken } from './auth-utils';

test.skip(
  !process.env.PREPARED_SUPPER_API_URL && !process.env.COOKING_PREPARED_CONTEXT,
  'Requires isolated real preparation API/PostgreSQL.'
);
test.use({
  timezoneId: 'Asia/Tokyo',
  viewport: { width: 390, height: 844 },
  reducedMotion: 'reduce',
});
test.describe.configure({ mode: 'default' });
const reference = '2026-10-12';
const friday = '2026-10-16';
const api = () => process.env.PREPARED_SUPPER_API_URL!;
const headers = () => ({ 'X-Hearth-Secret': process.env.HEARTH_SECRET! });
async function read(request: APIRequestContext, path: string) {
  const response = await request.get(api() + path, { headers: headers() });
  expect(response.ok()).toBe(true);
  return response.json();
}
async function control(request: APIRequestContext, name: string) {
  const response = await request.post(`${api()}/_test/prepared/${name}`, { headers: headers() });
  expect(response.ok()).toBe(true);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
const persisted = (request: APIRequestContext) => read(request, '/_test/prepared/persisted');
const schedule = async (request: APIRequestContext) =>
  (await read(request, `/api/schedule?referenceWeekStartDate=${reference}`)).data;
async function authenticate(page: Page, request: APIRequestContext, baseURL: string) {
  const member = (await read(request, '/api/family')).data[0];
  await page.context().addCookies([
    {
      name: 'h_access',
      value: await generateSecretToken(process.env.HEARTH_SECRET!),
      url: baseURL,
    },
    { name: 'x-family-member-id', value: member.id, url: baseURL },
  ]);
  await page.addInitScript((member) => {
    localStorage.setItem('locale', 'en');
    localStorage.setItem(
      'family-storage',
      JSON.stringify({
        state: { selectedFamilyMemberId: member.id, familyMembers: [member], hasLoaded: true },
        version: 0,
      })
    );
    const events = { connected: 0, weeks: [] as { raw: string; data: any }[] };
    (window as any).__preparedEvents = events;
    const Original = window.EventSource;
    window.EventSource = class extends Original {
      constructor(url: string | URL, options?: EventSourceInit) {
        super(url, options);
        this.addEventListener('connected', () => events.connected++);
        this.addEventListener('week_updated', (event) => {
          const raw = (event as MessageEvent).data;
          events.weeks.push({ raw, data: JSON.parse(raw) });
        });
      }
    };
  }, member);
  await page.goto(`/planner?weekOffset=0&referenceWeekStartDate=${reference}`);
  await expect(page.getByTestId('day-card-4')).toContainText('Friday pasta');
  await expect
    .poll(() => page.evaluate(() => (window as any).__preparedEvents.connected))
    .toBeGreaterThan(0);
}
async function openCooking(page: Page) {
  await page.getByTestId('day-card-4').getByTestId('edit-recipe-button').click();
  await expect(page.getByTestId('recipe-detail-sheet')).toContainText('600');
  await page.getByTestId('action-cooks-mode').click();
  await expect(page.getByTestId('cooking-portion-context')).toContainText('6 portions');
  await expect(page.getByTestId('cooks-mode-overlay')).toContainText('600');
  await page.getByTestId('ingredient-toggle').first().click();
  await page.getByTestId('cooks-mode-step-next').click();
  await expect(page.getByRole('button', { name: 'Mark recipe as cooked' })).toBeVisible();
}
async function finish(page: Page) {
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' &&
      new URL(r.url()).pathname === `/api/schedule/day/${friday}/prepare`
  );
  await page.getByRole('button', { name: 'Mark recipe as cooked' }).click();
  return response;
}

test('generated prepare persists Friday receipt, actual Tuesday history, raw SSE and mounted independent display; ordinary backup retains browser receipt', async ({
  page,
  browser,
  request,
  baseURL,
}, info) => {
  test.setTimeout(120_000);
  await control(request, 'reset');
  await authenticate(page, request, baseURL!);
  const context = await browser.newContext({
    baseURL,
    timezoneId: 'Asia/Tokyo',
    viewport: { width: 390, height: 844 },
  });
  const observer = await context.newPage();
  try {
    await authenticate(observer, request, baseURL!);
    const mountedDocument = await observer.evaluate(() => {
      (window as any).__mountedDocument = crypto.randomUUID();
      return (window as any).__mountedDocument;
    });
    const before = await persisted(request);
    const beforeHttp = await schedule(request);
    await openCooking(page);
    const response = await finish(page);
    expect(response.status()).toBe(200);
    const sent = response.request().postDataJSON();
    const receipt = (await response.json()).data;
    expect(sent).toMatchObject({
      expectedOccurrenceId: beforeHttp.days[4].occurrenceId,
      recipeId: beforeHttp.days[4].recipe.id,
    });
    expect(receipt).toMatchObject({
      occurrenceId: sent.expectedOccurrenceId,
      recipeId: sent.recipeId,
      supperDate: friday,
      preparation: {
        preparedOn: '2026-10-13',
        preparedAtUtc: '2026-10-13T12:00:00+00:00',
        servings: 6,
        originalServings: 2,
        portionContext: 'dated',
        planToken: sent.expectedPlanToken,
        servingVersion: sent.expectedServingVersion,
      },
    });
    await expect(page.getByTestId('cooks-mode-overlay')).toHaveCount(0);
    await expect(observer.getByTestId('day-card-4')).toContainText('Already prepared');
    await expect(observer.getByTestId('day-card-4')).toContainText('Tuesday');
    expect(await observer.evaluate(() => (window as any).__mountedDocument)).toBe(mountedDocument);
    for (const target of [page, observer]) {
      await expect(target.getByTestId('day-card-1').getByTestId('preparation-status')).toHaveCount(
        0
      );
      await expect(target.getByTestId('day-card-2').getByTestId('preparation-status')).toHaveCount(
        0
      );
    }
    const db = await persisted(request);
    expect(db.writes).toHaveLength(1);
    expect(db.occurrences.slice(0, 2)).toEqual(before.occurrences.slice(0, 2));
    expect(db.occurrences[2]).toMatchObject({
      id: sent.expectedOccurrenceId,
      date: friday,
      status: 2,
      preparedOn: '2026-10-13',
      preparedServings: 6,
      preparedOriginalServings: 2,
      preparationPlanToken: sent.expectedPlanToken,
      preparationServingVersion: sent.expectedServingVersion,
    });
    expect(db.recipes.find((x: any) => x.id === sent.recipeId).lastCookedDate).toBe(
      '2026-10-13T12:00:00+00:00'
    );
    expect(db.recipes.find((x: any) => x.name === 'Tuesday soup')).toEqual(
      before.recipes.find((x: any) => x.name === 'Tuesday soup')
    );
    const http = await schedule(request);
    expect(http.days[1]).toEqual(beforeHttp.days[1]);
    expect(http.days[2]).toEqual(beforeHttp.days[2]);
    await expect
      .poll(async () =>
        observer.evaluate(() =>
          (window as any).__preparedEvents.weeks.some(
            (e: any) => e.data.schedule.days[4].preparation?.servings === 6
          )
        )
      )
      .toBe(true);
    const transport = await observer.evaluate(() => (window as any).__preparedEvents);
    const event = transport.weeks.find(
      (e: any) => e.data.schedule.days[4].preparation?.servings === 6
    );
    expect(event.raw).toContain('"preparation":{"preparedOn"');
    expect(event.data.schedule.days[4].preparation).toEqual(receipt.preparation);
    expect(event.raw).not.toMatch(
      /"(Preparation|PreparedOn|PreparedAtUtc|Servings|OriginalServings|PlanToken|ServingVersion)":/
    );
    await control(request, 'default');
    const projection = await read(
      request,
      `/api/recipes/${sent.recipeId}/ingredient-projection?supperDate=${friday}&context=assigned&occurrenceId=${sent.expectedOccurrenceId}`
    );
    expect(projection).toMatchObject({
      targetServings: 6,
      editable: false,
      lines: [expect.objectContaining({ quantity: 600 })],
    });
    await observer.getByTestId('day-card-4').getByTestId('edit-recipe-button').click();
    await expect(observer.getByTestId('recipe-detail-sheet')).toContainText('600');
    await observer.getByTestId('action-cooks-mode').click();
    await expect(observer.getByTestId('cooking-portion-context')).toContainText('6 portions');
    await observer.getByTestId('cooks-mode-step-next').click();
    await expect(observer.getByRole('button', { name: 'Mark recipe as cooked' })).toHaveCount(0);
    await observer.screenshot({
      path: info.outputPath('prepared-reading.png'),
      animations: 'disabled',
    });
    const preparedReading = await observer.getByTestId('cooks-mode-overlay').innerText();
    await observer.getByTestId('close-cooks-mode').click();
    await observer.getByTestId('action-close-sheet').click();
    await observer.getByTestId('at-the-table-mode').click();
    await expect(observer.getByTestId('portion-input-2026-10-16')).toBeDisabled();
    await expect(observer.getByTestId('portion-input-2026-10-16')).toHaveValue('6');
    await observer.screenshot({
      path: info.outputPath('frozen-prepared-table.png'),
      animations: 'disabled',
    });
    const backup = await control(request, 'ordinary-roundtrip');
    expect(backup.after).toEqual(backup.before);
    expect(
      backup.exportedCalendar.find((x: any) => x.id === sent.expectedOccurrenceId)
    ).toMatchObject({
      preparedServings: 6,
      preparedOriginalServings: 2,
      preparationPlanToken: sent.expectedPlanToken,
      preparationServingVersion: sent.expectedServingVersion,
    });
    await writeFile(
      info.outputPath('separate-evidence.json'),
      JSON.stringify(
        {
          sent,
          receipt,
          before,
          database: db,
          http,
          projection,
          transport,
          display: {
            text: preparedReading,
            mountedDocument,
          },
          ordinaryBackup: backup,
        },
        null,
        2
      )
    );
  } finally {
    await context.close();
  }
});

for (const fault of [
  'lost',
  'unavailable',
  'negative',
  'changed',
  'recreated',
  'publisher',
] as const) {
  test(`real ${fault} preparation boundary preserves authoritative outcome and cooking work without blind replay`, async ({
    page,
    request,
    baseURL,
  }, info) => {
    test.setTimeout(90_000);
    await control(request, 'reset');
    await authenticate(page, request, baseURL!);
    const before = await persisted(request);
    await openCooking(page);
    await control(request, `fault/${fault}`);
    const response = await finish(page);
    expect(response.status()).toBe(
      fault === 'publisher' ? 200 : fault === 'changed' || fault === 'recreated' ? 409 : 504
    );
    if (fault === 'lost' || fault === 'publisher') {
      await expect(page.getByTestId('cooks-mode-overlay')).toHaveCount(0);
    } else if (fault === 'unavailable') {
      await expect(page.getByRole('button', { name: 'Check preparation' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Check preparation' })).toBeEnabled({
        timeout: 60_000,
      });
      await expect(page.getByTestId('cooks-mode-overlay')).toBeVisible();
      await control(request, 'fault/none');
      await page.getByRole('button', { name: 'Check preparation' }).click();
      await expect(page.getByTestId('cooks-mode-overlay')).toHaveCount(0);
    } else {
      await expect(page.getByTestId('preparation-review')).toBeVisible();
      await page.getByTestId('single-page-edit-step-1').click();
      const draft = page.getByTestId('cooks-mode-overlay').getByRole('textbox');
      await draft.fill('Keep this cooking correction');
      await page.getByRole('button', { name: 'Review current supper' }).click();
      if (fault === 'recreated')
        await expect(
          page.getByText('Could not review this supper. Your cooking work is kept.')
        ).toBeVisible();
      else if (fault === 'changed') {
        await expect(page.getByRole('button', { name: 'Refresh quantities' })).toBeVisible();
        await expect(page.getByTestId('cooking-portion-context')).toContainText('6 portions');
        await page.getByRole('button', { name: 'Refresh quantities' }).click();
        await expect(page.getByTestId('cooking-portion-context')).toContainText('8 portions');
      } else await expect(page.getByTestId('preparation-review')).toHaveCount(0);
      await expect(draft).toHaveValue('Keep this cooking correction');
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await page.getByTestId('cooking-view-all-steps').click();
      await page.getByTestId('cooks-mode-step-prev').click();
      await expect(page.getByTestId('ingredient-toggle').first()).toHaveAttribute(
        'aria-checked',
        'true'
      );
    }
    const db = await persisted(request);
    expect(db.writes).toHaveLength(1);
    expect(db.occurrences.slice(0, 2)).toEqual(before.occurrences.slice(0, 2));
    const committed = fault === 'lost' || fault === 'unavailable' || fault === 'publisher';
    expect(db.occurrences[2].status).toBe(committed ? 2 : 0);
    expect(db.occurrences[2].preparedServings).toBe(committed ? 6 : null);
    if (fault === 'recreated') expect(db.occurrences[2].id).not.toBe(before.occurrences[2].id);
    else expect(db.occurrences[2].id).toBe(before.occurrences[2].id);
    if (fault === 'publisher') expect(db.publicationFailures).toBeGreaterThan(0);
    if (committed) {
      expect(db.receipts[0].status).toBe(200);
      expect(JSON.parse(db.receipts[0].body).data.preparation.preparedOn).toBe('2026-10-13');
    } else {
      expect(db.recipes).toEqual(before.recipes);
      if (fault !== 'negative') expect(db.receipts[0].status).toBe(409);
    }
    await writeFile(
      info.outputPath('recovery-evidence.json'),
      JSON.stringify(
        {
          fault,
          request: response.request().postDataJSON(),
          status: response.status(),
          before,
          database: db,
          http: await schedule(request),
          display: await page.locator('body').innerText(),
        },
        null,
        2
      )
    );
  });
}

test('canonical prepared correction retains recorded context through coherent refresh', async ({
  page,
  request,
  baseURL,
}, info) => {
  test.skip(
    !process.env.COOKING_PREPARED_CONTEXT,
    'Requires the isolated canonical prepared fixture.'
  );
  const secret = process.env.HEARTH_SECRET!;
  await page.context().addCookies([
    { name: 'h_access', value: await generateSecretToken(secret), url: baseURL! },
    {
      name: 'x-family-member-id',
      value: process.env.CANONICAL_MEMBERS!.split(',')[0],
      url: baseURL!,
    },
  ]);
  await page.clock.setFixedTime(new Date('2026-10-13T12:00:00Z'));
  await page.addInitScript(() => localStorage.setItem('locale', 'en'));
  await page.route('**/*', (route) =>
    ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ||
    ['data:', 'blob:'].includes(new URL(route.request().url()).protocol)
      ? route.continue()
      : route.abort('blockedbyclient')
  );
  // A roster can grow after an original-context receipt; this must not infer a count.
  const created = await request.post(`${baseURL}/api/family`, {
    headers: { 'X-Hearth-Secret': secret },
    data: { name: 'Later reader' },
  });
  expect(created.status()).toBe(201);
  await page
    .context()
    .addCookies([
      { name: 'x-family-member-id', value: (await created.json()).data.id, url: baseURL! },
    ]);
  await page.goto('/planner');
  await qualifyPreparedCorrection(
    page,
    process.env.CANONICAL_RECIPE_ID!,
    '2026-10-12',
    '2026-10-16',
    process.env.COOKING_PREPARED_CONTEXT === 'six',
    info,
    async () => {
      expect(
        (
          await request.post(`${baseURL}/_test/canonical/recompute`, {
            headers: { 'X-Hearth-Secret': secret },
          })
        ).status()
      ).toBe(200);
      return (
        await (
          await request.get(`${baseURL}/api/schedule?referenceWeekStartDate=2026-10-12`, {
            headers: { 'X-Hearth-Secret': secret },
          })
        ).json()
      ).data.groceryItems;
    }
  );
});
