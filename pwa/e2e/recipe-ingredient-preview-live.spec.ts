import { test, expect } from '@playwright/test';
import { generateSecretToken } from './auth-utils';

test.skip(!process.env.SUPPER_SERVINGS_API_URL, 'Requires isolated PostgreSQL/API preview host.');

test('real preview preserves saved five, prepared seven, groceries and jobs across clients', async ({
  page,
  browser,
  request,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const api = process.env.SUPPER_SERVINGS_API_URL!;
  const headers = { 'X-Hearth-Secret': process.env.HEARTH_SECRET! };
  const read = async (path: string) => {
    const response = await request.get(api + path, { headers });
    expect(response.ok()).toBe(true);
    return response.json();
  };
  const member = (await read('/api/family')).data[0];
  const cookies = [
    {
      name: 'h_access',
      value: await generateSecretToken(process.env.HEARTH_SECRET!),
      url: baseURL!,
    },
    { name: 'x-family-member-id', value: member.id, url: baseURL! },
  ];
  await page.context().addCookies(cookies);
  await page.addInitScript((member) => {
    localStorage.setItem('locale', 'en');
    localStorage.setItem(
      'family-storage',
      JSON.stringify({
        state: { selectedFamilyMemberId: member.id, familyMembers: [member], hasLoaded: true },
        version: 0,
      })
    );
  }, member);
  const other = await browser.newContext({ baseURL });
  await other.addCookies(cookies);
  try {
    // Capture the complete persistence boundary before any ingredient reading.
    // Neither expanding Home nor entering Cook may write plan/check/job state.
    const baseline = await read('/_test/servings/persisted');
    const requestBaseline = await read('/_test/servings/requests');
    const today = baseline.occurrences.find(
      (occurrence: { date: string }) => occurrence.date === '2026-10-12'
    );
    expect(today).toBeTruthy();
    const homeProjection = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname.endsWith(`/api/recipes/${today.recipeId}/ingredient-projection`) &&
        url.searchParams.get('context') === 'assigned' &&
        url.searchParams.get('supperDate') === today.date &&
        url.searchParams.get('occurrenceId') === today.id
      );
    });
    await page.goto('/home');
    const home = page.getByTestId('tonight-menu-card');
    await expect(home).toContainText('Original pasta for two');
    await home.getByTestId('tonight-ingredients-toggle').click();
    expect((await homeProjection).status()).toBe(200);
    await expect(home).toContainText('600 g pasta');
    await expect(home.getByText('200 g pasta', { exact: true })).toHaveCount(0);
    await home
      .getByText('600 g pasta', { exact: true })
      .evaluate((node) => node.scrollIntoView({ block: 'center' }));
    await expect(home.getByText('600 g pasta', { exact: true })).toBeVisible();
    await page.screenshot({ path: '../.task/quiet-recipe-portions/live/home-assigned-six.png' });
    expect(await read('/_test/servings/persisted')).toEqual(baseline);
    await home.getByTestId('cook-mode-btn').click();
    const cook = page.getByTestId('cooks-mode-overlay');
    await expect(cook).toContainText('600 g pasta');
    await expect(cook.getByTestId('cooking-portion-context')).toContainText('6 portions');
    await expect(cook).toHaveCSS('opacity', '1');
    await expect(cook.getByText('600 g pasta', { exact: true })).toBeVisible();
    await page.screenshot({ path: '../.task/quiet-recipe-portions/live/cook-assigned-six.png' });
    await cook.getByTestId('close-cooks-mode').click();
    await expect(cook).toHaveCount(0);
    expect(await read('/_test/servings/persisted')).toEqual(baseline);
    // A real API read with an obsolete occurrence token must not grant this
    // same recipe's current occurrence, even though recipe/date still match.
    const stale = await request.get(
      `${api}/api/recipes/${today.recipeId}/ingredient-projection?supperDate=${today.date}&context=assigned&occurrenceId=00000000-0000-4000-8000-000000000001`,
      { headers }
    );
    expect(stale.status()).toBe(409);
    expect(await read('/_test/servings/persisted')).toEqual(baseline);
    expect(await read('/_test/servings/requests')).toEqual(requestBaseline);
    await page.goto('/planner?weekOffset=0&referenceWeekStartDate=2026-10-12');
    await expect(page.getByTestId('day-card-2')).toContainText('Original pasta for two');
    for (const [index, savedCount] of [
      [2, 5],
      [4, 7],
    ]) {
      await page.getByTestId(`day-card-${index}`).getByTestId('edit-recipe-button').click();
      await expect(page.getByTestId('recipe-ingredient-projection')).toContainText(
        `${savedCount * 100} g pasta`
      );
      for (const count of [2, 4, 6, 4]) {
        await page.getByRole('button', { name: `Preview ${count} portions`, exact: true }).click();
        await expect(page.getByTestId('recipe-ingredient-preview')).toContainText(
          `${count * 100} g pasta`
        );
        await expect(page.getByTestId('recipe-servings')).toHaveText(`${count} servings`);
        await expect(page.getByTestId('recipe-portion-context')).toHaveCount(0);
        if (savedCount === 7) {
          await expect(page.getByTestId('recipe-prepared-portions')).toHaveText(
            'Prepared 7 portions'
          );
          await expect(
            page.getByTestId('recipe-detail-sheet').getByTestId('preparation-status')
          ).toContainText('Prepared Monday, Oct 12');
        }
        expect(await read('/_test/servings/persisted')).toEqual(baseline);
        const independent = await other.request.get(
          '/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-12'
        );
        expect(independent.ok()).toBe(true);
        const schedule = (await independent.json()).data;
        expect(schedule.days[4].preparation.servings).toBe(7);
        expect(schedule.days[4].preparation.preparedOn).toBe('2026-10-12');
      }
      await page.getByRole('button', { name: 'Planned quantities', exact: true }).click();
      await expect(page.getByTestId('recipe-ingredient-projection')).toContainText(
        `${savedCount * 100} g pasta`
      );
      await page.getByTestId('action-close-sheet').click();
    }
    const shells = baseline.recipes.find(
      (recipe: { name: string }) => recipe.name === 'Coquilles farcies au bœuf'
    );
    expect(shells).toBeTruthy();
    await page.goto(`/recipes?open=${shells.id}&reviewAmounts=true`);
    for (const count of [2, 4, 6]) {
      await page.getByRole('button', { name: `Preview ${count} portions`, exact: true }).click();
      const list = page
        .getByTestId('recipe-detail-sheet')
        .locator('ul')
        .filter({ hasText: 'coquilles géantes' });
      if (count === 4) {
        await expect(page.getByTestId('recipe-ingredient-preview')).toHaveCount(0);
        await expect(
          page.getByText('Preview only. Your plan and shopping list stay unchanged.', {
            exact: true,
          })
        ).toHaveCount(0);
      }
      await expect(list).toContainText(`${(12 * count) / 4} coquilles géantes`);
      await expect(list).toContainText(`${count / 4} oignon haché`);
      await expect(list).toContainText(`${(450 * count) / 4} g Bœuf haché mi-maigre`);
      await expect(list).toContainText(`${(500 * count) / 4} ml Sauce marinara`);
      await expect(list.locator('li').nth(7)).toHaveText('sel');
      await expect(list.locator('li').nth(8)).toHaveText('poivre');
      expect(await read('/_test/servings/persisted')).toEqual(baseline);
    }
    expect(await read('/_test/servings/requests')).toEqual(requestBaseline);
    console.log(
      JSON.stringify({
        homeAndCook: { supperDate: today.date, occurrenceId: today.id, amount: '600 g pasta' },
        staleOccurrenceStatus: stale.status(),
        defaultServings: 5,
        frozenServings: 7,
        sixPortionShells: { shells: 18, onion: 1.5, beefGrams: 675, sauceMillilitres: 750 },
        persistedStateUnchanged: true,
        mutationRequestsUnchanged: true,
      })
    );
  } finally {
    await other.close();
  }
});
