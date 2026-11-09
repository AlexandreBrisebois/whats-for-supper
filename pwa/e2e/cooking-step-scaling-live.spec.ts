import { qualifyCookingFixed } from './cooking-fixed';
import { qualifyCookingPerItem } from './cooking-per-item';
import { qualifyCookingRemainder } from './cooking-remainder';
import { qualifyCookingFraction } from './cooking-fraction';
import { qualifyCookingInstructionGuard } from './cooking-instruction-guard';
import { qualifyCookingReportRefresh } from './cooking-report-refresh';
import { test, expect } from '@playwright/test';
import { generateSecretToken } from './auth-utils';

test.skip(
  !process.env.CANONICAL_RECIPE_ID || !process.env.CANONICAL_MEMBERS,
  'Requires the isolated cooking-step API/PostgreSQL composition and built PWA.'
);

test('corrected whole use agrees across Home detail Cook and one grocery contribution', async ({
  page,
  request,
  baseURL,
}, info) => {
  const id = process.env.CANONICAL_RECIPE_ID!;
  const secret = process.env.HEARTH_SECRET!;
  const headers = { 'X-Hearth-Secret': secret };
  await page.context().addCookies([
    { name: 'h_access', value: await generateSecretToken(secret), url: baseURL! },
    {
      name: 'x-family-member-id',
      value: process.env.CANONICAL_MEMBERS!.split(',')[0],
      url: baseURL!,
    },
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date('2026-10-12T01:30:00Z'));
  await page.addInitScript(() => localStorage.setItem('locale', 'en'));
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ||
      ['data:', 'blob:'].includes(url.protocol)
      ? route.continue()
      : route.abort('blockedbyclient');
  });
  await page.goto(`/recipes?open=${id}`);
  await page.getByTestId('action-gear-menu').click();
  await page.getByTestId('action-edit-recipe').click();
  await expect(page.getByTestId('recipe-edit-amount-0')).toHaveValue('200');
  await page.getByTestId('recipe-edit-amount-0').fill('250');
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      new URL(response.url()).pathname === `/api/recipes/${id}`
  );
  await page.getByTestId('recipe-save-edits').click();
  const reply = await saved;
  expect(reply.status()).toBe(200);
  expect((await reply.json()).recipe.ingredientLines[0].amountText).toBe('250');
  await expect(page.getByTestId('recipe-ingredient-projection')).toContainText('500 g pasta');
  await page.goto('/home');
  await page.getByTestId('tonight-ingredients-toggle').click();
  await expect(page.getByTestId('tonight-menu-card')).toContainText('500 g pasta');
  await page.getByTestId('cook-mode-btn').click();
  await expect(
    page.getByTestId('ingredient-toggle').filter({ hasText: '500 g pasta' })
  ).toBeVisible();
  await page
    .getByTestId('cooks-mode-photo')
    .getByRole('button', { name: 'Open recipe details' })
    .click();
  await expect(page.getByTestId('recipe-ingredient-projection')).toContainText('500 g pasta');
  await page.getByTestId('action-close-sheet').click();
  await page.getByTestId('cooking-view-step-by-step').click();
  await page.getByTestId('cooks-mode-step-next').click();
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText(
    'Add 500 g pasta from a 400 g package; cook 20 minutes at 180 °C.'
  );
  await expect(page.getByTestId('cooks-mode-overlay')).toHaveCSS('opacity', '1');
  await page
    .getByTestId('cooks-mode-instructions')
    .screenshot({ path: info.outputPath('corrected-whole-step.png'), animations: 'disabled' });
  await page.getByTestId('cooks-mode-edit-step').click();
  await expect(page.getByRole('textbox')).toHaveValue(
    'Add 200 g pasta from a 400 g package; cook 20 minutes at 180 °C.'
  );
  await request.post(`${baseURL}/_test/canonical/recompute`, { headers });
  const schedule = (
    await (
      await request.get(`${baseURL}/api/schedule?weekOffset=1&referenceWeekStartDate=2026-10-05`, {
        headers,
      })
    ).json()
  ).data;
  const pasta = schedule.groceryItems.filter((row: any) => row.normalizedKey === 'pasta');
  expect(pasta).toHaveLength(1);
  expect(pasta[0].quantity).toEqual({ kind: 'scalar', value: { n: '500', d: '1' } });
});

