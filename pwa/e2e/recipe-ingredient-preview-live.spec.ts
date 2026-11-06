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
    await page.goto('/planner?weekOffset=0&referenceWeekStartDate=2026-10-12');
    await expect(page.getByTestId('day-card-2')).toContainText('Original pasta for two');
    const baseline = await read('/_test/servings/persisted');
    const requestBaseline = await read('/_test/servings/requests');
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
        await expect(page.getByTestId('recipe-portion-context')).toContainText(
          `${savedCount} portions`
        );
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
      const list = page.getByTestId('recipe-ingredient-preview');
      await expect(list).toContainText(`${(12 * count) / 4} coquilles géantes`);
      await expect(list).toContainText(`${count / 4} oignon haché`);
      await expect(list).toContainText(`${(450 * count) / 4} g Bœuf haché mi-maigre`);
      await expect(list).toContainText(`${(500 * count) / 4} ml Sauce marinara`);
      await expect(list.locator('li').nth(7)).toHaveText('sel');
      await expect(list.locator('li').nth(8)).toHaveText('poivre');
      expect(await read('/_test/servings/persisted')).toEqual(baseline);
    }
    expect(await read('/_test/servings/requests')).toEqual(requestBaseline);
  } finally {
    await other.close();
  }
});
