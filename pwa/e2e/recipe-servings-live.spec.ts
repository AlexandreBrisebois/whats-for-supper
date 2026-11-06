import { test, expect } from '@playwright/test';
import { generateSecretToken } from './auth-utils';

test.skip(
  !process.env.SERVINGS_API_URL,
  'Requires the isolated RecipeServings PostgreSQL/API host.'
);

test('real extraction persistence reaches the generated detail client and bilingual responsive heading', async ({
  page,
  request,
  baseURL,
}) => {
  const api = process.env.SERVINGS_API_URL!;
  const id = process.env.SERVINGS_RECIPE_ID!;
  const headers = { 'X-Hearth-Secret': process.env.HEARTH_SECRET! };
  const member = (await (await request.get(`${api}/api/family`, { headers })).json()).data[0];
  const response = await request.get(`${api}/api/recipes/${id}`, { headers });
  expect(response.status()).toBe(200);
  expect((await response.json()).recipe).toMatchObject({
    servings: 4,
    ingredients: ['510 g beef', '340 g pasta'],
  });
  await page.context().addCookies([
    {
      name: 'h_access',
      value: await generateSecretToken(process.env.HEARTH_SECRET!),
      url: baseURL!,
    },
    { name: 'x-family-member-id', value: member.id, url: baseURL! },
  ]);
  await page.addInitScript((member) => {
    localStorage.setItem(
      'family-storage',
      JSON.stringify({
        state: {
          selectedFamilyMemberId: member.id,
          familyMembers: [member],
          _hasHydrated: true,
          hasLoaded: true,
        },
        version: 0,
      })
    );
  }, member);
  for (const locale of ['en', 'fr']) {
    await page.goto('/welcome');
    await page.evaluate((language) => localStorage.setItem('locale', language), locale);
    for (const [width, scale] of [
      [320, 1],
      [320, 2],
      [1024, 1],
      [1024, 2],
    ]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/recipes?open=${id}&reviewAmounts=true`);
      await page.addStyleTag({ content: `html { font-size: ${16 * scale}px !important; }` });
      const heading = page.getByRole('heading', {
        name: locale === 'en' ? 'Ingredients' : 'Ingrédients',
        exact: true,
      });
      await expect(heading).toBeVisible();
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await heading.evaluate((node) => {
        const scroller = node.closest('div.overflow-y-auto')!;
        scroller.scrollLeft = 0;
        scroller.scrollTop +=
          node.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      });
      const geometry = await heading.evaluate((node) => {
        const title = node.getBoundingClientRect();
        const originalBasis = document.querySelector('[data-testid=recipe-servings]')!;
        const badge = originalBasis.getBoundingClientRect();
        const bounds = node.getBoundingClientRect();
        const scroller = node.closest('div.overflow-y-auto')!;
        const clip = scroller.getBoundingClientRect();
        const panel = document.querySelector('[data-testid="recipe-detail-sheet"]')!;
        return {
          title: { x: title.x, right: title.right, bottom: title.bottom },
          badge: { x: badge.x, y: badge.y, right: badge.right },
          bounds: { x: bounds.x, right: bounds.right },
          clip: { x: clip.x, right: clip.right, scrollLeft: scroller.scrollLeft },
          headingNoScroll: node.scrollWidth <= node.clientWidth,
          noScroll:
            panel.scrollWidth <= panel.clientWidth &&
            document.documentElement.scrollWidth <= innerWidth,
          badgeColor: getComputedStyle(originalBasis).color,
          badgeBackground: getComputedStyle(originalBasis).backgroundColor,
          panelBackground: getComputedStyle(panel).backgroundColor,
        };
      });
      expect(geometry.noScroll).toBe(true);
      expect(geometry.headingNoScroll).toBe(true);
      expect(geometry.clip.scrollLeft).toBe(0);
      expect(geometry.bounds.right).toBeLessThanOrEqual(geometry.clip.right + 1);
      expect(geometry.title.right).toBeLessThanOrEqual(geometry.clip.right + 1);
      expect(geometry.badge.right).toBeLessThanOrEqual(geometry.clip.right + 1);
      expect(geometry.title.x).toBeGreaterThanOrEqual(geometry.bounds.x - 1);
      expect(geometry.title.right).toBeLessThanOrEqual(geometry.bounds.right + 1);
      expect(geometry.badge.right).toBeLessThanOrEqual(geometry.bounds.right + 1);
      if (width === 320 && scale === 2)
        expect(geometry.badge.y).toBeGreaterThanOrEqual(geometry.title.bottom - 1);
      await expect(heading.locator('button,input,[tabindex]')).toHaveCount(0);
      await expect(page.getByText('510 g beef', { exact: true })).toHaveCount(1);
      await expect(page.getByText('340 g pasta', { exact: true })).toHaveCount(1);
      await page
        .getByTestId('recipe-servings')
        .screenshot({ path: `../.task/servings/badge-${locale}-${width}-${scale}.png` });
      await page.screenshot({ path: `../.task/servings/live-${locale}-${width}-${scale}.png` });
      await page.getByTestId('action-gear-menu').click();
      await page.getByTestId('action-edit-recipe').click();
      const input = page.getByTestId('recipe-edit-servings-input');
      await expect(input).toHaveAccessibleName(locale === 'en' ? 'Servings' : 'Portions');
      await expect(input).toHaveValue('4');
      await input.focus();
      await expect(input).toBeFocused();
      await input.press('Tab');
      await expect(page.getByTestId('recipe-edit-ingredient-0')).toBeFocused();
      await page.getByTestId('recipe-edit-ingredient-0').press('Shift+Tab');
      await expect(input).toBeFocused();
      await input.press('ControlOrMeta+A');
      await input.press('0');
      await expect(input).toHaveAttribute('aria-invalid', 'true');
      await expect(input).toHaveAccessibleDescription(
        locale === 'en'
          ? 'Enter a whole number from 1 to 2147483647.'
          : 'Saisissez un nombre entier de 1 à 2147483647.'
      );
      await expect(page.getByTestId('recipe-save-edits')).toBeDisabled();
      await input.scrollIntoViewIfNeeded();
      // Measure against the actual visible scroller at zero horizontal offset.
      const editGeometry = await input.evaluate((node) => {
        const scroller = node.closest('div.overflow-y-auto')!;
        scroller.scrollLeft = 0;
        const clip = scroller.getBoundingClientRect();
        return [
          node,
          document.querySelector('label[for="recipe-edit-servings"]')!,
          document.querySelector('#recipe-servings-error')!,
        ].map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            x: rect.x,
            right: rect.right,
            clipLeft: clip.x,
            clipRight: clip.right,
            noScroll: el.scrollWidth <= el.clientWidth,
          };
        });
      });
      console.log(JSON.stringify({ locale, width, scale, editGeometry }));
      for (const rect of editGeometry) {
        expect(rect.x).toBeGreaterThanOrEqual(rect.clipLeft);
        expect(rect.right).toBeLessThanOrEqual(rect.clipRight);
        expect(rect.noScroll).toBe(true);
      }
      await page.screenshot({
        path: `../.task/servings-edit/editor-${locale}-${width}-${scale}.png`,
      });
      for (const action of ['recipe-save-edits', 'recipe-cancel-edits']) {
        const control = page.getByTestId(action);
        await control.scrollIntoViewIfNeeded();
        await expect(control).toBeVisible();
        const geometry = await control.evaluate((node) => {
          const clip = node.closest('div.overflow-y-auto')!.getBoundingClientRect();
          const rect = node.getBoundingClientRect();
          return {
            x: rect.x,
            right: rect.right,
            clipLeft: clip.x,
            clipRight: clip.right,
            noScroll: node.scrollWidth <= node.clientWidth,
          };
        });
        expect(geometry.x).toBeGreaterThanOrEqual(geometry.clipLeft);
        expect(geometry.right).toBeLessThanOrEqual(geometry.clipRight);
        expect(geometry.noScroll).toBe(true);
        await page.screenshot({
          path: `../.task/servings-edit/${action}-${locale}-${width}-${scale}.png`,
        });
      }
      await input.fill('3');
      const saved = page.waitForResponse(
        (r) => r.url().endsWith(`/api/recipes/${id}`) && r.request().method() === 'PATCH'
      );
      await page.getByTestId('recipe-save-edits').focus();
      await page.getByTestId('recipe-save-edits').press('Enter');
      expect((await saved).status()).toBe(200);
      await expect(page.getByTestId('recipe-servings')).toHaveText(
        locale === 'en' ? 'Original recipe: 3 servings' : 'Recette originale : 3 portions'
      );
      const savedRecipe = (
        await (await request.get(`${api}/api/recipes/${id}`, { headers })).json()
      ).recipe;
      expect(savedRecipe).toMatchObject({
        servings: 3,
        ingredients: ['510 g beef', '340 g pasta'],
      });
      await page.goto(`/recipes?open=${id}&reviewAmounts=true`);
      await expect(page.getByTestId('recipe-servings')).toHaveText(
        locale === 'en' ? 'Original recipe: 3 servings' : 'Recette originale : 3 portions'
      );
      await page.getByTestId('action-gear-menu').click();
      await page.getByTestId('action-edit-recipe').click();
      await page.getByTestId('recipe-edit-servings-input').fill('4');
      await page.getByTestId('recipe-save-edits').click();
      await expect(page.getByTestId('recipe-servings')).toHaveText(
        locale === 'en' ? 'Original recipe: 4 servings' : 'Recette originale : 4 portions'
      );
      console.log(JSON.stringify({ locale, width, textScale: scale, ...geometry }));
    }
  }
  const unknownId = process.env.SERVINGS_UNKNOWN_ID!;
  await page.goto(`/recipes?open=${unknownId}&reviewAmounts=true`);
  await expect(page.getByTestId('recipe-servings')).toHaveCount(0);
  await page.getByTestId('action-gear-menu').click();
  await page.getByTestId('action-edit-recipe').click();
  await expect(page.getByTestId('recipe-edit-servings-input')).toHaveValue('');
  await page.getByTestId('recipe-edit-servings-input').fill('2');
  await page.getByTestId('recipe-save-edits').click();
  await expect(page.getByTestId('recipe-servings')).toHaveText('Recette originale : 2 portions');
  await page.goto(`/recipes?open=${unknownId}&reviewAmounts=true`);
  await expect(page.getByTestId('recipe-servings')).toHaveText('Recette originale : 2 portions');
  for (const servings of [null, 0, -1, 1.5, 2147483648, '3'])
    expect(
      (await request.patch(`${api}/api/recipes/${id}`, { headers, data: { servings } })).status()
    ).toBe(400);
  expect(
    (
      await request.patch(`${api}/api/recipes/${id}`, {
        headers,
        data: { notes: 'Omission preserves count' },
      })
    ).status()
  ).toBe(200);
  expect(
    (await (await request.get(`${api}/api/recipes/${id}`, { headers })).json()).recipe.servings
  ).toBe(4);
});