test('absolute allocation agrees across Home detail Cook and one grocery contribution', async ({
  page,
  request,
  baseURL,
}, info) => {
  const split = process.env.COOKING_ALLOCATION !== 'partial';
  const uncertain = process.env.COOKING_ALLOCATION === 'exhaustive';
  const ingredient = split ? 'oil' : 'pasta';
  const scaled = uncertain ? '2 tbsp oil' : split ? '4 tbsp oil' : '375 g pasta';
  const source = split
    ? 'Finish with 1 tbsp oil.'
    : 'Add 50 g pasta from a 400 g package; cook 20 minutes at 180 °C.';
  const id = process.env.CANONICAL_RECIPE_ID!;
  const secret = process.env.HEARTH_SECRET!;
  const headers = { 'X-Hearth-Secret': secret };
  await page.context().addCookies([
    { name: 'h_access', value: await generateSecretToken(secret), url: baseURL! },
    {
      name: 'x-family-member-id',
      value: process.env.CANONICAL_MEMBERS!.split(',')[0],
      url: baseURL!,
    },
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date('2026-10-12T01:30:00Z'));
  await page.addInitScript(() => localStorage.setItem('locale', 'en'));
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ||
      ['data:', 'blob:'].includes(url.protocol)
      ? route.continue()
      : route.abort('blockedbyclient');
  });
  await page.goto(`/recipes?open=${id}`);
  if (!split || uncertain) {
    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-edit-recipe').click();
    await expect(page.getByTestId('recipe-edit-amount-0')).toHaveValue(uncertain ? '2' : '200');
    await page.getByTestId('recipe-edit-amount-0').fill(uncertain ? '1' : '250');
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname === `/api/recipes/${id}`
    );
    await page.getByTestId('recipe-save-edits').click();
    const reply = await saved;
    expect(reply.status()).toBe(200);
    expect((await reply.json()).recipe.ingredientLines[0].amountText).toBe(uncertain ? '1' : '250');
  }
  await expect(page.getByTestId('recipe-ingredient-projection')).toContainText(scaled);
  await page.goto('/home');
  await page.getByTestId('tonight-ingredients-toggle').click();
  await expect(page.getByTestId('tonight-menu-card')).toContainText(scaled);
  await page.getByTestId('cook-mode-btn').click();
  await expect(page.getByTestId('ingredient-toggle').filter({ hasText: scaled })).toBeVisible();
  await page
    .getByTestId('cooks-mode-photo')
    .getByRole('button', { name: 'Open recipe details' })
    .click();
  await expect(page.getByTestId('recipe-ingredient-projection')).toContainText(scaled);
  await page.getByTestId('action-close-sheet').click();
  await page.getByTestId('cooking-view-step-by-step').click();
  await page.getByTestId('cooks-mode-step-next').click();
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText(
    uncertain
      ? 'Heat 1 tbsp oil.'
      : split
        ? 'Heat 2 tbsp oil.'
        : 'Add 75 g pasta from a 400 g package; cook 20 minutes at 180 °C.'
  );
  await expect(page.getByTestId('cooks-mode-overlay')).toHaveCSS('opacity', '1');
  await page
    .getByTestId('cooks-mode-instructions')
    .screenshot({ path: info.outputPath('allocation-first-step.png'), animations: 'disabled' });
  await expect(page.getByTestId('cooking-step-uncertainty')).toHaveCount(0);
  await expect(
    page.getByText(
      'Some step amounts remain as written. Review the step or consult the original recipe.',
      { exact: true }
    )
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'View adjusted ingredients', exact: true })
  ).toHaveCount(0);
  if (split) {
    await page.getByTestId('cooks-mode-step-next').click();
    await expect(page.getByTestId('cooks-mode-instructions')).toContainText(
      uncertain ? 'Finish with 1 tbsp oil.' : 'Finish with 2 tbsp oil.'
    );
    await page
      .getByTestId('cooks-mode-instructions')
      .screenshot({ path: info.outputPath('allocation-second-step.png'), animations: 'disabled' });
  }
  await page.getByTestId('cooks-mode-edit-step').click();
  await expect(page.getByRole('textbox')).toHaveValue(source);
  await request.post(`${baseURL}/_test/canonical/recompute`, { headers });
  const schedule = (
    await (
      await request.get(`${baseURL}/api/schedule?weekOffset=1&referenceWeekStartDate=2026-10-05`, {
        headers,
      })
    ).json()
  ).data;
  const pasta = schedule.groceryItems.filter((row: any) => row.normalizedKey === ingredient);
  expect(pasta).toHaveLength(1);
  expect(pasta[0].quantity).toEqual({
    kind: 'scalar',
    value: { n: uncertain ? '2' : split ? '4' : '375', d: '1' },
  });
});

