import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { generateSecretToken } from './auth-utils';
import { pinCivilDate } from './date-only-clock';

const locale = process.env.CANONICAL_PDF_LOCALE === 'fr' ? 'fr' : 'en';
test.skip(
  !process.env.CANONICAL_PDF_LOCALE ||
    !process.env.CANONICAL_PDF_FIXTURE ||
    !process.env.CANONICAL_PDF_EVIDENCE ||
    !process.env.CANONICAL_MEMBERS,
  'Requires the isolated PDF worker API/PostgreSQL composition and production PWA.'
);

test(`fresh PDF ${locale} uses native conversion, guarded editing and grocery refresh`, async ({
  browser,
  request,
  baseURL,
}) => {
  test.setTimeout(240_000);
  const secret = process.env.HEARTH_SECRET!;
  const member = process.env.CANONICAL_MEMBERS!.split(',')[0];
  const headers = { 'X-Hearth-Secret': secret, 'X-Family-Member-Id': member };
  const read = async (route: string) => {
    const response = await request.get(`${baseURL}${route}`, { headers });
    expect(response.status(), await response.text()).toBe(200);
    return response.json();
  };
  const family = (await read('/api/family')).data;
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: 'America/Toronto',
  });
  try {
    await context.addCookies([
      { name: 'h_access', value: await generateSecretToken(secret), url: baseURL! },
      { name: 'x-family-member-id', value: member, url: baseURL! },
    ]);
    await context.addInitScript(
      ({ language, member, family }) => {
        localStorage.setItem('locale', language);
        localStorage.setItem(
          'family-storage',
          JSON.stringify({
            state: {
              selectedFamilyMemberId: member,
              familyMembers: family,
              _hasHydrated: true,
              hasLoaded: true,
            },
            version: 0,
          })
        );
      },
      { language: locale, member, family }
    );
    // Application HTTP is real; close external browser network boundaries.
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      return ['127.0.0.1', 'localhost'].includes(url.hostname) ||
        ['data:', 'blob:'].includes(url.protocol)
        ? route.continue()
        : route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    await pinCivilDate(page, '2026-10-12T01:30:00Z');
    const captures: string[] = [];
    page.on('request', (entry) => {
      if (entry.method() === 'POST' && new URL(entry.url()).pathname === '/api/recipes/capture-pdf')
        captures.push(entry.url());
    });
    await page.goto('/capture');
    await page
      .getByTestId('import-recipe-file-input')
      .setInputFiles(process.env.CANONICAL_PDF_FIXTURE!);
    await expect(page.getByTestId('pdf-confirmation')).toBeVisible();
    await page.getByTestId('pdf-rating-2').click();
    await page.getByTestId('pdf-notes').fill('Keep this public PDF source.');
    const capturing = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/api/recipes/capture-pdf'
    );
    await page.getByTestId('pdf-save').click();
    const acceptance = await capturing;
    expect(acceptance.status(), await acceptance.text()).toBe(202);
    const accepted = await acceptance.json();
    const id = accepted.data.id;
    const recipePath = `/api/recipes/${id}`;
    const recipe = async () => (await read(recipePath)).recipe;
    await expect.poll(async () => (await recipe()).isReady, { timeout: 120_000 }).toBe(true);
    await expect
      .poll(
        async () => {
          const observed = await read('/_test/pdf/producer-settled');
          expect(observed.failed).toBe(false);
          return observed.settled;
        },
        { timeout: 120_000 }
      )
      .toBe(true);
    const initial = await recipe();
    expect(initial).toMatchObject({
      name: 'Pasta for four',
      servings: 4,
      rating: 2,
      notes: 'Keep this public PDF source.',
      ingredients: ['200 g pasta', '100 ml sauce', 'salt to taste'],
    });
    expect(initial.ingredientLines.map((row: any) => row.amountText)).toEqual(['200', '100', null]);
    expect(initial.ingredientLines.map((row: any) => row.provenance.origin)).toEqual([
      'source',
      'source',
      'source',
    ]);
    expect(captures).toHaveLength(1);
    const originalPages: { index: number; sha256: string; bytes: number }[] = [];
    for (const index of [0, 1]) {
      const original = await request.get(`${baseURL}${recipePath}/original/${index}`, { headers });
      expect(original.status()).toBe(200);
      expect(original.headers()['content-type']).toContain('image/png');
      const bytes = await original.body();
      originalPages.push({
        index,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        bytes: bytes.length,
      });
      expect(Array.from(bytes.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    }
    expect(originalPages[0].sha256).not.toBe(originalPages[1].sha256);
    await page.goto(`/recipes?open=${id}`);
    await expect(page.getByTestId('recipe-detail-name')).toHaveText(initial.name);
    await page.getByTestId('action-view-original').click();
    const firstPage = page.getByRole('img', { name: 'Recipe photo 1', exact: true });
    await expect(firstPage).toBeVisible();
    await expect(firstPage).toHaveAttribute('src', `${recipePath}/original/0`);
    await expect
      .poll(() => firstPage.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0);
    await page.keyboard.press('ArrowRight');
    const secondPage = page.getByRole('img', { name: 'Recipe photo 2', exact: true });
    await expect(secondPage).toBeVisible();
    await expect(secondPage).toHaveAttribute('src', `${recipePath}/original/1`);
    await expect
      .poll(() => secondPage.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0);
    await page.getByTestId('action-close-viewer').click();
    const monday = '2026-10-12';
    const assigned = await request.post(
      `${baseURL}/api/schedule/assign?referenceWeekStartDate=${monday}`,
      {
        headers,
        data: { weekOffset: 0, dayIndex: 0, recipeId: id, requireEmpty: true },
      }
    );
    expect(assigned.status(), await assigned.text()).toBe(200);
    const servingVersion = (await read(`/api/schedule/servings?referenceWeekStartDate=${monday}`))
      .data.version;
    const portions = await request.put(`${baseURL}/api/schedule/servings`, {
      headers,
      data: {
        referenceWeekStartDate: monday,
        weekOffset: 0,
        expectedVersion: servingVersion,
        days: [{ date: monday, servings: 8 }],
      },
    });
    expect(portions.status(), await portions.text()).toBe(200);
    const schedule = async () =>
      (await read(`/api/schedule?weekOffset=0&referenceWeekStartDate=${monday}`)).data;
    const row = (snapshot: any, key: string) => {
      const rows = snapshot.groceryItems.filter((entry: any) => entry.normalizedKey === key);
      expect(rows).toHaveLength(1);
      expect(rows[0].recipeIds).toEqual([id]);
      return rows[0];
    };
    const exact = (n: string) => ({ kind: 'scalar', value: { n, d: '1' } });
    await expect
      .poll(
        async () =>
          (await schedule()).groceryItems.find((entry: any) => entry.normalizedKey === 'pasta')
            ?.quantity,
        { timeout: 120_000 }
      )
      .toEqual(exact('400'));
    await page.goto(`/planner?weekOffset=0&referenceWeekStartDate=${monday}`);
    await page.getByTestId('grocery-tab').click();
    await expect(page.getByTestId('reorder-group')).toHaveCount(0);
    await expect(page.getByTestId('grocery-checklist').locator('..')).toHaveCSS('opacity', '1');
    for (const header of await page
      .locator('[data-testid^="aisle-header-"][aria-expanded="false"]')
      .all())
      await header.click();
    const before = await schedule();
    const sauce = row(before, 'sauce');
    expect(sauce.quantity).toEqual(exact('200'));
    const sauceCheck = page.locator(
      `[data-testid="grocery-item-checkbox"][data-row-id="${sauce.rowId}"]`
    );
    const checking = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname === '/api/schedule/0/grocery/item'
    );
    await sauceCheck.click();
    expect((await checking).status()).toBe(200);
    await expect(sauceCheck).toHaveAttribute('aria-checked', 'true');
    await expect.poll(async () => (await schedule()).groceryState[sauce.rowId]).toBe(true);
    const checked = await schedule();
    expect(checked.groceryState[sauce.rowId]).toBe(true);
    const sauceControlBefore = await read('/_test/pdf/grocery-control');
    const edit = async (amount: string) => {
      await page.goto(`/recipes?open=${id}`);
      await expect(page.getByTestId('recipe-detail-name')).toHaveText(initial.name);
      await page.getByTestId('action-gear-menu').click();
      await page.getByTestId('action-edit-recipe').click();
      await page.getByTestId('recipe-edit-amount-0').fill(amount);
      const saving = page.waitForResponse(
        (response) =>
          response.request().method() === 'PATCH' && new URL(response.url()).pathname === recipePath
      );
      await page.getByTestId('recipe-save-edits').click();
      const reply = await saving;
      expect(reply.status(), await reply.text()).toBe(200);
      await expect(page.getByTestId('recipe-save-edits')).toHaveCount(0);
      return (await reply.json()).recipe;
    };
    const saved = await edit('250');
    expect(saved.ingredientLines.map((line: any) => line.id)).toEqual(
      initial.ingredientLines.map((line: any) => line.id)
    );
    expect(saved.ingredientLines[1]).toEqual(initial.ingredientLines[1]);
    expect(saved.instructionSections).toEqual(initial.instructionSections);
    const sourceRefs = initial.ingredientLines.map((line: any) => line.provenance.sourceRef);
    expect(
      sourceRefs.every((value: unknown) => typeof value === 'string' && value.length > 0)
    ).toBe(true);
    expect(saved.ingredientLines.map((line: any) => line.provenance.sourceRef)).toEqual(sourceRefs);
    await expect
      .poll(
        async () =>
          (await schedule()).groceryItems.find((entry: any) => entry.normalizedKey === 'pasta')
            ?.quantity,
        { timeout: 120_000 }
      )
      .toEqual(exact('500'));
    const assignedDay = (await schedule()).days.find((day: any) => day.date === monday);
    expect(assignedDay.occurrenceId).toBeTruthy();
    const dated = await read(
      `${recipePath}/ingredient-projection?supperDate=${monday}&context=assigned&occurrenceId=${assignedDay.occurrenceId}`
    );
    expect(dated.lines[0].displayText).toBe('500 g pasta');
    const afterSave = await schedule();
    expect(row(afterSave, 'sauce')).toEqual(row(checked, 'sauce'));
    expect(afterSave.groceryState[sauce.rowId]).toBe(true);
    const sauceControlAfterSave = await read('/_test/pdf/grocery-control');
    expect(sauceControlAfterSave).toEqual(sauceControlBefore);
    const final = await edit('');
    expect(final.ingredientLines[0].amount).toBeNull();
    expect(final.ingredientLines[0].provenance.protectedFields).toContain('amount');
    expect(final.ingredientLines[1]).toEqual(initial.ingredientLines[1]);
    expect(final.instructionSections).toEqual(initial.instructionSections);
    expect(final.ingredientLines.map((line: any) => line.provenance.sourceRef)).toEqual(sourceRefs);
    await expect
      .poll(
        async () =>
          (await schedule()).groceryItems.find((entry: any) => entry.normalizedKey === 'pasta')
            ?.quantity,
        { timeout: 120_000 }
      )
      .toBeNull();
    const afterClear = await schedule();
    expect(row(afterClear, 'sauce')).toEqual(row(checked, 'sauce'));
    expect(afterClear.groceryState[sauce.rowId]).toBe(true);
    const sauceControlAfterClear = await read('/_test/pdf/grocery-control');
    expect(sauceControlAfterClear).toEqual(sauceControlBefore);
    await page.goto(`/planner?weekOffset=0&referenceWeekStartDate=${monday}`);
    await page.getByTestId('grocery-tab').click();
    await expect(page.getByTestId('reorder-group')).toHaveCount(0);
    await expect(page.getByTestId('grocery-checklist').locator('..')).toHaveCSS('opacity', '1');
    for (const header of await page
      .locator('[data-testid^="aisle-header-"][aria-expanded="false"]')
      .all())
      await header.click();
    await expect(
      page.locator(`[data-testid="grocery-item-checkbox"][data-row-id="${sauce.rowId}"]`)
    ).toHaveAttribute('aria-checked', 'true');
    await page.screenshot({
      path: path.join(process.env.CANONICAL_PDF_EVIDENCE!, 'grocery-final.png'),
      fullPage: true,
    });
    await writeFile(
      path.join(process.env.CANONICAL_PDF_EVIDENCE!, 'browser-receipt.json'),
      JSON.stringify(
        {
          locale,
          id,
          accepted,
          captureRequests: captures.length,
          originalPages,
          initial,
          saved,
          final,
          checked,
          afterSave,
          afterClear,
          dated,
          sauceControlBefore,
          sauceControlAfterSave,
          sauceControlAfterClear,
        },
        null,
        2
      )
    );
  } finally {
    await context.close();
  }
});