test('dated report refresh uses current real API content coherently', async ({
  page,
  request,
  baseURL,
}, info) => {
  const id = process.env.CANONICAL_RECIPE_ID!;
  const secret = process.env.HEARTH_SECRET!;
  await page.context().addCookies([
    { name: 'h_access', value: await generateSecretToken(secret), url: baseURL! },
    {
      name: 'x-family-member-id',
      value: process.env.CANONICAL_MEMBERS!.split(',')[0],
      url: baseURL!,
    },
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date('2026-10-12T01:30:00Z'));
  await page.addInitScript(() => localStorage.setItem('locale', 'en'));
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ||
      ['data:', 'blob:'].includes(url.protocol)
      ? route.continue()
      : route.abort('blockedbyclient');
  });
  await qualifyCookingReportRefresh(page, id, info);
  expect(
    (
      await request.post(`${baseURL}/_test/canonical/recompute`, {
        headers: { 'X-Hearth-Secret': secret },
      })
    ).ok()
  ).toBe(true);
});

test('undated instruction guard uses current real API content', async ({
  page,
  request,
  baseURL,
}, info) => {
  const id = process.env.CANONICAL_RECIPE_ID!;
  const secret = process.env.HEARTH_SECRET!;
  await page.context().addCookies([
    { name: 'h_access', value: await generateSecretToken(secret), url: baseURL! },
    {
      name: 'x-family-member-id',
      value: process.env.CANONICAL_MEMBERS!.split(',')[0],
      url: baseURL!,
    },
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date('2026-10-12T01:30:00Z'));
  await page.addInitScript(() => localStorage.setItem('locale', 'en'));
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ||
      ['data:', 'blob:'].includes(url.protocol)
      ? route.continue()
      : route.abort('blockedbyclient');
  });
  await qualifyCookingInstructionGuard(page, id, info);
  expect(
    (
      await request.post(`${baseURL}/_test/canonical/recompute`, {
        headers: { 'X-Hearth-Secret': secret },
      })
    ).ok()
  ).toBe(true);
});

test('relative fraction half remains readable after a guarded correction', async ({
  page,
  request,
  baseURL,
}, info) => {
  test.skip(
    process.env.COOKING_ALLOCATION !== 'fraction',
    'Requires the isolated fraction fixture.'
  );
  const id = process.env.CANONICAL_RECIPE_ID!,
    secret = process.env.HEARTH_SECRET!;
  await page.context().addCookies([
    { name: 'h_access', value: await generateSecretToken(secret), url: baseURL! },
    {
      name: 'x-family-member-id',
      value: process.env.CANONICAL_MEMBERS!.split(',')[0],
      url: baseURL!,
    },
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date('2026-10-12T01:30:00Z'));
  await page.addInitScript(() => localStorage.setItem('locale', 'en'));
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ||
    ['data:', 'blob:'].includes(new URL(route.request().url()).protocol)
      ? route.continue()
      : route.abort('blockedbyclient')
  );
  await page.goto(`/recipes?open=${id}`);
  await qualifyCookingFraction(page, id, info);
  const recomputed = await request.post(`${baseURL}/_test/canonical/recompute`, {
    headers: { 'X-Hearth-Secret': secret },
  });
  expect(recomputed.status()).toBe(200);
  const schedule = (
    await (
      await request.get(`${baseURL}/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-12`, {
        headers: { 'X-Hearth-Secret': secret },
      })
    ).json()
  ).data;
  const rows = schedule.groceryItems.filter((r: any) => r.normalizedKey === 'pasta');
  expect(rows).toHaveLength(1);
  expect(rows[0].quantity).toEqual({ kind: 'scalar', value: { n: '375', d: '1' } });
});

test('remaining follows corrected total and reduction', async ({
  page,
  request,
  baseURL,
}, info) => {
  test.skip(
    process.env.COOKING_ALLOCATION !== 'remainder',
    'Requires the isolated remainder fixture.'
  );
  const id = process.env.CANONICAL_RECIPE_ID!,
    secret = process.env.HEARTH_SECRET!;
  await page.context().addCookies([
    { name: 'h_access', value: await generateSecretToken(secret), url: baseURL! },
    {
      name: 'x-family-member-id',
      value: process.env.CANONICAL_MEMBERS!.split(',')[0],
      url: baseURL!,
    },
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date('2026-10-12T01:30:00Z'));
  await page.addInitScript(() => localStorage.setItem('locale', 'en'));
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ||
    ['data:', 'blob:'].includes(new URL(route.request().url()).protocol)
      ? route.continue()
      : route.abort('blockedbyclient')
  );
  await page.goto(`/recipes?open=${id}`);
  await qualifyCookingRemainder(page, id, info, async () => {
    expect(
      (
        await request.post(`${baseURL}/_test/canonical/recompute`, {
          headers: { 'X-Hearth-Secret': secret },
        })
      ).status()
    ).toBe(200);
    return (
      await (
        await request.get(
          `${baseURL}/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-12`,
          { headers: { 'X-Hearth-Secret': secret } }
        )
      ).json()
    ).data.groceryItems;
  });
  const recomputed = await request.post(`${baseURL}/_test/canonical/recompute`, {
    headers: { 'X-Hearth-Secret': secret },
  });
  expect(recomputed.status()).toBe(200);
  const schedule = (
    await (
      await request.get(`${baseURL}/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-12`, {
        headers: { 'X-Hearth-Secret': secret },
      })
    ).json()
  ).data;
  const rows = schedule.groceryItems.filter((r: any) => r.normalizedKey === 'oil');
  expect(rows).toHaveLength(1);
  expect(rows[0].quantity).toEqual({ kind: 'scalar', value: { n: '1', d: '1' } });
});

test('per-item dose stays fixed while count scales and stale proof retains prose', async ({
  page,
  request,
  baseURL,
}, info) => {
  test.skip(
    process.env.COOKING_ALLOCATION !== 'perItem',
    'Requires the isolated per-item fixture.'
  );
  const id = process.env.CANONICAL_RECIPE_ID!,
    secret = process.env.HEARTH_SECRET!;
  await page.context().addCookies([
    { name: 'h_access', value: await generateSecretToken(secret), url: baseURL! },
    {
      name: 'x-family-member-id',
      value: process.env.CANONICAL_MEMBERS!.split(',')[0],
      url: baseURL!,
    },
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date('2026-10-12T01:30:00Z'));
  await page.addInitScript(() => localStorage.setItem('locale', 'en'));
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ||
    ['data:', 'blob:'].includes(new URL(route.request().url()).protocol)
      ? route.continue()
      : route.abort('blockedbyclient')
  );
  await page.goto(`/recipes?open=${id}`);
  await qualifyCookingPerItem(page, id, info, async () => {
    expect(
      (
        await request.post(`${baseURL}/_test/canonical/recompute`, {
          headers: { 'X-Hearth-Secret': secret },
        })
      ).status()
    ).toBe(200);
    return (
      await (
        await request.get(
          `${baseURL}/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-12`,
          { headers: { 'X-Hearth-Secret': secret } }
        )
      ).json()
    ).data.groceryItems;
  });
  const recomputed = await request.post(`${baseURL}/_test/canonical/recompute`, {
    headers: { 'X-Hearth-Secret': secret },
  });
  expect(recomputed.status()).toBe(200);
  const schedule = (
    await (
      await request.get(`${baseURL}/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-12`, {
        headers: { 'X-Hearth-Secret': secret },
      })
    ).json()
  ).data;
  const rows = schedule.groceryItems.filter((r: any) => r.normalizedKey === 'oil');
  expect(rows).toHaveLength(1);
  expect(rows[0].quantity).toEqual({ kind: 'scalar', value: { n: '6', d: '1' } });
});

test('standalone fixed use retains wording beside proportional use and guarded total edits', async ({
  page,
  request,
  baseURL,
}, info) => {
  test.skip(process.env.COOKING_ALLOCATION !== 'fixed', 'Requires the isolated fixed fixture.');
  const id = process.env.CANONICAL_RECIPE_ID!,
    secret = process.env.HEARTH_SECRET!;
  await page.context().addCookies([
    { name: 'h_access', value: await generateSecretToken(secret), url: baseURL! },
    {
      name: 'x-family-member-id',
      value: process.env.CANONICAL_MEMBERS!.split(',')[0],
      url: baseURL!,
    },
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date('2026-10-12T01:30:00Z'));
  await page.addInitScript(() => localStorage.setItem('locale', 'en'));
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ||
    ['data:', 'blob:'].includes(new URL(route.request().url()).protocol)
      ? route.continue()
      : route.abort('blockedbyclient')
  );
  await page.goto(`/recipes?open=${id}`);
  await qualifyCookingFixed(page, id, info, async () => {
    expect(
      (
        await request.post(`${baseURL}/_test/canonical/recompute`, {
          headers: { 'X-Hearth-Secret': secret },
        })
      ).status()
    ).toBe(200);
    return (
      await (
        await request.get(
          `${baseURL}/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-12`,
          { headers: { 'X-Hearth-Secret': secret } }
        )
      ).json()
    ).data.groceryItems;
  });
  const recomputed = await request.post(`${baseURL}/_test/canonical/recompute`, {
    headers: { 'X-Hearth-Secret': secret },
  });
  expect(recomputed.status()).toBe(200);
  const schedule = (
    await (
      await request.get(`${baseURL}/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-12`, {
        headers: { 'X-Hearth-Secret': secret },
      })
    ).json()
  ).data;
  const rows = schedule.groceryItems.filter((r: any) => r.normalizedKey === 'oil');
  expect(rows).toHaveLength(1);
  expect(rows[0].quantity).toEqual({ kind: 'scalar', value: { n: '6', d: '1' } });
});
